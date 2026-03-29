# mahiro-skills CLI Spec v0

This document defines the first implementation target for a `mahiro-skills` CLI.

The CLI exists to install the packaged repo contents in agent-specific locations while preserving the repo as the canonical source of truth.

## Goals

- Install `skills/` content for supported agents.
- Install `commands/` content when the target agent supports command wrappers.
- Support both `global` and `local` installation scopes as first-class concepts.
- Use adapter-specific rules instead of assuming all agents map to the same filesystem shape.
- Be safe by default through planning, dry runs, and explicit collision handling.

## Non-goals for v0

- Remote registries or marketplace publishing.
- Automatic zip artifact generation.
- Skill behavior translation between agents.
- Symlink mode as the default install behavior.
- Uninstall garbage collection beyond installed receipt cleanup.
- Automatic MCP server provisioning for every skill.

## Repo model

The repo is the canonical package source.

### Canonical inputs

- `skills/<name>/...`
- `commands/<name>.md`
- `.claude-plugin/marketplace.json`
- `template/`

### Installable units

| Unit | Meaning | Installable in v0 |
|------|---------|-------------------|
| bundle | Logical group of skills/commands | Yes |
| skill | A directory under `skills/` | Yes |
| command | A markdown wrapper under `commands/` | Yes, if adapter supports commands |
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

- **agent**: install target such as `opencode`, `claude-code`, `cursor`, `gemini`, or `codex`
- **scope**: `global` or `local`
- **adapter**: target-specific planner and installer for one agent
- **bundle**: named install group defined by manifest or default repo bundle
- **receipt**: machine-readable record of installed files written by the CLI
- **plan**: dry-run output describing what would be installed where

## Supported agents in v0

v0 defines adapter contracts for all researched agents, but initial implementation priority is:

1. `opencode`
2. `claude-code`

The other agents remain first-class in the spec so the data model does not need redesign later.

## Capability matrix

| Agent | Skills | Commands | Bundle metadata | MCP sidecar | Local instructions |
|------|--------|----------|-----------------|-------------|--------------------|
| opencode | Yes | Yes | Partial | Yes | Yes |
| claude-code | Yes | Yes | Yes | Yes | Yes |
| cursor | Partial | Partial | Yes | Yes | Yes |
| gemini | Yes | Yes | Yes via extension | Yes | Yes |
| codex | Yes | Partial | Yes | Yes | Yes |

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
| cursor | `~/.cursor` or plugin-local root | `.cursor` |
| gemini | `~/.gemini` | `.gemini` |
| codex | `~/.codex` | `.codex` |

If an agent has multiple valid roots, the adapter must resolve one canonical root and report it in the plan.

## Install behavior

### Default command surface

```text
mahiro-skills plan [items...] --agent <agent> --scope <global|local>
mahiro-skills install [items...] --agent <agent> --scope <global|local>
mahiro-skills list --agent <agent> --scope <global|local>
mahiro-skills doctor --agent <agent> [--scope <global|local>]
```

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

v0 requires an install receipt written under the adapter root.

Recommended receipt path pattern:

```text
<root>/.mahiro-skills/receipts/<scope>-<agent>.json
```

Receipt fields:

- agent
- scope
- installed skills
- installed commands
- source repo path
- install timestamp

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

- Prefer extension-aware install planning when possible
- If v0 cannot emit a valid extension bundle, install skills/commands as a documented partial adapter result

### Codex

- Install skills to the codex skill root
- Treat commands as optional compatibility output
- `AGENTS.md` integration is adapter-specific and deferred unless explicitly requested

## Result model

The installer must distinguish:

- `installed`
- `partially-installed`
- `skipped`
- `unsupported`

Example:

```json
{
  "status": "partially-installed",
  "installed": ["project", "recap"],
  "skipped": [
    {
      "item": "gemini",
      "reason": "extension bundling not implemented for target"
    }
  ]
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

- Uninstall command
- Sync/update command
- Registry publishing
- Zip artifact generation
- Symlink mode
- Automatic extension/plugin compilation
- Full MCP manifest generation

## Acceptance criteria for implementation

- The CLI can produce a deterministic plan for at least `opencode` and `claude-code`.
- The CLI treats `global` and `local` as required install dimensions.
- The CLI installs opaque skill trees without rewriting internals.
- The CLI installs commands only when the target adapter supports them.
- The CLI records receipts for successful installs.
