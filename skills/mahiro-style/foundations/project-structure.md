# Project Structure

## Intent

This page owns repo layout, app layout, domain/module layout, and file ownership at project level.

Use it to answer questions like where a domain should live, how to split app-level folders, when to extract route-owned modules, and which files should keep orchestration versus implementation responsibility.

## App Structure and Ownership

At project level, Mahiro-style prefers explicit homes for app routes, components, hooks, services, stores, constants, types, providers, i18n, styles, and utilities.

- Repo structure should make domain boundaries visible from the folder tree.
- App structure should group code by responsibility, not by vague utility buckets or invented folder templates.
- File ownership should stay obvious enough that an agent can tell where new code belongs before touching implementation details.

## Current Reality vs Preferred Direction

- `Current Reality`: the target repo's active folder tree, docs, imports, scripts, and repeated ownership patterns.
- `Preferred Direction`: Mahiro-style fallback homes for app routes, components, hooks, services, stores, constants, providers, types, locales, styles, libs, and utils when the repo is silent or drifting.
- `Not Established Yet`: folders or layers that exist in another Mahiro repo but have no evidence in the current target.
- `Adoption Triggers`: introduce a new top-level owner only when repeated code needs that owner, several domains or modules share the same contract, or local docs explicitly start a migration.

## Non-negotiable

- Keep repo, app, and domain/module layout aligned with the local repo's documented structure first.
- Give each folder a clear ownership boundary, such as app routes, components, hooks, services, stores, providers, constants, types, i18n, styles, libs, or utils.
- Extract growing route or screen work into domain-owned files when the route stops being a clear entry point.
- Keep project-structure doctrine focused on repo, app, and module ownership, not on detailed route-boundary or shared-ui doctrine.
- Do not create folders from a template just because they exist in another Mahiro repo. If the target repo has not earned the owner, label it as preferred direction or not established yet.
- Avoid catch-all folders that hide domain intent.

## Preference

- Prefer app-local folders and domain/module subfolders that reveal the business area quickly.
- Prefer colocating related domain modules when they change together often.
- Prefer top-level app folders that match recurring responsibilities seen across Mahiro repos, such as `app` or router root, `components`, `hooks`, `services`, `stores`, `constants`, `enums`, `providers`, `types`, `utils`, `i18n`, `locales`, `styles`, and `libs`.
- Prefer concrete ownership homes inside those top-level areas when the repo is large enough to support them, such as `components/modules`, `components/layouts`, `components/providers`, `components/sections`, `components/ui`, `hooks/fetchers`, `hooks/mutations`, and `hooks/stores`.
- Prefer extraction that makes future ownership clearer, not just smaller files.
- Prefer owner-local data and config inside the owning component or module when that data is not reused across siblings.
- Prefer module data, section config, and mock payload shape to stay with the screen, hook, or section that owns the behavior until another real owner appears.
- Prefer composition parents that stay thin when child modules can own their own local mock data, labels, or static options without prop drilling.
- Prefer child-local mock or static data until real reuse, transport wiring, or a clearer shared owner actually appears.
- Prefer small module-local config files only when multiple sibling modules truly share the same runtime mapping or contract.
- Prefer app-wide providers to stay visibly app-wide, while domain workflows keep a clearer owner closer to the module boundary.
- Prefer `types/` as a shared contract owner, not a dumping ground for every local interface.
- Prefer owner-local type files when a contract is shared inside one module or service area but not across the app.
- Prefer colocated interfaces for one-owner props, service payloads, hook params, and store shapes until reuse creates a clearer owner.

## Contextual

The exact tree can differ by repo.

- A responsibility-first app can keep `app`, `components`, `hooks`, `services`, `stores`, `constants`, `types`, and `providers` visible from the source root. That is a strong example of explicit ownership.
- The same app can still sharpen ownership one level deeper with homes like `components/modules`, `components/layouts`, `components/providers`, `hooks/fetchers`, and `hooks/mutations` without turning the tree into a generic utilities maze.
- In a multi-app repo, read each product app's source tree as the transferable structure. Workspace packages are supporting evidence only; do not make package layout the core doctrine for a single app.
- In a React Router Framework app, the app root may be `app/` instead of `src/app/`. Treat that as router-root variation, not as a reason to invent a different ownership model for components, hooks, services, stores, constants, providers, or types.
- A lean route-first app needs proportional structure. Do not force a larger module tree unless the code volume actually needs it.

## Examples

### App-level source root

Use an app-local source root as the baseline example. If the repo has several product apps, mentally zoom into one product app and apply the same shape there. If the framework uses `app/` as the project source root, remove the `src/` prefix and keep the same ownership idea.

```text
src/
├── app/                  # routes, layouts, route groups, route handlers
├── components/           # app-owned UI and domain modules
├── hooks/                # fetchers, mutations, store hooks, utility hooks
├── services/             # API transport and domain service methods
├── stores/               # client state and SSR hydration helpers
├── constants/            # app-wide runtime constants and query keys
├── enums/                # shared string enums when the repo uses them
├── providers/            # app-wide client provider composition
├── types/                # shared API/domain contracts
├── utils/                # app-local pure helpers
├── i18n/                 # runtime i18n helpers and providers
├── locales/              # message catalogs
├── styles/               # global styles and theme entry points
└── libs/                 # configured clients such as axios or SDK instances
```

```text
app/
├── routes/               # React Router route modules
├── components/           # app-owned UI and domain modules
├── hooks/                # fetchers, mutations, store hooks, utility hooks
├── services/             # backend SDK or API service methods
├── stores/               # client state and hydration helpers
├── constants/            # app-wide runtime constants and query keys
├── providers/            # app-wide client provider composition
└── types/                # shared API/domain contracts
```

Not every repo needs every folder. Add a folder when the ownership exists; do not create it because the example lists it.

### Route, module, and data ownership

Route files stay as entry points. In Next App Router that usually means `src/app/.../page.tsx`; in React Router Framework that usually means `app/routes/...`. UI that grows under a route should move into component modules or sections, while transport and reusable query behavior stay in services and hooks.

```text
src/app/(auth)/orders/page.tsx
src/components/modules/orders/order-table.tsx
src/components/modules/orders/order-filter-form.tsx
src/hooks/fetchers/use-fetch-orders.ts
src/hooks/mutations/use-mutation-order.ts
src/services/order.ts
src/types/order.ts
```

```text
app/routes/orders.tsx
app/components/modules/orders/order-table.tsx
app/hooks/fetchers/use-fetch-orders.ts
app/services/order.ts
app/types/order.ts
```

- `app/.../page.tsx` or `routes/...` owns route orchestration and URL/layout boundaries, depending on the router framework.
- `components/modules/<domain>/...` owns the renderable domain UI.
- `hooks/fetchers` owns read query keys, service calls, and cache options.
- `hooks/mutations` owns write flows, invalidation, and user feedback glue.
- `services/<domain>.ts` owns backend operation names, request transport, and payload mapping.
- `types/<domain>.ts` owns shared API/domain contracts once services, hooks, and modules all import them.

### Components and providers

Component subfolders should describe UI responsibility. Providers can live in `providers/` or `components/providers/`; choose the local repo's established home and keep app-wide composition visible.

```text
src/components/layouts/app-sidebar.tsx
src/components/pages/home-page.tsx
src/components/modules/profile/profile-form.tsx
src/components/sections/latest-news-section.tsx
src/components/dialogs/confirm-delete-dialog.tsx
src/components/providers/page-provider.tsx
```

```text
src/providers/page-provider.tsx
src/providers/popup-provider.tsx
```

- `components/modules` is for domain UI, not transport ownership.
- `components/providers` is acceptable when the repo already groups provider components under `components`.
- root `providers` is acceptable when the repo treats providers as a top-level app owner.

### Local versus shared contracts

Keep owner-local contracts close to their owner. Promote contracts to `types/` only when the API/domain shape is shared across services, hooks, routes, or render modules.

```text
src/services/order.ts        # service-only helper/input can stay here
src/hooks/fetchers/use-fetch-orders.ts
src/components/modules/orders/order-table.tsx
src/types/order.ts           # shared order request/response/record contracts
```

- Constants that belong to one domain stay with that domain or module ownership, while app-wide constants live in `constants/`.
- Layout child data that is only used by one child can stay inside that child instead of being lifted into a parent compose file or a generic constants page.
- A module folder can keep local mock rows, labels, filters, or small config maps inside the owning module while the route compose file stays focused on page structure.
- A small module-local config helper is justified when several sibling module files share the same runtime maps or contract, but it should stay module-local until another domain truly needs the same contract.
- When promoted, keep related request, response, and record contracts together so the API shape is not split across owners without a reason.

## Anti-Examples

- Putting unrelated domain code into a generic `utils/` folder because the right owner was not chosen.
- Expanding this page into detailed route, shared UI, hook, or service mechanics that belong in `patterns/` docs.
- Forcing every repo into the same folder tree even when the local repo already has a stable documented shape.
- Inventing a new ownership tree when the repo's real ownership is app routes plus `components/modules`, `hooks`, `services`, and `types`.
- Treating extraction as "move code anywhere smaller" instead of clarifying ownership.
- Extracting single-owner layout data into `constants/` only to make the component look shorter, even though the move makes the reader jump farther to understand the module.
- Promoting a module-local config helper into shared app structure before another real consumer exists.
- Letting a provider become the persistence owner for domain records when a query-backed hook or service would keep ownership clearer.
- Moving every local interface into app-wide `types/` because the implementation file felt long.
- Duplicating the same API response shape in service, hook, and component files instead of promoting the repeated contract to the right type owner.
