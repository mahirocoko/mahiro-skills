# Route Boundaries

## Intent

This page owns thin route posture, visible page orchestration, and what stays in route files versus extracted modules.

Use it when the question is whether a route is too thick, what logic belongs in the route entry file, and how to hand work off to domain-owned modules without hiding the screen's entry-point responsibility.

## Detect

- Route file defines `type` or `interface` for backend response shapes
- Route file contains config maps, status-color maps, or mock data arrays
- Route file exceeds two screenfuls and mixes orchestration with implementation detail
- Route only renders a single `*Workspace` or `*Screen` wrapper after extraction, even though the route still owns the page-level composition
- Route file hides behind a single monolithic `*Screen` component instead of composing visible section owners
- Route file contains inline `fetch` calls or direct service class usage mixed with JSX
- Route file owns query cache setup, provider runtime, or global store hydration that belongs to the app shell
- Route file moves all meaningful composition into a custom `usePage` hook or one wrapper component with no visible page outline

## Thin Route Boundary Rules

Routes are entry points. They should tell the reader how the screen is assembled, not force the reader to decode every implementation detail inside one file.

The route file is allowed to be a visible page orchestrator. Thin does not mean empty. A good route can own route params, guards, redirects, URL state, page-level query and mutation wiring, and section composition when those decisions are unique to the page and still readable at the entry point.

## Current Reality vs Preferred Direction

- `Current Reality`: follow the router shape the repo already uses, including file-route naming, loader/action conventions, generated route types, and parent layout ownership.
- `Preferred Direction`: route files should stay visible page orchestrators. They may own guards, redirects, route params, page-local UI state, and composition.
- `Not Established Yet`: a repo has not earned a hidden `*Screen` or `*Workspace` wrapper just because a route grew long.
- `Adoption Triggers`: extract when a section becomes reusable, a loading/error shell describes a real product state, config repeats across sibling sections, transport details leak into JSX, or route-local logic becomes shared behavior.

## Route Ownership

Routes may own:

- route params, search params, and URL-state wiring that define the current page view
- route-local guards, redirects, and not-found decisions that are unique to the page
- page-level query and mutation orchestration when the route is the only meaningful owner
- high-level loading, empty, and error shells that explain the page state
- visible composition of domain sections, panels, forms, tables, and page-level wrappers

Routes should not own:

- REST endpoint strings, request headers, payload construction, or response mapping; use `services.md`
- reusable fetcher/mutation behavior, shared cache key helpers, or cross-screen orchestration; use `hooks.md`
- app-wide providers, query client construction, SSR cookie hydration, or persisted client state; use `stores-state.md`
- repo, app, and module folder policy; use `foundations/project-structure.md`

When in doubt, ask whether moving the code out makes the route's page outline clearer or just hides the same complexity somewhere less discoverable.

## Non-negotiable

- Keep route files focused on composition, route context, and high-level screen orchestration.
- Keep layout-level guards in the parent route or layout when multiple child routes share the same access rule.
- Extract bulky view sections, config maps, mock data, and domain helpers when they make the route hard to scan.
- Keep page-level orchestration in the route when the route is the only real owner and the code still reads as the screen outline.
- Keep route-specific navigation and route-level shell wiring in the route when that is the real entry-point responsibility.
- Move transport details, persistence decisions, and provider runtime out of routes even when the route is the first place that needs the behavior.
- Do not extract page-level composition into a single `*Workspace` or `*Screen` wrapper just to make the route shorter.
- Do not repeat global layout or provider wrappers in child routes when the root or parent route already owns that shell.
- Do not let route files become mixed homes for contracts, transport calls, style maps, and full rendering trees.
- Keep route thickness doctrine here, not in `foundations/project-structure.md` and not in `components.md`.

## Preference

- Prefer routes that read like a screen outline in the first screenful of code.
- Prefer moving repeated screen sections into domain components and repeated config into domain constants.
- Prefer route names and exports that follow the local router conventions exactly, then keep the route thin inside that local shape.
- Prefer making the route the place where domain pieces are composed, not the place where every domain detail is defined.
- Prefer route files that compose section modules directly when the page naturally reads as a matrix of domain sections.
- Prefer extracting hooks, helpers, and sections before introducing a page-wrapper component that hides the route's composition responsibility.
- Prefer extracting loading shells into domain-owned components once the skeleton starts describing a real screen or layout shell.
- Prefer URL state in the route when filters, tabs, or pagination should be shareable and bookmarkable.
- Prefer route-local state in the route when it controls only that page and no reuse boundary has emerged.
- Prefer keeping one-off guard and redirect decisions in the route or parent layout instead of hiding them in generic hooks.

## Contextual

- A lean route-first app is the clearest thin-route reference because route files need to stay readable by pushing section rendering and config ownership outward as the app grows.
- A larger responsibility-first app shows the same rule at heavier scale: routes can stay as orchestration units even when services, stores, providers, and hooks are richer.
- A multi-app repo adds a promotion question: route-level app screens still need to stay thin, and shared packages should not become a hiding place for page-specific orchestration.
- Local router APIs, loader conventions, and export syntax belong to the repo. This page only decides how much responsibility the route should carry.
- A repo where root owns layout and providers should keep child routes focused on content composition. A repo where parent routes own auth/workspace gates should not duplicate those gates in every child.
- A route can coordinate queries, mutations, URL state, and section rendering without becoming the home for endpoint details, store persistence, or provider setup.
- A route can remain readable with direct section composition. Extraction should reveal ownership, not erase the page outline.

## Examples

- A route imports domain sections, reads URL state, calls domain hooks, and composes the screen instead of defining contracts, tone maps, endpoint details, and every row inline.

```tsx
import { useApprovalQueue } from '@/hooks/fetchers/use-approval-queue'
import { ApprovalSummarySection } from '@/components/approval/summary-section'
import { ApprovalFiltersSection } from '@/components/approval/filters-section'
import { ApprovalTableSection } from '@/components/approval/table-section'

const Page = () => {
  const [status, setStatus] = useSearchParamState('status', 'pending')
  const approvalQueue = useApprovalQueue({ status })

  return (
    <main className="space-y-6">
      <ApprovalSummarySection query={approvalQueue} />
      <ApprovalFiltersSection status={status} onStatusChange={setStatus} />
      <ApprovalTableSection query={approvalQueue} />
    </main>
  )
}
```

- A route keeps auth guard composition, route shell decisions, and route params near the entry file, while domain sections, config maps, and bulky view trees move outward.
- A route owns route params and URL filters, passes them into a fetcher hook, and composes table plus filter sections without embedding endpoint strings.
- A private route subtree keeps its auth or membership guard in the shared layout so child routes can stay focused on content composition.
- A route passes navigation callbacks or route params into a domain screen component when that keeps the entry point readable without hiding what the screen assembles.
- A route can stay thin even without a single screen component. A page-composer route can import section modules directly and keep only the page-level grid wrappers that explain how the sections are arranged.
- A route can import a domain-owned loading shell instead of inlining a long skeleton tree once the loading UI starts acting like a screen shell.

Before:

```tsx
const Page = () => {
  return (
    <main>
      <OrdersWorkspace />
    </main>
  )
}
```

After:

```tsx
import { OrdersHeroSection } from '@/components/modules/orders/orders-hero-section'
import { OrdersMetricsSection } from '@/components/modules/orders/orders-metrics-section'

const Page = () => {
  return (
    <div className="flex flex-col gap-6">
      <OrdersHeroSection />
      <OrdersMetricsSection />
    </div>
  )
}
```

The improvement is not "more files" by itself. The route now explains the page structure directly, while each section file owns its own local detail.

## Anti-Examples

- A route file that defines backend response types, status-color maps, sample data, event handlers, and a full screen tree in one place.

```tsx
type ApprovalItem = {
  title: string
  count: string
}

const toneMap = {
  pending: 'warning',
}

const items = [
  { title: 'A', count: '1' },
  { title: 'B', count: '2' },
]
```

- Extracting everything out of the route until the route no longer explains what the screen actually is.
- Replacing a readable route compose file with one `<OrdersWorkspace />` or `<OverviewScreen />` wrapper even though the route is the natural page-level owner.
- Hiding the whole page behind one monolithic `*-screen.tsx` when the route could read more clearly by composing a few explicit section owners directly.
- Repeating the same auth guard across every child route when a parent layout could own that decision once.
- Leaving a large loading skeleton inline in the route after it has clearly become a domain-owned shell.
- Using route files as a fallback home for service logic because no one chose a proper service boundary.
- Moving all route state, queries, mutations, redirects, and formatting into `usePage()` so the route looks short but no owner is clearer.
- Building app-wide provider setup, query client creation, or persisted store hydration inside a page route because that route happened to need it first.
- Pushing reusable shared UI rules into route doctrine instead of resolving them in `shared-ui-boundaries.md`.
