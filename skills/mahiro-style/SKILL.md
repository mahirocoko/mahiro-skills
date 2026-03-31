---
name: mahiro-style
description: Mahiro cross-repo code style doctrine. Encodes Mahiro's preferences for naming, file structure, interface/type usage, constants plus i18n, component boundaries, UI structure restraint, and review heuristics. Use when implementing, reviewing, refactoring, or aligning code to Mahiro style.
---

# /mahiro-style - Mahiro Code Style Hub

Load Mahiro's cross-repo code-shape doctrine before implementing, refactoring, or reviewing. This hub stays thin on purpose. It routes to canonical pages under `foundations/` and `patterns/` instead of acting like a second doctrine source.

## When to Use

- Refactoring code to feel more like Mahiro wrote it
- Reviewing AI-written code for style drift
- Deciding whether something should live in routes, components, constants, services, or stores
- Checking whether UI structure depth or wrapper layers are justified
- Checking `interface` vs `type` usage
- Preserving i18n posture when extracting config/constants
- Building a reusable review checklist for repo-specific work

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

### Foundations

- `foundations/overview.md` - hybrid posture and how to read the skill
- `foundations/precedence.md` - conflict resolution and the full winner order
- `foundations/project-structure.md` - repo and feature layout, ownership, extraction posture
- `foundations/code-style.md` - imports, TypeScript surface choices, section order, export conventions, formatting posture
- `foundations/review-checklist.md` - practical review prompts for repo-rule drift and Mahiro-shape drift

### Patterns

- `patterns/constants-i18n.md` - extraction-safe copy, `msg`, render-boundary translation posture
- `patterns/error-handling.md` - stable error signals, resolver ownership, and render-boundary fallback flow
- `patterns/route-boundaries.md` - route thickness, extraction boundaries, feature ownership
- `patterns/shared-ui-boundaries.md` - shared UI, reuse thresholds, cross-feature seams
- `patterns/services.md` - transport and service layering
- `patterns/stores-state.md` - state lifetime, provider placement, store ownership
- `patterns/naming.md` - naming heuristics for files, symbols, and domain concepts
- `patterns/best-practices.md` - synthesis page for recurring implementation choices and cross-links

## Working Rule

Start from the matching canonical page, then branch only when the prompt crosses ownership boundaries. Keep repo-local doctrine first, keep Mahiro doctrine as fallback, and keep this file as the index.

ARGUMENTS: $ARGUMENTS
