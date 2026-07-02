import { logger } from './logger';

const LOG_CONTEXT = "profile-db";
const DB_NAME = "SecureFillProfiles";
const DB_VERSION = 1;
const STORE_NAME = "profiles";

type ProfileRecord = {
  id: string;
  payload: string;
};

export class ProfileIndexedDB {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        const error = request.error ?? new Error("Failed to open IndexedDB");
        logger.reportError({
          context: LOG_CONTEXT,
          message: "Failed to open IndexedDB",
          error,
        });
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.debug(LOG_CONTEXT, "IndexedDB opened");
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
          logger.info(LOG_CONTEXT, "IndexedDB object store created");
        }
      };
    });
  }

  async save(id: string, encryptedPayload: string): Promise<void> {
    try {
      const db = await this.open();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({ id, payload: encryptedPayload } satisfies ProfileRecord);

        request.onerror = () => {
          const error = request.error ?? new Error("Failed to save profile to IndexedDB");
          logger.reportError({
            context: LOG_CONTEXT,
            message: "Failed to save profile",
            error,
            extra: { profileId: id },
          });
          reject(error);
        };

        request.onsuccess = () => {
          logger.debug(LOG_CONTEXT, "Profile saved", { profileId: id });
          resolve();
        };
      });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to save profile",
        error,
        extra: { profileId: id },
      });
      throw error;
    }
  }

  async get(id: string): Promise<string | null> {
    try {
      const db = await this.open();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onerror = () => {
          const error = request.error ?? new Error("Failed to read profile from IndexedDB");
          logger.reportError({
            context: LOG_CONTEXT,
            message: "Failed to read profile",
            error,
            extra: { profileId: id },
          });
          reject(error);
        };

        request.onsuccess = () => {
          const result = request.result as ProfileRecord | undefined;
          logger.debug(LOG_CONTEXT, "Profile read", { profileId: id, found: !!result });
          resolve(result?.payload ?? null);
        };
      });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to read profile",
        error,
        extra: { profileId: id },
      });
      throw error;
    }
  }

  async getAll(ids: string[]): Promise<Record<string, string>> {
    try {
      const db = await this.open();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const results: Record<string, string> = {};

        if (ids.length === 0) {
          resolve(results);
          return;
        }

        let completed = 0;
        let failed = false;

        for (const id of ids) {
          const request = store.get(id);

          request.onerror = () => {
            if (failed) return;
            failed = true;
            const error = request.error ?? new Error(`Failed to read profile ${id} from IndexedDB`);
            logger.reportError({
              context: LOG_CONTEXT,
              message: "Failed to read profile during batch read",
              error,
              extra: { profileId: id },
            });
            reject(error);
          };

          request.onsuccess = () => {
            if (failed) return;
            const result = request.result as ProfileRecord | undefined;
            if (result?.payload) {
              results[id] = result.payload;
            }
            completed++;
            if (completed === ids.length) {
              logger.debug(LOG_CONTEXT, "Batch profiles read", { requested: ids.length, found: Object.keys(results).length });
              resolve(results);
            }
          };
        }
      });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to batch read profiles",
        error,
        extra: { requestedCount: ids.length },
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await this.open();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => {
          const error = request.error ?? new Error("Failed to delete profile from IndexedDB");
          logger.reportError({
            context: LOG_CONTEXT,
            message: "Failed to delete profile",
            error,
            extra: { profileId: id },
          });
          reject(error);
        };

        request.onsuccess = () => {
          logger.debug(LOG_CONTEXT, "Profile deleted", { profileId: id });
          resolve();
        };
      });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to delete profile",
        error,
        extra: { profileId: id },
      });
      throw error;
    }
  }

  async deleteAllExcept(ids: Set<string>): Promise<void> {
    try {
      const db = await this.open();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.openCursor();

        request.onerror = () => {
          const error = request.error ?? new Error("Failed to clean up IndexedDB profiles");
          logger.reportError({
            context: LOG_CONTEXT,
            message: "Failed to clean up profiles",
            error,
          });
          reject(error);
        };

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
          if (!cursor) {
            logger.debug(LOG_CONTEXT, "Profile cleanup complete");
            resolve();
            return;
          }

          const record = cursor.value as ProfileRecord;
          if (!ids.has(record.id)) {
            logger.debug(LOG_CONTEXT, "Deleting stale profile", { profileId: record.id });
            cursor.delete();
          }
          cursor.continue();
        };
      });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to clean up profiles",
        error,
      });
      throw error;
    }
  }
}
