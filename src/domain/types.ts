import type { ProfileSchema } from "@/components/profile-form";

export type CandidateProfile = ProfileSchema;

export type KnowledgeKey =
  | "name"
  | "firstName"
  | "middleName"
  | "lastName"
  | "email"
  | "phone"
  | "countryCode"
  | "phoneNumber"
  | "website"
  | "linkedin"
  | "github"
  | "twitter"
  | "skills"
  | "education"
  | "experience"
  | "projects";

export interface KnowledgeLookupResult<T = unknown> {
  key: KnowledgeKey;
  value: T | null;
  found: boolean;
}

export type ProfileSection =
  | "personal"
  | "education"
  | "experience"
  | "projects"
  | "skills";

export type ClassificationType =
  | "lookup"
  | "derived"
  | "narrative"
  | "company"
  | "unknown";

export interface ClassificationResult {
  type: ClassificationType;
  confidence: number;
  relevantSections: ProfileSection[];
}

export interface CandidateContext {
  personal?: {
    fullName: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string;
    phone: string;
    countryCode: string;
    phoneNumber: string;
    website: string | null;
    linkedin: string | null;
    github: string | null;
    twitter: string | null;
  };
  education?: CandidateProfile["education"];
  experience?: CandidateProfile["experience"];
  projects?: CandidateProfile["projects"];
  skills?: CandidateProfile["skills"];
}

export interface Prompt {
  system: string;
  user: string;
  temperature?: number;
}

export type AnswerSource = "lookup" | "derived" | "llm";

export interface Answer {
  value: string;
  source: AnswerSource;
}

export interface JobContext {
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
}

export interface CandidateSummary {
  currentTitle?: string;
  currentCompany?: string;
  totalYearsExperience: number;
  highestDegree?: string;
  skills: string[];
}
