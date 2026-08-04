---
description: Display the local philosophy and alignment rules. Use when the user asks about principles or needs a philosophy check.
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

# /philosophy

Execute the `philosophy` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "philosophy"` instead of reading the file manually.

**Otherwise**: Resolve the installed `philosophy/SKILL.md` under the current agent's configured skills root, then follow ALL instructions in it. Do not assume a source-checkout-relative `skills/...` path.
