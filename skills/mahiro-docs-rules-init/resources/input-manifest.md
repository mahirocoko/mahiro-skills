# Input Manifest

Inspect these facts before writing any file.

Every item below refers to the target repo being initialized, not the repo that happens to package this skill.

## Repo Identity

- repo name
- app or product name
- short purpose
- workspace shape: single app, multi-app repo, package workspace, or other
- app source root: `src/`, `app/`, `apps/*/src`, or other
- route root: `src/app`, `app/routes.ts`, `app/routes`, `src/routes`, `src/pages`, or no routing yet

## Toolchain

- package manager
- framework and runtime
- router model and app directory shape
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
- section comment or divider posture, if any

### Frontend Ownership Chain

When frontend signals exist, inspect the real consumers and record the owners that the repo actually proves:

- primitive source and public import surface, including current APIs and variants
- token/theme definitions, recipes, and app-level CSS overrides
- nearest accepted consumer usages for the relevant control or surface
- generated or registry outputs and the source/generator that owns them
- caller layout versus primitive shell versus domain mapping responsibilities
- browser/server runtime boundaries when the app mixes them, including helpers imported by browser routes
- existing verification scripts, what each can establish, and what was not executed during this init pass

For each material claim, retain a source path or consumer example that supports it. Folder names, imports, and semantic class names alone are not proof of resolved behavior. Map claimed classes to current rules; if owners compete, resolve them from source and consumers before writing a current-state rule. Mark unresolved ownership as partial instead of inventing another layer.

This is conditional inspection, not a requirement to add a design system. For a static page without tokens, variants, or generated outputs, omit those layers. Stay with bounded local reads and preserve the existing secret-path guard.

## State and Data Signals

- route ownership for data loading
- data access model, such as REST/API services or direct SDK calls
- server-state library
- client-state library
- API helpers or clients
- service-layer presence or absence
- hook-owned data access, especially for Supabase-direct repos

## Existing Doctrine Signals

- current `AGENTS.md`
- existing docs pages
- repeated structural or naming patterns in code
- route, data, state, i18n, and styling boundaries already repeated in the repo

## Developer Workflow

- install command
- dev command
- build command
- lint command
- typecheck command
- test commands

## Search and Agent Guidance

- which filename and exact-search commands work locally, such as `rg --files` and `rg <pattern>`
- whether existing `AGENTS.md` or docs already specify a different working search route that must be reconciled
- which credential, dotenv, private-key, provider, and token-store paths must not be opened during discovery
- whether generated guidance distinguishes exact-string coverage from source-level verification

## Topic Classification

For each topic the skill may document, classify it as:

- `implemented`
- `partial`
- `planned`
- `not established`

For data ownership topics, classify the dominant shape too, such as:

- `Next App Router + REST/API services`
- `React Router Framework + hook-owned Supabase-direct access`
- `mixed`
- `not established`

Use that classification to decide whether to create the file, soften the wording, or skip it.

## Cross-Repo Guard

If a candidate rule comes from another Mahiro repo, record it only as a question or preferred direction until the target repo proves it locally. Do not carry over package manager, formatter, i18n, service, state, primitive, commit, or testing mechanics from memory alone.
