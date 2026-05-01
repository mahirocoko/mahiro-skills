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

## Formatting Posture

Formatting is repo-owned first. `mahiro-style` supplies fallback posture, not an enforced formatter spec.

### Current Reality

- If the repo has Biome, Prettier, ESLint formatting rules, dprint, rustfmt, gofmt, or another formatter config, that config wins.
- If the repo has package scripts for formatting or linting, use those scripts instead of hand-formatting files into a personal style.
- If local docs say a formatter command writes files, treat that as part of the repo workflow and do not describe it as a read-only check.

### Preferred Direction

When the repo is silent, Mahiro-style prefers:

- 2-space indentation for TypeScript, JavaScript, JSON, Markdown, and config files where practical.
- Single quotes in TypeScript and JavaScript unless the repo formatter says otherwise.
- No semicolons unless the repo/tooling requires them.
- Trailing commas where the formatter supports them.
- A readable line width around 100-120 characters, matching repo formatter output when present.
- `import type` for type-only imports when the toolchain supports it.
- Formatter-organized imports over manual bikeshedding.

### Not Established Yet

- Do not add or change formatter config just to match Mahiro-style unless the human explicitly asks.
- Do not claim Biome, Prettier, or any formatter is current reality unless the repo proves it through config, scripts, or docs.

### Adoption Triggers

Introduce or adjust formatting configuration only when the repo lacks one, formatting drift is creating review noise, a team wants a standard baseline, or the human explicitly asks to standardize it.

## Import Posture

Imports should make ownership and runtime cost obvious without turning ordering into manual ceremony.

### Current Reality

- If the repo has formatter/import-order tooling, let that tool decide final grouping and ordering.
- If the repo has established alias rules, package-boundary rules, or local import conventions, those rules win.
- If route files, framework entrypoints, or generated files require a special import/export shape, keep the framework shape.

### Preferred Direction

When the repo is silent, Mahiro-style prefers:

- External package imports first, then app/package alias imports, then owner-local relative imports.
- `import type` for type-only imports when supported.
- App-root aliases for cross-owner imports, and relative imports for files inside the same owner folder.
- Direct imports from canonical owners over barrel imports when barrels hide ownership or make search worse.
- Imports that reveal domain ownership, not generic buckets such as `utils`, `helpers`, or `lib` unless those folders are already established and specific.

### Not Established Yet

- Do not introduce barrel exports, path aliases, or import-order plugins just to match Mahiro-style.
- Do not rewrite a whole file's import surface during a focused bug fix unless import drift is part of the bug.

### Adoption Triggers

Introduce or change import structure when imports repeatedly obscure ownership, cross-owner paths become noisy, type-only imports are causing runtime import leakage, or the repo explicitly standardizes alias/barrel posture.

## Type Surface Posture

Type surfaces should make contracts easy to scan without turning TypeScript into decorative ceremony.

### Current Reality

- If the repo has an established `interface` versus `type` convention, follow it.
- If the repo uses `I` prefixes for interfaces, keep the prefix for interfaces only and do not carry it into aliases.
- If the repo colocates props, payloads, or store interfaces beside implementations, preserve that owner-local shape.
- If the repo keeps shared domain contracts in `types/`, promote only contracts that are truly reused across owners.

### Preferred Direction

When the repo is silent, Mahiro-style prefers:

- `interface` for stable object contracts such as component props, service payloads, domain records, and store shapes.
- `type` for unions, utility compositions, mapped types, derived shapes, and values computed from constants.
- Explicit props and payload names that include domain context, such as `IInviteEmployeeParams` instead of `IParams`.
- Reusable value lists in constants owners, with derived union types exported from the appropriate type owner.
- Owner-local types staying near the owner until another route, hook, service, or component genuinely reuses the contract.
- Service request/response interfaces can stay beside the service when that service is the only owner. Promote the related request, response, and record contracts together to a domain `types/` owner when multiple services, hooks, routes, or components import the same API contract.
- Component props can stay beside the component. Promote them only when another owner imports the prop contract or a folder has a deliberate public surface.
- Hook argument and return contracts can stay beside the hook until they become shared domain behavior.

### Not Established Yet

- Do not convert every object type to `interface` or every interface to `type` just to satisfy a personal preference.
- Do not move one-owner props, service payloads, hook params, or local RPC row shapes into shared `types/` before reuse exists.
- Do not use generic names like `IData`, `IItem`, `IConfig`, or `IResponse` when the domain concept is known.
- Do not create a `types.ts` file as a reflex. The type owner should be clearer after the move, not merely farther away.

### Adoption Triggers

Promote a type to a shared owner when multiple owners import it, when it represents a stable API/domain contract, when constants and derived unions need to stay synchronized, or when keeping it local creates duplicate incompatible shapes.

## Type Placement

Type placement follows ownership, not file-size anxiety.

- **Implementation-local contracts** stay in the implementation file when only that file uses them.
- **Owner-local contracts** can move to a nearby `types.ts` or `<owner>.types.ts` when several files inside the same module, service, hook group, or component folder share them.
- **Domain contracts** can move to the repo's established `types/` owner when several owners across routes, hooks, services, or components rely on the same API/domain shape.
- **Constant-derived unions** should derive from the constants owner when the runtime value list is shared.
- **Generated or external contracts** should stay in their generated/external owner and be adapted at service or mapper boundaries instead of copied into local shapes.

The promotion question is: who would be surprised if this type changed? Keep the type near that owner.

## Export Posture

Exports should reveal which symbols are stable public surface and which ones are local implementation detail.

### Current Reality

- Follow framework export requirements first. Route files, loaders, actions, config files, and generated entrypoints may require default exports or specific named exports.
- If the repo has established named-export, default-export, or barrel-export conventions, preserve the local winner.
- If local scaffolding exports component props or service payload types beside implementations, keep that shape for matching files.

### Preferred Direction

When the repo is silent, Mahiro-style prefers:

- Named exports for reusable components, hooks, services, stores, constants, and utilities.
- Exporting reusable component prop interfaces/types beside the component, such as `export { UserCard, type IUserCardProps }`.
- Keeping route entrypoint exports aligned with the router/framework even if shared building blocks prefer named exports.
- Keeping owner-local helpers, maps, schemas, and small event utilities unexported until another owner needs them.
- Direct public exports from the canonical owner instead of barrels that blur ownership.

### Not Established Yet

- Do not convert all default exports to named exports, or all named exports to default exports, during unrelated domain work.
- Do not add `index.ts` barrels just to shorten imports when the folder does not have a stable public API.
- Do not export every helper from a file just because a test or future module might need it later.

### Adoption Triggers

Promote a symbol to exported API when another owner imports it, when tests need a stable public seam, when a folder has a deliberate public surface, or when keeping the helper private creates duplication across owners.

## Internal Section Order

Internal ordering should make complex files scannable without adding ritual to simple files.

### Current Reality

- If the repo documents section labels such as `_Ref`, `_State`, `_Query`, `_Mutation`, `_Memo`, `_Callback`, `_Schema`, `_Form`, `_Event`, or `_Effect`, follow that local order.
- If the repo uses unlabeled but repeated ordering in components or hooks, preserve that pattern before applying Mahiro fallback.
- If a file is tiny, keep it simple; not every file needs visible section comments.

### Preferred Direction

When the repo is silent, Mahiro-style prefers this rough order for complex React files:

1. refs
2. local state
3. context/store/query/mutation reads
4. derived memoized values
5. callbacks and event handlers
6. schemas/forms
7. effects
8. render helpers, early returns, and final JSX

Use visible section comments only when they improve scanning. The point is reviewability, not decoration.

### Not Established Yet

- Do not add section comments to small files where the comments are louder than the code.
- Do not reorder a file during a focused bug fix unless order drift is part of the readability problem.
- Do not use section comments to hide weak ownership. If a file has too many unrelated sections, split by owner instead.

### Adoption Triggers

Add section ordering when a component or hook grows enough that reviewers need scan anchors, when several state/query/mutation/effect groups coexist, or when local docs already ask for visible section structure.

## Non-negotiable

- Follow the repo formatter, linter, and import-order output instead of hand-formatting against it.
- Treat Mahiro formatting preferences as fallback posture only; repo tooling and local docs win first.
- Treat Mahiro import preferences as fallback posture only; repo import tooling, framework constraints, and local alias rules win first.
- Treat Mahiro type-surface preferences as fallback posture only; local interface/type conventions and repeated contract ownership win first.
- Treat Mahiro export preferences as fallback posture only; framework entrypoints and local public API conventions win first.
- Keep code-style doctrine focused on formatting posture, imports, TypeScript surface choices, section order, and export conventions.
- Do not move naming doctrine into this page.
- Keep internal file sections predictable when the repo uses section ordering conventions.
- Do not add visible section comments to small files where the comments add more ceremony than clarity.
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

- A service-owned payload can stay beside the service until another owner needs the contract.

```ts
interface IListInvoicesInput {
  status: InvoiceStatus
  page: number
}

interface IListInvoicesResponse {
  items: IInvoice[]
  total: number
}

export class InvoiceService {
  static list(input: IListInvoicesInput) {
    return postJSON<IListInvoicesResponse>('/invoice.list', input)
  }
}
```

- Once a contract is used by a service, fetcher hook, route loader, and render section, promote it to the repo's domain type owner instead of duplicating local shapes.
- A larger domain component can add visible section comments that match the local doctrine when those comments make the internal order easier to scan.

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
