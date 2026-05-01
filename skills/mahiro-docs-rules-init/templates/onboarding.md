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

- Routing: [Next.js App Router / React Router Framework / no routing yet]
- Data access: [REST services / Supabase-direct hooks / route loaders/actions / none established]
- State: [TanStack Query / Zustand / Context / local state / none established]
- Styling: [token-first styling summary]
- i18n: [Lingui / react-i18next / none established]
- UI primitives: [where reusable UI lives]

If the repo is small, keep this snapshot narrow and honest. Do not force a service layer into a Supabase-direct repo, and do not hide a service layer in a REST repo if it already exists.

## 3) Where to Work

- New page or route: `[real path]`
- Global tokens or styles: `[real path]`
- Reusable UI primitives: `[real path]`
- Domain/module partials: `[real path if established]`
- Services or query owners: `[real path if established]`
- Hook-owned data access: `[real path if established]`

If the repo uses section comments or section dividers in long files, point new contributors to that pattern here as a shortcut, not as a rule.

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

If the repo leans on route-local or hook-owned data access, link those pages here before any service page.

## 5) Repo-Specific Rules

Use this section for short operational rules that matter on day one.

- Keep route files thin when the route already owns orchestration.
- Keep data access where the repo already puts it.
- Use section comments or dividers only when they genuinely help scan a long file.
- Keep copy, styling, and one-off constants with the owner unless reuse is real.

## 6) Suggested Reading Paths

### New engineer

- read `AGENTS.md`, then the core docs in order

### Domain or module work

- read structure, relevant pattern pages, and code-style pages before restructuring files

### Review work

- read `AGENTS.md`, `docs/best-practices.md`, and any topic page touched by the change
