---
description: Diagnose selected conversation behavior with evidence-backed Warp rubric judgments and distinguish instruction gaps from code defects, ignored rules, and insufficient evidence.
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - Task
---

# /skill-doctor

Execute the `skill-doctor` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "skill-doctor"` instead of reading the file manually.

**Otherwise**: Resolve the installed `skill-doctor/SKILL.md` under the current agent's configured skills root, then follow its scope and scoring gates. Do not assume a source-checkout-relative `skills/...` path. This command is diagnosis, not automatic history scanning or skill edits.
