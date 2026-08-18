# mahiro-skills CLI Test Matrix v0

This document defines the acceptance matrix for implementing the v0 CLI.

## Fixture inventory

Use current repo assets as fixtures.

| Fixture | Type | Why it matters |
|--------|------|----------------|
| `skills/project/` | scripted skill | skill with scripts, templates, and docs |
| `skills/recap/` | skill with references | skill with helper TS files and references |
| `skills/watch/` | scripted skill | skill with scripts and local-state assumptions |
| `skills/gemini/extension/` | opaque heavy subtree | tests copy-only handling for partial-bundle assets |
| `commands/project.md` | command wrapper | tests command installation pathing |
| `commands/recap.md` | command wrapper | tests paired skill + command behavior |
| `.claude-plugin/marketplace.json` | bundle metadata | tests default bundle discovery |
| `template/` | authoring-only | tests non-installable asset exclusion |

## Core matrix

### Agent x scope

| Agent | Global | Local | Required in v0 |
|------|--------|-------|----------------|
| opencode | Yes | Yes | Yes |
| claude-code | Yes | Yes | Yes |
| cursor | Yes | Yes | Yes |
| agy | Yes | Yes | Yes |
| codex | Yes | Yes | Yes |
| letta-code | Yes | Yes | Yes |
| pi | Yes | Yes | Yes |

### Install unit x expected behavior

| Unit | Example | Expected result |
|------|---------|-----------------|
| bundle | default bundle | installs packaged default skills and commands |
| skill | `project` | installs `skills/project/` tree |
| command | `project` | installs the adapter-resolved command artifact if supported |
| template | `template/` | skipped as non-installable |

## Golden plan cases

### Case 1 — OpenCode local default bundle

Input:

```text
mahiro-skills plan --agent opencode --scope local
```

Expected:

- root resolves to `.opencode`
- default bundle resolves from `.claude-plugin/marketplace.json` as `mahiro-local-bundle`
- plan includes all default skills
- plan includes available commands
- `template/` is excluded

### Case 2 — Claude Code global selected skills

Input:

```text
mahiro-skills plan project recap --agent claude-code --scope global
```

Expected:

- root resolves to `~/.claude`
- `skills/project` and `skills/recap` planned
- `commands/project.md` and `commands/recap.md` planned

### Case 2b — Same-named item resolution

Input:

```text
mahiro-skills plan project --agent opencode --scope local
```

Expected:

- `project` resolves as a skill request
- `skills/project/` is planned
- `commands/project.md` is also planned because the adapter supports commands

### Case 2c — Letta Code local Agent Skills output

Input:

```text
mahiro-skills plan project --agent letta-code --scope local
```

Expected:

- root resolves to `.agents`
- `skills/project/` is planned for `.agents/skills/project`
- no command artifact is planned because Letta Code support is skills-only in v0

### Case 2d — Pi local and isolated global Agent Skills output

Inputs:

```text
mahiro-skills plan project --agent pi --scope local
PI_CODING_AGENT_DIR=/isolated/.pi/agent mahiro-skills plan project --agent pi --scope global
```

Expected:

- local root resolves to `.pi` and plans `.pi/skills/project/`
- default global root resolves to `~/.pi/agent`; explicit `PI_CODING_AGENT_DIR` wins for isolated configurations
- no command artifact is planned because Pi discovers Agent Skills and exposes `/skill:<name>` itself
- install receipts live under the selected Pi adapter root and remain usable by list/update/uninstall/doctor

### Case 3 — Agy namespaced skill alias

Inputs:

```text
mahiro-skills plan learn --agent agy --scope local
mahiro-skills plan direct-cli --agent agy --scope global
```

Expected:

- local root resolves to `.agents`; global root resolves to `~/.gemini/config`
- canonical `learn` and `direct-cli` receipt items target `skills/mh-learn/` and `skills/mh-direct-cli/`
- copied aliases retain complete bundled resources
- staged alias frontmatter uses `name: mh-<name>` and `disable-model-invocation: true`, while removing `disable-slash-command`
- no unprefixed skill copy or command-wrapper artifact is planned
- doctor, skill-manager, update, and uninstall resolve namespaced targets through the adapter
- a retired Gemini CLI v2 receipt removes only unchanged receipt-managed canonical targets; modified and unrelated targets are preserved
- a bounded real-Agy `/skills` check discovers the namespaced global skill before release and preserves any receipt-managed existing installation

## Install assertions

For successful install:

- planned files exist at target paths
- install receipt is written
- commands are omitted only with explicit adapter reasoning
- copied trees preserve helper assets

## Guided / TUI command checks

- interactive `tui` without `--mode` enters the alternate screen only for a non-dumb TTY at least `72x18`; small/dumb/non-interactive and explicit-mode calls use guided compatibility behavior, with one concise size message on interactive fallback
- terminal lifecycle restores the previous raw-mode state, cursor, alternate screen, and input flow on normal exit, `Esc`, `Ctrl+C`, thrown errors, and resize redraw failures; split escape sequences remain buffered
- the full-screen renderer stays within reported terminal display width for ASCII, Thai, combining characters, emoji, color, and no-color output; safety paths hard-wrap without ellipses
- the shared stepper is `Target › Action › Skills › Review › Result`; Target covers All/custom exclusivity, every supported agent, one scope radio, empty-selection blocking, and CLI multi-agent preselection
- Action lists Install, Update, Uninstall, and Inspect with plain descriptions and arrow/Enter navigation
- Skills derives action-specific mixed-agent inventory, coverage/count summaries, disabled no-ops, receipt-only Inspect/Uninstall rows, unreadable-receipt unknown state, and Agy/Letta Code/Pi skills-only detail
- `Space` toggles enabled rows; Enter reaches Review for writes or read-only Inspect detail; Esc clears a query first and then backs out
- Review is full-screen and scrollable, puts one all-required acknowledgement toggle before compact per-agent effect summaries, keeps exact roots/actions/skips/warnings and collision/overwrite/remove paths behind `D` details, explains sequential execution without whole-batch rollback, and blocks Enter until every required acknowledgement is checked
- Review replans immediately before execution and stays in Review with an error if the safety shape changed; entering Review itself never writes
- manager install skips receipt-installed names, Update runs only selected applicable names per agent, and Uninstall delegates receipt-recorded filtering to the existing core APIs
- Result preserves per-agent success/skips/errors/receipt evidence, stops at the first thrown failure, marks later agents Not attempted, and aggregates Completed, Completed with skips, Partially completed, Failed, or No changes
- v2 receipts distinguish current/outdated/modified/missing; legacy receipts remain explicitly unverified, and malformed receipts surface an actionable error without crashing catalog browsing
- guided install still confirms before writing unless `--yes` is provided, and collision handling still uses the same overwrite rules as direct `install`
- guided item/agent multiselect, Home soft-cancel, list filtering, receipt detail, and multi-agent batch summaries remain covered independently from the full-screen manager
- direct CLI plan/install/uninstall/list accept repeated `--agent` flags and return array-shaped JSON results when multiple agents are requested, including `agy`, `letta-code`, and `pi`; direct uninstall also accepts `--agent all`
- `audit` reads only explicit Letta `Skill` tool-call records, supports agent/date filters, never returns transcript text, and reports unobserved packaged skills separately from names outside the current repo catalog
- non-interactive guided/tui execution fails clearly when required flags are missing
- non-interactive execution uses the same direct planner, installer, or list-summary behavior when flags are complete

## Failure cases

### Collision without overwrite

Setup:
- create a conflicting target path before install

Expected:
- install fails
- no partial writes remain

### Unsupported command surface

Setup:
- choose an adapter that cannot preserve command wrappers fully

Expected:
- result status is `partially-installed` or `unsupported`
- skipped commands include reasons

### Missing local root

Setup:
- run local install in a directory where the adapter root cannot be created or resolved

Expected:
- planner or installer fails with explicit root-resolution error

## Doctor command checks

`doctor` should verify:

- adapter root exists or is creatable
- receipts are readable
- installed paths still exist
- command targets match their paired skills when applicable

## Minimal implementation-ready test list

1. plan default bundle for OpenCode local
2. plan selected skills for Claude Code global
3. install one scripted skill and one command successfully
4. preserve `skills/gemini/extension/` as an opaque copied subtree
5. reject collisions without overwrite
6. skip non-installable `template/`
7. write receipt after install

## Suggested status vocabulary

Use only these statuses in tests and CLI output:

- `installed`
- `partially-installed`
- `skipped`
- `unsupported`

## Out of scope for this matrix

- registry publishing
- zip artifact generation
- uninstall cleanup beyond receipt-recorded skill/command targets
- symlink mode
- automatic MCP provisioning
