# Context Selection

## Goal

Return the minimum amount of candidate information required to answer a question.

Never return the entire profile unless explicitly requested.

---

## Available Sections

- personal
- education
- experience
- projects
- skills

---

## Examples

Question

"What is your phone number?"

Context

personal

---

Question

"What technologies have you worked with?"

Context

skills

experience

projects

---

Question

"Tell us about a challenging project."

Context

projects

experience

---

Question

"What degree do you have?"

Context

education

---

Question

"Tell us about yourself."

Context

personal

education

experience

projects

skills

---

## Interface

```ts
interface ContextSelector {

    select(
        profile: CandidateProfile,
        classification: ClassificationResult
    ): CandidateContext;
}
```

---

## Requirements

The selector

- is deterministic
- never calls the LLM
- never modifies the profile
- never performs browser operations
- only returns relevant profile sections

It should minimize token usage.
