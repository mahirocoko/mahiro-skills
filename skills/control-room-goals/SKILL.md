---
name: control-room-goals
description: Drafts, applies, or refines Goal Mode objectives, Definition of Done (DoD), immediate next steps, verification evidence, and handoff/reset wording. Use when the user mentions /goal, goal mode, create goal, DoD, next step, verified, safe, handoff, reset, or asks to structure work before execution.
---

# Goal Mode

Use Goal Mode as lightweight conversation-scoped objective management for the current conversation.

## Model

- `goal`: one concrete human-owned objective for the current conversation.
- `DoD`: evidence-based conditions for done; keep it in the goal draft/body when useful.
- `next`: the immediate action the agent should take; track execution with `UpdatePlan` or concise status, not hidden loops.
- `claimed`: agent has checked evidence and says it is ready.
- `verified`: Mahiro accepted the result; never treat claimed as verified.
- `handoff`: work stops with a clear next human or next-session action.

## Default packet

Draft first; do not set a goal immediately unless the user directly asks to set, apply, or create it. Prefer this shape:

```text
Proposed Goal Mode:
Goal: <one objective>
DoD:
- <3-5 concrete evidence conditions>
Next: <one immediate action>

Use this?
```

Good DoD conditions include specific files/configs changed, diagnostics passing, `/reload` or restart completed, smoke-test evidence, commit hash if commit/release is part of the task, and human verification when visual/product acceptance is required.

Avoid vague DoD like “make it better” or “finish everything”.

## Applying the goal

Only apply after explicit confirmation such as “use this”, “apply”, “set it”, “create it”, “ตั้งเลย”, or when the user explicitly commands a goal change.

After confirmation, **the agent owns applying the goal**. Do not ask Mahiro to
run a slash command when an agent-callable goal tool is available.

When applying:

- Inspect existing state first with `mh_get_goal` when the structured Mahiro
  tools are available.
- Use `mh_create_goal` yourself after confirmation. Convert the approved DoD
  into explicit criteria: agent-owned for evidence the agent can check, and
  human-owned for visual/product/foreground acceptance that only Mahiro can
  verify.
- Include `non_goals` and `next_action` when they materially prevent drift. Do
  not set `token_budget` unless Mahiro explicitly requested one.
- If an existing goal is present, do not replace it unless the user explicitly asked to replace/reset it; draft the replacement first.
- Objective/DoD replacement uses `mh_create_goal` with `replace: true` and the
  current `expected_revision`; never silently replace stale state.
- If Mahiro structured tools are unavailable but official `CreateGoal` /
  `create_goal` exists, the agent should call that tool itself after approval.
- If no agent-callable goal tool exists, keep the approved packet visible and
  use `UpdatePlan`; explain the runtime limitation instead of automatically
  delegating `/goal` typing back to Mahiro.
- Keep the goal concise enough to be useful, but include compact DoD when it materially prevents drift.

Example structured application:

```json
{
  "objective": "Build and verify the Agy prompt-handling update",
  "criteria": [
    { "text": "Docs and focused checks pass", "owner": "agent", "required": true },
    { "text": "Mahiro accepts the foreground behavior", "owner": "human", "required": true }
  ],
  "next_action": "Inspect the current implementation surface"
}
```

## Goal Mode commands and tools

### Preferred Mahiro structured tools

- `mh_get_goal` — read current structured state and revision before planning or
  mutation.
- `mh_create_goal` — agent-created objective, criteria, non-goals, next action,
  optional explicit token budget, and revision-guarded replacement.
- `mh_update_goal` — update phase/next action, add evidence, claim agent-owned
  criteria, manage blockers, or complete after the runtime audit.

Add evidence before `claim_criterion`. Never claim or verify a human-owned
criterion. Mahiro verifies it through `/mh-goal verify <criterion-id> [note]`.
Use the current `expected_revision` for every model mutation.

Human commands such as `/mh-goal status`, `/mh-goal-status`, pause/resume,
verify, clear, force-complete, and abandoned-lock recovery remain inspection or
explicit human-control surfaces; they are not the default creation path.

### Official fallback surface

Known command surface:

- `/goal <objective>` — starts a goal for the current conversation.
- `/goal --token-budget N <objective>` — starts a goal with a soft token budget; use only when the user explicitly asks for a token budget.
- `/goal status` — shows the current goal and usage.
- `/goal pause` / `/goal resume` — pauses or resumes the active goal.
- `/goal complete` — marks the active goal complete.
- `/goal clear` — clears the active goal.

Known tool surface when available:

- `GetGoal` / `get_goal` — inspect current goal state.
- `CreateGoal` / `create_goal` — create a goal only when explicitly requested or confirmed.
- `UpdateGoal` / `update_goal` — mark complete or blocked only; do not use it to mutate objective text.

If neither commands nor tools are available, keep the goal as a visible draft and use `UpdatePlan` plus concise status until the runtime provides a goal surface.

## Clarifying questions

Ask at most 1-3 concise questions only when the answer materially changes the goal, DoD, risk, or next action.

Prefer proposing a draft packet first when enough context exists:

```text
Proposed Goal Mode:
Goal: <objective>
DoD:
- <evidence condition>
Next: <immediate action>

Only question: <missing decision that changes execution>
```

Useful questions:

- What does success look like?
- Explore/plan only, or implement now?
- Any boundaries: dev server, hooks, memory, secrets, branch, files?
- What evidence proves done: tests, screenshot, `/reload`, commit, release, manual verify?
- Is extra approval needed because this touches global config, hooks, memory, destructive cleanup, credentials, or unclear scope?

For broad requests, offer 2-4 concrete options instead of open-ended questions. Do not interview when a reasonable draft is possible.

## Safety and state

There is no separate “safe mode” command in Goal Mode. For higher-risk work, put the safety boundary in the draft and ask for explicit approval before acting.

Use explicit approval gates for:

- global config/hooks/settings/mods/shell profile changes
- memory edits or migrations
- installing/removing tools/packages
- destructive cleanup or rollback-sensitive work
- credentials, secrets, payments, production deploys, pushes, or releases
- unclear scope where drift would be costly

Do not add safety ceremony for pure discussion, small low-risk edits, or simple explanation tasks.

## Agent behavior

- Pure discussion/recommendation: do not create or replace a goal unless work starts.
- Draft Goal Mode packets before applying them during exploratory discussion.
- Execution starts or user confirms the draft: the agent must set/apply the goal
  itself with the preferred available tool, then use `UpdatePlan` for step
  progress. Terse approval such as `โอเค`, `ต่อ`, `ทำเลย`, or `continue` counts
  when it clearly approves the proposed packet.
- Update the plan on phase changes, not every message.
- After checks pass: report claimed evidence and ask for human verification when acceptance matters.
- Waiting for Mahiro: provide a handoff with the exact next human action.
- Done: mark the goal complete only when the objective is actually achieved and no required work remains.
- Blocked: mark blocked only after a repeated blocker leaves the agent at an impasse.
- Obsolete/stale goal: draft the replacement, obtain approval, reread current
  state, then use revision-guarded replacement instead of silently overwriting
  it.

## Explain terms

If asked, explain in the user's language using this mapping:

```text
goal = objective
DoD = evidence required for done
next = immediate action
claimed = agent checked
verified = human accepted
handoff = stop point with next action
```
