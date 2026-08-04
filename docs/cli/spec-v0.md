# mahiro-skills CLI Spec v0

This document defines the first implementation target for a `mahiro-skills` CLI.

The CLI exists to install the packaged repo contents in agent-specific locations while preserving the repo as the canonical source of truth.

## Goals

- Install `skills/` content for supported agents.
- Install `commands/` content when the target agent supports command wrappers.
- Support both `global` and `local` installation scopes as first-class concepts.
- Use adapter-specific rules instead of assuming all agents map to the same filesystem shape.
- Be safe by default through planning, dry runs, and explicit collision handling.
- Uninstall receipt-recorded skills/commands from one or more agents without guessing beyond the receipt.

## Non-goals for v0

- Remote registries or marketplace publishing.
- Automatic zip artifact generation.
- Skill behavior translation between agents.
- Symlink mode as the default install behavior.
- Uninstall garbage collection beyond receipt-recorded skill/command targets.
- Automatic MCP server provisioning for every skill.

## Repo model

The repo is the canonical package source.

### Canonical inputs

- `skills/<name>/...`
- `commands/<name>.md`
- `commands-gemini/mh-<name>.toml`
- `.claude-plugin/marketplace.json`
- `template/`

### Installable units

| Unit | Meaning | Installable in v0 |
|------|---------|-------------------|
| bundle | Logical group of skills/commands | Yes |
| skill | A directory under `skills/` | Yes |
| command | A packaged command artifact resolved by the adapter | Yes, if adapter supports commands |
| template | Authoring scaffold | No |
| plugin metadata | Source metadata for bundle discovery | Adapter-dependent |

### Asset handling

Skill directories are copied as opaque trees.

Examples:
- `skills/project/scripts/`
- `skills/recap/references/`
- `skills/gemini/extension/`

The CLI must not reinterpret internal skill files beyond path planning and collision checks.

## Terminology

- **agent**: install target such as `opencode`, `claude-code`, `cursor`, `gemini`, `codex`, `letta-code`, or `pi`
- **scope**: `global` or `local`
- **adapter**: target-specific planner and installer for one agent
- **bundle**: named install group defined by manifest or default repo bundle
- **receipt**: machine-readable record of installed files written by the CLI
- **plan**: dry-run output describing what would be installed where

## Supported agents in v0

v0 defines adapter contracts for all researched agents.

Currently implemented runtime targets are:

1. `opencode`
2. `claude-code`
3. `cursor`
4. `gemini`
5. `codex`
6. `letta-code`
7. `pi`

For the current Cursor and Gemini rollout history plus the remaining follow-on planning, see:

- [`cursor-gemini-compatibility-matrix-v0.md`](./cursor-gemini-compatibility-matrix-v0.md)
- [`adapter-implementation-plan-v0.md`](./adapter-implementation-plan-v0.md)

## Capability matrix

| Agent | Skills | Commands | Bundle metadata | MCP sidecar | Local instructions |
|------|--------|----------|-----------------|-------------|--------------------|
| opencode | Yes | Yes | Partial | Yes | Yes |
| claude-code | Yes | Yes | Yes | Yes | Yes |
| cursor | Yes | Yes | Yes | Yes | Yes |
| gemini | Yes | Yes | Partial | Partial | Yes |
| codex | Yes | Partial | Yes | Yes | Yes |
| letta-code | Yes | No | Partial | Partial | Yes |
| pi | Yes | No | Partial | No | Yes |

The Pi adapter manages only skill files and receipts. Installing the adapter does not install a Pi executable, add `pi` to `PATH`, or create provider configuration.

Interpretation rules:

- `Yes` means the adapter may install that asset type directly.
- `Partial` means the adapter must degrade gracefully and may emit only a subset.
- Unsupported surfaces must be skipped with an explicit note in the install result.

## Scope semantics

`global` and `local` are adapter-resolved, not hardcoded globally.

| Agent | Global root | Local root |
|------|-------------|------------|
| opencode | `~/.config/opencode` | `.opencode` |
| claude-code | `~/.claude` | `.claude` |
| cursor | `~/.cursor` | `.cursor` |
| gemini | `~/.gemini` | `.gemini` |
| codex | `~/.codex` | `.codex` |
| letta-code | `~/.letta` | `.agents` |
| pi | `${PI_CODING_AGENT_DIR:-~/.pi/agent}` | `.pi` |

If an agent has multiple valid roots, the adapter must resolve one canonical root and report it in the plan.

## Install behavior

### Default command surface

```text
mahiro-skills plan [items...] --agent <agent> [--agent <agent> ...] --scope <global|local>
mahiro-skills install [items...] --agent <agent> [--agent <agent> ...] --scope <global|local>
mahiro-skills uninstall [items...] --agent <agent|all> [--agent <agent> ...] --scope <global|local>
mahiro-skills list --agent <agent> [--agent <agent> ...] --scope <global|local>
mahiro-skills doctor --agent <agent> [--agent <agent> ...] [--scope <global|local>]
mahiro-skills audit [--data-dir <local-backend-dir>] [--agent-id <id>] [--start-date <ISO>] [--end-date <ISO>] [--json]
mahiro-skills manifest [--json]
mahiro-skills search <query> [--json]
mahiro-skills gaps [--json]
mahiro-skills new <skill-name> --copy-template [--json]
mahiro-skills tui [items...] [--mode <plan|install|uninstall|list|update>] [--agent <agent> ...] [--scope <global|local>] [--overwrite] [--yes]
mahiro-skills guided [items...] [--mode <plan|install|uninstall|list|update>] [--agent <agent> ...] [--scope <global|local>] [--overwrite] [--yes]
```

### Source catalog / agent-facing inventory

The CLI also exposes read-only source-catalog commands for agents and authoring checks. They do not require `--agent` or `--scope`, and `--json` is accepted as an explicit no-op because direct CLI output is JSON by default.

- `manifest` returns the machine-readable source catalog: repo root, skills, commands, bundles, default bundle, per-skill command coverage, and inventory gaps.
- `search <query>` searches skill names and descriptions, returning scored matches with command coverage and default-bundle membership.
- `gaps` returns the authoring gap report for missing `SKILL.md` files, frontmatter name mismatches, command/skill mismatches, stale bundle references, and default-bundle omissions.
- `new <skill-name> --copy-template` copies the starter `template/` tree into `skills/<skill-name>/`, rewrites minimal `SKILL.md` frontmatter/title placeholders, refuses collisions, and returns manual next steps for marketplace, command wrappers, `skills/llms.txt`, README, and tests.
- `audit` reads local Letta JSONL transcripts without modifying them. It counts only explicit `Skill` tool calls, compares observed names against this repo's current source catalog, and returns counts/timestamps/conversation totals plus parse warnings. Names outside the catalog may be built-in, separately installed, or retired; the audit does not classify them further. It never infers calls from prose or returns transcript text. By default it reads `~/.letta/lc-local-backend`; `--data-dir` overrides that root for another local backend or fixture.

Except for `audit`, these commands inspect or scaffold repo source (`skills/`, `commands/`, `commands-gemini/`, `.claude-plugin/marketplace.json`, `template/`) only. `audit` reads local transcript evidence only; none of these commands modify install targets. The `new` command intentionally does not auto-edit marketplace, command wrappers, README, or discovery indexes in v0.

### Guided / TUI command behavior

- `tui` and `guided` share the same planner, installer, list, and receipt-driven uninstaller core but own different interaction shells.
- **Full-screen manager:** interactive `tui` without `--mode` uses an alternate screen when the terminal is not `TERM=dumb` and is at least `72x18`. Its fixed flow is `Target → Action → Skills → Review → Result`; it restores raw mode, cursor, alternate screen, and input flow on every exit path and redraws on resize.
- **Target:** All agents is first and exclusive; selecting an individual changes the model to a custom set. Every supported agent is selectable, one local/global scope radio applies to the batch, scope defaults to `global`, and explicit CLI-supplied agents/scope remain authoritative.
- **Action:** Install, Update, Uninstall, and Inspect are plain-language choices. **Skills** derives a per-agent inventory from selected snapshots: source names, receipt-only names for Inspect/Uninstall, coverage counts, disabled no-ops, command capability, and explicit unknown state for unreadable receipts.
- **Review:** a full scrollable step, not an overlay. It shows every selected agent, root, action, skip, warning, collision, overwrite/remove path, and the sequential/no-rollback rule. Paths are hard-wrapped rather than shortened. Enter is the first point that may execute; collision and modified/legacy acknowledgements are required, and any unreadable selected-agent receipt blocks the batch until Target is corrected.
- **Result:** agents execute sequentially. The first thrown failure stops the batch and later agents are Not attempted. The screen preserves per-agent success, skips, errors, and receipt evidence plus Completed, Completed with skips, Partially completed, Failed, or No changes aggregation.
- Primary controls are visible `↑/↓`, `Space`, `Enter`, `Esc`, and `Ctrl+C`; the flow does not require mnemonic action keys. Search remains optional and Esc clears its query before backing out.
- Install skips receipt-installed names rather than rewriting them. Update executes only selected applicable names per agent. Uninstall delegates receipt-driven filtering to the existing core APIs. Letta Code and Pi command omission remains adapter-derived and is shown as skills-only.
- `guided` remains the prompt-by-prompt compatibility workflow: Home offers Install, Uninstall, Update installed, List installed, Receipt detail, and Exit; nested prompts retain Back-to-Home and explicit confirmation behavior.
- Explicit `tui --mode ...`, small terminals, and `TERM=dumb` route to the guided compatibility path. Non-interactive `tui`/`guided` also use that path and retain their established required-flag rules.
- Guided item/agent selection, direct repeated/comma-separated `--agent` flags, `--agent all`, and receipt detail remain unchanged and continue to use the shared core APIs.

### Items

If no items are provided, install the default bundle.

Default bundle resolution rule:

- Use the first bundle declared in `.claude-plugin/marketplace.json`.
- In the current repo, that bundle is `mahiro-local-bundle`.
- If bundle metadata is missing or unreadable, fall back to all packaged skills plus supported commands.

Accepted item forms:

- bundle name
- skill name
- command name

Name resolution rule:

- If an item matches a bundle name, install the bundle-defined skills and commands.
- If an item matches a skill name, install that skill.
- If the same name also exists under `commands/` and the adapter supports commands, install the same-named command as part of the same request.
- If an item matches only a command name, install that command only.
- If an item matches nothing, fail planning with an explicit unknown-item error.

### Default installation rules

- Default mode is `copy`.
- `install` must internally run the same planning logic as `plan`.
- `install` without explicit overwrite must fail on collisions.
- `plan` never writes files.

## Planner contract

Every adapter must emit a normalized plan with these fields:

```json
{
  "agent": "opencode",
  "scope": "local",
  "root": ".opencode",
  "requested": ["project", "recap"],
  "skills": [
    {
      "name": "project",
      "source": "skills/project",
      "target": ".opencode/skills/project",
      "action": "copy"
    }
  ],
  "commands": [
    {
      "name": "project",
      "source": "commands/project.md",
      "target": ".opencode/commands/project.md",
      "action": "copy"
    }
  ],
  "skipped": [],
  "warnings": []
}
```

## Collision policy

Collision is any target path that already exists before install.

v0 rules:

- `plan` reports collisions.
- `install` fails on collisions by default.
- `install --overwrite` may replace collided targets.
- Overwrite is file-tree replacement for the planned target only.
- Each planned target must be staged before replacement so individual target writes are not left half-written.
- Full multi-target rollback is not required in v0.

## Idempotency

Repeated installs with unchanged source content should converge to the same target state.

Incremental installs merge newly installed skill/command names and target fingerprints into the matching existing receipt. They do not discard earlier receipt entries merely because the current invocation names only one new item; the command result still reports only targets written by the current invocation.

v0 requires an install receipt written under the adapter root.

Recommended receipt path pattern:

```text
<root>/.mahiro-skills/receipts/<scope>-<agent>.json
```

Receipt fields:

- schema version (`2` for fingerprinted receipts; absent means legacy)
- agent
- scope
- installed skills
- installed commands
- source repo path
- per-target kind/name, source-content hash, and expected installed-content hash
- install timestamp

Fingerprint status rules:

- `current`: current source and installed target match the receipt hashes.
- `outdated`: source changed while the installed target still matches its recorded installed hash.
- `modified`: installed target differs from its recorded installed hash.
- `missing`: a receipt-recorded target is absent.
- `legacy`: the receipt has no complete v2 fingerprint evidence.

Hashes are deterministic SHA-256 fingerprints over sorted path entries, file content, symlink destinations, and permission bits. They are freshness/drift evidence, not signatures or a trust boundary.

## Uninstall behavior

Uninstall is receipt-driven and intentionally conservative.

Rules:

- `uninstall <items...>` only removes items recorded in the matching install receipt for the selected agent and scope.
- `uninstall` with no items removes every skill and command recorded in the receipt.
- If a name is recorded as both a skill and command, uninstalling that name removes both targets.
- Missing target paths are treated as already absent; the receipt is still updated for the requested recorded item.
- Unknown or unrecorded items are reported as skipped and are not used to guess paths.
- When a receipt still has installed items after uninstall, it is rewritten with the remaining names and the original install timestamp preserved.
- When a receipt becomes empty, the receipt file is removed.
- Direct CLI supports `--agent all` as a shortcut for the full v0 adapter set.

## Adapter output rules

### OpenCode

- Install skills into `<root>/skills/`
- Install commands into `<root>/commands/`
- Do not synthesize plugins in v0

### Claude Code

- Install skills into `<root>/skills/`
- Install commands into `<root>/commands/`
- `.claude-plugin/marketplace.json` remains repo metadata in v0, not an installed artifact by default

### Cursor

- Prefer repo-local rules/instructions fallback if a full command surface is not preserved
- Commands may be skipped with a warning if unsupported by the chosen install mode

### Gemini

- Install packaged skills into `<root>/skills/`
- Install packaged Gemini commands from `commands-gemini/mh-*.toml` into namespaced `<root>/commands/mh-*.toml` targets
- Preserve `skills/gemini/extension/` as an opaque copied subtree when the `gemini` skill is installed
- Do not describe extension loading or settings setup as full adapter support in v0

### Codex

- Install packaged skills into `<root>/skills/`
- Install packaged markdown commands into `<root>/commands/*.md` as compatibility output
- `AGENTS.md` integration is adapter-specific and deferred unless explicitly requested

### Letta Code

- Install packaged skills into `<root>/skills/`, which resolves to `.agents/skills/` locally and `~/.letta/skills/` globally
- Do not install command wrappers in v0 because Letta Code's documented Agent Skills surface defines skill directories, not a slash-command artifact directory
- Preserve skill directories as opaque Agent Skills-compatible trees with each `SKILL.md` and bundled resources intact

### Pi

- Install packaged skills into `<root>/skills/`, which resolves to `.pi/skills/` locally and `${PI_CODING_AGENT_DIR:-~/.pi/agent}/skills/` globally
- Honor `PI_CODING_AGENT_DIR` before the default global root so isolated Pi configurations can be targeted without rewriting `HOME`
- Do not install command wrappers because Pi discovers Agent Skills and exposes them as `/skill:<name>` commands itself
- Preserve skill directories as opaque Agent Skills-compatible trees; project-local `.pi` resources still require Pi project trust, or an explicit one-run `--approve`

## Result model

The installer must distinguish:

- `installed`
- `partially-installed`
- `skipped`
- `unsupported`

Example:

```json
{
  "status": "installed",
  "installed": ["gemini", "watch"],
  "skipped": [],
  "warnings": []
}
```

## Examples

### Install default bundle globally for OpenCode

```text
mahiro-skills install --agent opencode --scope global
```

### Install selected skills locally for Claude Code

```text
mahiro-skills install project recap rrr --agent claude-code --scope local
```

### Dry-run for Gemini

```text
mahiro-skills plan gemini watch --agent gemini --scope local
```

## Deferred after v0

- Standalone sync/update CLI command
- Registry publishing
- Zip artifact generation
- Symlink mode
- Automatic extension/plugin compilation
- Full MCP manifest generation

Follow-on adapter rollout history and current Pi support live in [`adapter-implementation-plan-v0.md`](./adapter-implementation-plan-v0.md).

## Acceptance criteria for implementation

- The CLI can produce a deterministic plan for at least `opencode` and `claude-code`.
- The CLI treats `global` and `local` as required install dimensions.
- The CLI installs opaque skill trees without rewriting internals.
- The CLI installs commands only when the target adapter supports them.
- The CLI records receipts for successful installs.
