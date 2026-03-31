# mahiro-skills

`mahiro-skills` packages Mahiro's local agent bundle as repo-managed `skills/`, `commands/`, and a Bun CLI that installs those assets into supported agent roots.

This repo ships a private Bun CLI and installs from repo contents. It is not an npm-published binary package.

## Table of Contents

- [Install](#install)
  - [Prerequisites](#prerequisites)
  - [Quick install via curl](#quick-install-via-curl)
  - [Install from a local checkout](#install-from-a-local-checkout)
  - [What the installer actually does](#what-the-installer-actually-does)
- [CLI](#cli)
- [Repo layout](#repo-layout)
- [Included skills](#included-skills)
- [Included commands](#included-commands)
- [Packaging notes](#packaging-notes)
- [Current status](#current-status)
- [Source of truth](#source-of-truth)

## Install

### Prerequisites

- `bun`
- `git`
- `bash`
- `curl`

### Quick install via curl

Install the default bundle globally for OpenCode from the `v0.1.4` tag:

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.4 -- --agent opencode --scope global
```

Install a selected skill locally instead:

```bash
curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.4 -- project --agent opencode --scope local
```

### Install from a local checkout

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

## CLI

- CLI spec v0: [`docs/cli/spec-v0.md`](./docs/cli/spec-v0.md)
- CLI test matrix v0: [`docs/cli/test-matrix-v0.md`](./docs/cli/test-matrix-v0.md)
- CLI entrypoint: [`src/cli.ts`](./src/cli.ts)

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
# Show a dry-run plan for the default bundle in the current project
bun ./src/cli.ts plan --agent opencode --scope local

# Install selected skills locally for OpenCode
bun ./src/cli.ts install project recap --agent opencode --scope local

# Install the default bundle globally for Claude Code
bun ./src/cli.ts install --agent claude-code --scope global

# List installed items for one adapter/scope
bun ./src/cli.ts list --agent opencode --scope local

# Run integrity checks for one adapter
bun ./src/cli.ts doctor --agent claude-code --scope global
```

## Repo layout

- `skills/<name>/...` — packaged skills and helper resources
- `commands/<name>.md` — slash-command wrappers
- `template/SKILL.md` — starter template for new skills
- `.claude-plugin/marketplace.json` — default bundle metadata
- `docs/cli/` — CLI spec and acceptance matrix
- `src/` and `test/` — Bun + TypeScript CLI implementation and tests

For the Gemini extension subtree, see [`skills/gemini/extension/README.md`](./skills/gemini/extension/README.md).

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

- Source content is copied from the repo layout and treated as the canonical package source.
- The installer rewrites only staged installed markdown descriptions; it does not mutate source markdown in the repo.
- When a file referenced an install-local absolute path, it was normalized to a repo-local path.
- Skills that read or write local `.agent-state` data should resolve `REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"` first, then default `AGENT_STATE_DIR` to `$REPO_ROOT/.agent-state` unless the human overrides it.
- The `gemini` skill remains the heaviest subtree and is still treated as an opaque copied tree.

## Current status

- `skills/` is the source of truth for packaged agent behavior.
- `commands/` are compatibility wrappers for agents that support slash-command entrypoints.
- CLI v0 currently targets `opencode` and `claude-code` first.
- Global and local installation scopes are first-class in the current scaffold and tests.

## Source of truth

If you refresh this repo later, prefer the currently installed local copies over stale repo snapshots.
