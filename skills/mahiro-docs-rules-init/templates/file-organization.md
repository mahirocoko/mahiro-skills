# File Organization

## Project Structure

Show only the top-level folders and files that materially help someone place or review code. Do not include local tooling folders unless they are part of everyday engineering work in this repo.

```text
[repo-root]/
├── [top-level directory]        # [responsibility]
├── [top-level directory]        # [responsibility]
├── docs/                        # Repo documentation
├── AGENTS.md                    # Repo policy and engineering rules
├── README.md                    # Repo overview and quick commands
└── [important config files]     # [what they control]
```

## App Directory Structure

Mirror the real app shape first. If the app is still small, keep this tree small too.

```text
[app-root]/
├── [entry files]
├── [current folder]             # [real responsibility]
└── [current folder]             # [real responsibility]
```

Do not pre-fill future folders unless they already exist in the repo.

## Route Structure

[Document the real route system here.]

Use the repo's actual routing model:

- Next App Router, if present, should mention `app/` or `src/app/` as route segments, layouts, loading states, server actions, and route handlers.
- If a Next repo also has `pages/api` or `src/pages/api`, document it separately as the transport boundary or backend proxy layer.
- React Router Framework, if present, should mention `app/routes.ts`, `app/routes/`, `routes/`, or `src/routes/` as route discovery and route modules. Include loaders/actions only when the repo actually uses them.

If the repo has no route system yet, say so directly and stop there. Do not sketch an imagined future route tree in this section.

## Data Ownership Structure

[Document the real data ownership model here.]

- REST or API repos can document service modules, API clients, or request wrappers when those layers already exist.
- Supabase-direct repos can document hook-owned data access or route-owned fetch logic when that is the local pattern.
- Do not invent a `services/` folder if the repo's stable shape is direct SDK access from hooks or routes.

## File Naming Conventions

### Routes

- [route naming rule]
- If routes are not established yet, say `Not Established Yet.`

### Components

- [component file naming rule]

### Domain or Module Partials

- [domain/module grouping rule, if the repo already uses one]
- If no partial layer exists yet, say so explicitly instead of describing a preferred future pattern as current fact.

### Hooks

- [hook naming rule]
- If hooks are not established yet, say `Not Established Yet; use standard useX naming if introduced later.`

If hooks own data access in this repo, say that directly and note whether they call REST services, Supabase, or another SDK.

### Services

- [service folder or file naming rule]
- If there is no service layer, say that directly.
- If the repo is Supabase-direct and hooks own the calls, say that instead of forcing a service layer.

### Stores

- [store folder or file naming rule]
- If there is no shared state layer, say that directly.

### Types

- [type file naming rule]

### Constants

- [constant naming rule]

### Enums

- [enum naming rule]
- Omit this subsection entirely if the repo does not use enums or has no naming posture for them yet.

### Utilities

- [utility naming rule]
- If no utility layer exists yet, say that directly.

## Component Organization

Only include this section when the repo already has a meaningful component layer or when a tiny "introduced later" note would genuinely help contributors.

```text
[components-root]/
├── [domain or module area]      # [owner-specific partials]
├── layouts/                     # [layout composition]
└── ui/                          # [shared UI primitives]
```

## Hook Organization

If hooks do not exist yet, prefer a one-line note over a speculative tree.

```text
[hooks-root]/
└── [example hook or grouping]   # [ownership note]
```

## Service Organization

If services do not exist yet, prefer a one-line note over a future `services/` scaffold.

If the repo is Next App Router plus REST/API, service folders or service-like helpers may be the right place to show. If the repo is React Router Framework plus Supabase-direct, a hook-owned data tree may be more truthful than a service tree.

```text
[services-root]/
├── [base file or entry file]
├── [domain folder]/
│   ├── index.ts
│   └── utils.ts
└── ...
```

## Placement Rules

- Keep logic with its real owner until reuse is proven.
- Extract shared abstractions only after multi-consumer pressure appears.
- Keep owner-specific UI out of shared `ui/` layers until reuse is real.
- Add folders because they clarify ownership, not because a template implies they should exist.
- Prefer the smallest truthful tree over a polished but fictional architecture map.
- Never assume a folder belongs in the docs unless the repo already uses it.
