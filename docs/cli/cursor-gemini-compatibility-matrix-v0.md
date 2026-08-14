# Cursor, Gemini, and Agy Compatibility Matrix v0

This document narrows the broader CLI spec into the Cursor, Gemini CLI, and Antigravity CLI adapter surfaces that matter most beyond the original `opencode` and `claude-code` pair.

It is intentionally practical. The goal is to show which surfaces map cleanly onto the current planner and installer model, which ones need human confirmation, and which ones should stay partial until they are modeled explicitly.

## Scope

This matrix is grounded in two things:

- the current `mahiro-skills` architecture, which uses one planner and installer pipeline with adapter capability gates
- the researched official surfaces for Cursor and Gemini

This page does not redefine the whole CLI spec. It exists to make the next rollout concrete.

## Current repo baseline

- `cursor`, `gemini`, and `agy` exist as distinct runtime adapter targets
- Gemini CLI and Agy share part of the `~/.gemini` namespace but do not share a custom-command format
- the current installer copies skill trees opaquely and writes receipts under the adapter root
- the current Gemini subtree already includes browser-extension assets, but that extension flow is not modeled as first-class install behavior yet

## Compatibility matrix

| Agent | Project-local artifacts | User/global artifacts | Command surface | MCP/config surface | Automation safety | Recommended support level in next pass | Notes |
|------|--------------------------|-----------------------|-----------------|-------------------|------------------|----------------------------------------|-------|
| Cursor | `.cursor/skills`, `.cursor/commands` | `~/.cursor/skills`, `~/.cursor/commands` | Supported through the current boolean adapter capability model | `.cursor/mcp.json` and related confirmation flows remain follow-on surfaces | High for the currently modeled file outputs, medium when confirmation is required | First-class for current install outputs | Runtime support currently models packaged skills, commands, and receipts under the resolved Cursor root |
| Gemini | `.gemini/skills`, `.gemini/commands/*.toml` | `~/.gemini/skills`, `~/.gemini/commands/*.toml` | Supported through the current boolean adapter capability model, with native TOML command artifacts | Extension, settings, and MCP surfaces remain partial follow-on work | High for the currently modeled file outputs, lower for extension/setup flows | First-class for current install outputs, partial for extension/setup flows | Runtime support currently models packaged skills, native Gemini commands, receipts, and opaque extension subtree copying under the resolved Gemini root |
| Agy | `.agents/skills/mh-*` | `~/.gemini/config/skills/mh-*` | Supported through Agy-discovered namespaced skill aliases; Gemini TOML commands are not compatible | Rules, plugins, hooks, MCP, and broader config remain separate follow-on surfaces | High for copied skill aliases and receipts; runtime discovery must be tested with the real Agy CLI | First-class for namespaced `/mh-*` skill commands | Runtime support preserves complete skill resources, rewrites only staged alias frontmatter, and records canonical receipt item names |

## Cursor

### Clean fits for the current installer

- project-local skill and command installation under `.cursor/`
- user-scoped skill and command installation under `~/.cursor/`
- receipt writing and doctor/list verification under the resolved Cursor root

### What should still be explicit in UX

- that current runtime support is limited to packaged skills, command wrappers, and receipts
- when a future Cursor rule, MCP, or confirmation-driven setup falls outside the currently modeled install flow
- when broader Cursor surfaces are documented as follow-on work rather than current runtime behavior

## Gemini

### Clean fits for the current installer

- project-local skill and command installation under `.gemini/`
- user-scoped skill and command installation under `~/.gemini/`
- packaged Gemini commands install natively as `.toml` files under the resolved `commands/` directory
- receipt writing and doctor/list verification under the resolved Gemini root
- opaque copying of the packaged Gemini extension subtree as part of the `gemini` skill payload

### Partial areas that need honest labeling

- extension installation
- extension settings and consent flows
- any setup that depends on runtime browser state or guided IDE/CLI confirmation

The repo bundles Gemini extension assets as copied subtree content, but bundling is not the same as a fully modeled extension install contract.

## Agy

### Confirmed runtime boundary

- Agy 1.1.13 loads Agent Skills but does not discover `commands-gemini/mh-*.toml`
- Agy's bundled customization guide identifies Rules, Skills, Plugins, Hooks, and MCP as customization types; TOML custom commands are a Gemini CLI surface
- Agy global discovery uses `~/.gemini/config/`; workspace discovery uses `.agents/` and compatible singular/underscore variants
- Agy derives the user slash name from skill frontmatter, so the adapter installs `name: mh-<name>` aliases rather than pretending a TOML file is active

### Adapter contract

- Copy each requested canonical skill tree into `skills/mh-<name>/` so scripts, references, examples, and assets remain relative and self-contained
- Set `disable-model-invocation: true` on the alias so canonical installed skills remain the model-discovery owners
- Remove any source `disable-slash-command` field from the staged alias so `/mh-<name>` is user-invocable, including `/mh-learn`
- Keep canonical names in receipts and resolve the namespaced target through the adapter for doctor, status, update, and uninstall
- Treat a filesystem PASS as incomplete until real `agy -p /skills --output-format json` evidence includes the namespaced skill

## Shared adapter rules

- Keep one planner and installer pipeline
- Express target differences through adapter capabilities, not separate product logic per agent
- Treat project-scoped file generation as the most reliable first-class surface
- Surface confirmation-heavy or user-scoped actions as guided steps, not silent writes
- Keep receipts and `plan` output truthful about what was installed, skipped, or left to the human

## Support language to use

Use wording like this in future docs and CLI output:

- **First-class**: the adapter can plan and install the documented project-level surface directly
- **Partial**: the adapter can generate some artifacts or handoff steps, but still relies on human confirmation or an unmodeled tool-specific flow
- **Deferred**: the surface exists in product docs, but `mahiro-skills` does not model it yet

## Recommendation

- Keep Cursor as a first-class adapter target
- Keep Gemini CLI and Agy as separate first-class adapter targets for their respective packaged outputs
- Keep Gemini extension and settings flows partial until they have explicit planner semantics
- Add guided UX only after the capability model is stable enough to describe these states honestly
