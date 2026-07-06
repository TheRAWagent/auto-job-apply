export interface DetectedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement;
  label: string;
  question: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox" | "file" | "unknown";
}
