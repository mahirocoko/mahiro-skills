# Best Practices

## Intent

This page owns cross-cutting implementation heuristics that connect multiple pattern pages.

Use it when the problem crosses boundaries, such as deciding between route extraction, hook extraction, shared UI wrapping, service placement, or state scope.

## Detect

- Code crosses two or more ownership boundaries (e.g., transport + state + rendering in one file)
- New abstraction created (hook, component, shared UI) without checking if the current owner is still the right home
- Domain-specific code promoted to shared package or `ui/` folder after only one usage
- Refactor makes files smaller but ownership less obvious
- UI structure gets deeper, but no new semantic, layout, state, or ownership boundary was earned

## Choosing the Right Owner

The main question is not "how do I shrink this file". The main question is "which owner makes this code easiest to understand and change later".

Before choosing the owner, classify the rule source:

- `Current Reality`: follow the repo's active folders, scripts, docs, and repeated patterns.
- `Preferred Direction`: use Mahiro-style when the repo is silent, partial, or clearly drifting.
- `Not Established Yet`: do not create a layer just because a template or another Mahiro repo has it.
- `Adoption Triggers`: introduce a broader owner only after repeated cross-owner pressure, stable contracts, or explicit migration intent.

## Ownership Decision Tree

```
Where should this code live?
│
├── API transport, request/response shaping?
│   └── services.md → existing service module, or module-local backend SDK/Supabase-direct transport when that is current repo reality
│
├── Shared failure flow, stable error code, or final fallback ownership?
│   └── error-handling.md → service normalization + hook surfacing + render-boundary translation
│
├── Client state shared across screens or long-lived?
│   └── stores-state.md → store or provider
│
├── Server state (remote data, cache)?
│   └── stores-state.md → query cache (React Query), not client store
│
├── Reusable UI primitive used across domains?
│   └── shared-ui-boundaries.md → shared UI + domain wrapper
│
├── Domain-specific UI section or domain component?
│   └── components.md → domain component
│
├── Reusable stateful behavior or query wiring?
│   └── hooks.md → custom hook
│
├── Route too thick with config, types, rendering?
│   └── route-boundaries.md → extract to domain owners
│
├── Extracted copy or config with user-facing text?
│   └── constants-i18n.md → msg descriptors + render-boundary translation
│
└── Short-lived UI toggle, form state, hover?
    └── Keep as local component state
```

## Non-negotiable

- Keep this page as synthesis, not as a second full copy of every pattern page.
- Resolve implementation choices by ownership first: route, component, hook, service, store, provider, or shared UI.
- Follow repo-local tooling, exports, and formatter rules first, then apply Mahiro-shaped ownership decisions.
- Use the more specific canonical pattern page when the decision clearly belongs there.
- Keep examples here short and cross-cutting instead of turning this page into a framework tutorial.
- Treat UI structure depth as an ownership signal too; if a layer has no job, remove it or name the real owner.
- Do not promote Mahiro-style fallback into `Current Reality`; label it as preferred direction until the repo proves it.

## Preference

- Prefer the smallest scope that keeps ownership clear.
- Prefer extraction that improves searchability, naming, and reviewability together.
- Prefer keeping data transport, client state, and presentational UI in separate homes even when one file could technically hold all three.
- Prefer domain wrappers around shared primitives when domain meaning starts to leak.
- Prefer shallow, explicit UI structure over deep anonymous element trees, pass-through wrapper chains, and fragile descendant styling.
- Prefer query-backed domain hooks over domain-heavy providers when the real question is how to resolve remote entities, workflow state, or active business context.
- Prefer preserving the intended product feel of an existing screen during refactors. A change that is structurally cleaner but visually heavier, more explanatory, or less intentional is still a regression.
- Prefer shared component defaults first. Reach for spacing and padding overrides only after proving that the screen truly needs them.
- Prefer UI copy that helps the next user action, not copy that explains internal architecture or permission rules.

## Contextual

- In a larger app, ownership mistakes compound quickly. Respect the service, hook, store, and route layers before adding new abstractions.
- In a leaner app, proportionality matters. Do not create enterprise layers before the module volume asks for them.
- In a multi-app repo, package boundaries add another ownership layer. Check whether something is truly shared across apps before promoting it into a shared package.
- If a local repo has stronger snippet, package, or export rules, follow them. This page is about choosing the owner, not overriding local mechanics.
- If one Mahiro repo uses hook-owned transport and another uses service classes, preserve the target repo's current boundary first. The preferred fallback is contextual, not one rigid architecture.

## Examples

- A thick route mixes config, types, and rendering. Split by ownership: section into a component, config into domain constants, route stays as compositor.
- A remote domain flow keeps the backend as the source of truth, lets a domain hook own query and mutation wiring, and uses a small store only for lightweight runtime selection.
- A screen regains its original form after a workflow change by restoring layout, density, and tone, not merely by reconnecting the same fields to new logic.

```tsx
// Before: route owns everything
const Page = () => {
  const statusColors = { pending: 'yellow', approved: 'green' }
  const items = [{ title: 'Review', count: 3 }, { title: 'Pending', count: 7 }]

  return (
    <main>
      {items.map((item) => (
        <div style={{ color: statusColors[item.title.toLowerCase()] }}>
          {item.title}: {item.count}
        </div>
      ))}
    </main>
  )
}
```

```tsx
// After: each owner carries its own responsibility
import { DashboardSummarySection } from '@/components/dashboard/dashboard-summary-section'
import { dashboardSummaryCards } from '@/constants/dashboard-summary'

const Page = () => {
  return (
    <main>
      <DashboardSummarySection items={dashboardSummaryCards} />
    </main>
  )
}
```

- A component needs remote data. Keep transport in a service, let a hook own query wiring, and keep the component focused on rendering.

```tsx
// service owns transport
export class GoalService {
  static getSummary() {
    return getJSON<IGoalSummary>('/goals.summary')
  }
}

// hook owns query wiring
const useGoalSummary = () => {
  return useQuery({
    queryKey: ['goal-summary'],
    queryFn: GoalService.getSummary,
  })
}

// component owns rendering
const GoalSummaryCard = () => {
  const { data, isLoading } = useGoalSummary()
  if (isLoading) return <Skeleton />
  return <Card title={data.title} progress={data.progress} />
}
```

- A shared primitive starts speaking domain vocabulary. Wrap it with a domain component instead of polluting the primitive.

```tsx
// shared: stays generic
const ProgressBar = ({ value, max, tone }: IProgressBarProps) => { ... }

// domain wrapper: carries domain meaning
const AttendanceProgressBar = ({ rate }: { rate: number }) => {
  const tone = rate >= 0.9 ? 'success' : rate >= 0.7 ? 'warning' : 'danger'
  return <ProgressBar value={rate} max={1} tone={tone} />
}
```

## Anti-Examples

- Fixing every readability problem by creating another hook, even when the route or component is still the better owner.

```tsx
// unnecessary hook for one-off route logic
const useSettingsRedirect = () => {
  const { tab } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/settings/general')
  }, [tab])
}

// better: keep the redirect inline in the route where it is the only consumer
```

- Promoting one domain-specific widget into shared UI after a single usage because reuse feels possible.

```tsx
// premature: only used by the payroll page
// packages/ui/src/components/payroll-summary-card.tsx
export const PayrollSummaryCard = ({ period, total, breakdown }: IPayrollSummaryProps) => {
  // carries payroll domain vocabulary in a "shared" package
}
```

- Copying repo-local mechanics from one reference project into another without checking local doctrine first.
- Adding three more wrapper layers during a refactor even though the same layout could stay readable with one named section or row.
- Repeating full service, state, route, and naming doctrine here instead of routing to their canonical pages.
