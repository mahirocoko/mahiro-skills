# mahiro-skills

Mahiro's packaged agent skills and slash commands for OpenCode, Claude Code, Cursor, Gemini, and Codex.

`mahiro-skills` is a repo-managed skill bundle plus a private Bun CLI/TUI for planning, installing, listing, and checking agent integrations. It installs from this repository's contents; it is not an npm-published binary package.

Use it when you want the same Mahiro workflows available across agents: project tracking, recap, retrospectives, direct Gemini/Cursor lanes, docs bootstrapping, research, video learning, and style guidance.

## Table of Contents

- [Quick start](#quick-start)
- [Choose your install path](#choose-your-install-path)
  - [Prerequisites](#prerequisites)
  - [Quick install via curl](#quick-install-via-curl)
  - [Install from a local checkout](#install-from-a-local-checkout)
  - [What the installer actually does](#what-the-installer-actually-does)
- [TUI walkthrough](#tui-walkthrough)
- [CLI examples](#cli-examples)
- [Included skills](#included-skills)
- [Common workflows](#common-workflows)
- [Runtime prerequisites by workflow](#runtime-prerequisites-by-workflow)
- [Repo layout](#repo-layout)
- [Authoring guide](#authoring-guide)
- [Packaging notes](#packaging-notes)
- [Current status](#current-status)
- [Source of truth](#source-of-truth)

## Quick start

Open the interactive TUI from a local checkout:

```bash
bun ./src/cli.ts
```

The TUI lets you plan, install, list, and inspect install receipts without remembering every flag.

For a direct non-interactive install into the current project:

```bash
bun ./src/cli.ts install --agent opencode --scope local
```

For a tagged install without keeping a clone:

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.21 -- --agent opencode --scope global
```

## Choose your install path

| Goal | Command |
| --- | --- |
| Browse interactively | `bun ./src/cli.ts` |
| Preview default bundle | `bun ./src/cli.ts plan --agent opencode --scope local` |
| Install default bundle locally | `bun ./src/cli.ts install --agent opencode --scope local` |
| Install selected skills | `bun ./src/cli.ts install project recap --agent opencode --scope local` |
| Install for multiple agents | `bun ./src/cli.ts install project --agent cursor,gemini --scope local` |
| Check installed files | `bun ./src/cli.ts doctor --agent opencode --scope local` |

### Prerequisites

Installer prerequisites:

- `bun`
- `git`
- `bash`
- `curl` for the remote install path

Some installed skills need extra runtime tools. See [Runtime prerequisites by workflow](#runtime-prerequisites-by-workflow).

### Quick install via curl

Use this when you want to install from a tagged release without cloning the repo first.

Install the default bundle globally for OpenCode from the `v0.1.21` tag:

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.21 -- --agent opencode --scope global
```

Install a selected skill locally instead:

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.21 -- project --agent opencode --scope local
```

### Install from a local checkout

Use this when you want the full repo locally, want to hack on the installer, or prefer running the CLI directly.

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
- Local installs preserve the caller working directory as the install target unless `MAHIRO_SKILLS_CWD` is explicitly set.
- Installed markdown descriptions are prefixed at install time with `Mahiro Skill | ` while source markdown in the repo stays unchanged.
- Installed Gemini TOML command descriptions are also prefixed at install time, while source TOML in the repo stays unchanged.

## TUI walkthrough

Launch the TUI:

```bash
bun ./src/cli.ts tui
```

Flow:

1. **Home** — choose `Install`, `Plan (dry run)`, `List installed`, `Receipt detail`, or `Exit`.
2. **Agents** — pick all agents or select specific agents with checkbox-style multiselect.
3. **Scope** — choose `local` for the current project or `global` for the user agent root.
4. **Items** — install the default bundle or select individual skills/commands.
5. **Install preview** — review `source -> target` lines and `[collision]` markers before writing.
6. **Receipt detail** — inspect installed paths, timestamps, skills, commands, and reconstructed targets.

Example session:

```text
Home → Plan (dry run)
Agents → All agents
Scope → local
Items → default bundle
Batch plan summary → opencode, claude-code, cursor, gemini, codex
```

The non-interactive fallback uses the same planner and installer core, so scripted commands and the TUI stay aligned.

The TUI is intentionally a standard wizard instead of a full-screen dashboard: prompt I/O handles TTY detection, cancellation, and outro messages, while separate view helpers own the compact startup wordmark, keyboard hints, menu labels, preview, and summary text. Home-loop prompts include a `Back to Home` escape so humans can navigate without side effects.

## CLI examples

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

# See what is already installed across agents and scopes
bun ./src/cli.ts guided --mode list
```

Supported v0 commands: `plan`, `install`, `list`, `doctor`, `tui`, and `guided`.

Supported v0 adapters: `opencode`, `claude-code`, `cursor`, `gemini`, and `codex`.

CLI references:

- CLI spec v0: [`docs/cli/spec-v0.md`](./docs/cli/spec-v0.md)
- CLI test matrix v0: [`docs/cli/test-matrix-v0.md`](./docs/cli/test-matrix-v0.md)
- Cursor/Gemini compatibility matrix: [`docs/cli/cursor-gemini-compatibility-matrix-v0.md`](./docs/cli/cursor-gemini-compatibility-matrix-v0.md)
- Adapter implementation plan: [`docs/cli/adapter-implementation-plan-v0.md`](./docs/cli/adapter-implementation-plan-v0.md)
- CLI entrypoint: [`src/cli.ts`](./src/cli.ts)

## Included skills

Runtime inventory is defined by [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json). Agent-facing discovery notes live in [`skills/llms.txt`](./skills/llms.txt).

| Skill | Command | Use when |
| --- | --- | --- |
| `asset-designer` | `/asset-designer` | You need a website asset plan, cutout workflow, layer split, or production-ready asset pack. |
| `deep-research` | `/deep-research` | You need source-backed research through Gemini. |
| `direct-cli` | `/direct-cli` | You need a direct Gemini or Cursor CLI lane in tmux. |
| `forward` | `/forward` | You are wrapping work forward for the next session. |
| `gemini` | `/gemini` | You need to control Gemini via MQTT WebSocket. |
| `learn` | `/learn` | You want to study a repository with parallel agents. |
| `mahiro-docs-rules-init` | `/mahiro-docs-rules-init` | A repo needs AGENTS.md and Mahiro-style docs bootstrapping. |
| `mahiro-style` | `/mahiro-style` | You need Mahiro's cross-repo code style doctrine. |
| `philosophy` | `/philosophy` | You need the local philosophy and alignment rules. |
| `project` | `/project` | You need to learn, incubate, find, or list tracked repos. |
| `recap` | `/recap` | You need session orientation, current focus, or status. |
| `rrr` | `/rrr` | You need a retrospective and durable lesson notes. |
| `uncodixify` | `/uncodixify` | You need to prevent generic AI-looking frontend UI and fake premium styling. |
| `web-asset-prompts` | `/web-asset-prompts` | You need production-ready image-generation prompts for real website assets. |
| `watch` | `/watch` | You want to learn from a YouTube video via Gemini transcription. |

## Common workflows

### Project tracking

```bash
bun ./src/cli.ts install project --agent opencode --scope local
```

Then use `/project learn owner/repo`, `/project incubate owner/repo`, `/project find query`, or `/project list` from the target agent.

### Session awareness

```bash
bun ./src/cli.ts install recap rrr forward --agent opencode --scope local
```

Use `/recap --now` during work, `/rrr` at the end, and `/forward` when handing off.

### Direct CLI lanes

```bash
bun ./src/cli.ts install direct-cli gemini deep-research watch --agent opencode --scope local
```

Use this when a task needs Gemini, Cursor, transcript, or browser-tab orchestration outside the normal agent runtime.

### Frontend design and web assets

```bash
bun ./src/cli.ts install uncodixify web-asset-prompts asset-designer --agent opencode --scope local
```

Use `/uncodixify` to filter generated UI away from generic AI/Codex aesthetics, `/asset-designer` to plan web-ready asset packs and cutout workflows, and `/web-asset-prompts` to rewrite individual image prompts into production website asset specs.

### Multi-agent install

```bash
bun ./src/cli.ts plan project --agent cursor --agent gemini --scope local
bun ./src/cli.ts install project --agent cursor,gemini --scope local
```

## Runtime prerequisites by workflow

| Workflow | Extra runtime tools |
| --- | --- |
| `project`, `learn` | `ghq`, `git`, GitHub network access |
| `direct-cli` | `tmux`, Gemini CLI and/or Cursor CLI |
| `gemini`, `deep-research`, `watch` | Gemini CLI/runtime setup; some flows use browser/MQTT extension support |
| `watch` | YouTube access; transcript availability varies by video |
| `rrr`, `recap`, `forward` | Repo-local `.agent-state` conventions |

## Repo layout

At a glance:

- `skills/<name>/...` — packaged skills and helper resources
- `skills/llms.txt` — compact skill discovery index for agents and humans
- `commands/<name>.md` — slash-command wrappers for non-Gemini adapters
- `commands-gemini/mh-<name>.toml` — native Gemini custom commands
- `examples/` — runnable or copyable workflow examples for the CLI/TUI surface
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
- CLI v0 currently targets `opencode`, `claude-code`, `cursor`, `gemini`, and `codex` for packaged skill and command installs.
- Global and local installation scopes are first-class in the current scaffold and tests.
- Gemini extension assets are still copied as packaged subtree content, not modeled as a full extension setup flow.
- `tui` is the primary interactive entrypoint over the same planner and installer core, with non-interactive fallback when flags are fully provided.
- `guided` remains as a compatibility alias for the same interactive TUI flow.

## Source of truth

Prefer the source files in this repository and tagged releases over installed copies. Installed copies are useful evidence when debugging drift, but they are not the canonical authoring surface.
