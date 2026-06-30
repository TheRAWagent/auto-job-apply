# Layers Implementation Plan

This plan maps the architecture docs to a concrete build order for the Auto Job Apply extension.

## Guiding Principles

- Follow Clean Architecture: domain logic is platform-independent; only adapters touch `chrome.*`, DOM, `window`, or `document`.
- Depend on interfaces, injected through constructors.
- Each class has a single responsibility.
- Avoid `any`; use explicit interfaces and narrow `unknown` immediately.
- Every domain service must be unit testable without a browser.

---

## Layer 1 — Domain Core (no browser dependencies)

Build the answer pipeline first so every other layer depends on it.

### Types / interfaces

- `CandidateProfile` — structured profile data (personal, education, experience, projects, skills).
- `ClassificationResult` — `{ type, confidence, relevantSections }`.
- `CandidateContext` — minimal profile slices selected for a question.
- `Prompt` — `{ system, user, temperature? }`.
- `Answer` — `{ value, source: "lookup" | "derived" | "llm" }`.

### Services

1. **KnowledgeClassifier**
   - Input: question string.
   - Output: `ClassificationResult` (`lookup`, `derived`, `narrative`, `company`, `unknown`).
   - Must not call an LLM, read the DOM, or generate answers.

2. **ContextSelector**
   - Input: `CandidateProfile`, `ClassificationResult`.
   - Output: `CandidateContext` with only relevant sections.
   - Deterministic; never returns the full profile unless explicitly requested.

3. **KnowledgeService**
   - Already partially implemented in `src/lib/knowledge-service.ts`.
   - Add direct lookups for `KnowledgeKey` values.
   - Add derived values: current title, current company, total years of experience, highest degree.
   - Keep storage access behind an injected interface (`ProfileRepository`) so the service stays testable.

4. **PromptBuilder**
   - Input: question, `CandidateContext`, optional job context.
   - Output: `Prompt` ready for the LLM provider.

5. **AnswerEngine**
   - Orchestrates the pipeline.
   - Routes lookup/derived questions to `KnowledgeService`.
   - Routes narrative/company/unknown questions through `PromptBuilder` → `LLMProvider`.

### Interfaces to define

- `ProfileRepository`
- `LLMProvider`
- `PromptTemplateRepository` (for cached templates)

---

## Layer 2 — Infrastructure Adapters

Implement the concrete adapters that satisfy the domain interfaces.

1. **ChromeStorageProfileRepository**
   - Wraps `chrome.storage.local` / `chrome.storage.sync`.
   - Implements `ProfileRepository`.
   - Handles encryption/decryption through the existing `SecureStorage`.

2. **OpenAICompatLLMProvider**
   - Implements `LLMProvider`.
   - Calls an OpenAI-compatible chat completions endpoint.
   - Supports configurable `baseUrl`, `apiKey`, and model.

3. **PromptTemplateRepository**
   - Static or storage-backed templates.
   - Used by `PromptBuilder` to keep prompts consistent.

4. **CacheAdapter**
   - In-memory + `chrome.storage.local` cache for LLM responses and derived values.

---

## Layer 3 — Background Service Worker

Add `background.service_worker` to `public/manifest.json` and build `src/background/index.ts`.

Responsibilities:

- Keep `LLMProvider`, `Storage`, `Prompt Templates`, and `Cache` alive.
- Expose a typed message API to the popup and content script.
- Never perform DOM operations.

Vite changes:

- Add a new Rollup input for the background worker.
- Ensure the built worker is copied to `dist/` and referenced by `manifest.json`.

---

## Layer 4 — Content Script

Add `content_scripts` to `public/manifest.json` and build `src/content/index.ts`.

Responsibilities:

- Detect form fields on job application pages.
- Extract labels / questions.
- Autofill straightforward fields directly.
- Send complex questions to the background worker and fill the answer into the page.

Rules:

- This is the only layer that touches the DOM.
- Keep field-detection logic platform-independent by abstracting it behind a `FieldDetector` interface if it grows.

Vite changes:

- Add a new Rollup input for the content script.
- Ensure the built script is referenced by `manifest.json`.

---

## Layer 5 — Popup UI Wiring

Update the existing React popup to communicate with the background worker.

- Upload/create profiles → `ProfileRepository` via background messaging.
- Settings → LLM provider config, password management.
- Trigger autofill manually from the popup if needed.

Keep components thin; domain decisions live in the answer pipeline, not in JSX.

---

## Build Order

1. Define shared domain types and interfaces in `src/domain/`.
2. Refactor `KnowledgeService` to accept a `ProfileRepository` interface.
3. Implement `KnowledgeClassifier`, `ContextSelector`, `PromptBuilder`, and `AnswerEngine`.
4. Write unit tests for each domain service.
5. Implement `ChromeStorageProfileRepository` and `OpenAICompatLLMProvider`.
6. Add the background service worker entry point and update `manifest.json` / `vite.config.ts`.
7. Add the content script entry point and update `manifest.json` / `vite.config.ts`.
8. Wire the popup UI to the background worker.
9. Add integration tests for the message flow.
10. Run `bun run build` and load the unpacked extension in Chrome to verify.

---

## Test Strategy

- Unit tests for every domain service using mocked repositories/providers.
- No browser APIs inside domain tests.
- Integration tests for chrome message passing between content script, background, and popup (Vitest + `chrome.*` mocks, or Playwright for the extension).

---

## Files to Create

- `src/domain/types.ts`
- `src/domain/interfaces.ts`
- `src/domain/knowledge-classifier.ts`
- `src/domain/context-selector.ts`
- `src/domain/prompt-builder.ts`
- `src/domain/answer-engine.ts`
- `src/adapters/chrome-storage-profile-repository.ts`
- `src/adapters/openai-compat-llm-provider.ts`
- `src/adapters/cache-adapter.ts`
- `src/background/index.ts`
- `src/content/index.ts`
- `src/content/field-detector.ts`
- Update `vite.config.ts`
- Update `public/manifest.json`

---

## Open Questions Before Implementation

- Should `KnowledgeClassifier` be rule-based or a small local model?
- Should the LLM provider support multiple backends simultaneously, or only one configured provider?
- Should cache eviction be time-based, count-based, or manual?
