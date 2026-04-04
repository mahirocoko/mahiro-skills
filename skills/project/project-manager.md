---
name: project-manager
description: Manage project lifecycle - learn, incubate, spinoff, reunion, offload, history. Use ghq + symlinks.
---

# Project Manager Skill

Complete project lifecycle management with list, lookup, and lifecycle flows.

## Slug Format (Mixed Lookup)

Supports both formats:
- **Full**: `owner/repo` (priority) — e.g., `thedotmack/claude-mem`
- **Short**: `repo-name` (fallback) — e.g., `claude-mem`

## Commands

| Command | Action | Script |
|---------|--------|--------|
| `/project list [learn\|incubate]` | List tracked repos by mode | manual directory + manifest lookup |
| `/project find [query]` | Find tracked repos across both modes | manual directory + manifest lookup |
| `/project search [query]` | Search repos (local->remote) | `skills/project/scripts/search.ts` |
| `/project learn [url\|slug]` | Read-only study | `skills/project/scripts/learn.ts` |
| `/project incubate [name]` | Work (auto-create if needed) | `skills/project/scripts/incubate.ts` |
| `/project spinoff [name]` | Graduate to own repo | `skills/project/scripts/spinoff.ts` |
| `/project reunion [slug\|all]` | Sync learnings + offload | `skills/project/scripts/reunion.ts` |
| `/project offload [slug\|all]` | Remove symlinks (keep ghq) | `skills/project/scripts/offload.ts` |
| `/project index [slug\|all]` | Index manifests to local logs | `skills/project/scripts/index.ts` |
| `/project history [slug]` | Git timeline analysis | `skills/project/scripts/history.ts` |

## Listing Rule

`/project list` should read both:

- `.agent-state/learn` using `.origins` when present, with directory fallback
- `.agent-state/incubate` using directory discovery

Return grouped output so `learn` and `incubate` never get conflated.
