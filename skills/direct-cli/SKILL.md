---
name: direct-cli
description: Direct executor playbook for using Cursor CLI, Antigravity CLI, and Codex CLI through Herdr-managed panes with a tmux fallback. Use when you want a pane-first direct CLI lane, narrow current-worktree follow-up, or fresh-session recovery.
---

# /direct-cli - Direct CLI Playbook

Use direct Cursor CLI, Antigravity CLI (`agy`), or Codex CLI (`codex`) sessions when you want a fresh executor lane outside the usual orchestration runtime, while still keeping pane-first operator discipline. Herdr is the preferred backend only when the command runs inside a healthy Herdr-managed pane; tmux remains the portable fallback.

## When to Use

- You want a fresh executor session without wrapper state
- You want direct pane visibility into prompts, thinking, approval blocking, and errors
- You want narrow follow-up work on the current worktree
- You need a recovery playbook for stuck or unhealthy direct CLI lanes

## Operating Model

- Mahiro Code / the main agent stays the conversation owner
- Cursor CLI, Antigravity CLI, or Codex CLI acts as the direct executor
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
| Launch/read | `herdr agent start`, then `agent read`/`pane read` | CLI launch with `tmux send-keys`, then `capture-pane` |
| Prompt/wait | `herdr agent prompt` / `agent wait` | `tmux send-keys` / `capture-pane` |
| Stop/cleanup | `agent send-keys ctrl+c`, then close pane/tab explicitly | `tmux send-keys C-c`, then kill pane/session explicitly |

For Herdr, use the caller's `HERDR_WORKSPACE_ID` by default or parse an explicit direct-cli `--workspace ID` into `DIRECT_HERDR_WORKSPACE_ID`; do not guess a workspace from a label. Fail clearly if neither value exists. Create and focus the job tab before launching agents so the lane is genuinely pane-first and Herdr can observe readiness; do not hide a new job in an unseen background tab. Parse returned IDs from JSON and never predict pane IDs. Prefer `herdr agent start <name> --kind cursor|agy|codex --pane <id> -- <args...>` because it names the lane and waits for interactive readiness. Fall back to `herdr pane run` plus `pane read` only when a shell-shaped launch is required, such as Agy's exact multiline `--prompt-interactive` path.

Do not call `agent start` immediately after `tab create` or `pane split`. Herdr 0.7.5 can return `agent_pane_busy` while the login shell is still running startup hooks. First submit a unique shell-ready marker with `pane run`, wait for its exact output, then poll `pane process-info` until the shell PID is the only foreground process. Close the new tab and report the blocker if readiness does not settle within the bounded wait.

Herdr agent names must be unique across the live session and match `[a-z][a-z0-9_-]{0,31}`. Derive a short job-specific name instead of reusing a global `codex-review` label across simultaneous jobs.

## Default Lane Contract

- Use a fresh interactive lane in the selected backend by default
- If one job needs multiple direct CLI lanes, prefer one named Herdr tab or tmux job session with multiple panes over scattered one-lane sessions
- Multi-pane jobs support two modes: **role fanout** (shared context, different lane roles) and **same-prompt fanout** (exact same prompt pasted into every pane for independent model answers)
- For same-prompt fanout, write the prompt once. Tmux uses one loaded buffer; Herdr reads the file once and passes the same string to every named agent at the CLI boundary.
- Keep direct-cli generic: multi-pane sessions can coordinate implementation, review, verification, research, asset work, or model-comparison lanes across Cursor/Agy/Codex. Codex imagegen is one use case, not the default identity of this skill.
- Keep a lane registry: pane title, CLI/model, role, write permissions, and output directory if it may write files
- For asset/imagegen jobs, use `codex-asset-production` for the asset contract; in this skill, record source-vs-dicut role, lane output folder, expected `$CODEX_HOME/generated-images/...` collection path, and fanout type.
- Default write policy for multi-pane jobs: one writer per file/asset contract; other lanes are read-only/review/notes unless output directories are explicitly separated
- Prefer the known-good launch commands first instead of spending the first move on discovery
- Model catalogs can change independently of CLI binaries. Use `agent models`, `agy models`, and `codex debug models` as the current catalog checks when a freshness note is old, the user asks about models, or a preferred model fails. Use `agent --help`, `agy --help`, `codex --help`, `codex features list`, and `codex doctor` for current flag, feature, and health checks.
- Default models: Cursor quick implementation / cleanup `composer-2.5-fast`; Cursor balanced `composer-2.5`; Cursor Fable 5 reasoning `claude-fable-5-thinking-high`; Cursor heavy Opus review `claude-opus-4-8-thinking-high`; Codex flagship `gpt-5.6-sol` with high reasoning
- Cursor's current catalog also exposes `claude-sonnet-5-thinking-high`; keep it as an explicit newer candidate rather than silently replacing the proven Fable/Opus defaults.
- Antigravity (`agy`) curated choices are `claude-opus-4-6-thinking` for heavy review/reasoning, `claude-sonnet-4-6` for a balanced lane, and `gemini-3.6-flash-high` for a faster lane. Fall back to `gemini-3.6-flash-medium`, then `gemini-3.5-flash-medium`, only if High fails.
- Codex (`codex`) curated choices are `gpt-5.6-sol` high for flagship work, `gpt-5.6-terra` medium for balanced everyday work, `gpt-5.6-luna` medium for fast/cost-efficient work, and `gpt-5.6-sol` ultra for large parallelizable jobs. Keep model slug and effort separate: launch with `--model <slug> -c 'model_reasoning_effort="<effort>"'`.
- If the user invokes `/direct-cli cursor ...`, `/direct-cli agy ...`, or `/direct-cli codex ...` without an explicit model, stop and ask which skill-defined model to use before launching the lane; do not show the full CLI model list unless requested or troubleshooting
- For Cursor, ask among `composer-2.5-fast`, `composer-2.5`, `claude-fable-5-thinking-high`, `claude-fable-5-thinking-xhigh`, `claude-opus-4-8-thinking-high`, and the newer candidate `claude-sonnet-5-thinking-high`; when the user says “Fable 5”, use the exact model ID `claude-fable-5-thinking-high` unless they explicitly ask for another Fable variant. Mention `composer-2-fast` only as a fallback if the current preferred models fail.
- For Antigravity, ask among `claude-opus-4-6-thinking`, `claude-sonnet-4-6`, and `gemini-3.6-flash-high`. Launch with the exact stable slug from `agy models` and verify the visible model in the pane. Agy exposes native `--effort`, but pass it only when the selected model supports that effort; `claude-opus-4-6-thinking --effort high` is invalid and silently falls back to the default model. Treat any fallback warning or visible model mismatch as launch failure, not success. Fall back to `gemini-3.6-flash-medium`, then `gemini-3.5-flash-medium`, only if High fails.
- For Codex, ask among `gpt-5.6-sol` high, `gpt-5.6-terra` medium, `gpt-5.6-luna` medium, `gpt-5.6-sol` ultra, and specialized fast `gpt-5.3-codex-spark` high; launch `codex` interactively before sending the task prompt. Sol and Terra support ultra; Luna currently stops at max. Keep `gpt-5.5` as a fallback rather than a default picker choice.
- Treat `/direct-cli ... --effort <level>` as a skill-level routing argument. For Antigravity, pass native `agy --effort <level>` only after the selected model is known to support it; otherwise stop instead of accepting Agy's silent default-model fallback. Translate it to Codex `-c model_reasoning_effort=<level>` because Codex itself does not expose a `--effort` flag; for Cursor, use an exact effort-bearing model ID or supported parameterized model expression rather than passing `--effort`. If a recognized GPT-5.6 Codex model is explicit but effort is omitted, use Sol `high`, Terra `medium`, or Luna `medium`. Never infer `ultra` unless the user asks for it or explicitly delegates model/effort choice for a genuinely large parallelizable job.
- Launch Cursor, Antigravity, and Codex in the selected backend with yolo-style flags only, not with the task prompt inline
- Confirm readiness from `herdr agent start` plus `agent read`/`pane read`, or from `tmux capture-pane`, before sending the real task prompt
- If the direct lane shows a workspace trust prompt for the intended repo, accept it in the pane or let the user accept it directly before sending the task prompt
- That trust prompt usually appears the first time a specific workspace path is opened in that CLI context and usually should not repeat once trust is recorded
- If the prompt appears unsent in the pane, send `Enter` once and re-check the pane before changing course
- Do not use Cursor headless mode such as `agent -p`; stay pane-first and interactive
- Do not use Antigravity headless/print mode (`agy -p`, `agy --print`, `agy --prompt`) by default; stay pane-first and interactive unless the user explicitly asks for script-style output
- Antigravity newline caveat: literal multiline tmux paste can submit each line as a separate queued message, and exact multiline delivery through Herdr is not yet foreground-proven. For Agy, send ordinary follow-up prompts as one line (`herdr agent prompt` or `tmux send-keys -l`), or use `agy --prompt-interactive "$(cat prompt.txt)"` for a fresh exact multiline prompt. This is not `--print`/headless; the pane remains interactive.
- Do not use Codex headless/non-interactive mode (`codex exec`) by default; stay pane-first and interactive unless the user explicitly asks for script-style output
- Do not use Codex `--dangerously-bypass-approvals-and-sandbox` by default; prefer workspace-write sandbox plus no approval prompts for direct-lane momentum

## Detached Herdr Jobs

Use skill-level `--detach` only for an already-started Herdr job whose result does not need to block the current main-agent turn. Phase 1 is deliberately Herdr-only; reject `--backend tmux --detach` rather than inventing a weaker tmux lifecycle. Detached mode does not inject a new message into the current Letta conversation.

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

### Sandbox verification

Verified locally on 2026-06-23 with a tmux sandbox: one prompt was loaded into a tmux buffer, pasted into three panes, and captured to three pane files. SHA-256 hashes matched the shared prompt for all panes, proving same-prompt fanout is practical with `tmux load-buffer` / `paste-buffer`.

Verified locally on 2026-07-24: Herdr `0.7.5` exposed a compatible running server plus `HERDR_ENV`, `HERDR_PANE_ID`, `HERDR_WORKSPACE_ID`, and `HERDR_TAB_ID` markers in a managed pane. Its stable CLI includes the load-bearing `status`, `tab create/close`, `pane get/split/read/run/send-text/send-keys/wait-output/process-info`, and `agent list/start/prompt/read/wait/send-keys` surfaces used by this workflow for `cursor`, `agy`, and `codex`. Treat this as the initial compatibility floor, not a promise for older versions; always preflight the installed runtime.

Antigravity exception verified historically on 2026-06-29: Agy `1.0.13` with the then-current display label `--model "Claude Opus 4.6 (Thinking)"` worked, but multiline `tmux paste-buffer` split the prompt into multiple messages. A single-line `tmux send-keys -l ... Enter` worked, and `agy --prompt-interactive "$(cat prompt.txt)"` preserved a multiline initial prompt while keeping the session interactive. Keep the prompt-delivery caveat until it is re-tested, but use current stable model slugs for new launches.

## Current Freshness Notes

Use these notes as a check, not as timeless truth:

- Verified 2026-07-22: Cursor `agent` updated from `2026.07.17-3e2a980` to `2026.07.20-8cc9c0b`, which matches the official installer. The command surface adds `--endpoint` / `CURSOR_API_ENDPOINT`, and `--trust` is no longer documented as headless-only. `agent models` still exposes Composer 2.5, Fable 5, Sonnet 5, Opus 4.8, GPT-5.6 Sol/Terra/Luna, and other families. Catalog labels advertise 1M for Fable/Sonnet/Opus/GPT-5.6, while `agent about` for the active Fable session still reports `Fable 5 300K High`; treat effective context as session-dependent until a fresh launch proves otherwise. Use exact model IDs, not display shorthand.
- Verified 2026-07-24: Antigravity is `agy 1.1.6`. Its live catalog includes Gemini 3.6 Flash, Gemini 3.5 Flash, Gemini 3.1 Pro, Opus 4.6 Thinking, Sonnet 4.6, and GPT-OSS 120B. Earlier tmux lanes proved `gemini-3.6-flash-high` and `gemini-3.6-flash-medium`; a Herdr-native turn now also proved explicit `gemini-3.5-flash-high`, visible as Gemini 3.5 Flash High, with `agent start` readiness, `agent prompt --wait`, Done lifecycle, and exact response. Mahiro selected 3.6 High as the curated fast default; keep 3.6 Medium and then `gemini-3.5-flash-medium` as ordered automatic fallbacks, while accepting explicit 3.5 High requests. Earlier foreground proof for Opus and Sonnet remains valid. `claude-opus-4-6-thinking --effort high` still has a known silent-fallback risk, and catalog-listed Gemini Pro previously failed at launch, so the picker excludes Gemini Pro and Opus launches omit `--effort`. Preserve the safe one-line/`--prompt-interactive` delivery path until multiline paste is re-tested on 1.1.6.
- Verified 2026-07-22: Codex CLI and npm stable updated from `0.144.6` to `0.145.0`. The release adds paginated thread history, broader Cursor/Claude import, audio/realtime support, and stable-but-opt-in multi-agent V2; it also improves long-conversation rendering, MCP startup/auth reliability, and approval safety. The direct-lane launch contract remains valid. `codex debug models` still lists Sol/Terra/Luna/GPT-5.5/Spark with 272,000-token context for Sol/Terra/Luna/GPT-5.5 and 128,000 for Spark; Sol/Terra expose low through ultra, Luna low through max, and Spark low through xhigh. `image_generation`, `multi_agent`, and `fast_mode` remain stable/enabled, while `multi_agent_v2` is stable and disabled by default. Generated PNGs remain under `$CODEX_HOME/generated-images/<session>/<call_id>.png`.

## Quick Commands

```text
/direct-cli
/direct-cli cursor
/direct-cli agy
/direct-cli codex
/direct-cli cursor --model claude-fable-5-thinking-high
/direct-cli agy --model claude-opus-4-6-thinking
/direct-cli codex --model gpt-5.6-sol --effort high
/direct-cli codex --backend herdr --model gpt-5.6-sol --effort high
/direct-cli cursor --backend tmux --model composer-2.5-fast
/direct-cli recovery
```

## Document Map

- `README.md` - human overview and entry guidance
- `playbook.md` - the full preserved direct CLI playbook
- `scripts/select-backend.sh` - deterministic backend preflight
- `scripts/prompt-fanout.py` - synchronous Herdr fanout with activity gating
- `scripts/herdr-jobs.py` - detached Herdr job registry, watcher, and collection CLI

## Working Rule

Start from `playbook.md`. Select and announce the backend before creating anything, use the matching known-good launch commands, wait for pane readiness, then send the task prompt. Keep prompts narrow, continue from the current worktree only, do not restart from scratch, and trust pane output over assumptions.

ARGUMENTS: $ARGUMENTS
