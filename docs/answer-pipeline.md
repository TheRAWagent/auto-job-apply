# Answer Pipeline

## Goal

Given a question, produce either

- a direct lookup
- a derived value
- an LLM-generated answer

---

Pipeline

Question

↓

Knowledge Classification

↓

Context Selection

↓

Lookup?

↓

Yes

↓

Knowledge Service

↓

Answer

---

No

↓

Prompt Builder

↓

LLM

↓

Answer

---

## Components

KnowledgeService

Responsible for retrieving structured profile information.

---

KnowledgeClassifier

Determines how the question should be answered.

---

ContextSelector

Chooses which profile sections are relevant.

---

PromptBuilder

Builds prompts for the LLM.

---

LLMProvider

Sends prompts to the selected model.

---

AnswerEngine

Coordinates all components.

---

## Responsibilities

KnowledgeService

- retrieve profile
- retrieve summary
- retrieve sections

KnowledgeClassifier

- classify questions

ContextSelector

- choose profile sections

PromptBuilder

- create prompts

LLMProvider

- generate responses

AnswerEngine

- orchestrate the pipeline

---

## Design Principles

Each component should have a single responsibility.

Components communicate through typed interfaces.

No component should directly depend on browser APIs.

The pipeline must be testable without running the extension.

No component should depend on a specific ATS platform.

All browser-specific logic belongs to adapters.
