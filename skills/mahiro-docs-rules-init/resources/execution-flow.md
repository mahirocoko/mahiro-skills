# Execution Flow

Use this flow for `init` mode.

## 1. Inspect Context

- read the target repo tree
- find `AGENTS.md`, `README.md`, `docs/`, and toolchain files
- detect framework, package manager, state, data, styling, and i18n signals
- do this with local target-repo tools only
- before any CocoIndex index or refresh, inventory filenames and effective ignore/filter rules without opening suspected secret contents
- never chain `ccc init && ccc index`; fail closed until service-account, credential, dotenv, key, token-store, and unexplained structured-data files are conclusively excluded
- materialize the effective deny patterns into project `.cocoindex_code/settings.yml` before doctor/index while retaining the global matcher as the hard boundary
- treat local embeddings as a transport boundary, not authorization to read secrets; after exclusion-policy changes, reset or safely rebuild stale indexes before semantic search

## 2. Read Local Truth

- read existing `AGENTS.md` first if present
- read existing docs hub or core docs if present
- note repeated target-repo patterns that should beat template assumptions

## 3. Select Reference Grammar

- choose the reference repo or docs family that provides the desired document grammar
- map reference pages to target output pages
- borrow section order, tone, and example style only

## 4. Classify Topics

For each topic, mark it as `implemented`, `partial`, `planned`, or `not established`.

Also classify the data ownership shape when it matters:

- Next App Router plus REST/API services
- React Router Framework plus hook-owned Supabase-direct access
- mixed
- not established

## 5. Build File Plan

For each possible output file, decide `create`, `create with soft wording`, or `skip`.

Stop exploring here. Once the file plan is clear, move to writing.

## 6. Generate Foundation Files First

- `AGENTS.md`
- `docs/onboarding.md`
- `docs/project-overview.md`
- `docs/development-commands.md`
- `docs/file-organization.md`

## 7. Generate Conditional Files

- code-style pages
- patterns pages
- styling page
- i18n page
- API/data page

Write from templates directly. Replace facts and trim sections. Do not invent a new page structure.

When the repo is Next App Router plus REST/API, let the generated docs lean service-forward. When the repo is React Router Framework plus Supabase-direct, let the generated docs lean hook-owned and keep service language soft unless a real shared layer exists.

## 8. Cross-Link The Set

- make `docs/onboarding.md` the main hub
- add links between overview, structure, commands, and topic pages

## 9. Run Self-Check

- verify every command against the target repo
- remove or soften overclaims
- check that no page is obvious filler
- verify the tone feels like one docs family
- verify no external-research assumptions leaked into the docs
- verify no unsupported folder-path example snuck in
- if CocoIndex guidance was generated, verify the filename-only preflight, unchecked-init/index prohibition, local-embedding boundary, and stale-index handling all remain explicit
- verify generated CocoIndex guidance requires visible project `settings.yml` denies and does not replace the global matcher boundary with project-only trust

## 10. Report Outcome

- list created files
- list skipped files and why
- note planned or not-yet-established layers honestly
