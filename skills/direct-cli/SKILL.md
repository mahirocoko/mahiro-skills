---
name: direct-cli
description: Direct executor playbook for using Cursor CLI, Antigravity CLI, and Codex CLI through fresh tmux sessions without going through the usual orchestration runtime. Use when you want a pane-first direct CLI lane, narrow current-worktree follow-up, or fresh-session recovery.
---

# /direct-cli - Direct CLI Playbook

Use direct Cursor CLI, Antigravity CLI (`agy`), or Codex CLI (`codex`) sessions when you want a fresh executor lane outside the usual orchestration runtime, while still keeping pane-first operator discipline.

## When to Use

- You want a fresh executor session without wrapper state
- You want direct tmux visibility into prompts, thinking, approval blocking, and errors
- You want narrow follow-up work on the current worktree
- You need a recovery playbook for stuck or unhealthy direct CLI lanes

## Operating Model

- Mahiro Code / the main agent stays the conversation owner
- Cursor CLI, Antigravity CLI, or Codex CLI acts as the direct executor
- Tmux pane output is treated as the nearest source of execution truth
- For production-ish asset/imagegen work, use `codex-asset-production` as the front-door workflow and this skill only as the pane executor layer; for sprite-like sheets, start from `sprite-workflow`.

## Default Lane Contract

- Use a fresh interactive tmux lane by default
- If one job needs multiple direct CLI lanes, prefer one named tmux job session with multiple panes over scattered one-lane sessions
- Multi-pane jobs support two modes: **role fanout** (shared context, different lane roles) and **same-prompt fanout** (exact same prompt pasted into every pane for independent model answers)
- For same-prompt fanout, write the prompt to a temp file, `tmux load-buffer` once, and paste that buffer into each pane so the prompt is byte-identical
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
- For Cursor, ask among `composer-2.5-fast`, `composer-2.5`, `claude-fable-5-thinking-high`, `claude-opus-4-8-thinking-high`, and the newer candidate `claude-sonnet-5-thinking-high`; when the user says “Fable 5”, use the exact model ID `claude-fable-5-thinking-high` unless they explicitly ask for another Fable variant. Mention `composer-2-fast` only as a fallback if the current preferred models fail.
- For Antigravity, ask among `claude-opus-4-6-thinking`, `claude-sonnet-4-6`, and `gemini-3.6-flash-high`. Launch with the exact stable slug from `agy models` and verify the visible model in the pane. Agy exposes native `--effort`, but pass it only when the selected model supports that effort; `claude-opus-4-6-thinking --effort high` is invalid and silently falls back to the default model. Treat any fallback warning or visible model mismatch as launch failure, not success. Fall back to `gemini-3.6-flash-medium`, then `gemini-3.5-flash-medium`, only if High fails.
- For Codex, ask among `gpt-5.6-sol` high, `gpt-5.6-terra` medium, `gpt-5.6-luna` medium, `gpt-5.6-sol` ultra, and specialized fast `gpt-5.3-codex-spark` high; launch `codex` interactively before sending the task prompt. Sol and Terra support ultra; Luna currently stops at max. Keep `gpt-5.5` as a fallback rather than a default picker choice.
- Treat `/direct-cli ... --effort <level>` as a skill-level routing argument. For Antigravity, pass native `agy --effort <level>` only after the selected model is known to support it; otherwise stop instead of accepting Agy's silent default-model fallback. Translate it to Codex `-c model_reasoning_effort=<level>` because Codex itself does not expose a `--effort` flag; for Cursor, use an exact effort-bearing model ID or supported parameterized model expression rather than passing `--effort`. If a recognized GPT-5.6 Codex model is explicit but effort is omitted, use Sol `high`, Terra `medium`, or Luna `medium`. Never infer `ultra` unless the user asks for it or explicitly delegates model/effort choice for a genuinely large parallelizable job.
- Launch Cursor, Antigravity, and Codex in tmux with yolo-style flags only, not with the task prompt inline
- Capture the pane and confirm readiness before sending the real task prompt with `tmux send-keys`
- If the direct lane shows a workspace trust prompt for the intended repo, accept it in the pane or let the user accept it directly before sending the task prompt
- That trust prompt usually appears the first time a specific workspace path is opened in that CLI context and usually should not repeat once trust is recorded
- If the prompt appears unsent in the pane, send `Enter` once and re-check the pane before changing course
- Do not use Cursor headless mode such as `agent -p`; stay pane-first and interactive
- Do not use Antigravity headless/print mode (`agy -p`, `agy --print`, `agy --prompt`) by default; stay pane-first and interactive unless the user explicitly asks for script-style output
- Antigravity newline caveat: literal multiline tmux paste can submit each line as a separate queued message. For Agy, send ordinary follow-up prompts as a single line with `tmux send-keys -l`, or for a fresh multiline prompt use `agy --prompt-interactive "$(cat prompt.txt)"` so the initial prompt is delivered as one interactive message. This is not `--print`/headless; the pane remains interactive.
- Do not use Codex headless/non-interactive mode (`codex exec`) by default; stay pane-first and interactive unless the user explicitly asks for script-style output
- Do not use Codex `--dangerously-bypass-approvals-and-sandbox` by default; prefer workspace-write sandbox plus no approval prompts for direct-lane momentum

## Multi-pane Job Sessions

Use this when a single job benefits from multiple models or CLIs at the same time: for example Codex image generation, Antigravity review, Cursor reasoning, and Codex/Cursor alternatives around one asset or implementation task.

### Session shape

- Create one tmux session named for the job: `direct-<job-slug>`.
- Split panes inside that session rather than creating unrelated sessions like `codex-task`, `agy-task`, and `cursor-task` for the same job.
- Set pane titles with lane role/model names so captures stay readable.
- Capture by pane title/index and synthesize results in the main agent; do not let one lane read another lane's answer before it responds when independent diversity matters.

Example shape:

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

### Write policy

- Prefer one writer lane per file or asset contract.
- Review/idea lanes should not edit files unless explicitly assigned.
- If multiple lanes may write, give each lane a separate output directory such as `work/implement/`, `notes/review/`, `reports/verify/`, or asset-specific `generated-images/codex/source-a/`.
- For Codex imagegen specifically, same-prompt panes should write only to their own lane folders or leave generated PNGs in Codex's generated-images area for the main agent to collect. Do not let parallel lanes overwrite canonical runtime paths.
- Main agent owns final merge/synthesis into the real worktree: capture panes, compare outputs, choose candidates, assign cleanup, and promote accepted files.

### Sandbox verification

Verified locally on 2026-06-23 with a tmux sandbox: one prompt was loaded into a tmux buffer, pasted into three panes, and captured to three pane files. SHA-256 hashes matched the shared prompt for all panes, proving same-prompt fanout is practical with `tmux load-buffer` / `paste-buffer`.

Antigravity exception verified historically on 2026-06-29: Agy `1.0.13` with the then-current display label `--model "Claude Opus 4.6 (Thinking)"` worked, but multiline `tmux paste-buffer` split the prompt into multiple messages. A single-line `tmux send-keys -l ... Enter` worked, and `agy --prompt-interactive "$(cat prompt.txt)"` preserved a multiline initial prompt while keeping the session interactive. Keep the prompt-delivery caveat until it is re-tested, but use current stable model slugs for new launches.

## Current Freshness Notes

Use these notes as a check, not as timeless truth:

- Verified 2026-07-22: Cursor `agent` updated from `2026.07.17-3e2a980` to `2026.07.20-8cc9c0b`, which matches the official installer. The command surface adds `--endpoint` / `CURSOR_API_ENDPOINT`, and `--trust` is no longer documented as headless-only. `agent models` still exposes Composer 2.5, Fable 5, Sonnet 5, Opus 4.8, GPT-5.6 Sol/Terra/Luna, and other families. Catalog labels advertise 1M for Fable/Sonnet/Opus/GPT-5.6, while `agent about` for the active Fable session still reports `Fable 5 300K High`; treat effective context as session-dependent until a fresh launch proves otherwise. Use exact model IDs, not display shorthand.
- Verified 2026-07-22: Antigravity `agy 1.1.5` remains the latest binary, while its live catalog now adds Gemini 3.6 Flash alongside Gemini 3.5, Gemini 3.1 Pro, Opus 4.6 Thinking, Sonnet 4.6, and GPT-OSS 120B. Fresh interactive tmux lanes proved both `gemini-3.6-flash-high` and `gemini-3.6-flash-medium` with the correct visible model and response. Mahiro selected High as the curated fast default; keep 3.6 Medium and then `gemini-3.5-flash-medium` as fallbacks. Earlier foreground proof for Opus and Sonnet remains valid. `claude-opus-4-6-thinking --effort high` still has a known silent-fallback risk, and catalog-listed Gemini Pro previously failed at launch, so the picker excludes Gemini Pro and Opus launches omit `--effort`. Preserve the safe one-line/`--prompt-interactive` delivery path until multiline paste is re-tested on 1.1.5.
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
/direct-cli recovery
```

## Document Map

- `README.md` - human overview and entry guidance
- `playbook.md` - the full preserved direct CLI playbook

## Working Rule

Start from `playbook.md`. Use the known-good launch commands there first, wait for pane readiness, then send the task prompt, keep prompts narrow, continue from the current worktree only, do not restart from scratch, and trust pane output over assumptions.

ARGUMENTS: $ARGUMENTS
