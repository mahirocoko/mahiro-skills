# Project Structure

## Intent

This page owns repo layout, feature layout, and file ownership at project level.

Use it to answer questions like where a domain should live, how to split repo-level folders, when to extract feature modules, and which files should keep orchestration versus implementation responsibility.

## Feature Structure and Ownership

At project level, Mahiro-style prefers explicit homes for routes, components, hooks, services, stores, constants, types, and providers.

- Repo structure should make domain boundaries visible from the folder tree.
- Feature structure should group code by responsibility, not by vague utility buckets.
- File ownership should stay obvious enough that an agent can tell where new code belongs before touching implementation details.

## Non-negotiable

- Keep repo and feature layout aligned with the local repo's documented structure first.
- Give each folder a clear ownership boundary, such as routes, services, stores, providers, constants, or components.
- Extract growing route or screen work into domain-owned files when the route stops being a clear entry point.
- Keep project-structure doctrine focused on repo and feature ownership, not on detailed route-boundary or shared-ui doctrine.
- Avoid catch-all folders that hide domain intent.

## Preference

- Prefer feature folders or domain folders that reveal the business area quickly.
- Prefer colocating related domain modules when they change together often.
- Prefer top-level app folders that match recurring responsibilities seen across Mahiro repos, such as `routes`, `components`, `hooks`, `services`, `stores`, `constants`, `providers`, `types`, and `locales`.
- Prefer concrete ownership homes inside those top-level areas when the repo is large enough to support them, such as `components/modules`, `components/ui`, `hooks/fetchers`, `hooks/mutations`, `styles`, and `locales`.
- Prefer extraction that makes future ownership clearer, not just smaller files.
- Prefer owner-local data and config inside the owning component or module when that data is not reused across siblings.
- Prefer feature data, section config, and mock payload shape to stay with the screen, hook, or section that owns the behavior until another real owner appears.
- Prefer composition parents that stay thin when child modules can own their own local mock data, labels, or static options without prop drilling.
- Prefer child-local mock or static data until real reuse, transport wiring, or a clearer shared owner actually appears.
- Prefer small feature-local config files only when multiple sibling modules truly share the same runtime mapping or contract.
- Prefer app-wide providers to stay visibly app-wide, while feature-domain workflows keep a clearer owner closer to the feature boundary.

## Contextual

The exact tree can differ by repo.

- A responsibility-first app can keep `routes`, `services`, `stores`, `constants`, and `providers` visible from the top level. That is a strong example of explicit ownership.
- The same app can still sharpen ownership one level deeper with homes like `components/modules`, `components/ui`, `hooks/fetchers`, and `hooks/mutations` without turning the tree into a generic utilities maze.
- A monorepo can carry the same ownership rules at both workspace level and package level. Package purpose, services, hooks, and shared UI should still have clear homes inside each app or package.
- A lean route-first app needs proportional structure. Do not force a larger feature tree unless the code volume actually needs it.

## Examples

- A new domain with routes, queries, and view components gets a feature home that makes the business area visible instead of scattering files into unrelated shared folders.
- Constants that belong to one domain stay with that domain or feature ownership, while repo-wide constants live in a clearly shared location.
- Layout child data that is only used by one child can stay inside that child instead of being lifted into a parent compose file or a generic constants page.
- A feature section folder can keep `mockChecklistItems`, `mockMetrics`, or `mockEmployees` inside the owning section modules while the route compose file stays focused on page structure.
- A small feature-local config helper is justified when several sibling modules share the same runtime maps or contract, but it should stay feature-local until another feature truly needs the same contract.
- A nested feature area can keep owner-local files and config close to the feature while broader shared primitives still live under a clearly shared UI home.
- Providers live where app-wide scope is obvious, such as root-level provider files, instead of being hidden inside unrelated feature modules.

## Anti-Examples

- Putting unrelated domain code into a generic `utils/` folder because the right owner was not chosen.
- Expanding this page into detailed route, shared UI, hook, or service mechanics that belong in `patterns/` docs.
- Forcing every repo into the same folder tree even when the local repo already has a stable documented shape.
- Treating extraction as "move code anywhere smaller" instead of clarifying ownership.
- Extracting single-owner layout data into `constants/` only to make the component look shorter, even though the move makes the reader jump farther to understand the feature.
- Promoting a feature-local config helper into shared app structure before another real consumer exists.
- Letting a provider become the persistence owner for feature-domain records when a query-backed hook or service would keep ownership clearer.
