
const LOG_CONTEXT = "content";
/**
 * Lightweight content-script logger.
 *
 * The content script runs in an isolated world where shared module imports can
 * fail at runtime, so it uses plain console methods with a consistent prefix
 * instead of importing the shared logger.
 */
export function logDebug(message: string, extra?: Record<string, unknown>): void {
  console.debug(`[AutoJobApply:${LOG_CONTEXT}]`, message, extra ?? "");
}
export function logInfo(message: string, extra?: Record<string, unknown>): void {
  console.info(`[AutoJobApply:${LOG_CONTEXT}]`, message, extra ?? "");
}
export function logWarn(message: string, extra?: Record<string, unknown>): void {
  console.warn(`[AutoJobApply:${LOG_CONTEXT}]`, message, extra ?? "");
}
function logError(message: string, extra?: Record<string, unknown>): void {
  console.error(`[AutoJobApply:${LOG_CONTEXT}]`, message, extra ?? "");
}
export function reportError(message: string, error: unknown, extra?: Record<string, unknown>): void {
  const report: Record<string, unknown> = { ...extra };

  if (error instanceof Error) {
    report.originalError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error !== undefined) {
    report.originalError = error;
  }

  logError(message, report);
}
