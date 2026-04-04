---
name: recap
description: Session orientation and awareness. Use when starting work, resuming context, or answering status questions.
trigger: /recap
---

# /recap — Session Orientation & Awareness

**Goal**: Orient yourself fast. Rich context by default. Mid-session awareness with `--now`.

**Core rule**: Do not treat “current session is thin” or “git is clean” as proof that nothing happened today. Check same-day memory artifacts first, then fall back to the latest retrospective in the tree before concluding there was no substantive recent work.

## Usage

```
/recap           # Rich: retro summary, handoff, tracks, git
/recap --quick   # Minimal: git + focus only, no file reads
/recap --now     # Mid-session: timeline + jumps from AI memory
/recap --now deep # Mid-session: + handoff + tracks + connections
```

## Retrieval Order

Use this evidence order every time:

1. **Current session** — what is active in the present thread
2. **Other same-day session context** — if available from the current agent
3. **Same-day retrospective memory** — `.agent-state/memory/retrospectives/YYYY-MM/DD/*.md`
4. **Latest retrospective fallback** — newest file anywhere under `.agent-state/memory/retrospectives/`
5. **Same-day handoff / durable memory** — `.agent-state/inbox/handoff/*.md`, `.agent-state/memory/logs/`, `.agent-state/metrics/project.json`, `.agent-state/metrics/heartbeat.json`
6. **Current git state** — what is uncommitted or currently staged

Only say “no implementation work happened today” when the broader same-day memory layer is empty. If today is empty but an older retrospective exists, report it as the latest known work instead of pretending there is no recent context.

## Mode Rules

### `/recap`

- Build a rich summary of what happened today in this repo.
- Always check same-day retrospectives before falling back to git-only conclusions.
- If there is no same-day retrospective, discover the newest retrospective anywhere in the retrospectives tree and surface it as the latest known work.
- If pulse data exists, use it as supporting context for momentum, streak, and branch activity, but never let it outrank richer retrospective evidence.
- Include, when available:
  - completed work from today
  - major files changed
  - architecture or pattern decisions
  - next steps or open threads
  - pulse context from `project.json` / `heartbeat.json`
  - current git state

### `/recap --quick`

- Stay minimal.
- Use current git state plus the current focus only.
- Do not make broad claims about “nothing happened today” because this mode intentionally skips deeper file reads.

### `/recap --now`

- Emphasize what is active right now.
- Still check whether same-day retrospective memory contradicts a “nothing happened today” conclusion.
- If today is empty, use the newest older retrospective only as continuity context, not as proof that work is active right now.
- If current activity is light but same-day retrospectives show substantive work, say that clearly: for example, “Right now this session is mostly orientation, but earlier today the repo had substantive implementation work.”
- If pulse data exists, it may help distinguish a thin current thread from a still-active workday; mention both instead of flattening to one source.

### `/recap --now deep`

- Combine current-thread awareness with broader same-day memory.
- Include retrospective takeaways, handoff connections, open follow-ups, and current git state.
- If today is empty, walk backward to the newest retrospective in the tree and label it explicitly as latest known context.
- If there is tension between current-session thinness and earlier same-day work, explain both rather than flattening to one source.
- If pulse data exists, use it to qualify the scale of today rather than to replace the narrative from memory artifacts.

## Same-Day Memory Paths

Resolve local state root first:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
TODAY_DIR="$(date +%Y-%m/%d)"
```

Check these paths in order:

```text
$AGENT_STATE_DIR/memory/retrospectives/$TODAY_DIR/*.md
$AGENT_STATE_DIR/memory/retrospectives/**/**/*.md
$AGENT_STATE_DIR/inbox/handoff/*.md
$AGENT_STATE_DIR/memory/logs/
$AGENT_STATE_DIR/metrics/project.json
$AGENT_STATE_DIR/metrics/heartbeat.json
```

## Pulse Rules

If pulse files exist, treat them as compact derived context:

- `project.json` = scale and structure of work across sessions
- `heartbeat.json` = recent momentum, streak, and today's activity

Use pulse to enrich a recap with short facts like total sessions, today's session count, streak length, weekly session change, or current branch activity.

Do not let pulse override newer and richer evidence from same-day retrospectives, handoffs, or the active thread. If pulse appears stale or disagrees with fresher memory artifacts, trust the fresher artifact and mention the tension briefly.

For retrospectives, prioritize the newest same-day file and extract:

- session focus / summary
- files modified
- architecture decisions
- next steps
- verification notes

If the current session is mostly planning, orientation, or chat, but a same-day retrospective shows real implementation work, report both facts.

## Latest Retrospective Discovery

If there is no same-day retrospective:

1. Search the retrospectives tree for the newest available file.
2. Infer recency from the directory structure and filename order:
   - latest `YYYY-MM`
   - latest `DD`
   - latest `HH.MM_*.md`
3. Compute how old that context is relative to today.

Then phrase it according to freshness:

- **today** → treat as current-day work
- **yesterday** → “latest work was yesterday”
- **2-7 days ago** → “latest work was N days ago”
- **older than a week** → treat it as **last known context**, not active progress

Never flatten older retrospectives into “current activity”. Use them to preserve continuity, not to fake momentum.

## Failure Pattern To Prevent

Avoid summaries like:

- “No implementation work happened today”
- “Only recap/orientation happened”
- “There are no sessions for today, so nothing was done”

when same-day retrospective memory or other durable same-day artifacts clearly show completed work.

Also avoid the opposite mistake: acting like a stale retrospective from many days ago is equivalent to active in-flight work today.

## Output Shape

Structure the response in this order:

1. **What happened today**
2. **Latest known work** (only if today is empty)
3. **What is active now**
4. **What remains / next steps**
5. **Current git state**

When the evidence is mixed, prefer precise wording over confident emptiness.
