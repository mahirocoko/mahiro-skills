---
name: fable
description: Orchestrates hard, long-running, ambiguous, or high-risk work through an explicit mission, falsifiable hypotheses, bounded retries, adaptive specialist lanes, checkpoints, and fresh-context verification. Use when the user invokes /fable or asks for Fable-style execution, when two or more hard-task triggers apply, or when the same hypothesis has failed twice. Do not trigger for Cursor Fable model selection alone.
---

# /fable — Bounded hard-task orchestration

Use Fable as an operating mode for the main agent. It coordinates existing
tools and temporary specialists; it is not a new persistent agent, a fixed
roster, Goal Mode, or a model name.

“Fable” in this skill means Mahiro's evidence-driven workflow pattern. A request
to select or launch Cursor's `claude-fable-*` model belongs to `direct-cli` and
must not trigger this skill by itself.

## Scope and boundaries

Fable owns:

- mission, Definition of Done (DoD), non-goals, and immediate next action
- one falsifiable hypothesis at a time and its cheapest disconfirming probe
- adaptive lane design, retry budgets, checkpoints, and convergence
- fresh verification and an evidence-scoped final verdict

Fable does not:

- replace repo-local instructions, current implementation, or user decisions
- create Goal Mode state without Mahiro's approval
- require subagents when the runtime has none or the task is locally anchored
- launch a fixed number or type of agents for every task
- authorize commits, pushes, releases, destructive actions, or global changes
- turn a small task into process ceremony

## Usage

```text
/fable <hard task>   # Start or reframe bounded execution
/fable status        # Synthesize the current checkpoint without redispatching
/fable close         # Run the verification and outcome gate
```

An explicit `/fable` invocation activates this workflow. The main agent may
also load it automatically when the trigger gate below is satisfied. If work is
already active, continue from current evidence instead of restarting discovery.

## Trigger gate

Escalate immediately when either condition is true:

- the same causal hypothesis or repair direction has been refuted twice
- static checks pass while the required runtime, device, browser, or human
  behavior still fails

Otherwise escalate when at least two signals apply:

- the work spans multiple systems, ownership boundaries, or repositories
- a wrong direction would be costly, destructive, global, or release-sensitive
- the task is ambiguous and needs evidence before behavior-changing edits
- several independent questions can be investigated in parallel
- the task is likely to require multiple repair cycles or a long work block
- security, migration, global settings, native runtime, visual acceptance, or
  production behavior is involved
- a fresh specialist or verifier can independently disprove a material claim

Do not auto-escalate for a typo, obvious one-file fix, routine version bump,
simple status question, or work with one proven local anchor and one cheap test.

When auto-escalating, say why in one concise sentence. Do not ask for redundant
approval if Mahiro already authorized execution and the scope is unchanged.

## Phase workflow

### Phase 1: Frame the mission

Inspect current repo/runtime reality first. Preserve dirty concurrent work and
read the applicable local instructions. Then establish:

```text
FABLE MISSION
Objective: <one outcome>
Current reality: <what evidence says now>
DoD: <agent- and human-owned acceptance conditions>
Non-goals: <nearby work explicitly excluded>
Risk: <why bounded orchestration is justified>
Next probe: <one cheapest disconfirming check>
```

Use `UpdatePlan` for execution visibility when available. If Mahiro has already
approved a structured Goal, bind the mission to that Goal without replacing it.
Otherwise do not create Goal state merely because Fable is active.

### Phase 2: Build the hypothesis ledger

Write compact, falsifiable hypotheses rather than a broad investigation list:

| ID | Hypothesis | Evidence for | Evidence against | Cheapest disconfirming probe | State |
| --- | --- | --- | --- | --- | --- |
| H1 | ... | ... | ... | ... | active |

Keep at most one causal hypothesis `active`. Other hypotheses remain queued.
Record contradictory evidence instead of rewriting the story around the latest
patch.

Default retry budget:

- one cheap probe before a broad edit
- normally one repair cycle, then re-evaluate
- after the same hypothesis/direction fails twice, mark it `REFUTED`, change the
  hypothesis or ownership boundary, and do not submit a cosmetic variant

Provider timeout, unavailable credentials/devices, or missing foreground access
is `BLOCKED` or unknown—not evidence that the hypothesis is false.

### Phase 3: Design adaptive lanes

Delegate only when isolation, parallel evidence, or fresh context materially
helps. A lane packet must contain:

```text
LANE
Role: <scout | specialist | experiment | implement | verify | other>
Question to disprove: <one bounded claim>
Scope: <paths/system/read boundary>
Access: <read-only or exact write ownership>
Evidence expected: <files, commands, runtime observations>
Stop condition: <what ends this lane>
```

Choose roles from the task rather than a fixed roster. Useful patterns include
current-reality scout, system specialist, causal experiment designer, bounded
implementer, and fresh verifier.

Guardrails:

- normally start with no more than two or three independent research lanes
- assign one writer per file, asset contract, or mutable target
- keep review/research lanes read-only unless explicit write ownership helps
- serialize RAM/GPU/browser/indexing-heavy work
- stop unused or refuted lanes promptly
- use explicit models/backends only when the current runtime supports them;
  never invent a route or treat `inherit` as proof of model choice
- if subagents are unavailable, execute the same phases in the main context

The main agent remains conductor: it owns path safety, hypothesis selection,
scope changes, synthesis, implementation acceptance, and communication with
Mahiro.

### Phase 4: Discovery checkpoint

After the first lanes return:

1. Separate observations from recommendations.
2. Compare evidence against the active hypothesis.
3. Mark it `SUPPORTED`, `REFUTED`, or `BLOCKED`.
4. Select one smallest grounded mutation or next probe.
5. Update the plan and stop lanes that no longer contribute.

Do not implement three competing theories at once. If findings materially
change product behavior, ownership, destructive scope, or user acceptance,
surface the decision to Mahiro before mutation.

### Phase 5: Implement the smallest grounded change

- Start from the most concrete file/symbol/runtime anchor.
- Preserve accepted behavior and unrelated changes.
- Add a regression that exercises the real host/caller shape when possible.
- Run the narrowest useful check after each change.
- Expand validation only when the narrow check passes or the risk requires it.
- Do not use a workaround that merely hides the failing state unless that is
  the explicitly approved product behavior.

If the repair fails, update the ledger before another edit. Respect the retry
budget rather than widening the diff under the same narrative.

### Phase 6: Fresh verification

Use a fresh verifier for medium/high-risk implementation when available. Give
it exact claims to disprove, repository/runtime boundaries, and commands or
evidence it may inspect. A reviewer report is evidence, not acceptance by
itself.

Verification scope must match the claim:

- source/typecheck is not runtime proof
- browser evidence is not native/device proof
- one focused test is not whole-product acceptance
- agent evidence cannot verify human-owned visual/product criteria
- installed hash equality is not proof that a live process reloaded it

Run the required foreground, device, browser, reload, release, or Mahiro-owned
acceptance gate before reporting the corresponding claim as verified.

### Phase 7: Converge and close

Stop at one explicit technical outcome:

- `VERIFIED` — required evidence and acceptance gates pass
- `VERIFIED WITH CAVEATS` — core outcome passes; named non-blocking limits remain
- `REFUTED` — the proposed direction is disproven; preserve evidence and state
  the next viable hypothesis
- `BLOCKED` — a concrete dependency prevents a truthful conclusion; provide the
  exact unblock action

Do not use `VERIFIED` when a required human criterion is still waiting. Do not
continue internal retries after an outcome solely to make the report look more
complete.

## Checkpoint contract

Send concise checkpoints only when one of these changes:

- mission/scope or ownership boundary
- active hypothesis or verdict
- mutation begins after discovery
- blocker or user decision appears
- verification phase begins

Checkpoint shape:

```text
Checkpoint: <phase>
Evidence: <what changed our understanding>
Verdict: <SUPPORTED | REFUTED | BLOCKED>
Next: <one action>
```

Avoid narrating every file read, patch hunk, or passing micro-check.

## Integration with related skills

- `control-room-goals` owns approved mission/DoD state and human criteria.
- `direct-cli` owns pane-first Cursor/Antigravity/Codex/Pi execution and Cursor
  Fable model selection.
- `ccc`/repo search owns semantic discovery when code search is needed.
- `recap` owns orientation; `rrr` owns retrospectives and optional gated non-canonical reference learnings.
- Domain skills still own their contracts: Fable coordinates them but does not
  replace frontend, game, sprite, VFX, docs, or release expertise.

Use optional Execution Run/Code Evidence surfaces only when exposed and useful.
Do not invent them, require them for simple work, or treat coordination metadata
as verification proof.

## Golden example

Read [reload-debugging-golden-example.md](references/reload-debugging-golden-example.md)
when a task has repeated false leads, passes static checks but fails in a live
host, or needs a concrete example of lanes converging on a timing/ownership
cause. Treat the example as process evidence, not a universal technical recipe.

## Stop gates

- Stop and ask when the next action changes an unapproved destructive, global,
  production, credential, commit/push/release, or human-owned boundary.
- Stop the same repair direction after two refutations.
- Stop unused background lanes and heavy processes before opening another heavy
  phase.
- Stop before claiming runtime/visual/native/release success without matching
  evidence.
- Do not use Fable ceremony when a smaller direct workflow is already adequate.

## Output contract

Initial output, when material:

1. Mission and why Fable triggered
2. DoD/non-goals
3. Active hypothesis and cheapest probe
4. Lane plan and next checkpoint

Final output:

1. Outcome first
2. Claims with exact evidence and verdict
3. Changed scope/files and checks
4. Remaining caveats or blockers
5. Exact next human action, if any

## Validation / self-check

Before closing, confirm:

- Fable was justified by the trigger gate rather than enthusiasm for agents
- repo/current-runtime evidence outranked remembered patterns
- one falsifiable hypothesis and retry budget were visible
- lane roles were adaptive, bounded, and non-overlapping
- contradictory evidence was preserved
- fresh verification tried to disprove the implementation
- every completion claim matches its evidence scope
- human-owned acceptance remains Mahiro-owned
- commits, pushes, releases, and destructive actions had explicit permission
