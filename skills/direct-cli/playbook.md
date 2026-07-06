# Direct CLI Playbook

This playbook is for using `gemini` CLI, Cursor CLI, Antigravity CLI (`agy`), and Codex CLI (`codex`) directly, without going through the usual orchestration runtime.

The intended model is simple:

- Mahiro Code / the main agent stays the conversation owner.
- Gemini CLI, Cursor CLI, Antigravity CLI, or Codex CLI acts as the direct executor.
- Tmux pane output is treated as the nearest source of execution truth.
- For production-ish asset/imagegen work, route through `codex-asset-production` first; direct-cli owns pane execution, not the asset workflow. For sprite-like sheets, route through `sprite-workflow` first.

## When to use direct CLI

Use this path when you want:

- a fresh executor session without wrapper state
- direct tmux visibility into prompts, thinking, approval blocking, and errors
- narrow follow-up work on the current worktree

## Core operator rules

- Prefer a **fresh tmux session** when an old session looks unhealthy.
- Start with the known-good launch commands in this playbook. Do not burn the first step on discovery by default.
- Use discovery commands such as `agent --list-models`, `agent --help`, `gemini --help`, `agy --help`, `codex --help`, `codex features list`, or `codex doctor` when the launch command fails, when model availability is uncertain, or when local CLI behavior needs validation.
- Keep the lane **interactive in tmux**. Do not default to Cursor headless mode such as `agent -p`.
- Do not default to Antigravity headless/print mode such as `agy -p`, `agy --print`, or `agy --prompt` unless the user explicitly asks for script-style output.
- Do not default to Codex non-interactive mode such as `codex exec`; use it only when the user explicitly asks for script/headless output.
- Do not default to Codex `--dangerously-bypass-approvals-and-sandbox`; use workspace-write sandboxing by default.
- If the invocation is `/direct-cli gemini ...`, `/direct-cli cursor ...`, `/direct-cli agy ...`, or `/direct-cli codex ...` and the user did not specify a model, ask which skill-defined model to use before launching the lane.
- Do not dump the full CLI model list as the model picker. Use this playbook's curated model set; run CLI model listing only when the user asks, the named model fails, or availability is uncertain.
- Gemini headless mode is forbidden. Do not use `gemini -p` or `gemini --prompt`, even for recovery or a quick finish.
- Launch Gemini, Cursor, Antigravity, and Codex in tmux with yolo approvals, but without the task prompt inline.
- Capture the pane and confirm the session is ready before sending the real task prompt with `tmux send-keys`.
- Remember that yolo approvals do not bypass workspace trust prompts. If the pane shows a trust prompt for the intended repo, accept it in the pane or hand it to the user to accept before sending the task prompt.
- Use **very narrow prompts** with explicit file scope.
- Tell the executor to **continue from the current worktree only**.
- Tell it to **not restart from scratch**.
- Verify that the prompt was actually submitted by checking pane output.
- Trust the tmux pane more than a high-level assumption.

## Multi-pane job sessions

Use a multi-pane job session when one job benefits from several direct lanes at once, such as Codex for image generation, Antigravity with Opus for critique, Antigravity/Gemini for alternatives, and Codex or Cursor for implementation cleanup.

The goal is one job, one tmux session, many panes — not scattered sessions that lose the shared context.

### When to use

- The user wants several model opinions on the same question.
- The job has multiple independent roles: imagegen, design critique, implementation, verification, or risk review.
- You want multiple Codex imagegen lanes for independent source candidates or source/dicut/QA role fanout in one asset job.
- The same worktree/context should stay visible while lanes differ by CLI/model.
- The user asks for several Antigravity models at once, such as Opus, Gemini 3.5, and Gemini 3.1 Pro.

### Session naming and lane registry

Name the tmux session for the job:

```bash
JOB="direct-<job-slug>"
tmux new-session -d -s "$JOB" -n lanes
tmux split-window -h -t "$JOB:0.0"
tmux split-window -v -t "$JOB:0.1"
tmux select-layout -t "$JOB:0" tiled
tmux select-pane -t "$JOB:0.0" -T "implement"
tmux select-pane -t "$JOB:0.1" -T "review"
tmux select-pane -t "$JOB:0.2" -T "verify"
tmux list-panes -t "$JOB" -F '#{pane_index}: #{pane_title} #{pane_current_command}'
```

Keep a lane registry before sending real prompts:

| Pane | Title | CLI / model | Role | Write permission |
| --- | --- | --- | --- | --- |
| 0 | `implement` | Codex/Cursor/Gemini | scoped implementation or generation | write only to assigned files/output dir |
| 1 | `review` | Agy/Cursor/Gemini | critique / risks / alternatives | read-only / notes |
| 2 | `verify` | Codex/Cursor/Agy | checks, QA, or reproduction | write only to reports unless assigned |

### Fanout modes

#### Role fanout

Use role fanout when panes should do different jobs over the same work context.

Every lane gets the same job context, then a lane-specific role/task:

```text
Job: <job name>
Shared context:
- Repo/worktree: <path>
- Current constraints: <constraints>
- Allowed files/output dirs: <scope>
- Do not touch unrelated files.
- Continue from the current worktree only. Do not restart from scratch.

Lane role: <imagegen / critique / implementation / verification>
Task:
<role-specific task>

Output:
- changed files or generated paths, if any
- recommendations / risks
- what remains
```

#### Same-prompt fanout

Use same-prompt fanout when the user wants different answers from multiple models for the same question.

Rules:

- Send byte-identical prompt content to every pane.
- Do not add lane-specific prefixes or role instructions unless the user asks for role fanout.
- If independent reasoning matters, put that instruction inside the shared prompt itself before fanout.
- Capture each pane separately and synthesize after responses finish.
- Do not let one pane read another pane's output before it answers.

Use a prompt file plus tmux buffer to avoid quoting drift:

```bash
JOB="direct-<job-slug>"
PROMPT_FILE="/tmp/$JOB.prompt.txt"
cat > "$PROMPT_FILE" <<'PROMPT'
<SHARED PROMPT HERE>
PROMPT

tmux load-buffer -b "$JOB-prompt" "$PROMPT_FILE"
for pane in 0 1 2; do
  tmux paste-buffer -t "$JOB:0.$pane" -b "$JOB-prompt"
  tmux send-keys -t "$JOB:0.$pane" Enter
done
```

Optional audit if the panes are test/sandbox panes that capture stdin to files:

```bash
shasum -a 256 "$PROMPT_FILE" /tmp/direct-cli-fanout.*/pane-*.txt
```

### Write policy for multi-pane work

- Default to one writer lane per file or asset contract.
- Make review, idea, and risk lanes read-only unless explicitly assigned as writers.
- If several lanes need to produce artifacts, give each a separate output directory such as `work/implement/`, `notes/review/`, `reports/verify/`, or asset-specific folders.
- For Codex imagegen specifically, same-prompt panes should write only to their own lane folders or leave generated PNGs in Codex's generated-images area for the main agent to collect.
- Do not let parallel lanes overwrite canonical runtime paths.
- Main agent owns final merge/synthesis into the real worktree. For asset jobs, that means capturing panes, comparing outputs, choosing candidates, assigning cleanup, and promoting accepted files.
- Report exactly which lane changed or generated which artifact.

### Codex imagegen multi-lane jobs

Use this specific shape when `codex-asset-production` asks for several Codex imagegen/source lanes. Direct-cli remains the generic pane executor; this subsection is only the asset/imagegen specialization.

Example asset lane registry:

| Pane | Title | CLI / model | Role | Write permission |
| --- | --- | --- | --- | --- |
| 0 | `codex-source-a` | Codex `gpt-5.5` | imagegen/source candidate A | write only to `generated-images/codex/source-a/` or Codex generated-images |
| 1 | `codex-source-b` | Codex `gpt-5.5` | imagegen/source candidate B | write only to `generated-images/codex/source-b/` or Codex generated-images |
| 2 | `codex-dicut` | Codex `gpt-5.3-codex-high` | cutout/cleanup/QA after source chosen | write only to `generated-images/codex/dicut/` |
| 3 | `agy-review` | Agy/Cursor/Gemini | critique / visual risks | read-only / notes |

- Put all panes in one `direct-<asset-job>` tmux session.
- Use same-prompt fanout for independent visual diversity: exact same source prompt, separate output folders, no lane sees another lane before responding.
- Use role fanout for pipeline speed: `codex-source-a`, `codex-source-b`, `codex-dicut`, `codex-qa`, and optional `agy-review`.
- Record each pane's output folder and collect Codex generated PNGs from `$CODEX_HOME/generated-images/<session>/<call_id>.png` when the lane leaves images there.
- The main agent compares source candidates, picks winners, assigns cleanup/dicut, inspects actual output files, and promotes only accepted assets to canonical paths.

### Antigravity multi-model notes

Current local Antigravity (verified 2026-06-29, `agy 1.0.13`) supports exact model labels through `--model`. Prefer the flag when it exists, then verify the visible model label in the pane. Fall back to `/model` only if the flag is unavailable or the launch fails.

For several Agy models in one job:

1. Open one Agy pane per model.
2. Launch `agy --model "<exact label>" --dangerously-skip-permissions` in each pane when supported.
3. Verify the visible model label, or switch each pane through `/model` if automated flag selection is brittle.
4. Only then send either the role-specific prompt or the same shared prompt.

Known-good local labels from `agy models`: `Gemini 3.5 Flash (High)`, `Gemini 3.1 Pro (High)`, `Claude Opus 4.6 (Thinking)`.

### Antigravity multiline prompt caveat

Agy treats literal newline paste differently from the tmux sandbox. Verified 2026-06-29: `tmux paste-buffer` of a multiline prompt into Agy split the prompt into separate queued messages, causing the first incomplete line to run before the rest of the prompt. This is not Opus-only; Gemini 3.5 Flash and Gemini 3.1 Pro showed the same per-line `HandleUserInput` logging, though the symptom can look different depending on model latency and whether queued lines auto-flush before the first response completes.

Preferred Agy prompt delivery:

```bash
# ordinary follow-up: compact to one line, then send literally
prompt="$(tr '\n' ' ' < /tmp/direct-job.prompt.txt)"
tmux send-keys -t "$JOB:0.$pane" -l "$prompt"
tmux send-keys -t "$JOB:0.$pane" Enter

# fresh lane needing exact multiline initial prompt: interactive, not print/headless
agy --model "Claude Opus 4.6 (Thinking)" --dangerously-skip-permissions --prompt-interactive "$(cat /tmp/direct-job.prompt.txt)"
```

Do not use `agy --print` / `agy -p` as the default workaround; that leaves the pane-first contract.

### Sandbox verification

This pattern was sandbox-tested on 2026-06-23:

- created one tmux session with three panes
- loaded one multiline prompt into a tmux buffer
- pasted the same buffer into all panes
- captured each pane's stdin to a file
- SHA-256 hashes for the shared prompt and all three pane captures matched

Conclusion: same-prompt fanout through `tmux load-buffer` / `tmux paste-buffer` is practical and avoids manual copy/paste drift. For Agy, use the multiline caveat above instead of raw `paste-buffer`.

## Known-good defaults

Use these defaults first. Only deviate when the user explicitly asks or a launch failure forces a narrower recovery path.

- Gemini model: `gemini-3.1-pro-preview`
- Cursor heavy review / deep reasoning model: `claude-opus-4-8-thinking-high`
- Cursor quick implementation / cleanup model: `composer-2.5-fast`
- Cursor balanced implementation model: `composer-2.5`
- Cursor fallback default model: `composer-2-fast` (the CLI account default as of 2026-05-19)
- Antigravity default/current model: `Gemini 3.5 Flash (High)`
- Antigravity stronger Gemini model: `Gemini 3.1 Pro (High)`
- Antigravity heavy review model: `Claude Opus 4.6 (Thinking)`
- Codex default/current model: `gpt-5.5`
- Codex coding-heavy model: `gpt-5.3-codex-high`
- Codex faster coding model: `gpt-5.3-codex-high-fast`
- Gemini launch style: interactive tmux lane with `--approval-mode yolo --skip-trust`, then send the prompt after readiness
- Cursor launch style: interactive tmux lane with `--yolo --approve-mcps`, then send the prompt after readiness
- Antigravity launch style: interactive tmux lane with `--dangerously-skip-permissions` and exact `--model` label when supported; verify the visible label, then send the prompt after readiness
- Codex launch style: interactive tmux lane with `--sandbox workspace-write --ask-for-approval never`, then send the prompt after readiness

### Model selection rule

- If `/direct-cli gemini ...` has no explicit model, ask the user to confirm `gemini-3.1-pro-preview` as the Gemini direct-lane model. This is the always-preferred Gemini default; use other Gemini models only when the user explicitly names one.
- If `/direct-cli cursor ...` has no explicit model, ask the user to choose from this curated set:
  1. `composer-2.5-fast` — recommended for ordinary Cursor direct-lane work: quick implementation, cleanup, narrow refactors, and follow-up fixes.
  2. `composer-2.5` — balanced reasoning when the task needs more than fast cleanup but not a full heavy review lane.
  3. `claude-opus-4-8-thinking-high` — high-stakes review, deep reasoning, or ambiguous architecture/debugging.
- Do not offer every model returned by Cursor CLI as the default picker; the picker is intentionally skill-defined.
- If `/direct-cli agy ...` has no explicit model, ask the user to choose from this curated set:
  1. `Gemini 3.5 Flash (High)` — recommended/current fast Antigravity lane.
  2. `Gemini 3.1 Pro (High)` — stronger Gemini reasoning.
  3. `Claude Opus 4.6 (Thinking)` — heavy reasoning/review.
- Do not offer every model returned by Antigravity `/model` as the default picker; the picker is intentionally skill-defined.
- If `/direct-cli codex ...` has no explicit model, ask the user to choose from this curated set:
  1. `gpt-5.5` — recommended/current Codex direct-lane default.
  2. `gpt-5.3-codex-high` — coding-heavy work, careful review, or deeper implementation.
  3. `gpt-5.3-codex-high-fast` — faster coding-focused follow-up.
- Do not offer every model returned by Codex as the default picker; validate availability with `codex --help`, `codex doctor`, or current Codex docs if a model fails.
- Antigravity CLI `1.0.13` has a verified `--model` flag; prefer exact labels like `--model "Claude Opus 4.6 (Thinking)"`, then verify the visible pane label. Use `/model` only as fallback if flag selection fails.
- If the user already specified a model explicitly, respect it after sanity-checking it against the task and known availability.
- Mention `composer-2-fast` only as a fallback if the preferred Composer 2.5 models fail or are unavailable.
- Use `agent --list-models` or `agent models` before changing Cursor model names; Cursor's list changes faster than this playbook.
- Gemini CLI had no confirmed `--list-models` equivalent in the checked local `0.43.0`; use known working model names or current Gemini CLI docs/package evidence before changing Gemini defaults.

## Current freshness checkpoints

These are evidence checkpoints from 2026-05-29; verify again when models or CLI behavior matter.

- Gemini CLI: local checked version was `0.43.0`; npm latest stable was `0.44.1`, with preview `0.45.0-preview.1`. Newer releases added session/context/MCP/routing/PTY fixes and Gemini 3.1 alias/thinking-config work. Keep `gemini-3.1-pro-preview` as the direct-lane default until the target machine verifies a newer accepted model name such as `gemini-3.1-pro`.
- Cursor CLI: local checked version was `2026.05.24-dda726e`; `agent models` showed `composer-2.5-fast` as default, `composer-2.5`, and Opus 4.8 variants. Use `claude-opus-4-8-thinking-high` for heavy review/deep reasoning.
- Antigravity CLI: local checked version was `1.0.13` on 2026-06-29. `agy models` listed the skill-defined labels, `--model "Claude Opus 4.6 (Thinking)"` launched the Opus pane, and `--prompt-interactive` preserved exact multiline initial prompts while keeping the session interactive.
- Codex CLI: local checked version was `0.134.0`; npm latest was `0.135.0`. `codex --help` exposed interactive `--image`, `--model`, `--sandbox`, `--ask-for-approval`, and `--search`; `codex exec` is explicitly non-interactive. `codex features list` showed `image_generation` stable/enabled. Source gates image generation on ChatGPT/Codex backend, provider image-generation capability, and model image input modality; generated images save as PNGs under `$CODEX_HOME/generated-images/<session>/<call_id>.png`.

## Gemini headless hard block

Gemini must never be run in headless mode from this skill.

Forbidden:

```bash
gemini -p "..."
gemini --prompt "..."
```

Required:

```bash
tmux new-session -d -s "gemini-task"
tmux send-keys -t gemini-task 'gemini -m "gemini-3.1-pro-preview" --approval-mode yolo --skip-trust' Enter
tmux capture-pane -p -t "gemini-task" -S -120
tmux send-keys -t gemini-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

Reason: headless Gemini bypasses the pane-first execution contract and is more likely to hit model-capacity / `429` failures. Recovery must stay interactive.

## Launch examples

These examples preserve the tmux-first launch shape used while refining this skill. Model availability changes quickly; validate with `agent --list-models`, `gemini --help`, `agy --help`, or `codex --help` if a command fails.

### Cursor interactive review lane

```bash
tmux new-session -d -s "cursor-task"
tmux send-keys -t cursor-task 'agent --model "claude-opus-4-8-thinking-high" --yolo --approve-mcps' Enter
tmux capture-pane -p -t "cursor-task" -S -120
tmux send-keys -t cursor-task 'Continue from the current worktree only. Do not restart from scratch. Scope: no files. Task: reply with exactly CURSOR_DIRECT_CLI_OK and then wait.' Enter
tmux capture-pane -p -t "cursor-task" -S -120
```

### Gemini interactive lane

```bash
tmux new-session -d -s "gemini-task"
tmux send-keys -t gemini-task 'gemini -m "gemini-3.1-pro-preview" --approval-mode yolo --skip-trust' Enter
tmux capture-pane -p -t "gemini-task" -S -120
tmux send-keys -t gemini-task 'Continue from the current worktree only. Do not restart from scratch. Scope: no files. Task: reply with exactly GEMINI_DIRECT_CLI_OK and then wait.' Enter
tmux capture-pane -p -t "gemini-task" -S -120
```

Observed result before trust prompt:

```text
GEMINI_DIRECT_CLI_OK
```

Gemini then surfaced a workspace trust prompt in the pane. That is expected and can be accepted in the interactive UI for the intended repo by either the agent or the user.

### Codex interactive lane

```bash
tmux new-session -d -s "codex-task"
tmux send-keys -t codex-task 'codex --model "gpt-5.5" --sandbox workspace-write --ask-for-approval never' Enter
tmux capture-pane -p -t "codex-task" -S -120
tmux send-keys -t codex-task 'Continue from the current worktree only. Do not restart from scratch. Scope: no files. Task: reply with exactly CODEX_DIRECT_CLI_OK and then wait.' Enter
tmux capture-pane -p -t "codex-task" -S -120
```

### Safe discovery examples

Use these when you need to validate local behavior rather than guessing:

```bash
agent --list-models
agent --help
gemini --help
agy --help
codex --help
codex features list
codex doctor
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
tmux send-keys -t gemini-task 'gemini -m "gemini-3.1-pro-preview" --approval-mode yolo --skip-trust' Enter
tmux capture-pane -p -t "gemini-task" -S -120
tmux send-keys -t gemini-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
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
tmux capture-pane -p -t gemini-task -S -120
tmux send-keys -t gemini-task "Continue from the current worktree only. Keep scope narrow. Finish only the pending change in <file>." Enter
```

Do not switch to `gemini -p` / `gemini --prompt` when Gemini thinks too long. Stay inside the interactive pane or start a fresh interactive pane.

### If Gemini session looks broken

If you see errors like API 400 function-call mismatch, abandon the old session and start a new one.

```bash
tmux kill-session -t gemini-task
tmux new-session -d -s "gemini-task-fresh"
tmux send-keys -t gemini-task-fresh 'gemini -m "gemini-3.1-pro-preview" --approval-mode yolo --skip-trust' Enter
tmux capture-pane -p -t gemini-task-fresh -S -120
tmux send-keys -t gemini-task-fresh 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

Allowed recovery actions:

1. `tmux send-keys -t <session> C-c`
2. send a shorter follow-up prompt in the same interactive pane
3. if still unhealthy, kill the session and start a fresh interactive lane

Forbidden recovery actions:

- switching to `gemini -p`
- switching to `gemini --prompt`
- using non-interactive Gemini execution to finish faster

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
tmux send-keys -t cursor-task 'agent --model "composer-2.5-fast" --yolo --approve-mcps' Enter
tmux capture-pane -p -t cursor-task -S -120
tmux send-keys -t cursor-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

For a balanced Composer pass:

```bash
tmux send-keys -t cursor-task 'agent --model "composer-2.5" --yolo --approve-mcps' Enter
tmux capture-pane -p -t cursor-task -S -120
tmux send-keys -t cursor-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

For a heavy review / deep reasoning pass:

```bash
tmux send-keys -t cursor-task 'agent --model "claude-opus-4-8-thinking-high" --yolo --approve-mcps' Enter
tmux capture-pane -p -t cursor-task -S -120
tmux send-keys -t cursor-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
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

## Antigravity CLI direct playbook

### Best for

- fast terminal-first agent experiments
- repo inspection and pre-release verification
- trying Antigravity subagents, MCP, skills, and slash-command behavior
- using Google Antigravity's shared agent harness without opening the full desktop UI

### Fresh session

Use the known-good Antigravity defaults first. Prefer exact `--model` labels when available, then verify the visible model label in the pane. Use `/model` TUI switching only as a fallback.

```bash
tmux new-session -d -s "agy-task"
tmux send-keys -t agy-task 'agy --model "Gemini 3.5 Flash (High)" --dangerously-skip-permissions' Enter
tmux capture-pane -p -t agy-task -S -120
tmux send-keys -t agy-task 'Continue from the current worktree only. Do not restart from scratch. Do not use local wrappers such as rtk; use raw repo commands only. <YOUR TASK HERE>' Enter
```

### Model selection

If a non-current Antigravity model is required, launch with the exact label first:

```bash
tmux new-session -d -s "agy-opus"
tmux send-keys -t agy-opus 'agy --model "Claude Opus 4.6 (Thinking)" --dangerously-skip-permissions' Enter
tmux capture-pane -p -t agy-opus -S -120
```

If the flag fails or the visible label is wrong, switch inside the pane before sending the task prompt:

```bash
tmux send-keys -t agy-task '/model' Enter
tmux capture-pane -p -t agy-task -S -120
```

Then choose one of the skill-defined labels in the TUI:

- `Gemini 3.5 Flash (High)` — current/default fast lane.
- `Gemini 3.1 Pro (High)` — stronger Gemini reasoning.
- `Claude Opus 4.6 (Thinking)` — heavy reasoning/review.

### Prompt template

```text
Continue from the current worktree only.
Do not restart from scratch.
Do not use local wrappers such as rtk; use raw repo commands only.

Scope:
- <file1>
- <file2>

Task:
<inspect / implement / verify>

Rules:
- keep changes minimal
- do not touch unrelated files
- report changed files and rationale
```

### Check current pane output

```bash
tmux capture-pane -p -t "agy-task" -S -120
```

---

## Codex CLI direct playbook

### Best for

- OpenAI-native coding and review passes
- implementation work that benefits from Codex shell/tool ergonomics
- image-aware inspection or asset tasks where image input/output can help
- checking Codex-specific plugins, MCP, app-server, or feature-flag behavior

### Fresh session

Use Codex interactively by default. Do not launch `codex exec` unless the user explicitly asks for script-style/headless output.

```bash
tmux new-session -d -s "codex-task"
tmux send-keys -t codex-task 'codex --model "gpt-5.5" --sandbox workspace-write --ask-for-approval never' Enter
tmux capture-pane -p -t codex-task -S -120
tmux send-keys -t codex-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

For a coding-heavy pass:

```bash
tmux send-keys -t codex-task 'codex --model "gpt-5.3-codex-high" --sandbox workspace-write --ask-for-approval never' Enter
tmux capture-pane -p -t codex-task -S -120
tmux send-keys -t codex-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

For a faster coding-focused pass:

```bash
tmux send-keys -t codex-task 'codex --model "gpt-5.3-codex-high-fast" --sandbox workspace-write --ask-for-approval never' Enter
tmux capture-pane -p -t codex-task -S -120
tmux send-keys -t codex-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

### Image capabilities

- Codex supports image input in the CLI through `--image <FILE>` for an initial prompt and through the interactive TUI's paste/attach image flow.
- Codex can generate images through the hosted `image_generation` tool when ChatGPT/Codex backend auth, provider capability, feature flags, and model image input support are all active.
- Generated images are saved as PNGs under `$CODEX_HOME/generated-images/<session>/<call_id>.png` by the Codex runtime.
- Do not treat image generation as a separate `codex image` command; it is an agent tool capability inside the session.

### Safety defaults

- Use `--sandbox workspace-write --ask-for-approval never` for direct-lane momentum without full sandbox bypass.
- Do not use `--dangerously-bypass-approvals-and-sandbox` by default.
- Do not use `codex exec` by default.
- Use `--search` only when the task needs live web search.

### Prompt template

```text
Continue from the current worktree only.
Do not restart from scratch.

Scope:
- <file1>
- <file2>

Task:
<implement / review / inspect / generate image>

Rules:
- keep changes minimal
- do not touch unrelated files
- report changed files, generated image paths, and rationale
```

### Check current pane output

```bash
tmux capture-pane -p -t "codex-task" -S -120
```

---

## Recommended combined flow

### Gemini first, Cursor second

1. Run Gemini CLI for the visual or UI-heavy pass.
2. Inspect the pane output and then inspect the diff.
3. Run Cursor CLI for refactor or cleanup on top of the resulting worktree.
4. Run verification locally.

This works well when Gemini is stronger at producing the initial UI direction, while Cursor is stronger at tightening code structure afterward.

### Antigravity as a verification or exploration lane

Use Antigravity CLI after implementation when you want another agent harness to inspect the repo, run raw verification commands, or test agent/subagent behavior. Keep prompts explicit about not using local wrappers such as `rtk` in user-facing snippets.

### Codex as coding or image-capable lane

Use Codex CLI when you want OpenAI's local coding agent directly in the pane, especially for implementation/review tasks or image-aware workflows. Keep image generation requests inside the interactive lane; do not switch to `codex exec` only because the task mentions images.

The default direct path is still interactive for all tools. Do not switch Cursor into headless `-p` mode unless the user explicitly asks for a script-style capture. Do not switch Gemini into headless `-p` / `--prompt` mode at all. Do not switch Antigravity into `agy -p` / `--print` / `--prompt` mode by default. Do not switch Codex into `codex exec` by default. Launch first, check readiness, then send the task prompt.

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
- prefer `--sandbox workspace-write --ask-for-approval never` for Codex direct runs
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
- create a fresh interactive tmux session
- resend a shorter prompt with narrower scope
- never recover by switching Gemini to `-p` / `--prompt`
- never recover by switching Codex to `codex exec` unless the user explicitly asked for headless/script output

### Prompt not actually submitted

Symptoms:

- text appears in the input box but Gemini, Cursor, Antigravity, or Codex has not entered thinking
- text you sent is still sitting in the inbox / input area

Mitigation:

- inspect the pane
- if the message still appears unsent in the inbox or input area, try pressing `Enter` once before assuming the session is stuck
- if needed, send `Enter` again explicitly
- if the prompt was not submitted, resend the real task prompt only after the pane is ready

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
tmux capture-pane -p -t "agy-task" -S -120
tmux capture-pane -p -t "codex-task" -S -120
```

Interrupt current task:

```bash
tmux send-keys -t gemini-task C-c
tmux send-keys -t cursor-task C-c
tmux send-keys -t agy-task C-c
tmux send-keys -t codex-task C-c
```

Kill session:

```bash
tmux kill-session -t gemini-task
tmux kill-session -t cursor-task
tmux kill-session -t agy-task
tmux kill-session -t codex-task
```

Create fresh session:

```bash
tmux new-session -d -s "gemini-task-fresh"
tmux new-session -d -s "cursor-task-fresh"
tmux new-session -d -s "agy-task-fresh"
tmux new-session -d -s "codex-task-fresh"
```

---

## Short operator checklist

Before launching Gemini:

1. Am I using tmux?
2. Am I launching without the task prompt inline?
3. Is `--approval-mode yolo` present?
4. Is the scope narrow and current-worktree-only?
5. Will I verify readiness with `tmux capture-pane` before `tmux send-keys`?

If any answer is no, do not launch Gemini yet.

Before launching Codex:

1. Am I using tmux?
2. Am I launching `codex`, not `codex exec`?
3. Am I avoiding `--dangerously-bypass-approvals-and-sandbox`?
4. Is `--sandbox workspace-write --ask-for-approval never` present unless the task needs stricter approvals?
5. Will I verify readiness with `tmux capture-pane` before `tmux send-keys`?

If any answer is no, do not launch Codex yet.

## Stuck lane checklist

When a direct CLI lane looks stuck:

1. Check the pane.
2. Decide whether it is thinking, blocked on approval, or unhealthy.
3. If unhealthy, abandon the old session.
4. Start a fresh interactive tmux session.
5. Confirm the launch is ready, then send a shorter, narrower prompt.
6. Confirm the new prompt was actually submitted.
7. Never switch Gemini to headless mode.
8. Keep Antigravity pane-first unless the user explicitly asks for print/headless output.
9. Keep Codex pane-first unless the user explicitly asks for `codex exec` or script/headless output.

The key rule is simple: **fresh session, narrow scope, pane-first truth**.
