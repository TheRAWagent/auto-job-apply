import type { ProfileRepository, KnowledgeService } from "./interfaces";
import type {
  CandidateProfile,
  CandidateSummary,
  KnowledgeKey,
  KnowledgeLookupResult,
} from "./types";
import { ProfileNotFoundError } from "./errors";
import { logger } from "@/lib/logger";
import { getFullName, getFullPhoneNumber } from "./profile-utils";

const LOG_CONTEXT = "knowledge-service";

export type { KnowledgeKey, KnowledgeLookupResult };

export class DefaultKnowledgeService implements KnowledgeService {
  private repository: ProfileRepository;

  constructor(repository: ProfileRepository) {
    this.repository = repository;
  }

  async getProfile(profileId: string): Promise<CandidateProfile | null> {
    try {
      logger.debug(LOG_CONTEXT, "Fetching profile", { profileId });
      return await this.repository.getProfile(profileId);
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

  async getSummary(profileId: string): Promise<CandidateSummary> {
    try {
      logger.debug(LOG_CONTEXT, "Generating profile summary", { profileId });
      const profile = await this.getProfile(profileId);

      if (!profile) {
        logger.warn(LOG_CONTEXT, "Profile not found for summary", { profileId });
        throw new ProfileNotFoundError(profileId);
      }

      const currentExperience = profile.experience.find(
        (exp) => exp.endDate === null
      );

      const highestEducation = profile.education.at(-1);

      const summary: CandidateSummary = {
        currentTitle: currentExperience?.title,
        currentCompany: currentExperience?.company,
        totalYearsExperience: this.calculateYearsOfExperience(profile.experience),
        highestDegree: highestEducation?.degree,
        skills: [...profile.skills],
      };

      logger.debug(LOG_CONTEXT, "Profile summary generated", {
        profileId,
        totalYearsExperience: summary.totalYearsExperience,
      });

      return summary;
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to generate profile summary",
        error,
        extra: { profileId },
      });
      throw error;
    }
  }

  lookup(profile: CandidateProfile, key: string): unknown | null {
    if (!isKnowledgeKey(key)) {
      return null;
    }

    switch (key) {
      case "name":
        return getFullName(profile);
      case "firstName":
        return profile.firstName;
      case "middleName":
        return profile.middleName;
      case "lastName":
        return profile.lastName;
      case "phone":
        return getFullPhoneNumber(profile);
      case "countryCode":
        return profile.countryCode;
      case "phoneNumber":
        return profile.phoneNumber;
      case "email":
      case "website":
      case "linkedin":
      case "github":
        return profile[key];
      case "skills":
        return [...profile.skills];
      case "education":
        return [...profile.education];
      case "experience":
        return [...profile.experience];
      case "projects":
        return [...profile.projects];
      default:
        return null;
    }
  }

  lookupDetailed<T = unknown>(
    profile: CandidateProfile,
    key: KnowledgeKey
  ): KnowledgeLookupResult<T> {
    const value = this.lookup(profile, key);
    return {
      key,
      value: value as T,
      found: value !== null,
    };
  }

  private calculateYearsOfExperience(
    experiences: CandidateProfile["experience"]
  ): number {
    if (experiences.length === 0) {
      return 0;
    }

    let totalMilliseconds = 0;

    for (const experience of experiences) {
      try {
        const start = new Date(experience.startDate);
        const end = experience.endDate ? new Date(experience.endDate) : new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          logger.warn(LOG_CONTEXT, "Invalid experience date", {
            startDate: experience.startDate,
            endDate: experience.endDate,
          });
          continue;
        }

        totalMilliseconds += end.getTime() - start.getTime();
      } catch (error) {
        logger.reportError({
          context: LOG_CONTEXT,
          message: "Failed to calculate experience duration",
          error,
          extra: { experience },
        });
      }
    }

    const years = totalMilliseconds / (1000 * 60 * 60 * 24 * 365.25);

    return Math.round(years * 10) / 10;
  }
}

function isKnowledgeKey(key: string): key is KnowledgeKey {
  return [
    "name",
    "firstName",
    "middleName",
    "lastName",
    "email",
    "phone",
    "countryCode",
    "phoneNumber",
    "website",
    "linkedin",
    "github",
    "skills",
    "education",
    "experience",
    "projects",
  ].includes(key);
}
