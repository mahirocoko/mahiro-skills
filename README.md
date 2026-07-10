# mahiro-skills

Mahiro's packaged agent skills for OpenCode, Claude Code, Cursor, Gemini, Codex, and Letta Code, plus slash-command wrappers where the target agent supports them.

`mahiro-skills` is a repo-managed skill bundle plus a private Bun CLI/TUI for previewing, installing, uninstalling, listing, and checking agent integrations. It installs from this repository's contents; it is not an npm-published binary package.

Use it when you want the same Mahiro workflows available across agents: project tracking, repo learning, session recap, retrospectives, direct Cursor/Antigravity/Codex lanes, docs bootstrapping, research, video learning, frontend taste, and web asset workflows.

## Contents

- [Install](#install)
- [Use](#use)
- [Skills](#skills)
- [Bundles](#bundles)
- [Runtime prerequisites](#runtime-prerequisites)
- [Repo map](#repo-map)
- [Maintainer notes](#maintainer-notes)
- [Source of truth](#source-of-truth)

## Install

### Quick local install

From a local checkout:

```bash
bun ./src/cli.ts install --agent opencode --scope local
```

Install selected skills instead of the default bundle:

```bash
bun ./src/cli.ts install project recap --agent opencode --scope local
```

Preview before writing:

```bash
bun ./src/cli.ts plan --agent opencode --scope local
```

### Tagged install without keeping a clone

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.52 -- --agent opencode --scope global
```

Selected skill through the same path:

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.52 -- project --agent opencode --scope local
```

### Interactive TUI

```bash
bun ./src/cli.ts
```

The TUI wraps the same planner, installer, and uninstaller core. Use it when you want menus for install, uninstall, update installed receipts, list installed items, or inspect receipt detail.

### Installer truth

- Installer prerequisites: `bun`, `git`, `bash`, and `curl` for remote install.
- If `MAHIRO_SKILLS_REPO_ROOT` is set, `install.sh` installs from that checkout directly.
- Otherwise `install.sh` clones the requested repo ref into a temp directory, runs `bun ./src/cli.ts install ...`, then removes the temp clone.
- Local installs preserve the caller working directory as the install target unless `MAHIRO_SKILLS_CWD` is explicitly set.
- Installed markdown descriptions are prefixed at install time with `Mahiro Skill | ` while source markdown in the repo stays unchanged.
- Installed Gemini TOML command descriptions are also prefixed at install time, while source TOML in the repo stays unchanged.

## Use

Supported v0 commands: `plan`, `install`, `uninstall`, `list`, `doctor`, `manifest`, `search`, `gaps`, `new`, `tui`, and `guided`.

Supported v0 adapters: `opencode`, `claude-code`, `cursor`, `gemini`, `codex`, and `letta-code`.

Current workflow highlights:

- **Interactive install/uninstall/update TUI plus non-interactive `guided --mode update --yes`** — open with `bun ./src/cli.ts`; supports Install, Uninstall, Update installed, List installed, and Receipt detail. Uninstall can target one agent or all agents, then remove selected receipt-recorded items or everything for the chosen scope. Prompt hints live at the bottom of active prompts, and `Esc` exits cleanly.
- **Direct CLI lanes** — `/direct-cli` keeps Cursor, Antigravity, and Codex pane-first in tmux. Single-lane work remains the default for narrow implementation or recovery.
- **Multi-pane direct jobs** — one job can use one tmux session with several panes, a lane registry, explicit write policy, role fanout, or same-prompt fanout through a shared tmux buffer.
- **Repo-local doctrine tooling** — docs/rules skills preserve repo-local evidence first, then layer Mahiro-style guidance only as fallback or preferred direction.
- **Sprite asset pipeline** — `/sprite-workflow` now ships deterministic chroma-key extraction, light/dark/checker QA previews, safe edge-connected vs spill comparison, bounds/silhouette jitter gates, adjacent-frame zooms, motion-jitter reports, settle-frame smoothing, candidate scoring, center alignment, and safe named promotion helpers for generated mascot/sprite sheets.

Common commands:

```bash
# Open the TUI
bun ./src/cli.ts

# Plan or install the default bundle locally
bun ./src/cli.ts plan --agent opencode --scope local
bun ./src/cli.ts install --agent opencode --scope local

# Install selected skills for multiple agents
bun ./src/cli.ts install project --agent cursor,gemini,letta-code --scope local

# Uninstall selected skills from one agent, or from all agents in a scope
bun ./src/cli.ts uninstall project --agent cursor --scope local
bun ./src/cli.ts uninstall --agent all --scope local

# Check installed files
bun ./src/cli.ts doctor --agent opencode --scope local

# Inspect the source skill catalog for agents/tooling
bun ./src/cli.ts manifest --json
bun ./src/cli.ts search project --json
bun ./src/cli.ts gaps --json

# Scaffold a new skill from the authoring template
bun ./src/cli.ts new my-skill --copy-template --json

# Install Agent Skills for Letta Code
bun ./src/cli.ts install project --agent letta-code --scope local
```

More detail lives in:

- CLI spec v0: [`docs/cli/spec-v0.md`](./docs/cli/spec-v0.md)
- CLI test matrix v0: [`docs/cli/test-matrix-v0.md`](./docs/cli/test-matrix-v0.md)
- Cursor/Gemini compatibility matrix: [`docs/cli/cursor-gemini-compatibility-matrix-v0.md`](./docs/cli/cursor-gemini-compatibility-matrix-v0.md)
- Adapter implementation plan: [`docs/cli/adapter-implementation-plan-v0.md`](./docs/cli/adapter-implementation-plan-v0.md)

## Skills

Runtime inventory is defined by [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json). Agent-facing discovery notes live in [`skills/llms.txt`](./skills/llms.txt).

| Skill | Command | Use when |
| --- | --- | --- |
| `asset-designer` | `/asset-designer` | You need a website asset plan, cutout workflow, layer split, or production-ready asset pack. |
| `codex-asset-production` | `/codex-asset-production` | You need Codex to coordinate imagegen/source-art and asset-designer dicut/cleanup/QA lanes for production-ish assets. |
| `control-room-goals` | `/control-room-goals` | You need to draft or refine a Goal Mode objective, DoD, immediate next action, verification evidence, or handoff/reset boundary. |
| `cocoindex-rules-init` | `/cocoindex-rules-init` | A repo needs AGENTS.md guidance that makes agents prefer `cocoindex-code` / `ccc` for semantic code search and repo exploration. |
| `deep-research` | `/deep-research` | You need source-backed research through Gemini. |
| `direct-cli` | `/direct-cli` | You need pane-first Cursor, Antigravity, or Codex lanes in tmux, including multi-pane same-prompt fanout. |
| `forward` | `/forward` | You are wrapping work forward for the next session. |
| `gemini` | `/gemini` | You need to control Gemini via MQTT WebSocket. |
| `learn` | `/learn` | You want to study a repository with parallel agents. |
| `mac-calendar-booking` | `/mac-calendar-booking` | You need to add a confirmed event to macOS Calendar safely. |
| `mahiro-docs-rules-init` | `/mahiro-docs-rules-init` | A repo needs AGENTS.md and Mahiro-style docs bootstrapping. |
| `mahiro-guidance-refine` | `/mahiro-guidance-refine` | You need to turn session feedback into approved docs, rules, or style guidance updates. |
| `mahiro-style` | `/mahiro-style` | You need Mahiro's cross-repo code style doctrine. |
| `philosophy` | `/philosophy` | You need the local philosophy and alignment rules. |
| `project` | `/project` | You need to learn, incubate, find, or list tracked repos. |
| `recap` | `/recap` | You need session orientation, current focus, or status. |
| `rrr` | `/rrr` | You need a retrospective and durable lesson notes. |
| `sprite-workflow` | `/sprite-workflow` | You need a CLI-first sprite/Codex handoff, chroma-key extraction/dicut pipeline, manifest, contact sheet, preview GIF, QA, motion-jitter review, settle-frame smoothing, safe named promotion, or runtime sprite asset gate. |
| `uncodixify` | `/uncodixify` | You need an explicit or evidence-triggered second-pass audit/enforcement pass for generic AI-looking frontend UI and fake premium styling. |
| `web-asset-prompts` | `/web-asset-prompts` | You need production-ready image-generation prompts for real website assets. |
| `watch` | `/watch` | You want to learn from a YouTube video via Gemini transcription. |

## Bundles

| Bundle | Install | Use |
| --- | --- | --- |
| Orientation | `bun ./src/cli.ts install recap rrr forward --agent opencode --scope local` | `/recap --now`, `/rrr`, `/forward` |
| CocoIndex rules | `bun ./src/cli.ts install cocoindex-rules-init --agent opencode --scope local` | Add or patch repo-local AGENTS.md so agents prefer CocoIndex Code for semantic code search |
| Project tracking | `bun ./src/cli.ts install project learn --agent opencode --scope local` | `/project learn`, `/project incubate`, `/learn` |
| Repo doctrine | `bun ./src/cli.ts install mahiro-docs-rules-init cocoindex-rules-init mahiro-guidance-refine mahiro-style --agent opencode --scope local` | Bootstrap docs, add CocoIndex-first search rules, refine guidance from feedback, apply Mahiro style lens |
| Direct execution | `bun ./src/cli.ts install direct-cli watch --agent opencode --scope local` | Cursor, Antigravity, Codex, multi-pane fanout, transcript lanes |
| Frontend assets | `bun ./src/cli.ts install uncodixify web-asset-prompts asset-designer codex-asset-production sprite-workflow --agent opencode --scope local` | UI taste filtering, asset packs, Codex asset lanes, image prompts, sprite handoff/QA |
| Multi-agent install | `bun ./src/cli.ts install project --agent cursor,gemini,letta-code --scope local` | Install one skill across adapters |

## Runtime prerequisites

| Workflow | Extra runtime tools |
| --- | --- |
| `project`, `learn` | `ghq`, `git`, GitHub network access |
| `direct-cli` | `tmux`, Cursor CLI, Antigravity CLI (`agy`), and/or Codex CLI; multi-pane jobs use one named tmux session with multiple panes. For Agy, prefer exact `--model` labels and `--prompt-interactive` for fresh multiline prompts. |
| `gemini`, `deep-research`, `watch` | Gemini CLI/runtime setup; some flows use browser/MQTT extension support |
| `watch` | YouTube access; transcript availability varies by video |
| `rrr`, `recap`, `forward` | Repo-local `.agent-state` conventions |
| `sprite-workflow` | `python3`, ImageMagick `magick`; optional Pillow (`python3 -m pip install Pillow`) for animated GIF previews. Motion review helpers and named promotion are bundled Python scripts. |

## Repo map

- `skills/<name>/...` — packaged skills and helper resources
- `skills/llms.txt` — compact skill discovery index for agents and humans
- `commands/<name>.md` — slash-command wrappers for non-Gemini adapters
- `commands-gemini/mh-<name>.toml` — native Gemini custom commands
- Letta Code local installs use `.agents/skills/<name>/`; global installs use `~/.letta/skills/<name>/`
- `examples/` — runnable or copyable workflow examples for the CLI/TUI surface
- `template/SKILL.md` — starter template for new skills
- `.claude-plugin/marketplace.json` — default bundle metadata
- `bun ./src/cli.ts manifest --json` — machine-readable source catalog for skills, command coverage, bundle membership, and inventory gaps
- `bun ./src/cli.ts gaps --json` — read-only authoring check for missing skill files, stale bundle references, and command/skill mismatches
- `bun ./src/cli.ts new my-skill --copy-template --json` — copy the starter `template/` into `skills/my-skill/` and report manual bundle/command/index follow-up work
- `docs/authoring/` — maintainer notes for release, path, inventory, and skill-writing conventions
- `docs/cli/` — CLI spec and acceptance matrix
- `src/` and `test/` — Bun + TypeScript CLI implementation and tests

For the Gemini extension subtree, see [`skills/gemini/extension/README.md`](./skills/gemini/extension/README.md).

## Maintainer notes

Start here when changing the repo rather than installing from it:

- Release and path conventions: [`docs/authoring/release-and-path-conventions.md`](./docs/authoring/release-and-path-conventions.md)
- Skill pattern adaptation: [`docs/authoring/skill-pattern-adaptation-phase-a.md`](./docs/authoring/skill-pattern-adaptation-phase-a.md)
- Docs bootstrap and review workflow: [`docs/authoring/mahiro-docs-rules-init-and-style-workflow.md`](./docs/authoring/mahiro-docs-rules-init-and-style-workflow.md)
- Verification and knowledge freshness: [`docs/authoring/verification-and-knowledge-freshness.md`](./docs/authoring/verification-and-knowledge-freshness.md)

Packaging facts to preserve:

- Source content is copied from the repo layout and treated as the canonical package source.
- The installer rewrites only staged installed markdown descriptions; it does not mutate source markdown in the repo.
- Skills that read or write local `.agent-state` data should resolve `REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"` first, then default `AGENT_STATE_DIR` to `$REPO_ROOT/.agent-state` unless the human overrides it.
- The `gemini` skill remains the heaviest subtree and is still treated as an opaque copied tree.

## Source of truth

- `skills/` is the source of truth for packaged agent behavior.
- `commands/` are compatibility wrappers for non-Gemini slash-command entrypoints.
- `commands-gemini/` is the native Gemini custom-command source, installed as namespaced `.toml` files like `mh-watch.toml` under `.gemini/commands/` or `~/.gemini/commands/`.
- CLI v0 currently targets `opencode`, `claude-code`, `cursor`, `gemini`, `codex`, and `letta-code` for packaged skill installs; Letta Code is skills-only in v0 because its documented Agent Skills surface does not define a command-wrapper directory.
- Gemini extension assets are still copied as packaged subtree content, not modeled as a full extension setup flow.
- Prefer the source files in this repository and tagged releases over installed copies. Installed copies are useful evidence when debugging drift, but they are not the canonical authoring surface.
