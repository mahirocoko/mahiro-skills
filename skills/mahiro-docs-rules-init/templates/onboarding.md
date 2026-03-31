# [Repo / App Name] Onboarding

This is the practical onboarding guide for day-to-day work.

Use `AGENTS.md` as the full policy source, and this file as the quick map.

## 1) Start Here

```bash
[verified install command]
[verified dev command]
```

Task checks:

```bash
[verified lint command]
[verified format command if available]
[verified typecheck command if available]
```

Build before release, routing/build changes, or PRs that affect production behavior:

```bash
[verified build command]
```

Preview the built app locally:

```bash
[verified preview or start command]
```

## 2) Architecture Snapshot

- Routing: [React Router / Next.js app router / no routing yet]
- State: [server-state layer] + [client-state layer]
- Styling: [token-first styling summary]
- i18n: [Lingui / react-i18next / none established]
- UI primitives: [where reusable UI lives]

## 3) Where to Work

- New page or route: `[real path]`
- Global tokens or styles: `[real path]`
- Reusable UI primitives: `[real path]`
- Feature partials: `[real path if established]`
- Services or query owners: `[real path if established]`

## 4) Docs Map

### Core

- `AGENTS.md`
- `docs/project-overview.md`
- `docs/development-commands.md`
- `docs/file-organization.md`
- `docs/best-practices.md`
- `docs/commit-guide.md`

### Patterns and Code Style

- list only the generated pages that actually exist

### Specialized Topics

- styling
- i18n
- API and data

## 5) Repo-Specific Rules

Use this section for short operational rules that matter on day one.

## 6) Suggested Reading Paths

### New engineer

- read `AGENTS.md`, then the core docs in order

### Feature work

- read structure, relevant pattern pages, and code-style pages before restructuring files

### Review work

- read `AGENTS.md`, `docs/best-practices.md`, and any topic page touched by the change
