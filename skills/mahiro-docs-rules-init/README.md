# mahiro-docs-rules-init skill

`/mahiro-docs-rules-init` bootstraps a repo-local `AGENTS.md` plus an initial docs family.

This README describes the skill package itself; the generated docs are always written into the target repo being initialized.

It is for repos that are new, under-documented, or missing a trustworthy rules layer. The skill uses reference grammar for structure and tone, but it must stay anchored to the target repo's actual code, scripts, and folders.

Unlike a neutral docs initializer, this skill is allowed to carry Mahiro-style doctrine where appropriate, especially on blueprint-allowed pages.

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
