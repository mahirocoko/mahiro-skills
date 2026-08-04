---
description: Explore a codebase with parallel agents by cloning, reading, and documenting it. Use when the user wants to study a repo in depth.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - WebFetch
---

# /learn

Execute the `learn` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "learn"` instead of reading the file manually.

**Otherwise**: Resolve the installed `learn/SKILL.md` under the current agent's configured skills root, then follow ALL instructions in it. Do not assume a source-checkout-relative `skills/...` path.
