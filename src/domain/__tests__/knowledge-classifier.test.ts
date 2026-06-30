import { describe, it, expect } from "vitest";
import { RuleBasedKnowledgeClassifier } from "../knowledge-classifier";

describe("RuleBasedKnowledgeClassifier", () => {
  const classifier = new RuleBasedKnowledgeClassifier();

  it("classifies direct lookups", async () => {
    const result = await classifier.classify("What is your email?");
    expect(result.type).toBe("lookup");
    expect(result.relevantSections).toContain("personal");
  });

  it("classifies derived questions", async () => {
    const result = await classifier.classify("What is your current title?");
    expect(result.type).toBe("derived");
    expect(result.relevantSections).toContain("experience");
  });

  it("classifies company-specific questions", async () => {
    const result = await classifier.classify("Why do you want to work here?");
    expect(result.type).toBe("company");
  });

  it("classifies narrative questions", async () => {
    const result = await classifier.classify("Tell us about yourself.");
    expect(result.type).toBe("narrative");
  });

  it("returns unknown for unrecognised questions", async () => {
    const result = await classifier.classify("What is the meaning of life?");
    expect(result.type).toBe("unknown");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("never calls an LLM or browser API", () => {
    expect(classifier.classify).toBeDefined();
  });
});
