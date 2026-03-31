# Foundations

`foundations/` is the stable doctrine layer for `/mahiro-style`.

Use this directory when the question is about how to read repo rules, how to choose the winning rule, how to shape repo and feature layout, or how to keep code-style decisions aligned before topic-specific pattern rules start.

## What belongs here

- `overview.md` for the hybrid mental model, reference-project grounding, and why this skill exists
- `precedence.md` for the exact winner order when sources conflict
- `project-structure.md` for repo layout, feature layout, and file ownership at project level
- `code-style.md` for formatting posture, imports, TypeScript surface choices, section order, and export conventions
- `review-checklist.md` for review prompts and drift detection

## What does not belong here

- detailed route-boundary rules, shared UI boundaries, or service/store mechanics
- naming doctrine for files, hooks, components, and domain concepts
- constants plus i18n implementation rules

Those practical implementation topics live under `patterns/`.

## How to use Foundations

Start with `overview.md` if you need the mental model.

Go to `precedence.md` when local docs, repo patterns, and Mahiro defaults might disagree.

Go to `project-structure.md` when the question is about where code should live at repo or feature level.

Go to `code-style.md` when the question is about imports, TypeScript shape, section order, exports, or formatter posture.

## Working rule

This directory is canonical for foundation-level doctrine. It should explain the stable rules directly instead of routing readers back to legacy guide pages.
