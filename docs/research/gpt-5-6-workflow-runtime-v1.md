# GPT-5.6 workflow runtime v1

> Implementation note for the `local-conv-236` milestone. This document
> separates current ownership, the controlled pilot policy, and capabilities
> that are not established.

## Current reality

### Repository ownership

- `skills/control-room-goals/SKILL.md` owns Goal/DoD application behavior and
  the boundary between Goal, UpdatePlan, Execution Run, and Code Evidence.
- The default bundle already ships `control-room-goals`; the installer copies a
  skill directory recursively, so references and scripts are delivered with the
  skill.
- Global subagent definitions currently route repo scout to Luna Max, routine
  review/sprite/Thai lanes to Terra Medium, UI review to Sol High, and commit to
  Codex Spark.
- Local subagent execution must still pass `model` explicitly. Agent frontmatter
  is recommendation/discovery metadata rather than a sufficient local routing
  guarantee.

### Effective Mahiro Code configuration checked on 2026-07-27

- Persistent agent default: `chatgpt-plus-pro/gpt-5.6-terra`, high reasoning,
  configured 372,000 context limit.
- `local-conv-236` override while this milestone was implemented:
  `openai-codex/gpt-5.6-sol`, high reasoning, 272,000 context limit.
- No persistent Luna default was applied.

### Previous gap

Goal Mode said that long-running work remains active until evidence, blocker, or
handoff changes its state, but it did not provide:

- one explicit execute-to-DoD state machine
- a provider-correct role/model routing packet
- a reusable partial-handoff/timebox contract
- a machine-validatable Luna pilot record

That left completion behavior understandable in prose but difficult to audit
consistently across real tasks.

## Implemented v1 boundary

`control-room-goals` now links an execution contract that defines:

```text
planning → executing → verifying → done
```

with `needs_human` and `blocked` as the only other valid final-report exits.
The contract distinguishes turn/tool/subagent completion from Goal completion,
requires explicit deliverable and evidence ownership, and supplies exact model
IDs for the pilot routing baseline.

The installed skill also includes
`scripts/pilot-record.ts`, which can initialize and validate a repo-local Luna
pilot record. A `done` record fails closed unless required criteria pass with
evidence, verification coverage is recorded, and first-claim/elapsed metrics are
present. Human-owned passes additionally require Mahiro provenance plus user
evidence; automated test evidence cannot self-verify them. Evidence kinds are
validated against the declared audit vocabulary. `blocked` and `needs_human`
require their exact exit information.

The pilot JSON is still a self-attested audit artifact, not an authenticated
conversation ledger. Structured Goal verification is the authority for human
acceptance; the pilot record mirrors its exact user/message reference so later
review can trace the claim.

## Pilot policy

Run 3–5 real long tasks with Luna Max as the selected main long-task executor.
Each task gets one record under:

```text
.agent-state/model-pilots/<task-id>.json
```

The record captures continuation prompts, premature reports, first-claim DoD,
defects/rework, tool errors, compactions, stopped subagents, verification
coverage, and available token/cache/cost telemetry. Nullable provider telemetry
must remain null when it cannot be proven.

This pilot does not claim that Luna is already the best permanent default.
Terra has completed long tasks when its DoD and artifact boundaries were clear,
and the current Luna sample remains small.

## Not established yet

- A permanent switch of Mahiro Code's agent default to Luna Max
- Automatic main-model switching or safe switch-back leases
- Runtime interception that blocks a premature final turn
- Runtime-enforced subagent wall-clock timeout with guaranteed partial output
- Automatic quality ranking from raw transcript cost/token totals

The v1 skill makes these behaviors explicit and auditable; it does not pretend
to provide deterministic runtime enforcement that Letta Code does not yet own.
