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

### 1.5. Generate / Refresh Pulse Metrics

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
mkdir -p "$AGENT_STATE_DIR/metrics"
export AGENT_STATE_DIR
export CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf 'unknown')"
export MODIFIED_FILES_COUNT="$(git status --short 2>/dev/null | wc -l | tr -d ' ')"
python3 - <<'PY'
import json
import os
import subprocess
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path

agent_state_dir = Path(os.environ["AGENT_STATE_DIR"])
retros_root = agent_state_dir / "memory" / "retrospectives"
metrics_dir = agent_state_dir / "metrics"
metrics_dir.mkdir(parents=True, exist_ok=True)

retro_files = sorted(retros_root.glob("*/*/*.md")) if retros_root.exists() else []
counts_by_day = Counter()

for path in retro_files:
    try:
        counts_by_day[date.fromisoformat(f"{path.parts[-3]}-{path.parts[-2]}")] += 1
    except Exception:
        continue

today = datetime.now().date()
total_sessions = len(retro_files)
today_sessions = counts_by_day.get(today, 0)
active_days = len(counts_by_day)

streak_days = 0
cursor = today
while counts_by_day.get(cursor, 0) > 0:
    streak_days += 1
    cursor -= timedelta(days=1)

last7 = sum(counts_by_day.get(today - timedelta(days=i), 0) for i in range(7))
prev7 = sum(counts_by_day.get(today - timedelta(days=i), 0) for i in range(7, 14))
if prev7 == 0:
    week_change_pct = 100.0 if last7 > 0 else 0.0
else:
    week_change_pct = round(((last7 - prev7) / prev7) * 100, 1)

branch = os.environ.get("CURRENT_BRANCH", "unknown")
modified_files = int(os.environ.get("MODIFIED_FILES_COUNT", "0") or "0")

try:
    recent_commits = int(
        subprocess.check_output(
            ["git", "rev-list", "--count", "--since=30.days", "HEAD"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        or "0"
    )
except Exception:
    recent_commits = 0

if today_sessions <= 1:
    current_session_size = "small"
elif today_sessions <= 3:
    current_session_size = "medium"
else:
    current_session_size = "large"

generated_at = datetime.now().isoformat(timespec="seconds")

project_payload = {
    "generatedAt": generated_at,
    "source": "rrr-derived",
    "totalSessions": total_sessions,
    "todaySessions": today_sessions,
    "activeDays": active_days,
    "avgSessionsPerActiveDay": round(total_sessions / active_days, 2) if active_days else 0,
    "sizes": {
        "today": current_session_size,
        "thresholds": {"smallMax": 1, "mediumMax": 3, "largeMin": 4},
    },
    "branches": {
        "current": {
            "name": branch,
            "recentCommits30d": recent_commits,
        }
    },
}

heartbeat_payload = {
    "generatedAt": generated_at,
    "source": "rrr-derived",
    "streak": {"days": streak_days},
    "weekChangePct": week_change_pct,
    "today": {
        "sessions": today_sessions,
        "modifiedFiles": modified_files,
        "hasGitChanges": modified_files > 0,
    },
}

(metrics_dir / "project.json").write_text(json.dumps(project_payload, indent=2) + "\n")
(metrics_dir / "heartbeat.json").write_text(json.dumps(heartbeat_payload, indent=2) + "\n")
PY
```

These files are local derived snapshots, not canonical telemetry. Prefer metrics that can be grounded from local retrospectives and git state; do not invent message counts when the agent cannot observe them.

### 1.6. Read Pulse Context (optional)

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
cat "$AGENT_STATE_DIR/metrics/project.json" 2>/dev/null
cat "$AGENT_STATE_DIR/metrics/heartbeat.json" 2>/dev/null
```

If you combine gather + pulse generation + pulse reads into one Bash tool call, prefer plain sequential commands or `;` separators.
Do **not** place `&&` immediately after a heredoc terminator such as `PY`, because that can trip shell parsing in practice.

Safe combined shape:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
date "+%H:%M %Z (%A %d %B %Y)"
git log --oneline -10
git diff --stat HEAD~5
mkdir -p "$AGENT_STATE_DIR/metrics"
export AGENT_STATE_DIR
export CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf 'unknown')"
export MODIFIED_FILES_COUNT="$(git status --short 2>/dev/null | wc -l | tr -d ' ')"
python3 - <<'PY'
import json
import os
import subprocess
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path

agent_state_dir = Path(os.environ["AGENT_STATE_DIR"])
retros_root = agent_state_dir / "memory" / "retrospectives"
metrics_dir = agent_state_dir / "metrics"
retro_files = sorted(retros_root.glob("*/*/*.md")) if retros_root.exists() else []
counts_by_day = Counter()

for path in retro_files:
    try:
        counts_by_day[date.fromisoformat(f"{path.parts[-3]}-{path.parts[-2]}")] += 1
    except Exception:
        continue

today = datetime.now().date()
total_sessions = len(retro_files)
today_sessions = counts_by_day.get(today, 0)
active_days = len(counts_by_day)
streak_days = 0
cursor = today
while counts_by_day.get(cursor, 0) > 0:
    streak_days += 1
    cursor -= timedelta(days=1)
last7 = sum(counts_by_day.get(today - timedelta(days=i), 0) for i in range(7))
prev7 = sum(counts_by_day.get(today - timedelta(days=i), 0) for i in range(7, 14))
if prev7 == 0:
    week_change_pct = 100.0 if last7 > 0 else 0.0
else:
    week_change_pct = round(((last7 - prev7) / prev7) * 100, 1)
branch = os.environ.get("CURRENT_BRANCH", "unknown")
modified_files = int(os.environ.get("MODIFIED_FILES_COUNT", "0") or "0")
try:
    recent_commits = int(subprocess.check_output(["git", "rev-list", "--count", "--since=30.days", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip() or "0")
except Exception:
    recent_commits = 0
if today_sessions <= 1:
    current_session_size = "small"
elif today_sessions <= 3:
    current_session_size = "medium"
else:
    current_session_size = "large"
generated_at = datetime.now().isoformat(timespec="seconds")
project_payload = {
    "generatedAt": generated_at,
    "source": "rrr-derived",
    "totalSessions": total_sessions,
    "todaySessions": today_sessions,
    "activeDays": active_days,
    "avgSessionsPerActiveDay": round(total_sessions / active_days, 2) if active_days else 0,
    "sizes": {"today": current_session_size, "thresholds": {"smallMax": 1, "mediumMax": 3, "largeMin": 4}},
    "branches": {"current": {"name": branch, "recentCommits30d": recent_commits}},
}
heartbeat_payload = {
    "generatedAt": generated_at,
    "source": "rrr-derived",
    "streak": {"days": streak_days},
    "weekChangePct": week_change_pct,
    "today": {"sessions": today_sessions, "modifiedFiles": modified_files, "hasGitChanges": modified_files > 0},
}
metrics_dir.mkdir(parents=True, exist_ok=True)
(metrics_dir / "project.json").write_text(json.dumps(project_payload, indent=2) + "\n")
(metrics_dir / "heartbeat.json").write_text(json.dumps(heartbeat_payload, indent=2) + "\n")
print((metrics_dir / "project.json").read_text())
print((metrics_dir / "heartbeat.json").read_text())
PY
mkdir -p "$AGENT_STATE_DIR/memory/retrospectives/$(date +%Y-%m/%d)"
mkdir -p "$AGENT_STATE_DIR/memory/learnings"
```

If pulse generation fails because a dependency like `python3` is unavailable, skip silently and continue the retrospective.

If found, extract:
- From `project.json`: `totalSessions`, `todaySessions`, `activeDays`, `sizes.today`, `branches.current`
- From `heartbeat.json`: `streak.days`, `weekChangePct`, `today`

### 2. Write Retrospective

**Path**: `$AGENT_STATE_DIR/memory/retrospectives/YYYY-MM/DD/HH.MM_slug.md`

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
mkdir -p "$AGENT_STATE_DIR/memory/retrospectives/$(date +%Y-%m/%d)"
```

Write immediately, no prompts. If pulse data was found, weave it into the narrative (don't add a separate dashboard). Include:
- Session Summary — if pulse data exists, add one line with session/streak context, but avoid false precision if the current retrospective is not yet reflected in the generated counts
- Timeline
- Files Modified
- AI Diary (150+ words, first-person) — if pulse data exists, reference momentum naturally: "with a +X% weekly session change" or "on day N of an unbroken streak"
- Honest Feedback (100+ words, 3 friction points)
- Lessons Learned
- Next Steps

After writing the retrospective, rerun the pulse generation step once so `project.json` and `heartbeat.json` include the newly written session.

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
(If pulse data exists, add a short line with total sessions, today's session count, and streak length. Avoid false precision if the metrics were generated before the new retrospective hit disk.)
## Timeline
## Files Modified
## Key Code Changes
## Architecture Decisions
## AI Diary (150+ words, vulnerable, first-person)
(If pulse data exists, reference momentum: weekly session change, streak length)
## What Went Well
## What Could Improve
## Blockers & Resolutions
## Honest Feedback (100+ words, 3 friction points)
## Lessons Learned
## Next Steps
## Metrics (commits, files, lines)
### Pulse Context (if pulse data exists)
Project: X sessions | Today: Y sessions | Active days: Z | Session size: small|medium|large
Streak: N days | Week trend: ±X% sessions | Branch: main | Recent commits (30d): N
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
