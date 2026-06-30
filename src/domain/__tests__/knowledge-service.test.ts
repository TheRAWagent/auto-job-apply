import { describe, it, expect } from "vitest";
import { DefaultKnowledgeService } from "../knowledge-service";
import { ProfileNotFoundError } from "../errors";
import { createCandidateProfile, createMockProfileRepository } from "./mocks";

describe("DefaultKnowledgeService", () => {
  const profile = createCandidateProfile();
  const repository = createMockProfileRepository({ "profile-1": profile });
  const service = new DefaultKnowledgeService(repository);

  it("retrieves a profile by id", async () => {
    const result = await service.getProfile("profile-1");
    expect(result).toEqual(profile);
  });

  it("returns null when profile is missing", async () => {
    const result = await service.getProfile("missing");
    expect(result).toBeNull();
  });

  it("builds a summary from the profile", async () => {
    const summary = await service.getSummary("profile-1");

    expect(summary.currentTitle).toBe("Senior Engineer");
    expect(summary.currentCompany).toBe("TechCorp");
    expect(summary.highestDegree).toBe("B.S. Computer Science");
    expect(summary.skills).toEqual(["TypeScript", "React", "Node.js"]);
    expect(summary.totalYearsExperience).toBeGreaterThan(0);
  });

  it("throws ProfileNotFoundError when summarizing a missing profile", async () => {
    await expect(service.getSummary("missing")).rejects.toThrow(ProfileNotFoundError);
  });

  it("looks up top-level keys", () => {
    expect(service.lookup(profile, "name")).toBe("Alex Rivera");
    expect(service.lookup(profile, "email")).toBe("alex@example.com");
    expect(service.lookup(profile, "skills")).toEqual(["TypeScript", "React", "Node.js"]);
  });

  it("returns null for unknown lookup keys", () => {
    expect(service.lookup(profile, "favoriteColor")).toBeNull();
  });

  it("returns detailed lookup results", () => {
    const result = service.lookupDetailed(profile, "github");
    expect(result.key).toBe("github");
    expect(result.value).toBe("https://github.com/alex");
    expect(result.found).toBe(true);
  });
});
