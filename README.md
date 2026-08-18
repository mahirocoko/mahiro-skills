# mahiro-skills

Mahiro's packaged agent skills for OpenCode, Claude Code, Cursor, Antigravity CLI (Agy), Codex, Letta Code, and Pi, plus target-native command entrypoints where supported.

`mahiro-skills` is a repo-managed skill bundle plus a private Bun CLI/TUI for previewing, installing, uninstalling, listing, and checking agent integrations. It installs from this repository's contents; it is not an npm-published binary package.

Use it when you want the same Mahiro workflows available across agents: project tracking, repo learning, session recap, retrospectives, direct Cursor/Antigravity/Codex/Pi lanes, docs bootstrapping, research, video learning, motion design, and web asset workflows.

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

The canonical catalog is default-or-absent: every packaged skill and paired command belongs to the default bundle. Removed workflows can be recovered from Git history instead of remaining as dormant opt-in inventory.

### Tagged install without keeping a clone

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.95 -- --agent opencode --scope global
```

Selected skill through the same path:

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.95 -- project --agent opencode --scope local
```

### Standard Agent Skills compatibility

Install through the open `skills` CLI when you only need portable Agent Skills:

```bash
npx skills add mahirocoko/mahiro-skills
npx skills add mahirocoko/mahiro-skills --skill recap
```

This compatibility path installs each selected `SKILL.md` and its supporting files. It does not install this repo's adapter-specific slash-command wrappers, receipts, status-aware updates, doctor checks, or managed uninstall flow. Use the Bun CLI or tagged installer above when you need those full integrations.

For a project-local Letta Code-compatible copy under `.agents/skills/` without interactive prompts:

```bash
npx skills add mahirocoko/mahiro-skills --skill recap --agent universal --copy --yes
```

### Interactive TUI

```bash
bun ./src/cli.ts
```

The default command opens a persistent full-screen Skill Manager when the terminal is interactive and at least `72x18`. Its guided flow is `Target → Action → Skills → Review → Result`: choose All agents or a custom multi-agent set, choose one scope, choose Install/Update/Uninstall/Inspect, then review the exact per-agent plan before any write. Scope defaults to `global`; an explicit `--scope local` remains authoritative. Inspect stays read-only from Skills detail.

Primary keys are visible on every screen: `↑/↓` focus, `Space` select or acknowledge, `Enter` continue, `Esc` back (or clear a query first), and `Ctrl+C` exit. Skills starts with a visible **Select all eligible** row that toggles every actionable item in the current filter. No mnemonic action key is required. Review defaults to a compact per-agent summary with confirmations at the top; one `Space` explicitly confirms every required acknowledgement in the selected batch, while `D` reveals exact paths, skips, and adapter warnings. Review remains non-destructive until Enter and explains sequential execution without whole-batch rollback. Result keeps per-agent receipt evidence and marks later agents Not attempted after the first thrown failure.

Status is evidence-based rather than guessed: `current`, `outdated`, `modified`, `missing`, and `legacy` distinguish source updates, local target drift, missing targets, and older receipts that predate fingerprints. Unreadable receipts are shown as unknown; any unreadable selected agent blocks the batch until the target selection is corrected.

Use `bun ./src/cli.ts guided` for the prompt-by-prompt compatibility wizard. Explicit `tui --mode ...`, non-interactive execution, small terminals, and `TERM=dumb` retain the guided direct/guided contracts; a small interactive launch prints one concise size message before falling back.

### Installer truth

- Installer prerequisites: `bun`, `git`, `bash`, and `curl` for remote install.
- If `MAHIRO_SKILLS_REPO_ROOT` is set, `install.sh` installs from that checkout directly.
- Otherwise `install.sh` clones the requested repo ref into a temp directory, runs `bun ./src/cli.ts install ...`, then removes the temp clone.
- Local installs preserve the caller working directory as the install target unless `MAHIRO_SKILLS_CWD` is explicitly set.
- Pi global installs honor `PI_CODING_AGENT_DIR` as the exact agent config root before falling back to `${MAHIRO_SKILLS_HOME:-$HOME}/.pi/agent`; local Pi installs always target the selected project's `.pi` root.
- The Pi adapter installs skills only. It does not install the `pi` executable, create a PATH launcher, or configure a provider; direct Pi use requires a separately working `pi` command or explicit wrapper.
- The `agy` adapter is the only Google CLI-family install target. It installs self-contained namespaced skills as `/mh-*` under `~/.gemini/config/skills/` globally or `.agents/skills/` locally and never installs an unprefixed skill copy.
- When an Agy install finds a v2 receipt from the retired Gemini CLI adapter, it removes only unchanged receipt-managed canonical skills and TOML commands. Modified or invalid targets are preserved with a warning; unrelated `~/.gemini/skills` content is never touched.
- Installed markdown descriptions are prefixed at install time with `Mahiro Skill | ` while source markdown in the repo stays unchanged.

## Use

Supported v0 commands: `plan`, `install`, `uninstall`, `list`, `doctor`, `audit`, `manifest`, `search`, `gaps`, `new`, `tui`, and `guided`.

Supported v0 adapters: `opencode`, `claude-code`, `cursor`, `agy`, `codex`, `letta-code`, and `pi`.

Current workflow highlights:

- **Step-first full-screen Skill Manager plus guided compatibility flow** — open with `bun ./src/cli.ts` for `Target → Action → Skills → Review → Result`, compact batch review, optional exact safety details, per-agent mixed-state detail, and sequential result evidence. `guided` and explicit `--mode` calls preserve the prompt-based and non-interactive automation contracts.
- **Context-contract audits** — `/auditing-context-contracts` maps current, generated, historical, and transient text owners; checks material claims against source/runtime evidence; locates explicitly retired claims with a read-only deterministic scanner; and keeps keyword coverage distinct from semantic, browser, rendered, and human proof.
- **Fable orchestration** — `/fable` escalates hard, ambiguous, cross-system, or repeatedly failing work into an evidence-driven mission with falsifiable hypotheses, adaptive specialist lanes, bounded retries, checkpoints, and fresh verification. It is a workflow mode, not Cursor Fable model selection.
- **Direct CLI lanes** — `/direct-cli` keeps Cursor, Antigravity, Codex, and Pi pane-first in Herdr when already inside a healthy compatible Herdr runtime, with tmux as the portable fallback. `use Pi` / `ใช้ Pi` selects the Pi lane; Pi uses an explicit tool allowlist and provider/model preflight. Single-lane work remains the default for narrow implementation or recovery; long named-agent Herdr jobs can detach into a private durable watcher registry for later collection.
- **Multi-pane direct jobs** — one job can use one Herdr tab or tmux session with several panes, a lane registry, explicit write policy, role fanout, or backend-specific same-prompt fanout.
- **Repo-local doctrine tooling** — docs/rules skills preserve repo-local evidence first, then layer Mahiro-style guidance only as fallback or preferred direction.
- **Sprite asset pipeline** — `/sprite-workflow` now ships the full MIT-attributed 107-example Image Cockpit prompt catalog plus reusable templates, deterministic chroma/2D-grid extraction, native pre-normalization review, bottom/center and cross-action scale QA, bounds/silhouette jitter gates, bounded selected-cycle motion intake, warning-first alpha-hole/body-FX reports, native-grid recovery, strict approved-manifest atlas assembly, previews, candidate scoring, and safe named promotion helpers.
- **Game production stack** — `/game-production` coordinates whole-game maturity, content/art/UI/audio/save/performance/browser/release gates while `/vfx-workflow` keeps runtime effects mechanically truthful, accessible, bounded, and separately promotable from body sprites.

Common commands:

```bash
# Open the TUI
bun ./src/cli.ts

# Plan or install the default bundle locally
bun ./src/cli.ts plan --agent opencode --scope local
bun ./src/cli.ts install --agent opencode --scope local

# Install selected skills for multiple agents
bun ./src/cli.ts install project --agent cursor,agy,letta-code,pi --scope local

# Uninstall selected skills from one agent, or from all agents in a scope
bun ./src/cli.ts uninstall project --agent cursor --scope local
bun ./src/cli.ts uninstall --agent all --scope local

# Check installed files
bun ./src/cli.ts doctor --agent opencode --scope local

# Audit actual Letta Skill tool calls from local transcripts (read-only)
bun ./src/cli.ts audit --agent-id "$AGENT_ID" --start-date 2026-06-01

# Inspect the source skill catalog for agents/tooling
bun ./src/cli.ts manifest --json
bun ./src/cli.ts search project --json
bun ./src/cli.ts gaps --json

# Scaffold a new skill from the authoring template
bun ./src/cli.ts new my-skill --copy-template --json

# Install Agent Skills for Letta Code
bun ./src/cli.ts install project --agent letta-code --scope local

# Install Agent Skills for Pi; Pi exposes them as /skill:<name>
bun ./src/cli.ts install project --agent pi --scope local

# Install namespaced Agy skills; Agy exposes them as /mh-<name>
bun ./src/cli.ts install project --agent agy --scope local

# Target an isolated/global Pi configuration explicitly
PI_CODING_AGENT_DIR="$HOME/.9router-free/pi-pilot/home/.pi/agent" \
  bun ./src/cli.ts install --agent pi --scope global
```

More detail lives in:

- CLI spec v0: [`docs/cli/spec-v0.md`](./docs/cli/spec-v0.md)
- CLI test matrix v0: [`docs/cli/test-matrix-v0.md`](./docs/cli/test-matrix-v0.md)
- Adapter compatibility matrix: [`docs/cli/adapter-compatibility-matrix-v0.md`](./docs/cli/adapter-compatibility-matrix-v0.md)
- Adapter implementation plan: [`docs/cli/adapter-implementation-plan-v0.md`](./docs/cli/adapter-implementation-plan-v0.md)

## Skills

Runtime inventory is defined by [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json). Agent-facing discovery notes live in [`skills/llms.txt`](./skills/llms.txt).

| Skill | Command | Use when |
| --- | --- | --- |
| `asset-designer` | `/asset-designer` | You need a website asset plan, cutout workflow, layer split, or production-ready asset pack. |
| `auditing-context-contracts` | `/auditing-context-contracts` | APIs, routes, packages, capabilities, ownership, generated prose, comments, agent-state, or historical records may disagree with current source/runtime truth and need an evidence-backed audit or authorized repair. |
| `codex-asset-production` | `/codex-asset-production` | You need Codex to coordinate imagegen/source-art and asset-designer dicut/cleanup/QA lanes for production-ish assets. |
| `control-room-goals` | `/control-room-goals` | You need to draft, apply, or refine a Goal Mode objective, DoD, immediate next action, verification evidence, handoff/reset boundary, optional Execution Run/Code Evidence ownership, or a model-aware execute-to-DoD pilot for non-trivial work. |
| `cocoindex-rules-init` | `/cocoindex-rules-init` | A repo needs AGENTS.md semantic-search guidance, portable project settings policy, filename-only preflight, or explicit strict-scan integration with `cocoindex-code` / `ccc`. |
| `direct-cli` | `/direct-cli` | You need pane-first Cursor, Antigravity, Codex, or bounded Pi lanes through auto-selected Herdr/tmux backends, including multi-pane fanout or detached Herdr result collection where the lane has named-agent lifecycle. |
| `fable` | `/fable` | You explicitly want Fable-style work, static checks disagree with required runtime behavior, the same hypothesis failed twice, or at least two hard-task signals justify bounded hypotheses, adaptive lanes, and fresh verification—not Cursor Fable model selection. |
| `forward` | `/forward` | You are wrapping work forward for the next session. |
| `game-production` | `/game-production` | You need a whole-game production inventory, maturity/readiness audit, specialist-lane plan, cross-domain QA, or release gate. |
| `gemini` | `/gemini` | You need to control Gemini via MQTT WebSocket. |
| `learn` | `/learn` | You want to study a repository with parallel agents. |
| `mac-calendar-booking` | `/mac-calendar-booking` | You need to add a confirmed event to macOS Calendar safely. |
| `mahiro-docs-rules-init` | `/mahiro-docs-rules-init` | A repo needs AGENTS.md and Mahiro-style docs bootstrapping. |
| `mahiro-guidance-refine` | `/mahiro-guidance-refine` | You need to turn session feedback into approved docs, rules, or style guidance updates. |
| `mahiro-style` | `/mahiro-style` | You need Mahiro's cross-repo code style doctrine. |
| `motion-design` | `/motion-design` | You explicitly need a UI/product motion brief, motion personality or tokens, timing/easing/spring/stagger decisions, choreography, interaction-state motion, reduced-motion planning, or rendered motion audit—not ordinary frontend work or game VFX. |
| `project` | `/project` | You need to learn, incubate, find, or list tracked repos. |
| `recap` | `/recap` | You need session orientation, current focus, or status. |
| `rrr` | `/rrr` | You need a retrospective and durable lesson notes. |
| `sprite-workflow` | `/sprite-workflow` | You need attributed sprite prompts/templates, imagegen handoff, motion-reference intake, chroma/grid extraction, anchor/scale/alpha/motion QA, native-grid recovery, approved atlas assembly, previews, or promotion gates. |
| `studying-codrops` | `/studying-codrops` | You explicitly want to map or learn from Codrops/Tympanus articles, demos, source repos, showcases, case studies, spotlights, or archives without treating Codrops as a universal frontend style. |
| `vfx-workflow` | `/vfx-workflow` | You need mechanically truthful game VFX cues, sockets, timing, geometry, accessibility, pooling, effect budgets, runtime QA, or promotion gates. |
| `web-asset-prompts` | `/web-asset-prompts` | You need production-ready image-generation prompts for real website assets. |
| `watch` | `/watch` | You want Gemini transcription plus local captions and learning-note capture for a YouTube video. |

## Bundles

| Bundle | Install | Use |
| --- | --- | --- |
| Orientation | `bun ./src/cli.ts install recap rrr forward --agent opencode --scope local` | `/recap --now`, `/rrr`, `/forward` |
| CocoIndex rules | `bun ./src/cli.ts install cocoindex-rules-init --agent opencode --scope local` | Add or patch AGENTS.md with semantic routing, portable settings policy, filename-only preflight, and explicit strict-scan guidance |
| Project tracking | `bun ./src/cli.ts install project learn --agent opencode --scope local` | `/project learn`, `/project incubate`, `/learn` |
| Repo doctrine | `bun ./src/cli.ts install auditing-context-contracts mahiro-docs-rules-init cocoindex-rules-init mahiro-guidance-refine mahiro-style --agent opencode --scope local` | Audit active context contracts, bootstrap docs, add CocoIndex-first search rules, refine guidance from feedback, and apply the Mahiro style lens |
| Direct execution | `bun ./src/cli.ts install direct-cli watch --agent opencode --scope local` | Cursor, Antigravity, Codex, bounded Pi, supported multi-pane fanout, transcript lanes |
| Hard-task orchestration | `bun ./src/cli.ts install fable control-room-goals direct-cli recap rrr --agent opencode --scope local` | Mission/DoD framing, causal hypotheses, adaptive lanes, bounded retries, fresh verification, and durable closeout |
| Creative web study | `bun ./src/cli.ts install studying-codrops learn --agent opencode --scope local` | Codrops evidence study and linked source-repo exploration |
| Motion design | `bun ./src/cli.ts install motion-design studying-codrops --agent opencode --scope local` | Explicit product-motion systems and audits with optional Codrops evidence |
| Web assets | `bun ./src/cli.ts install web-asset-prompts asset-designer codex-asset-production sprite-workflow --agent opencode --scope local` | Asset packs, Codex asset lanes, image prompts, and sprite handoff/QA |
| Game production | `bun ./src/cli.ts install game-production vfx-workflow sprite-workflow codex-asset-production asset-designer --agent opencode --scope local` | Whole-game inventory/readiness, runtime VFX truth, asset production lanes, performance/device QA, and release gates |
| Multi-agent install | `bun ./src/cli.ts install project --agent cursor,agy,letta-code,pi --scope local` | Install one skill across adapters |

## Runtime prerequisites

| Workflow | Extra runtime tools |
| --- | --- |
| `project`, `learn` | `ghq`, `git`, GitHub network access |
| `direct-cli` | Cursor CLI, Antigravity CLI (`agy`), Codex CLI, and/or Pi plus either Herdr or tmux. Auto uses Herdr only from a healthy compatible managed pane; otherwise tmux is required. Pi requires an explicit tool allowlist and provider/model preflight; custom Pi wrappers use generic pane control and do not support detach/fanout yet. Multi-pane jobs use one named Herdr tab or tmux session. Detached jobs are Herdr-only, support same-conversation wake-and-collect through a runtime background monitor, and persist watcher/results for durable `list`/`show`/`collect` fallback; the shell watcher itself does not inject into Letta conversations. For Agy, prefer foreground-verified stable `--model` slugs, reject fallback warnings/model mismatches, and use `--prompt-interactive` for fresh multiline prompts. |
| `gemini`, `watch` | Gemini web/runtime setup; some flows use browser/MQTT extension support |
| `watch` | YouTube access; transcript availability varies by video |
| `rrr`, `recap`, `forward` | Repo-local `.agent-state` conventions |
| `studying-codrops` | Public Codrops/Tympanus pages and APIs; optional browser automation and GitHub access for live demo/source evidence. Generated metadata stays session-only unless project retention is explicitly approved. |
| `sprite-workflow` | `python3`, ImageMagick `magick`, and Pillow for hash-pinned production validation/promotion, GIF, native-grid, and atlas lanes; optional `ffmpeg` + `ffprobe` for bounded motion-reference intake. Use a Python interpreter that actually resolves `import PIL`. Catalog, manifest, QA, review, and promotion helpers are bundled. |

## Repo map

- `skills/<name>/...` — packaged skills and helper resources
- `skills/llms.txt` — compact skill discovery index for agents and humans
- `commands/<name>.md` — slash-command wrappers for non-Gemini adapters
- Agy local installs copy transformed, self-contained skills to `.agents/skills/mh-<name>/`; global installs use `~/.gemini/config/skills/mh-<name>/`. The installed frontmatter name is `mh-<name>`, model invocation is disabled on the alias, and any source `disable-slash-command` flag is removed so Agy registers `/mh-<name>`.
- Letta Code local installs use `.agents/skills/<name>/`; global installs use `~/.letta/skills/<name>/`
- Pi local installs use `.pi/skills/<name>/`; global installs use `${PI_CODING_AGENT_DIR:-~/.pi/agent}/skills/<name>/`. Pi discovers the skill and exposes `/skill:<name>` without a copied command wrapper.
- `examples/` — runnable or copyable workflow examples for the CLI/TUI surface
- `template/SKILL.md.template` — authoring-only starter that `new --copy-template` materializes as `SKILL.md`; the non-canonical filename prevents external Agent Skills discovery from treating the scaffold as installable
- `.claude-plugin/marketplace.json` — default bundle metadata
- `bun ./src/cli.ts manifest --json` — machine-readable source catalog for skills, command coverage, bundle membership, and inventory gaps
- `bun ./src/cli.ts audit [--data-dir <local-backend-dir>] [--agent-id <id>] [--start-date <ISO>] [--end-date <ISO>]` — read-only local Letta transcript audit that counts explicit `Skill` tool calls, identifies unobserved packaged skills, and separates names outside this repo's current catalog without exposing transcript text
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
- The installer rewrites staged installed markdown descriptions without mutating repo source. The Agy adapter additionally rewrites only the staged alias frontmatter needed for the `mh-<name>` slash identity and user-only invocation contract.
- Skills that read or write local `.agent-state` data should resolve `REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"` first, then default `AGENT_STATE_DIR` to `$REPO_ROOT/.agent-state` unless the human overrides it.
- The `gemini` skill remains the heaviest subtree and is still treated as an opaque copied tree.

## Source of truth

- `skills/` is the source of truth for packaged agent behavior.
- `commands/` are compatibility wrappers for non-Gemini slash-command entrypoints.
- CLI v0 targets `opencode`, `claude-code`, `cursor`, `agy`, `codex`, `letta-code`, and `pi` for packaged skill installs. Agy, Letta Code, and Pi do not copy command-wrapper artifacts: Agy registers only namespaced skill aliases as `/mh-<name>`, while Pi creates `/skill:<name>` from discovered Agent Skills.
- Gemini extension assets are still copied as packaged subtree content, not modeled as a full extension setup flow.
- Prefer the source files in this repository and tagged releases over installed copies. Installed copies are useful evidence when debugging drift, but they are not the canonical authoring surface.
