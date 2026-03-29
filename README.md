# mahiro-skills

Packaged skills, command wrappers, and a CLI scaffold for Mahiro's local agent bundle.

This repo started as a distribution-friendly snapshot of the installed bundle under:

- `~/.config/opencode/skills`
- `~/.config/opencode/commands`

The layout is intentionally simple and repo-local, inspired by repositories like `anthropics/skills` and the Vercel Labs skill bundles:

- `skills/<name>/...` — packaged skills and helper resources
- `commands/<name>.md` — slash command wrappers
- `template/SKILL.md` — starter template for new skills
- `.claude-plugin/marketplace.json` — bundle metadata for plugin-style discovery
- `docs/cli/` — CLI spec and test matrix for future installer work
- `src/` and `test/` — Bun + TypeScript CLI v0 scaffold

## Current status

- `skills/` is the source of truth for packaged agent behavior.
- `commands/` are compatibility wrappers for agents that support slash-command style entrypoints.
- CLI v0 currently targets `opencode` and `claude-code` first.
- Global and local installation scopes are first-class in the spec and scaffold.

## Included skills

- `deep-research`
- `forward`
- `gemini`
- `learn`
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
- `/philosophy`
- `/project`
- `/recap`
- `/rrr`
- `/watch`

## Packaging notes

- Source content is copied as faithfully as possible from the installed local bundle.
- When a file referenced an install-local absolute path, it was normalized to a repo-local path.
- The repo is a packaging pass, not a behavior redesign.
- The `gemini` skill is the heaviest subtree; this pass packages its main skill doc plus extension metadata/docs/icons, but not every generated or binary extension artifact from the installed local copy.

## CLI

- CLI spec v0: [`docs/cli/spec-v0.md`](./docs/cli/spec-v0.md)
- CLI test matrix v0: [`docs/cli/test-matrix-v0.md`](./docs/cli/test-matrix-v0.md)
- CLI scaffold entrypoint: [`src/cli.ts`](./src/cli.ts)

### Supported v0 commands

- `plan`
- `install`
- `list`
- `doctor`

### Supported v0 adapters

- `opencode`
- `claude-code`

### Example usage

```bash
# Show a dry-run plan for the default bundle in the current repo
bun ./src/cli.ts plan --agent opencode --scope local

# Install selected skills locally for OpenCode
bun ./src/cli.ts install project recap --agent opencode --scope local

# Install the default bundle globally for Claude Code
bun ./src/cli.ts install --agent claude-code --scope global

# List installed items for one adapter/scope
bun ./src/cli.ts list --agent opencode --scope local

# Run basic integrity checks
bun ./src/cli.ts doctor --agent claude-code --scope global
```

## Source of truth

If you refresh this repo later, prefer the currently installed local copies over older repo content.
