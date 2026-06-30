import type { ProfileRepository, KnowledgeService } from "./interfaces";
import type {
  CandidateProfile,
  CandidateSummary,
  KnowledgeKey,
  KnowledgeLookupResult,
} from "./types";
import { ProfileNotFoundError } from "./errors";

export type { KnowledgeKey, KnowledgeLookupResult };

export class DefaultKnowledgeService implements KnowledgeService {
  private repository: ProfileRepository;

  constructor(repository: ProfileRepository) {
    this.repository = repository;
  }

  async getProfile(profileId: string): Promise<CandidateProfile | null> {
    return this.repository.getProfile(profileId);
  }

  async getSummary(profileId: string): Promise<CandidateSummary> {
    const profile = await this.getProfile(profileId);

    if (!profile) {
      throw new ProfileNotFoundError(profileId);
    }

    const currentExperience = profile.experience.find(
      (exp) => exp.endDate === null
    );

    const highestEducation = profile.education.at(-1);

    return {
      currentTitle: currentExperience?.title,
      currentCompany: currentExperience?.company,
      totalYearsExperience: this.calculateYearsOfExperience(profile.experience),
      highestDegree: highestEducation?.degree,
      skills: [...profile.skills],
    };
  }

  lookup(profile: CandidateProfile, key: string): unknown | null {
    if (!isKnowledgeKey(key)) {
      return null;
    }

    switch (key) {
      case "name":
      case "email":
      case "phone":
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
      const start = new Date(experience.startDate);
      const end = experience.endDate ? new Date(experience.endDate) : new Date();

      totalMilliseconds += end.getTime() - start.getTime();
    }

    const years = totalMilliseconds / (1000 * 60 * 60 * 24 * 365.25);

    return Math.round(years * 10) / 10;
  }
}

function isKnowledgeKey(key: string): key is KnowledgeKey {
  return [
    "name",
    "email",
    "phone",
    "website",
    "linkedin",
    "github",
    "skills",
    "education",
    "experience",
    "projects",
  ].includes(key);
}
