---
name: project-manager
description: Manage project lifecycle - learn, incubate, spinoff, reunion, offload, history. Use ghq + symlinks.
---

# Project Manager Skill

Complete project lifecycle management with 8 commands.

## Slug Format (Mixed Lookup)

Supports both formats:
- **Full**: `owner/repo` (priority) — e.g., `thedotmack/claude-mem`
- **Short**: `repo-name` (fallback) — e.g., `claude-mem`

## Commands

| Command | Action | Script |
|---------|--------|--------|
| `/project search [query]` | Search repos (local→remote) | `skills/project/scripts/search.ts` |
| `/project learn [url\|slug]` | Read-only study | `skills/project/scripts/learn.ts` |
| `/project incubate [name]` | Work (auto-create if needed) | `skills/project/scripts/incubate.ts` |
| `/project spinoff [name]` | Graduate to own repo | `skills/project/scripts/spinoff.ts` |
| `/project reunion [slug\|all]` | Sync learnings + offload | `skills/project/scripts/reunion.ts` |
| `/project offload [slug\|all]` | Remove symlinks (keep ghq) | `skills/project/scripts/offload.ts` |
| `/project index [slug\|all]` | Index manifests to local logs | `skills/project/scripts/index.ts` |
| `/project history [slug]` | Git timeline analysis | `skills/project/scripts/history.ts` |
