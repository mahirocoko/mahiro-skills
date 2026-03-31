# Components

## Intent

This page owns component conventions, extraction posture, and the split between presentational components and domain-aware components.

Use it when the question is whether code should stay in a route or screen, move into a component, or split into a presentational shell plus a domain wrapper.

## Detect

- Component named `Section`, `Content`, `CardList`, or another shape-only word with no domain signal
- Presentational component imports a service class, calls `fetch`, or performs navigation
- Extracted component depends on scattered parent internals such as modal state, hover state, setters, and incidental wiring instead of a clear component contract
- Route file defines full rendering tree, config maps, and domain types instead of composing components
- Component JSX stacks HTML wrappers or wrapper components that do not earn a real layout, semantic, state, or ownership boundary
- Styling depends on deep descendant selectors or fragile child-position assumptions

## Component Boundaries

Mahiro-style components should make ownership visible.

- A presentational component mostly explains structure, styling, and slots.
- A domain-aware component can know feature concepts, domain copy, and screen-specific composition.
- Long props are not a smell by themselves. They can still be correct when they express one clear presentational contract.
- The component boundary should reduce noise without hiding where the business decision really lives.

## Non-negotiable

- Keep component files responsible for one clear UI job.
- Extract a component when it clarifies ownership, not just when a file gets long.
- Keep presentational components free from transport logic, store mutation wiring, and route orchestration.
- Let domain-aware components carry feature vocabulary when the UI is meaningfully tied to that domain.
- Do not add UI depth unless the extra layer has a visible job such as layout, semantics, accessibility, state boundary, or ownership boundary.
- Do not use this page to decide shared UI reuse thresholds across features, that belongs to `shared-ui-boundaries.md`.

## Preference

- Prefer components whose names reveal the screen section or domain job, such as `ApprovalOverviewSection` or `DashboardLayoutHeader`.
- Prefer passing already-shaped props instead of making a component derive feature meaning from raw backend payloads.
- Prefer judging a component boundary by contract clarity, not raw prop count alone.
- Prefer extracting large visual sections, card groups, filter bars, and tables into components before a route becomes difficult to scan.
- Prefer small wrapper components when a shared primitive needs domain-specific labels, icons, or mapping.
- Prefer flatter UI structure and locally owned styling when the same UI can be expressed without deep descendant chains.
- Prefer named slots, small subcomponents, explicit layout rows, or direct section composition before adding wrapper components or deep anonymous element trees.

## Contextual

- A token-first app can keep shared primitives generic while screen-specific layout wrappers and domain sections stay feature-aware.
- A larger app can let domain components, layout components, and reusable UI all coexist as long as each tier keeps a readable job.
- A monorepo can keep package-level shared UI while app-level components still own product wording and feature composition.
- Local snippet, formatter, and export conventions are repo-owned concerns. Follow those locally, then shape the component boundary with this doctrine.

## Examples

- A route hands shaped props to a domain section instead of mixing card config, status mapping, and JSX layout in the route file.

```tsx
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

- A presentational component accepts domain-neutral props. A feature wrapper maps domain meaning into those props.

```tsx
interface IStatusBadgeProps {
  label: string
  tone: 'info' | 'warning' | 'success'
}

const StatusBadge = ({ label, tone }: IStatusBadgeProps) => {
  return <span data-tone={tone}>{label}</span>
}
```

```tsx
const ApprovalStatusCell = ({ status }: { status: ApprovalStatus }) => {
  const { t } = useLingui()
  return (
    <StatusBadge
      label={t(getApprovalLabel(status))}
      tone={getApprovalTone(status)}
    />
  )
}
```

- A domain-aware section component owns its own query wiring and layout while the route stays thin.

```tsx
const DashboardMetricsSection = () => {
  const metricsQuery = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: DashboardService.getMetrics,
  })

  if (metricsQuery.isLoading) return <MetricsSkeleton />

  return (
    <div className="grid grid-cols-3 gap-4">
      {metricsQuery.data?.items.map((metric) => (
        <MetricCard key={metric.id} {...metric} />
      ))}
    </div>
  )
}
```

- A compact presentational component keeps only the layers that actually carry layout or semantics.

```tsx
const DashboardMetricCard = ({ label, value, trend }: IDashboardMetricCardProps) => {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <strong className="mt-1 block text-2xl font-semibold text-zinc-900">
            {value}
          </strong>
        </div>
        <TrendBadge trend={trend} />
      </div>
    </article>
  )
}
```

- A presentational section can accept several props when they still form one clear render contract.

```tsx
type OrderSummarySectionProps = {
  items: OrderItem[]
  subtotal: number
  discount: number
  shippingFee: number
  total: number
  canEdit: boolean
  onApplyDiscount: (code: string) => void
  onRemoveItem: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
}

const OrderSummarySection = ({
  items,
  subtotal,
  discount,
  shippingFee,
  total,
  canEdit,
  onApplyDiscount,
  onRemoveItem,
  onUpdateQuantity,
}: OrderSummarySectionProps) => {
  return <section>{/* render only */}</section>
}
```

- A route should usually compose real section owners directly instead of hiding the page behind pass-through wrappers.

```tsx
const Page = () => {
  return (
    <main className="space-y-6">
      <DashboardHeroSection />
      <DashboardMetricsSection />
    </main>
  )
}
```

## Anti-Examples

- A component called `Section` or `CardList` that only makes sense if the reader already knows the route.

```tsx
const Section = ({ data }: { data: unknown[] }) => {
  return <div>{/* what domain? what screen? */}</div>
}
```

- A presentational component that imports a service, fetches its own data, and silently decides screen navigation.

```tsx
const UserAvatar = ({ userId }: { userId: string }) => {
  const router = useRouter()
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => UserService.getById(userId),
  })

  return (
    <img
      src={userQuery.data?.avatar}
      onClick={() => router.push(`/users/${userId}`)}
    />
  )
}
```

- Extracting a component that still depends on scattered parent internals, making ownership harder to read rather than easier.

```tsx
const OrderSummary = ({
  items,
  selectedItemId,
  setSelectedItemId,
  isCouponModalOpen,
  setIsCouponModalOpen,
  draftCouponCode,
  setDraftCouponCode,
  hoveredRowId,
  setHoveredRowId,
  validationErrors,
  setValidationErrors,
  isSubmittingCoupon,
}: OrderSummaryProps) => {
  // parent internals are leaking through the boundary
}
```

- Building wrapper-on-wrapper markup just to mirror visual grouping from a design, even though most layers have no independent job.

```tsx
const DashboardMetricCard = ({ label, value }: IDashboardMetricCardProps) => {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="h-full w-full">
        <div className="flex h-full w-full flex-col">
          <div className="flex w-full flex-col">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-zinc-500">{label}</span>
              <strong className="text-2xl font-semibold text-zinc-900">
                {value}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- Hiding a readable page behind wrapper screen components even though those layers do not earn a real logic, semantic, or structure boundary.

```tsx
const Page = () => {
  return (
    <DashboardScreen>
      <DashboardContent>
        <DashboardMetrics />
      </DashboardContent>
    </DashboardScreen>
  )
}
```

- Pushing shared UI leakage questions into this page instead of resolving them in `shared-ui-boundaries.md`.
