import type { BackgroundMessage, ResumeRequestMessage } from "@/background";
import { logDebug, logWarn, reportError } from "./logger";

export async function fetchResume(profileId: string): Promise<string> {
  const message: ResumeRequestMessage = {
    type: "RESUME_REQUEST",
    profileId,
  };

  logDebug("Sending RESUME_REQUEST to background", { profileId });

  let response: BackgroundMessage;
  try {
    response = (await chrome.runtime.sendMessage(message)) as BackgroundMessage;
  } catch (error) {
    reportError("Failed to send resume request to background", error, { profileId });
    throw new Error("Could not reach background service worker", { cause: error });
  }

  if (response.type === "RESUME_ERROR") {
    logWarn("Background returned resume error", { profileId, error: response.error });
    throw new Error(response.error);
  }

  if (response.type !== "RESUME_RESPONSE") {
    logWarn("Unexpected background response type", { profileId, type: response.type });
    throw new Error("Unexpected response from background");
  }

  if (!response.pdfBase64) {
    throw new Error("No resume PDF found in profile");
  }

  logDebug("Received resume from background", {
    profileId,
    pdfLength: response.pdfBase64.length,
  });

  return response.pdfBase64;
}

export function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const dataUrlPattern = /^data:([\w+/\-.]+);base64,/;
  const match = dataUrlPattern.exec(base64);

  const resolvedMimeType = match?.[1] ?? mimeType;
  const base64Data = match ? base64.slice(match[0].length) : base64;

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: resolvedMimeType });

  return new File([blob], fileName, { type: resolvedMimeType });
}
