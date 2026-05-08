---
name: forward
description: Create a handoff and planning bridge for the next session. Use when the user asks to wrap up or hand work forward.
---

# /forward - Handoff to Next Session

Create context for next session, then enter the current agent's planning flow to define next steps.

## Usage

```
/forward              # Create handoff + enter planning flow (default)
/forward asap         # Create handoff fast; commit/push only if a tracked handoff artifact is configured
/forward --only       # Create handoff only, skip planning flow
```

## Steps

1. **Git status**: Check uncommitted work
2. **Session summary**: What we did (from memory)
3. **Pending items**: What's left
4. **Next steps**: Specific actions

## Approval Gates

- `/forward` creates the handoff and planning bridge, then asks before any commit or push unless the current agent has already received an explicit commit/push instruction in this turn.
- `/forward asap` is explicit approval to create the handoff fast and to commit/push only when the handoff artifact is tracked by git. Do not force-add ignored `.agent-state` files.
- `/forward --only` creates the handoff only. Do not commit, push, or enter planning flow.
- Never delete branches, merge PRs, close issues, or remove files from cleanup context without a separate explicit human approval.
- If git status shows unrelated user work or possible secrets, stop before staging and ask.

## Output

Resolve local state path first:
```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
```

Write to: `$AGENT_STATE_DIR/inbox/handoff/YYYY-MM-DD_HH-MM_slug.md`

Use `AGENT_STATE_DIR` for local-only state. It should point at a hidden, gitignored directory inside the repo unless the human overrides it.

```markdown
# Handoff: [Session Focus]

**Date**: YYYY-MM-DD HH:MM
**Context**: [%]

## What We Did
- [Accomplishment 1]
- [Accomplishment 2]

## Pending
- [ ] Item 1
- [ ] Item 2

## Next Session
- [ ] Specific action 1
- [ ] Specific action 2

## Key Files
- [Important file 1]
- [Important file 2]
```

## Then

After creating handoff:
1. For default `/forward`, present the handoff path and ask before committing or pushing.
2. If commit/push is approved and the handoff artifact is tracked by git, commit only that tracked artifact: `git add [tracked-handoff-path] && git commit -m "handoff: [slug]"`.
3. Push only after explicit approval or `asap`, and only if a commit was actually created: `git push origin [current-branch]`.
4. **Gather cleanup context** before entering planning flow:

```bash
git status --short
git branch --list | grep -v '^\* main$' | grep -v '^  main$'
gh pr list --state open --json number,title,headRefName --jq '.[] | "#\(.number) \(.title) (\(.headRefName))"' 2>/dev/null
gh issue list --state open --limit 5 --json number,title --jq '.[] | "#\(.number) \(.title)"' 2>/dev/null
```

5. **Enter planning flow** for next session planning

## Planning Flow (REQUIRED)

After the handoff is written, and after any approved commit/push decision is handled, enter the planning flow available in the current agent unless `asap` or `--only` was used.

If the current agent has a `plan` mode or `/plan` command, use it.
If the current agent has no dedicated planning mode, write the plan directly.

### Plan Template

```markdown
# Plan: [Next Session Focus]

## Background
[Summary from handoff: What We Did]

## Pending from Last Session
[Copy Pending items from handoff]

## Next Session Goals
[Copy Next Session items from handoff]

## Next Session: Pick Your Path

| Option | Command | What It Does |
|--------|---------|--------------|
| **Continue** | `/recap` | Pick up where we left off |
| **Clean up first** | See cleanup list below, then `/recap` | Merge PRs, delete branches, close issues, then continue |
| **Fresh start** | `/recap --quick` | Minimal context, start something new |

### Cleanup Checklist (if any)
- [ ] [Open PR to merge]
- [ ] [Stale branch to delete]
- [ ] [Issue to close]
- [ ] [Uncommitted work to commit or stash]

## Reference
- Handoff: $AGENT_STATE_DIR/inbox/handoff/YYYY-MM-DD_HH-MM_slug.md
```

---

## ASAP Mode

If user says `/forward asap`:
- Write handoff file
- Treat `asap` as approval to commit/push only a tracked handoff artifact; if the handoff lives under ignored `.agent-state`, do not force-add it and report that no tracked handoff commit was created
- Skip planning flow
- User wants to close fast

## Skip Planning Flow

If user says `/forward --only`:
- Skip commit, push, and planning flow
- Tell user: "Run /plan or /recap to plan next session"

## Verification / Self-check

Before final output:

- Confirm the handoff file exists at `$AGENT_STATE_DIR/inbox/handoff/YYYY-MM-DD_HH-MM_slug.md`.
- Confirm whether commit/push happened, was skipped, or is awaiting approval.
- Confirm any cleanup list is context only, not executed cleanup.
- Report the next recommended entrypoint: `/recap`, `/recap --quick`, or the generated plan.

ARGUMENTS: $ARGUMENTS
