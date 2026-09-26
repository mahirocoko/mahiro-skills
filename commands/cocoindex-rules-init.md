---
description: Repo-local CocoIndex Code rule bootstrapper. Patches AGENTS.md and invokes the installed sibling ccc skill for portable settings, preflight, and strict scan.
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
