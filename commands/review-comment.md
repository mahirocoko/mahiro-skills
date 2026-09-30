---
description: Draft concise, line-anchored PR review comments in Mahiro's voice; post only when explicitly asked, and submit only with separate approval.
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

# /review-comment

Execute the `review-comment` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "review-comment"` instead of reading the file manually.

**Otherwise**: Resolve the installed `review-comment/SKILL.md` under the current agent's configured skills root, then follow ALL instructions in it. Do not assume a source-checkout-relative `skills/...` path.
