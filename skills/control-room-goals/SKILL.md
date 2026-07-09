---
name: control-room-goals
description: Helps draft or refine Goal Mode objectives, Definition of Done (DoD), immediate next steps, verification evidence, and handoff/reset wording. Use when the user mentions /goal, goal mode, create goal, DoD, next step, verified, safe, handoff, reset, or asks to structure work before execution.
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

When applying:

- If a goal tool is available, use it only after confirmation. Do not set a token budget unless the user explicitly asked for one.
- If an existing goal is present, do not replace it unless the user explicitly asked to replace/reset it; draft the replacement first.
- If only slash commands are available, provide the exact `/goal ...` text for the user/runtime to run.
- Keep the goal concise enough to be useful, but include compact DoD when it materially prevents drift.

Example applied text:

```text
/goal Build and verify the Agy prompt-handling update. DoD: docs updated, tests pass, release notes align, final status reports risks.
```

## Goal Mode commands and tools

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
- Execution starts or user confirms the draft: set/apply the goal if tooling is available, then use `UpdatePlan` for step progress.
- Update the plan on phase changes, not every message.
- After checks pass: report claimed evidence and ask for human verification when acceptance matters.
- Waiting for Mahiro: provide a handoff with the exact next human action.
- Done: mark the goal complete only when the objective is actually achieved and no required work remains.
- Blocked: mark blocked only after a repeated blocker leaves the agent at an impasse.
- Obsolete/stale goal: suggest `/goal clear` and a new goal draft instead of silently overwriting it.

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
