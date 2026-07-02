import { storage } from "webextension-polyfill";
import { DefaultAnswerEngine } from "@/domain/answer-engine";
import { DefaultPromptBuilder } from "@/domain/prompt-builder";
import { RuleBasedKnowledgeClassifier } from "@/domain/knowledge-classifier";
import { MinimalContextSelector } from "@/domain/context-selector";
import { DefaultKnowledgeService } from "@/domain/knowledge-service";
import { ChromeStorageProfileRepository } from "@/adapters/chrome-storage-profile-repository";
import { OpenAICompatLLMProvider } from "@/adapters/openai-compat-llm-provider";
import { InMemoryCacheAdapter } from "@/adapters/cache-adapter";
import { SecureStorage } from "@/lib/secure-storage";
import { logger } from "@/lib/logger";
import type { JobContext } from "@/domain/types";

const LOG_CONTEXT = "background";

/**
 * Background service worker entry point.
 *
 * Responsibilities:
 * - Own long-lived domain services and infrastructure adapters.
 * - Expose a typed message API to the popup and content script.
 * - Never touch the DOM.
 */

const secureStorage = new SecureStorage();
const profileRepository = new ChromeStorageProfileRepository(secureStorage);
const knowledgeService = new DefaultKnowledgeService(profileRepository);
const cache = new InMemoryCacheAdapter();

logger.info(LOG_CONTEXT, "Service worker initialized");

async function getStoredModel(): Promise<string> {
  const result = await storage.local.get("model");
  const model = (result.model as string | undefined) ?? "gpt-4o-mini";
  logger.debug(LOG_CONTEXT, "Resolved stored model", { model });
  return model;
}

function createAnswerEngine(model: string): DefaultAnswerEngine {
  return new DefaultAnswerEngine({
    classifier: new RuleBasedKnowledgeClassifier(),
    contextSelector: new MinimalContextSelector(),
    promptBuilder: new DefaultPromptBuilder(),
    llmProvider: new OpenAICompatLLMProvider({
      model,
    }),
    knowledgeService,
  });
}

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
  sender,
  sendResponse
) => {
  logger.debug(LOG_CONTEXT, "Received message", {
    type: message.type,
    sender: sender.tab ? { tabId: sender.tab.id, url: sender.tab.url } : "popup",
  });

  if (message.type !== "ANSWER_REQUEST") {
    logger.warn(LOG_CONTEXT, "Ignoring unexpected message type", { type: message.type });
    return false;
  }

  handleAnswerRequest(message)
    .then((response) => {
      logger.debug(LOG_CONTEXT, "Sending answer response", {
        type: response.type,
        profileId: message.profileId,
      });
      sendResponse(response);
    })
    .catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to handle ANSWER_REQUEST",
        error,
        extra: { profileId: message.profileId },
      });
      sendResponse({ type: "ANSWER_ERROR", error: errorMessage });
    });

  return true;
});

async function ensureStorageUnlocked(): Promise<void> {
  if (secureStorage.isUnlocked()) {
    logger.debug(LOG_CONTEXT, "SecureStorage already unlocked");
    return;
  }

  logger.info(LOG_CONTEXT, "SecureStorage locked; attempting session unlock");

  const sessionPassword = await secureStorage.getSessionPassword();
  if (!sessionPassword) {
    logger.warn(LOG_CONTEXT, "No session password available; storage remains locked");
    throw new Error("Storage is locked. Open the extension popup and log in.");
  }

  const ok = await secureStorage.unlock(sessionPassword);
  if (!ok) {
    logger.warn(LOG_CONTEXT, "Session password did not unlock storage");
    throw new Error("Session expired. Open the extension popup and log in again.");
  }

  logger.info(LOG_CONTEXT, "SecureStorage unlocked from session");
}

async function handleAnswerRequest(
  request: AnswerRequestMessage
): Promise<AnswerResponseMessage | AnswerErrorMessage> {
  logger.info(LOG_CONTEXT, "Handling answer request", {
    profileId: request.profileId,
    questionLength: request.question.length,
    hasJobContext: !!request.jobContext,
  });

  await ensureStorageUnlocked();

  const cacheKey = `answer:${request.profileId}:${request.question}`;
  const cached = await cache.get<AnswerResponseMessage>(cacheKey);

  if (cached !== null) {
    logger.debug(LOG_CONTEXT, "Returning cached answer", {
      profileId: request.profileId,
      source: cached.source,
    });
    return cached;
  }

  const model = await getStoredModel();
  const answerEngine = createAnswerEngine(model);

  logger.info(LOG_CONTEXT, "Generating answer", {
    profileId: request.profileId,
    model,
  });

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

  logger.info(LOG_CONTEXT, "Answer generated", {
    profileId: request.profileId,
    source: answer.source,
  });

  return response;
}
