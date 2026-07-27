# Runtime owners should not duplicate model routing

**Date**: 2026-07-27  
**Tags**: `letta-code`, `model-routing`, `subagents`, `mods`, `goal`, `execution-run`

## Lesson

Workflow reliability improves when each layer owns one kind of truth:

- Main agent chooses the task strategy and explicit subagent model.
- Skills own reusable execution packets, DoD procedure, and pilot recording.
- Custom subagents own distinct role/tool/model boundaries.
- Mods own revisioned deterministic state, human gates, coordination metadata, and evidence intake.

Do not copy the same orchestration logic into every layer. In particular,
`mahiro-execution-run` should remain executor-neutral: it may record declared
lanes, sessions, ownership, reports, blockers, and handoff metadata, but it must
not choose models, submit prompts, spawn/cancel agents, or treat reports as proof.

## Operational rule

Pass the model explicitly on every Agent call because local subagents can inherit
the active parent conversation before consulting frontmatter recommendations.
Use `long-task-executor` only with an approved bounded packet. Attach fresh Code
Evidence before Goal claims, and keep Mahiro's human verification authoritative.

## Evidence

- `skills/control-room-goals/references/execution-contract.md`
- `skills/control-room-goals/scripts/pilot-record.ts`
- `/Users/mahiro/ghq/github.com/mahirocoko/mods/mods/mahiro-execution-run.ts`
- `/Users/mahiro/ghq/github.com/mahirocoko/mods/README.md`
- `~/.letta/agents/long-task-executor.md`
