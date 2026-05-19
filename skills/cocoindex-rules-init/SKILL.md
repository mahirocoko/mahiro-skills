---
name: cocoindex-rules-init
description: Mahiro Skill | Project-local CocoIndex Code rule bootstrapper. Use when a repo needs AGENTS.md guidance that makes agents prefer cocoindex-code / ccc for semantic codebase search, repo exploration, and index maintenance.
user-invocable: true
---

# /cocoindex-rules-init - Bootstrap CocoIndex Rules

Create or refine a repo-local `AGENTS.md` so agents consistently prefer CocoIndex Code for broad codebase search and repo exploration. This skill is for instruction bootstrapping, not MCP installation. It teaches the target repo when to use `cocoindex-code` MCP `search`, when to fall back to `ccc`, and when exact-match tools like `rg` still win. The desired behavior is token-saving: use semantic search to avoid broad blind reads, then read only the specific files or ranges needed for verification or edits.

## When to Use

- A repo already has CocoIndex Code available, but agents do not reliably choose it.
- A repo needs `AGENTS.md` guidance for semantic code search and index freshness.
- You want reusable repo-local rules that survive across sessions and agents.
- You want a lighter-weight initializer than `/mahiro-docs-rules-init`, focused only on code-search behavior.

## Scope and Boundaries

### In scope

- Inspect the target repo's current instruction surface.
- Create or surgically update repo-local `AGENTS.md`.
- Add a high-signal rule block that explains when to use `cocoindex-code` MCP `search`, when to use `ccc search` / `ccc index`, and when to keep using `rg` or AST tools.
- Add a high-signal rule block that explains the normal token-saving workflow: semantic search narrows the search space, then agents read only the matched files or ranges needed for full context before editing or making strong claims.
- Preserve existing local doctrine and merge the CocoIndex rules into it.

### Out of scope

- Installing `ccc`, CocoIndex Code, or an MCP server.
- Rewriting the repo's whole docs family.
- Broad style or architecture doctrine unrelated to code-search behavior.
- Global user rules such as `~/.config/opencode/AGENTS.md` unless the human explicitly asks.

## V1 Scope

This version supports `init` behavior only.

The skill should default to a repo-local `AGENTS.md` update. Do not create extra docs pages unless the target repo already uses an instruction-file pattern that clearly calls for one.

## What This Skill Must Inspect First

Before writing anything, inspect these local inputs in the target repo:

- `AGENTS.md`, `CLAUDE.md`, and any existing repo-local instruction files
- `opencode.json` or `.opencode/opencode.json` if present
- `README.md` and existing `docs/` only when they affect instruction shape
- evidence that CocoIndex is already in use, such as `ccc`, `cocoindex-code`, or MCP config

Do not write from template assumptions alone.

## Priority Order

When sources conflict, use this order:

1. Local repo reality
2. Existing local `AGENTS.md` or equivalent instruction files
3. This skill's CocoIndex rule template

Do not overwrite repo-local rules that already establish a code-search workflow unless the human explicitly asks to replace them.

## Required Rule Content

When you write or patch `AGENTS.md`, ensure the final repo-local rules encode all of the following:

1. Prefer `cocoindex-code` MCP `search` for semantic codebase search, broad repo exploration, fuzzy implementation lookup, and unfamiliar-module investigation.
2. Fall back to `ccc search` and `ccc index` when the MCP tool is unavailable but the CLI exists.
3. Keep `rg` for exact text, symbol, filename, and regex search.
4. Keep AST tools for syntax-shaped or structure-aware search.
5. State that semantic search is the token-saving first pass: it should prevent broad, blind source reads by narrowing the search space to candidate files and line ranges.
6. State that semantic search does **not** replace final source verification: after `ccc search` returns paths and line ranges, read only the relevant file/range with the available file-read tool or `sed -n` before editing or making strong claims.
7. State that exact known paths/symbols can go directly to `Read`, `rg`, or AST-aware tools; do not force CocoIndex for tiny known-file lookups.
8. Mention that `ccc search` scopes to the current working directory by default; run from repo root or pass `--path` when the intended scope is broader or narrower.
9. Mention both English and Thai trigger examples where helpful, such as:
   - `search the codebase`
   - `find where X is implemented`
   - `how does this repo work`
   - `ดู repo หน่อย`
   - `หาโค้ดส่วนนี้`
   - `สรุปไฟล์นี้`
10. Include an index-freshness rule: after meaningful code changes, prefer refreshing or re-indexing before relying on stale semantic results.

## Write Strategy

### If `AGENTS.md` does not exist

Create a concise file with:

- the repo's existing top-level rules if they can be inferred safely from local evidence
- a dedicated `Codebase Search` section for CocoIndex usage

### If `AGENTS.md` already exists

Patch it surgically.

- Preserve local headings and tone.
- Add a new `Codebase Search` section or merge into the closest existing section.
- Do not duplicate the same rule in multiple sections.
- Do not bloat the file with long CocoIndex tutorials.

## Suggested Rule Shape

Use a compact block close to this shape, adapted to the target repo's wording:

```md
## Codebase Search

- Prefer `cocoindex-code` MCP `search` for semantic codebase search, broad repo exploration, fuzzy implementation lookup, and unfamiliar modules.
- If the MCP tool is unavailable, use `ccc search` for semantic search and `ccc index` or `ccc search --refresh` when the index may be stale.
- Use CocoIndex/ccc as a token-saving first pass: avoid broad blind reads by letting semantic search narrow the repo to candidate files and line ranges.
- Run semantic search from the repo root, or pass `--path`, because `ccc search` defaults to the current working directory scope.
- Treat semantic results as candidate locations: read only the returned file/ranges needed for verification with the available file-read tool or `sed -n` before editing or making strong claims.
- Use `rg` for exact text, regex, symbol, and filename search.
- Use AST-aware search for syntax-shaped queries.
- Go directly to `Read`/`rg`/AST tools for known files, exact symbols, or tiny lookups; CocoIndex is a locator, not a replacement for source reads.
- Treat requests like `search the codebase`, `find where X is implemented`, `how does this repo work`, `ดู repo หน่อย`, and `หาโค้ดส่วนนี้` as CocoIndex-first triggers when available.
```

Do not copy this block blindly when the target repo already has stronger equivalent rules.

## Hard Execution Limits

- Stay inside the target repo only.
- Do not use web search or external docs to write repo-local rules.
- Do not install packages, modify user-global config, or add MCP servers unless the human explicitly asks.
- Do not claim CocoIndex is installed unless local evidence proves it.
- If CocoIndex availability is unclear, write conditional language such as `when available` rather than inventing certainty.

## Stop Gates

- Stop and ask if the target repo has multiple conflicting instruction systems and the winner is unclear.
- Stop and ask if the repo already has explicit semantic-search rules and the human has not said whether to replace or merge them.
- Soften or label assumptions instead of inventing setup facts.

## Output Contract

Before finishing, provide:

1. What file(s) were changed
2. Which local evidence was used
3. The final CocoIndex behavior encoded into the repo rules
4. Any unresolved limitation, such as missing `ccc` / MCP setup

## Validation / Self-check

Before declaring done:

- Confirm the repo-local instruction file exists at the intended path.
- Confirm the final wording distinguishes semantic search from exact-match search.
- Confirm the final wording frames CocoIndex/ccc as a token-saving first pass, not extra ceremony before every source read.
- Confirm the final wording makes the targeted search → targeted read/verify loop explicit.
- Confirm scope behavior is covered if the rule mentions `ccc search` directly: repo root or `--path` for intended search scope.
- Confirm no claim assumes CocoIndex is installed unless a local file proves it.
- Confirm the new rules are concise and not a generic tutorial dump.
- Confirm existing repo-local doctrine was preserved unless the human asked for replacement.

## Example Invocation

```text
/cocoindex-rules-init
/cocoindex-rules-init "add repo-local rules so agents prefer ccc / cocoindex-code for codebase search"
/cocoindex-rules-init "patch AGENTS.md with CocoIndex-first search guidance for this repo"
```

ARGUMENTS: $ARGUMENTS
