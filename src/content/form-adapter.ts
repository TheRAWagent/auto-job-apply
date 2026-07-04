import type { DetectedField } from "./detected-field";

export interface FormAdapter {
  /**
    * Determines if this adapter can handle the given URL.
    */
  canHandle(url: URL): boolean;

  /**
    * Finds candidate form fields on the current page.
    *
    * The implementation will scan inputs, textareas, and selects that look like
    * part of a job application (e.g., near labels containing "experience",
    * "skills", "name", "email"). It will return a stable list of fields with
    * their associated labels and inferred question text.
    */
  detectFields(): DetectedField[];

  /**
    * Fills a single form field with the provided answer.
    *
    * For text inputs and textareas the answer is set as the value. For selects,
    * the best matching option is selected. For radios and checkboxes, the option
    * whose label matches the answer is checked.
    */
  fillField(field: DetectedField, answer: string): void;

  /**
    * Main autofill routine.
    *
    * 1. Detect all candidate fields on the page.
    * 2. For fields that look like direct profile lookups (name, email, phone,
    *    etc.), request an answer from the background worker and fill the field.
    * 3. For open-ended or complex fields, collect them and either fill them
    *    immediately or present them to the user for review.
    */
  run(profileId: string): Promise<void>;
}
