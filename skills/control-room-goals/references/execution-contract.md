# Model-aware execution contract

Use this reference for non-trivial implementation goals and explicit execution
handoffs. Goal Mode remains the owner
of objective truth and criteria. This contract owns the procedure between an
approved objective and an evidence-backed terminal report.

## Current reality

- The main agent owns task state, user communication, final synthesis, and Goal
  evidence.
- `UpdatePlan` exposes immediate execution progress.
- `Agent` calls launch temporary lanes; they do not transfer final ownership.
- A subagent definition's recommended model is not a reliable local routing
  guarantee. Pass `model` explicitly on every non-trivial delegated lane.
- Skills can define and validate the protocol, but cannot intercept a provider
  turn, enforce wall-clock timeout, or change the main model by themselves.

## State machine

```text
planning
→ executing
→ verifying
→ done

Alternative report exits:
needs_human
blocked
```

State meanings:

- `planning`: deliverable, scope, criteria, protected contracts, and cheapest
  disconfirming check are known.
- `executing`: the agent is changing the intended artifact or collecting the
  evidence required by the task.
- `verifying`: implementation has stopped changing while claimed behavior is
  checked at the appropriate source/runtime boundary.
- `done`: every required criterion has evidence and no required work remains.
- `needs_human`: a material decision, foreground authorization, or human-owned
  acceptance criterion is the only remaining action.
- `blocked`: a concrete external or technical blocker prevents the next safe
  in-scope action.

`turn complete`, a tool result, a subagent report, a checkpoint, and a passing
focused test are not automatically `done`.

Continue automatically when the next action is clear, safe, reversible, and in
scope. A final report is valid only from `done`, `needs_human`, or `blocked`.
Cost and token totals are telemetry; they are not an automatic stop gate.

## Intake contract

Before implementation, record:

```text
Objective
Deliverable type: chat | file | commit | PR | runtime-proof | other
Deliverable reference
Scope and non-goals
Required criteria
Protected contracts
Verification plan
Human-owned gates
```

If the requested artifact is ambiguous, resolve whether Mahiro expects chat
text, a file, a commit, a PR, or runtime proof before claiming completion.

## Local subagent routing policy

These IDs belong to the Letta `Agent` routing surface, not direct CLI model slugs. Treat this table as the single current owner for this execution contract: verify each route against the live runtime before dispatch, replace superseded entries here, and never append an old and new catalog side by side. This is a local policy, not a universal model ranking.

| Role | Explicit model | Use |
| --- | --- | --- |
| Long implementation / execute-to-DoD | `gpt-5.6-luna-max` | Patient long-task executor |
| Narrow read-only scout | `gpt-5.6-luna-max` | Bounded repo/history mapping |
| Routine specialist or review | `gpt-5.6-terra-medium` | Fast bounded specialist work |
| Interactive fix/controller | `gpt-5.6-terra-high` | Low-latency implementation loop |
| Architecture/UI/frontier/final judgment | `gpt-5.6-sol-high` | Bounded high-judgment escalation |
| Explicit commit request | `gpt-5.6-luna-low` | Existing safe commit lane |

Do not auto-switch the main model during a task. Use a bounded subagent for a
different judgment tier. Sol should judge a prepared evidence packet, not crawl
a broad repository or conversation history without bounds.

## Minimum subagent packet

Every non-trivial lane receives all of these fields:

```text
Role
Objective
Inputs / evidence
Scope
Out of scope
Deliverable format
Acceptance criteria
Checks
Wall-time budget
Partial handoff requirement
Stop/block conditions
Explicit model
```

Operational constraints:

- Use direct tools instead of a subagent for a tiny exact lookup.
- Keep one writer lane per path; reviewers stay read-only.
- Do not overlap two lanes that mutate the same ownership boundary.
- Give background lanes a timebox and request a useful partial artifact before
  expiry. If the runtime cannot enforce the timeout, the main agent must monitor
  it and record a stopped-without-output outcome truthfully.
- A worker report is evidence input, not automatic proof or Goal completion.

## Completion gate

Before entering `done`, check:

1. The requested deliverable exists at the promised reference.
2. Every required criterion has exact evidence.
3. Verification matches the claim scope: source is not runtime, browser is not
   native, and a focused pass is not whole-product proof.
4. Required human-owned criteria are verified by Mahiro, not self-verified.
5. No known blocker, failed check, or required follow-up remains hidden.
6. The Goal has fresh evidence before any agent-owned criterion is claimed.

If one condition fails, remain in `executing` or `verifying`, or use the exact
`needs_human`/`blocked` exit.
