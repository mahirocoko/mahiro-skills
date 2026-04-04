# RICH MODE — Same-Day And Latest Memory Detection

Use rich recap when the current thread alone is not enough to explain what happened today or what the latest known substantive work was.

## Retrieval Priority

1. Current session / active thread
2. Other same-day sessions if the current agent can inspect them
3. Same-day retrospectives
4. Latest retrospective fallback from the retrospectives tree
5. Same-day handoffs, logs, and pulse metrics
6. Current git state

## Local State Paths

Resolve state root first:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
TODAY_DIR="$(date +%Y-%m/%d)"
```

Primary paths:

```text
$AGENT_STATE_DIR/memory/retrospectives/$TODAY_DIR/*.md
$AGENT_STATE_DIR/memory/retrospectives/**/**/*.md
$AGENT_STATE_DIR/inbox/handoff/*.md
$AGENT_STATE_DIR/memory/logs/
$AGENT_STATE_DIR/metrics/project.json
$AGENT_STATE_DIR/metrics/heartbeat.json
```

## Reading Rule

If current session evidence is weak, always inspect same-day retrospective memory before concluding that nothing substantial happened today.

If same-day retrospective memory is empty, find the newest retrospective anywhere in the tree and report it as latest known work with explicit recency wording.

## Synthesis Rule

Never collapse “current session is mostly recap/orientation” into “today had no implementation work” when a same-day retrospective documents real completed work.

Never collapse an older retrospective into “current active work” either. Yesterday is continuity; last week is last known context.

Pulse metrics are supporting evidence only. They help quantify momentum and scale, but they do not outrank fresher narrative artifacts such as same-day retrospectives or handoffs.
