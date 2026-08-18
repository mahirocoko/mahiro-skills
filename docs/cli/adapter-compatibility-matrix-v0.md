# Adapter Compatibility Matrix v0

This document records the current install surfaces for the supported adapters. The shared planner, installer, receipt, doctor, update, and uninstall core remains authoritative; adapter-specific behavior is limited to roots, command capability, and declared transforms.

## Current adapter set

| Agent | Local root | Global root | Command output | Notes |
| --- | --- | --- | --- | --- |
| OpenCode | `.opencode` | `~/.config/opencode` | Markdown wrapper | Skills, commands, and receipts |
| Claude Code | `.claude` | `~/.claude` | Markdown wrapper | Skills, commands, and receipts |
| Cursor | `.cursor` | `~/.cursor` | Markdown wrapper | Skills, commands, and receipts |
| Agy | `.agents` | `~/.gemini/config` | None | Installs only transformed `skills/mh-<name>/` aliases exposed as `/mh-<name>` |
| Codex | `.codex` | `~/.codex` | Markdown compatibility wrapper | Skills, commands, and receipts |
| Letta Code | `.agents` | `~/.letta` | None | Agent Skills trees only |
| Pi | `.pi` | `${PI_CODING_AGENT_DIR:-~/.pi/agent}` | None | Agent Skills trees exposed by Pi as `/skill:<name>` |

## Agy contract

- Agy is the sole Google CLI-family install adapter.
- Every requested skill is copied to `skills/mh-<name>/`; no unprefixed copy is installed by the Agy adapter.
- The staged `SKILL.md` is rewritten to `name: mh-<name>` with `disable-model-invocation: true`, and `disable-slash-command` is removed.
- Canonical skill names remain in receipts so plan, doctor, update, skill-manager, and uninstall resolve the namespaced targets deterministically.
- Agy install does not copy Markdown or TOML command artifacts.
- If a v2 receipt from the retired Gemini CLI adapter exists, Agy install removes only unchanged receipt-managed canonical skills and TOML commands. Modified, invalid, and unrelated files are preserved with warnings.

The standalone packaged `gemini` skill remains a workflow for Gemini web/MQTT control. It is a skill payload, not an install adapter.

## Shared rules

- Keep one planner and installer pipeline.
- Express target differences through adapter capabilities rather than separate installers.
- Treat receipts as the only authority for managed removal.
- Never remove a modified retired-adapter target automatically.
- File presence proves install output, not real runtime discovery; use bounded runtime smoke evidence before release claims.
