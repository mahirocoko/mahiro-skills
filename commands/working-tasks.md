---
description: Executes and resumes agreed tsk-backed tasks with scope, completion evidence and human acceptance; keeps structured Goal use optional.
---

# /working-tasks

Execute the `working-tasks` skill with args: `$ARGUMENTS`.

If a Skill tool is available, invoke `working-tasks`. Otherwise resolve its
installed `SKILL.md` under the current agent's configured skills root and follow
it. Do not assume a source-checkout-relative path or install missing tools.
