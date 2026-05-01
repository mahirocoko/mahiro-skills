# Constants and I18n

## Intent

This page owns constants extraction with Lingui-safe posture, `msg`-based descriptors, and render-boundary translation responsibility.

Use it when the question is whether copy should stay in React, move into config, or be reshaped into translation-safe descriptors without making `msg`, `t`, and `<Trans>` responsibilities fuzzy.

For the full shared failure-flow doctrine, see `error-handling.md`.

## Detect

- Extracted constants contain plain string literals for user-facing copy with no `msg` wrapper
- `i18n._()` or `t()` called inside a constants file or outside a render boundary
- Mock data objects use `t()` on data-shaped fields like names, team labels, or IDs
- Copy extracted into constants only to reduce component line count while the component is still the only consumer
- Component-local headings, placeholders, or empty-state text moved into a separate file with no reuse

## Render Boundary and Translation Responsibility

The component that renders UI text owns the final translation call.

- Extracted config can carry translation-safe descriptors such as `msg` values.
- Components and render boundaries call `i18n._(...)`, `t(...)`, or render `<Trans>` at the point where text becomes UI.
- Do not move user-facing copy into constants just to make a component shorter.
- Keep component-local copy in React when it is tightly coupled to JSX structure, interaction flow, conditional rendering, or nearby event intent.
- Use `msg` for extracted descriptors and shared config. Use `t` or `i18n._` inside render owners that already own a live translation context. Use `<Trans>` when the rendered output needs JSX composition, inline markup, or rich text.
- When a component already owns the UI text directly, prefer `const { t } = useLingui()` as the default posture before reaching for a broader extracted-config shape.

## Current Reality vs Preferred Direction

- `Current Reality`: follow the repo's active i18n API, catalog flow, source language, and extraction command.
- `Preferred Direction`: extracted reusable user-facing config should use descriptor-safe values such as Lingui `msg`, and render owners should perform the final `t(...)`, `i18n._(...)`, or `<Trans>` call.
- `Not Established Yet`: if the repo has no i18n system, do not invent Lingui-specific files as current architecture. Document it as a possible future direction only when useful.
- `Adoption Triggers`: extract copy when several owners share the same labels, route metadata, table columns, status maps, or stable error-code copy. Keep one-owner JSX copy local.

## Non-negotiable

- Follow repo-local doctrine first, then other repo-local instruction files, then established repo patterns, and only then use Mahiro fallback doctrine.
- Keep component-local copy in React when the wording is tightly bound to JSX layout, button flow, empty states, form help text, or conditional UI branches.
- Extract only data-like or reusable structures, such as nav items, route metadata, table column descriptors, status maps, and screen configuration that already wants a constants owner.
- Do not extract layout-local or component-local copy into `constants/` when the data is only consumed by one owner and stays easier to scan in place.
- When extracted config contains user-facing copy, store translation-safe descriptors such as `msg`, not plain source-locale strings with no Lingui path.
- Make the render boundary explicit. Constants define descriptors, renderers translate them.
- Do not extract copy only to reduce line count or make a file look tidier.
- Do not claim a descriptor flow is current reality unless the repo actually uses one.
- Do not leave `msg` versus `t` versus `<Trans>` ambiguous in review comments or refactors. The rule is descriptor at definition, translation at render.

## Preference

- Prefer domain-owned constants files when a screen, layout, or module already shares the same labels across multiple renderers.
- Prefer component-local `t` usage when one component is the only renderer and the extracted constants would create a longer read path.
- Prefer `msg` in extracted config because it keeps Lingui extraction-safe while avoiding early translation outside render context.
- Prefer small translation helpers only when the repo already uses them and they keep responsibility clearer, not more abstract.
- Prefer translating as late as possible, near the component that decides badges, buttons, headings, and conditional copy.
- Prefer leaving one-off JSX copy in place when extraction would split one sentence across constants and component branches.
- Prefer shared error labels or error descriptions in descriptor form only when multiple render owners resolve the same stable app-owned error codes or failure signals.

## Decision Table

| Situation | Keep as | Translate with | Why |
|---|---|---|---|
| Owner-local UI copy such as headings, helper text, empty states, button labels | Inline React copy | `t` in the owner component | The component already owns the rendered wording |
| Extracted shared config used by multiple owners | `msg` descriptors in config | `t` or `i18n._(...)` at render | Shared config needs descriptor safety |
| Mock data that stands in for future API payload shape | Plain strings or values | Do not pre-translate inside the mock object | Data should stay data-shaped until UI decides how to present it |
| Frontend-computed labels from local state or mock state, such as status badges | Derived UI copy near render | `t` in the owner component | The label is UI-owned even if the state came from data |
| Shared error-code map used by multiple render owners | `msg` descriptors keyed by stable app-owned error codes or failure signals | `t` or `i18n._(...)` at render | Shared failures need consistent wording without early translation |

## Contextual

Repo-local posture decides the final shape.

- In a route-first app with Lingui, extracted domain config can store shared labels as `MessageDescriptor` values created with `msg`, while owner render components perform the final translation at the render boundary.
- That same pattern also shows the limit of extraction. If layout or section copy is only consumed by one owner, moving it back into the owning component can improve readability when the extracted constants are not buying real reuse.
- In owner-local render files, `const { t } = useLingui()` is usually the clearest posture when the copy stays inside the component instead of traveling through shared descriptor config.
- A later section-level refactor sharpened the mock-data boundary too: section owners kept `mock*` collections as plain API-shaped values, while headings, placeholders, table headers, and computed badge labels used `t` at render time.
- Some repos may prefer `t(...)` from `useLingui`, others may use `i18n._(...)`, and some rich text cases need `<Trans>`. The stable rule is not one exact API everywhere. The stable rule is that extracted config holds descriptors, and rendering code performs the final translation call.
- If a repo already repeats a different but translation-safe pattern, keep the local winner. Mahiro fallback doctrine exists to resolve the gap, not to flatten working local conventions.

## Examples

Keep reusable route and nav metadata in constants with `msg`, then translate inside the component that renders it.

```ts
import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'

interface IRouteMeta {
  label: MessageDescriptor
  description: MessageDescriptor
}

const ROUTE_META_MAP: Record<string, IRouteMeta> = {
  '/overview': {
    label: msg`Operations overview`,
    description: msg`Summarize open work, recent signals, and the next actions worth attention.`,
  },
}
```

```tsx
import { useLingui } from '@lingui/react/macro'

const OverviewHeader = () => {
  const { t } = useLingui()
  const currentRoute = ROUTE_META_MAP['/overview']

  return (
    <>
      <h1>{t(currentRoute.label)}</h1>
      <p>{t(currentRoute.description)}</p>
    </>
  )
}
```

Keep JSX-bound copy in React when extraction would separate wording from the branch or markup that gives it meaning.

```tsx
import { Trans, useLingui } from '@lingui/react/macro'

const EmptyState = ({ isFiltered }: { isFiltered: boolean }) => {
  const { t } = useLingui()

  if (isFiltered) {
    return <p>{t`No records match this filter.`}</p>
  }

  return (
    <p>
      <Trans>
        Start by creating your first item. You can add more details later.
      </Trans>
    </p>
  )
}
```

Good review call from a route-first app refactor:

- `msg` belongs in extracted shared config such as route meta, sidebar sections, badges, metrics, and checklist items.
- `t` is the clearest default in owner render files such as layout headers, section owners, and sidebars when those files render the final UI directly.
- Copy that only exists to support one JSX branch should stay in the component unless there is a stronger domain-sharing reason to extract it.
- If the layout child owns the only rendering site, moving that child's copy back into the child with `t` is often clearer than keeping a detached constants file.
- Mock collections that stand in for future API responses should stay plain and unlocalized until the UI decides how to present them.

Concrete `Do / Avoid` from a section-owner refactor:

```ts
// Do
const mockRecords = [
  {
    id: 'REC-1172',
    name: 'Jordan Reeves',
    group: 'Operations',
    summary: 'Needs follow-up',
    status: 'warning',
  },
]
```

```tsx
const { t } = useLingui()

<Input placeholder={t`Search by name or record id`} />
<Badge>{record.status === 'warning' ? t`Needs attention` : t`Normal`}</Badge>
```

```ts
// Avoid
const mockRecords = [
  {
    id: 'REC-1172',
    name: t`Jordan Reeves`,
    group: t`Operations`,
    summary: t`Needs follow-up`,
    statusLabel: t`Needs attention`,
  },
]
```

That shape blurs API-shaped data with UI-owned presentation labels.

Shared error descriptors can live in config when multiple owners resolve the same stable app-owned error code or failure signal.

```ts
import { msg } from '@lingui/core/macro'

const ERROR_MESSAGE_MAP = {
  'invite-email-taken': msg`This email already has a pending invite.`,
  'network-unavailable': msg`Please check your connection and try again.`,
} as const
```

```tsx
const { t } = useLingui()

<Alert>{t(ERROR_MESSAGE_MAP[inviteError.code] ?? msg`Something went wrong.`)}</Alert>
```

## Anti-Examples

Do not extract plain strings into config with no Lingui-safe descriptor type.

```ts
const headerActions = [
  { href: '/overview/open', label: 'Open work' },
  { href: '/directory', label: 'Directory' },
]
```

Do not translate too early in constants or outside the render owner.

```ts
import { i18n } from '@/i18n'

const headerActions = [
  { href: '/overview/open', label: i18n._('Open work') },
]
```

Do not build shared error config with plain strings when the repo already expects descriptor-safe extracted copy. The full failure-flow policy still belongs to `error-handling.md`.

```ts
const ERROR_MESSAGE_MAP = {
  'invite-email-taken': 'This email already has a pending invite.',
}
```

Do not extract copy just to shrink the component when the text is branch-specific and JSX-bound.

```ts
const EMPTY_STATE_COPY = {
  filtered: 'No records match this filter.',
  default: 'Start by creating your first item.',
}
```

```tsx
<p>{isFiltered ? t(EMPTY_STATE_COPY.filtered) : t(EMPTY_STATE_COPY.default)}</p>
```

That split saves almost nothing, weakens local readability, and hides that the component still owns the final UI wording.
