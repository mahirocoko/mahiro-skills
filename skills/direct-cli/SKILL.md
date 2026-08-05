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
- For production-ish asset/imagegen work, use `codex-asset-production` as the front-door workflow and this skill only as the pane executor layer; for sprite-like sheets, start from `sprite-workflow`.

## Backend Selection

- Accept `--backend auto|herdr|tmux`; omitting it is equivalent to `--backend auto`.
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
| Stop/cleanup | `agent send-keys ctrl+c` or Pi pane `ctrl+c`/`ctrl+d`, then close pane/tab explicitly | `tmux send-keys C-c`, then kill pane/session explicitly |

For Herdr, use the caller's `HERDR_WORKSPACE_ID` by default or parse an explicit direct-cli `--workspace ID` into `DIRECT_HERDR_WORKSPACE_ID`; do not guess a workspace from a label. Fail clearly if neither value exists. Create and focus the job tab before launching agents so the lane is genuinely pane-first and Herdr can observe readiness; do not hide a new job in an unseen background tab. Parse returned IDs from JSON and never predict pane IDs. Prefer `herdr agent start <name> --kind cursor|agy|codex|pi --pane <id> -- <args...>` when the canonical executable is on `PATH`, because it names the lane and waits for interactive readiness. Use `herdr pane run` plus `pane read` when a shell-shaped launch is required, including Agy's exact multiline `--prompt-interactive` path and Pi through a custom provider wrapper.

Do not call `agent start` immediately after `tab create` or `pane split`. Herdr can return `agent_pane_busy` while the login shell is still running startup hooks. First submit a unique shell-ready marker with `pane run`, wait for its exact output, then poll `pane process-info` until the shell PID is the only foreground process. Close the new tab and report the blocker if readiness does not settle within the bounded wait.

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
- For asset/imagegen jobs, use `codex-asset-production` for the asset contract; in this skill, record source-vs-dicut role, lane output folder, expected `$CODEX_HOME/generated-images/...` collection path, and fanout type.
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

## Detached Herdr Jobs

Use skill-level `--detach` only for an already-started Herdr job whose result does not need to block the current main-agent turn. Phase 1 is deliberately Herdr-only; reject `--backend tmux --detach` rather than inventing a weaker tmux lifecycle. Detached mode does not inject a new message into the current Letta conversation.

Reject Pi `--detach` and Pi same-prompt fanout in this initial contract, including when Herdr can launch `--kind pi`; the packaged watcher/fanout helpers have not yet been proven against Pi lifecycle.

Before dispatching, confirm every named agent is interactive-ready, write one prompt file, choose a unique job ID, and run:

```bash
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" start \
  --job-id "$JOB_ID" \
  --prompt-file "$PROMPT_FILE" \
  --cwd "$TARGET_CWD" \
  --tab-id "$TAB_ID" \
  "$AGENT_A" "$AGENT_B"
```

The start command records baseline lifecycle sequences, persists a mode-0600 prompt plus job record, performs bounded prompt dispatch, launches a detached watcher, and returns `job=`, `status=running`, and `job_dir=` without waiting for completion. The watcher requires real activity before waiting, captures bounded `recent-unwrapped` output per target, writes terminal status atomically, and sends a generic best-effort macOS notification containing only job ID and terminal status—never prompt, result, or failure-summary text. Default state is `$XDG_STATE_HOME/mahiro-skills/direct-cli/jobs` or `~/.local/state/mahiro-skills/direct-cli/jobs`; override it with `DIRECT_CLI_STATE_DIR` or `--state-dir`.

On the next direct-cli turn, list jobs before starting unrelated work and surface uncollected terminal jobs:

```bash
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" list
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" show "$JOB_ID"
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" collect "$JOB_ID"
```

`done` means captured results are ready; `attention` means a prompt never showed an activity transition and the named pane must be inspected for an unsent prompt, provider/account warning, or model fallback; `error` preserves dispatch/watcher failure. Submit one Enter only when the prompt is visibly unsent. `list`, `show`, and `collect` reconcile a missing or mismatched watcher process into a durable collectible error rather than leaving a permanent `watching` row. Job JSON and result files are the durable truth, not notification delivery. Phase 1 intentionally provides no automatic cancel, prune, cross-conversation injection, or result synthesis; the main agent collects and judges outputs on its next wake.

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
- For Codex imagegen specifically, same-prompt panes should write only to their own lane folders or leave generated PNGs in Codex's generated-images area for the main agent to collect. Do not let parallel lanes overwrite canonical runtime paths.
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
- `scripts/herdr-jobs.py` - detached Herdr job registry, watcher, and collection CLI

## Working Rule

Start from `playbook.md`. Select and announce the backend before creating anything, use the matching known-good launch commands, wait for pane readiness, then send the task prompt. Keep prompts narrow, continue from the current worktree only, do not restart from scratch, and trust pane output over assumptions.

ARGUMENTS: $ARGUMENTS
