import type {
  Answer,
  CandidateContext,
  CandidateProfile,
  CandidateSummary,
  ClassificationResult,
  JobContext,
  Prompt,
} from "./types";

export interface ProfileRepository {
  getProfile(profileId: string): Promise<CandidateProfile | null>;
}

export interface LLMProvider {
  generate(prompt: Prompt): Promise<string>;
}

export interface PromptTemplate {
  system: string;
  user: string;
}

export interface PromptTemplateRepository {
  getTemplate(name: string): Promise<PromptTemplate | null>;
}

export interface KnowledgeClassifier {
  classify(question: string): Promise<ClassificationResult>;
}

export interface ContextSelector {
  select(
    profile: CandidateProfile,
    classification: ClassificationResult
  ): CandidateContext;
}

export interface PromptBuilder {
  build(
    question: string,
    context: CandidateContext,
    jobContext?: JobContext
  ): Promise<Prompt>;
}

export interface AnswerEngine {
  answer(
    question: string,
    profileId: string,
    jobContext?: JobContext
  ): Promise<Answer>;
}

export interface KnowledgeService {
  getProfile(profileId: string): Promise<CandidateProfile | null>;
  getSummary(profileId: string): Promise<CandidateSummary>;
  lookup(profile: CandidateProfile, key: string): unknown | null;
}

export interface Cache {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
