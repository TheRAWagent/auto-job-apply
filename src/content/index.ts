import { logInfo, reportError, logDebug, logWarn } from "./logger";
import { AdapterRegistry } from "./adapter-registry";

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


interface AutofillMessage {
  type: "AUTO_FILL";
  profileId: string;
}
const adapter = AdapterRegistry.resolve(new URL(window.location.href));

chrome.runtime.onMessage.addListener((message: AutofillMessage) => {
  logDebug("Received runtime message", { type: message.type });

  if (message.type === "AUTO_FILL") {
    adapter.run(message.profileId).catch((error) => {
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
  runAutofill: adapter.run.bind(adapter),
};

logInfo("Content script loaded", { url: window.location.href });
