---
description: Project-local CocoIndex Code rule bootstrapper. Use when a repo needs AGENTS.md guidance that makes agents prefer cocoindex-code / ccc for semantic codebase search, repo exploration, and index maintenance.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# /cocoindex-rules-init

Execute the `cocoindex-rules-init` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "cocoindex-rules-init"` instead of reading the file manually.

**Otherwise**: Resolve the installed `cocoindex-rules-init/SKILL.md` under the current agent's configured skills root, then follow ALL instructions in it. Do not assume a source-checkout-relative `skills/...` path.
