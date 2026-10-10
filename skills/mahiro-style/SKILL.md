---
name: mahiro-style
description: Mahiro's code, review, and implementation doctrine. Analyzes the requested job, selects relevant guidance, and asks focused scope questions only when needed; users need not remember subcommands. Use for Mahiro-style implementation, refactoring, or review, with repo-local rules first and fallback guidance for naming, structure, i18n, boundaries, state, services, and UI restraint.
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

## Start from the job, not a lens name

Calling `/mahiro-style` is enough. Treat the lenses below as internal retrieval
routes and optional shortcuts, not a menu the user must learn. Keep this entry
point thin: select existing doctrine rather than duplicating it here.

1. **Recover the target and outcome.** Use the current request, agreed task,
   recent decisions, and bounded inspection of local instructions and the named
   file, diff, or surface. Distinguish implementation, refactoring, read-only
   review, and a specific correction. Do not search other projects to invent a
   target or ask questions the local evidence already answers.
2. **Resolve only material ambiguity.** If two plausible goals would change
   the edit boundary or required proof, ask one short question with concrete
   alternatives and a recommendation. Ask about the outcome, not which guidance
   filename or subcommand to load. When context already makes the job clear,
   proceed without a questionnaire or confirmation gate.
3. **Select the smallest useful guidance.** Start with one primary lens from
   the retrieval map and read its canonical page. Add supporting pages only
   when the task crosses their boundaries. Honor an explicit lens while still
   respecting the target repo and requested scope; do not load the entire hub.
   For a UI implementation or review, select the relevant pain probes in
   `patterns/shared-ui-boundaries.md` and `foundations/review-checklist.md`
   before writing or judging the surface. For draft/navigation concerns, load
   `patterns/stores-state.md`. Users do not need a separate checklist command.
4. **State the selected scope briefly.** For example: “I'll check primitive
   ownership and form consistency; layout redesign is outside this review.”
   Name the relevant local owner and observable check before writing or judging
   a claim. Use the existing shared-UI preflight and review evidence gates rather
   than inventing another checklist here.
5. **Stay within the authorized action.** Review does not authorize fixes;
   fixing paint does not reopen geometry or product direction. Routing chooses
   guidance, not permission. End with findings or changes, checked evidence, and
   unresolved decisions appropriate to the requested job.

### Goal-driven routing examples

| Request                                                     | Route and boundary                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| “Make this code feel like mine” with a named component/diff | Inspect local conventions; start with `code-style`, adding `structure` only if ownership is involved. Preserve behavior unless changes were requested. |
| “Check whether this form really uses our design system”     | Start with `boundaries` and the shared-UI preflight; use `review` evidence gates for consumer/state/geometry claims. An import alone is not proof.     |
| “Review this diff”                                          | Start with `review`; load domain guidance only for the concrete findings. Report without editing.                                                      |
| “The locale handling isn't how I normally do it”            | Start with `i18n`, recover the repo's existing locale/macro owner, and avoid a parallel architecture.                                                  |
| Bare invocation with no recoverable target or outcome       | Ask what file/surface to work on and whether the user wants review or changes; do not present the full lens catalog.                                   |

For genuinely ambiguous scope, ask: “Should I check code structure, design-system
integration, or both? I'd start with integration because that's the mismatch
you named.” Do not ask this when the user has already selected the scope.

## Optional shortcuts

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
- `review` -> `foundations/review-checklist.md` (includes economical anchor -> hypothesis -> edit -> validation loop)
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

Analyze the job first, clarify only consequential ambiguity, and select the matching canonical page; users need not choose a lens. Branch only when the prompt crosses ownership boundaries. Before applying fallback doctrine, define the repo-local acceptance checks that prove the local rule or shape is satisfied. Keep repo-local doctrine first, keep Mahiro doctrine as fallback, and keep this file as the index.

Use the docs-init vocabulary when reviewing ambiguous repos:

- `Current Reality` = repo-proven code, config, docs, scripts, or repeated patterns
- `Preferred Direction` = Mahiro-style fallback for new work when repo reality is silent or partial
- `Not Established Yet` = a layer or pattern the repo has not earned
- `Adoption Triggers` = concrete conditions that justify introducing the preferred shape later

ARGUMENTS: $ARGUMENTS
