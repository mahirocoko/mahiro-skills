# Handoff to `local-conv-236`: GPT-5.6 workflow improvement

> Mahiro approved `local-conv-236` as the main execution lane for this workflow-improvement milestone on 2026-07-27. `local-conv-225` will stop editing and act only as an independent reviewer or historical-evidence lane when explicitly asked.

## Ownership

You own this milestone from grounded investigation through implementation and verification.

Do not treat this as another research-only pass. Convert the findings into the smallest durable workflow/harness improvement that can be tested with real work, while preserving repo and runtime reality.

## Mission

Build a stronger model-aware execution workflow for Mahiro Code around three linked decisions:

1. Explicit subagent model routing
2. A controlled Luna Max pilot as the default long-task executor
3. An orchestration/completion contract that continues safe in-scope work until Definition of Done instead of reporting at arbitrary turn boundaries

The objective is not to select the model with the highest benchmark score. The objective is to make Mahiro's real tasks finish more reliably, with fewer repeated “continue” instructions, less premature reporting, bounded escalation cost, and evidence-backed completion.

## Required evidence to read first

Read these files before proposing or editing anything:

- `docs/research/gpt-5-5-vs-5-6-routing-2026-07.md`
- `docs/research/mahiro-code-conversation-model-usage-2026-07.md`
- Current `git status`
- Repository `AGENTS.md`, README, relevant source/config, and current tests
- Current global agent definitions under `~/.letta/agents/` when they are in scope
- Current Mahiro Code model/context settings when they are in scope

Repo files and current runtime behavior override this handoff when they conflict. Report any conflict instead of silently forcing this proposal.

## Agreed routing baseline

| Role | Preferred model | Intent |
|---|---|---|
| Long implementation / execute-to-DoD | Luna Max | Patient, economical long-task executor |
| Narrow repo scout / bounded research | Luna Max | Read-only mapping with explicit scope |
| Routine specialist or review | Terra Medium | Fast, economical specialist work |
| Interactive fix/controller | Terra High | Low-latency implementation loop |
| Architecture, UI judgment, frontier debugging, final judgment | Sol High | Bounded high-judgment escalation |
| Commit | Codex Spark | Existing safe commit lane |

Always pass the intended model explicitly in subagent calls. Do not depend on parent-model inheritance.

This is a pilot routing baseline, not a permanent final policy. Do not globally switch the default model or rewrite unrelated agent definitions without Mahiro's explicit approval.

## Execution contract

Model the work with explicit states:

```text
planning
→ executing
→ verifying
→ done

Alternative exits:
needs_human
blocked
```

Required semantics:

1. `turn complete` is not `goal complete`.
2. Continue automatically when the next action is clear, safe, in scope, and reversible.
3. A final report is allowed only when the task is `done`, genuinely `blocked`, or requires a material human decision (`needs_human`).
4. Token/cost budgets are telemetry, not automatic stop gates.
5. Define the deliverable at intake: `chat | file | commit | PR | runtime proof` or another explicit artifact.
6. Completion requires evidence appropriate to the task: diff, tests, browser/native proof, user-owned review, or an explicit documented exception.
7. Do not auto-switch the main model mid-task. Model changes, reloads, and compaction can interfere with one another; use bounded subagent escalation instead.

## Minimum subagent packet

Every non-trivial delegated lane must receive:

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

A background lane must return a useful partial handoff when its timebox expires. Do not launch broad Sol research crawls without a bounded evidence packet.

## Luna Max pilot

Run a controlled pilot across 3–5 real long tasks before recommending a permanent main-model default.

Track at least:

- Number of times Mahiro must say “continue” or equivalent
- Premature checkpoint/final reports
- Whether DoD passes on the first claimed completion
- Defects and rework after the claim
- Elapsed time
- Tool/runtime errors
- Subagents stopped without usable output
- Token, cache, and cost telemetry when available
- Compaction count or context-related disruption
- Verification coverage

Compare outcomes with prior Terra and Sol work only where task shape and evidence are sufficiently comparable. Do not turn raw conversation totals into a quality ranking.

## Known caveats

- Terra can complete long work when DoD and artifact boundaries are strong; do not describe it as incapable of long execution.
- Some prior stopping behavior came from the removed Goal token-budget gate, not model protection.
- GPT-5.6 tool/reasoning integration and context metadata have had runtime inconsistencies. Separate provider/harness failures from model judgment failures.
- ChatGPT/Codex OAuth context should follow first-party runtime evidence. Do not assume a generic 1M API context applies to this harness.
- Sol High has strong judgment but its list-price input/output rates and cache-write premium can make large-context use expensive. Escalate with a narrow evidence packet.
- The current Luna evidence set is promising but small. Describe it as a pilot until the real-task sample grows.

## Definition of Done for this milestone

The milestone is ready for Mahiro's review when:

1. Current workflow/runtime ownership is mapped from actual files and behavior.
2. One minimal, durable orchestration/completion improvement is implemented at the correct ownership boundary.
3. Explicit model routing is represented wherever the implementation owns delegation.
4. Premature completion is prevented or made auditable through state/evidence contracts.
5. The Luna pilot has a usable recording format and can be run without hidden manual bookkeeping.
6. Narrow tests/checks for the changed ownership boundary pass.
7. Documentation distinguishes current reality, pilot policy, and not-yet-established direction.
8. No unrelated settings, work, or user edits are overwritten.
9. No commit or push is created unless Mahiro explicitly requests it.

## Immediate next action

Start with repository/runtime reality and identify the smallest existing ownership boundary where this contract belongs. Present one falsifiable implementation hypothesis and its cheapest disconfirming check, then implement and verify rather than opening another broad research phase.

When ready, report:

1. What owns the workflow today
2. What changed and why
3. Evidence/checks
4. What remains pilot-only
5. Exact next task Mahiro should use to test Luna Max
