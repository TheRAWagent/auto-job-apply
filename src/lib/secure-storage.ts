import { storage } from 'webextension-polyfill';
import { ProfileIndexedDB } from './profile-db';
import { logger } from './logger';
import type { ProfileSchema } from '@/components/profile-form';

const LOG_CONTEXT = "secure-storage";

export type ApplicationProfile = {
  id: string;
  name: string;
  pdfBase64: string;
  json: ProfileSchema;
  createdAt: number;
};

type SecureStorageData = {
  passwordHash: string;
  salt: string;

  encryptedApiKey?: string;
  encryptedApiBaseUrl?: string;
  encryptedProfile?: string;
  encryptedResume?: string;
  encryptedProfiles?: string;
  encryptedProfileIds?: string;
};

export class SecureStorage {
  private encryptionKey: CryptoKey | null = null;
  private unlocked = false;
  private profileDB = new ProfileIndexedDB();

  // ------------------------
  // Storage Helpers
  // ------------------------

  private async getStorage(): Promise<SecureStorageData> {
    const result = await storage.local.get([
      "passwordHash",
      "salt",
      "encryptedApiKey",
      "encryptedApiBaseUrl",
      "encryptedProfile",
      "encryptedResume",
      "encryptedProfiles",
      "encryptedProfileIds",
    ]);

    return result as SecureStorageData;
  }

  private async setStorage(data: Partial<SecureStorageData>) {
    await storage.local.set(data);
  }

  // ------------------------
  // Password Setup
  // ------------------------

  async initialize(password: string) {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const passwordHash = await this.derivePasswordHash(password, salt);

      await this.setStorage({
        passwordHash: this.toBase64(new Uint8Array(passwordHash)),
        salt: this.toBase64(salt),
      });

      logger.info(LOG_CONTEXT, "Storage initialized");
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to initialize storage",
        error,
      });
      throw error;
    }
  }

  async unlock(password: string): Promise<boolean> {
    try {
      const storage = await this.getStorage();

      if (!storage.passwordHash) {
        logger.warn(LOG_CONTEXT, "Unlock attempted before storage was initialized");
        throw new Error("Storage not initialized");
      }

      const salt = this.fromBase64(storage.salt);
      const expectedHash = this.fromBase64(storage.passwordHash);
      const actualHash = await this.derivePasswordHash(password, salt);

      if (!this.timingSafeEqual(actualHash, expectedHash)) {
        logger.warn(LOG_CONTEXT, "Unlock failed: incorrect password");
        return false;
      }

      this.encryptionKey = await this.deriveKey(password, salt);

      this.unlocked = true;

      logger.info(LOG_CONTEXT, "Storage unlocked");
      return true;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to unlock storage",
        error,
      });
      throw error;
    }
  }

  lock() {
    this.encryptionKey = null;
    this.unlocked = false;
    logger.info(LOG_CONTEXT, "Storage locked");
  }

  isUnlocked() {
    return this.unlocked;
  }

  async isInitialized(): Promise<boolean> {
    const storage = await this.getStorage();
    return !!storage.passwordHash;
  }

  // ------------------------
  // Session
  // ------------------------

  private readonly SESSION_KEY = "securefill-session";

  async createSession(password: string, durationMs = 60 * 60 * 1000) {
    try {
      await storage.session.set({
        [this.SESSION_KEY]: {
          password,
          expiresAt: Date.now() + durationMs,
        },
      });
      logger.info(LOG_CONTEXT, "Session created", { durationMs });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to create session",
        error,
      });
      throw error;
    }
  }

  async getSessionPassword(): Promise<string | null> {
    try {
      const result = await storage.session.get(this.SESSION_KEY);
      const session = result[this.SESSION_KEY] as
        | { password: string; expiresAt: number }
        | undefined;

      if (!session) {
        return null;
      }

      if (Date.now() > session.expiresAt) {
        await storage.session.remove(this.SESSION_KEY);
        logger.debug(LOG_CONTEXT, "Session expired");
        return null;
      }

      return session.password;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to read session password",
        error,
      });
      return null;
    }
  }

  async clearSession() {
    await storage.session.remove(this.SESSION_KEY);
    await storage.session.remove("apiKey");
    await storage.session.remove("apiBaseUrl");
  }

  /**
   * Copies the decrypted API key and base URL into session storage so the
   * background service worker can read them without the user's password.
   */
  async syncSessionCredentials(): Promise<void> {
    try {
      this.ensureUnlocked();

      const [apiKey, apiBaseUrl] = await Promise.all([
        this.getApiKey(),
        this.getApiBaseUrl(),
      ]);

      await storage.session.set({
        apiKey: apiKey ?? "",
        apiBaseUrl: apiBaseUrl ?? "",
      });

      logger.info(LOG_CONTEXT, "Session credentials synced");
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to sync session credentials",
        error,
      });
      throw error;
    }
  }

  async getSessionApiKey(): Promise<string | null> {
    try {
      const result = await storage.session.get("apiKey");
      const apiKey = (result.apiKey as string | undefined) ?? null;
      logger.debug(LOG_CONTEXT, "Resolved session API key", { hasKey: !!apiKey });
      return apiKey;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to read session API key",
        error,
      });
      return null;
    }
  }

  async getSessionApiBaseUrl(): Promise<string | null> {
    try {
      const result = await storage.session.get("apiBaseUrl");
      const apiBaseUrl = (result.apiBaseUrl as string | undefined) ?? null;
      logger.debug(LOG_CONTEXT, "Resolved session API base URL", { hasBaseUrl: !!apiBaseUrl });
      return apiBaseUrl;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to read session API base URL",
        error,
      });
      return null;
    }
  }

  // ------------------------
  // Profiles
  // ------------------------

  async saveApplicationProfile(profile: ApplicationProfile) {
    try {
      this.ensureUnlocked();

      const encrypted = await this.encrypt(JSON.stringify(profile));
      await this.profileDB.save(profile.id, encrypted);

      const storage = await this.getStorage();
      let ids: string[] = [];
      if (storage.encryptedProfileIds) {
        ids = JSON.parse(await this.decrypt(storage.encryptedProfileIds));
      }

      if (!ids.includes(profile.id)) {
        ids.push(profile.id);
        await this.setStorage({
          encryptedProfileIds: await this.encrypt(JSON.stringify(ids)),
        });
      }

      logger.info(LOG_CONTEXT, "Application profile saved", { profileId: profile.id });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to save application profile",
        error,
        extra: { profileId: profile.id },
      });
      throw error;
    }
  }

  async saveProfiles(profiles: ApplicationProfile[]) {
    this.ensureUnlocked();

    for (const profile of profiles) {
      const encrypted = await this.encrypt(JSON.stringify(profile));
      await this.profileDB.save(profile.id, encrypted);
    }

    const ids = profiles.map((profile) => profile.id);
    await this.setStorage({
      encryptedProfileIds: await this.encrypt(JSON.stringify(ids)),
    });

    await this.profileDB.deleteAllExcept(new Set(ids));
  }

  async getProfiles(): Promise<ApplicationProfile[]> {
    try {
      this.ensureUnlocked();

      const storage = await this.getStorage();

      if (!storage.encryptedProfileIds) {
        return [];
      }

      const ids = JSON.parse(await this.decrypt(storage.encryptedProfileIds)) as string[];
      if (ids.length === 0) {
        return [];
      }

      const encryptedById = await this.profileDB.getAll(ids);
      const profiles: ApplicationProfile[] = [];

      for (const id of ids) {
        const encrypted = encryptedById[id];
        if (!encrypted) {
          logger.warn(LOG_CONTEXT, "Profile referenced but missing from IndexedDB", { profileId: id });
          continue;
        }
        const decrypted = await this.decrypt(encrypted);
        profiles.push(JSON.parse(decrypted));
      }

      logger.info(LOG_CONTEXT, "Loaded application profiles", { count: profiles.length });
      return profiles;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to load application profiles",
        error,
      });
      throw error;
    }
  }

  async getApplicationProfile(id: string): Promise<ApplicationProfile | null> {
    try {
      this.ensureUnlocked();

      const storage = await this.getStorage();
      if (!storage.encryptedProfileIds) {
        return null;
      }

      const ids = JSON.parse(await this.decrypt(storage.encryptedProfileIds)) as string[];
      if (!ids.includes(id)) {
        logger.debug(LOG_CONTEXT, "Profile not found in id list", { profileId: id });
        return null;
      }

      const encrypted = await this.profileDB.get(id);
      if (!encrypted) {
        logger.warn(LOG_CONTEXT, "Profile referenced but missing from IndexedDB", { profileId: id });
        return null;
      }

      const decrypted = await this.decrypt(encrypted);
      logger.info(LOG_CONTEXT, "Loaded application profile", { profileId: id });
      return JSON.parse(decrypted) as ApplicationProfile;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to load application profile",
        error,
        extra: { profileId: id },
      });
      throw error;
    }
  }

  async deleteApplicationProfile(id: string) {
    try {
      this.ensureUnlocked();

      await this.profileDB.delete(id);

      const storage = await this.getStorage();
      if (!storage.encryptedProfileIds) {
        return;
      }

      const ids = JSON.parse(await this.decrypt(storage.encryptedProfileIds)) as string[];
      const nextIds = ids.filter((profileId) => profileId !== id);
      await this.setStorage({
        encryptedProfileIds: await this.encrypt(JSON.stringify(nextIds)),
      });

      logger.info(LOG_CONTEXT, "Application profile deleted", { profileId: id });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to delete application profile",
        error,
        extra: { profileId: id },
      });
      throw error;
    }
  }

  // ------------------------
  // API Key
  // ------------------------

  async saveApiKey(apiKey: string) {
    try {
      this.ensureUnlocked();

      const encrypted = await this.encrypt(apiKey);

      await this.setStorage({
        encryptedApiKey: encrypted,
      });

      logger.info(LOG_CONTEXT, "API key saved");
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to save API key",
        error,
      });
      throw error;
    }
  }

  async getApiKey(): Promise<string | null> {
    try {
      this.ensureUnlocked();

      const storage = await this.getStorage();

      if (!storage.encryptedApiKey) {
        return null;
      }

      logger.debug(LOG_CONTEXT, "API key retrieved");
      return this.decrypt(storage.encryptedApiKey);
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to get API key",
        error,
      });
      throw error;
    }
  }

  async saveApiBaseUrl(apiBaseUrl: string) {
    try {
      this.ensureUnlocked();

      const encrypted = await this.encrypt(apiBaseUrl);

      await this.setStorage({
        encryptedApiBaseUrl: encrypted,
      });

      logger.info(LOG_CONTEXT, "API base URL saved");
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to save API base URL",
        error,
      });
      throw error;
    }
  }

  async getApiBaseUrl(): Promise<string | null> {
    try {
      this.ensureUnlocked();

      const storage = await this.getStorage();

      if (!storage.encryptedApiBaseUrl) {
        return null;
      }

      logger.debug(LOG_CONTEXT, "API base URL retrieved");
      return this.decrypt(storage.encryptedApiBaseUrl);
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to get API base URL",
        error,
      });
      throw error;
    }
  }

  async saveModel(model: string) {
    try {
      // Model identifiers are not sensitive, so they are stored unencrypted so
      // the background service worker can read them without the user's password.
      await storage.local.set({ model });
      logger.info(LOG_CONTEXT, "Model saved", { model });
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to save model",
        error,
        extra: { model },
      });
      throw error;
    }
  }

  async getModel(): Promise<string | null> {
    try {
      const result = await storage.local.get("model");
      const model = (result.model as string | undefined) ?? null;
      logger.debug(LOG_CONTEXT, "Model retrieved", { model });
      return model;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to get model",
        error,
      });
      throw error;
    }
  }

  // ------------------------
  // Resume
  // ------------------------

  async saveResumeMarkdown(markdown: string) {
    try {
      this.ensureUnlocked();

      const encrypted = await this.encrypt(markdown);

      await this.setStorage({
        encryptedResume: encrypted,
      });

      logger.info(LOG_CONTEXT, "Resume markdown saved");
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to save resume markdown",
        error,
      });
      throw error;
    }
  }

  async getResumeMarkdown(): Promise<string | null> {
    try {
      this.ensureUnlocked();

      const storage = await this.getStorage();

      if (!storage.encryptedResume) {
        return null;
      }

      logger.debug(LOG_CONTEXT, "Resume markdown retrieved");
      return this.decrypt(storage.encryptedResume);
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to get resume markdown",
        error,
      });
      throw error;
    }
  }

  // ------------------------
  // Encryption
  // ------------------------

  private async derivePasswordHash(
    password: string,
    salt: Uint8Array
  ): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();

    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    return crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new Uint8Array(salt),
        iterations: 600_000,
        hash: "SHA-256",
      },
      baseKey,
      256
    );
  }

  private async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();

    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: new Uint8Array(salt),
        iterations: 600_000,
        hash: "SHA-256",
      },
      baseKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    );
  }

  private async encrypt(
    plaintext: string
  ): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error("Missing encryption key");
    }

    const iv = crypto.getRandomValues(
      new Uint8Array(12)
    );

    const encoded = new TextEncoder().encode(
      plaintext
    );

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      this.encryptionKey,
      encoded
    );

    const combined = new Uint8Array(
      iv.length + ciphertext.byteLength
    );

    combined.set(iv, 0);
    combined.set(
      new Uint8Array(ciphertext),
      iv.length
    );

    return this.toBase64(combined);
  }

  private async decrypt(
    payload: string
  ): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error("Missing encryption key");
    }

    const bytes = this.fromBase64(payload);

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      this.encryptionKey,
      ciphertext
    );

    return new TextDecoder().decode(plaintext);
  }

  // ------------------------
  // Utilities
  // ------------------------

  private ensureUnlocked() {
    if (!this.unlocked) {
      throw new Error(
        "Storage is locked. Call unlock() first."
      );
    }
  }

  private timingSafeEqual(a: ArrayBuffer, b: Uint8Array): boolean {
    const aBytes = new Uint8Array(a);
    const bBytes = b;

    if (aBytes.length !== bBytes.length) {
      return false;
    }

    let diff = 0;
    for (let i = 0; i < aBytes.length; i++) {
      diff |= aBytes[i] ^ bBytes[i];
    }

    return diff === 0;
  }

  private toBase64(data: Uint8Array): string {
    return btoa(
      String.fromCharCode(...data)
    );
  }

  private fromBase64(base64: string): Uint8Array {
    return Uint8Array.from(
      atob(base64),
      c => c.charCodeAt(0)
    );
  }
}
