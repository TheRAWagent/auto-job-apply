import type { Cache } from "@/domain/interfaces";
import { logger } from "@/lib/logger";

const LOG_CONTEXT = "cache";

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export class InMemoryCacheAdapter implements Cache {
  private store: Map<string, CacheEntry<unknown>>;

  constructor() {
    this.store = new Map();
  }

  /**
   * Retrieves a value from the cache by key.
   *
   * Returns `null` when the key is missing or the entry has expired.
   * In a future iteration this will first check an in-memory LRU layer,
   * then fall back to `chrome.storage.local` for persistence across
   * service worker restarts.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const entry = this.store.get(key);

      if (entry === undefined) {
        logger.debug(LOG_CONTEXT, "Cache miss", { key });
        return null;
      }

      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        this.store.delete(key);
        logger.debug(LOG_CONTEXT, "Cache entry expired", { key });
        return null;
      }

      logger.debug(LOG_CONTEXT, "Cache hit", { key });
      return entry.value as T;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to read cache",
        error,
        extra: { key },
      });
      return null;
    }
  }

  /**
   * Stores a value in the cache.
   *
   * When `ttlMs` is provided, the entry is considered expired after that
   * many milliseconds. A future implementation will also write to
   * `chrome.storage.local` so cached answers survive service worker
   * lifecycle events.
   */
  async set<T = unknown>(
    key: string,
    value: T,
    ttlMs?: number
  ): Promise<void> {
    try {
      const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : null;
      this.store.set(key, { value, expiresAt });
      logger.debug(LOG_CONTEXT, "Cache entry set", { key, expiresAt });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to set cache",
        error,
        extra: { key },
      });
    }
  }

  /**
   * Removes a single entry from the cache.
   *
   * Future implementation will also remove the matching key from
   * `chrome.storage.local`.
   */
  async delete(key: string): Promise<void> {
    try {
      this.store.delete(key);
      logger.debug(LOG_CONTEXT, "Cache entry deleted", { key });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to delete cache",
        error,
        extra: { key },
      });
    }
  }
}
