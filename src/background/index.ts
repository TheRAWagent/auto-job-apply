import { DefaultAnswerEngine } from "@/domain/answer-engine";
import { DefaultPromptBuilder } from "@/domain/prompt-builder";
import { RuleBasedKnowledgeClassifier } from "@/domain/knowledge-classifier";
import { MinimalContextSelector } from "@/domain/context-selector";
import { DefaultKnowledgeService } from "@/domain/knowledge-service";
import { ChromeStorageProfileRepository } from "@/adapters/chrome-storage-profile-repository";
import { OpenAICompatLLMProvider } from "@/adapters/openai-compat-llm-provider";
import { InMemoryCacheAdapter } from "@/adapters/cache-adapter";
import type { JobContext } from "@/domain/types";

/**
 * Background service worker entry point.
 *
 * Responsibilities:
 * - Own long-lived domain services and infrastructure adapters.
 * - Expose a typed message API to the popup and content script.
 * - Never touch the DOM.
 */

const profileRepository = new ChromeStorageProfileRepository();
const knowledgeService = new DefaultKnowledgeService(profileRepository);
const cache = new InMemoryCacheAdapter();

const answerEngine = new DefaultAnswerEngine({
  classifier: new RuleBasedKnowledgeClassifier(),
  contextSelector: new MinimalContextSelector(),
  promptBuilder: new DefaultPromptBuilder(),
  llmProvider: new OpenAICompatLLMProvider({
    model: "gpt-4o-mini",
  }),
  knowledgeService,
});

export interface AnswerRequestMessage {
  type: "ANSWER_REQUEST";
  question: string;
  profileId: string;
  jobContext?: JobContext;
}

export interface AnswerResponseMessage {
  type: "ANSWER_RESPONSE";
  answer: string;
  source: "lookup" | "derived" | "llm";
}

export interface AnswerErrorMessage {
  type: "ANSWER_ERROR";
  error: string;
}

export type BackgroundMessage =
  | AnswerRequestMessage
  | AnswerResponseMessage
  | AnswerErrorMessage;

chrome.runtime.onMessage.addListener((
  message: BackgroundMessage,
  _sender,
  sendResponse
) => {
  if (message.type !== "ANSWER_REQUEST") {
    return false;
  }

  handleAnswerRequest(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      sendResponse({ type: "ANSWER_ERROR", error: errorMessage });
    });

  return true;
});

async function handleAnswerRequest(
  request: AnswerRequestMessage
): Promise<AnswerResponseMessage | AnswerErrorMessage> {
  const cacheKey = `answer:${request.profileId}:${request.question}`;
  const cached = await cache.get<AnswerResponseMessage>(cacheKey);

  if (cached !== null) {
    return cached;
  }

  const answer = await answerEngine.answer(
    request.question,
    request.profileId,
    request.jobContext
  );

  const response: AnswerResponseMessage = {
    type: "ANSWER_RESPONSE",
    answer: answer.value,
    source: answer.source,
  };

  await cache.set(cacheKey, response, 5 * 60 * 1000);

  return response;
}
