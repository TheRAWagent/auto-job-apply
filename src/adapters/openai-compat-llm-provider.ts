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
   * Generates an answer for the provided prompt.
   *
   * This method will eventually use the Vercel AI SDK (`ai` package) to stream
   * or generate a completion from an OpenAI-compatible chat endpoint. The
   * implementation will:
   *
   * 1. Read the API key and base URL from `SecureStorage`.
   * 2. Construct a chat completion request using the system and user messages
   *    from the prompt, plus the configured model and temperature.
   * 3. Send the request to the provider's `/chat/completions` endpoint with
   *    the bearer token set to the stored API key.
   * 4. Parse the response and return the assistant's content trimmed of
   *    surrounding whitespace.
   * 5. Throw `LLMProviderError` on network failures, non-2xx responses, or
   *    missing content.
   *
   * For now this method throws so callers know the integration is pending.
   */
  async generate(prompt: Prompt): Promise<string> {
    const apiKey = await this.storage.getApiKey();
    const baseUrl = await this.storage.getApiBaseUrl();

    throw new LLMProviderError(
      `LLM generation is not yet wired for model '${this.model}' at ${baseUrl ?? "<no base url>"} with key ${apiKey ? "<set>" : "<missing>"} (prompt length ${prompt.user.length}). The Vercel AI SDK will be integrated here in a later step.`
    );
  }
}
