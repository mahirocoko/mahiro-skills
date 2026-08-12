---
name: control-room-goals
description: Drafts, applies, or refines Goal Mode objectives, Definition of Done (DoD), immediate next steps, verification evidence, and handoff/reset wording. Use when the user mentions /goal, goal mode, create goal, DoD, next step, verified, safe, handoff, reset, or asks to structure work before execution.
---

# Goal Mode

Use Goal Mode as lightweight management of one human-owned living mission. The
mission normally belongs to the current conversation, but Mahiro may explicitly
move the same mission to another empty conversation owned by the same agent.

## Model

- `goal`: one concrete human-owned living mission with stable identity.
- `DoD`: evidence-based conditions for done; keep it in the goal draft/body when useful.
- `next`: the immediate action the agent should take; track execution with `UpdatePlan` or concise status, not hidden loops.
- `rules`: up to eight temporary mission-scoped `must` or `prefer` operating rules. They never override system, safety, permission, repository, or Mahiro's current instructions and never count as DoD.
- `plan`: bounded mutable work items for reprioritising the current execution path without replacing the mission.
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
- Include `non_goals` and `next_action` when they materially prevent drift.
  A long-running task stays active until its evidence, blocker, checkpoint, or
  human handoff changes its state.
- Include `rules` only when temporary mission-level behavior materially prevents
  drift. `must` is a mission constraint; `prefer` is a non-blocking default.
  Do not restate higher-priority repo/user rules or turn rules into criteria.
- If an existing goal is present, do not replace it unless the user explicitly asked to replace/reset it; draft the replacement first.
- Normal direction changes use `mh_update_goal` action `revise_mission` so the
  objective, DoD, non-goals, rules, phase, or next action evolve in place with
  one short reason. `mh_create_goal` with `replace: true` remains a compatibility
  path for an explicitly approved full replacement and requires the current
  `expected_revision`.
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
  "rules": [
    { "text": "Keep one source writer", "level": "must" }
  ],
  "next_action": "Inspect the current implementation surface"
}
```

## Goal Mode commands and tools

### Preferred Mahiro structured tools, when exposed

- `mh_get_goal` — read current structured state and revision before planning or
  mutation.
- `mh_create_goal` — agent-created objective, criteria, non-goals, next action,
  optional bounded rules, and revision-guarded compatibility replacement.
- `mh_update_goal` — revise the living mission; manage bounded rules and mutable
  plan items; update phase/next action; add evidence; claim agent-owned criteria;
  manage blockers; explicitly move the mission; or complete after the runtime
  audit.

Omitted `rules` preserve the current rule set. `rules: []` explicitly clears it.
Rules are never claimed, verified, or counted in completion progress. Use plan
actions for execution visibility only when those items need durable Goal state;
ordinary short-step visibility still belongs in `UpdatePlan`.

### Cross-conversation move/resume

Use `mh_update_goal` action `move_goal` only after Mahiro directly asks to move
or resume that exact mission in the current conversation. First call
`mh_get_goal`, then pass its stable `goal_id`, latest `expected_revision`, and a
short summary. The destination is always the invoking conversation and must be
empty; source and destination must belong to the same agent. A successful move
transfers mission identity, origin workspace, DoD/evidence, blockers, rules,
mutable plan, lifecycle, and history atomically; it is not a copy.

Do not infer move approval from a generic “continue”, create a duplicate Goal,
or ask Mahiro to clear the source manually. If the destination already owns a
Goal or the revision is stale, reread and report the blocker instead of
overwriting either conversation.

Add evidence before `claim_criterion`. Never claim or verify a human-owned
criterion. Mahiro verifies it through `/mh-goal verify <criterion-id> [note]`
when that human command is exposed.
Use the current `expected_revision` for every model mutation.

When exposed, human commands such as `/mh-goal status`, `/mh-goal-status`, pause/resume,
verify, clear, force-complete, and abandoned-lock recovery remain inspection or
explicit human-control surfaces; they are not the default creation path.

## Workflow ownership boundaries

- **Goal Mode owns mission truth**: stable objective identity, DoD criteria,
  bounded rules, mutable plan, agent claims, human verification, blockers, next
  action, ownership movement, and completion audit.
- **`UpdatePlan` owns immediate execution visibility**. Do not turn every small
  step into a Goal mutation.
- **Execution Run is optional coordination for complex external lanes**. Use the
  unified `mh_execution_run` tool only when multiple executors, worktrees, target
  ownership, or a bounded cross-lane handoff materially help. Do not require it
  for simple edits, and never imply that it launches or controls executors.
- When Goal and Execution Run are both active, bind the relevant Goal criterion
  refs while the run is still in `plan`; after `ready`, treat that binding as
  immutable. A handed-off `code_evidence_intake` is caller metadata, not proof.
- **Code Evidence owns fresh repository/check attribution** after implementation.
  Attach selected evidence to Goal explicitly with `mh_update_goal`; neither an
  executor report nor a Code Evidence intake may auto-claim criteria, verify a
  human gate, or complete a Goal.

## Execute-to-DoD work

For a non-trivial implementation goal, a model-routing experiment, or a handoff
that explicitly transfers execution ownership, read
[execution-contract.md](references/execution-contract.md) before dispatching a
subagent or claiming completion.

That contract adds three things without replacing Goal Mode:

- explicit `planning → executing → verifying → done` state semantics, with
  `needs_human` and `blocked` as the only alternative final-report exits
- a bounded delegation packet whose model, artifact, checks, timebox, and
  partial-handoff requirement are explicit
- one current subagent-routing owner whose exact routes must pass live runtime
  capability checks before dispatch

The contract is an agent procedure and audit boundary. It does not claim that a
skill can intercept a provider turn, enforce a wall-clock timeout, or switch the
main conversation model. Keep those runtime capabilities labelled not
established until the harness implements them.

### Optional official fallback surface

The Mahiro structured tools above are the preferred owner when they are exposed.
Use the following official fallback only when its commands/tools are actually
exposed by the current environment.
Do not reinstall the official package merely to satisfy this skill.

Known command surface:

- `/goal <objective>` — starts a goal for the current conversation.
- `/goal status` — shows the current goal state.
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
- Done: mark the current plan complete only when the objective is actually achieved and no required work remains. Completion preserves the living mission, rules, and evidence for inspection or later explicit revision; it is not destructive clear.
- Blocked: mark blocked only after a repeated blocker leaves the agent at an impasse.
- Obsolete/stale goal: draft the replacement, obtain approval, reread current
  state, then normally revise the living mission in place. Use revision-guarded
  compatibility replacement only for an explicitly approved full replacement.

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
