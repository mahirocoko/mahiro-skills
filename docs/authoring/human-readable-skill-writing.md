# Human-Readable Skill Writing — Phase B

A skill is runtime guidance for an agent, but it is also a field guide for the
person maintaining, reviewing, or learning from it. A technically complete
skill can still be hard to trust when it reads like a wall of imperatives,
schema fields, or disconnected checks.

Phase A established the reliability grammar: trigger-aware descriptions,
boundaries, ordered phases, stop gates, output contracts, and self-checks. Phase
B adds the missing reader contract: explain the purpose, teach the decision
model, and make the procedure understandable without weakening its operational
precision.

This direction was prompted by studying the public `emilkowalski/skills`
repository. Adopt the transferable writing pattern, not its domain doctrine or
exact prose. Mahiro-owned skills remain repo-reality-first and keep their own
ownership, evidence, and approval rules.

## The Two Readers

Write every skill for two readers at once:

1. **The agent** needs a reliable trigger, bounded procedure, stop conditions,
   resources, and a stable result.
2. **The human** needs to understand what the skill is for, why the sequence
   exists, what judgment it encodes, and where its authority ends.

Do not sacrifice one reader for the other. Friendly prose without executable
boundaries becomes vague advice. Dense rules without explanation become an
opaque machine contract that people cannot inspect or learn from.

## Start With the Job, Not the Machinery

After the frontmatter and title, explain the skill in one short paragraph:

- What problem does it solve?
- What useful result does it produce?
- What principle keeps it from doing too much?

This paragraph is not a second description field. Frontmatter routes the skill;
the opening orients the person who chose to read it.

Prefer:

> Study an external codebase without mixing its source into the current repo.
> Keep the clone replaceable, keep the learning notes durable, and make every
> exploration traceable to one source snapshot.

Avoid:

> Follow the steps below. IMPORTANT: obey every rule.

## State the Operating Posture

Use an `Operating Posture` section when the quality of the work depends on a
way of thinking, not only a command sequence. Explain the role the agent should
play and the failure mode it should resist.

Good posture answers questions such as:

- Is this skill a builder, advisor, reviewer, archivist, or coordinator?
- Should it optimize for breadth, precision, restraint, recovery, or speed?
- What tempting shortcut produces bad work?
- Which decisions belong to the human or another skill?

Keep this section short. It should change judgment, not restate every stop gate.
Operational utilities with no meaningful judgment call may omit it.

## Teach the Decision Sequence

Order sections by the decisions a careful practitioner would make, not by the
shape of the implementation or the order in which the author discovered the
rules.

A useful sequence often looks like:

1. **Frame** — decide whether the skill applies and bound the job.
2. **Ground** — inspect current evidence and identify the active owners.
3. **Decide** — apply the domain model before choosing mechanics.
4. **Act** — run the smallest procedure that satisfies the decision.
5. **Verify** — test the result and separate observation from inference.
6. **Hand off** — return a stable artifact, blocker, or next action.

Not every skill needs these exact labels. The rule is conceptual: let a reader
follow the reasoning from problem to evidence to action to proof.

## Explain the Why Where It Changes Behavior

Most rules do not need an essay. Add rationale when it helps a person predict a
new case, distinguish two similar paths, or understand why a tempting shortcut
is unsafe.

Useful rationale is local and concrete:

> Give subagents separate literal source and destination paths. If they receive
> only the source symlink, they may write generated notes into the learned repo.

Avoid ceremonial rationale:

> This rule is important because correctness is important.

If the explanation does not improve a future decision, remove it.

## Use Examples as Teaching Tools

Examples should expose a decision, boundary, or expected artifact. Prefer one
representative example with a short explanation over several near-duplicates.

A good example shows:

- the input or situation
- the decision the skill should make
- the resulting command, artifact, or wording
- the reason this path is correct when the reason is not obvious

Keep examples repo-neutral unless the skill deliberately documents one named
system. Do not let historical evidence names leak into a reusable template.

## Keep Boundaries and Handoffs Plain

State what the skill owns, what it does not own, and where adjacent work goes.
Write these as useful directions rather than legalistic disclaimers.

For example:

- `motion-design` defines a motion brief; target-repo code and rendered QA prove
  the implementation.
- `learn` studies a repository; `/project incubate` owns cloning for active
  development.

If the skill is intentionally read-only, explicit-only, recommendation-only, or
human-gated, say so near the beginning. Do not hide a load-bearing boundary at
the end of a long file.

## Use Progressive Disclosure for People Too

Move detail into `references/` when it is needed only for a branch of the
workflow, a specific platform, a long catalog, or exact troubleshooting. Link
every reference directly from `SKILL.md` and tell the reader when to open it.

Keep in `SKILL.md`:

- purpose and posture
- trigger and ownership boundaries
- the core decision sequence
- stop/approval gates
- output and verification contracts
- a small number of representative examples

Move out:

- long API tables and catalogs
- platform- or provider-specific recipes
- repeated prompt templates
- historical evidence and provenance detail
- troubleshooting branches that do not affect the default path

Splitting a file is not automatically better. A reference that merely repeats
the entry skill creates two owners and makes drift more likely.

## Keep Machine Contracts Visible but Secondary

Commands, schemas, exact output fields, and validation checklists remain
important. Introduce them after the reader understands the job and decision
model. A skill should not open with a large code block unless invoking that
command is genuinely the first decision.

Use emphasis sparingly. Reserve `MUST`, `CRITICAL`, and warning markers for
rules whose violation causes data loss, wrong ownership, unsafe side effects,
or a materially false result. When every paragraph is urgent, none of them is.

## Recommended Shape

Use only the sections the skill needs:

```markdown
---
name: your-skill
description: Action-oriented purpose. Use when the user asks for X, Y, or Z.
---

# Skill Name

One short paragraph explaining the job and useful result.

## Operating Posture

The role, quality bar, and main failure mode.

## Scope and Handoffs

What this skill owns, what it leaves alone, and where adjacent work goes.

## Decision Sequence

Ordered decisions and actions, with rationale where it changes behavior.

## Example

One representative case that teaches the procedure.

## Stop Gates

When to stop, ask, narrow, or soften certainty.

## Output Contract

The stable artifact or response shape.

## Validation / Self-check

Evidence required before claiming success.

## References

Focused companions and when to read them.
```

Do not force every heading into every skill. A tiny lookup skill may need only a
purpose, usage, lookup rule, and output example. A fragile operational workflow
may need detailed gates but little domain explanation. Match the writing shape
to the job's risk and degree of freedom.

## Migration Strategy

Do not rewrite the catalog for heading uniformity. Improve a skill when one of
these triggers is present:

- the skill is already being changed for real behavior
- people repeatedly misunderstand its purpose or handoff
- the default path is buried under implementation detail
- warnings dominate the reading experience
- a long entry file has clear branch-specific material to move into references

For a writing-only pass, preserve behavior, trigger semantics, commands, paths,
approval gates, and output ownership. Review the diff for accidental contract
changes before judging the prose.

## Human Readability Review

Read the skill once as a maintainer rather than as an executor:

- Can you explain its job after the opening paragraph?
- Does the posture reveal how to make a judgment call?
- Do sections follow the actual decision order?
- Are boundaries and handoffs easy to find?
- Does every large example teach something?
- Are warnings proportional to risk?
- Could a person learn the method without executing the skill?
- Could an agent still identify the exact gates, outputs, and proof required?

The goal is not conversational decoration. The goal is inspectable procedural
knowledge: clear enough to teach, precise enough to run.
