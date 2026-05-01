---
name: mahiro-docs-rules-init
description: Repo-reality-first AGENTS.md and docs-family bootstrapper. Uses reference grammar for shape and layers Mahiro-style only as preferred direction or fallback when the target repo is silent, partial, or ambiguous.
user-invocable: true
---

# /mahiro-docs-rules-init - Bootstrap Docs and Rules

Create an initial `AGENTS.md` plus a coherent docs family for a repo that has no docs, weak docs, or scattered rules. This is repo-reality-first documentation generation, not a style override. The hub stays thin on purpose. Use the resource pages and templates instead of duplicating their guidance here.

Terminology note: this skill may be packaged in one repo, but it always inspects and writes docs for the target repo you are currently working on.

## When to Use

- Initializing docs for a new repo
- Adding `AGENTS.md` to a repo that only has `README.md`
- Creating a first-pass docs family for a repo with weak or inconsistent docs
- Rebuilding docs from a known reference grammar while keeping the target repo honest

## Relationship to `/mahiro-style`

`mahiro-docs-rules-init` records what the target repo actually is. `/mahiro-style` supplies Mahiro's implementation and review doctrine when the repo is silent, partial, or drifting.

Use this split in generated docs:

- `Current Reality` - repo-proven code, config, scripts, docs, and repeated patterns
- `Preferred Direction` - Mahiro-style fallback or house direction for new work
- `Not Established Yet` - a layer, convention, or workflow the repo has not earned
- `Adoption Triggers` - the conditions that justify introducing a preferred shape later

Never promote Mahiro-style preference into `Current Reality` unless the target repo proves it.

## V1 Scope

This version supports `init` only.

It creates a new docs-and-rules baseline. It does not try to fully reconcile, migrate, or rewrite an already mature docs system.

## Resource Map

- `resources/file-matrix.md` - which files to always create, conditionally create, or skip
- `resources/input-manifest.md` - which repo facts to inspect before writing
- `resources/generation-rules.md` - global and per-file writing rules
- `resources/execution-flow.md` - end-to-end init flow
- `resources/checklist.md` - self-check before declaring the pass done
- `resources/reference-mapping.md` - how reference grammar maps to output files

## Template Map

- `templates/AGENTS.md`
- `templates/onboarding.md`
- `templates/project-overview.md`
- `templates/development-commands.md`
- `templates/file-organization.md`
- `templates/best-practices.md`
- `templates/commit-guide.md`
- `templates/styling.md`
- `templates/i18n-guidelines.md`
- `templates/api-data-fetching.md`
- `templates/code-style/*.md`
- `templates/patterns/*.md`

These templates are intended to be source-faithful boilerplates, not abstract outlines. Keep the original document grammar when adapting them: heading order, section names, example density, and overall writing shape should stay close to the chosen reference unless the target repo gives a strong reason to diverge.

## What This Skill Must Inspect First

Before writing anything, inspect these inputs:

- top-level repo tree
- `AGENTS.md`, `README.md`, and existing `docs/` if present
- `package.json`, workspace config, and script/task runner files
- framework, router, styling, i18n, state, and data-fetching signals
- existing code structure, naming, and boundary patterns

Do not generate files from template assumptions alone.

## Hard Execution Limits

This skill is a local boilerplate generator, not a research task.

- Stay inside the target repo only.
- Do not use web search, GitHub search, Context7, subagents, or any external documentation lookup.
- Do not use unsupported local commands such as `sg`.
- Do not run the dev server, preview server, or long-running app processes.
- Do not do broad exploratory loops once the repo shape is clear.
- After local inspection of the target repo and topic classification, start writing files immediately.

If the repo is small but already proves the stack, write the docs from the local evidence plus the templates. Do not keep searching for more examples.

## Priority Order

When sources conflict, use this winner order:

1. Local repo reality
2. Existing local `AGENTS.md`
3. Chosen reference grammar
4. Portable fallback doctrine, including Mahiro-style

Explicit beats implicit. Repeated repo patterns beat isolated examples. If confidence is low, soften the wording instead of inventing certainty.

Mahiro-style can shape `Preferred Direction`, blueprint-allowed examples, and adoption triggers. It cannot override local repo reality.

## Output Contract

The skill should aim to create these files. See `resources/file-matrix.md` for the detailed create-vs-skip rules.

### Always Create

- `AGENTS.md`
- `docs/onboarding.md`
- `docs/project-overview.md`
- `docs/development-commands.md`
- `docs/file-organization.md`
- `docs/best-practices.md`
- `docs/commit-guide.md`

### Create When Signals Exist

- `docs/styling.md`
- `docs/i18n-guidelines.md`
- `docs/api-data-fetching.md`
- `docs/code-style/typescript.md`
- `docs/code-style/imports.md`
- `docs/code-style/formatting.md`
- `docs/patterns/component-conventions.md`
- `docs/patterns/hooks-pattern.md`
- `docs/patterns/services-pattern.md`
- `docs/patterns/state-management.md`

### Do Not Auto-Create In V1

- roadmap or product strategy docs
- domain-specific business docs that require human product context
- deployment or infrastructure docs unless the repo already establishes them clearly
- filler pattern pages with no codebase evidence

## Quality Bar

- No invented architecture
- No guessed commands
- No reference-repo leakage as if it were target-repo fact
- No docs that feel like generic AI filler
- One consistent docs-family voice across files
- Template grammar should be mirrored closely for the final docs shape
- Mahiro-style fallback must be labeled as preferred or future-facing unless the repo proves it is current

Use `resources/checklist.md` for the full self-check.

## Anti-Patterns

- Copying a reference doc and only swapping names
- Writing services, state, or i18n rules with no repo evidence
- Treating a half-migrated snapshot as stronger than explicit local doctrine
- Generating every possible docs page just because the template has them
- Hiding uncertainty instead of marking a pattern as partial or not established
- Using Mahiro-style to overwrite target-repo reality instead of documenting the local winner first

## Recommended Working Posture

Treat this skill as a bootstrap initializer, not a fiction generator. The goal is to give the repo a trustworthy first docs-and-rules layer that future work can refine.

## Example Invocation

```text
/mahiro-docs-rules-init
/mahiro-docs-rules-init "initialize docs and AGENTS for this repo from our reference grammar"
/mahiro-docs-rules-init "bootstrap a docs family for this React app and keep it honest to current code"
```

## Future Expansion

Potential future modes:

- `sync` - update an existing docs family to match current code
- `audit` - inspect docs coverage and report gaps without generating files

These are not part of the v1 contract.

ARGUMENTS: $ARGUMENTS
