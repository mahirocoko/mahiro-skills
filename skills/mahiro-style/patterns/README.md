# Patterns

`patterns/` is the canonical implementation layer for `/mahiro-style`.

Use this directory when the question is about how code should be shaped inside a feature: component boundaries, hook responsibilities, route thickness, shared UI leakage, naming, service ownership, state placement, provider scope, and cross-cutting implementation heuristics.

## What belongs here

- `components.md` for component shape, extraction posture, and presentational versus domain-aware component boundaries
- `hooks.md` for hook responsibility, orchestration boundaries, and reusable hook shape
- `error-handling.md` for stable failure signals, resolver ownership, and render-boundary fallback flow
- `route-boundaries.md` for thin route rules and route-to-feature extraction boundaries
- `shared-ui-boundaries.md` for reusable UI seams and business-logic leakage checks
- `naming.md` for domain naming across files, symbols, hooks, components, query keys, and feature folders
- `services.md` for transport boundaries, mapping ownership, and service contracts
- `stores-state.md` for state placement, store scope, provider scope, and server versus client state separation
- `constants-i18n.md` for Lingui-safe constants extraction and render-boundary translation rules
- `best-practices.md` for cross-cutting heuristics that connect the other pattern pages

## What does not belong here

- repo-wide precedence rules or conflict resolution, those live in `foundations/precedence.md`
- formatter defaults, import grouping mechanics, or `interface` versus `type`, those live in `foundations/code-style.md`
- repo and feature tree layout at project level, that lives in `foundations/project-structure.md`

## Reference posture

These pages are grounded in repeated patterns across a few stable repo archetypes.

- A responsibility-first single app shows the heavier shape with explicit services, stores, providers, and domain hooks.
- A lean route-first app shows that boundaries still need to stay explicit even when the tree is smaller.
- A monorepo with shared packages shows the same ownership rules at package level, especially for shared UI, service classes, and query-state patterns.

## How to use Patterns

Start from the page that owns the implementation decision you need to make.

- If the question is about route thickness, start with `route-boundaries.md`.
- If the question is about whether a reusable component is carrying domain logic, start with `shared-ui-boundaries.md`.
- If the question is about server transport, mapping, or API contracts, start with `services.md`.
- If the question is about shared failure flow, stable error codes, or who owns the final fallback message, start with `error-handling.md`.
- If the question is about where client state or providers should live, start with `stores-state.md`.

## Working rule

Pattern docs should explain implementation ownership directly. They should not act like tutorials, and they should not bounce readers back to legacy source trees.
