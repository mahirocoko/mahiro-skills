---
name: direct-cli
description: Direct executor playbook for using Cursor CLI, Antigravity CLI, Codex CLI, and Pi through Herdr-managed panes with a tmux fallback. Use when you want a pane-first direct CLI lane, ask to use Pi or "ใช้ Pi", need narrow current-worktree follow-up, or need fresh-session recovery.
---

# /direct-cli - Direct CLI Playbook

Use direct Cursor CLI, Antigravity CLI (`agy`), Codex CLI (`codex`), or Pi (`pi`) sessions when you want a fresh executor lane outside the usual orchestration runtime, while still keeping pane-first operator discipline. Herdr is the preferred backend only when the command runs inside a healthy Herdr-managed pane; tmux remains the portable fallback.

## When to Use

- You want a fresh executor session without wrapper state
- You want direct pane visibility into prompts, thinking, approval blocking, and errors
- You want narrow follow-up work on the current worktree
- You need a recovery playbook for stuck or unhealthy direct CLI lanes

## Operating Model

- Mahiro Code / the main agent stays the conversation owner
- Cursor CLI, Antigravity CLI, Codex CLI, or Pi acts as the direct executor
- The selected backend's pane output is treated as the nearest source of execution truth
- For production-ish asset work, use `asset-designer` as the front-door workflow; it routes Agy/Gemini dicut first and keeps Codex as an explicit fallback/A-B. This skill owns only pane execution, while `codex-asset-production` owns Codex source/imagegen and assigned fallback work.

## Backend Selection

- Accept `--backend auto|herdr|tmux`; omitting it is equivalent to `--backend auto`.
- For Herdr tab selection, accept `--focus` or `--no-focus`; default to `--no-focus` so launching a direct lane does not steal the user's current tab. Treat `--focus` as an explicit opt-in.
- `auto` selects Herdr only when the packaged selector validates `herdr` on `PATH`, `HERDR_ENV=1`, a non-empty `HERDR_PANE_ID` that resolves to a live pane (including a retained move alias), and a running compatible server. Otherwise select tmux only if tmux is available; fail before mutation when neither backend passes.
- Announce the selected backend and the evidence used. Never silently change backends after creating a tab, pane, or tmux session.
- Explicit `--backend herdr` must fail clearly if the Herdr preflight fails. Explicit `--backend tmux` keeps the historical behavior even while running inside Herdr.
- Do not select Herdr merely because the binary is installed; this avoids surprising users who are working in an ordinary terminal.
- Herdr integrations improve lifecycle/session identity but are optional for the backend. Never run `herdr integration install` without explicit user approval because it modifies another CLI's configuration.
- Do not hard-code a Herdr protocol number. Use the installed CLI and its compatibility result.
- Run the sibling `scripts/select-backend.sh --backend <value>` from the loaded direct-cli skill directory. Treat its `backend=` and `reason=` lines as the selection result; do not reimplement a weaker marker-only check in each invocation.
- The selector validates `herdr status --json` and resolves the marker through `herdr pane get`, bounding each call to five seconds by default; these are live checks, not authentication guarantees.

Backend mapping:

| Direct CLI concept | Herdr backend | tmux backend |
| --- | --- | --- |
| One job | One `direct-<job-slug>` tab in the caller or explicitly selected workspace | One `direct-<job-slug>` session |
| One lane | One named Herdr pane | One titled tmux pane |
| Launch/read | `herdr agent start`, then `agent read`/`pane read`; custom Pi wrappers use `pane run`/`pane read` | CLI launch with `tmux send-keys`, then `capture-pane` |
| Prompt/wait | `herdr agent prompt` / `agent wait`; custom Pi wrappers use `pane send-text` + `pane send-keys enter` + `pane read` | `tmux send-keys` / `capture-pane` |
| Stop/cleanup | Revalidate the receipt-bound workspace/tab/pane/agent session, then send `ctrl+c` to that exact target and close only the verified job tab | `tmux send-keys C-c`, then kill pane/session explicitly |

For Herdr, use the caller's `HERDR_WORKSPACE_ID` by default or parse an explicit direct-cli `--workspace ID` into `DIRECT_HERDR_WORKSPACE_ID`; do not guess a workspace from a label. Fail clearly if neither value exists. Create the job tab with `--no-focus` by default and keep the user's current tab selected; use `--focus` only when Mahiro explicitly requests immediate visibility. Background tab placement does not relax pane-first lifecycle: control the parsed pane IDs, prove shell readiness, surface approval or blocker states, and never focus the job tab automatically merely because it needs attention. Parse returned IDs from JSON and never predict pane IDs. Prefer `herdr agent start <name> --kind cursor|agy|codex|pi --pane <id> -- <args...>` when the canonical executable is on `PATH`, because it names the lane and waits for interactive readiness. Use `herdr pane run` plus `pane read` when a shell-shaped launch is required, including Agy's exact multiline `--prompt-interactive` path and Pi through a custom provider wrapper.

Do not call `agent start` immediately after `tab create` or `pane split`. Herdr can return `agent_pane_busy` while the login shell is still running startup hooks. First submit a unique shell-ready marker with `pane run`, wait for its exact output, then poll `pane process-info` until the shell PID is the only foreground process. Close the new tab and report the blocker if readiness does not settle within the bounded wait.

Treat the selected workspace ID plus every parsed job tab ID, pane ID, and available agent-session identity as the lane's cleanup receipt. Before interrupting or closing anything, re-read the target with `herdr pane get` and `herdr pane process-info`; require its `workspace_id` to equal the selected workspace, its `tab_id` to equal the created job tab, and its cwd/agent identity to match the lane you launched. A lane reported as unrelated or resolving to another Herdr workspace/space is a hard stop: leave it untouched and report it.

Never use global `pgrep`, `pkill`, or executable-name PID searches as ownership evidence for Herdr cleanup. They can return Cursor, Agy, Codex, or Pi processes from another visible workspace. Stop an owned lane through its exact Herdr pane/agent target and close only its receipt-bound tab. Send a signal to a raw PID only as a last resort after `herdr pane process-info` on that exact owned pane proves the PID belongs to the receipt and normal Herdr interruption/close failed; revalidate identity immediately before the signal.

Herdr agent names must be unique across the live session and match `[a-z][a-z0-9_-]{0,31}`. Derive a short job-specific name instead of reusing a global `codex-review` label across simultaneous jobs.

## Default Lane Contract

- Use a fresh interactive lane in the selected backend by default
- Default to uninterrupted execution for the intended current worktree unless Mahiro explicitly asks for a safer/read-only lane: Cursor uses `--yolo --approve-mcps --trust`, Antigravity uses `--dangerously-skip-permissions`, Codex uses `--dangerously-bypass-approvals-and-sandbox`, and Pi uses `--approve` with the full implementation allowlist `read,bash,edit,write,grep,find,ls`
- Treat those autonomy flags as approval policy, not expanded scope: destructive operations, secret handling, commits, pushes, releases, installs, and work outside the assigned worktree still require their normal explicit authorization
- If Mahiro explicitly asks for `--safe`, read-only, sandboxed, or approval-prompted execution, opt down for that lane instead of silently restoring the autonomous default
- If one job needs multiple direct CLI lanes, prefer one named Herdr tab or tmux job session with multiple panes over scattered one-lane sessions
- Multi-pane jobs support two modes: **role fanout** (shared context, different lane roles) and **same-prompt fanout** (exact same prompt pasted into every pane for independent model answers)
- For same-prompt fanout, write the prompt once. Tmux uses one loaded buffer; Herdr reads the file once and passes the same string to every named agent at the CLI boundary.
- Keep direct-cli generic: multi-pane sessions can coordinate implementation, review, verification, research, asset work, or model-comparison lanes across Cursor/Agy/Codex. Pi remains single-lane in the initial contract until its fanout lifecycle is proven. Codex imagegen is one use case, not the default identity of this skill.
- Keep a lane registry: pane title, CLI/model, role, write permissions, and output directory if it may write files
- Multi-pane output collection is receipt-bound: record each lane's expected output path or provider/result identity and collect only that exact result. Never scan a shared output root for the globally newest file or infer ownership from modification time. This does not restrict multi-pane execution; it restricts ambiguous collection.
- For asset jobs, use `asset-designer` for the asset/dicut contract and `codex-asset-production` only for Codex source/imagegen or fallback work. Record source-vs-dicut role, executor, fallback trigger, lane output folder, exact provider-returned output identity, and fanout type.
- Default write policy for multi-pane jobs: one writer per file/asset contract; other lanes are read-only/review/notes unless output directories are explicitly separated
- Prefer the known-good launch commands first instead of spending the first move on discovery
- Model catalogs change independently of CLI binaries. `playbook.md` is the single owner of the curated role-to-model list; do not duplicate that list in this entrypoint, README, or command wrappers. Before launch, check `agent models`, `agy models`, `codex debug models`, or `pi --list-models` plus the CLI's help/doctor surface. A curated role is preference, not availability proof.
- Treat `/direct-cli pi`, "use Pi", and `ใช้ Pi` as the same Pi-lane selection. If provider/model are omitted, run the selected Pi command's read-only `--list-models` preflight before creating a pane. When exactly one configured model is available, announce and use it; when several are available, ask which provider/model to use.
- If the user invokes `/direct-cli cursor ...`, `/direct-cli agy ...`, or `/direct-cli codex ...` without an explicit model, read the current curated choices from `playbook.md`, run the matching catalog preflight, then ask which available role/model pair to use. Do not show the full CLI catalog unless requested or troubleshooting.
- Treat `/direct-cli ... --effort <level>` as a skill-level routing argument. For Antigravity, pass native `agy --effort <level>` only after the selected model is known to support it; otherwise stop instead of accepting Agy's silent default-model fallback. Translate it to Codex `-c model_reasoning_effort=<level>` because Codex itself does not expose a `--effort` flag; for Cursor, use an exact effort-bearing model ID or supported parameterized model expression rather than passing `--effort`. If a model is explicit but effort is omitted, read the current role default from `playbook.md` after catalog verification. Never infer `ultra` unless the user asks for it or explicitly delegates model/effort choice for a genuinely large parallelizable job.
- Launch Cursor, Antigravity, Codex, and Pi interactively in the selected backend, not with the task prompt inline
- Confirm readiness from `herdr agent start` plus `agent read`/`pane read`, or from `tmux capture-pane`, before sending the real task prompt
- Cursor's default `--trust` should suppress its workspace trust prompt for the intended repo. If another CLI still shows a separate trust prompt, accept it only for that intended worktree before sending the task prompt
- That trust prompt usually appears the first time a specific workspace path is opened in that CLI context and usually should not repeat once trust is recorded
- If the prompt appears unsent in the pane, send `Enter` once and re-check the pane before changing course
- Do not use Cursor headless mode such as `agent -p`; stay pane-first and interactive
- Do not use Antigravity headless/print mode (`agy -p`, `agy --print`, `agy --prompt`) by default; stay pane-first and interactive unless the user explicitly asks for script-style output
- Antigravity newline caveat: literal multiline tmux paste can submit each line as a separate queued message, and exact multiline delivery through Herdr is not yet foreground-proven. For Agy, send ordinary follow-up prompts as one line (`herdr agent prompt` or `tmux send-keys -l`), or use `agy --prompt-interactive "$(cat prompt.txt)"` for a fresh exact multiline prompt. This is not `--print`/headless; the pane remains interactive.
- Do not use Codex headless/non-interactive mode (`codex exec`) or Pi print mode (`pi -p` / `pi --print`) by default; stay pane-first and interactive unless the user explicitly asks for script-style output
- Use Codex `--dangerously-bypass-approvals-and-sandbox` by default for the trusted current-worktree lane. Use `--sandbox workspace-write --ask-for-approval never` only when Mahiro explicitly asks for the safer sandboxed variant

## Pi Lane Contract

- Resolve the Pi command in this order: explicit `DIRECT_PI_COMMAND`, `pi` on `PATH`, then Mahiro's proven executable `~/.9router-free/pi-pilot/run-pi.sh`. Fail before creating pane state when none is executable; never install Pi or rewrite global Pi/provider configuration implicitly.
- The mahiro-skills `pi` adapter installs Agent Skills only. It does not install the Pi executable, create a PATH launcher, or configure a provider. For direct shell use, verify `command -v pi`, `pi --version`, and `pi --list-models`; a configured wrapper is a separate prerequisite.
- Parse optional direct-cli `--provider`, `--model`, and `--tools` as Pi lane arguments. Never put a literal API key in a command, pane log, receipt, or process argument; use an existing provider profile/environment wrapper.
- Preflight with `"$PI_COMMAND" --version`, `"$PI_COMMAND" --help`, and `"$PI_COMMAND" --list-models`. Before mutation, require the current help output to expose every launch flag the lane will use: `--tools`, `--no-session`, `--no-extensions`, `--no-prompt-templates`, and `--approve`. Fail closed when a required flag or its security meaning is unavailable; never send an older/different Pi an unverified flag set.
- Until a fresh preflight proves a stronger per-tool approval contract, every Pi launch must pass an explicit `--tools` allowlist. The default autonomous implementation lane uses `read,bash,edit,write,grep,find,ls`; use `read,grep,find,ls` only when Mahiro explicitly asks for a safer/read-only review lane.
- Launch fresh Pi lanes with the verified `--no-session --no-extensions --no-prompt-templates --approve` contract. `--approve` trusts project-local context for that run only; use it only for the intended current worktree. Keep AGENTS/CLAUDE context and skills enabled unless Mahiro asks for a raw-model experiment.
- Use named Herdr `agent start --kind pi` only after the shell-ready target pane proves it will resolve the same executable and provider environment that passed preflight. PATH presence or the basename `pi` is not enough—a PATH launcher may itself be a custom wrapper. Otherwise use the generic `pane run` path plus `pane read`/`pane send-text`/`pane send-keys` controls.
- Do not use `prompt-fanout.py`, `herdr-jobs.py`, or `--detach` for a generic-pane Pi lane. Those helpers require named Herdr-agent lifecycle. Pi fanout/detach remains unsupported in this initial contract rather than silently degrading lifecycle evidence.
- When waiting on a generic Pi pane, require model/tool activity after prompt dispatch. Do not treat the prompt's echoed completion-marker text as completion.

## Callback-Primary Herdr Jobs

Use skill-level `--detach` only for an already-started named Herdr job whose result does not need to block the current main-agent turn. Detached execution is deliberately Herdr-only; reject `--backend tmux --detach` rather than inventing pane typing or a weaker tmux lifecycle. Pi detach and Pi same-prompt fanout remain unsupported.

Before dispatching, confirm every named agent is interactive-ready, write one prompt file, choose a unique job ID, and choose the routing explicitly or use the safe default:

```bash
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" start \
  --mode auto|callback|watcher \
  --callback-timeout 1800 \
  --job-id "$JOB_ID" \
  --prompt-file "$PROMPT_FILE" \
  --cwd "$TARGET_CWD" \
  --tab-id "$TAB_ID" \
  "$AGENT_A" "$AGENT_B"
```

`auto` selects callback only after it captures the exact parent Letta pane from `HERDR_PANE_ID` through `herdr pane get` and captures exact target receipts. If that proof is unavailable, it uses the existing durable watcher. Explicit `callback` fails closed when the parent or target receipt cannot be captured; explicit `watcher` preserves the v1 lifecycle. Callback mode launches no continuous watcher. Its default 30-minute one-shot silence deadline sleeps rather than polls, records expiry, and wakes the exact parent with a `recover` command; tune it with `--callback-timeout`, or use `0` only for a deliberately unmanaged experiment. Every target receives the same prompt bytes plus one callback footer; the record keeps separate task and dispatch SHA-256 hashes.

Callback receipts bind pane, workspace, tab, terminal, Herdr session/socket, available non-secret Letta identifiers, and target agent session. Before every send or receive, the current pane is re-read and the sender is inferred from that receipt—never from a caller-supplied name. The ACL is exactly parent plus job targets: parent may message targets; targets may message parent or siblings; outsiders and stale receipts fail. Named targets wake through `agent.prompt`. The exact parent Letta pane wakes through one atomic single-line metadata-only `pane.run`, because the parent is not an active named Herdr agent. Both are best-effort transport: accepted delivery is not receipt or proof, and there is no tmux fallback.

Callback bodies are read only from private regular files, capped at 8 KiB; each message has private files and the ledger is capped at 200 messages. Use metadata-only wakes and the exact receive command they contain:

```bash
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" send "$JOB_ID" \
  --to parent --kind progress|question|blocked|reply|report_ready|report_failed \
  --body-file "$BODY_FILE" --idempotency-key "$KEY"
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" receive "$JOB_ID" --message-id "$MESSAGE_ID"
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" retry "$JOB_ID" --message-id "$MESSAGE_ID"
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" audit "$JOB_ID"
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" audit "$JOB_ID" --include-bodies
```

Idempotency keys are scoped to the exact sender and immutable: exact duplicates are harmless and mismatches fail. Delivery failures remain durable until an explicit retry, and retry revalidates the original sender receipt as well as the caller/recipient. Parent audit includes every peer message and may explicitly include bounded bodies; peers see only their own incoming/outgoing metadata and cannot bulk-audit bodies. `report_ready` and `report_failed` persist bounded target results but finalize only after the exact parent has received every target report; transport acceptance alone never finalizes. Progress, question, blocked, and reply never finalize a job.

Use `recover` when a callback job needs the existing watcher fallback. Callback jobs are not reconciled as failed merely because they have no watcher; old watcher/v1 jobs remain compatible. `list`, `show`, `wait`, and `collect` expose durable job state, while `collect` remains the controller's result-reading step. Notifications, wakes, and completion lines contain metadata only—never prompt, body, result, or failure-summary text. The watcher fallback does not inject a new message into the current Letta conversation. Do not launch `letta -p`, type into the parent pane, or create a second turn manually.

## Multi-pane Job Sessions

Use this when a single job benefits from multiple models or CLIs at the same time: for example Codex image generation, Antigravity review, Cursor reasoning, and Codex/Cursor alternatives around one asset or implementation task.

### Session shape

- Herdr: create one tab named `direct-<job-slug>` in the caller or explicitly selected workspace, set the tab cwd to the target worktree, then split one pane per lane.
- tmux: create one session named `direct-<job-slug>` and split one pane per lane.
- Do not create unrelated Herdr tabs or tmux sessions like `codex-task`, `agy-task`, and `cursor-task` for the same job.
- Set pane titles with lane role/model names so captures stay readable.
- Capture by pane title/index and synthesize results in the main agent; do not let one lane read another lane's answer before it responds when independent diversity matters.

Tmux example shape:

```bash
tmux new-session -d -s "direct-agent-halo-sprite" -n lanes
tmux split-window -h -t "direct-agent-halo-sprite:0.0"
tmux split-window -v -t "direct-agent-halo-sprite:0.1"
tmux select-layout -t "direct-agent-halo-sprite:0" tiled
tmux select-pane -t "direct-agent-halo-sprite:0.0" -T "codex-imagegen"
tmux select-pane -t "direct-agent-halo-sprite:0.1" -T "agy-opus-review"
tmux select-pane -t "direct-agent-halo-sprite:0.2" -T "cursor-fable-review"
tmux list-panes -t "direct-agent-halo-sprite" -F '#{pane_index}: #{pane_title} #{pane_current_command}'
```

### Fanout modes

**Role fanout**: every pane gets the same job context, then a role-specific task.

```text
Job: <job name>
Shared context:
- repo/worktree path
- allowed files/output dirs
- current constraints

Lane role: <review / implement / imagegen / alternatives>
Task: <role-specific task>
```

**Same-prompt fanout**: every pane receives the exact same prompt to get independent answers from different models/CLIs.

Rules:

- Use the same prompt bytes for every pane; do not hand-copy per pane.
- Do not add lane-specific prefixes unless the user asked for role fanout instead.
- If independence matters, tell the panes not to assume consensus inside the shared prompt itself.
- Capture outputs separately and synthesize only after every lane has answered or clearly failed.

```bash
cat > /tmp/direct-job.prompt.txt <<'PROMPT'
<SHARED PROMPT HERE>
PROMPT
tmux load-buffer -b direct-job-prompt /tmp/direct-job.prompt.txt
for pane in 0 1 2; do
  tmux paste-buffer -t "direct-job:0.$pane" -b direct-job-prompt
  tmux send-keys -t "direct-job:0.$pane" Enter
done
```

For Herdr same-prompt fanout, use the packaged helper. It reads the prompt once, preserves the same UTF-8 string for every named agent, requires an observed lifecycle transition before waiting for settled state, and fails visibly when a prompt remains unsent:

```bash
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/prompt-fanout.py" \
  --prompt-file "$PROMPT_FILE" \
  "$AGENT_A" "$AGENT_B" "$AGENT_C"
```

This proves byte-identical input at the Herdr CLI argument boundary, not model receipt or response equality. If the helper reports no activity transition, inspect that pane and submit one Enter only when the prompt is visibly unsent; do not call `agent wait` against the old idle state. Capture each lane separately before synthesis.

### Write policy

- Prefer one writer lane per file or asset contract.
- Review/idea lanes should not edit files unless explicitly assigned.
- If multiple lanes may write, give each lane a separate output directory such as `work/implement/`, `notes/review/`, `reports/verify/`, or asset-specific `generated-images/codex/source-a/`.
- For provider-backed artifacts such as imagegen, capture the exact provider-returned path plus available session/result identity for each lane and move only that artifact into its assigned folder. Never discover a lane's result by scanning a shared output root for the newest file; concurrent completions make recency ambiguous. Fail the lane when exact ownership cannot be proven, and investigate unexpected duplicate hashes before synthesis.
- For Codex imagegen specifically, same-prompt panes should write only to their own lane folders or leave generated PNGs in the provider-managed area for receipt-bound collection. Do not let parallel lanes overwrite canonical runtime paths.
- Main agent owns final merge/synthesis into the real worktree: capture panes, compare outputs, choose candidates, assign cleanup, and promote accepted files.

## Quick Commands

```text
/direct-cli
/direct-cli cursor
/direct-cli agy
/direct-cli codex
/direct-cli pi
/direct-cli pi --provider <provider> --model <model>
/direct-cli cursor --model <model>
/direct-cli agy --model <model>
/direct-cli codex --model <model> --effort <level>
/direct-cli codex --backend herdr --model <model> --effort <level>
/direct-cli cursor --backend tmux --model <model>
/direct-cli recovery
```

## Document Map

- `README.md` - human overview and entry guidance
- `playbook.md` - the full direct CLI operator playbook and current routing-policy owner
- `scripts/select-backend.sh` - deterministic backend preflight
- `scripts/prompt-fanout.py` - synchronous Herdr fanout with activity gating
- `scripts/herdr-jobs.py` - callback-primary Herdr job registry, durable message ledger, watcher recovery, and collection CLI

## Working Rule

Start from `playbook.md`. Select and announce the backend before creating anything, use the matching known-good launch commands, wait for pane readiness, then send the task prompt. Keep prompts narrow, continue from the current worktree only, do not restart from scratch, and trust pane output over assumptions.

ARGUMENTS: $ARGUMENTS
