import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LLMProvider } from "@/domain/interfaces";
import type { Prompt } from "@/domain/types";
import { DomainError } from "@/domain/errors";
import { SecureStorage } from "@/lib/secure-storage";

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
    const apiKey = await this.storage.getSessionApiKey();
    const baseUrl = await this.storage.getSessionApiBaseUrl();

    if (!apiKey) {
      throw new LLMProviderError("API key is not configured or session has expired");
    }

    if (!baseUrl) {
      throw new LLMProviderError("API base URL is not configured or session has expired");
    }

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

    return text.trim();
  }
}
