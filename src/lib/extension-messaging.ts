export interface AutofillMessage {
  type: "AUTO_FILL";
  profileId: string;
}

export async function sendAutofillMessage(profileId: string): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs?.query || !chrome.scripting?.executeScript) {
    throw new Error("Extension APIs are not available");
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error("No active tab found");
  }

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
}
