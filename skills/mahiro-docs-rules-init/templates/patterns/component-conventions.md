# Component Conventions

This page is blueprint-allowed. It should reflect current repo component ownership, but it may also preserve the preferred component shape the repo is expected to grow into.

## Code Organization

Use clear section comments to organize component and hook code when complexity grows. This keeps files easier to scan and review.

If the repo follows Mahiro-style component structure, keep that posture visible here even when some files are still simpler in practice.

### Section Order

1. Imports
2. Interface/Type definitions
3. Constants
4. Component function
5. Inside component body (in order):
   - hooks initialization
   - section comments
   - return JSX
6. Public exports, at the bottom when using the Mahiro-style fallback for components

Record the observed local order separately from this preferred blueprint. Preserve established local, generated, or framework-required export syntax. The fallback for `types/` and `utils/` is inline public declarations with whitespace between them; constants and hooks may also export inline. Route named framework exports stay inline; default page exports go at the bottom only where the framework permits. Small components do not need section comments merely to fill this outline.

### Section Comments

| Section | Purpose |
|---------|---------|
| `// _Ref` | `useRef` declarations |
| `// _State` | `useState` or local UI state declarations |
| `// _Query` | query hooks or data fetching |
| `// _Mutation` | mutation hooks or write actions |
| `// _Memo` | derived/computed values; use `useMemo` only when memoization has a clear purpose |
| `// _Callback` | `useCallback` for memoized functions |
| `// _Schema` | form validation schemas and inferred form types, before `_Form` |
| `// _Form` | `useForm` instances and controller wiring, not schema definitions |
| `// _Event` | event handler functions |
| `// _Effect` | `useEffect` hooks |

### Example

Use only populated sections. `_Schema` comes before `_Form` when those labels help. Keep translated form schemas with the component's active locale/form owner only where the target i18n system supports that pattern; preserve the target's real schema and locale lifecycle. Do not introduce a validator to fill this outline.

`// _Memo` can group simple local derivations. Do not add `useMemo` or `useCallback` by habit; reserve memoization for a concrete performance or identity need.

```tsx
[repo-faithful example using the repo's real data, i18n, and state libraries]
```

## Template

Adapt the example to the target repo's real conventions. When the repo is silent, the Mahiro-style fallback uses explicit `I`-prefixed props interfaces, arrow-function components, and bottom public exports. Label that as preferred direction, not observed reality. If the repo has established non-`I` or inline-export conventions, preserve them instead.

```tsx
interface IProfileCardProps {
  name: string
  description?: string
}

const ProfileCard = ({ name, description }: IProfileCardProps) => {
  const title = name.trim()

  return (
    <article>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </article>
  )
}

export { ProfileCard }
```

Export the props interface only when it is part of the public API, reused by another owner, or local convention requires it; otherwise keep it private. This small example intentionally has no section comments or memoization.

## Route Components

- Routes may keep readable page composition, page-local state, query/mutation orchestration, and simple forms when they are the real owner. Preserve framework-required loaders/actions and locally proven ownership; do not force a new section or service layer from this template.
- Extract substantive form or table partials when they clarify ownership, reuse, or scanning. Do not hide readable composition behind empty screen wrappers just to shorten a route.

## Domain or Module Partials

Extract partials only when the boundary is useful. Keep domain-specific partials owner-local. Place meaningful shared layouts or domain-neutral components in the repo's established shared owner; a `layouts/`, `components/`, or `components/modules/` shape is a conditional blueprint, not a reason to create phantom folders. Preserve the target's real structure and avoid empty wrapper churn.

## Owner-Local Data

When copy, nav items, badges, or placeholder options belong to one component only, keep them with the owner by default.

## Preferred Direction

- Keep the component template opinionated enough to show the intended React posture for this repo family.
- Preserve interface naming and section-comment conventions when they are part of the house style.
- Do not mislabel blueprint structure as already universal in the target repo.
- Let the example itself demonstrate `I`-prefixed props when that is the intended house posture.
