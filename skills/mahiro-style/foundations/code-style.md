# Code Style

## Intent

This page owns formatting posture, imports, TypeScript surface choices, internal section order, and export conventions.

Use it before editing code when the question is about how the file should be shaped, not what the domain should be named.

## Imports and Type Shape

Read the formatter and local repo rules first, then keep imports and type surfaces consistent with the winning local convention.

- Prefer `import type` for type-only imports when the repo uses it.
- Keep TypeScript surfaces explicit enough that props, payloads, and store shapes are easy to scan.
- Treat `interface` versus `type` as a local convention plus repeated repo pattern question, not a universal rule.
- If the local repo uses `I` prefixes, keep that prefix for interfaces only. Do not carry `I` into type aliases.
- Keep reusable value lists and domain constants in constants owners, then derive types from them in type owners when the repo follows a constants-versus-types split.

## Non-negotiable

- Follow the repo formatter, linter, and import-order output instead of hand-formatting against it.
- Keep code-style doctrine focused on formatting posture, imports, TypeScript surface choices, section order, and export conventions.
- Do not move naming doctrine into this page.
- Keep internal file sections predictable when the repo uses section ordering conventions.
- Match the winning local export style before applying fallback preference.
- Do not mix reusable domain constants into type files once the constants are shared enough to deserve a constants owner.

## Preference

- Prefer formatter-led consistency over manual styling.
- Prefer `import type` where the repo uses it and the import is type-only.
- Prefer explicit section order in larger components and hooks when it improves scanability.
- Prefer section comments that mirror local doctrine labels when the repo explicitly names an internal order and the file is complex enough to benefit from visible structure.
- Prefer export posture that matches local scaffolding and repeated repo files.
- Prefer simple TypeScript surfaces that expose domain meaning without unnecessary alias churn.
- Prefer unprefixed `type` aliases for unions, utility compositions, and derived shapes even in repos that reserve `I*` names for interfaces.
- Prefer deriving reusable unions from constants that live in explicit constants owners instead of hiding those value lists inside type files.

## Contextual

This page is intentionally narrow because local repos vary a lot here.

- Some repos explicitly call out Biome, `import type`, named exports for components, and a stable section order for components and hooks.
- Other repos center Biome, `import type`, kebab-case file posture, and section ordering when complexity grows, while allowing both default and named exports if local scaffolding does.
- When `AGENTS.md` explicitly names section order (`_Ref`, `_State`, `_Query`, `_Mutation`, `_Memo`, `_Callback`, `_Form`, `_Event`, `_Effect`), that documented order should be applied to new complex files even if older files still look inconsistent.
- Some stronger local rule sets also require visible section comments, service-class patterns, or colocated type exports beside implementations.
- Some stronger local rule sets also split reusable domain constants into `constants/` and keep `types/` focused on declarations only.

The cross-repo pattern is not "one exact syntax everywhere." The real pattern is to respect the local code-style surface first, then use Mahiro fallback doctrine to keep new files internally clean and predictable.

## Examples

- A repo that uses `interface` for stable object contracts keeps that split clear, while unions and utility compositions stay as `type`.

```ts
interface IApprovalQueueItem {
  id: string
  title: string
  status: 'pending' | 'approved' | 'rejected'
}

type ApprovalStatus = IApprovalQueueItem['status']
type ApprovalToneMap = Record<ApprovalStatus, string>
```

- A repo that reserves `I*` for interfaces keeps aliases clean and unprefixed.

```ts
interface IEmployeeRecord {
  id: string
  fullName: string
}

type EmployeeRecordMap = Record<string, IEmployeeRecord>
type EmployeeRecordStatus = 'active' | 'inactive'
```

- A Biome repo keeps import ordering and formatting aligned with Biome output instead of preserving hand-grouped imports, and keeps `import type` when the import is type-only.
- A larger component follows a stable internal order so reviewers can scan refs, state, queries, memo, events, and effects without hunting.

```tsx
const ApprovalQueueSection = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const approvalQueueQuery = useQuery({ ... })
  const filteredItems = useMemo(() => [], [])
  const handleSearchChange = (value: string) => setSearchValue(value)
  useEffect(() => {}, [])

  return <section ref={containerRef} />
}
```

- A repo with named-export component scaffolds keeps named exports for components, while route entry files still use default exports if that is how the local router works.
- A repo with a constants-versus-types split keeps the value list in a constants owner and derives the type where declarations belong.

```ts
export const MEMBERSHIP_ROLES = ['owner', 'hr-admin', 'manager', 'employee'] as const

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number]
```
- A larger feature component can add visible section comments that match the local doctrine when those comments make the internal order easier to scan.

```tsx
const TeamSwitcher = () => {
  const { t } = useLingui()

  // _State
  const [activeTeamName, setActiveTeamName] = useState<string | null>(null)

  // _Memo
  const teams = []
  const activeTeam = teams.find((team) => team.name === activeTeamName) ?? teams[0]

  // _Event
  const handleSelectTeam = (teamName: string) => {
    setActiveTeamName(teamName)
  }

  return null
}
```

## Anti-Examples

- Rewriting imports into a personal style that fights the repo formatter.
- Using `type` for every object shape just because it is shorter, then mixing `I`-prefixed names into `type` aliases with no local precedent.

```ts
type IApprovalQueueItem = {
  id: string
  title: string
}
```

- Keeping `import type` available in the repo, then still importing pure types as runtime values without a local reason.
- Using this page to decide file naming, domain naming, or route/shared UI ownership.
- Mixing queries, handlers, refs, and effects in the order they happened to be written when the repo already relies on section order to keep larger files readable.
- Mixing named and default exports randomly inside one repo when local scaffolding already signals a winner.
- Turning `interface` versus `type` into a universal rule without checking the local repo first.
- Leaving reusable domain constants inside type files after the repo has already established a clearer `constants/` owner.
