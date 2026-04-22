# Direct CLI Playbook

This playbook is for using `gemini` CLI and `cursor` CLI directly, without going through the usual orchestration runtime.

The intended model is simple:

- Sisyphus stays the conversation owner.
- Gemini CLI or Cursor CLI acts as the direct executor.
- Tmux pane output is treated as the nearest source of execution truth.

## When to use direct CLI

Use this path when you want:

- a fresh executor session without wrapper state
- direct tmux visibility into prompts, thinking, approval blocking, and errors
- narrow follow-up work on the current worktree

## Core operator rules

- Prefer a **fresh tmux session** when an old session looks unhealthy.
- Use **very narrow prompts** with explicit file scope.
- Tell the executor to **continue from the current worktree only**.
- Tell it to **not restart from scratch**.
- Verify that the prompt was actually submitted by checking pane output.
- Trust the tmux pane more than a high-level assumption.

---

## Gemini CLI direct playbook

### Best for

- UI work
- layout and styling passes
- focused frontend tasks
- exploratory visual implementation with tight scope

### Fresh session

```bash
tmux new-session -d -s "gemini-task"
tmux send-keys -t gemini-task 'gemini -m "gemini-3.1-pro-preview" --approval-mode yolo -i "Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>"' Enter
```

### Prompt template

```text
Continue from the current worktree only.
Do not restart from scratch.

Scope is limited to:
- <file1>
- <file2>

Task:
<what to change>

Rules:
- keep changes minimal
- do not touch unrelated files
- summarize changed files at the end
```

### Check current pane output

```bash
tmux capture-pane -p -t "gemini-task" -S -120
```

### If Gemini thinks too long

```bash
tmux send-keys -t gemini-task C-c
tmux send-keys -t gemini-task "Continue from the current worktree only. Keep scope narrow. Finish only the pending change in <file>." Enter
```

### If Gemini session looks broken

If you see errors like API 400 function-call mismatch, abandon the old session and start a new one.

```bash
tmux kill-session -t gemini-task
tmux new-session -d -s "gemini-task-fresh"
tmux send-keys -t gemini-task-fresh 'gemini -m "gemini-3.1-pro-preview" --approval-mode yolo -i "Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>"' Enter
```

---

## Cursor CLI direct playbook

### Best for

- refactoring after a Gemini UI pass
- code cleanup
- structure tightening
- logic-heavy follow-up work

### Fresh session

Use the model your local Cursor CLI expects. Example:

```bash
tmux new-session -d -s "cursor-task"
tmux send-keys -t cursor-task 'agent -m "claude-opus-4-7-high" "Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>"' Enter
```

For a lighter pass:

```bash
tmux send-keys -t cursor-task 'agent -m "composer-2" "Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>"' Enter
```

### Prompt template

```text
Continue from the current worktree only.
Do not restart from scratch.

Scope:
- <file1>
- <file2>

Task:
<refactor / cleanup / bugfix>

Rules:
- preserve behavior
- no unrelated refactors
- keep diff small
- report changed files and rationale
```

### Check current pane output

```bash
tmux capture-pane -p -t "cursor-task" -S -120
```

---

## Recommended combined flow

### Gemini first, Cursor second

1. Run Gemini CLI for the visual or UI-heavy pass.
2. Inspect the pane output and then inspect the diff.
3. Run Cursor CLI for refactor or cleanup on top of the resulting worktree.
4. Run verification locally.

This works well when Gemini is stronger at producing the initial UI direction, while Cursor is stronger at tightening code structure afterward.

---

## Prompting rules that improve reliability

Prefer prompts that are:

- narrow in scope
- explicit about file boundaries
- explicit about current worktree continuation
- explicit about not restarting from scratch
- explicit about output expectations

Example:

```text
Continue from the current worktree only.
Do not restart from scratch.

Only work in:
- src/foo.ts
- src/bar.ts

Goal:
Fix the sidebar spacing and keep behavior unchanged.

At the end:
- list changed files
- explain what remains
```

---

## Failure modes to watch for

### Approval blocking

Symptoms:

- pane stops at an approval prompt
- work appears stalled even though the process is still alive

Mitigation:

- prefer `--approval-mode yolo` when appropriate for Gemini direct runs
- inspect pane output directly before assuming the executor is still progressing normally

### Session corruption

Symptoms:

- API 400 or function-call mismatch errors
- repeated follow-up prompts behave strangely

Mitigation:

- abandon the session
- create a fresh session
- resend a shorter prompt with narrower scope

### Prompt not actually submitted

Symptoms:

- text appears in the input box but Gemini has not entered thinking
- text you sent is still sitting in the inbox / input area

Mitigation:

- inspect the pane
- if the message still appears unsent in the inbox or input area, try pressing `Enter` once before assuming the session is stuck
- if needed, send `Enter` again explicitly

---

## Minimal tmux command cheatsheet

List sessions:

```bash
tmux list-sessions
```

Capture pane output:

```bash
tmux capture-pane -p -t "gemini-task" -S -120
tmux capture-pane -p -t "cursor-task" -S -120
```

Interrupt current task:

```bash
tmux send-keys -t gemini-task C-c
tmux send-keys -t cursor-task C-c
```

Kill session:

```bash
tmux kill-session -t gemini-task
tmux kill-session -t cursor-task
```

Create fresh session:

```bash
tmux new-session -d -s "gemini-task-fresh"
tmux new-session -d -s "cursor-task-fresh"
```

---

## Short operator checklist

When a direct CLI lane looks stuck:

1. Check the pane.
2. Decide whether it is thinking, blocked on approval, or unhealthy.
3. If unhealthy, abandon the old session.
4. Start a fresh session.
5. Use a shorter, narrower prompt.
6. Confirm the new prompt was actually submitted.

The key rule is simple: **fresh session, narrow scope, pane-first truth**.
