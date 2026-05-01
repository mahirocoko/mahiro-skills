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

### Section Comments

| Section | Purpose |
|---------|---------|
| `// _Ref` | `useRef` declarations |
| `// _State` | `useState` or local UI state declarations |
| `// _Query` | query hooks or data fetching |
| `// _Mutation` | mutation hooks or write actions |
| `// _Memo` | derived/computed values; use `useMemo` only when memoization has a clear purpose |
| `// _Callback` | `useCallback` for memoized functions |
| `// _Form` | form schemas and form instances |
| `// _Event` | event handler functions |
| `// _Effect` | `useEffect` hooks |

### Example

`// _Memo` can group simple local derivations. Do not add `useMemo` by habit; reserve it for measurable performance, stable values for memoized children, or effect-dependency control.

```tsx
[repo-faithful example using the repo's real data, i18n, and state libraries]
```

## Template

If props are typed with interfaces in the target repo, keep the `I` prefix visible in the template rather than flattening it into a generic props alias.

```tsx
interface IProfileCardProps {
  name: string
  description?: string
}

export const ProfileCard = ({ name, description }: IProfileCardProps) => {
  // _Memo
  const title = name.trim()

  return (
    <article>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </article>
  )
}
```

## Route Components

- Route files should stay thin and primarily connect URL structure to layout or domain/module partials.

## Domain or Module Partials

When a page grows beyond a single clean file, extract partials into an owner-local domain or module folder.

## Owner-Local Data

When copy, nav items, badges, or placeholder options belong to one component only, keep them with the owner by default.

## Preferred Direction

- Keep the component template opinionated enough to show the intended React posture for this repo family.
- Preserve interface naming and section-comment conventions when they are part of the house style.
- Do not mislabel blueprint structure as already universal in the target repo.
- Let the example itself demonstrate `I`-prefixed props when that is the intended house posture.
