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
- Prefer the known-good launch commands first instead of spending the first move on discovery
- It is acceptable to run `agent --help`, `agent --list-models`, `gemini --help`, `agy --help`, `codex --help`, `codex features list`, `codex doctor`, or similar checks when the launch command fails, when model availability is uncertain, or when local CLI behavior needs validation
- Default models: Gemini `gemini-3.1-pro-preview`; Cursor quick implementation / cleanup `composer-2.5-fast`; Cursor balanced `composer-2.5`; Cursor heavy review / deep reasoning `claude-opus-4-8-thinking-high`; Codex default/current `gpt-5.5`
- Antigravity (`agy`) model choices are TUI labels: `Gemini 3.5 Flash (High)` default/current fast lane, `Gemini 3.1 Pro (High)` stronger Gemini reasoning, and `Claude Opus 4.6 (Thinking)` heavy review/reasoning
- Codex (`codex`) model choices are `gpt-5.5` default/current general lane, `gpt-5.3-codex-high` coding-heavy lane, and `gpt-5.3-codex-high-fast` faster coding lane
- If the user invokes `/direct-cli gemini ...`, `/direct-cli cursor ...`, `/direct-cli agy ...`, or `/direct-cli codex ...` without an explicit model, stop and ask which skill-defined model to use before launching the lane; do not show the full CLI model list unless requested or troubleshooting
- For Gemini, the only normal skill-defined choice is `gemini-3.1-pro-preview`; treat it as the recommended/default choice and use other Gemini models only if the user explicitly names one
- For Cursor, ask among `composer-2.5-fast`, `composer-2.5`, and `claude-opus-4-8-thinking-high`; mention `composer-2-fast` only as a fallback if the current preferred models fail
- For Antigravity, ask among `Gemini 3.5 Flash (High)`, `Gemini 3.1 Pro (High)`, and `Claude Opus 4.6 (Thinking)`; if a non-current model is chosen, launch `agy` first and switch through `/model` in the TUI before sending the task prompt
- For Codex, ask among `gpt-5.5`, `gpt-5.3-codex-high`, and `gpt-5.3-codex-high-fast`; launch `codex` interactively before sending the task prompt
- Gemini headless mode is a hard block: never use `gemini -p`, `gemini --prompt`, or any non-interactive Gemini execution path
- Launch Gemini, Cursor, Antigravity, and Codex in tmux with yolo-style flags only, not with the task prompt inline
- Capture the pane and confirm readiness before sending the real task prompt with `tmux send-keys`
- If the direct lane shows a workspace trust prompt for the intended repo, accept it in the pane or let the user accept it directly before sending the task prompt
- That trust prompt usually appears the first time a specific workspace path is opened in that CLI context and usually should not repeat once trust is recorded
- If the prompt appears unsent in the pane, send `Enter` once and re-check the pane before changing course
- Do not use Cursor headless mode such as `agent -p`; stay pane-first and interactive
- Do not use Antigravity headless/print mode (`agy -p`, `agy --print`, `agy --prompt`) by default; stay pane-first and interactive unless the user explicitly asks for script-style output
- Do not use Codex headless/non-interactive mode (`codex exec`) by default; stay pane-first and interactive unless the user explicitly asks for script-style output
- Do not use Codex `--dangerously-bypass-approvals-and-sandbox` by default; prefer workspace-write sandbox plus no approval prompts for direct-lane momentum

## Current Freshness Notes

Use these notes as a check, not as timeless truth:

- Verified 2026-05-29: local Gemini CLI was `0.43.0`, while npm latest stable was `0.44.1` and preview was `0.45.0-preview.1`. Re-run `gemini --version` / `gemini --help` before changing Gemini launch flags or model names.
- Gemini direct-lane default remains `gemini-3.1-pro-preview` until the local Gemini CLI is verified to accept a replacement such as `gemini-3.1-pro`; Gemini/Cursor model aliases move quickly.
- Verified 2026-05-29: Cursor `agent models` included `composer-2.5-fast` as default, `composer-2.5`, and `claude-opus-4-8-thinking-high`; use Opus 4.8 Thinking as the heavy review/reasoning lane.
- Verified 2026-05-29: Antigravity `agy` was `1.0.3`, with G1 credits, `/credits`, plugin import/manage, MCP disable fixes, `/diff` wrapping fixes, and project-discovery robustness improvements. Keep Antigravity pane-first unless the user explicitly asks for print mode.
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
