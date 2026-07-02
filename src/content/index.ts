import type { AnswerRequestMessage, BackgroundMessage } from "@/background";

const LOG_CONTEXT = "content";

/**
 * Lightweight content-script logger.
 *
 * The content script runs in an isolated world where shared module imports can
 * fail at runtime, so it uses plain console methods with a consistent prefix
 * instead of importing the shared logger.
 */
function logDebug(message: string, extra?: Record<string, unknown>): void {
  console.debug(`[AutoJobApply:${LOG_CONTEXT}]`, message, extra ?? "");
}

function logInfo(message: string, extra?: Record<string, unknown>): void {
  console.info(`[AutoJobApply:${LOG_CONTEXT}]`, message, extra ?? "");
}

function logWarn(message: string, extra?: Record<string, unknown>): void {
  console.warn(`[AutoJobApply:${LOG_CONTEXT}]`, message, extra ?? "");
}

function logError(message: string, extra?: Record<string, unknown>): void {
  console.error(`[AutoJobApply:${LOG_CONTEXT}]`, message, extra ?? "");
}

function reportError(message: string, error: unknown, extra?: Record<string, unknown>): void {
  const report: Record<string, unknown> = { ...extra };

  if (error instanceof Error) {
    report.originalError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error !== undefined) {
    report.originalError = error;
  }

  logError(message, report);
}

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
  try {
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

    logInfo("Detected form fields", {
      count: fields.length,
      url: window.location.href,
    });

    return fields;
  } catch (error) {
    reportError("Failed to detect form fields", error, { url: window.location.href });
    return [];
  }
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
  try {
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
  } catch (error) {
    reportError("Failed to extract label for element", error, { tagName: element.tagName });
    return "";
  }
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
  try {
    if (field.type === "textarea" || field.type === "text") {
      field.element.value = answer;
      field.element.dispatchEvent(new Event("input", { bubbles: true }));
      field.element.dispatchEvent(new Event("change", { bubbles: true }));
      logDebug("Filled text/textarea field", {
        label: field.label,
        questionLength: field.question.length,
      });
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
        logDebug("Filled select field", {
          label: field.label,
          matchedOption: match.text,
        });
      } else {
        logWarn("No matching option for select field", {
          label: field.label,
          answerLength: answer.length,
          optionCount: options.length,
        });
      }

      return;
    }

    logDebug("Skipped unsupported field type", {
      type: field.type,
      label: field.label,
    });
  } catch (error) {
    reportError("Failed to fill field", error, { type: field.type, label: field.label });
  }
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

  logDebug("Sending ANSWER_REQUEST to background", {
    profileId,
    questionLength: question.length,
  });

  let response: BackgroundMessage;
  try {
    response = (await chrome.runtime.sendMessage(message)) as BackgroundMessage;
  } catch (error) {
    reportError("Failed to send message to background", error, { profileId });
    throw new Error("Could not reach background service worker", { cause: error });
  }

  if (response.type === "ANSWER_ERROR") {
    logWarn("Background returned answer error", {
      profileId,
      error: response.error,
    });
    throw new Error(response.error);
  }

  if (response.type !== "ANSWER_RESPONSE") {
    logWarn("Unexpected background response type", {
      profileId,
      type: response.type,
    });
    throw new Error("Unexpected response from background");
  }

  logDebug("Received answer from background", {
    profileId,
    source: response.source,
    answerLength: response.answer.length,
  });

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
 */
async function runAutofill(profileId: string): Promise<void> {
  logInfo("Starting autofill", { profileId, url: window.location.href });

  const fields = detectFields();
  let filledCount = 0;
  let skippedCount = 0;

  for (const field of fields) {
    if (!field.question) {
      skippedCount++;
      continue;
    }

    try {
      const { answer } = await askBackground(field.question, profileId);
      fillField(field, answer);
      filledCount++;
    } catch (error) {
      reportError("Failed to fill field", error, {
        label: field.label,
        questionLength: field.question.length,
      });
      skippedCount++;
    }
  }

  logInfo("Autofill complete", {
    profileId,
    filledCount,
    skippedCount,
    totalFields: fields.length,
  });
}

interface AutofillMessage {
  type: "AUTO_FILL";
  profileId: string;
}

chrome.runtime.onMessage.addListener((message: AutofillMessage) => {
  logDebug("Received runtime message", { type: message.type });

  if (message.type === "AUTO_FILL") {
    runAutofill(message.profileId).catch((error) => {
      reportError("Autofill failed", error, { profileId: message.profileId });
    });
  } else {
    logWarn("Ignoring unknown runtime message", { type: message.type });
  }

  return false;
});

// Expose a lightweight API for the popup to trigger autofill on the current
// page.
(window as unknown as Record<string, unknown>).autoJobApply = {
  runAutofill,
};

logInfo("Content script loaded", { url: window.location.href });
