# Adapter Implementation Plan v0

This plan turns the current research into an implementation sequence that matches the existing `mahiro-skills` architecture.

The design constraint is simple: do not fork the product into per-agent installers. Keep the current planner and installer core, then extend adapter capabilities in a way that stays truthful about what each target can automate.

## Goal

Keep the shared adapter core extensible across `cursor`, Gemini CLI, Antigravity CLI (`agy`), skills-only Letta Code, and skills-only Pi support without weakening guarantees around `plan`, install receipts, collision handling, and declared adapter transforms.

## Current starting point

- `cursor` and `gemini` are already represented in the type model
- `src/adapters.ts` is still the hard gate for implemented agents and command support
- `src/plan.ts`, `src/install.ts`, `src/list.ts`, and `src/doctor.ts` already share a single adapter-dependent flow
- `cursor` and `gemini` are now implemented in the runtime for the currently modeled packaged install outputs
- `agy`, `letta-code`, and `pi` use the same skills-only capability seam while retaining different roots and slash identities

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

## Phase 4: Letta Code Agent Skills support

### Why now

Letta Code implements the open Agent Skills directory contract, so the existing opaque `skills/<name>/` copy model maps cleanly onto its documented local and global skill directories.

### Scope

- implement `letta-code` as a skills-only adapter target
- resolve local installs to `.agents/skills/<name>/` via the adapter root `.agents`
- resolve global installs to `~/.letta/skills/<name>/` via the adapter root `~/.letta`
- skip command wrappers because Letta Code's documented skills surface does not define a command artifact directory

### Exit criteria

- `plan` can produce deterministic Letta Code skill-only output
- `install`, `list`, and `doctor` work for Letta Code receipts and installed skill paths
- tests cover root resolution, omitted commands, receipts, and CLI/guided selection
- docs describe Letta Code as Agent Skills-compatible rather than slash-command-compatible

Status: implemented in the current repo pass for packaged Agent Skills trees and receipts.

## Phase 5: Pi Agent Skills support

### Why now

Pi 0.83 implements the Agent Skills standard, discovers global `~/.pi/agent/skills/` and project `.pi/skills/`, supports an explicit `PI_CODING_AGENT_DIR`, and creates `/skill:<name>` commands from discovered skills. That maps directly onto the existing copy-and-receipt core without inventing Pi command wrappers.

### Scope

- implement `pi` as the seventh, skills-only adapter target
- resolve local installs through `.pi/skills/<name>/`
- resolve global installs through `${PI_CODING_AGENT_DIR:-~/.pi/agent}/skills/<name>/`
- preserve explicit isolated config roots and skip copied command wrappers
- expose Pi through direct CLI, guided, full-screen TUI, list/update/uninstall/doctor, docs, and tests

### Exit criteria

- deterministic plans cover local, default-global, and explicit isolated Pi roots
- install/update/list/uninstall/doctor preserve Pi receipts and skills-only behavior
- full-screen and guided `All agents` include Pi without hard-coded count drift
- a real Pi startup discovers an installed skill from the selected adapter root

Status: implemented and natively exercised on 2026-08-04. A temporary global install targeted an explicit isolated `PI_CODING_AGENT_DIR`; offline Pi 0.83 startup then displayed `[Skills] mahiro-style` from that adapter root without a command wrapper or available model. The receipt-backed isolated Pi pilot was subsequently updated with all 25 default skills, passed all 27 doctor checks, and displayed the full skill roster at startup. This proves discovery/startup wiring only—the skills' task behavior still depends on the selected model and tools.

## Phase 6: Antigravity CLI namespaced skill support

### Why separate from Gemini

Agy 1.1.13 shares the broader `~/.gemini` namespace but does not discover Gemini CLI's `commands-gemini/mh-*.toml` artifacts. Its supported customization surface derives slash commands from Agent Skill frontmatter.

### Scope

- implement `agy` as the eighth, skills-only adapter target
- resolve local installs to `.agents/skills/mh-<name>/` and global installs to `~/.gemini/config/skills/mh-<name>/`
- copy complete skill trees, then rewrite only staged alias frontmatter to `name: mh-<name>` and `disable-model-invocation: true`, removing `disable-slash-command`
- preserve canonical receipt item names while resolving namespaced targets through plan, status, doctor, update, and uninstall
- add a bounded real-Agy `/skills` runtime smoke instead of treating file presence as discovery proof

### Exit criteria

- deterministic plans cover local and global Agy roots without copying command wrappers
- install/update/list/uninstall/doctor and Skill Manager use the same namespaced target resolver
- all-agent CLI/TUI surfaces include Agy without count drift
- real Agy 1.1.13 reports `mh-learn` from `~/.gemini/config/skills/mh-learn/SKILL.md` with model invocation disabled

Status: implemented in the current working tree; global runtime discovery is proven, while workspace-local discovery still relies on Agy's documented project customization contract and is not part of the current runtime smoke.

## Deferred items

- full Gemini extension install modeling
- automated settings orchestration for confirmation-heavy tool flows
- any target-specific plugin build pipeline that goes beyond file planning and copied assets
- expansion to future targets before Cursor, Gemini CLI, Agy, Codex, Letta Code, and Pi are stable

## File and module focus for the first implementation pass

- `src/adapters.ts` for capability gates, root resolution, and command support
- `src/plan.ts` for skip, warning, and capability-aware planning behavior
- `src/install.ts` for any target-specific install semantics that cannot stay purely generic
- `src/list.ts` and `src/doctor.ts` for adapter-aware verification behavior
- `test/*.test.ts` for root resolution, receipts, command behavior, and partial-support cases
- `docs/cli/spec-v0.md` and `docs/cli/test-matrix-v0.md` for truth-in-docs after runtime support changes

## Implemented sequence and current direction

The original recommendation was to stabilize Cursor and Gemini adapters before adding an interaction shell. That sequence is now complete: the adapter/planner/receipt core and prompt-guided flow shipped first.

The current `tui` command adds a full-screen Skill Manager over that stable core without replacing direct CLI automation or the guided compatibility path. Future adapter work must continue to land in planner/install/list/uninstall contracts first so the two UI shells cannot invent target-specific behavior independently.
