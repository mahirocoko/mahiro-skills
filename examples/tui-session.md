# TUI session example

The full-screen Skill Manager is the safest default when you want to inspect a catalog and receipt-backed multi-agent plan before changing files.

## Launch

```bash
bun ./src/cli.ts
```

Equivalent explicit command:

```bash
bun ./src/cli.ts tui
```

An interactive terminal at least `72x18` opens the alternate-screen manager. Smaller terminals and `TERM=dumb` use the guided compatibility flow after one concise size message. CLI `--agent` values, scope, and item arguments remain preselected when the full-screen manager opens.

## Core flow

```text
Target → Action → Skills → Review → Result
```

### Target

The first row is **All agents** and is exclusive. Selecting an individual changes the selection to Custom; Custom can contain one or more of `opencode`, `claude-code`, `cursor`, `gemini`, `codex`, and `letta-code`. Scope defaults to `global`; choose `local` explicitly when the batch should target the current project.

```text
↑/↓     focus an agent or scope radio
Space   select/toggle
Enter   continue to Action
Esc     exit
```

### Action

Choose **Install**, **Update**, **Uninstall**, or **Inspect**. Each option describes its behavior in plain language. Inspect is read-only and branches from Skills detail without Review or Result.

```text
↑/↓     focus an action
Enter   continue to Skills
Esc     return to Target
```

### Skills

Rows are derived across all selected agent snapshots. Coverage and state counts stay visible when agents differ. Install disables names already recorded everywhere and skips receipt-installed agents; Update offers only selected outdated, missing, modified, or legacy catalog names; Uninstall uses the union of receipt-recorded names; Inspect also shows receipt-only names. Letta Code detail explicitly reports skills-only command behavior.

The first row is **Select all eligible**. `Space` toggles every actionable skill currently visible after filtering; disabled/no-op rows are never selected by the batch toggle.

```text
↑/↓     focus a row
Space   select/toggle an enabled row
Enter   open Review, or Inspect detail
Esc     clear a query first, then return to Action
```

Optional search starts with `/`; it is not required for navigation.

### Review

Review is a full scrollable screen, not a modal. It shows selected agents, scope, item names, each adapter root, exact source/target or remove paths, actions, skips, warnings, unreadable-receipt blocks, and the sequential execution/no whole-batch rollback rule. Any unreadable selected-agent receipt blocks the whole batch until Target is corrected. Paths are hard-wrapped, never shortened.

Entering Review does not write. Use `Space` to check every required overwrite or modified/legacy replacement/removal acknowledgement. Enter runs only when all acknowledgements are checked. The manager replans immediately before execution and stays in Review if the safety shape changed.

### Result

Agents execute sequentially. After the first thrown failure, later agents are **Not attempted**. Result keeps per-agent success, skips, errors, and receipt evidence and reports **Completed**, **Completed with skips**, **Partially completed**, **Failed**, or **No changes**.

```text
↑/↓     scroll
Enter   return to Action
Esc     change Targets
Ctrl+C  exit
```

## Status meanings

- `current` — source and installed target still match the recorded hashes.
- `outdated` — packaged source changed while the installed target still matches its recorded hash.
- `modified` — installed content drifted from its recorded hash.
- `missing` — a receipt-recorded target no longer exists.
- `legacy` — an older receipt has no hash evidence.
- `unknown` — the receipt could not be read; the affected agent is blocked for writes.

The original prompt-by-prompt flow remains available:

```bash
bun ./src/cli.ts guided
bun ./src/cli.ts guided --mode update --yes
```

Explicit `tui --mode ...` calls share that compatibility path so scripts and single-pass workflows keep their existing behavior.
