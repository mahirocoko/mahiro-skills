# Cursor and Gemini Compatibility Matrix v0

This document narrows the broader CLI spec into the two follow-on adapter surfaces that matter most beyond the original `opencode` and `claude-code` pair.

It is intentionally practical. The goal is to show which surfaces map cleanly onto the current planner and installer model, which ones need human confirmation, and which ones should stay partial until they are modeled explicitly.

## Scope

This matrix is grounded in two things:

- the current `mahiro-skills` architecture, which uses one planner and installer pipeline with adapter capability gates
- the researched official surfaces for Cursor and Gemini

This page does not redefine the whole CLI spec. It exists to make the next rollout concrete.

## Current repo baseline

- `cursor` and `gemini` already exist in the type model
- runtime adapter support now includes both `cursor` and `gemini`
- the current installer copies skill trees opaquely and writes receipts under the adapter root
- the current Gemini subtree already includes browser-extension assets, but that extension flow is not modeled as first-class install behavior yet

## Compatibility matrix

| Agent | Project-local artifacts | User/global artifacts | Command surface | MCP/config surface | Automation safety | Recommended support level in next pass | Notes |
|------|--------------------------|-----------------------|-----------------|-------------------|------------------|----------------------------------------|-------|
| Cursor | `.cursor/skills`, `.cursor/commands` | `~/.cursor/skills`, `~/.cursor/commands` | Supported through the current boolean adapter capability model | `.cursor/mcp.json` and related confirmation flows remain follow-on surfaces | High for the currently modeled file outputs, medium when confirmation is required | First-class for current install outputs | Runtime support currently models packaged skills, commands, and receipts under the resolved Cursor root |
| Gemini | `.gemini/skills`, `.gemini/commands/*.toml` | `~/.gemini/skills`, `~/.gemini/commands/*.toml` | Supported through the current boolean adapter capability model, with native TOML command artifacts | Extension, settings, and MCP surfaces remain partial follow-on work | High for the currently modeled file outputs, lower for extension/setup flows | First-class for current install outputs, partial for extension/setup flows | Runtime support currently models packaged skills, native Gemini commands, receipts, and opaque extension subtree copying under the resolved Gemini root |

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
- Keep Gemini as a first-class adapter target for current packaged install outputs
- Keep Gemini extension and settings flows partial until they have explicit planner semantics
- Add guided UX only after the capability model is stable enough to describe these states honestly
