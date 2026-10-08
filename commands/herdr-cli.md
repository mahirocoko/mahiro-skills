---
description: Organize Herdr Spaces, Tabs and Panes, run authorized apps/dev servers in visible terminals, associate explicitly authorized Git worktrees, transfer full project ownership, coordinate visible cross-Space prerequisites, and interpret attention versus activity truthfully. Use for app/server startup in Herdr or explicit workspace/worktree jobs; direct-cli owns temporary executor/model/callback work.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# /herdr-cli

Execute the `herdr-cli` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "herdr-cli"`.

**Otherwise**: Resolve the installed `herdr-cli/SKILL.md` under the current agent's configured skills root and follow it. Do not assume a source-checkout-relative path.

Keep official `herdr --skill` authoritative for command/readiness mechanics.
For authorized app/dev-server startup, reuse a matching service or run the
project-owned command in a visible foreground Tab/Pane, not a hidden background shell.
Do not create topology or send cross-Space input without the requested scope.
Full handoff reports directly to the human in the receiving conversation;
temporary executor work and callbacks remain direct-cli-owned.
