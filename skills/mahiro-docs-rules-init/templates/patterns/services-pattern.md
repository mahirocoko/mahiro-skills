# Services Pattern

This page can act as both a reality check and a bootstrap blueprint. Keep the service-doc shape even when the repo is still small, but label clearly what exists today versus what is the preferred service posture.

## Current Status

- **Current reality**: [Say clearly whether the repo already has a shared service layer, owner-local service files, hook-owned fetch logic, or no service abstraction yet.]
- **Confidence**: [Established / Partial / Not established yet]

If the repo does not have a real shared service layer yet, keep the document shape but say so directly. The blueprint may still show the intended service posture, but it must not be mislabeled as current architecture.

## BaseService

If the repo uses a shared transport wrapper, document the real one here. If it does not, replace this section with a short explicit note such as "No shared BaseService is established yet; calls currently live in feature-owned files."

### BaseService Methods

```ts
[repo-faithful BaseService method surface]
```

## Service Template

Show the smallest believable service example that matches the repo's intended service posture. If the repo is still early, it is fine for this example to act as a bootstrap blueprint as long as the page still states what is and is not established yet.

```ts
[repo-faithful service template]
```

## Request Config

Document this only if the repo uses shared request options, headers, abort signals, fallback flags, or similar config objects.

```ts
[repo-faithful request config type if the repo has one]
```

### Using Fallback

```ts
[repo-faithful fallback example if the repo has one]
```

If the repo does not use request config or fallbacks, keep these sections only as short explicit notes.

## Service File Structure

Mirror the smallest real structure that the repo supports today, or the smallest truthful blueprint when the page is intentionally setting a service shape for future work.

```text
services/
├── [base file or entry file]
├── [domain folder]/
│   ├── index.ts
│   └── utils.ts
└── ...
```

If the service layer is minimal, keep the real one-file structure instead of forcing domain folders. If the repo is bootstrap-stage but clearly wants a house service pattern, it is acceptable to show that shape as `Preferred Direction` rather than deleting it.

## Adoption Triggers

Promote feature-local transport into a shared service layer only when the repo starts repeating one or more of these patterns:

- repeated endpoint construction across multiple owners
- repeated auth/header/error handling logic
- multiple hooks or screens calling the same transport function
- shared request/response typing that no longer belongs to a single feature

## Best Practices

### 1. Stable Export Pattern

Keep the export posture aligned with the repo. If the repo uses named object exports, do not rewrite the example as a class. If the repo uses classes, keep the class shape.

```ts
[repo-faithful service export pattern example]
```

### 2. Type Safety

Always specify request and response types when the repo has shared service data. If the repo is still lightweight, at least type the payload and the resolved data at the service boundary.

```ts
[repo-faithful typed service example]
```

### 3. Payload Interfaces

Define payload interfaces in the repo's shared or owner-local type layer. Keep the type next to the owner when only one feature needs it; extract it only after real reuse appears.

```ts
[repo-faithful payload typing example]
```

### 4. Method Naming

- **GET data**: `get`, `list`, `fetch`
- **POST create**: `add`, `create`
- **POST update**: `update`, `edit`
- **POST delete**: `remove`, `delete`
- **POST action**: verb matching the action

Adapt these verbs to the target repo's actual naming posture instead of forcing the full list.

### 5. Comments

Add JSDoc comments for public methods only if the repo uses them consistently.

### 6. Error Handling

Document the real error posture here.

- [Throw and let query layer handle it]
- [Normalize API errors in the service]
- [Return fallback values only in explicitly safe cases]

```ts
[repo-faithful error handling example]
```

## Using Services in Components

Prefer showing the real usage owner for this repo: component, route loader, custom hook, store action, or query hook.

```tsx
[repo-faithful component or hook usage example]
```

## Preferred Direction

- Keep raw transport details out of unrelated UI files once repetition starts.
- Let feature owners keep small service helpers local before introducing shared folders.
- Extract shared request logic only when the repo has enough repeated evidence to support it.
- When the skill is bootstrapping a repo, preserve the intended service blueprint even if the current repo only shows fragments of that shape.

## Best Practices Summary

1. **Keep transport in services or service-like owners, not spread across unrelated components**
2. **Type every request and response**
3. **Only introduce shared services after repetition justifies the layer**
