# Adapter Implementation Plan v0

This plan turns the current research into an implementation sequence that matches the existing `mahiro-skills` architecture.

The design constraint is simple: do not fork the product into per-agent installers. Keep the current planner and installer core, then extend adapter capabilities in a way that stays truthful about what each target can automate.

## Goal

Finish the follow-on adapter rollout for `cursor` and `gemini` without weakening the current guarantees around `plan`, install receipts, collision handling, and opaque skill-tree copying.

## Current starting point

- `cursor` and `gemini` are already represented in the type model
- `src/adapters.ts` is still the hard gate for implemented agents and command support
- `src/plan.ts`, `src/install.ts`, `src/list.ts`, and `src/doctor.ts` already share a single adapter-dependent flow
- `cursor` and `gemini` are now implemented in the runtime for the currently modeled packaged install outputs

## Phase 1: Cursor implementation

### Why first

Cursor maps most cleanly onto the current repo-managed file model. Its documented project-local surfaces were the least awkward jump from the original `opencode` and `claude-code` behavior.

### Scope

- implement Cursor as a real adapter target in the adapter gate
- resolve local and global Cursor roots through the existing adapter seam
- define whether commands are fully supported or partially skipped based on the chosen install mode
- keep project-local rules, skills, commands, and instructions as the first supported surface

### Exit criteria

- `plan` can produce deterministic Cursor output
- `install`, `list`, and `doctor` work for at least one local Cursor path
- tests cover root resolution, command behavior, receipts, and any intentional skips or warnings
- docs describe Cursor as implemented rather than spec-only where appropriate

Status: implemented in the current repo pass.

## Phase 2: Gemini project-level support

### Why second

Gemini has strong official surfaces, but the project-level parts are much cleaner than the extension and guided settings flows.

### Scope

- implement Gemini as a real adapter target for project-local outputs first
- support `.gemini/skills`, `.gemini/commands`, receipts, and opaque extension subtree copying as the current first-class packaged install surface
- keep extension-related behavior clearly separate from project-file generation
- do not claim full Gemini support until extension and settings flows have explicit planner semantics

### Exit criteria

- `plan` can produce deterministic Gemini project-level output
- install results distinguish project-file installs from anything still partial or guided
- tests cover Gemini root resolution, planned outputs, receipt behavior, and partial warnings where needed
- docs distinguish first-class Gemini project support from deferred extension/setup support

Status: implemented in the current repo pass for packaged skills, command wrappers, receipts, and opaque extension subtree copying.

## Phase 3: Guided UX after adapter capabilities stabilize

### Why later

Guided UX is valuable, but only after the adapter model can explain what is automatic, what requires confirmation, and what remains partial.

### Scope

- add a thin guided CLI or wizard over the same planner and installer flow
- help the human choose target agent, scope, items, and overwrite behavior
- explain when the next step is a generated file, a config handoff, or a human-confirmed tool flow
- avoid creating a separate product path that bypasses the core planner logic

### Exit criteria

- guided mode produces the same underlying plan semantics as non-guided mode
- output clearly labels automated actions versus human-confirmed actions
- guided mode does not hide partial support behind optimistic wording

Status: implemented in the current repo pass as a thin CLI wizard over the existing planner and installer flow, with summary and confirmation prompts in interactive mode.

## Deferred items

- full Gemini extension install modeling
- automated settings orchestration for confirmation-heavy tool flows
- any target-specific plugin build pipeline that goes beyond file planning and copied assets
- expansion to future spec-only targets before Cursor, Gemini, and Codex are stable

## File and module focus for the first implementation pass

- `src/adapters.ts` for capability gates, root resolution, and command support
- `src/plan.ts` for skip, warning, and capability-aware planning behavior
- `src/install.ts` for any target-specific install semantics that cannot stay purely generic
- `src/list.ts` and `src/doctor.ts` for adapter-aware verification behavior
- `test/*.test.ts` for root resolution, receipts, command behavior, and partial-support cases
- `docs/cli/spec-v0.md` and `docs/cli/test-matrix-v0.md` for truth-in-docs after runtime support changes

## Recommendation

Do not start with TUI.

Start by making Cursor real, then make Gemini project-level real, then wrap that stable behavior in a guided flow. That order gives the repo the highest chance of shipping something easy to use without creating adapter-specific drift or overpromising support that is still only partially modeled.
