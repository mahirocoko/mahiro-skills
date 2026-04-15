---
name: project-manager
description: Manage project lifecycle - learn, incubate, spinoff, reunion, offload, history. Use ghq + .agent-state-backed symlinks.
---

# Project Manager Skill

Complete project lifecycle management with list, lookup, and lifecycle flows.

## Slug Format (Mixed Lookup)

Supports both formats:
- **Full**: `owner/repo` (priority)
- **Short**: `repo-name` (fallback)

```yaml
# .agent-state/memory/slugs.yaml
thedotmack/claude-mem: /absolute/path/to/ghq/clone
mahirocoko/oracle-family: /absolute/path/to/ghq/clone
```

## Commands

| Command | Action | Script |
|---------|--------|--------|
| `/project list [learn\|incubate]` | List tracked repos by mode | manual directory + manifest lookup |
| `/project find [query]` | Find tracked repos across both modes | manual directory + manifest lookup |
| `/project search [query]` | Search repos (local→remote) | `skills/project/scripts/search.ts` |
| `/project learn [url\|slug]` | Read-only study | `skills/project/scripts/learn.ts` |
| `/project incubate [name]` | Work (auto-create if needed) | `skills/project/scripts/incubate.ts` |
| `/project spinoff [name]` | Graduate to own repo | `skills/project/scripts/spinoff.ts` |
| `/project reunion [slug\|all]` | Sync learnings + offload | `skills/project/scripts/reunion.ts` |
| `/project offload [slug\|all]` | Remove symlinks (keep ghq) | `skills/project/scripts/offload.ts` |
| `/project index [slug\|all]` | Index manifests to local logs | `skills/project/scripts/index.ts` |
| `/project history [slug]` | Git timeline analysis | `skills/project/scripts/history.ts` |

## Lifecycle

```
/project search    → 🔍 Search repos (local ghq first, then GitHub)
/project learn     → 📚 Study external repo (.agent-state/learn/)
/project incubate  → 🌱 Work on project (.agent-state/incubate/, auto-create if needed)
/project spinoff   → 🎓 Graduate to own repo
/project reunion   → 🤝 Sync learnings + offload
/project offload   → 📤 Remove symlinks
/project index     → 📝 Index manifests to local logs
/project history   → 📊 Git activity analysis
```

## Resolve Paths First

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
```

Use that same rule in every example and helper script.

## Listing Rule

`/project list` should read both:

- `.agent-state/learn` using `.origins` when present, with directory fallback
- `.agent-state/incubate` using directory discovery

Return grouped output so `learn` and `incubate` never get conflated.

## Limits

| Type | Max | Reason |
|------|-----|--------|
| **Incubate** | 5 | Cognitive load — focus over quantity |
| Learn | No limit | Read-only, low overhead |

## Quick Reference

### Search (find repos)
```bash
bun skills/project/scripts/search.ts voice
bun skills/project/scripts/search.ts voice --remote
bun skills/project/scripts/search.ts --list-orgs
```

### Learn (read-only)
```bash
bun skills/project/scripts/learn.ts thedotmack/claude-mem
bun skills/project/scripts/learn.ts claude-mem
```

### Incubate (work, auto-create)
```bash
bun skills/project/scripts/incubate.ts <name> [--org mahirocoko]
```

### Spinoff (graduate)
```bash
bun skills/project/scripts/spinoff.ts <slug> <target-org/repo>
```

### Reunion (sync + offload)
```bash
bun skills/project/scripts/reunion.ts thedotmack/claude-mem
bun skills/project/scripts/reunion.ts claude-mem
bun skills/project/scripts/reunion.ts all
bun skills/project/scripts/reunion.ts all --keep
```

### Offload (remove symlinks)
```bash
bun skills/project/scripts/offload.ts mahirocoko/oracle-family
bun skills/project/scripts/offload.ts oracle-family
bun skills/project/scripts/offload.ts all
```

### Index (local logs)
```bash
bun skills/project/scripts/index.ts list
bun skills/project/scripts/index.ts all
bun skills/project/scripts/index.ts thedotmack/claude-mem
bun skills/project/scripts/index.ts all --dry-run
```

### History (git analysis)
```bash
bun skills/project/scripts/history.ts thedotmack/claude-mem
bun skills/project/scripts/history.ts claude-mem --since="1 year ago"
```

## Reunion Pattern

1. **Connect** → `ghq get -u`
2. **Scan** → Find `.agent-state/memory/*.md`, `learnings/`, `retrospectives/`, `docs/`
3. **Manifest** → Write to `.agent-state/memory/logs/index-YYYY-MM-DD-slug.json`
4. **Log** → Write to `.agent-state/memory/logs/reunion-YYYY-MM-DD.log`
5. **Offload** → Remove symlink (unless `--keep`)

## Index Pattern

1. **Read** → Load manifest JSON files
2. **Score** → Rank files by local-memory/docs signal
3. **Filter** → Skip low-value files
4. **Extract** → Print or preview high-value content candidates

## Offload Pattern

- Remove symlink only (ghq keeps repo)
- Log to `.agent-state/memory/logs/offload-YYYY-MM-DD.log`
- Can restore via `/project learn [slug]` or `/project incubate [slug]`

## Files

- `skills/project/scripts/search.ts` - Search repos (local ghq → GitHub)
- `skills/project/scripts/resolve-slug.ts` - Shared slug resolution (owner/repo + short)
- `skills/project/scripts/learn.ts` - Clone + symlink to `.agent-state/learn/`
- `skills/project/scripts/incubate.ts` - Clone (or create) + symlink to `.agent-state/incubate/`
- `skills/project/scripts/spinoff.ts` - Move to external repo
- `skills/project/scripts/reunion.ts` - Sync learnings + optional offload
- `skills/project/scripts/offload.ts` - Remove symlinks, keep ghq
- `skills/project/scripts/index.ts` - Index manifests to local logs
- `skills/project/scripts/history.ts` - Git activity analysis
- `skills/project/templates/slugs.yaml` - Registry template
