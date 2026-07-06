import type { AnswerRequestMessage, BackgroundMessage } from "@/background";
import type { DetectedField } from "../detected-field";
import type { FormAdapter } from "../form-adapter";
import { logDebug, logInfo, logWarn, reportError } from "../logger";
import { base64ToFile, fetchResume } from "../resume-helper";

export class DefaultFormAdapter implements FormAdapter {
  canHandle(url: URL): boolean {
    void url;
    return true;
  }
  detectFields(): DetectedField[] {
    try {
      const fields: DetectedField[] = [];

      const inputs = document.querySelectorAll(
        "input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select"
      );

      const fileInputs = document.querySelectorAll("input[type='file']");

      for (const element of inputs) {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        ) {
          const label = this.extractLabel(element);
          const question = label || element.getAttribute("placeholder") || "";

          fields.push({
            element,
            label,
            question,
            type: this.inferFieldType(element),
          });
        }
      }

      for (const element of fileInputs) {
        if (element instanceof HTMLInputElement) {
          const label = this.extractLabel(element);
          const question = label || element.getAttribute("placeholder") || "";

          fields.push({
            element,
            label,
            question,
            type: "file",
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
  fillField(field: DetectedField, answer: string): void {
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
  async run(profileId: string): Promise<void> {
    logInfo("Starting autofill", { profileId, url: window.location.href });

    const fields = this.detectFields();
    let filledCount = 0;
    let skippedCount = 0;

    for (const field of fields) {
      if (field.type === "file") {
        try {
          await this.fillFileField(field, profileId);
          filledCount++;
        } catch (error) {
          reportError("Failed to fill file field", error, { label: field.label });
          skippedCount++;
        }
        continue;
      }

      if (!field.question) {
        skippedCount++;
        continue;
      }

      try {
        const { answer } = await this.askBackground(field.question, profileId);
        if (answer.trim() === "") {
          logDebug("Skipping blank answer for field", { label: field.label });
          skippedCount++;
          continue;
        }
        this.fillField(field, answer);
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

  /**
    * Extracts the most relevant label text for a form control.
    *
    * Looks for an explicit `<label for="...">` reference, a wrapping `<label>`,
    * or an `aria-labelledby` attribute. Falls back to `aria-label` or placeholder
    * text.
    */
  private extractLabel(
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
  private inferFieldType(
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
      case "file":
        return "file";
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
    * Asks the background service worker to answer a question.
    *
    * Sends an `ANSWER_REQUEST` message and returns the answer text. Errors are
    * surfaced as rejected promises so callers can decide how to handle them.
    */
  private async askBackground(
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

  private async fillFileField(field: DetectedField, profileId: string): Promise<void> {
    if (!(field.element instanceof HTMLInputElement) || field.element.type !== "file") {
      logWarn("Skipping non-file field passed to fillFileField", { label: field.label });
      return;
    }

    const pdfBase64 = await fetchResume(profileId);
    const file = base64ToFile(pdfBase64, "resume.pdf", "application/pdf");

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    field.element.files = dataTransfer.files;
    field.element.dispatchEvent(new Event("change", { bubbles: true }));

    logInfo("Filled file field with resume PDF", { label: field.label, fileName: file.name });
  }
}
