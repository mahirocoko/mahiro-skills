# File Matrix

Use this page to decide which files the skill should create in `init` mode.

## Create States

- `create` - strong repo signals; write the page normally
- `create with soft wording` - partial or uneven signals; mark current vs preferred clearly
- `skip` - weak or no signals; avoid filler

## Always Create

- `AGENTS.md`
- `docs/onboarding.md`
- `docs/project-overview.md`
- `docs/development-commands.md`
- `docs/file-organization.md`
- `docs/best-practices.md`
- `docs/commit-guide.md`

## Create When Signals Exist

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

## Skip In V1

- roadmap or strategy pages
- business-domain docs that need product context the repo does not prove
- deployment or infrastructure guides that are not already established
- test-strategy docs unless the repo already has a strong testing posture worth documenting
- pattern pages with no evidence in code or explicit repo doctrine
