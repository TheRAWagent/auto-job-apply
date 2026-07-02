import type { ProfileRepository } from "@/domain/interfaces";
import type { CandidateProfile } from "@/domain/types";
import { SecureStorage } from "@/lib/secure-storage";
import { logger } from "@/lib/logger";

const LOG_CONTEXT = "chrome-storage-profile-repository";

export class ChromeStorageProfileRepository implements ProfileRepository {
  private storage: SecureStorage;

  constructor(storage: SecureStorage = new SecureStorage()) {
    this.storage = storage;
  }

  async getProfile(profileId: string): Promise<CandidateProfile | null> {
    try {
      logger.debug(LOG_CONTEXT, "Fetching profile", { profileId });
      const applicationProfile = await this.storage.getApplicationProfile(profileId);

      if (!applicationProfile) {
        logger.warn(LOG_CONTEXT, "Profile not found", { profileId });
        return null;
      }

      logger.debug(LOG_CONTEXT, "Profile fetched", { profileId });
      return applicationProfile.json;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to fetch profile",
        error,
        extra: { profileId },
      });
      throw error;
    }
  }
}
