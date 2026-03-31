# Project Overview

## Tech Stack

- **App / Runtime**: [React app shape, such as React Router SPA, Next.js app, or Vite React app]
- **UI**: [React version + TypeScript posture]
- **Styling**: [TailwindCSS / CSS Modules / plain CSS / design-system primitives]
- **State**: [TanStack Query + Zustand / local state / repo-specific mix]
- **i18n**: [Lingui / react-i18next / none established]
- **Tooling**: [Vite + Biome / Next.js + Biome / other verified toolchain]

Keep this section factual and compact. Do not imply layers that the repo has not established yet.

## Runtime

- **Package Manager**: `[verified package manager and version if known]`
- **TypeScript**: `[verified version if known]`
- **React**: `[verified version if known]`

Only include versions that can be verified locally.

## Key Libraries

- **UI primitives**: `[verified library or local primitives note]`
- **i18n**: `[verified i18n packages]`
- **Icons**: `[verified icon library]`
- **Class utilities**: `[cn helpers, clsx, tailwind-merge, or equivalent]`
- **Build plugins**: `[verified Vite/Next plugins if useful]`
- **Forms**: `[react-hook-form, valibot, zod, or remove if not relevant]`
- **HTTP / Data layer**: `[native fetch, service wrapper, query layer, or remove if not relevant]`

Remove bullets that are not relevant instead of leaving a full generic inventory.

## Project Structure

Show only the folders and config files that help explain how this repo is put together. Prefer the smallest truthful tree.

```text
[repo-root]/
├── [app root or package root]   # [short ownership note]
├── docs/                        # Repo documentation
├── AGENTS.md                    # Repo policy and engineering rules
├── README.md                    # Repo overview and quick commands
└── [important config files]     # [what they control]
```

## Package Dependencies

- [Document alias mapping, workspace dependency rules, or key package-boundary rules]
- [Call out where query setup, i18n setup, route config, or app providers live]

If the repo is a single-package starter, keep this section short. Do not inflate it into monorepo or architecture language.

Prefer concrete statements such as:

- `package.json` defines one app package
- `src/main.tsx` is the current mount boundary
- no provider tree is established yet

## Current Status

- [Short bullets for what is already established today]
- [Short bullets for what is still missing or intentionally small]

Favor "what exists" and "what is not established yet" over aspirational roadmap language.

## Writing Rules

- Do not describe starter defaults as if they were mature architecture.
- Do not over-emphasize local tooling or generated docs unless they materially shape development.
- If the repo is intentionally small, let the page stay small.
- Prefer verified specifics over broad category coverage.
