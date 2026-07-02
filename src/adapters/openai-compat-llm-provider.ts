import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LLMProvider } from "@/domain/interfaces";
import type { Prompt } from "@/domain/types";
import { DomainError } from "@/domain/errors";
import { SecureStorage } from "@/lib/secure-storage";
import { logger } from "@/lib/logger";

const LOG_CONTEXT = "llm-provider";

export interface OpenAICompatLLMProviderConfig {
  /** Model identifier to use for chat completions. */
  model: string;
}

export class LLMProviderError extends DomainError {
  constructor(message: string) {
    super(`LLM request failed: ${message}`);
  }
}

export class OpenAICompatLLMProvider implements LLMProvider {
  private storage: SecureStorage;
  private model: string;

  constructor(config: OpenAICompatLLMProviderConfig) {
    this.storage = new SecureStorage();
    this.model = config.model;
  }

  /**
   * Generates an answer for the provided prompt using the Vercel AI SDK.
   *
   * The provider is configured from the API key and base URL stored in
   * `SecureStorage`. It calls the provider's chat completions endpoint
   * through the AI SDK instead of using raw `fetch`, which gives us
   * retries, error handling, and provider abstractions for free.
   */
  async generate(prompt: Prompt): Promise<string> {
    logger.info(LOG_CONTEXT, "Starting LLM generation", { model: this.model });

    const apiKey = await this.storage.getSessionApiKey();
    const baseUrl = await this.storage.getSessionApiBaseUrl();

    if (!apiKey) {
      logger.warn(LOG_CONTEXT, "LLM generation aborted: missing API key");
      throw new LLMProviderError("API key is not configured or session has expired");
    }

    if (!baseUrl) {
      logger.warn(LOG_CONTEXT, "LLM generation aborted: missing base URL");
      throw new LLMProviderError("API base URL is not configured or session has expired");
    }

    try {
      const provider = createOpenAICompatible({
        name: "custom-provider",
        baseURL: baseUrl,
        apiKey,
      });

      const { text } = await generateText({
        model: provider.languageModel(this.model),
        system: prompt.system,
        prompt: prompt.user,
        temperature: prompt.temperature ?? 0.5,
      });

      logger.info(LOG_CONTEXT, "LLM generation completed", {
        model: this.model,
        responseLength: text.length,
      });

      return text.trim();
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "LLM generation failed",
        error,
        extra: { model: this.model, baseUrl },
      });

      if (error instanceof Error) {
        throw new LLMProviderError(error.message);
      }

      throw new LLMProviderError("Unknown error during LLM generation");
    }
  }
}
