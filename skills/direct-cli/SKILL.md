---
name: direct-cli
description: Direct executor playbook for using gemini CLI, Cursor CLI, Antigravity CLI, and Codex CLI through fresh tmux sessions without going through the usual orchestration runtime. Use when you want a pane-first direct CLI lane, narrow current-worktree follow-up, or fresh-session recovery.
---

# /direct-cli - Direct CLI Playbook

Use direct `gemini` CLI, Cursor CLI, Antigravity CLI (`agy`), or Codex CLI (`codex`) sessions when you want a fresh executor lane outside the usual orchestration runtime, while still keeping Sisyphus-style operator discipline.

## When to Use

- You want a fresh executor session without wrapper state
- You want direct tmux visibility into prompts, thinking, approval blocking, and errors
- You want narrow follow-up work on the current worktree
- You need a recovery playbook for stuck or unhealthy direct CLI lanes

## Operating Model

- Sisyphus stays the conversation owner
- Gemini CLI, Cursor CLI, Antigravity CLI, or Codex CLI acts as the direct executor
- Tmux pane output is treated as the nearest source of execution truth

## Default Lane Contract

- Use a fresh interactive tmux lane by default
- If one job needs multiple direct CLI lanes, prefer one named tmux job session with multiple panes over scattered one-lane sessions
- Multi-pane jobs support two modes: **role fanout** (shared context, different lane roles) and **same-prompt fanout** (exact same prompt pasted into every pane for independent model answers)
- For same-prompt fanout, write the prompt to a temp file, `tmux load-buffer` once, and paste that buffer into each pane so the prompt is byte-identical
- Keep a lane registry: pane title, CLI/model, role, write permissions, and output directory if it may write files
- Default write policy for multi-pane jobs: one writer per file/asset contract; other lanes are read-only/review/notes unless output directories are explicitly separated
- Prefer the known-good launch commands first instead of spending the first move on discovery
- It is acceptable to run `agent --help`, `agent --list-models`, `gemini --help`, `agy --help`, `codex --help`, `codex features list`, `codex doctor`, or similar checks when the launch command fails, when model availability is uncertain, or when local CLI behavior needs validation
- Default models: Gemini `gemini-3.1-pro-preview`; Cursor quick implementation / cleanup `composer-2.5-fast`; Cursor balanced `composer-2.5`; Cursor heavy review / deep reasoning `claude-opus-4-8-thinking-high`; Codex default/current `gpt-5.5`
- Antigravity (`agy`) model choices are TUI labels: `Gemini 3.5 Flash (High)` default/current fast lane, `Gemini 3.1 Pro (High)` stronger Gemini reasoning, and `Claude Opus 4.6 (Thinking)` heavy review/reasoning
- Codex (`codex`) model choices are `gpt-5.5` default/current general lane, `gpt-5.3-codex-high` coding-heavy lane, and `gpt-5.3-codex-high-fast` faster coding lane
- If the user invokes `/direct-cli gemini ...`, `/direct-cli cursor ...`, `/direct-cli agy ...`, or `/direct-cli codex ...` without an explicit model, stop and ask which skill-defined model to use before launching the lane; do not show the full CLI model list unless requested or troubleshooting
- For Gemini, the only normal skill-defined choice is `gemini-3.1-pro-preview`; treat it as the recommended/default choice and use other Gemini models only if the user explicitly names one
- For Cursor, ask among `composer-2.5-fast`, `composer-2.5`, and `claude-opus-4-8-thinking-high`; mention `composer-2-fast` only as a fallback if the current preferred models fail
- For Antigravity, ask among `Gemini 3.5 Flash (High)`, `Gemini 3.1 Pro (High)`, and `Claude Opus 4.6 (Thinking)`; current local `agy` supports `--model`, so prefer launching with the exact label when available, then verify the visible model label in the pane. Fall back to `/model` only if the flag is unavailable or fails.
- For Codex, ask among `gpt-5.5`, `gpt-5.3-codex-high`, and `gpt-5.3-codex-high-fast`; launch `codex` interactively before sending the task prompt
- Gemini headless mode is a hard block: never use `gemini -p`, `gemini --prompt`, or any non-interactive Gemini execution path
- Launch Gemini, Cursor, Antigravity, and Codex in tmux with yolo-style flags only, not with the task prompt inline
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

Use this when a single job benefits from multiple models or CLIs at the same time: for example Codex image generation, Antigravity Opus review, Gemini Pro reasoning, and Gemini Flash alternatives around one asset or implementation task.

### Session shape

- Create one tmux session named for the job: `direct-<job-slug>`.
- Split panes inside that session rather than creating unrelated sessions like `codex-task`, `agy-task`, and `gemini-task` for the same job.
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
tmux select-pane -t "direct-agent-halo-sprite:0.2" -T "agy-gemini-pro-check"
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
- If multiple lanes may write, give each lane a separate output directory such as `generated-images/codex/` and `notes/agy-opus/`.
- Main agent owns final merge/synthesis into the real worktree.

### Sandbox verification

Verified locally on 2026-06-23 with a tmux sandbox: one prompt was loaded into a tmux buffer, pasted into three panes, and captured to three pane files. SHA-256 hashes matched the shared prompt for all panes, proving same-prompt fanout is practical with `tmux load-buffer` / `paste-buffer`.

Antigravity exception verified locally on 2026-06-29: Agy `1.0.13` with `--model "Claude Opus 4.6 (Thinking)"` works, but multiline `tmux paste-buffer` split the prompt into multiple messages. Follow-up checks showed the split is Agy input-loop behavior, not Opus-only: Gemini 3.5 Flash and Gemini 3.1 Pro also logged one `HandleUserInput` per line. A single-line `tmux send-keys -l ... Enter` worked, and `agy --prompt-interactive "$(cat prompt.txt)"` preserved a multiline initial prompt while keeping the session interactive.

## Current Freshness Notes

Use these notes as a check, not as timeless truth:

- Verified 2026-05-29: local Gemini CLI was `0.43.0`, while npm latest stable was `0.44.1` and preview was `0.45.0-preview.1`. Re-run `gemini --version` / `gemini --help` before changing Gemini launch flags or model names.
- Gemini direct-lane default remains `gemini-3.1-pro-preview` until the local Gemini CLI is verified to accept a replacement such as `gemini-3.1-pro`; Gemini/Cursor model aliases move quickly.
- Verified 2026-05-29: Cursor `agent models` included `composer-2.5-fast` as default, `composer-2.5`, and `claude-opus-4-8-thinking-high`; use Opus 4.8 Thinking as the heavy review/reasoning lane.
- Verified 2026-05-29: Antigravity `agy` was `1.0.3`, with G1 credits, `/credits`, plugin import/manage, MCP disable fixes, `/diff` wrapping fixes, and project-discovery robustness improvements. Keep Antigravity pane-first unless the user explicitly asks for print mode.
- Verified 2026-06-29: local Antigravity `agy` is `1.0.13`, `agy models` lists `Claude Opus 4.6 (Thinking)`, and `agy --model "Claude Opus 4.6 (Thinking)" --dangerously-skip-permissions` launches the Opus pane successfully. Startup logs may briefly show auth/model-cache errors before keyring auth succeeds; verify the visible account/model label in the pane before diagnosing failure.
- Verified 2026-05-29: Codex CLI local was `0.134.0`, npm latest was `0.135.0`, `image_generation` was stable/enabled, and `codex --help` supported interactive `--image`, `--model`, `--sandbox`, and `--ask-for-approval` flags. Codex image generation requires ChatGPT/Codex backend plus provider/model support; generated PNGs are saved under `$CODEX_HOME/generated-images/<session>/<call_id>.png`.

## Hard Block: No Gemini Headless Mode

Never use Gemini headless mode, even for recovery or a quick finish.

Forbidden:

- `gemini -p "..."`
- `gemini --prompt "..."`
- non-interactive Gemini execution outside a tmux pane

Required:

- start or reuse a tmux lane
- launch Gemini with `gemini -m "gemini-3.1-pro-preview" --approval-mode yolo --skip-trust` and no task prompt inline
- verify the pane is ready, then send the task prompt with `tmux send-keys`
- verify progress and completion with `tmux capture-pane`

Reason: headless Gemini bypasses this skill's pane-first execution contract and is more prone to capacity / `429` failures. If interactive Gemini stalls, recover inside tmux or start a fresh interactive tmux lane; do not switch to headless.

## Quick Commands

```text
/direct-cli
/direct-cli gemini
/direct-cli cursor
/direct-cli agy
/direct-cli codex
/direct-cli cursor --model composer-2.5-fast
/direct-cli gemini --model gemini-3.1-pro-preview
/direct-cli agy --model "Gemini 3.5 Flash (High)"
/direct-cli codex --model gpt-5.5
/direct-cli recovery
```

## Document Map

- `README.md` - human overview and entry guidance
- `playbook.md` - the full preserved direct CLI playbook

## Working Rule

Start from `playbook.md`. Use the known-good launch commands there first, wait for pane readiness, then send the task prompt, keep prompts narrow, continue from the current worktree only, do not restart from scratch, and trust pane output over assumptions.

ARGUMENTS: $ARGUMENTS
