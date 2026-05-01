# Generation Rules

These rules control how the skill writes each page.

## Global Rules

- Use reference repos for grammar, not facts.
- Prefer source-faithful boilerplates over improvised document shapes.
- Keep current state separate from preferred direction.
- If a pattern is weak or incomplete, soften the wording.
- If a page would mostly be speculation, skip it.
- Commands must come from the repo, not from habit.
- Prefer repo-local doctrine over imported taste.
- Never promote Mahiro-style preference into `Current Reality` unless the target repo proves it.
- Put Mahiro-style fallback in `Preferred Direction`, `Not Established Yet`, `If Introduced Later`, or `Adoption Triggers`.
- Keep docs-init repo-reality-first even when the target repo is young. For data ownership, prefer service-forward wording in REST/API repos and hook-owned wording in Supabase-direct repos.
- Do not force a shared service layer into repos whose real pattern is route-local or hook-owned direct SDK access.
- Do not default to folder paths the target repo does not prove.

## Template Posture Rules

Not every page in this skill has the same job.

### Reality-First Pages

These pages must stay tightly anchored to the repo as it exists today:

- `AGENTS.md`
- `docs/project-overview.md`
- `docs/development-commands.md`
- `docs/file-organization.md`

Rules:

- lead with current repo reality
- use verified commands, folders, tools, and boundaries only
- if a layer is missing, say so directly
- keep future direction short and clearly labeled
- when the repo is Next App Router plus REST/API, let services and route orchestration read as the likely owner shape
- when the repo is React Router Framework plus Supabase-direct access, let hooks and route modules own the calls without forcing services

### Blueprint-Allowed Pages

These pages may carry more shaping doctrine and starter guidance, as long as they do not lie about current repo facts:

- `docs/code-style/formatting.md`
- `docs/code-style/typescript.md`
- `docs/code-style/imports.md`
- `docs/patterns/component-conventions.md`
- `docs/patterns/hooks-pattern.md`
- `docs/patterns/services-pattern.md`
- `docs/best-practices.md`

Rules:

- keep the page's blueprint shape when it helps bootstrap repo doctrine
- allow stronger preferred patterns and starter examples even if the repo is still early
- do not present blueprint guidance as if it is already enforced or fully established
- label observed behavior separately from suggested or preferred shape when both appear
- if the target repo is clearly aligned to a house style, preserve that guiding posture instead of flattening the page into pure observation
- if the target repo is silent or partial, use Mahiro-style as preferred direction, not as present-tense repo fact
- keep `AGENTS.md` reality-first, but allow clearly labeled practical guidance such as shortcuts, section comments, section dividers, boundary maps, and adoption triggers when those help the repo
- if the repo uses Lingui or a similar message-descriptor flow, encode the ownership doctrine explicitly: render-bound copy stays local, extracted user-facing config uses translation-safe messages such as `msg`, and translation happens at the render boundary
- do not recommend shared UI, variant helpers, or extracted styling layers from repetition alone; require repeated cross-owner need plus a clearly domain-neutral boundary

## Boilerplate Rule

- Start from the closest template under `templates/`.
- Preserve canonical section order unless the target repo has a strong local reason to differ.
- Replace repo facts, commands, paths, and stack-specific examples.
- Remove sections that do not fit the target repo instead of collapsing the page into a generic summary.
- Keep the final page reading like a sibling of the reference docs family, not like a newly invented outline.

## React-First Rule

- For React repos, prefer the React-shaped boilerplates in this skill over neutral framework language.
- Keep examples grounded in real React patterns: component props, hooks, route files, query hooks, direct SDK hooks, service modules, Zustand selectors, and client-side i18n where applicable.
- If the repo is React but the current codebase is still small, keep the React grammar and trim sections rather than replacing the page with a generic summary.

## High-Risk Pages

- `docs/commit-guide.md` must not invent enforced conventions from thin air. If there is no `.git` history, no commitlint, and no hook config, keep the guide explicitly conservative and say it reflects a suggested local baseline rather than observed enforced policy.
- `docs/development-commands.md` should mirror the reference grammar closely: prefer `Quick Start`, `Building`, `Linting & Formatting`, `Type Checking`, `Internationalization`, `Dependency Management`, and `Verification Cadence` when they fit the repo.
- `docs/i18n-guidelines.md` must not encourage extracting user-facing copy into plain-string constants. For Lingui-style repos, it should distinguish message descriptors such as `msg` from translation at render via `t(...)`, `i18n._(...)`, or `<Trans>`.
- `docs/patterns/services-pattern.md` should keep the service-doc shape when a service layer exists or the repo is REST/API service-forward; for Supabase-direct or hook-owned data repos, keep the page small or skip it instead of inventing services.
- `docs/patterns/hooks-pattern.md` should make hook-owned data access explicit when the repo is React Router Framework or Supabase-direct, and should not imply services are mandatory there.
- `docs/best-practices.md` must stay conservative about shared abstractions. Repetition by itself is not enough; prefer owner-local composition until a cross-owner, domain-neutral boundary is visible.
- `docs/code-style/formatting.md` may intentionally establish a stronger formatting blueprint for the repo or house style, but any actual commands or enforced config still need to be verified locally.

## Reality Labels

Use these labels as needed inside pages:

- `Current Reality`
- `Preferred Direction`
- `Not Established Yet`
- `If Introduced Later` or `Adoption Triggers`

Use `Current Reality` only for claims proven by the target repo. Use the other labels for reference grammar, Mahiro-style fallback, and future-facing guidance.

## Hard Do-Not Rules

- do not guess commands
- do not invent current architecture
- do not copy reference repo facts into the target repo
- do not over-document future plans as if they are current behavior
- do not use `grep_app_searchGitHub`, `context7_*`, `webfetch`, `websearch_*`, or subagents for this skill
- do not run `pnpm dev`, `npm run dev`, `vite`, or other long-running local servers
- do not use `sg`
- do not replace template grammar with a new improvised summary format
- do not state that a repo uses Mahiro-style service, store, i18n, or route boundaries unless local evidence proves it
- do not treat section comments or section dividers as mandatory everywhere; they are a pattern, not a law
