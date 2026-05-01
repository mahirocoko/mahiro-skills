# TUI session example

The TUI is the safest default when you want to browse agents, scopes, and install targets before writing files.

The home menu also includes `Update installed`, which refreshes every non-empty receipt-recorded install automatically. It does not ask for agent, scope, or item choices.

## Launch

```bash
bun ./src/cli.ts
```

Equivalent explicit command:

```bash
bun ./src/cli.ts tui
```

## Update installed walkthrough

```text
Home
  → Update installed
Install preview
  → review each receipt-recorded update plan
Proceed with update?
  → yes
```

## Plan-only walkthrough

```text
Home
  → Plan (dry run)
Agents
  → All agents (opencode, claude-code, cursor, gemini, codex)
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
