---
name: mahiro-style
description: Mahiro's code, review, and implementation doctrine. Use as a fallback lens for naming, structure, i18n, boundaries, state, services, UI restraint, and review heuristics when repo-local reality is silent, partial, or drifting.
---

# /mahiro-style - Mahiro Code Style Hub

Load Mahiro's code, review, and implementation doctrine before implementing, refactoring, or reviewing. This is Mahiro's style lens, not a repo-docs generator and not a blind override. It routes to canonical pages under `foundations/` and `patterns/` instead of acting like a second doctrine source.

## When to Use

- Refactoring code to feel more like Mahiro wrote it
- Reviewing AI-written code for style drift
- Rechecking an implementation against Mahiro's fallback taste after repo-local rules are satisfied
- Deciding whether something should live in routes, components, constants, services, or stores
- Checking whether UI structure depth or wrapper layers are justified
- Checking `interface` vs `type` usage
- Preserving i18n posture when extracting config/constants
- Building a reusable review checklist for repo-specific work

## Role Boundary

`mahiro-style` answers: "How should Mahiro-shaped code be implemented or reviewed when the repo has not already decided?"

It does not answer: "What is this repo's current rule set?" For that, inspect the repo or use `/mahiro-docs-rules-init` to create repo-local docs. This skill can supply `Preferred Direction`, `Not Established Yet`, and `Adoption Triggers`, but it must not label Mahiro preference as `Current Reality` unless the target repo proves it.

## Priority Order

1. `AGENTS.md`
2. Other repo-local instruction files such as `CLAUDE.md`
3. Established repo patterns
4. Mahiro fallback doctrine

If rules conflict, explicit beats implicit, specific beats general, and repeated repo patterns beat isolated examples.

## Quick Commands

```bash
/mahiro-style
/mahiro-style code-style
/mahiro-style structure
/mahiro-style i18n
/mahiro-style error
/mahiro-style boundaries
/mahiro-style review
/mahiro-style anti
```

## Retrieval Lenses

- `code-style` -> `foundations/code-style.md`
- `structure` -> `foundations/project-structure.md`, `patterns/route-boundaries.md`, `patterns/shared-ui-boundaries.md`
- `error` -> `patterns/error-handling.md`, `patterns/services.md`, `patterns/hooks.md`, `patterns/constants-i18n.md`
- `i18n` -> `patterns/constants-i18n.md`
- `boundaries` -> `patterns/services.md`, `patterns/stores-state.md`, `patterns/shared-ui-boundaries.md`
- `review` -> `foundations/review-checklist.md`
- `anti` -> `foundations/review-checklist.md`, `patterns/best-practices.md`

## Document Map

- `PROJECT-GUIDE.md` - practical project-building playbook for applying Mahiro-style from app layout through routes, services, hooks, stores, i18n, errors, and review

### Foundations

- `foundations/overview.md` - hybrid posture and how to read the skill
- `foundations/precedence.md` - conflict resolution and the full winner order
- `foundations/project-structure.md` - repo, app, and module layout, ownership, extraction posture
- `foundations/code-style.md` - imports, TypeScript surface choices, section order, export conventions, formatting posture
- `foundations/review-checklist.md` - practical review prompts for repo-rule drift and Mahiro-shape drift

### Patterns

- `patterns/constants-i18n.md` - extraction-safe copy, `msg`, render-boundary translation posture
- `patterns/error-handling.md` - stable error signals, resolver ownership, and render-boundary fallback flow
- `patterns/route-boundaries.md` - route thickness, extraction boundaries, domain ownership
- `patterns/shared-ui-boundaries.md` - shared UI, reuse thresholds, cross-domain seams
- `patterns/services.md` - transport and service layering
- `patterns/stores-state.md` - state lifetime, provider placement, store ownership
- `patterns/naming.md` - naming heuristics for files, symbols, and domain concepts
- `patterns/best-practices.md` - synthesis page for recurring implementation choices and cross-links

## Working Rule

Start from the matching canonical page, then branch only when the prompt crosses ownership boundaries. Before applying fallback doctrine, define the repo-local acceptance checks that prove the local rule or shape is satisfied. Keep repo-local doctrine first, keep Mahiro doctrine as fallback, and keep this file as the index.

Use the docs-init vocabulary when reviewing ambiguous repos:

- `Current Reality` = repo-proven code, config, docs, scripts, or repeated patterns
- `Preferred Direction` = Mahiro-style fallback for new work when repo reality is silent or partial
- `Not Established Yet` = a layer or pattern the repo has not earned
- `Adoption Triggers` = concrete conditions that justify introducing the preferred shape later

ARGUMENTS: $ARGUMENTS
