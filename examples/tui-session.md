# TUI session example

The TUI is the safest default when you want to browse agents, scopes, and install targets before writing files.

## Launch

```bash
bun ./src/cli.ts
```

Equivalent explicit command:

```bash
bun ./src/cli.ts tui
```

## Plan-only walkthrough

```text
Home
  → Plan (dry run)
Agents
  → All agents (opencode, claude-code, cursor, gemini)
Scope
  → local
Items
  → default bundle
Batch plan summary
  → review skill and command counts per agent
```

## Install walkthrough

```text
Home
  → Install
Agents
  → Choose specific agents…
Toggle agents
  → opencode
Scope
  → local
Items
  → select individual items
Choose items
  → project, recap
Install preview
  → review source -> target lines and [collision] markers
Proceed with install?
  → yes
```

## Inspect installed state

```text
Home
  → List installed
Agents
  → Choose specific agents…
Toggle agents
  → opencode
```

Use `Receipt detail` when you need exact installed paths, timestamps, and reconstructed targets.
