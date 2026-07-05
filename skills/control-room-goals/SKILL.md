---
name: control-room-goals
description: Helps set or refine Control Room goals, Definition of Done (DoD), next steps, safety mode, verification, handoff, and reset behavior. Use when the user mentions Control Room, /cr, goal, next, DoD, verified, safe, handoff, reset, or asks to structure a task before execution.
---

# Control Room Goals

Use Control Room as a human-in-the-loop cockpit, not an autonomous loop runner.

## Model

- `goal`: human-owned objective.
- `DoD`: evidence-based conditions for done.
- `next`: one concrete immediate action.
- `claimed`: agent checked and claims ready.
- `verified`: human accepted, usually via `/cr verified ...`.
- `handoff + next=""`: loop ended; no agent action remains.

## Default packet

Draft first; do not set the goal immediately unless the user explicitly asked to set/apply it. Prefer this shape:

```text
Proposed CR:
/cr goal <objective>. DoD: <3-5 concrete evidence conditions>
/cr next <one immediate action>

Use this?
```

Only call `control_room_propose_goal` after explicit confirmation (for example: “use this”, “apply”, “set it”, “ตั้งเลย”) or when the user directly commands a goal change. If the user is discussing, evaluating, or asking what the goal should be, keep it as a draft.

Good DoD conditions include specific files/configs changed, diagnostics passing, `/reload` or restart completed, smoke test evidence, commit hash if commit is part of the task, and human verification when visual/product acceptance is required.

Avoid vague DoD like “make it better” or “finish everything”.

## Clarifying questions

Ask at most 1-3 concise questions only when the answer materially changes the goal, DoD, risk, or next action.

Prefer proposing a draft CR packet first when enough context exists:

```text
Proposed CR:
/cr goal <objective>. DoD: <3-5 evidence conditions>
/cr next <one immediate action>

Only question: <missing decision that changes the plan>
```

Useful questions:

- What does success look like?
- Explore/plan only, or implement now?
- Any boundaries: dev server, hooks, memory, secrets, branch, files?
- What evidence proves done: tests, screenshot, `/reload`, commit, manual verify?
- Is `/cr safe` needed because this touches global config, hooks, memory, destructive cleanup, or unclear scope?

For broad requests, offer 2-4 concrete options instead of open-ended questions. Do not interview when a reasonable draft is possible. Keep momentum.

## `/cr safe`

Use `/cr safe` for higher-risk or stateful work:

- global config/hooks/settings/mods/shell profile changes
- memory edits or migrations
- installing/removing tools/packages
- destructive cleanup or rollback-sensitive work
- unclear scope where drift would be costly

Do not use `/cr safe` for pure discussion, small low-risk edits, or simple explanation tasks.

## Agent behavior

- Pure discussion/recommendation: do not update CR unless work starts.
- Draft CR goals before applying them; do not call `control_room_propose_goal` for exploratory discussion.
- Execution starts or user confirms the draft: update mode and next.
- Update on phase changes, not every message.
- Use `explore`, `edit`, `verify`, `stuck`, `handoff` intentionally.
- After checks pass: set `verificationState=claimed` with evidence.
- Never treat `claimed` as human `verified`.
- Waiting for Mahiro: `mode=handoff` with exact next human action.
- Done: `mode=handoff`, `next=""`.
- Obsolete/stale goal: suggest `/cr reset`.

## Explain terms

If asked, explain in the user's language using this mapping:

```text
goal = objective
DoD = evidence required for done
next = one immediate action
claimed = agent checked
verified = human accepted
handoff + empty next = loop ended
```
