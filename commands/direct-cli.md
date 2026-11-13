---
description: Direct executor playbook for using Cursor CLI, Antigravity CLI, and Codex CLI through verified HC, legacy Herdr, or Orca managed terminals with a tmux fallback. Use when you want a watchable interactive terminal lane, need narrow current-worktree follow-up, or need fresh-session recovery.
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

Parse `--backend auto|hc|herdr-core|orca|herdr|tmux` before creating any lane; omission means `auto`. Parse an optional Herdr `--workspace ID` into the playbook's workspace target instead of guessing by label. Auto first selects a validated HC caller (resolve hc first, otherwise herdr-core; normalize backend=hc), then legacy Herdr only inside a healthy compatible managed pane, then Orca only from an exact live caller-terminal receipt plus a tracked current `pwd -P`, then tmux. Browser inspection has a separate owner; do not select an executor backend merely to use an embedded browser. Announce the backend, never silently switch after creating state, then use the matching known-good launch/read/prompt commands from the skill playbook. For Orca, load the installed version's `orca-cli` guide first and use direct terminal commands against the explicit current path; route DAGs, ask/reply, and durable worker reports to Orca's separate `orchestration` skill.

For HC load installed `$HC_BIN --skill` and relevant command help. Validate current
holder/core with `server status --json` and exact live caller using
`get "$HC_TERMINAL_ID" --json`. Set target cwd separately to `pwd -P`; caller cwd
may differ. Launch unique named interactive children with `run --bg --name ... --cwd ...`,
parse exact address/parent receipt, then apply **First-prompt admission** from the playbook.
Require initialization completion, not startup idle/banner alone; use bounded waits and
stop without sending if the evidence is missing. Never treat a fixed delay as proof,
infer broken credentials from a startup warning, or replay an ambiguous send.
Revalidate the exact target/model/cwd before sending once without force.
If a visible Tab is requested, use an explicit Space, else a unique exact target-checkout
Space from `herdr-app ls`, else the Space containing the exact caller `HC_TERMINAL_ID`;
never use `status.space`. Use `herdr.space=<id>` / exact `herdr.tab=<id>` labels or explicit `tab.new --space <id>`
when current help supports them, then verify placement. Check `first_message.sent`
before any inline-task retry. No sleeps/polling. Codex
requires `--no-daemon` in HC, retaining model/autonomy policy. Revalidate exact
address/state/parent/current caller/name/cwd/foreground before cleanup; clean only
job-created terminals after accepted work or explicit cleanup. HC has no legacy
workspace/tab/pane receipts, callback registry or guaranteed visible placement.
Route `--focus`/layout to herdr-cli or verified herdr-app capability, not Core.
Do not claim byte-identical HC fanout without exact prompt hashing/send evidence.
Keep both packaged legacy Herdr callback/fanout scripts Herdr-specific.

Do not require the Orca caller worktree ID to equal the target current-worktree ID: the main agent may have changed cwd into another tracked Orca checkout. Preserve the exact caller receipt for backend identity, resolve the target separately from `path:$(pwd -P)`, and require the created lane's worktree ID to equal that target receipt.

Unless `$ARGUMENTS` explicitly requests `--safe`, read-only, sandboxed, or approval-prompted execution, use the skill's uninterrupted current-worktree defaults: Cursor `--yolo --approve-mcps --trust`, Antigravity `--dangerously-skip-permissions`, and Codex `--dangerously-bypass-approvals-and-sandbox`. Never weaken these defaults merely because the lane is launched through Orca or Herdr. These flags do not expand task scope or authorize destructive operations, secrets, commits, pushes, releases, or installs.

Treat `--detach` as a skill-level legacy-Herdr-only mode after agents are visibly ready. Require or derive a unique `--job-id`. From an exact Letta parent pane, start `herdr-jobs.py` with explicit `--mode callback`; callback mode automatically launches its detached lifecycle guard and must not also receive a controller Monitor. The guard persists observed `working` evidence and requires a continuously stable `idle`/`done` window before warning about a missing final callback; a sequence change or transient terminal label is only advisory. The silence deadline covers work that never settles. A guard/deadline wake is not authorization for blind fallback capture: inspect the job and pane, then let callback `recover` synchronously capture only from the exact parent after dispatch completed, working was observed, and receipt-bound terminal evidence stayed stable, with a final state/sequence/callback recheck that defers when work or callback evidence remains active. Use `--mode auto` only when watcher fallback is acceptable. If start reports watcher mode, or a Herdr lane was already launched without callback delivery, arm the current runtime's bounded background `Monitor` with `herdr-jobs.py wait <job-id> --json` or a receipt-bound lifecycle wait; never run that task-completion wait in the foreground. Current Letta Code keeps that exact Monitor alive across Esc, SIGINT, and `abort_message`: a turn interruption is not cancellation, so retain its task ID, do not re-arm it after an interrupted turn, and close it explicitly with `TaskStop`. Reserve foreground waits for brief readiness/synchronous gates. Reject HC (including herdr-core alias), Orca and tmux detach and never claim the watcher itself injects a Letta conversation turn; do not emulate return by launching a second `letta -p` turn or typing into the main pane.

If `$ARGUMENTS` names a lane (`cursor`, `agy`, or `codex`) but does not explicitly name a model, read the current curated role/model choices from the installed `direct-cli/playbook.md`, intersect them with the live CLI catalog, and ask the user which available choice to use. For Codex, ask for a model/effort pair. Do not copy a catalog snapshot into this wrapper or show the full live catalog unless requested or troubleshooting.

Treat skill argument `--effort <level>` as lane-aware. For Agy, pass native `--effort` only when the chosen model supports it and reject any fallback warning or visible model mismatch. For Codex, translate effort to CLI config `-c model_reasoning_effort=<level>`; do not pass `--effort` to Codex. For Cursor, use an exact effort-bearing model ID or supported parameterized model expression. If a model is explicit, honor effort already encoded in its catalog-verified ID. When effort is neither encoded nor otherwise specified, read the current role default from the installed `direct-cli/playbook.md` after catalog verification. If no role default is defined, ask for a supported effort rather than inheriting the catalog default. Never infer ultra.

If model availability is uncertain, validate with `agent models`, `agy models`, or `codex debug models`; use each CLI's help/doctor commands for flag, feature, or health checks before launching the direct lane.
