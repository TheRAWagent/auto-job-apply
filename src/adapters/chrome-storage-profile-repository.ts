import type { ProfileRepository } from "@/domain/interfaces";
import type { CandidateProfile } from "@/domain/types";
import { SecureStorage } from "@/lib/secure-storage";

export class ChromeStorageProfileRepository implements ProfileRepository {
  private storage: SecureStorage;

  constructor(storage: SecureStorage = new SecureStorage()) {
    this.storage = storage;
  }

  async getProfile(profileId: string): Promise<CandidateProfile | null> {
    const applicationProfile = await this.storage.getApplicationProfile(profileId);
    return applicationProfile?.json ?? null;
  }
}
