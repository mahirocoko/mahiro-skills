---
description: Create a session retrospective with lessons learned. Use at the end of a work session or when the user asks for a retrospective.
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

# /rrr

Execute the `rrr` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "rrr"` instead of reading the file manually.

**Otherwise**: Resolve the installed `rrr/SKILL.md` under the current agent's configured skills root, then follow ALL instructions in it. Do not assume a source-checkout-relative `skills/...` path.
