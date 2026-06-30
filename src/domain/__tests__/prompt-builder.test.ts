import { describe, it, expect } from "vitest";
import { DefaultPromptBuilder } from "../prompt-builder";
import { createCandidateProfile, createMockTemplateRepository } from "./mocks";
import { MinimalContextSelector } from "../context-selector";

describe("DefaultPromptBuilder", () => {
  const profile = createCandidateProfile();
  const context = new MinimalContextSelector().select(profile, {
    type: "lookup",
    confidence: 1,
    relevantSections: ["personal"],
  });

  it("builds a prompt from context and question", async () => {
    const builder = new DefaultPromptBuilder();
    const prompt = await builder.build("What is your email?", context);

    expect(prompt.system).toContain("candidate profile context");
    expect(prompt.user).toContain("What is your email?");
    expect(prompt.user).toContain(profile.email);
  });

  it("uses custom templates when provided", async () => {
    const builder = new DefaultPromptBuilder(
      createMockTemplateRepository({
        system: "Custom system",
        user: "Question: {{question}}",
      })
    );

    const prompt = await builder.build("What is your email?", context);
    expect(prompt.system).toBe("Custom system");
    expect(prompt.user).toBe("Question: What is your email?");
  });

  it("includes job context when provided", async () => {
    const builder = new DefaultPromptBuilder();
    const prompt = await builder.build("Why here?", context, {
      companyName: "Acme",
      jobTitle: "Engineer",
    });

    expect(prompt.user).toContain("Acme");
    expect(prompt.user).toContain("Engineer");
  });
});
