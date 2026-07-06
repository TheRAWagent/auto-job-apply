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

  it("answers full name questions with the concatenated name", async () => {
    const answer = await engine.answer("What is your full name?", "profile-1");
    expect(answer.value).toBe("Alex Rivera");
    expect(answer.source).toBe("lookup");
  });

  it("answers first name questions", async () => {
    const answer = await engine.answer("What is your first name?", "profile-1");
    expect(answer.value).toBe("Alex");
    expect(answer.source).toBe("lookup");
  });

  it("answers phone questions with the combined number", async () => {
    const answer = await engine.answer("What is your phone?", "profile-1");
    expect(answer.value).toBe("+1555-1234");
    expect(answer.source).toBe("lookup");
  });

  it("answers country code questions", async () => {
    const answer = await engine.answer("What is your country code?", "profile-1");
    expect(answer.value).toBe("+1");
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

  it("returns a blank answer for missing deterministic fields instead of using the LLM", async () => {
    const sparseProfile = createCandidateProfile({
      github: null,
      twitter: null,
    });
    const sparseRepository = createMockProfileRepository({ "sparse": sparseProfile });
    const sparseKnowledgeService = new DefaultKnowledgeService(sparseRepository);
    const llmEngine = new DefaultAnswerEngine({
      classifier: new RuleBasedKnowledgeClassifier(),
      contextSelector: new MinimalContextSelector(),
      promptBuilder: new DefaultPromptBuilder(),
      llmProvider: createMockLLMProvider("Not provided"),
      knowledgeService: sparseKnowledgeService,
    });

    const githubAnswer = await llmEngine.answer("What is your GitHub profile?", "sparse");
    expect(githubAnswer.value).toBe("");
    expect(githubAnswer.source).toBe("lookup");

    const twitterAnswer = await llmEngine.answer("What is your Twitter profile?", "sparse");
    expect(twitterAnswer.value).toBe("");
    expect(twitterAnswer.source).toBe("lookup");
  });
});
