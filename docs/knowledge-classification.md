# Knowledge Classification

## Goal

Given a question extracted from a job application, determine how it should be answered.

The classifier MUST NOT generate answers.

It only determines:

- whether the answer can be retrieved directly
- whether it requires reasoning
- what profile sections are relevant

---

## Classification Types

### Lookup

Information exists directly in the structured profile.

Examples

"What is your email?"

"What is your phone number?"

"LinkedIn URL"

"GitHub"

"Website"

---

### Derived

Information can be calculated from profile data.

Examples

"Current employer"

"Current title"

"Years of experience"

"Highest degree"

---

### Narrative

The answer requires combining multiple facts.

Examples

"Tell us about yourself."

"Describe a project."

"What are your strengths?"

---

### Company Specific

Requires job context.

Examples

"Why do you want to work here?"

"Why Stripe?"

"Why OpenAI?"

---

### Unknown

Cannot be confidently classified.

---

## Output

```ts
interface ClassificationResult {
    type:
        | "lookup"
        | "derived"
        | "narrative"
        | "company"
        | "unknown";

    confidence: number;

    relevantSections: ProfileSection[];
}
```

Confidence is a value between 0 and 1.

---

## Rules

The classifier

- never calls the LLM
- never reads the DOM
- never fills forms
- never generates answers

It only classifies questions.
