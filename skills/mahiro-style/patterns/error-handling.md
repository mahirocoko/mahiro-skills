# Error Handling

## Intent

This page owns shared failure flow for Mahiro-style apps: stable error identity, resolver ownership, and the split between service normalization, hook surfacing, and render-owner translation.

Use it when the question is where an error should be normalized, where final copy should live, whether a hook should format messages, and how to keep repeated failures consistent across screens.

## Detect

- Routes or components build local `switch` statements for shared fetch or mutation failures
- Hooks invent `get*ErrorMessage()` helpers for failures already seen elsewhere in the app
- Services leak raw upstream messages into every caller even though the app repeats the same user-facing failure
- Shared error copy is stored as plain strings instead of descriptor-safe config
- UI translates or formats the same failure family differently across screens

## Ownership Split

Mahiro-style error handling is a layered flow, not one helper doing everything.

- **Services** normalize shared transport or domain failures into stable app-owned error codes or failure signals when the repo has reached that maturity.
- **Hooks** surface query or mutation error state close to the owner of the behavior.
- **Render owners** choose the final fallback UI and translate the final message.
- **Constants and i18n owners** keep shared error copy in descriptor-safe form when multiple render owners need the same wording.

## Non-negotiable

- Do not hand-roll local route-level message mappers for failures that already belong to a shared product flow.
- Do not let services own final user-facing fallback copy or render-time translation.
- Do not let hooks hide shared failure handling behind local message-formatting helpers.
- Keep final translation at the render owner boundary.
- Promote stable error codes only when the failure is repeated enough to deserve product-owned wording.
- Do not import an entire upstream vendor error universe into app-owned error codes preemptively.

## Preference

- Prefer stable app-owned error codes or failure signals for repeated user-facing failures.
- Prefer shared resolver patterns when the same failure can surface in multiple owners.
- Prefer descriptor-based shared error copy, such as `msg`, when multiple render owners need the same wording.
- Prefer temporary raw upstream fallback only while a real surfaced case is still too new or too narrow to justify a stable app-owned code.
- Prefer promoting failures by cluster of repeated product cases instead of one-off strings.
- Prefer review comments that ask where a failure is normalized, surfaced, and translated instead of treating all error handling as one concern.

## Contextual

- A lean app may start with fewer stable error codes, but it should still keep the service, hook, and render responsibilities separate.
- A larger app benefits from central failure identities because auth, onboarding, invite, and bootstrap-style flows often repeat across multiple screens.
- Some repos will use a dedicated shared resolver hook. Others may use a utility or helper layer. The stable rule is the ownership split, not one exact API name.
- If a repo has no repeated shared failure flow yet, keep the implementation proportional. Mahiro-style promotes shared error doctrine when the pattern is real.

## Examples

- A service normalizes a repeated failure into a stable code, while the caller stays free to decide the final UI.

```ts
type ErrorCode = 'private-access-required' | 'network-unavailable' | 'unknown-error'

interface IPrivatePageFailure {
  code: ErrorCode
  detail?: string
}

export class PrivatePageService {
  static async load() {
    try {
      return await getJSON<IPrivatePageResponse>('/private.page')
    } catch (error) {
      throw normalizePrivatePageError(error) satisfies IPrivatePageFailure
    }
  }
}
```

- A hook surfaces the failure state, but does not decide the final fallback message.

```ts
const usePrivatePage = () => {
  const pageQuery = useQuery({
    queryKey: ['private-page'],
    queryFn: PrivatePageService.load,
  })

  return {
    data: pageQuery.data,
    isLoading: pageQuery.isLoading,
    pageError: pageQuery.error,
  }
}
```

- Shared error copy can live in descriptor-safe config when multiple render owners resolve the same stable code.

```ts
import { msg } from '@lingui/core/macro'

const ERROR_MESSAGE_MAP = {
  'private-access-required': msg`You need private access before continuing.`,
  'network-unavailable': msg`Please check your connection and try again.`,
} as const
```

```tsx
const PrivatePageScreen = () => {
  const { t } = useLingui()
  const { pageError } = usePrivatePage()

  if (pageError) {
    return <Alert>{t(ERROR_MESSAGE_MAP[pageError.code] ?? msg`Something went wrong.`)}</Alert>
  }

  return <PrivatePageContent />
}
```

## Cross-links

- `services.md` owns transport and normalization mechanics
- `hooks.md` owns hook-level surfacing and query or mutation boundaries
- `constants-i18n.md` owns descriptor-safe copy and render-boundary translation posture
- `foundations/review-checklist.md` owns review prompts for drift in error ownership

## Anti-Examples

- A route or hook writes a new local `getErrorMessage()` switch for a failure family that already exists elsewhere in the app.
- A service returns raw upstream text everywhere, forcing every caller to invent its own user-facing copy.
- A hook translates or formats the final fallback copy itself even though the component still owns the rendered UI.
- A constants file stores shared error copy as plain strings when the repo already expects descriptor-safe extracted text.
- An app promotes every possible upstream vendor error into stable app-owned codes before those cases are actually repeated product failures.
