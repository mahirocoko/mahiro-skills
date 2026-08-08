---
name: cocoindex-rules-init
description: Project-local CocoIndex Code rule bootstrapper. Use when a repo needs AGENTS.md guidance for semantic codebase search, secret-safe index preflight, visible project exclusion materialization, repo exploration, and ccc index maintenance.
user-invocable: true
---

# /cocoindex-rules-init - Bootstrap CocoIndex Rules

Create or refine a repo-local `AGENTS.md` so agents consistently prefer CocoIndex Code for broad codebase search and repo exploration without indexing secret-bearing files by accident. This skill is for instruction bootstrapping, not MCP installation. It teaches the target repo when to use `cocoindex-code` MCP `search`, when to fall back to `ccc`, when exact-match tools like `rg` still win, and how to fail closed before broad indexing. The desired behavior is token-saving and secret-safe: semantic search narrows the repo, then agents read only the specific files or ranges needed for verification or edits.

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
- Add a fail-closed preflight rule for `ccc init`, `ccc index`, `ccc search --refresh`, and equivalent MCP indexing: inspect filenames and effective ignore/filter rules without opening suspected secret contents, then index only after exclusions are verified.
- Require the effective deny policy to be materialized into project `.cocoindex_code/settings.yml` after initialization and policy changes, while retaining the global matcher as the non-bypassable boundary.
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
- filenames and existing ignore/filter configuration that can prove whether service-account JSON, credentials, dotenv files, private keys, token stores, or other suspected secret-bearing artifacts are excluded; inspect names and rules only, not suspected secret contents

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
11. Require a filename-only and ignore/filter preflight before any broad repository index or refresh. Never open suspected secret files merely to decide whether they are safe to index.
12. Never chain `ccc init && ccc index`: initialization may create broad default include patterns, so inspect the generated settings and effective matcher before the first index.
13. After initialization and every global-policy change, materialize the current effective deny patterns into project `.cocoindex_code/settings.yml` before doctor/index. A passing hidden matcher alone is not a complete or transparent project configuration.
14. Fail closed when service-account JSON, credential files, dotenv files, private keys, token stores, or unexplained structured-data files are present or not conclusively excluded. Add and verify explicit exclusions before indexing.
15. State that a local embedding backend does not make unintended secret reads acceptable. Local transport changes exposure, not read authorization.
16. After exclusion policy changes, reset or safely rebuild stale indexes before relying on search results that may still contain previously indexed content.

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
- Before `ccc init`, `ccc index`, `ccc search --refresh`, or equivalent MCP indexing, inspect filenames and effective ignore/filter rules without opening suspected secret contents. Never chain `ccc init && ccc index` before that check.
- After initialization or a global-policy change, materialize the current effective deny patterns into project `.cocoindex_code/settings.yml` before doctor/index. Keep the global matcher as the hard boundary rather than trusting the project mirror alone.
- If credential, service-account, dotenv, private-key, token-store, or unexplained structured-data files are present or not conclusively excluded, stop and configure verified exclusions first. A local embedding backend does not make unintended secret reads acceptable.
- After exclusion-policy changes, reset or safely rebuild stale indexes before relying on semantic results that may retain previously indexed content.
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
- Do not run an index or refresh merely to test whether secret-bearing files are excluded. Prove the path rules first using filename-only inventory, config inspection, and a matcher/doctor preview that does not open candidate contents.
- Do not call the project safe merely because an invisible matcher passes. Require the effective deny patterns to be visible in project `settings.yml` before indexing.
- If CocoIndex availability is unclear, write conditional language such as `when available` rather than inventing certainty.

## Stop Gates

- Stop and ask if the target repo has multiple conflicting instruction systems and the winner is unclear.
- Stop and ask if the repo already has explicit semantic-search rules and the human has not said whether to replace or merge them.
- Stop before indexing when suspected secret-bearing files are present, when generated default settings remain broad, or when effective exclusions cannot be verified without reading candidate contents.
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
- Confirm the final rules prohibit `ccc init && ccc index` before a filename-only secret/exclusion preflight.
- Confirm the final rules materialize effective deny patterns into project `.cocoindex_code/settings.yml` while preserving the global matcher as the hard boundary.
- Confirm local embeddings are not presented as permission to index secrets and stale indexes are handled after policy changes.
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
