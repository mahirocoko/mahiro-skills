---
description: Create a handoff and planning bridge for the next session. Use when the user asks to wrap up or hand work forward.
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

# /forward

Execute the `forward` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "forward"` instead of reading the file manually.

**Otherwise**: Resolve the installed `forward/SKILL.md` under the current agent's configured skills root, then follow ALL instructions in it. Do not assume a source-checkout-relative `skills/...` path.
