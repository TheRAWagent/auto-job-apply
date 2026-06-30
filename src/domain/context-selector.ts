import type { ContextSelector } from "./interfaces";
import type { CandidateContext, CandidateProfile, ClassificationResult } from "./types";

export class MinimalContextSelector implements ContextSelector {
  select(
    profile: CandidateProfile,
    classification: ClassificationResult
  ): CandidateContext {
    const context: CandidateContext = {};
    const sections = new Set(classification.relevantSections);

    if (sections.has("personal")) {
      context.personal = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        website: profile.website,
        linkedin: profile.linkedin,
        github: profile.github,
      };
    }

    if (sections.has("education") && profile.education.length > 0) {
      context.education = [...profile.education];
    }

    if (sections.has("experience") && profile.experience.length > 0) {
      context.experience = [...profile.experience];
    }

    if (sections.has("projects") && profile.projects.length > 0) {
      context.projects = [...profile.projects];
    }

    if (sections.has("skills") && profile.skills.length > 0) {
      context.skills = [...profile.skills];
    }

    return context;
  }
}
