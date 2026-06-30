# Engineering Principles

## Architecture

Follow Clean Architecture principles.

Depend on interfaces rather than implementations.

Use dependency injection where appropriate.

---

## Single Responsibility

Each class should have one responsibility.

If a class needs "and" in its description, split it.

---

## Type Safety

Avoid `any`.

Avoid `unknown` unless immediately narrowed.

Prefer explicit interfaces.

---

## Error Handling

Throw domain-specific errors.

Do not swallow exceptions.

Avoid returning null where Result types or exceptions are more appropriate.

---

## Testing

Every service should be unit testable.

Do not depend on browser APIs inside domain services.

---

## Browser Isolation

Only adapters and infrastructure layers may access:

- chrome.*
- DOM APIs
- window
- document

Domain services must remain platform-independent.
