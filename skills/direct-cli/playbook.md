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
- Start with the known-good launch commands in this playbook. Do not burn the first step on discovery by default.
- Use discovery commands such as `agent --list-models`, `agent --help`, or `gemini --help` when the launch command fails, when model availability is uncertain, or when local CLI behavior needs validation.
- Keep the lane **interactive in tmux**. Do not default to Cursor headless mode such as `agent -p`.
- Use yolo approvals by default: Gemini with `--approval-mode yolo`, Cursor with `--yolo --approve-mcps`.
- Remember that yolo approvals do not bypass workspace trust prompts. If the pane shows a trust prompt for the intended repo, either accept it in the pane or hand it to the user to accept before assuming the launch failed.
- Use **very narrow prompts** with explicit file scope.
- Tell the executor to **continue from the current worktree only**.
- Tell it to **not restart from scratch**.
- Verify that the prompt was actually submitted by checking pane output.
- Trust the tmux pane more than a high-level assumption.

## Known-good defaults

Use these defaults first. Only deviate when the user explicitly asks or a launch failure forces a narrower recovery path.

- Gemini model: `gemini-3.1-pro-preview`
- Cursor heavy review / deep reasoning model: `claude-opus-4-7-high`
- Cursor lighter cleanup model: `composer-2`
- Gemini launch style: interactive tmux lane with `--approval-mode yolo`
- Cursor launch style: interactive tmux lane with `--yolo --approve-mcps`

## Tested examples

These examples were actually run in tmux while refining this skill. Treat them as the first commands to try before improvising.

### Tested Cursor interactive review lane

```bash
tmux new-session -d -s "cursor-task"
tmux send-keys -t cursor-task 'agent --model "claude-opus-4-7-high" --yolo --approve-mcps "Continue from the current worktree only. Do not restart from scratch. Scope: no files. Task: reply with exactly CURSOR_DIRECT_CLI_OK and then wait."' Enter
tmux capture-pane -p -t "cursor-task" -S -120
```

Observed result:

```text
CURSOR_DIRECT_CLI_OK
```

### Tested Gemini interactive lane

```bash
tmux new-session -d -s "gemini-task"
tmux send-keys -t gemini-task 'gemini -m "gemini-3.1-pro-preview" --approval-mode yolo -i "Continue from the current worktree only. Do not restart from scratch. Scope: no files. Task: reply with exactly GEMINI_DIRECT_CLI_OK and then wait."' Enter
tmux capture-pane -p -t "gemini-task" -S -120
```

Observed result before trust prompt:

```text
GEMINI_DIRECT_CLI_OK
```

Gemini then surfaced a workspace trust prompt in the pane. That is expected and can be accepted in the interactive UI for the intended repo by either the agent or the user.

### Safe discovery examples

Use these when you need to validate local behavior rather than guessing:

```bash
agent --list-models
agent --help
gemini --help
```

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

Use the known-good Cursor defaults first. If the model or flags are in doubt on this machine, validate with `agent --list-models` or `agent --help` before changing the launch shape.

```bash
tmux new-session -d -s "cursor-task"
tmux send-keys -t cursor-task 'agent --model "claude-opus-4-7-high" --yolo --approve-mcps "Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>"' Enter
```

For a lighter pass:

```bash
tmux send-keys -t cursor-task 'agent --model "composer-2" --yolo --approve-mcps "Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>"' Enter
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

The default direct path is still interactive for both tools. Do not switch Cursor into headless `-p` mode unless the user explicitly asks for a script-style capture.

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
- prefer `--yolo --approve-mcps` for Cursor direct runs
- inspect pane output directly before assuming the executor is still progressing normally

### Workspace trust prompt

Symptoms:

- Gemini launches, but local project agents or commands are skipped because the folder is not yet trusted
- the pane shows a trust selection UI instead of continuing directly into normal work

Notes:

- this usually appears the first time that specific workspace or path is opened in that CLI context
- once trust is recorded, it usually should not ask again for the same workspace path
- if it asks again later, suspect a changed path, a different parent/child directory level, or reset trust state

Mitigation:

- inspect the pane and treat the trust prompt as the next action, not as a broken launch
- if the workspace is the intended repo, approve trust in the pane and continue immediately, or let the user approve it directly
- remember that yolo approval flags do not auto-accept workspace trust prompts

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

- text appears in the input box but Gemini or Cursor has not entered thinking
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
