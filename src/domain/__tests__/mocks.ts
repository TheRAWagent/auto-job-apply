import type { ProfileRepository, LLMProvider, PromptTemplateRepository, PromptTemplate } from "../interfaces";
import type { CandidateProfile } from "../types";

export function createMockProfileRepository(
  profiles: Record<string, CandidateProfile | null> = {}
): ProfileRepository {
  return {
    async getProfile(profileId: string): Promise<CandidateProfile | null> {
      return profiles[profileId] ?? null;
    },
  };
}

export function createMockLLMProvider(response = "mocked llm answer"): LLMProvider {
  return {
    async generate(): Promise<string> {
      return response;
    },
  };
}

export function createMockTemplateRepository(
  template: PromptTemplate | null = null
): PromptTemplateRepository {
  return {
    async getTemplate(): Promise<PromptTemplate | null> {
      return template;
    },
  };
}

export function createCandidateProfile(
  overrides: Partial<CandidateProfile> = {}
): CandidateProfile {
  return {
    firstName: "Alex",
    middleName: null,
    lastName: "Rivera",
    email: "alex@example.com",
    countryCode: "+1",
    phoneNumber: "555-1234",
    website: "https://alex.dev",
    linkedin: "https://linkedin.com/in/alex",
    github: "https://github.com/alex",
    education: [
      {
        degree: "B.S. Computer Science",
        institution: "Example University",
        year: 2020,
        coursework: ["Algorithms", "Systems"],
      },
    ],
    experience: [
      {
        title: "Senior Engineer",
        company: "TechCorp",
        startDate: "2021-01-01",
        endDate: null,
        location: "Remote",
        description: ["Built scalable services"],
      },
      {
        title: "Engineer",
        company: "StartupInc",
        startDate: "2018-06-01",
        endDate: "2020-12-31",
        location: "San Francisco, CA",
        description: ["Shipped MVP"],
      },
    ],
    projects: [
      {
        name: "OpenSourceTool",
        description: "A helpful developer tool",
        sourceCode: "https://github.com/alex/tool",
        liveDemo: "https://tool.dev",
        blogPost: null,
      },
    ],
    skills: ["TypeScript", "React", "Node.js"],
    ...overrides,
  };
}
