import { describe, it, expect } from "vitest";
import { MinimalContextSelector } from "../context-selector";
import { createCandidateProfile } from "./mocks";

describe("MinimalContextSelector", () => {
  const selector = new MinimalContextSelector();
  const profile = createCandidateProfile();

  it("returns only personal context for email questions", () => {
    const context = selector.select(profile, {
      type: "lookup",
      confidence: 0.9,
      relevantSections: ["personal"],
    });

    expect(context.personal).toEqual({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
      linkedin: profile.linkedin,
      github: profile.github,
    });
    expect(context.experience).toBeUndefined();
  });

  it("returns experience and projects for project narrative questions", () => {
    const context = selector.select(profile, {
      type: "narrative",
      confidence: 0.8,
      relevantSections: ["projects", "experience", "skills"],
    });

    expect(context.projects).toEqual(profile.projects);
    expect(context.experience).toEqual(profile.experience);
    expect(context.skills).toEqual(profile.skills);
    expect(context.education).toBeUndefined();
  });

  it("omits empty sections", () => {
    const emptyProfile = createCandidateProfile({
      education: [],
      experience: [],
      projects: [],
      skills: [],
    });

    const context = selector.select(emptyProfile, {
      type: "narrative",
      confidence: 0.8,
      relevantSections: ["education", "experience", "projects", "skills"],
    });

    expect(context.education).toBeUndefined();
    expect(context.experience).toBeUndefined();
    expect(context.projects).toBeUndefined();
    expect(context.skills).toBeUndefined();
  });
});
