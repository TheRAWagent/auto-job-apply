import { describe, it, expect } from "vitest";
import { DefaultAnswerEngine } from "../answer-engine";
import { DefaultKnowledgeService } from "../knowledge-service";
import { RuleBasedKnowledgeClassifier } from "../knowledge-classifier";
import { MinimalContextSelector } from "../context-selector";
import { DefaultPromptBuilder } from "../prompt-builder";
import { ProfileNotFoundError } from "../errors";
import {
  createCandidateProfile,
  createMockLLMProvider,
  createMockProfileRepository,
} from "./mocks";

describe("DefaultAnswerEngine", () => {
  const profile = createCandidateProfile();
  const repository = createMockProfileRepository({ "profile-1": profile });
  const knowledgeService = new DefaultKnowledgeService(repository);
  const engine = new DefaultAnswerEngine({
    classifier: new RuleBasedKnowledgeClassifier(),
    contextSelector: new MinimalContextSelector(),
    promptBuilder: new DefaultPromptBuilder(),
    llmProvider: createMockLLMProvider("LLM response"),
    knowledgeService,
  });

  it("answers lookup questions from the profile", async () => {
    const answer = await engine.answer("What is your email?", "profile-1");
    expect(answer.value).toBe("alex@example.com");
    expect(answer.source).toBe("lookup");
  });

  it("answers derived questions from the summary", async () => {
    const answer = await engine.answer("What is your current title?", "profile-1");
    expect(answer.value).toBe("Senior Engineer");
    expect(answer.source).toBe("derived");
  });

  it("falls back to the LLM for narrative questions", async () => {
    const answer = await engine.answer("Tell us about yourself.", "profile-1");
    expect(answer.value).toBe("LLM response");
    expect(answer.source).toBe("llm");
  });

  it("throws when the profile is missing", async () => {
    await expect(engine.answer("What is your email?", "missing")).rejects.toThrow(
      ProfileNotFoundError
    );
  });
});
