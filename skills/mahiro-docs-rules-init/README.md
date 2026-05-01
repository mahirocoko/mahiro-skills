# mahiro-docs-rules-init skill

`/mahiro-docs-rules-init` bootstraps a repo-local `AGENTS.md` plus an initial docs family.

This README describes the skill package itself; the generated docs are always written into the target repo being initialized.

It is for repos that are new, under-documented, or missing a trustworthy rules layer. The skill uses reference grammar for structure and tone, but it must stay anchored to the target repo's actual code, scripts, and folders.

Unlike a neutral docs initializer, this skill is allowed to carry Mahiro-style doctrine where appropriate, especially on blueprint-allowed pages. That doctrine must stay labeled as preferred direction, fallback, or adoption-trigger guidance unless the target repo proves it is already current reality.

## Reading order

- `SKILL.md`
- `resources/file-matrix.md`
- `resources/input-manifest.md`
- `resources/generation-rules.md`
- `resources/execution-flow.md`
- `resources/checklist.md`
- `resources/reference-mapping.md`
- `templates/`

## Core doctrine

When sources conflict, use this order:

1. local repo reality
2. existing local `AGENTS.md`
3. chosen reference grammar
4. portable fallback doctrine

The skill is strongest when it gives a repo an honest first structure without pretending the architecture is more mature than it is.

It is not a pure extractor, though. Some pages are intentionally allowed to carry blueprint energy so a new repo can inherit house style and preferred working shapes from day one. The key rule is not "remove all blueprint"; it is "never confuse blueprint with current fact."

## Role split with mahiro-style

- `/mahiro-docs-rules-init` writes repo-local truth: current folders, scripts, commands, established patterns, missing layers, and trustworthy starter docs.
- `/mahiro-style` supplies Mahiro's code/review/implementation doctrine as fallback taste: naming, ownership, extraction discipline, i18n, service/state boundaries, and anti-slop review checks.

Generated docs should use `Current Reality`, `Preferred Direction`, `Not Established Yet`, and `Adoption Triggers` so readers can tell repo fact from Mahiro preference.
