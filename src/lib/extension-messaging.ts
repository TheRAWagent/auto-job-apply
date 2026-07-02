import { logger } from "./logger";

const LOG_CONTEXT = "extension-messaging";

export interface AutofillMessage {
  type: "AUTO_FILL";
  profileId: string;
}

export async function sendAutofillMessage(profileId: string): Promise<void> {
  logger.info(LOG_CONTEXT, "Sending autofill message to content script", { profileId });

  if (typeof chrome === "undefined" || !chrome.tabs?.query || !chrome.scripting?.executeScript) {
    logger.warn(LOG_CONTEXT, "Extension APIs are not available");
    throw new Error("Extension APIs are not available");
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    logger.warn(LOG_CONTEXT, "No active tab found");
    throw new Error("No active tab found");
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (message: AutofillMessage) => {
        const api = (window as unknown as Record<string, { runAutofill: (profileId: string) => Promise<void> }>).autoJobApply;

        if (!api) {
          console.error("Auto Job Apply content script is not loaded on this page");
          return;
        }

        void api.runAutofill(message.profileId);
      },
      args: [{ type: "AUTO_FILL", profileId }],
    });

    logger.info(LOG_CONTEXT, "Autofill message delivered", { profileId, tabId: tab.id });
  } catch (error) {
    logger.reportError({
      context: LOG_CONTEXT,
      message: "Failed to send autofill message",
      error,
      extra: { profileId, tabId: tab.id },
    });
    throw error;
  }
}
