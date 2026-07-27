# Model-aware execution contract

Use this reference for non-trivial implementation goals, explicit execution
handoffs, and the controlled GPT-5.6 Luna Max pilot. Goal Mode remains the owner
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

## Pilot routing baseline

This is a pilot policy, not a permanent universal ranking.

| Role | Explicit model | Use |
| --- | --- | --- |
| Long implementation / execute-to-DoD | `gpt-5.6-luna-plus-pro-max` | Patient long-task executor |
| Narrow read-only scout | `gpt-5.6-luna-plus-pro-max` | Bounded repo/history mapping |
| Routine specialist or review | `gpt-5.6-terra-plus-pro-medium` | Fast bounded specialist work |
| Interactive fix/controller | `gpt-5.6-terra-plus-pro-high` | Low-latency implementation loop |
| Architecture/UI/frontier/final judgment | `gpt-5.6-sol-plus-pro-high` | Bounded high-judgment escalation |
| Explicit commit request | `openai-codex/gpt-5.3-codex-spark` | Existing safe commit lane |

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

## Luna Max pilot record

For each of the first 3–5 real long tasks, create a repo-local record instead of
tracking results only in memory:

```bash
SKILL_DIR="/absolute/path/to/installed/control-room-goals"
RECORD="$PWD/.agent-state/model-pilots/<task-id>.json"

bun "$SKILL_DIR/scripts/pilot-record.ts" init \
  --output "$RECORD" \
  --task-id "<task-id>" \
  --objective "<objective>" \
  --workspace "$PWD" \
  --conversation-id "$CONVERSATION_ID" \
  --deliverable-type "file" \
  --deliverable-ref "<path-or-proof-reference>" \
  --criterion "<required criterion>"
```

Update the JSON as execution proceeds. Record subagent models explicitly and
finish the metrics from transcript/runtime evidence where available. Do not
invent unavailable cost or token values; nullable fields stay `null`.
For a human-owned criterion, keep `verifiedBy` and `verifiedAt` null until Mahiro
explicitly accepts it. A passed human criterion must then record
`verifiedBy: "mahiro"`, the acceptance timestamp, and an evidence reference whose
kind is `user`; automated checks can never substitute for that provenance. The
record validator checks this audit shape but does not authenticate conversation
history. The structured Goal's human verification remains authoritative; copy
its exact user/message reference into the pilot record instead of inventing one.

Validate before reporting the pilot task terminal:

```bash
bun "$SKILL_DIR/scripts/pilot-record.ts" validate "$RECORD"
```

The validator requires evidence-backed criteria for `done`, a blocker for
`blocked`, and an exact next human action for `needs_human`. It also checks that
stopped-without-output subagents match the reported metric.

Track at least:

- “continue” prompts from Mahiro
- premature reports
- first-claim DoD result
- defects and rework
- elapsed time
- tool/runtime errors
- compactions
- stopped subagents without usable output
- verification coverage
- available token/cache/cost telemetry

## Not established yet

- Luna Max as Mahiro Code's permanent default model
- automatic parent-model switching or switch-back leases
- runtime interception that prevents a premature assistant final turn
- automatic wall-clock cancellation with guaranteed partial handoff
- quality ranking from raw conversation token or cost totals

Promote any of these only after runtime implementation or the 3–5 task pilot
provides direct evidence.
