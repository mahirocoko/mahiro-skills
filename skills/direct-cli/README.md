# direct-cli skill

`/direct-cli` is the packaged playbook for running Gemini CLI, Cursor CLI, Antigravity CLI, and Codex CLI directly through tmux-managed executor lanes.

It is for situations where you want to bypass the usual orchestration runtime but still keep good operator posture: narrow scope, current-worktree continuation, pane-first verification, launch first then send the task prompt, and fresh-session recovery when the lane looks unhealthy.

The default posture is now explicit: launch in tmux with yolo-style approval flags, capture the pane until it is ready, then send the real prompt with `tmux send-keys`. Avoid Cursor, Antigravity, and Codex headless mode by default. Antigravity is the exception for exact multiline initial prompts: `agy --prompt-interactive "$(cat prompt.txt)"` keeps the pane interactive and avoids Agy splitting multiline tmux paste into separate queued messages. If model or flag availability is uncertain, it is fine to validate with CLI discovery commands such as `agent --list-models`, `agent models`, `agent --help`, `gemini --help`, `agy --help`, `agy models`, or `codex --help`. Gemini should launch with `--skip-trust` when appropriate for the intended workspace.

For one job with several direct lanes, use a single tmux job session with multiple panes. The playbook supports **role fanout** (shared context, different lane roles) and **same-prompt fanout** (one byte-identical prompt pasted into every pane through a tmux buffer for independent model answers). Same-prompt fanout was sandbox-verified locally with matching SHA-256 hashes across three pane captures; for Agy specifically, use the playbook's multiline caveat instead of raw `tmux paste-buffer`.

Default models are explicit too: Gemini uses `gemini-3.1-pro-preview`; Cursor quick implementation / cleanup uses `composer-2.5-fast`; Cursor balanced implementation uses `composer-2.5`; Cursor heavy review / deep reasoning uses `claude-opus-4-8-thinking-high`; Antigravity uses `Gemini 3.5 Flash (High)` by default, with `Gemini 3.1 Pro (High)` and `Claude Opus 4.6 (Thinking)` as curated alternatives and exact `agy --model` labels when available; Codex uses `gpt-5.5` by default, with `gpt-5.3-codex-high` and `gpt-5.3-codex-high-fast` as curated alternatives.

If a command-style invocation names the lane but not the model — for example `/direct-cli gemini ...`, `/direct-cli cursor ...`, `/direct-cli agy ...`, or `/direct-cli codex ...` — ask the user which skill-defined model to use before launching. Do not present the full CLI model list unless the user requests it or a preferred model fails. For Gemini, confirm the single normal default `gemini-3.1-pro-preview`; for Cursor, offer `composer-2.5-fast`, `composer-2.5`, and `claude-opus-4-8-thinking-high`; for Antigravity, offer `Gemini 3.5 Flash (High)`, `Gemini 3.1 Pro (High)`, and `Claude Opus 4.6 (Thinking)`; for Codex, offer `gpt-5.5`, `gpt-5.3-codex-high`, and `gpt-5.3-codex-high-fast`.

## What this skill is for

Use it when you want AI to:

- open a fresh direct executor session
- keep work limited to the current worktree
- inspect tmux pane output as execution truth
- run multi-pane job sessions with a lane registry, prompt fanout, and clear write policy
- recover cleanly from approval blocking, session corruption, or unsent prompts
- launch Gemini with `--approval-mode yolo`, Cursor with `--yolo --approve-mcps`, Antigravity with `--dangerously-skip-permissions`, and Codex with `--sandbox workspace-write --ask-for-approval never`, then send the task prompt after readiness

## What this skill is not

- not a replacement for normal orchestration flows
- not an invitation to restart work from scratch
- not a generic tmux tutorial

## How to read the docs

- `SKILL.md` is the agent entrypoint and short operating summary
- `playbook.md` is the preserved long-form operator manual
- `playbook.md` also contains tmux-first launch examples and current freshness notes

## Recommended usage

```text
/direct-cli "use Gemini CLI directly for a narrow UI follow-up"
/direct-cli gemini "fresh session for current-worktree-only visual pass"
/direct-cli cursor "cleanup pass after a Gemini UI run"
/direct-cli agy "pre-release verification pass"
/direct-cli codex "OpenAI-native implementation pass"
/direct-cli cursor --model composer-2.5-fast "cleanup pass after a Gemini UI run"
/direct-cli agy --model "Gemini 3.5 Flash (High)" "inspect this repo"
/direct-cli codex --model gpt-5.5 "image-aware coding pass"
/direct-cli "run same-prompt fanout across Codex and multiple Agy models"
/direct-cli recovery "the direct lane looks stuck"
```

## Working rule

Keep the executor lane narrow, current-worktree-only, pane-verified, and interactive. Use the known-good launch commands in `playbook.md` first, wait for pane readiness, then send the task prompt. If the lane becomes unhealthy, prefer a fresh session over heroic recovery.
