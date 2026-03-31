# Input Manifest

Inspect these facts before writing any file.

Every item below refers to the target repo being initialized, not the repo that happens to package this skill.

## Repo Identity

- repo name
- app or product name
- short purpose
- monorepo or single app

## Toolchain

- package manager
- framework and runtime
- router model
- language
- lint, format, and test tools

## Top-Level Structure

- top-level folders
- app entry points
- shared packages or libraries
- existing `docs/`, `README.md`, and `AGENTS.md`

## UI and Frontend Signals

- styling system
- component library
- design-token usage
- i18n usage

## State and Data Signals

- server-state library
- client-state library
- route-level data loading
- API helpers or clients
- service-layer presence or absence

## Existing Doctrine Signals

- current `AGENTS.md`
- existing docs pages
- repeated structural or naming patterns in code

## Developer Workflow

- install command
- dev command
- build command
- lint command
- typecheck command
- test commands

## Topic Classification

For each topic the skill may document, classify it as:

- `implemented`
- `partial`
- `planned`
- `not established`

Use that classification to decide whether to create the file, soften the wording, or skip it.
