---
description: Direct executor playbook for using Cursor CLI, Antigravity CLI, Codex CLI, and Pi through Herdr-managed panes with a tmux fallback. Use when you want a pane-first direct CLI lane, ask to use Pi or "ใช้ Pi", need narrow current-worktree follow-up, or need fresh-session recovery.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - WebFetch
---

# /direct-cli

Execute the `direct-cli` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "direct-cli"` instead of reading the file manually.

**Otherwise**: Resolve the installed `direct-cli/SKILL.md` under the current agent's configured skills root, then follow ALL instructions in it. Do not assume a source-checkout-relative `skills/...` path.

Parse `--backend auto|herdr|tmux` before creating any lane; omission means `auto`. Parse an optional Herdr `--workspace ID` into the playbook's workspace target instead of guessing by label. Auto selects Herdr only inside a healthy compatible Herdr-managed pane and otherwise selects tmux. Announce the backend, never silently switch after creating state, then use the matching known-good launch/read/prompt commands from the skill playbook.

Unless `$ARGUMENTS` explicitly requests `--safe`, read-only, sandboxed, or approval-prompted execution, use the skill's uninterrupted current-worktree defaults: Cursor `--yolo --approve-mcps --trust`, Antigravity `--dangerously-skip-permissions`, Codex `--dangerously-bypass-approvals-and-sandbox`, and Pi `--approve` with `read,bash,edit,write,grep,find,ls`. Never weaken these defaults merely because the lane is launched through Herdr. These flags do not expand task scope or authorize destructive operations, secrets, commits, pushes, releases, or installs.

Treat `--detach` as a skill-level Herdr-only mode after agents are visibly ready. Require or derive a unique `--job-id`, then start `herdr-jobs.py` with explicit `--mode auto|callback|watcher`; do not unconditionally start a watcher because callback mode deliberately launches none. If the current main runtime exposes a background `Monitor` that reports completion into this conversation, arm it with `herdr-jobs.py wait <job-id> --json`; on completion, `collect`, synthesize, and answer. Otherwise use durable `list`/`show`/`collect` on later turns. For an already-running non-detached Herdr lane without callback delivery, prefer the same bounded background Monitor over foreground `herdr agent wait` or repeated polling; reserve foreground waits for brief readiness/synchronous gates or when no background primitive exists. Reject tmux detach and never claim the watcher itself injects a Letta conversation turn; do not emulate return by launching a second `letta -p` turn or typing into the main pane.

If `$ARGUMENTS` names a lane (`cursor`, `agy`, or `codex`) but does not explicitly name a model, read the current curated role/model choices from the installed `direct-cli/playbook.md`, intersect them with the live CLI catalog, and ask the user which available choice to use. For Codex, ask for a model/effort pair. Do not copy a catalog snapshot into this wrapper or show the full live catalog unless requested or troubleshooting.

Treat `$ARGUMENTS` whose first positional lane token is `pi`, or whose natural-language request uses the exact phrase `use Pi` or `ใช้ Pi`, as Pi-lane selection. Do not substring-match words such as `pipeline`. Parse optional Pi `--provider`, `--model`, and `--tools`. Resolve `DIRECT_PI_COMMAND`, then `pi` on `PATH`, then `~/.9router-free/pi-pilot/run-pi.sh`; fail before pane creation when none exists. The Pi adapter installs skills only, not the executable or PATH launcher. Preflight version, help, models, and every required launch flag; fail closed when the current binary does not prove the selected contract. Always pass an explicit tool allowlist until a fresh capability check proves stronger approval semantics. Use named Herdr `--kind pi` only when the target pane proves it resolves the same executable/provider environment that passed preflight; PATH presence alone is insufficient. Reject Pi `--detach` and Pi fanout in this initial contract.

Treat skill argument `--effort <level>` as lane-aware. For Agy, pass native `--effort` only when the chosen model supports it and reject any fallback warning or visible model mismatch. For Codex, translate effort to CLI config `-c model_reasoning_effort=<level>`; do not pass `--effort` to Codex. For Cursor, use an exact effort-bearing model ID or supported parameterized model expression. If a model is explicit but effort is omitted, read the current role default from the installed `direct-cli/playbook.md` after catalog verification. Never infer ultra.

If model availability is uncertain, validate with `agent models`, `agy models`, or `codex debug models`; use each CLI's help/doctor commands for flag, feature, or health checks before launching the direct lane.
