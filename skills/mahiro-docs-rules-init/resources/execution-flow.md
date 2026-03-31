# Execution Flow

Use this flow for `init` mode.

## 1. Inspect Context

- read the target repo tree
- find `AGENTS.md`, `README.md`, `docs/`, and toolchain files
- detect framework, package manager, state, data, styling, and i18n signals
- do this with local target-repo tools only

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

## 8. Cross-Link The Set

- make `docs/onboarding.md` the main hub
- add links between overview, structure, commands, and topic pages

## 9. Run Self-Check

- verify every command against the target repo
- remove or soften overclaims
- check that no page is obvious filler
- verify the tone feels like one docs family
- verify no external-research assumptions leaked into the docs

## 10. Report Outcome

- list created files
- list skipped files and why
- note planned or not-yet-established layers honestly
