---
description: v1.6.0 G-CMD | Explore a codebase with parallel Haiku agents — clone, read, and document. Modes — --fast (1 agent), default (3), --deep (5). Use when user says "learn [repo]", "explore codebase", "study this repo", or shares a GitHub URL to study. Do NOT trigger for finding projects (use /trace), session mining (use /dig), or cloning for active development (use /project incubate).
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

**Otherwise**: Read the skill file at `skills/learn/SKILL.md` and follow ALL instructions in it.
