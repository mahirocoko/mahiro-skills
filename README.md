# mahiro-skills

Install Mahiro's packaged skills and commands into OpenCode, Claude Code, Cursor, and Gemini.

`mahiro-skills` is a repo-managed skill bundle plus a Bun CLI/TUI for planning, installing, listing, and checking agent integrations. This repo ships a private Bun CLI and installs from repo contents. It is not an npm-published binary package.

## Table of Contents

- [Install](#install)
  - [Prerequisites](#prerequisites)
  - [Quick install via curl](#quick-install-via-curl)
  - [Install from a local checkout](#install-from-a-local-checkout)
  - [What the installer actually does](#what-the-installer-actually-does)
- [CLI](#cli)
- [Repo layout](#repo-layout)
- [Authoring guide](#authoring-guide)
- [Included skills](#included-skills)
- [Included commands](#included-commands)
- [Packaging notes](#packaging-notes)
- [Current status](#current-status)
- [Source of truth](#source-of-truth)

## Install

If you want the shortest path, open the TUI:

```bash
bun ./src/cli.ts
```

From there you can plan, install, list, and inspect receipts without leaving the session.

### Prerequisites

- `bun`
- `git`
- `bash`
- `curl`

### Quick install via curl

Use this when you want to install from a tagged release without cloning the repo first.

Install the default bundle globally for OpenCode from the `v0.1.13` tag:

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.13 -- --agent opencode --scope global
```

Install a selected skill locally instead:

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.13 -- project --agent opencode --scope local
```

### Install from a local checkout

Use this when you want the full repo locally, want to hack on the installer, or prefer running the CLI directly.

Clone the repo, then run the Bun CLI directly:

```bash
git clone https://github.com/mahirocoko/mahiro-skills.git
cd mahiro-skills

# Install the default bundle for the current project
bun ./src/cli.ts install --agent opencode --scope local

# Install selected skills and paired commands
bun ./src/cli.ts install project recap --agent opencode --scope local
```

### What the installer actually does

- `install.sh` requires `bun` and uses the existing repo layout as the package source.
- If `MAHIRO_SKILLS_REPO_ROOT` is set, it installs from that checkout directly.
- Otherwise it clones the requested repo ref into a temp directory, runs `bun ./src/cli.ts install ...`, then cleans up the temp clone.
- Installed markdown descriptions are prefixed at install time with `Mahiro Skill | ` while source markdown in the repo stays unchanged.
- Installed Gemini TOML command descriptions are also prefixed at install time, while source TOML in the repo stays unchanged.

## CLI

The CLI has two main styles:

- `tui` for an interactive home menu
- direct commands like `plan`, `install`, `list`, and `doctor` for explicit scripted usage

- CLI spec v0: [`docs/cli/spec-v0.md`](./docs/cli/spec-v0.md)
- CLI test matrix v0: [`docs/cli/test-matrix-v0.md`](./docs/cli/test-matrix-v0.md)
- Cursor/Gemini compatibility matrix: [`docs/cli/cursor-gemini-compatibility-matrix-v0.md`](./docs/cli/cursor-gemini-compatibility-matrix-v0.md)
- Adapter implementation plan: [`docs/cli/adapter-implementation-plan-v0.md`](./docs/cli/adapter-implementation-plan-v0.md)
- CLI entrypoint: [`src/cli.ts`](./src/cli.ts)

### Supported v0 commands

- `plan`
- `install`
- `list`
- `doctor`
- `tui`
- `guided`

### Which command should I use?

- `tui`: best default if you want to browse options and keep working in one interactive session
- `plan`: preview what would be installed without writing anything
- `install`: write skills and commands into an agent root
- `list`: show what is currently installed
- `doctor`: verify roots, receipts, and installed targets
- `guided`: compatibility alias for the same interactive TUI flow

### Supported v0 adapters

- `opencode`
- `claude-code`
- `cursor`
- `gemini`

### Example usage

```bash
# Open the TUI home menu
bun ./src/cli.ts

# Show a dry-run plan for the default bundle in the current project
bun ./src/cli.ts plan --agent opencode --scope local

# Install selected skills locally for OpenCode
bun ./src/cli.ts install project recap --agent opencode --scope local

# Plan for multiple agents in one CLI call
bun ./src/cli.ts plan project --agent cursor --agent gemini --scope local

# Install for multiple agents in one CLI call
bun ./src/cli.ts install project --agent cursor,gemini --scope local

# Install the default bundle globally for Claude Code
bun ./src/cli.ts install --agent claude-code --scope global

# List installed items for one adapter/scope
bun ./src/cli.ts list --agent opencode --scope local

# Run integrity checks for one adapter
bun ./src/cli.ts doctor --agent claude-code --scope global

# Launch the terminal UI explicitly
bun ./src/cli.ts tui

# Launch the terminal UI by default
bun ./src/cli.ts

# See what is already installed across agents and scopes
bun ./src/cli.ts guided --mode list
```

## Repo layout

At a glance:

- `skills/<name>/...` — packaged skills and helper resources
- `commands/<name>.md` — slash-command wrappers for non-Gemini adapters
- `commands-gemini/mh-<name>.toml` — native Gemini custom commands
- `template/SKILL.md` — starter template for new skills
- `.claude-plugin/marketplace.json` — default bundle metadata
- `docs/authoring/` — maintainer notes for release, path, and inventory conventions
- `docs/cli/` — CLI spec and acceptance matrix
- `src/` and `test/` — Bun + TypeScript CLI implementation and tests

For the Gemini extension subtree, see [`skills/gemini/extension/README.md`](./skills/gemini/extension/README.md).

## Authoring guide

If you are maintaining the repo rather than just installing from it, start here:

- Release and path conventions: [`docs/authoring/release-and-path-conventions.md`](./docs/authoring/release-and-path-conventions.md)
- Docs bootstrap and review workflow: [`docs/authoring/mahiro-docs-rules-init-and-style-workflow.md`](./docs/authoring/mahiro-docs-rules-init-and-style-workflow.md)

## Included skills

- `deep-research`
- `forward`
- `gemini`
- `learn`
- `mahiro-docs-rules-init`
- `mahiro-style`
- `philosophy`
- `project`
- `recap`
- `rrr`
- `watch`

## Included commands

- `/deep-research`
- `/forward`
- `/gemini`
- `/learn`
- `/mahiro-docs-rules-init`
- `/mahiro-style`
- `/philosophy`
- `/project`
- `/recap`
- `/rrr`
- `/watch`

## Packaging notes

These are the repo-maintainer details that matter most when changing installer behavior:

- Source content is copied from the repo layout and treated as the canonical package source.
- The installer rewrites only staged installed markdown descriptions; it does not mutate source markdown in the repo.
- When a file referenced an install-local absolute path, it was normalized to a repo-local path.
- Skills that read or write local `.agent-state` data should resolve `REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"` first, then default `AGENT_STATE_DIR` to `$REPO_ROOT/.agent-state` unless the human overrides it.
- If you are changing release, version, inventory, or path behavior, check [`docs/authoring/release-and-path-conventions.md`](./docs/authoring/release-and-path-conventions.md) before publishing.
- The `gemini` skill remains the heaviest subtree and is still treated as an opaque copied tree.

## Current status

- `skills/` is the source of truth for packaged agent behavior.
- `commands/` remain compatibility wrappers for non-Gemini slash-command entrypoints.
- `commands-gemini/` is the native Gemini custom-command source, installed as namespaced `.toml` files like `mh-watch.toml` under `.gemini/commands/` or `~/.gemini/commands/`.
- CLI v0 currently targets `opencode`, `claude-code`, `cursor`, and `gemini` for packaged skill and command installs.
- Global and local installation scopes are first-class in the current scaffold and tests.
- Gemini extension assets are still copied as packaged subtree content, not modeled as a full extension setup flow.
- `tui` is the primary interactive entrypoint over the same planner and installer core, with non-interactive fallback when flags are fully provided.
- `guided` remains as a compatibility alias for the same interactive TUI flow.
- Interactive TUI without `--mode` opens a home menu (install, plan, list, receipt detail, exit) so you can run multiple actions in one session; explicit `--mode` or non-interactive runs stay single-pass.
- TUI list mode now renders installed items in grouped agent/scope cards with separate skill and command sections.
- interactive item selection now uses checkbox-style multiselect with space-to-toggle guidance instead of numbered readline prompts.
- In the interactive TUI (home menu or without `--agent`), plan, install, list, and receipt detail use checkbox-style **agent multiselect** with an explicit **All agents** shortcut; the direct CLI also accepts repeated `--agent` flags or comma-separated agent values and runs batch plan/install/list sequentially per agent for the same scope and items.
- guided list mode summarizes install receipts per agent and scope; when agents are chosen interactively, the list is filtered to those agents (use `--agent` on a single-pass run to skip the agent prompt).
- Receipt detail mode prompts for one or more agents and one scope, then shows each matching install receipt (paths, timestamps, installed skill and command names).
- Install mode shows an install preview after the plan summary with `source -> target` lines and `[collision]` markers before overwrite and confirmation prompts.
- Multi-agent plan and install runs end with a lightweight batch summary card so the combined result is easier to scan before leaving the TUI.

## Source of truth

If you refresh this repo later, prefer the currently installed local copies over stale repo snapshots.
