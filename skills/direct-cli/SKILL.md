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
- Do not use Cursor headless mode such as `agent -p`; stay pane-first and interactive
- Use yolo-style approvals by default: Gemini with `--approval-mode yolo`, Cursor with `--yolo --approve-mcps`
- If the direct lane shows a workspace trust prompt for the intended repo, either accept it in the pane and continue or let the user accept it directly
- That trust prompt usually appears the first time a specific workspace path is opened in that CLI context and usually should not repeat once trust is recorded
- If the prompt appears unsent in the pane, send `Enter` once and re-check the pane before changing course

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

Start from `playbook.md`. Use the known-good launch commands and tested examples there first, keep prompts narrow, continue from the current worktree only, do not restart from scratch, and trust pane output over assumptions.

ARGUMENTS: $ARGUMENTS
