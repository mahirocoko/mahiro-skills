---
name: project
description: Clone and track external repos for study or development. Use for learn, incubate, find, and list flows.
---

# /project - Project Tracking

Track external repos for two modes:

- `learn` = read-only study
- `incubate` = active development

## Golden Rule

**ghq owns the clone -> .agent-state owns the symlink**

Never copy a tracked repo into `.agent-state`. Keep one canonical clone and expose it via symlink.

## Resolve Paths First

Always resolve the local state root before handling any subcommand:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
LEARN_DIR="$AGENT_STATE_DIR/learn"
INCUBATE_DIR="$AGENT_STATE_DIR/incubate"
```

Tracked paths should use this shape:

- `learn` -> `$LEARN_DIR/<owner>/<repo>`
- `incubate` -> `$INCUBATE_DIR/<owner>/<repo>`

## Usage

```text
/project list
/project list learn
/project list incubate
/project find <query>
/project learn <github-url|owner/repo|repo>
/project incubate <github-url|owner/repo|repo>
```

## Command Rules

### `/project list`

`list` must inspect both tracking areas unless the human explicitly scopes it.

1. Read `learn` from `$LEARN_DIR/.origins` when that manifest exists.
2. Fall back to directory discovery under `$LEARN_DIR/<owner>/<repo>` when `.origins` is missing or incomplete.
3. Read `incubate` from directory discovery under `$INCUBATE_DIR/<owner>/<repo>`.
4. Ignore dotfiles, helper manifests, and non-project entries.
5. Return grouped output so the human can distinguish study repos from active work.

Preferred output shape:

```text
Learn
- owner/repo

Incubate
- owner/repo
```

If one section is empty, say so explicitly instead of silently omitting it.

### `/project find <query>`

Search across both `learn` and `incubate`.

- Prefer exact `owner/repo` matches first.
- If the human gives only a repo name, treat it as a fallback match.
- If the same repo exists in both modes, show both paths and label them.

### `/project learn <github-url|owner/repo|repo>`

Set up a repo for study.

1. Resolve the repo slug.
2. Reuse an existing canonical clone if already present.
3. Otherwise clone with `ghq`.
4. Create or refresh the symlink at `$LEARN_DIR/<owner>/<repo>`.
5. Update `$LEARN_DIR/.origins` when that manifest is used in this repo.

### `/project incubate <github-url|owner/repo|repo>`

Set up a repo for active development.

1. Resolve the repo slug.
2. Reuse an existing canonical clone if already present.
3. Otherwise clone with `ghq` or create the repo if the human explicitly asked for a new one.
4. Create or refresh the symlink at `$INCUBATE_DIR/<owner>/<repo>`.
5. Keep `incubate` separate from `learn`; do not collapse both into the same listing or path.

## Notes

- `list` is not `learn`-only. It must include `incubate` unless scoped.
- If a repo is tracked in both modes, preserve both entries.
- If you cannot rely on an executable helper script, perform the lookup directly from the tracked directories above.
