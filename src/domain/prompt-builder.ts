import type { PromptBuilder, PromptTemplateRepository } from "./interfaces";
import type { CandidateContext, JobContext, Prompt } from "./types";

const DEFAULT_SYSTEM_TEMPLATE = `You are a helpful assistant filling out a job application.
Answer the user's question using only the candidate profile context provided below.
Be concise, honest, and professional.
If the context does not contain enough information, say so clearly.`;

const DEFAULT_USER_TEMPLATE = `Candidate profile context:
{{context}}

Job context:
{{jobContext}}

Question: {{question}}

Answer:`;

export class DefaultPromptBuilder implements PromptBuilder {
  private templates: PromptTemplateRepository | null;

  constructor(templates: PromptTemplateRepository | null = null) {
    this.templates = templates;
  }

  async build(
    question: string,
    context: CandidateContext,
    jobContext?: JobContext
  ): Promise<Prompt> {
    const template = this.templates
      ? await this.templates.getTemplate("answer")
      : null;

    const system = template?.system ?? DEFAULT_SYSTEM_TEMPLATE;
    const userTemplate = template?.user ?? DEFAULT_USER_TEMPLATE;

    const contextText = JSON.stringify(context, null, 2);
    const jobContextText = formatJobContext(jobContext);

    const user = userTemplate
      .replace("{{context}}", contextText)
      .replace("{{jobContext}}", jobContextText)
      .replace("{{question}}", question);

    return {
      system,
      user,
      temperature: 0.5,
    };
  }
}

function formatJobContext(jobContext: JobContext | undefined): string {
  if (!jobContext) {
    return "No job context provided.";
  }

  const parts: string[] = [];

  if (jobContext.companyName) {
    parts.push(`Company: ${jobContext.companyName}`);
  }

  if (jobContext.jobTitle) {
    parts.push(`Position: ${jobContext.jobTitle}`);
  }

  if (jobContext.jobDescription) {
    parts.push(`Job description: ${jobContext.jobDescription}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No job context provided.";
}
