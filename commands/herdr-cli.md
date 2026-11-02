---
description: Organize Herdr Spaces, Tabs and Panes, run authorized apps/dev servers in visible terminals, open/associate existing explicitly authorized Git worktrees using exact paths from their Git/executor owner, transfer full project ownership, coordinate visible cross-Space prerequisites, and interpret attention versus activity truthfully. Use for app/server startup in Herdr or explicit workspace/worktree jobs; direct-cli owns temporary executor/model/callback work.
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

Load `herdr-app --skill`, `hc --skill`, relevant help and `herdr-app commands`.
Use read-only `herdr-app ls`/`status`/`commands`, never bare `herdr-app` for discovery.
App owns visible topology; hc owns execution/read/wait/send/cleanup. Validate the HC
caller and keep HC terminal addresses separate from app Space/Tab/Pane IDs. For “this
Space”, use `herdr-app status`; name/folder mismatch alone does not justify a new Space.
HC label changes do not prove pane movement—verify `herdr-app ls`. For authorized
existing-process relocation, park only an exact terminal that currently has a pane;
when keep has no destination argument, select and revalidate the exact destination
Space immediately before keep. Placement may change focus, and a pending reply is not
completion; recheck exact process placement, port and health.
Current HC operation does not require legacy HERDR_ENV. Use legacy `herdr --skill`
only as a separate fallback when current tools are unavailable, with HERDR_ENV=1
and its own compatible runtime/receipts; never mix commands or IDs.
No proven app Git-worktree create/open API exists: obtain an authorized existing
checkout's exact path from the actual Git/executor owner, then associate the folder.
For authorized app/dev-server startup, reuse a matching service or run the
project-owned command in a visible foreground Tab/Pane, not a hidden background shell.
Do not create topology or send cross-Space input without the requested scope.
Full handoff uses the revalidated exact HC terminal and a single non-forced send;
distinguish submitted, activity, acknowledgment and accepted outcome. It reports directly to the human in the receiving conversation;
temporary executor work and callbacks remain direct-cli-owned.
