import { storage } from 'webextension-polyfill';

type LegacyProfile = {
  personal: {
    name: string;
    email: string;
    phone: string;
  };

  education?: unknown[];
  experience?: unknown[];
  links?: Record<string, string>;
};

export type ApplicationProfile = {
  id: string;
  name: string;
  pdfBase64?: string;
  pdfUrl?: string;
  markdown?: string;
  markdownUrl?: string;
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
};

export class SecureStorage {
  private encryptionKey: CryptoKey | null = null;
  private unlocked = false;

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
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordHash = await this.derivePasswordHash(password, salt);

    await this.setStorage({
      passwordHash: this.toBase64(new Uint8Array(passwordHash)),
      salt: this.toBase64(salt),
    });
  }

  async unlock(password: string): Promise<boolean> {
    const storage = await this.getStorage();

    if (!storage.passwordHash) {
      throw new Error("Storage not initialized");
    }

    const salt = this.fromBase64(storage.salt);
    const expectedHash = this.fromBase64(storage.passwordHash);
    const actualHash = await this.derivePasswordHash(password, salt);

    if (!this.timingSafeEqual(actualHash, expectedHash)) {
      return false;
    }

    this.encryptionKey = await this.deriveKey(password, salt);

    this.unlocked = true;

    return true;
  }

  lock() {
    this.encryptionKey = null;
    this.unlocked = false;
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
    await storage.session.set({
      [this.SESSION_KEY]: {
        password,
        expiresAt: Date.now() + durationMs,
      },
    });
  }

  async getSessionPassword(): Promise<string | null> {
    const result = await storage.session.get(this.SESSION_KEY);
    const session = result[this.SESSION_KEY] as
      | { password: string; expiresAt: number }
      | undefined;

    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      await storage.session.remove(this.SESSION_KEY);
      return null;
    }

    return session.password;
  }

  async clearSession() {
    await storage.session.remove(this.SESSION_KEY);
  }

  // ------------------------
  // Profiles
  // ------------------------

  async saveProfiles(profiles: ApplicationProfile[]) {
    this.ensureUnlocked();

    const encrypted = await this.encrypt(
      JSON.stringify(profiles)
    );

    await this.setStorage({
      encryptedProfiles: encrypted,
    });
  }

  async getProfiles(): Promise<ApplicationProfile[]> {
    this.ensureUnlocked();

    const storage = await this.getStorage();

    if (!storage.encryptedProfiles) {
      return [];
    }

    const decrypted = await this.decrypt(
      storage.encryptedProfiles
    );

    return JSON.parse(decrypted);
  }

  // ------------------------
  // API Key
  // ------------------------

  async saveApiKey(apiKey: string) {
    this.ensureUnlocked();

    const encrypted = await this.encrypt(apiKey);

    await this.setStorage({
      encryptedApiKey: encrypted,
    });
  }

  async getApiKey(): Promise<string | null> {
    this.ensureUnlocked();

    const storage = await this.getStorage();

    if (!storage.encryptedApiKey) {
      return null;
    }

    return this.decrypt(storage.encryptedApiKey);
  }

  async saveApiBaseUrl(apiBaseUrl: string) {
    this.ensureUnlocked();

    const encrypted = await this.encrypt(apiBaseUrl);

    await this.setStorage({
      encryptedApiBaseUrl: encrypted,
    });
  }

  async getApiBaseUrl(): Promise<string | null> {
    this.ensureUnlocked();

    const storage = await this.getStorage();

    if (!storage.encryptedApiBaseUrl) {
      return null;
    }

    return this.decrypt(storage.encryptedApiBaseUrl);
  }

  // ------------------------
  // Profile
  // ------------------------

  async saveProfile(profile: LegacyProfile) {
    this.ensureUnlocked();

    const encrypted = await this.encrypt(
      JSON.stringify(profile)
    );

    await this.setStorage({
      encryptedProfile: encrypted,
    });
  }

  async getProfile(): Promise<LegacyProfile | null> {
    this.ensureUnlocked();

    const storage = await this.getStorage();

    if (!storage.encryptedProfile) {
      return null;
    }

    const decrypted = await this.decrypt(
      storage.encryptedProfile
    );

    return JSON.parse(decrypted);
  }

  // ------------------------
  // Resume
  // ------------------------

  async saveResumeMarkdown(markdown: string) {
    this.ensureUnlocked();

    const encrypted = await this.encrypt(markdown);

    await this.setStorage({
      encryptedResume: encrypted,
    });
  }

  async getResumeMarkdown(): Promise<string | null> {
    this.ensureUnlocked();

    const storage = await this.getStorage();

    if (!storage.encryptedResume) {
      return null;
    }

    return this.decrypt(storage.encryptedResume);
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
