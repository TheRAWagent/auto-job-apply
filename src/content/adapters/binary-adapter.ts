import type { DetectedField } from "../detected-field";
import type { FormAdapter } from "../form-adapter";
import { logDebug, logInfo, logWarn, reportError } from "../logger";
import { base64ToFile, fetchResume } from "../resume-helper";

export class BinaryAdapter implements FormAdapter {
  canHandle(url: URL): boolean {
    return url.hostname.includes("binary.so");
  }

  detectFields(): DetectedField[] {
    const fields: DetectedField[] = [];

    const fileInput = document?.querySelector("input[type='file']") as HTMLInputElement | null;
    if (fileInput) {
      fields.push({
        element: fileInput,
        label: "resume",
        question: "Resume",
        type: "file",
      });
    }

    const textInputFields = document?.querySelectorAll(".group\\/input-field") ?? [];
    const textFields: DetectedField[] = Array.from(textInputFields)
      .map((input) => {
        const labelElement: HTMLLabelElement = input.querySelector("label")!;
        const label = (labelElement?.textContent || "").replaceAll("*", "").toLowerCase().trim();

        const question = labelElement?.textContent || "";
        let element = input.querySelector("input") as HTMLInputElement | HTMLTextAreaElement | null;
        if (!element) {
          element = input.querySelector("textarea");
        }

        return {
          element,
          label: label || "",
          question: question.includes("Phone") ? "Phone Number" : question,
          type: "text",
        } as DetectedField;
      })
      .filter((field) => field !== null);
    fields.push(...textFields);

    const phoneCountryCodeField = document?.querySelector(".PhoneInput button") as HTMLButtonElement | null;
    if (phoneCountryCodeField) {
      fields.push({
        element: phoneCountryCodeField,
        label: "phone-country-code",
        question: "Phone Country Code",
        type: "text",
      });
    }

    // const phoneNumberField = document?.querySelector(".PhoneInput input") as HTMLInputElement | null;

    logInfo("Detected Binary form fields", {
      count: fields.length,
      url: window.location.href,
    });

    return fields;
  }

  fillField(field: DetectedField, answer: string): void {
    logInfo("Filling Binary field", { label: field.label, answer });
    try {
      if (field.type === "text") {
        if (field.label === "phone-country-code") {
          // The country code value has been retrieved from the profile, but
          // actually filling Binary's custom phone-country dropdown is left
          // unimplemented because it requires framework-specific interaction.
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
          const selector = "div[data-value*='+91']";
          const option = document.querySelector(selector) as HTMLElement | null;
          
          option?.click();

          return;
        }

        field.element.value = answer;
        field.element.dispatchEvent(new Event("input", { bubbles: true }));
        field.element.dispatchEvent(new Event("change", { bubbles: true }));
        logDebug("Filled Binary text field", { label: field.label });
        return;
      }

      logDebug("Skipped unsupported Binary field type", {
        type: field.type,
        label: field.label,
      });
    } catch (error) {
      reportError("Failed to fill Binary field", error, {
        type: field.type,
        label: field.label,
      });
    }
  }

  async run(profileId: string): Promise<void> {
    logInfo("Running BinaryAdapter", { profileId, url: window.location.href });

    const fields = this.detectFields();
    let filledCount = 0;
    let skippedCount = 0;

    for (const field of fields) {
      if (field.type === "file") {
        try {
          await this.fillFileField(field, profileId);
          filledCount++;
        } catch (error) {
          reportError("Failed to fill Binary file field", error, { label: field.label });
          skippedCount++;
        }
        continue;
      }

      if (field.label === "phone-country-code") {
        try {
          const { answer } = await this.askBackground("Country Code", profileId);
          this.fillField(field, answer);
          filledCount++;
        } catch (error) {
          reportError("Failed to retrieve country code for Binary field", error, {
            label: field.label,
          });
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
        reportError("Failed to fill Binary field", error, {
          label: field.label,
          questionLength: field.question.length,
        });
        skippedCount++;
      }
    }

    logInfo("Binary autofill complete", {
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

    logInfo("Filled Binary file field with resume PDF", {
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

    logDebug("Sending ANSWER_REQUEST to background from BinaryAdapter", {
      profileId,
      questionLength: question.length,
    });

    let response;
    try {
      response = await chrome.runtime.sendMessage(message);
    } catch (error) {
      reportError("Failed to send Binary message to background", error, { profileId });
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
