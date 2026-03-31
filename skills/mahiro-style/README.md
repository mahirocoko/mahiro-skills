# mahiro-style skill

`/mahiro-style` is Mahiro's cross-repo code-shape doctrine.

It is a human-facing overview for the skill, not the doctrine itself. Use it to understand what the skill does, how it should be read, and where the real topic guidance now lives.

## What this skill is for

Use it when you want AI to:

- shape code so it feels more like Mahiro wrote it
- review naming, file boundaries, extraction choices, and architecture drift
- keep UI structure depth proportional to the real job
- decide what belongs in routes, components, constants, services, or stores
- shape shared error handling across enums, constants, hooks, services, and render owners
- preserve translation-safe and Lingui-safe patterns when refactoring
- apply Mahiro defaults only where the current repo has not already decided the rule

## What this skill is not

- not a replacement for repo-local doctrine
- not a linter or formatter spec
- not a framework tutorial
- not a second source of truth that repeats every doctrine page

## Hybrid posture

This skill is hybrid on purpose: it helps code feel Mahiro-shaped, but repo-local doctrine wins first.

When rules conflict, use this order:

1. `AGENTS.md`
2. Other repo-local instruction files such as `CLAUDE.md`
3. Established repo patterns already in use
4. Mahiro fallback doctrine

That means `/mahiro-style` is strongest when the repo is silent, partial, or drifting. It should fill gaps and sharpen reviews, not bulldoze local decisions.

## How to read the docs

The root docs stay thin on purpose:

- `SKILL.md` is the agent hub and retrieval map
- `README.md` is this human overview
- `foundations/` holds stable doctrine about how to read repo rules, structure work, and review drift
- `patterns/` holds practical implementation guidance for components, hooks, services, state, naming, i18n-adjacent choices, and shared error flow

If you need the actual doctrine, start from the canonical pages under `foundations/` and `patterns/`, not from a separate examples tree.

## Canonical map

Start with these pages depending on the question:

- `foundations/overview.md` for the mental model and why the skill exists
- `foundations/precedence.md` for rule priority and conflict resolution
- `foundations/project-structure.md` for repo and feature layout
- `foundations/code-style.md` for imports, TypeScript surface choices, section order, and export posture
- `foundations/review-checklist.md` for review prompts and drift detection
- `patterns/*.md` for topic-specific implementation guidance such as components, hooks, route boundaries, shared UI boundaries, services, stores/state, naming, constants+i18n, error handling, and best practices

## Recommended usage

```text
/mahiro-style "review this diff for Mahiro-style drift"
/mahiro-style structure "help shape this feature tree in my style"
/mahiro-style error "review this failure flow and where the error message should be owned"
/mahiro-style i18n "extract constants without breaking translation posture"
/mahiro-style review "list the places this still does not feel like my style"
```

## Working rule

Keep this skill broad enough to travel across Mahiro repos, but narrow enough to stay useful in real reviews and refactors. The README should orient humans quickly; the canonical topic pages should carry the doctrine.
