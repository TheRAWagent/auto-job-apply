import type { DetectedField } from "../detected-field";
import type { FormAdapter } from "../form-adapter";
import { logDebug, logInfo, logWarn, reportError } from "../logger";
import { base64ToFile, fetchResume } from "../resume-helper";

export class GreenhouseAdapter implements FormAdapter {
  canHandle(url: URL): boolean {
    // return url.hostname.includes("greenhouse.io");
    // Temporarily disable Greenhouse adapter
    return false;
  }

  detectFields(): DetectedField[] {
    const fields: DetectedField[] = [];

    const form = document.getElementById("application-form");

    const fileInput = form?.querySelector("input[type='file']#resume") as HTMLInputElement | null;
    if (fileInput) {
      fields.push({
        element: fileInput,
        label: "resume",
        question: "Resume",
        type: "file",
      });
    }

    const textInputs = form?.querySelectorAll(".text-input-wrapper") ?? [];
    const textFields: DetectedField[] = Array.from(textInputs)
      .map((input) => {
        const labelElement: HTMLLabelElement = input.querySelector("label")!;
        const label = labelElement?.getAttribute("for");

        if (label === "phone") {
          return null;
        }

        const question = labelElement?.textContent || "";

        const inputElement = input.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;

        return {
          element: inputElement,
          label: label || "",
          question,
          type: "text",
        } as DetectedField;
      })
      .filter((field) => field !== null);

    fields.push(...textFields);

    const phoneCountryCodeField = form?.querySelector(".phone-input__country div.select-shell") as HTMLElement | null;
    if (phoneCountryCodeField) {
      fields.push({
        //@ts-ignore
        element: phoneCountryCodeField,
        label: "phone-country-code",
        question: "Phone Country Code",
        type: "text",
      });
    }

    logInfo("Detected Greenhouse form fields", {
      count: fields.length,
      url: window.location.href,
    });

    return fields;
  }

  fillField(field: DetectedField, answer: string): void {
    try {
      if (field.type === "text") {
        if(field.label === "phone-country-code") {
          const r = field.element.getBoundingClientRect();
          field.element.dispatchEvent(new PointerEvent("pointerdown", {
            bubbles: true,
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2
          }));
          
          field.element.dispatchEvent(new PointerEvent("pointerup", {
            bubbles: true,
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2
          }));
          
          field.element.dispatchEvent(new MouseEvent("click", {
            bubbles: true
          }));

          const selector = `div#react-select-country-listbox div`;
          const options = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
          const option = Array.from(options).find(opt => opt.textContent?.includes(answer));
          
          option?.click();
          
          logDebug("Filled Greenhouse phone country code field", { label: field.label, countryCode: answer });
          return;
        }

        field.element.value = answer;
        field.element.dispatchEvent(new Event("input", { bubbles: true }));
        field.element.dispatchEvent(new Event("change", { bubbles: true }));
        logDebug("Filled Greenhouse text field", { label: field.label });
        return;
      }

      logDebug("Skipped unsupported Greenhouse field type", {
        type: field.type,
        label: field.label,
      });
    } catch (error) {
      reportError("Failed to fill Greenhouse field", error, {
        type: field.type,
        label: field.label,
      });
    }
  }

  async run(profileId: string): Promise<void> {
    logInfo("Running GreenhouseAdapter", { profileId, url: window.location.href });

    const fields = this.detectFields();
    let filledCount = 0;
    let skippedCount = 0;

    for (const field of fields) {
      if (field.type === "file") {
        try {
          await this.fillFileField(field, profileId);
          filledCount++;
        } catch (error) {
          reportError("Failed to fill Greenhouse file field", error, { label: field.label });
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
        this.fillField(field, answer);
        filledCount++;
      } catch (error) {
        reportError("Failed to fill Greenhouse field", error, {
          label: field.label,
          questionLength: field.question.length,
        });
        skippedCount++;
      }
    }

    logInfo("Greenhouse autofill complete", {
      profileId,
      filledCount,
      skippedCount,
      totalFields: fields.length,
    });
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

    logInfo("Filled Greenhouse file field with resume PDF", {
      label: field.label,
      fileName: file.name,
    });
  }

  private async askBackground(
    question: string,
    profileId: string
  ): Promise<{ answer: string; source: "lookup" | "derived" | "llm" }> {
    const message = {
      type: "ANSWER_REQUEST" as const,
      question,
      profileId,
    };

    logDebug("Sending ANSWER_REQUEST to background from GreenhouseAdapter", {
      profileId,
      questionLength: question.length,
    });

    let response;
    try {
      response = await chrome.runtime.sendMessage(message);
    } catch (error) {
      reportError("Failed to send Greenhouse message to background", error, { profileId });
      throw new Error("Could not reach background service worker", { cause: error });
    }

    if (response.type === "ANSWER_ERROR") {
      logWarn("Background returned answer error", { profileId, error: response.error });
      throw new Error(response.error);
    }

    if (response.type !== "ANSWER_RESPONSE") {
      logWarn("Unexpected background response type", { profileId, type: response.type });
      throw new Error("Unexpected response from background");
    }

    return { answer: response.answer, source: response.source };
  }
}
