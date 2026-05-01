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
- Error code enums, message constants, and resolver hooks drift apart or duplicate the same cases
- A service catches an error only to replace it with final user-facing text
- A hook returns a ready-made translated message while the component still owns the rendered fallback UI
- Every upstream or vendor error is copied into app-owned codes before any product surface repeats those cases

## Ownership Split

Mahiro-style error handling is a layered flow, not one helper doing everything.

- **Services** normalize shared transport or domain failures into stable app-owned error codes or failure signals when the repo has reached that maturity. They may preserve useful detail for diagnostics, but they do not choose final UI wording.
- **Hooks** surface query or mutation error state close to the owner of the behavior. They may call shared resolvers or expose stable signals, but they do not hide the render contract behind local message formatting.
- **Render owners** choose the final fallback UI, decide whether the failure is a toast, alert, empty state, redirect, or inline field error, and translate the final message.
- **Constants and i18n owners** keep shared error copy in descriptor-safe form when multiple render owners need the same wording.

The core review question is: where is the failure normalized, where is it surfaced, and where is it translated?

## Shared Resolver Pipeline

When a failure family repeats, prefer this pipeline:

```text
upstream error
  -> service/domain normalization
  -> stable app-owned code or failure signal
  -> descriptor-safe message map
  -> shared resolver hook/helper
  -> toast, alert, inline field error, or page fallback at the render owner
```

In this mode:

- an enum or equivalent code union owns stable error identity
- a constants file owns the shared code-to-message descriptor map
- a resolver hook/helper extracts the code from `unknown`, chooses a safe fallback for unknown cases, and exposes helpers for the app's common surfaces
- render owners still decide whether a case appears as toast, inline copy, empty state, route fallback, redirect, or local one-off copy

Common resolver shapes can include `getErrorCode(error)`, `getErrorMessage(error)`, and `showErrorMessage(error)`. The exact names are local to the repo; the important part is that code extraction, descriptor lookup, and surface helpers are not reimplemented in every route or mutation.

## Current Reality vs Preferred Direction

- `Current Reality`: preserve the repo's established error path, whether it uses raw thrown service errors, app-owned error codes, resolver hooks, toast helpers, or route error boundaries.
- `Preferred Direction`: repeated user-facing failures should move toward stable app-owned signals, descriptor-safe shared copy, resolver ownership, and render-boundary translation.
- `Not Established Yet`: do not create a full error-code universe before failures repeat across product surfaces.
- `Adoption Triggers`: promote a failure into shared handling when multiple routes/hooks surface the same product case, when copy must stay consistent, or when raw upstream text would leak implementation detail to users.

## Promotion Threshold

Do not promote every thrown value into a stable app-owned code. Promote only when the product case is real enough to deserve shared ownership.

Good promotion signals:

- the same failure appears in multiple routes, hooks, or mutations
- the user-facing copy must stay consistent across screens
- raw upstream text exposes implementation detail or unsafe wording
- the failure drives a distinct product action such as sign in again, retry later, request access, verify account, or choose a different value
- analytics, logging, support, or QA needs a stable app-level identity for the case
- several surfaces already repeat the same enum case, message-map entry, or resolver-branch logic

Keep proportional handling when:

- the failure is one-off, internal-only, or still being discovered
- the current repo has no shared failure resolver yet
- the caller can safely render a generic fallback while preserving the raw value for logs
- the upstream error family is broad but only one product case is actually surfaced

## Non-negotiable

- Do not hand-roll local route-level message mappers for failures that already belong to a shared product flow.
- Do not let services own final user-facing fallback copy or render-time translation.
- Do not let hooks hide shared failure handling behind local message-formatting helpers.
- Do not split shared error identity, copy, and resolver logic across unrelated files with no single owner for each step.
- Do not duplicate error-code switch statements in routes, components, and mutation hooks when a shared resolver hook/helper already exists or is clearly earned.
- Keep final translation at the render owner boundary.
- Keep shared copy descriptor-safe when it leaves the render owner and must be reused by multiple owners.
- Keep unknown errors safe for users: show a controlled fallback, not raw backend, vendor, stack, or exception text.
- Promote stable error codes only when the failure is repeated enough to deserve product-owned wording.
- Keep temporary raw upstream errors proportional when the repo has not yet established shared failure families, but do not surface raw backend text directly to users when a render owner can provide safer fallback copy.
- Do not import an entire upstream vendor error universe into app-owned error codes preemptively.

## Preference

- Prefer stable app-owned error codes or failure signals for repeated user-facing failures.
- Prefer shared resolver patterns when the same failure can surface in multiple owners.
- Prefer descriptor-based shared error copy, such as `msg`, when multiple render owners need the same wording.
- Prefer an enum, literal union, or equivalent stable code surface for repeated app-owned failures before adding a message map.
- Prefer one shared resolver hook/helper for common fetch or mutation failures, with separate helpers for toast and inline surfaces when both are used.
- Prefer temporary raw upstream fallback only while a real surfaced case is still too new or too narrow to justify a stable app-owned code.
- Prefer promoting failures by cluster of repeated product cases instead of one-off strings.
- Prefer review comments that ask where a failure is normalized, surfaced, and translated instead of treating all error handling as one concern.
- Prefer generic safe fallback copy for unknown failures, with raw detail reserved for logs, diagnostics, or support context.
- Prefer mapping transport failures into product-language signals only after the product behavior is clear.
- Prefer local one-off copy only when the render owner is handling a genuinely local product case, then fall back to the shared resolver for the common failure path.

## Contextual

- A lean app may start with fewer stable error codes, but it should still keep the service, hook, and render responsibilities separate.
- A larger app benefits from central failure identities because auth, onboarding, invite, and bootstrap-style flows often repeat across multiple screens.
- Some repos will use a dedicated shared resolver hook. Others may use a utility or helper layer. The stable rule is the ownership split, not one exact API name.
- If a repo has no repeated shared failure flow yet, keep the implementation proportional. Mahiro-style promotes shared error doctrine when the pattern is real.
- Route error boundaries and page-level fallbacks can own the final user-facing state, but they should still consume stable signals or safe fallbacks rather than duplicating transport parsing.
- Mutation hooks can coordinate error callbacks and invalidation, but final toast wording should still be shared descriptor copy or render-owner translation when the failure repeats.
- A mature flow often has three visible homes: an error identity owner, a descriptor-map owner, and a resolver hook/helper. Keep those homes aligned when adding new cases.
- Tenant, product, or app variants may carry smaller maps, but the same ownership split should hold: stable identity, descriptor-safe copy, resolver surface, render-owned final UI.

## Examples

- A service normalizes a repeated failure into a stable code, while the caller stays free to decide the final UI.

```ts
export enum ErrorCode {
  PRIVATE_ACCESS_REQUIRED = 'private-access-required',
  NETWORK_UNAVAILABLE = 'network-unavailable',
  UNKNOWN = 'unknown-error',
}

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
  [ErrorCode.PRIVATE_ACCESS_REQUIRED]: msg`You need private access before continuing.`,
  [ErrorCode.NETWORK_UNAVAILABLE]: msg`Please check your connection and try again.`,
  [ErrorCode.UNKNOWN]: msg`Something went wrong.`,
} as const
```

```tsx
const PrivatePageScreen = () => {
  const { pageError } = usePrivatePage()
  const { getErrorMessage } = useFetchError()

  if (pageError) {
    return <Alert>{getErrorMessage(pageError).message}</Alert>
  }

  return <PrivatePageContent />
}
```

- A shared resolver can expose both inline and toast surfaces without making every caller rebuild the same switch.

```ts
const useFetchError = () => {
  const { t } = useLingui()
  const { toast } = useToast()

  const getErrorCode = (error: unknown): ErrorCode => {
    if (isAppError(error)) return error.code
    return ErrorCode.UNKNOWN
  }

  const getErrorMessage = (error: unknown) => {
    const code = getErrorCode(error)
    const descriptor = ERROR_MESSAGE_MAP[code] ?? ERROR_MESSAGE_MAP[ErrorCode.UNKNOWN]

    return {
      code,
      message: t(descriptor),
    }
  }

  const showErrorMessage = (error: unknown) => {
    toast.error(getErrorMessage(error).message)
  }

  return { getErrorCode, getErrorMessage, showErrorMessage }
}
```

The resolver owns code extraction and shared copy lookup. The caller still decides whether it needs inline rendering, a toast, a route fallback, or a local override.

- A new, one-off failure can stay proportional while still avoiding unsafe user copy.

```tsx
const InvitePanel = () => {
  const { t } = useLingui()
  const { inviteError } = useInviteEmployee()

  if (inviteError) {
    reportError(inviteError)
    return <Alert>{t`We could not send the invite. Please try again.`}</Alert>
  }

  return <InviteForm />
}
```

The failure has not earned a stable code yet, but the rendered copy is still safe and owned by the render boundary.

## Cross-links

- `services.md` owns transport and normalization mechanics
- `hooks.md` owns hook-level surfacing and query or mutation boundaries
- `constants-i18n.md` owns descriptor-safe copy and render-boundary translation posture
- `route-boundaries.md` owns route and route-error-boundary page composition
- `foundations/review-checklist.md` owns review prompts for drift in error ownership

## Anti-Examples

- A route or hook writes a new local `getErrorMessage()` switch for a failure family that already exists elsewhere in the app.
- A service returns raw upstream text everywhere, forcing every caller to invent its own user-facing copy.
- A hook translates or formats the final fallback copy itself even though the component still owns the rendered UI.
- A constants file stores shared error copy as plain strings when the repo already expects descriptor-safe extracted text.
- An app promotes every possible upstream vendor error into stable app-owned codes before those cases are actually repeated product failures.
- A UI renders `String(error.message)` from a backend or vendor response directly to users with no safe fallback.
- A route, hook, and component each define their own wording for the same stable failure.
- An enum adds a new app-owned error code but no shared descriptor-map entry or resolver fallback covers it.
- A mutation handles one stable failure locally with special copy but forgets to fall back to the shared resolver for the common path.
