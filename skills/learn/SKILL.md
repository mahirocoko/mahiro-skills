---
installer: local-skill-bundle v1.6.0
name: learn
description: v1.6.0 G-SKLL | Explore a codebase with parallel Haiku agents — clone, read, and document. Modes — --fast (1 agent), default (3), --deep (5). Use when user says "learn [repo]", "explore codebase", "study this repo", or shares a GitHub URL to study. Do NOT trigger for finding projects (use /trace), session mining (use /dig), or cloning for active development (use /project incubate).
---

# /learn - Deep Dive Learning Pattern

Explore a codebase with 3 parallel Haiku agents → create organized documentation.

## Usage

```
/learn [url]             # Auto: clone via ghq, symlink origin/, then explore
/learn [slug]            # Use slug from .agent-state/memory/slugs.yaml
/learn [repo-path]       # Path to repo
/learn [repo-name]       # Finds in .agent-state/learn/owner/repo
/learn --init            # Restore all origins after git clone (like submodule init)
```

## Depth Modes

| Flag | Agents | Files | Use Case |
|------|--------|-------|----------|
| `--fast` | 1 | 1 overview | Quick scan, "what is this?" |
| (default) | 3 | 3 docs | Normal exploration |
| `--deep` | 5 | 5 docs | Master complex codebases |

## Notes

- `--fast`: 1 agent, quick scan for "what is this?"
- Default: 3 agents in parallel, good balance
- `--deep`: 5 agents, comprehensive for complex repos
- Haiku for exploration = cost effective
- Main reviews = quality gate
- `origin/` structure allows easy offload
- `.origins` manifest enables `--init` restore
