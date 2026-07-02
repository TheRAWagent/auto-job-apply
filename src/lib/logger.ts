type LogLevel = "debug" | "info" | "warn" | "error";

interface ErrorReport {
  context: string;
  message: string;
  error?: unknown;
  extra?: Record<string, unknown>;
}

/**
 * Structured logger for the extension.
 *
 * All log messages are prefixed with the extension name and a context so they
 * are easy to filter in the browser console. Sensitive values such as
 * passwords, API keys, or profile contents must never be logged.
 */
class Logger {
  private enabled = true;

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  private log(level: LogLevel, context: string, message: string, extra?: Record<string, unknown>): void {
    if (!this.enabled) {
      return;
    }

    const prefix = `[AutoJobApply:${context}]`;
    const args = extra ? [prefix, message, extra] : [prefix, message];

    switch (level) {
      case "debug":
        console.debug(...args);
        break;
      case "info":
        console.info(...args);
        break;
      case "warn":
        console.warn(...args);
        break;
      case "error":
        console.error(...args);
        break;
    }
  }

  debug(context: string, message: string, extra?: Record<string, unknown>): void {
    this.log("debug", context, message, extra);
  }

  info(context: string, message: string, extra?: Record<string, unknown>): void {
    this.log("info", context, message, extra);
  }

  warn(context: string, message: string, extra?: Record<string, unknown>): void {
    this.log("warn", context, message, extra);
  }

  error(context: string, message: string, extra?: Record<string, unknown>): void {
    this.log("error", context, message, extra);
  }

  /**
   * Reports an error in a consistent format. The original error is attached
   * under `originalError` so callers can inspect the cause without leaking
   * sensitive data in the primary message.
   */
  reportError({ context, message, error, extra }: ErrorReport): void {
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

    this.error(context, message, report);
  }
}

export const logger = new Logger();
