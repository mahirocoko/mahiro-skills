---
description: Direct executor playbook for using gemini CLI and Cursor CLI through fresh tmux sessions without going through the usual orchestration runtime. Use when you want a pane-first direct CLI lane, narrow current-worktree follow-up, or fresh-session recovery.
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

# /direct-cli

Execute the `direct-cli` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "direct-cli"` instead of reading the file manually.

**Otherwise**: Read the skill file at `skills/direct-cli/SKILL.md` and follow ALL instructions in it.

Prefer the known-good tmux launch commands from the skill playbook first, then wait for pane readiness and send the task prompt with `tmux send-keys`.

If `$ARGUMENTS` names a lane (`gemini` or `cursor`) but does not explicitly name a model, ask the user which skill-defined model to use before launching. Do not show the full CLI model list unless requested or troubleshooting. Use the skill-defined choices: Gemini `gemini-3.1-pro-preview`; Cursor `composer-2.5-fast`, `composer-2.5`, or `claude-opus-4-7-high`.

If model or flag availability is uncertain on this machine, it is acceptable to validate with commands such as `agent --list-models`, `agent --help`, or `gemini --help` before launching the direct lane.
