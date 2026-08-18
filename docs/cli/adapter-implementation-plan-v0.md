# Adapter Implementation Plan v0

This plan keeps one shared planner, installer, receipt, doctor, update, and uninstall core across the current adapter set.

## Goal

Support OpenCode, Claude Code, Cursor, Agy, Codex, Letta Code, and Pi without forking the product into per-agent installers or overstating unsupported command surfaces.

## Current state

- `src/types.ts` owns the supported adapter set.
- `src/adapters.ts` owns roots, command capability, and target path transforms.
- `src/plan.ts`, `src/install.ts`, `src/list.ts`, `src/doctor.ts`, and `src/uninstall.ts` share the adapter-dependent lifecycle.
- Cursor and Codex copy Markdown command wrappers.
- Agy, Letta Code, and Pi are skills-only adapters with distinct roots and slash identities.
- Guided and full-screen TUI flows consume the same core plans and receipts.

## Agy namespaced skill support

### Scope

- resolve local installs to `.agents/skills/mh-<name>/`
- resolve global installs to `~/.gemini/config/skills/mh-<name>/`
- copy complete skill trees, then rewrite only staged alias frontmatter to `name: mh-<name>` and `disable-model-invocation: true`, removing `disable-slash-command`
- preserve canonical receipt item names through plan, status, doctor, update, and uninstall
- install no unprefixed skill copy and no command-wrapper artifact
- detect v2 receipts from the retired Gemini CLI adapter and remove only unchanged receipt-managed canonical skills/TOML commands; preserve modified, invalid, and unrelated files

### Exit criteria

- deterministic plans cover local and global Agy roots
- every Agy target path contains `skills/mh-<name>/`
- install/update/list/uninstall/doctor and Skill Manager use the same namespaced resolver
- `--agent gemini` is rejected as unsupported
- fixture tests prove retired-adapter cleanup is receipt-bound and hash-bound
- a bounded real-Agy `/skills` check reports only the intended `mh-*` aliases before release

## Other adapter boundaries

- OpenCode, Claude Code, Cursor, and Codex keep their documented skill/command roots.
- Letta Code copies Agent Skills only to `.agents` locally and `~/.letta` globally.
- Pi copies Agent Skills only to `.pi` locally or `${PI_CODING_AGENT_DIR:-~/.pi/agent}` globally.
- The standalone packaged `gemini` skill remains an opaque skill tree and is not an install adapter.

## Deferred items

- automatic MCP or provider configuration
- target-specific plugin build pipelines
- broader confirmation-heavy settings orchestration
- future adapters before the current lifecycle remains stable

## Change checklist

- update `src/types.ts` and `src/adapters.ts`
- update planner/install/list/doctor/uninstall behavior and receipt tests
- update guided/TUI agent counts and selection tests
- update README, CLI spec, compatibility matrix, examples, and authoring conventions
- run focused tests, full Bun tests, TypeScript, `gaps --json`, and exact retired-contract search
