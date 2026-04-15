---
name: project
description: Clone and track external repos for study or development. Use when a human shares a GitHub URL, wants to study a repo, start active work, search repos, find repo paths, or list tracked projects. Actions — learn (study), incubate (development), search/find, and list.
---

# /project - Project Tracking

Track and manage external repos: Learn (study) | Incubate (develop)

## Golden Rule

**ghq owns the clone → .agent-state owns the symlink**

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

- `learn` → `$LEARN_DIR/<owner>/<repo>/origin`
- `incubate` → `$INCUBATE_DIR/<owner>/<repo>`

## When to Use

Invoke this skill when:
- A human shares a GitHub URL and wants to study or clone it
- A human wants to learn from a codebase
- A human wants to start developing on an external repo
- You need to find where a previously cloned project lives

## Actions

### learn [url|slug]

Clone repo for **study** (read-only reference).

```bash
ghq get -u https://github.com/owner/repo

mkdir -p "$LEARN_DIR/owner/repo"
ln -sf "$(ghq root)/github.com/owner/repo" "$LEARN_DIR/owner/repo/origin"
```

**Output**: `✓ Linked [repo] to $LEARN_DIR/owner/repo/origin`

### incubate [url|slug] [--offload|--contribute|--flash]

Clone repo for **active development** with optional workflow flags.

```bash
ghq get -u https://github.com/owner/repo

mkdir -p "$INCUBATE_DIR/owner"
ln -sf "$(ghq root)/github.com/owner/repo" "$INCUBATE_DIR/owner/repo"
```

**Output**: `✓ Linked [repo] to $INCUBATE_DIR/owner/repo`

#### Workflow Flags

| Flag | Scope | Duration | Cleanup |
|------|-------|----------|---------|
| (none) | Long-term dev | Weeks/months | Manual |
| `--offload` | Manual trigger | — | Remove symlink (keep ghq) |
| `--contribute` | Multi-feature | Days/weeks | Offload when all done (keep ghq for PR feedback) |
| `--flash` | Single fix | Minutes | Issue → PR → offload → purge (one shot) |

#### --offload

Remove the symlink after work is done (manual trigger):

```bash
unlink "$INCUBATE_DIR/owner/repo"
rmdir "$INCUBATE_DIR/owner" 2>/dev/null
```

#### --contribute

For multi-feature contributions over days/weeks. Offload when all work is done, but keep the ghq clone for PR follow-up.

#### --flash

Complete contribution cycle with full cleanup:

```
/project incubate URL --flash
    ↓
1. gh issue create → #N
2. ghq get → symlink to .agent-state/incubate/
3. git checkout -b issue-N-description
4. Make changes, commit
5. git push → gh pr create --body "Closes #N"
6. cd back to main repo
7. Auto-offload + purge clone
```

### find [query]

Search for a project across tracked learn repos, tracked incubate repos, and canonical ghq clones.

Do not dump raw shell output directly. Read the results and render them as a compact markdown table.

**Output format:**

```markdown
| Scope | Project | Target |
|-------|---------|--------|
| learn | owner/repo | /absolute/path |
| incubate | owner/repo | /absolute/path |
| ghq | github.com/owner/repo | /absolute/path |
```

If there are no matches, print: `No matching projects found.`

### list

Show all tracked projects.

Do not paste raw shell output directly. Always render the final answer in three sections with stable formatting.

### Required Output Shape

1. `## 📚 Learn`
2. `## 🌱 Incubate`
3. `## 🏠 External (ghq)`

For `Learn` and `Incubate`, render markdown tables with this schema:

```markdown
| Project | Target | Status |
|---------|--------|--------|
| owner/repo | /absolute/path | ✅ ok |
| owner/repo | /absolute/path | ⚠️ broken |
```

- `Project` = tracked repo slug
- `Target` = resolved symlink target
- `Status` = `✅ ok` if the target exists, `⚠️ broken` if the symlink is broken

For `External (ghq)`, render a compact table:

```markdown
| Repo |
|------|
| github.com/owner/repo |
```

If a section has no entries, print `(none)` under that section instead of a table.

After the sections, if any broken symlinks exist, print:

```markdown
## ⚠️ Broken Links

- owner/repo -> /missing/target
```

## Directory Structure

```
.agent-state/
├── learn/
│   ├── .origins
│   └── owner/
│       └── repo/
│           └── origin -> ~/ghq/.../github.com/owner/repo
└── incubate/
    └── owner/
        └── repo -> ~/ghq/.../github.com/owner/repo
```

## Health Check

When listing, verify links are valid.

- Learn repo is healthy when `.agent-state/learn/<owner>/<repo>/origin` resolves.
- Incubate repo is healthy when `.agent-state/incubate/<owner>/<repo>` resolves.

If broken, re-run `/project learn ...` or `/project incubate ...` to restore the link.

## Examples

```
User: "I want to learn from https://github.com/SawyerHood/dev-browser"
→ ghq get -u https://github.com/SawyerHood/dev-browser
→ mkdir -p .agent-state/learn/SawyerHood/dev-browser
→ ln -sf "$(ghq root)/github.com/SawyerHood/dev-browser" .agent-state/learn/SawyerHood/dev-browser/origin

User: "I want to work on claude-mem"
→ /project incubate https://github.com/thedotmack/claude-mem
→ Symlink created, work until done

User: "Quick README fix on oracle-family-skills"
→ /project incubate https://github.com/mahirocoko/oracle-family-skills --flash
→ Issue created
→ Branch + edit + PR
→ Auto-offload + purge
```

## Anti-Patterns

| ❌ Wrong | ✅ Right |
|----------|----------|
| `git clone` directly to `.agent-state/` | `ghq get` then symlink |
| Flat: `.agent-state/learn/repo-name` | Owner structure: `.agent-state/learn/owner/repo` |
| Copy files | Symlink always |
| Manual clone outside ghq | Everything through ghq |

## Quick Reference

```bash
# Add to learn
ghq get -u URL && mkdir -p "$LEARN_DIR/owner/repo" && ln -sf "$(ghq root)/github.com/owner/repo" "$LEARN_DIR/owner/repo/origin"

# Add to incubate
ghq get -u URL && mkdir -p "$INCUBATE_DIR/owner" && ln -sf "$(ghq root)/github.com/owner/repo" "$INCUBATE_DIR/owner/repo"

# Offload incubate only
unlink "$INCUBATE_DIR/owner/repo"

# Update source
ghq get -u URL

# Find repo
ghq list | grep name
```

## Workflow Intensity Scale

```
incubate        → Long-term dev (manual cleanup)
    ↓
--contribute    → Push → offload (keep ghq)
    ↓
--flash         → Issue → Branch → PR → offload → purge (complete cycle)
```

## Notes

- `list` is not `learn`-only. It must include `incubate` unless scoped.
- If a repo is tracked in both modes, preserve both entries.
- If you cannot rely on an executable helper script, perform the lookup directly from the tracked directories above.
