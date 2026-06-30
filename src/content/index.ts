import type { AnswerRequestMessage, BackgroundMessage } from "@/background";

/**
 * Content script entry point.
 *
 * This is the only layer allowed to access the DOM. It runs in the context of
 * job application pages and is responsible for:
 *
 * - Detecting application form fields.
 * - Extracting human-readable labels and questions.
 * - Filling straightforward fields directly from the page.
 * - Asking the background service worker for answers to complex or open-ended
 *   questions.
 */

interface DetectedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  label: string;
  question: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox" | "unknown";
}

/**
 * Finds candidate form fields on the current page.
 *
 * The implementation will scan inputs, textareas, and selects that look like
 * part of a job application (e.g., near labels containing "experience",
 * "skills", "name", "email"). It will return a stable list of fields with
 * their associated labels and inferred question text.
 */
function detectFields(): DetectedField[] {
  const fields: DetectedField[] = [];

  const inputs = document.querySelectorAll(
    "input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select"
  );

  for (const element of inputs) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      const label = extractLabel(element);
      const question = label || element.getAttribute("placeholder") || "";

      fields.push({
        element,
        label,
        question,
        type: inferFieldType(element),
      });
    }
  }

  return fields;
}

/**
 * Extracts the most relevant label text for a form control.
 *
 * Looks for an explicit `<label for="...">` reference, a wrapping `<label>`,
 * or an `aria-labelledby` attribute. Falls back to `aria-label` or placeholder
 * text.
 */
function extractLabel(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string {
  const id = element.id;

  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      return label.textContent?.trim() ?? "";
    }
  }

  const parentLabel = element.closest("label");
  if (parentLabel) {
    return parentLabel.textContent?.trim() ?? "";
  }

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const label = document.getElementById(labelledBy);
    if (label) {
      return label.textContent?.trim() ?? "";
    }
  }

  return element.getAttribute("aria-label")?.trim() ?? "";
}

/**
 * Categorises a form control into a high-level field type.
 *
 * This simplifies downstream logic so the autofill code does not need to
 * inspect every possible `input.type` value.
 */
function inferFieldType(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): DetectedField["type"] {
  if (element instanceof HTMLTextAreaElement) {
    return "textarea";
  }

  if (element instanceof HTMLSelectElement) {
    return "select";
  }

  const inputType = element.getAttribute("type")?.toLowerCase();

  switch (inputType) {
    case "radio":
      return "radio";
    case "checkbox":
      return "checkbox";
    case "text":
    case "email":
    case "tel":
    case "url":
      return "text";
    default:
      return "unknown";
  }
}

/**
 * Fills a single form field with the provided answer.
 *
 * For text inputs and textareas the answer is set as the value. For selects,
 * the best matching option is selected. For radios and checkboxes, the option
 * whose label matches the answer is checked.
 */
function fillField(field: DetectedField, answer: string): void {
  if (field.type === "textarea" || field.type === "text") {
    field.element.value = answer;
    field.element.dispatchEvent(new Event("input", { bubbles: true }));
    field.element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  if (field.type === "select" && field.element instanceof HTMLSelectElement) {
    const options = Array.from(field.element.options);
    const match = options.find((option) =>
      option.text.toLowerCase().includes(answer.toLowerCase())
    );

    if (match) {
      field.element.value = match.value;
      field.element.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return;
  }

  // Radio and checkbox autofill will be implemented once answer formats are
  // standardised (e.g., "yes", "true", option label).
}

/**
 * Asks the background service worker to answer a question.
 *
 * Sends an `ANSWER_REQUEST` message and returns the answer text. Errors are
 * surfaced as rejected promises so callers can decide how to handle them.
 */
async function askBackground(
  question: string,
  profileId: string
): Promise<{ answer: string; source: "lookup" | "derived" | "llm" }> {
  const message: AnswerRequestMessage = {
    type: "ANSWER_REQUEST",
    question,
    profileId,
  };

  const response = (await chrome.runtime.sendMessage(message)) as BackgroundMessage;

  if (response.type === "ANSWER_ERROR") {
    throw new Error(response.error);
  }

  if (response.type !== "ANSWER_RESPONSE") {
    throw new Error("Unexpected response from background");
  }

  return { answer: response.answer, source: response.source };
}

/**
 * Main autofill routine.
 *
 * 1. Detect all candidate fields on the page.
 * 2. For fields that look like direct profile lookups (name, email, phone,
 *    etc.), request an answer from the background worker and fill the field.
 * 3. For open-ended or complex fields, collect them and either fill them
 *    immediately or present them to the user for review.
 *
 * In the current iteration this logs detected fields to the console. Full
 * autofill will be enabled once the background messaging and answer formats
 * are validated end-to-end.
 */
async function runAutofill(profileId: string): Promise<void> {
  const fields = detectFields();

  for (const field of fields) {
    if (!field.question) {
      continue;
    }

    try {
      const { answer } = await askBackground(field.question, profileId);
      fillField(field, answer);
    } catch (error) {
      console.error("Failed to fill field:", field.question, error);
    }
  }
}

interface AutofillMessage {
  type: "AUTO_FILL";
  profileId: string;
}

chrome.runtime.onMessage.addListener((message: AutofillMessage) => {
  if (message.type === "AUTO_FILL") {
    void runAutofill(message.profileId);
  }

  return false;
});

// Expose a lightweight API for the popup to trigger autofill on the current
// page.
(window as unknown as Record<string, unknown>).autoJobApply = {
  runAutofill,
};
