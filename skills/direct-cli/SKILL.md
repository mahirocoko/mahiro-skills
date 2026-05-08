---
name: direct-cli
description: Direct executor playbook for using gemini CLI and Cursor CLI through fresh tmux sessions without going through the usual orchestration runtime. Use when you want a pane-first direct CLI lane, narrow current-worktree follow-up, or fresh-session recovery.
---

# /direct-cli - Direct CLI Playbook

Use direct `gemini` CLI or Cursor CLI sessions when you want a fresh executor lane outside the usual orchestration runtime, while still keeping Sisyphus-style operator discipline.

## When to Use

- You want a fresh executor session without wrapper state
- You want direct tmux visibility into prompts, thinking, approval blocking, and errors
- You want narrow follow-up work on the current worktree
- You need a recovery playbook for stuck or unhealthy direct CLI lanes

## Operating Model

- Sisyphus stays the conversation owner
- Gemini CLI or Cursor CLI acts as the direct executor
- Tmux pane output is treated as the nearest source of execution truth

## Default Lane Contract

- Use a fresh interactive tmux lane by default
- Prefer the known-good launch commands first instead of spending the first move on discovery
- It is acceptable to run `agent --help`, `agent --list-models`, `gemini --help`, or similar checks when the launch command fails, when model availability is uncertain, or when local CLI behavior needs validation
- Gemini headless mode is a hard block: never use `gemini -p`, `gemini --prompt`, or any non-interactive Gemini execution path
- Launch Gemini and Cursor in tmux with yolo-style flags only, not with the task prompt inline
- Capture the pane and confirm readiness before sending the real task prompt with `tmux send-keys`
- If the direct lane shows a workspace trust prompt for the intended repo, accept it in the pane or let the user accept it directly before sending the task prompt
- That trust prompt usually appears the first time a specific workspace path is opened in that CLI context and usually should not repeat once trust is recorded
- If the prompt appears unsent in the pane, send `Enter` once and re-check the pane before changing course
- Do not use Cursor headless mode such as `agent -p`; stay pane-first and interactive

## Hard Block: No Gemini Headless Mode

Never use Gemini headless mode, even for recovery or a quick finish.

Forbidden:

- `gemini -p "..."`
- `gemini --prompt "..."`
- non-interactive Gemini execution outside a tmux pane

Required:

- start or reuse a tmux lane
- launch Gemini with `gemini -m "gemini-3.1-pro-preview" --approval-mode yolo` and no task prompt inline
- verify the pane is ready, then send the task prompt with `tmux send-keys`
- verify progress and completion with `tmux capture-pane`

Reason: headless Gemini bypasses this skill's pane-first execution contract and is more prone to capacity / `429` failures. If interactive Gemini stalls, recover inside tmux or start a fresh interactive tmux lane; do not switch to headless.

## Quick Commands

```text
/direct-cli
/direct-cli gemini
/direct-cli cursor
/direct-cli recovery
```

## Document Map

- `README.md` - human overview and entry guidance
- `playbook.md` - the full preserved direct CLI playbook

## Working Rule

Start from `playbook.md`. Use the known-good launch commands there first, wait for pane readiness, then send the task prompt, keep prompts narrow, continue from the current worktree only, do not restart from scratch, and trust pane output over assumptions.

ARGUMENTS: $ARGUMENTS
