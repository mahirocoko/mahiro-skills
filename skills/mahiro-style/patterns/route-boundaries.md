# Route Boundaries

## Intent

This page owns thin route posture, route orchestration, and what stays in route files versus extracted feature units.

Use it when the question is whether a route is too thick, what logic belongs in the route entry file, and how to hand work off to feature-owned modules without hiding the screen's entry-point responsibility.

## Detect

- Route file defines `type` or `interface` for backend response shapes
- Route file contains config maps, status-color maps, or mock data arrays
- Route file exceeds two screenfuls and mixes orchestration with implementation detail
- Route only renders a single `*Workspace` or `*Screen` wrapper after extraction, even though the route still owns the page-level composition
- Route file hides behind a single monolithic `*Screen` component instead of composing visible section owners
- Route file contains inline `fetch` calls or direct service class usage mixed with JSX

## Thin Route Boundary Rules

Routes are entry points. They should tell the reader how the screen is assembled, not force the reader to decode every implementation detail inside one file.

## Non-negotiable

- Keep route files focused on composition, route context, and high-level screen orchestration.
- Keep layout-level guards in the parent route or layout when multiple child routes share the same access rule.
- Extract bulky view sections, config maps, mock data, and feature helpers when they make the route hard to scan.
- Keep route-specific navigation and route-level shell wiring in the route when that is the real entry-point responsibility.
- Do not extract page-level composition into a single `*Workspace` or `*Screen` wrapper just to make the route shorter.
- Do not let route files become mixed homes for contracts, transport calls, style maps, and full rendering trees.
- Keep route thickness doctrine here, not in `foundations/project-structure.md` and not in `components.md`.

## Preference

- Prefer routes that read like a screen outline in the first screenful of code.
- Prefer moving repeated screen sections into domain components and repeated config into domain constants.
- Prefer route names and exports that follow the local router conventions exactly, then keep the route thin inside that local shape.
- Prefer making the route the place where domain pieces are composed, not the place where every domain detail is defined.
- Prefer route files that compose section modules directly when the page naturally reads as a matrix of domain sections.
- Prefer extracting hooks, helpers, and sections before introducing a page-wrapper component that hides the route's composition responsibility.
- Prefer extracting loading shells into feature-owned components once the skeleton starts describing a real screen or layout shell.

## Contextual

- A lean route-first app is the clearest thin-route reference because route files need to stay readable by pushing section rendering and config ownership outward as the app grows.
- A larger responsibility-first app shows the same rule at heavier scale: routes can stay as orchestration units even when services, stores, providers, and hooks are richer.
- A monorepo adds the package angle, where route-level app screens still need to stay thin even though shared packages exist elsewhere.
- Local router APIs, loader conventions, and export syntax belong to the repo. This page only decides how much responsibility the route should carry.

## Examples

- A route imports `overviewCards` and `OverviewSummarySection`, then composes the screen instead of defining card contracts, tone maps, and every card row inline.

```tsx
import { overviewCards } from '@/constants/overview-cards'
import { OverviewSummarySection } from '@/components/overview/summary-section'

const Page = () => {
  return (
    <main>
      <OverviewSummarySection items={overviewCards} />
    </main>
  )
}
```

- A route keeps auth guard composition, route shell decisions, and route params near the entry file, while feature sections, config maps, and bulky view trees move outward.
- A private route subtree keeps its auth or membership guard in the shared layout so child routes can stay focused on content composition.
- A route passes navigation callbacks or route params into a feature screen component when that keeps the entry point readable without hiding what the screen assembles.
- A route can stay thin even without a single screen component. A page-composer route can import section modules directly and keep only the page-level grid wrappers that explain how the sections are arranged.
- A route can import a feature-owned loading shell instead of inlining a long skeleton tree once the loading UI starts acting like a screen shell.

Before:

```tsx
const Page = () => {
  return (
    <main>
      <OverviewScreen />
    </main>
  )
}
```

After:

```tsx
import { OverviewHeroSection } from '@/components/overview/hero-section'
import { OverviewMetricsSection } from '@/components/overview/metrics-section'

const Page = () => {
  return (
    <div className="flex flex-col gap-6">
      <OverviewHeroSection />
      <OverviewMetricsSection />
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
- Replacing a readable route compose file with one `<FeatureWorkspace />` or `<OverviewScreen />` wrapper even though the route is the natural page-level owner.
- Hiding the whole page behind one monolithic `*-screen.tsx` when the route could read more clearly by composing a few explicit section owners directly.
- Repeating the same auth guard across every child route when a parent layout could own that decision once.
- Leaving a large loading skeleton inline in the route after it has clearly become a feature-owned shell.
- Using route files as a fallback home for service logic because no one chose a proper service boundary.
- Pushing reusable shared UI rules into route doctrine instead of resolving them in `shared-ui-boundaries.md`.
