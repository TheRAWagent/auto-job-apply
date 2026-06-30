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
        reject(request.error ?? new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  }

  async save(id: string, encryptedPayload: string): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ id, payload: encryptedPayload } satisfies ProfileRecord);

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to save profile to IndexedDB"));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async get(id: string): Promise<string | null> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to read profile from IndexedDB"));
      };

      request.onsuccess = () => {
        const result = request.result as ProfileRecord | undefined;
        resolve(result?.payload ?? null);
      };
    });
  }

  async getAll(ids: string[]): Promise<Record<string, string>> {
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
          reject(request.error ?? new Error(`Failed to read profile ${id} from IndexedDB`));
        };

        request.onsuccess = () => {
          if (failed) return;
          const result = request.result as ProfileRecord | undefined;
          if (result?.payload) {
            results[id] = result.payload;
          }
          completed++;
          if (completed === ids.length) {
            resolve(results);
          }
        };
      }
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete profile from IndexedDB"));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async deleteAllExcept(ids: Set<string>): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to clean up IndexedDB profiles"));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve();
          return;
        }

        const record = cursor.value as ProfileRecord;
        if (!ids.has(record.id)) {
          cursor.delete();
        }
        cursor.continue();
      };
    });
  }
}
