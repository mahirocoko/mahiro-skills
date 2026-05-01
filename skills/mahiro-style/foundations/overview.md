# Foundations Overview

## Intent

`mahiro-style` is a hybrid doctrine. It helps code feel like Mahiro, but it yields to repo-local rules first. Follow `AGENTS.md`, then other repo-local instruction files such as `CLAUDE.md`, then established repo patterns, and only then apply Mahiro fallback doctrine.

This page explains the mental model for the skill and why the Foundations docs exist. It is the entry point for reading the doctrine correctly before applying any narrower pattern page.

## Role Boundary

`mahiro-style` is Mahiro's implementation and review lens. It is where agents look for code-shape defaults, extraction discipline, route/component/hook/service/store boundaries, i18n posture, naming, and anti-slop review heuristics.

It is not the source of truth for a target repo's current state. A repo's `Current Reality` must come from local docs, code, config, scripts, or repeated active patterns. Mahiro-style becomes `Preferred Direction` only when local reality is silent, partial, or drifting.

## Non-negotiable

- Treat this skill as fallback doctrine, not as permission to override repo-local rules.
- Read local instructions before applying cross-repo defaults.
- Use Foundations for stable doctrine about interpretation, structure, and code-style posture.
- Keep topic-specific implementation guidance in `patterns/`, not in this page.
- Ground the doctrine in repeated repo evidence, not one-off taste.

## Preference

- Prefer a thin root hub and clear canonical owners over broad mixed pages.
- Prefer rules that help an agent answer, "which page owns this question?" fast.
- Prefer doctrine that survives across different repo shapes, even when stack details differ.
- Prefer examples grounded in repeated real-world repo archetypes instead of one named project.
- Prefer preserving product feel during implementation and refactors; technically correct behavior is not enough if the screen loses the intended tone, density, or interaction character.

## Contextual

The shape stays stable across repos, but the concrete rules still depend on local context.

- A multi-app repo can still keep each product app's ownership explicit before promoting anything into shared packages.
- A responsibility-first single app can keep router root, `components`, `hooks`, `services`, `stores`, and `constants` visible without collapsing into one giant bucket.
- A lean route-first app can still document route files, root providers, tests, and formatter rules clearly in `AGENTS.md`.

Those repos differ in shape, but the shared pattern is consistent: local doctrine wins, repeated structure matters, and fallback style should sharpen the repo's existing direction instead of flattening it.

## Reality Vocabulary

Use the same vocabulary as `mahiro-docs-rules-init` when applying this doctrine:

- `Current Reality` - what the repo proves today
- `Preferred Direction` - Mahiro's fallback for new work or cleanup
- `Not Established Yet` - what should not be documented or implemented as if it already exists
- `Adoption Triggers` - when the preferred direction becomes justified

This vocabulary prevents the main failure mode: converting Mahiro preference into fake repo fact.

## Examples

- A repo with strong local docs uses `/mahiro-style` to fill gaps and review drift, not to replace those docs.
- A repo with partial docs but repeated app/module folders uses the observed layout as the starting rule before fallback doctrine adds detail.
- A new refactor starts from Foundations first, then jumps into `patterns/` only when the question becomes about a specific implementation domain.

## Anti-Examples

- Treating `/mahiro-style` like a global override that can ignore `AGENTS.md`.
- Using this page to decide hook, service, or shared UI boundaries that belong in `patterns/`.
- Writing doctrine here that duplicates detailed naming, i18n, or route-boundary rules.
- Grounding a rule in one memorable file instead of repeated repo evidence.
