---
name: rrr
description: Create a session retrospective with lessons learned. Use at the end of a work session or when the user asks for a retrospective.
---

# /rrr

> "Reflect to grow, document to remember."

```
/rrr              # Quick retro, main agent
/rrr --detail     # Full template, main agent
/rrr --dig        # Reconstruct past timeline from session history if available
/rrr --deep       # 5 parallel agents (read DEEP.md)
```

**NEVER use parallel/deep agents outside `--deep`.**
**`/rrr`, `/rrr --detail`, and `/rrr --dig` = main agent only. Zero subagents.**

---

## /rrr (Default)

### 1. Gather

```bash
date "+%H:%M %Z (%A %d %B %Y)"
git log --oneline -10 && git diff --stat HEAD~5
```

### 1.5. Read Pulse Context (optional)

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
cat "$AGENT_STATE_DIR/metrics/project.json" 2>/dev/null
cat "$AGENT_STATE_DIR/metrics/heartbeat.json" 2>/dev/null
```

If you combine gather + pulse reads into one Bash tool call, prefer plain sequential commands or `;` separators.
Do **not** place `&&` immediately after a heredoc terminator such as `PY`, because that can trip shell parsing in practice.

Safe combined shape:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
date "+%H:%M %Z (%A %d %B %Y)"
git log --oneline -10
git diff --stat HEAD~5
python - <<'PY'
import os
from pathlib import Path
agent_state_dir = Path(os.environ["AGENT_STATE_DIR"])
for name in ["project", "heartbeat"]:
    path = agent_state_dir / "metrics" / f"{name}.json"
    if path.exists():
        print(path.read_text())
PY
mkdir -p "$AGENT_STATE_DIR/memory/retrospectives/$(date +%Y-%m/%d)"
mkdir -p "$AGENT_STATE_DIR/memory/learnings"
```

If files don't exist, skip silently. Never fail because pulse data is missing.
These metrics snapshots are optional local files. If nothing generates them, skip the section entirely.

If found, extract:
- From `project.json`: `totalSessions`, `avgMessagesPerSession`, `sizes` (to categorize current session), `branches` (activity on current branch)
- From `heartbeat.json`: `streak.days` (momentum), `weekChange` (acceleration/slowdown), `today` (today's activity so far)

### 2. Write Retrospective

**Path**: `$AGENT_STATE_DIR/memory/retrospectives/YYYY-MM/DD/HH.MM_slug.md`

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
mkdir -p "$AGENT_STATE_DIR/memory/retrospectives/$(date +%Y-%m/%d)"
```

Write immediately, no prompts. If pulse data was found, weave it into the narrative (don't add a separate dashboard). Include:
- Session Summary — if pulse data exists, add one line: "Session #X of Y in this project (Z-day streak)"
- Timeline
- Files Modified
- AI Diary (150+ words, first-person) — if pulse data exists, reference momentum naturally: "in a week with +X% messaging velocity" or "on day N of an unbroken streak"
- Honest Feedback (100+ words, 3 friction points)
- Lessons Learned
- Next Steps

### 3. Write Lesson Learned

**Path**: `$AGENT_STATE_DIR/memory/learnings/YYYY-MM-DD_slug.md`

### 4. Durable local note

After writing the lesson learned, make sure the file is stored under `$AGENT_STATE_DIR/memory/learnings/` with clear tags and a specific slug so it stays easy to rediscover locally.

### 5. Commit (optional)

Only commit these notes when the human explicitly asks for a commit.

---

## /rrr --detail

Same flow as default but use full template:

```markdown
# Session Retrospective

**Session Date**: YYYY-MM-DD
**Start/End**: HH:MM - HH:MM GMT+7
**Duration**: ~X min
**Focus**: [description]
**Type**: [Feature | Bug Fix | Research | Refactoring]

## Session Summary
(If pulse data exists, add: "Session #X of Y in this project (Z-day streak)")
## Timeline
## Files Modified
## Key Code Changes
## Architecture Decisions
## AI Diary (150+ words, vulnerable, first-person)
(If pulse data exists, reference momentum: velocity changes, streak length)
## What Went Well
## What Could Improve
## Blockers & Resolutions
## Honest Feedback (100+ words, 3 friction points)
## Lessons Learned
## Next Steps
## Metrics (commits, files, lines)
### Pulse Context (if pulse data exists)
Project: X sessions | Avg: Y msgs/session | This session: Z msgs (category)
Streak: N days | Week trend: ±X% msgs | Branch: main (N sessions)
```

Then steps 3-5 same as default.

---

## /rrr --dig

**Retrospective powered by available session history. No subagents.**

### 1. Gather Session History

If the current agent supports `/trace --dig` or an equivalent session-history export, use it to get a timeline JSON for this session.

If the current agent does not expose session-history files or export tooling, reconstruct the timeline from:
- current conversation memory
- git log / diff context
- latest handoff
- pulse data if present

Also gather git context:

```bash
date "+%H:%M %Z (%A %d %B %Y)"
git log --oneline -10 && git diff --stat HEAD~5
```

### 2. Write Retrospective with Timeline

Use the session timeline data to write a full retrospective using the `--detail` template. Add the Past Session Timeline table after Session Summary, before Timeline.

Also run pulse context (step 1.5 from default mode) and weave into narrative.

### 3-5. Same as default steps 3-5

Write the lesson learned, keep it local, and only commit if the human explicitly asks.

Suggested paths remain under `$AGENT_STATE_DIR/memory/`.

---

## /rrr --deep

Read `DEEP.md` in this skill directory. Only mode that uses subagents.

---

## Rules

- **NO SUBAGENTS**: Never spawn subagents outside `--deep`
- AI Diary: 150+ words, vulnerability, first-person
- Honest Feedback: 100+ words, 3 friction points
- Durable local learning note: REQUIRED after every lesson learned
- Time Zone: GMT+7 (Bangkok)
