# Skill Pattern Adaptation — Phase A

Phase A adapts useful skill-writing patterns from external OpenCode/Claude-Code skill packs into Mahiro skills. The goal is to improve the grammar of existing skills, not to copy whole external skills into this repository.

## Default Rule

Do not copy whole external skills as the default move. Prefer extracting durable writing patterns, then applying them to Mahiro-owned skills in repo-local language.

Copying a full skill is a separate porting decision that needs attribution, a clear gap in the existing bundle, and a review of overlap with current Mahiro workflows.

## Transferable Patterns

Use these patterns when creating or revising skills:

These are the Phase A primitives: trigger-aware descriptions, phase gates, stop gates, output contracts, and an adversarial or self-check pass.

1. **Trigger-aware descriptions** — frontmatter descriptions should describe the job and the invocation context. Include phrases like “Use when...” or concrete trigger situations when helpful.
2. **Scope and boundaries** — state what the skill owns, what it does not own, and which mode flags change behavior.
3. **Phase gates** — break complex skills into ordered phases. Each phase should have a goal, action list, and handoff condition.
4. **Stop gates** — explicitly say when to stop, ask, or soften certainty instead of guessing.
5. **Approval gates** — require explicit human approval before irreversible actions such as commits, pushes, deletes, remote changes, or destructive file operations unless the command mode itself is the explicit approval.
6. **Output contracts** — define stable output sections and required fields so the skill produces predictable artifacts.
7. **Adversarial or self-check pass** — before final output, require a verification pass that tries to disprove weak claims, checks evidence, or confirms generated files exist.
8. **High-signal filtering** — prefer fewer, grounded claims over noisy coverage theater. Drop claims that lack evidence or a concrete trigger.

## Recommended Skill Shape

```markdown
---
name: your-skill
description: Action-oriented purpose. Use when the user asks for X, Y, or Z.
---

# /your-skill — Purpose

One short paragraph explaining the skill's job.

## Scope and Boundaries

- In scope: ...
- Out of scope: ...

## Usage

```text
/your-skill [args]
```

## Phase Workflow

### Phase 1: Understand
Goal: ...

### Phase 2: Act
Goal: ...

### Phase 3: Verify
Goal: ...

## Stop Gates

- Stop and ask when ...
- Do not claim ... unless ...

## Output Contract

- Section 1
- Section 2

## Validation / Self-check

- Confirm evidence exists.
- Confirm outputs were written to the intended paths.
- Drop or soften unsupported claims.
```

## Pilot Scope

The first Phase A pilot is the orientation bundle:

- `recap` — evidence ordering and stale-context wording
- `rrr` — retrospective modes, durable notes, and derived pulse metrics
- `forward` — handoff output plus approval semantics for commit/push behavior

This bundle is intentionally small, high-value, and already style-aligned with repo-local `.agent-state` conventions.

## What Not To Import

- External repo-specific paths or command names
- Exact reviewer counts unless the Mahiro skill genuinely needs that many roles
- Upstream branding or prose style
- Long hardcoded examples that make the skill brittle
- Whole skill bodies without a separate porting decision

## Review Checklist

Before merging a skill-writing update:

- Frontmatter has a useful trigger description.
- The skill names its scope and boundaries.
- Complex work is phased.
- Stop/approval gates are explicit.
- Output format is predictable.
- Verification or self-check language exists.
- Paired command wrappers and discovery docs are updated when descriptions change.
- Tests cover only stable contracts, not full markdown snapshots.
