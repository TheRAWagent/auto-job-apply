export interface DetectedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  label: string;
  question: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox" | "unknown";
}
