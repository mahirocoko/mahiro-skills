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
| `commands-gemini/mh-gemini.toml` | native Gemini command | tests Gemini command installation pathing |
| `.claude-plugin/marketplace.json` | bundle metadata | tests default bundle discovery |
| `template/` | authoring-only | tests non-installable asset exclusion |

## Core matrix

### Agent x scope

| Agent | Global | Local | Required in v0 |
|------|--------|-------|----------------|
| opencode | Yes | Yes | Yes |
| claude-code | Yes | Yes | Yes |
| cursor | Yes | Yes | Yes |
| gemini | Yes | Yes | Yes |
| codex | Yes | Yes | Yes |

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

### Case 3 — Gemini local opaque subtree

Input:

```text
mahiro-skills plan gemini --agent gemini --scope local
```

Expected:

- root resolves to `.gemini`
- `skills/gemini/` treated as opaque copy tree
- `commands-gemini/mh-gemini.toml` is also planned because the adapter supports commands
- no attempt to reinterpret extension internals during planning
- warnings allowed if extension bundling is partial

## Install assertions

For successful install:

- planned files exist at target paths
- install receipt is written
- commands are omitted only with explicit adapter reasoning
- copied trees preserve helper assets

## Guided / TUI command checks

- TUI/home flow can produce a plan through prompts without changing planner semantics
- TUI install confirms before writing unless `--yes` is provided
- collision handling uses the same overwrite rules as direct `install`
- interactive item selection offers a default-bundle shortcut and multiselect over inventory (not numbered picks)
- interactive agent selection offers either **All agents** or checkbox-style agent multiselect
- without `--mode`, the home menu can run Install, Update installed, Plan, List, Receipt detail, and Exit in one session; Update installed refreshes all non-empty receipt-recorded installs automatically, uses one batch confirmation after previews, and does not ask for agent, scope, or item choices; with `--mode`, only plan/install/list run once and exit
- declining overwrite or final install from the **home** loop returns to the home menu (soft cancel); the same decline with **explicit `--mode`** still fails with an error
- interactive list mode filters installed summaries to the selected agents without asking for scope first; non-interactive guided/tui list still returns all receipt summaries without an agent prompt
- receipt detail shows receipt metadata plus reconstructed `source -> target` rows from the planner when installed names are present
- direct CLI plan/install/list accept repeated `--agent` flags and return array-shaped JSON results when multiple agents are requested
- multi-agent plan/install in the TUI end with a batch summary note card
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
- uninstall cleanup policy
- symlink mode
- automatic MCP provisioning
