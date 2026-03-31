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

Do not pre-fill future folders such as `routes/`, `components/`, `hooks/`, or `services/` unless they already exist in the repo.

## Route Structure

[Document the real route system here.]

If the repo has no route system yet, say so directly and stop there. Do not sketch an imagined future route tree in this section.

## File Naming Conventions

### Routes

- [route naming rule]
- If routes are not established yet, say `Not established yet.`

### Components

- [component file naming rule]

### Feature Partials

- [feature-folder grouping rule]
- If no partial layer exists yet, say so explicitly instead of describing a preferred future pattern as current fact.

### Hooks

- [hook naming rule]
- If hooks are not established yet, say `Not established yet; use standard useX naming if introduced later.`

### Services

- [service folder or file naming rule]
- If there is no service layer, say that directly.

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
├── [feature area]               # [feature-specific partials]
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
- Keep feature-specific UI out of shared `ui/` layers until reuse is real.
- Add folders because they clarify ownership, not because a template implies they should exist.
- Prefer the smallest truthful tree over a polished but fictional architecture map.
