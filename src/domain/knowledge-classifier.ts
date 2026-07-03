import type { KnowledgeClassifier } from "./interfaces";
import type { ClassificationResult, ProfileSection } from "./types";

export class RuleBasedKnowledgeClassifier implements KnowledgeClassifier {
  async classify(question: string): Promise<ClassificationResult> {
    const normalized = question.toLowerCase();

    const lookupMatch = scorePatterns(normalized, lookupPatterns);
    const derivedMatch = scorePatterns(normalized, derivedPatterns);
    const companyMatch = scorePatterns(normalized, companyPatterns);
    const narrativeMatch = scorePatterns(normalized, narrativePatterns);

    const scores = [
      { type: "lookup" as const, ...lookupMatch },
      { type: "derived" as const, ...derivedMatch },
      { type: "company" as const, ...companyMatch },
      { type: "narrative" as const, ...narrativeMatch },
    ];

    const best = scores.reduce((a, b) => (a.score > b.score ? a : b));

    if (best.score === 0) {
      return {
        type: "unknown",
        confidence: 0.5,
        relevantSections: ["personal", "education", "experience", "projects", "skills"],
      };
    }

    return {
      type: best.type,
      confidence: clamp(best.score / best.maxScore, 0, 1),
      relevantSections: selectRelevantSections(best.type, normalized),
    };
  }
}

interface PatternGroup {
  patterns: string[];
  sections: ProfileSection[];
}

interface ScoredPattern {
  score: number;
  maxScore: number;
}

const lookupPatterns: PatternGroup = {
  patterns: [
    "name",
    "full name",
    "first name",
    "middle name",
    "last name",
    "surname",
    "email",
    "e-mail",
    "country code",
    "phone",
    "phone number",
    "mobile number",
    "mobile",
    "website",
    "personal website",
    "portfolio",
    "linkedin",
    "github",
    "location",
    "address",
    "city",
    "country",
  ],
  sections: ["personal"],
};

const derivedPatterns: PatternGroup = {
  patterns: [
    "current employer",
    "current company",
    "where do you work",
    "current title",
    "current role",
    "job title",
    "years of experience",
    "how many years",
    "years have you worked",
    "highest degree",
    "highest education",
    "what degree",
  ],
  sections: ["experience", "education"],
};

const companyPatterns: PatternGroup = {
  patterns: [
    "why do you want to work here",
    "why here",
    "why us",
    "why this company",
    "why are you interested",
    "what attracts you",
    "why do you want to join",
    "why ",
  ],
  sections: ["personal", "skills", "experience"],
};

const narrativePatterns: PatternGroup = {
  patterns: [
    "tell us about yourself",
    "about yourself",
    "describe a project",
    "challenging project",
    "strengths",
    "weaknesses",
    "achievements",
    "accomplishments",
    "describe your experience",
    "tell me about",
    "summary",
    "cover letter",
  ],
  sections: ["personal", "experience", "projects", "skills", "education"],
};

function scorePatterns(input: string, group: PatternGroup): ScoredPattern {
  let score = 0;

  for (const pattern of group.patterns) {
    if (input.includes(pattern)) {
      score += pattern.length;
    }
  }

  const maxScore = group.patterns.reduce((sum, pattern) => sum + pattern.length, 0);

  return { score, maxScore };
}

function selectRelevantSections(
  type: ClassificationResult["type"],
  input: string
): ProfileSection[] {
  switch (type) {
    case "lookup":
      if (input.includes("email") || input.includes("phone") || input.includes("name") || input.includes("website") || input.includes("linkedin") || input.includes("github")) {
        return ["personal"];
      }
      return ["personal", "education", "experience", "projects", "skills"];
    case "derived":
      if (input.includes("degree") || input.includes("education")) {
        return ["education"];
      }
      return ["experience"];
    case "company":
      return ["personal", "skills", "experience"];
    case "narrative":
      if (input.includes("project")) {
        return ["projects", "experience", "skills"];
      }
      if (input.includes("yourself")) {
        return ["personal", "education", "experience", "projects", "skills"];
      }
      return ["experience", "projects", "skills"];
    default:
      return ["personal", "education", "experience", "projects", "skills"];
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
