# direct-cli skill

`/direct-cli` is the packaged playbook for running Gemini CLI and Cursor CLI directly through tmux-managed executor lanes.

It is for situations where you want to bypass the usual orchestration runtime but still keep good operator posture: narrow scope, current-worktree continuation, pane-first verification, and fresh-session recovery when the lane looks unhealthy.

## What this skill is for

Use it when you want AI to:

- open a fresh direct executor session
- keep work limited to the current worktree
- inspect tmux pane output as execution truth
- recover cleanly from approval blocking, session corruption, or unsent prompts

## What this skill is not

- not a replacement for normal orchestration flows
- not an invitation to restart work from scratch
- not a generic tmux tutorial

## How to read the docs

- `SKILL.md` is the agent entrypoint and short operating summary
- `playbook.md` is the preserved long-form operator manual

## Recommended usage

```text
/direct-cli "use Gemini CLI directly for a narrow UI follow-up"
/direct-cli gemini "fresh session for current-worktree-only visual pass"
/direct-cli cursor "cleanup pass after a Gemini UI run"
/direct-cli recovery "the direct lane looks stuck"
```

## Working rule

Keep the executor lane narrow, current-worktree-only, and pane-verified. If the lane becomes unhealthy, prefer a fresh session over heroic recovery.
