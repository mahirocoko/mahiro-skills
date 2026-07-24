# Direct CLI Playbook

This playbook is for using Cursor CLI, Antigravity CLI (`agy`), and Codex CLI (`codex`) directly, without going through the usual orchestration runtime.

The intended model is simple:

- Mahiro Code / the main agent stays the conversation owner.
- Cursor CLI, Antigravity CLI, or Codex CLI acts as the direct executor.
- Herdr-managed panes are preferred when the invocation already runs inside a healthy compatible Herdr runtime; tmux remains the portable fallback.
- The selected backend's pane output is treated as the nearest source of execution truth.
- For production-ish asset/imagegen work, route through `codex-asset-production` first; direct-cli owns pane execution, not the asset workflow. For sprite-like sheets, route through `sprite-workflow` first.

## When to use direct CLI

Use this path when you want:

- a fresh executor session without wrapper state
- direct pane visibility into prompts, thinking, approval blocking, and errors
- narrow follow-up work on the current worktree

## Core operator rules

- Prefer a **fresh Herdr tab or tmux session** when an old job container looks unhealthy.
- Start with the known-good launch commands in this playbook. Do not burn the first step on discovery by default.
- Use `agent models`, `agy models`, and `codex debug models` for current catalogs. Use `agent --help`, `agy --help`, `codex --help`, `codex features list`, or `codex doctor` when launch flags, features, or local health need validation.
- Keep the lane **interactive in the selected pane backend**. Do not default to Cursor headless mode such as `agent -p`.
- Do not default to Antigravity headless/print mode such as `agy -p`, `agy --print`, or `agy --prompt` unless the user explicitly asks for script-style output.
- Do not default to Codex non-interactive mode such as `codex exec`; use it only when the user explicitly asks for script/headless output.
- Do not default to Codex `--dangerously-bypass-approvals-and-sandbox`; use workspace-write sandboxing by default.
- If the invocation is `/direct-cli cursor ...`, `/direct-cli agy ...`, or `/direct-cli codex ...` and the user did not specify a model, ask which skill-defined model to use before launching the lane.
- Do not dump the full CLI model list as the model picker. Use this playbook's curated model set; run CLI model listing only when the user asks, the named model fails, or availability is uncertain.
- Launch Cursor, Antigravity, and Codex in the selected backend with yolo approvals, but without the task prompt inline.
- Confirm readiness through Herdr's `agent start` plus pane/agent reads, or through `tmux capture-pane`, before sending the real task prompt.
- Remember that yolo approvals do not bypass workspace trust prompts. If the pane shows a trust prompt for the intended repo, accept it in the pane or hand it to the user to accept before sending the task prompt.
- Use **very narrow prompts** with explicit file scope.
- Tell the executor to **continue from the current worktree only**.
- Tell it to **not restart from scratch**.
- Verify that the prompt was actually submitted by checking pane output.
- Trust the selected backend's pane more than a high-level assumption.

## Backend contract

`/direct-cli` accepts `--backend auto|herdr|tmux`. Omission means `auto`.

### Selection rules

1. Parse an explicit backend before creating any lane.
2. `auto` selects Herdr only when all of these are true:
   - `herdr` is on `PATH`
   - `HERDR_ENV=1`
   - `HERDR_PANE_ID` is non-empty
   - `herdr status --json` reports `server.running: true` and `server.compatible: true`
   - `herdr pane get "$HERDR_PANE_ID"` resolves a live pane; Herdr may return a new public ID when the launch-time value is a retained move alias
3. If any Herdr auto check fails, select tmux only when tmux is on `PATH`; otherwise fail before creating state.
4. Explicit `herdr` fails clearly when its preflight fails; explicit `tmux` always keeps the historical tmux path.
5. Print the selected backend and why. Never create state in one backend and silently retry in the other.

Use the packaged executable selector rather than copying a weaker marker-only check. Resolve `DIRECT_CLI_SKILL_ROOT` as the directory containing the loaded `SKILL.md`, and pass the parsed skill argument directly:

```bash
REQUESTED_BACKEND="<parsed --backend value, or auto>"
backend_report="$(
  "$DIRECT_CLI_SKILL_ROOT/scripts/select-backend.sh" \
    --backend "$REQUESTED_BACKEND"
)" || exit $?
printf '%s\n' "$backend_report"
DIRECT_BACKEND="$(printf '%s\n' "$backend_report" | sed -n 's/^backend=//p')"
```

The selector validates both backend availability, Herdr status JSON, and a live pane binding. It prints the selected backend plus selection evidence. Do not use binary presence alone for `auto`; Herdr may be installed while the user works in an ordinary terminal. Do not hard-code protocol numbers. Herdr integrations are optional enhancements and must never be installed without explicit user approval because they edit other CLI configuration.

### Herdr lane lifecycle

One job maps to one `direct-<job-slug>` tab in the caller workspace by default. Pass direct-cli `--workspace ID` when the job should live in another existing workspace; do not guess from labels. Focus the new job tab before launching agents: this keeps the workflow visibly pane-first and lets Herdr observe interactive readiness instead of hiding the lane in an unseen background tab. Each direct executor maps to one named pane/agent. Parse IDs returned by Herdr; never predict them.

Agent names are session-wide, must be unique, and match `[a-z][a-z0-9_-]{0,31}`. Derive compact names from the full pane ID, then check the live agent list before launch. Pane titles remain the human-readable role labels.

```bash
JOB="direct-<job-slug>"
TARGET_CWD="$(pwd)"
# Set DIRECT_HERDR_WORKSPACE_ID from a parsed direct-cli --workspace ID.
TARGET_WORKSPACE_ID="${DIRECT_HERDR_WORKSPACE_ID:-${HERDR_WORKSPACE_ID:-}}"
[ -n "$TARGET_WORKSPACE_ID" ] || {
  echo "direct-cli: Herdr workspace id is required" >&2
  exit 1
}

tab_json="$(herdr tab create \
  --workspace "$TARGET_WORKSPACE_ID" \
  --cwd "$TARGET_CWD" \
  --label "$JOB" \
  --focus)"

TAB_ID="$(printf '%s' "$tab_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["tab"]["tab_id"])')"
ROOT_PANE="$(printf '%s' "$tab_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["root_pane"]["pane_id"])')"

PANE_HASH="$(python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest()[:16])' "$ROOT_PANE")"
CODEX_AGENT="d${PANE_HASH}c"

split_json="$(herdr pane split "$ROOT_PANE" \
  --direction right \
  --cwd "$TARGET_CWD" \
  --no-focus)"
REVIEW_PANE="$(printf '%s' "$split_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')"
REVIEW_HASH="$(python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest()[:16])' "$REVIEW_PANE")"
AGY_AGENT="d${REVIEW_HASH}a"

wait_for_herdr_shell() {
  pane_id="$1"
  marker="DIRECT_CLI_SHELL_READY_$(python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest()[:12])' "$pane_id")"

  herdr pane run "$pane_id" "echo $marker" >/dev/null || return 1
  herdr pane wait-output "$pane_id" \
    --regex "^${marker}\\r?$" \
    --source recent-unwrapped \
    --timeout 15000 >/dev/null || return 1

  attempt=0
  while [ "$attempt" -lt 50 ]; do
    attempt=$((attempt + 1))
    process_json="$(herdr pane process-info --pane "$pane_id")" || return 1
    if printf '%s' "$process_json" | python3 -c '
import json
import sys

info = json.load(sys.stdin)["result"]["process_info"]
shell_pid = info.get("shell_pid")
processes = info.get("foreground_processes") or []
raise SystemExit(0 if shell_pid and processes and all(item.get("pid") == shell_pid for item in processes) else 1)
'; then
      return 0
    fi
    sleep 0.1
  done
  return 1
}

if ! wait_for_herdr_shell "$ROOT_PANE" || ! wait_for_herdr_shell "$REVIEW_PANE"; then
  herdr tab close "$TAB_ID" >/dev/null
  echo "direct-cli: new Herdr pane shell did not become available" >&2
  exit 1
fi

if ! agent_list_json="$(herdr agent list)"; then
  herdr tab close "$TAB_ID" >/dev/null
  echo "direct-cli: failed to list active Herdr agents" >&2
  exit 1
fi

collision_status=0
printf '%s' "$agent_list_json" | python3 -c '
import json
import sys

requested = set(sys.argv[1:])
payload = json.load(sys.stdin)
agents = payload.get("result", {}).get("agents")
if not isinstance(agents, list):
    raise SystemExit(2)
active = {agent.get("name") for agent in agents}
raise SystemExit(0 if requested.isdisjoint(active) else 1)
' "$CODEX_AGENT" "$AGY_AGENT" || collision_status=$?

if [ "$collision_status" -eq 1 ]; then
  herdr tab close "$TAB_ID" >/dev/null
  echo "direct-cli: derived Herdr agent name is already active; create a fresh job tab and derive new names" >&2
  exit 1
elif [ "$collision_status" -ne 0 ]; then
  herdr tab close "$TAB_ID" >/dev/null
  echo "direct-cli: Herdr agent list returned an invalid response" >&2
  exit 1
fi
```

Use `agent start` for ordinary Cursor/Agy/Codex launches because it names the lane and waits for interactive readiness:

```bash
herdr agent start "$CODEX_AGENT" --kind codex --pane "$ROOT_PANE" -- \
  --model gpt-5.6-sol \
  -c model_reasoning_effort=high \
  --sandbox workspace-write \
  --ask-for-approval never

herdr agent start "$AGY_AGENT" --kind agy --pane "$REVIEW_PANE" -- \
  --model claude-opus-4-6-thinking \
  --dangerously-skip-permissions
```

Then use agent names as stable lane targets:

```bash
herdr agent read "$CODEX_AGENT" --source recent-unwrapped --lines 120
herdr agent prompt "$CODEX_AGENT" 'Continue from the current worktree only. <TASK>'
herdr agent wait "$CODEX_AGENT" --until idle --until done --until blocked --timeout 120000
herdr agent send-keys "$CODEX_AGENT" ctrl+c
```

The shell-readiness gate above is required even though `tab create` and `pane split` already returned IDs. Those commands create topology before a login shell and its startup hooks are necessarily idle; skipping the marker/process gate can fail immediately with `agent_pane_busy`.

`agent wait` is lifecycle evidence, while `agent read` remains execution evidence. If agent detection cannot become ready, report that concrete blocker; do not silently migrate the job to tmux after the tab exists. Use `herdr pane run` and `pane read` only when a shell-shaped launch is required.

If `agent start` still reports `agent_name_taken` because another process won the race after the preflight, close the new job tab and retry with fresh pane-derived names in Herdr. Do not switch backends.

For a fresh exact multiline Agy prompt, preserve the existing `agy --prompt-interactive "$(cat prompt.txt)"` path through `herdr pane run`; Herdr multiline prompt behavior is not yet foreground-proven. Ordinary Agy follow-ups should remain one line.

Cleanup is explicit and destructive to the executor process:

```bash
herdr agent send-keys "$CODEX_AGENT" ctrl+c
herdr agent send-keys "$AGY_AGENT" ctrl+c
herdr tab close "$TAB_ID"
```

Do not close a job tab merely because one lane finishes; inspect every registered lane first.

### tmux fallback lifecycle

The existing tmux launch, fanout, capture, recovery, and cleanup commands below remain authoritative when `DIRECT_BACKEND=tmux`. Running inside Herdr with `--backend tmux` intentionally creates a nested multiplexer; expect Herdr to see the foreground process as `tmux`, not the agents inside it.

## Multi-pane job sessions

Use a multi-pane job session when one job benefits from several direct lanes at once, such as Codex for image generation, Antigravity with Opus for critique, Cursor for alternatives, and Codex or Cursor for implementation cleanup.

The goal is one job, one Herdr tab or tmux session, many panes — not scattered containers that lose the shared context.

### When to use

- The user wants several model opinions on the same question.
- The job has multiple independent roles: imagegen, design critique, implementation, verification, or risk review.
- You want multiple Codex imagegen lanes for independent source candidates or source/dicut/QA role fanout in one asset job.
- The same worktree/context should stay visible while lanes differ by CLI/model.
- The user asks for several Cursor/Codex/Agy lanes at once for independent implementation, review, or verification.

### Job naming and lane registry

For Herdr, use the tab and pane IDs returned by the lifecycle above. For tmux, name the session for the job:

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
| 0 | `implement` | Codex/Cursor | scoped implementation or generation | write only to assigned files/output dir |
| 1 | `review` | Agy/Cursor | critique / risks / alternatives | read-only / notes |
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

For Herdr, use the packaged helper. It avoids shell quoting drift and command-substitution removal of trailing newlines, records each agent's baseline sequence, dispatches the same prompt, waits for a real activity transition, and only then waits for settled state:

```bash
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/prompt-fanout.py" \
  --prompt-file "$PROMPT_FILE" \
  "$AGENT_A" "$AGENT_B" "$AGENT_C"
```

This proves byte-identical input at the Herdr CLI argument boundary. It does not prove model receipt or response equality. A naive `agent prompt` followed immediately by `agent wait` is unsafe because `agent wait` can match the old idle state before work starts. If the helper reports no activity transition, inspect the named pane and submit one Enter only when the prompt is visibly unsent; this foreground recovery was required for Cursor Fable during the 2026-07-24 three-model review. Capture each lane independently before synthesis.

### Detached Herdr jobs

Detached mode lets the main agent return control after dispatch while a local watcher owns completion capture. It is not a callback into the current Letta conversation and does not make the direct CLI agent headless: Cursor/Agy/Codex remain interactive in visible Herdr panes.

Use it only after topology, shell readiness, agent naming, launch, and visible model verification are complete:

```bash
JOB_ID="review-$(date +%Y%m%d-%H%M%S)"
PROMPT_FILE="/tmp/$JOB_ID.prompt.txt"
cat > "$PROMPT_FILE" <<'PROMPT'
<ONE JOB PROMPT>
PROMPT

python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" start \
  --job-id "$JOB_ID" \
  --prompt-file "$PROMPT_FILE" \
  --cwd "$TARGET_CWD" \
  --tab-id "$TAB_ID" \
  "$AGENT_A" "$AGENT_B"
```

The helper performs these controller-owned steps:

1. Validate the job ID and named agents, then query each baseline `state_change_seq` before creating durable job state.
2. Create a mode-0700 job directory and mode-0600 `job.json`, `prompt.txt`, watcher log, and result files.
3. Dispatch the exact prompt to each named Herdr agent with a bounded client-side call; local summaries and notifications never embed prompt text.
4. Spawn a detached watcher and return immediately with the job ID and directory.
5. Require a real activity transition, then run settled waits concurrently.
6. Capture bounded `recent-unwrapped` output and atomically record `done`, `attention`, or `error`.
7. Send only a generic best-effort macOS notification containing job ID and terminal status; prompt, result, and failure-summary content stays in local files.

Default state root:

```text
$XDG_STATE_HOME/mahiro-skills/direct-cli/jobs
~/.local/state/mahiro-skills/direct-cli/jobs  # when XDG_STATE_HOME is unset
```

Use `DIRECT_CLI_STATE_DIR` or `--state-dir` for an explicit local root. The helper never prunes or deletes jobs automatically.

At the start of the next direct-cli turn, inspect durable state before launching duplicate work:

```bash
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" list
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" list --json
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" show "$JOB_ID"
python3 "$DIRECT_CLI_SKILL_ROOT/scripts/herdr-jobs.py" collect "$JOB_ID"
```

`collect` prints captured results and records `collectedAt`; use `--no-mark` for read-only inspection. `attention` is intentionally terminal for Phase 1: inspect the named pane for an unsent prompt, provider/account warning, or model fallback. Submit one Enter only when the prompt is visibly unsent; otherwise resolve the provider/model blocker and use a new job ID for a deliberate retry. `error` preserves the failure summary and watcher log. `list`, `show`, and `collect` also verify the recorded watcher PID plus command identity; an interrupted or reboot-lost watcher becomes a terminal collectible error instead of staying `watching` forever. A Herdr restart, unavailable agent, hung bounded call, or failed result capture does not silently retry or switch to tmux.

Reject detached mode when tmux is selected. Phase 1 has no automatic cross-conversation injection, restart/replay controller, cancellation, pruning, or synthesis. Those require a Letta-aware controller rather than a shell watcher.

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
| 0 | `codex-source-a` | Codex `gpt-5.6-sol` high | imagegen/source candidate A | write only to `generated-images/codex/source-a/` or Codex generated-images |
| 1 | `codex-source-b` | Codex `gpt-5.6-sol` high | imagegen/source candidate B | write only to `generated-images/codex/source-b/` or Codex generated-images |
| 2 | `codex-dicut` | Codex `gpt-5.6-terra` high | cutout/cleanup/QA after source chosen | write only to `generated-images/codex/dicut/` |
| 3 | `review` | Agy/Cursor | critique / visual risks | read-only / notes |

- Put all panes in one `direct-<asset-job>` Herdr tab or tmux session.
- Use same-prompt fanout for independent visual diversity: exact same source prompt, separate output folders, no lane sees another lane before responding.
- Use role fanout for pipeline speed: `codex-source-a`, `codex-source-b`, `codex-dicut`, `codex-qa`, and optional `agy-review`.
- Record each pane's output folder and collect Codex generated PNGs from `$CODEX_HOME/generated-images/<session>/<call_id>.png` when the lane leaves images there.
- The main agent compares source candidates, picks winners, assigns cleanup/dicut, inspects actual output files, and promotes only accepted assets to canonical paths.

### Antigravity multi-model notes

Current local Antigravity (verified 2026-07-24, `agy 1.1.6`) supports stable model slugs through `--model` and native reasoning selection through `--effort`. Pass effort only when the selected model supports it, then verify the visible model and effort in the pane. Agy can warn and silently fall back to its default model when a model/effort pair is invalid; treat that as launch failure. Fall back to `/model` or `/effort` only if flag selection fails.

For several Agy models in one job:

1. Open one Agy pane per model.
2. Launch `agy --model "<stable-slug>" --dangerously-skip-permissions` in each pane; add `--effort <level>` only when that model supports the requested effort.
3. Verify the visible model and effort, or switch through `/model` and `/effort` if automated flag selection is brittle.
4. Only then send either the role-specific prompt or the same shared prompt.

Current foreground-verified choices are `claude-opus-4-6-thinking` for heavy review, `claude-sonnet-4-6` for balanced work, and `gemini-3.6-flash-high` for a faster lane. Keep `gemini-3.6-flash-medium`, then `gemini-3.5-flash-medium`, as fast fallbacks. Although `agy models` lists `gemini-3.1-pro-high`, a foreground launch reported it was no longer available, so it is excluded from the curated picker.

### Antigravity multiline prompt caveat

Agy treats literal newline paste differently from the tmux sandbox. Verified 2026-06-29: `tmux paste-buffer` of a multiline prompt into Agy split the prompt into separate queued messages, causing the first incomplete line to run before the rest of the prompt. Exact multiline delivery through Herdr is not yet foreground-proven. Use the safe prompt delivery patterns below instead of assuming either backend is lossless.

Preferred Agy prompt delivery:

```bash
# ordinary follow-up: compact to one line, then send literally
prompt="$(tr '\n' ' ' < /tmp/direct-job.prompt.txt)"
tmux send-keys -t "$JOB:0.$pane" -l "$prompt"
tmux send-keys -t "$JOB:0.$pane" Enter

# Herdr ordinary follow-up: still keep Agy input on one line
herdr agent prompt agy-review "$prompt"

# fresh lane needing exact multiline initial prompt: interactive, not print/headless
agy --model claude-opus-4-6-thinking --dangerously-skip-permissions --prompt-interactive "$(cat /tmp/direct-job.prompt.txt)"
```

For Herdr, run the exact multiline initial command through `herdr pane run <pane-id> '<shell command>'`, then inspect with `pane read`; this shell-shaped exception does not get `agent start` readiness, so detection and visible model verification remain mandatory. Do not use `agy --print` / `agy -p` as the default workaround; that leaves the pane-first contract.

### Sandbox verification

This pattern was sandbox-tested on 2026-06-23:

- created one tmux session with three panes
- loaded one multiline prompt into a tmux buffer
- pasted the same buffer into all panes
- captured each pane's stdin to a file
- SHA-256 hashes for the shared prompt and all three pane captures matched

Conclusion: same-prompt fanout through `tmux load-buffer` / `tmux paste-buffer` is practical and avoids manual copy/paste drift. For Agy, use the multiline caveat above instead of raw `paste-buffer`.

Herdr backend capability was checked locally on 2026-07-24 with `herdr 0.7.5`: the managed pane exported the Herdr markers, `herdr status --json` reported a running compatible server, and the stable CLI exposed the tab/pane/agent methods used above for Cursor, Agy, and Codex. This is a capability baseline, not a hard-coded protocol or evergreen version promise; every invocation still runs preflight.

## Known-good defaults

Use these defaults first. Only deviate when the user explicitly asks or a launch failure forces a narrower recovery path.

- Cursor quick implementation / cleanup model: `composer-2.5-fast`
- Cursor balanced implementation model: `composer-2.5`
- Cursor Fable 5 reasoning model: `claude-fable-5-thinking-high`
- Cursor Fable 5 extra-high reasoning model: `claude-fable-5-thinking-xhigh`
- Cursor heavy Opus review model: `claude-opus-4-8-thinking-high`
- Cursor newer Sonnet candidate: `claude-sonnet-5-thinking-high` (explicit opt-in until direct-lane use proves it should replace a default)
- Cursor fallback legacy default model: `composer-2-fast` (only if preferred models fail)
- Antigravity heavy review model: `claude-opus-4-6-thinking`
- Antigravity balanced model: `claude-sonnet-4-6`
- Antigravity fast model: `gemini-3.6-flash-high` (`gemini-3.6-flash-medium`, then `gemini-3.5-flash-medium` fallback)
- Codex flagship model/effort: `gpt-5.6-sol` + `high`
- Codex balanced everyday model/effort: `gpt-5.6-terra` + `medium`
- Codex fast/cost-efficient model/effort: `gpt-5.6-luna` + `medium`
- Codex automatic-delegation model/effort: `gpt-5.6-sol` + `ultra` for large parallelizable jobs
- Codex specialized ultra-fast model/effort: `gpt-5.3-codex-spark` + `high`
- Codex fallback choice: `gpt-5.5`
- Cursor launch style: interactive selected-backend lane with `--yolo --approve-mcps`, then send the prompt after readiness
- Antigravity launch style: interactive selected-backend lane with `--dangerously-skip-permissions` and an exact stable `--model` slug; verify the visible model and reject fallback warnings before sending the prompt
- Codex launch style: interactive selected-backend lane with `--sandbox workspace-write --ask-for-approval never`, then send the prompt after readiness

### Model selection rule

- If `/direct-cli cursor ...` has no explicit model, ask the user to choose from this curated set:
  1. `composer-2.5-fast` — recommended for ordinary Cursor direct-lane work: quick implementation, cleanup, narrow refactors, and follow-up fixes.
  2. `composer-2.5` — balanced reasoning when the task needs more than fast cleanup but not a full heavy review lane.
  3. `claude-fable-5-thinking-high` — Fable 5 reasoning lane; use this when Mahiro says “Fable 5” unless he asks for another Fable variant.
  4. `claude-fable-5-thinking-xhigh` — Fable 5 extra-high lane for heavier review.
  5. `claude-opus-4-8-thinking-high` — Opus heavy review / deep reasoning lane.
  6. `claude-sonnet-5-thinking-high` — newer Sonnet candidate; offer explicitly but do not silently replace the proven defaults.
- Do not offer every model returned by Cursor CLI as the default picker; the picker is intentionally skill-defined. Display names like “Fable 5” are not safe `--model` values; launch with the exact model ID.
- If `/direct-cli agy ...` has no explicit model, ask the user to choose from this curated set:
  1. `claude-opus-4-6-thinking` — recommended heavy reasoning/review lane; do not add `--effort high` because this slug does not support effort selection.
  2. `claude-sonnet-4-6` — balanced reasoning lane.
  3. `gemini-3.6-flash-high` — faster scoped lane; fall back to `gemini-3.6-flash-medium`, then `gemini-3.5-flash-medium`, only if High fails.
- Do not offer every model returned by Antigravity `/model` as the default picker; the picker is intentionally skill-defined.
- If `/direct-cli codex ...` has no explicit model, ask the user to choose from this curated set:
  1. `gpt-5.6-sol` + `high` — recommended flagship direct lane for complex coding, research, and polished deliverables.
  2. `gpt-5.6-terra` + `medium` — balanced everyday coding and follow-up work.
  3. `gpt-5.6-luna` + `medium` — fast/cost-efficient scoped work.
  4. `gpt-5.6-sol` + `ultra` — automatic task delegation for large jobs with real parallel workstreams.
  5. `gpt-5.3-codex-spark` + `high` — specialized ultra-fast lane for small, bounded coding or commit work.
- Keep the model slug and reasoning effort separate. Launch with `--model "<slug>" -c 'model_reasoning_effort="<effort>"'`; do not invent model IDs such as `gpt-5.6-sol-high`.
- Sol and Terra currently expose low, medium, high, extra-high (`xhigh`), max, and ultra. Luna exposes low through max and must not be launched with ultra.
- `/direct-cli --effort <level>` is a lane-aware routing argument. Pass it through as native `agy --effort <level>` only when the selected Agy model supports it; otherwise stop instead of accepting a silent default-model fallback. Translate it to Codex `-c model_reasoning_effort=<level>` because Codex has no native `--effort`; for Cursor, choose an exact effort-bearing ID or supported parameterized model expression. When a recognized GPT-5.6 Codex model is explicit but effort is omitted, use Sol high, Terra medium, or Luna medium. Never infer ultra without an explicit request or delegated judgment for a truly parallelizable job.
- Do not offer every model returned by Codex as the default picker; validate availability with `codex debug models`, `codex --help`, or `codex doctor` if a model fails.
- Antigravity CLI `1.1.6` has verified `--model` and `--effort` flags, but effort support is model-specific. Prefer the exact stable slug from `agy models`, then verify the visible pane model/effort and reject fallback warnings. Use `/model` or `/effort` only as fallback if flag selection fails.
- If the user already specified a model explicitly, respect it after sanity-checking it against the task and known availability.
- Mention `composer-2-fast` only as a fallback if the preferred Composer 2.5 models fail or are unavailable.
- Model catalogs can change independently of binary versions. Use `agent models`, `agy models`, and `codex debug models` before changing model names or when a preferred launch fails.

## Current freshness checkpoints

These are evidence checkpoints; verify again when models or CLI behavior matter.

- Cursor CLI: local version updated from `2026.07.17-3e2a980` to `2026.07.20-8cc9c0b` on 2026-07-22 and matches the official installer. The help diff adds `--endpoint` / `CURSOR_API_ENDPOINT`, and `--trust` is no longer documented as headless-only. `agent models` still exposes Composer 2.5, Fable 5, Sonnet 5, Opus 4.8, GPT-5.6 Sol/Terra/Luna, and other families. Catalog labels advertise 1M for Fable/Sonnet/Opus/GPT-5.6, while `agent about` for the active Fable session still reports `Fable 5 300K High`; effective context remains session-dependent until a fresh launch proves otherwise. If Mahiro says “Fable 5”, use `claude-fable-5-thinking-high`, not the display shorthand.
- Antigravity CLI: local `1.1.6` was verified on 2026-07-24. Earlier interactive tmux launches proved both `gemini-3.6-flash-high` and `gemini-3.6-flash-medium`; a Herdr-native smoke also proved explicit `gemini-3.5-flash-high`, the correct visible model, `agent prompt --wait`, Done lifecycle, and exact response. Mahiro selected 3.6 High as the curated fast default; 3.6 Medium and then `gemini-3.5-flash-medium` remain ordered automatic fallbacks, while explicit 3.5 High requests are supported. Earlier proof for `claude-opus-4-6-thinking` and `claude-sonnet-4-6` remains valid. Adding `--effort high` to Opus has a known silent-fallback risk, and catalog-listed `gemini-3.1-pro-high` previously reported it was no longer available. The 2026-06-29 `--prompt-interactive` evidence remains the safe multiline path because raw multiline paste has not been re-tested on 1.1.6.
- Codex CLI: local and npm stable updated from `0.144.6` to `0.145.0` on 2026-07-22. The release adds paginated thread history, broader Cursor/Claude import, audio/realtime support, and stable-but-opt-in multi-agent V2, plus long-conversation rendering, MCP startup/auth, and approval-safety fixes. The direct-lane flags remain valid. `codex debug models` still lists Sol/Terra/Luna/GPT-5.5/Spark: Sol/Terra expose low through ultra, Luna low through max, Spark low through xhigh, and context remains 272,000 for Sol/Terra/Luna/GPT-5.5 versus 128,000 for Spark. `image_generation`, `multi_agent`, and `fast_mode` remain stable/enabled; `multi_agent_v2` is stable and disabled by default. Generated images remain under `$CODEX_HOME/generated-images/<session>/<call_id>.png`.

## Launch examples

These examples preserve the tmux-first launch shape used while refining this skill. Model availability changes quickly; validate with `agent models`, `agy models`, or `codex debug models` if a model fails, and use each CLI's help/doctor surface for flag or health failures.

### Cursor interactive review lane

```bash
tmux new-session -d -s "cursor-task"
tmux send-keys -t cursor-task 'agent --model "claude-fable-5-thinking-high" --yolo --approve-mcps' Enter
tmux capture-pane -p -t "cursor-task" -S -120
tmux send-keys -t cursor-task 'Continue from the current worktree only. Do not restart from scratch. Scope: no files. Task: reply with exactly CURSOR_DIRECT_CLI_OK and then wait.' Enter
tmux capture-pane -p -t "cursor-task" -S -120
```

### Codex interactive lane

```bash
tmux new-session -d -s "codex-task"
tmux send-keys -t codex-task 'codex --model "gpt-5.6-sol" -c model_reasoning_effort=high --sandbox workspace-write --ask-for-approval never' Enter
tmux capture-pane -p -t "codex-task" -S -120
tmux send-keys -t codex-task 'Continue from the current worktree only. Do not restart from scratch. Scope: no files. Task: reply with exactly CODEX_DIRECT_CLI_OK and then wait.' Enter
tmux capture-pane -p -t "codex-task" -S -120
```

### Safe discovery examples

Use these when you need to validate local behavior rather than guessing:

```bash
agent --list-models
agent models
agent --help
agy models
agy --help
codex debug models
codex --help
codex features list
codex doctor
```

---

## Cursor CLI direct playbook

### Best for

- refactoring after another implementation pass
- code cleanup
- structure tightening
- logic-heavy follow-up work

### Fresh session

Use the known-good Cursor defaults first. If the model or flags are in doubt on this machine, validate with `agent models`, `agent --list-models`, or `agent --help` before changing the launch shape. Cursor wants exact model IDs for `--model`; display shorthands like “Fable 5” can fail or select unexpectedly.

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

For a Fable 5 reasoning pass (use this when Mahiro says “Fable 5”):

```bash
tmux send-keys -t cursor-task 'agent --model "claude-fable-5-thinking-high" --yolo --approve-mcps' Enter
tmux capture-pane -p -t cursor-task -S -120
tmux send-keys -t cursor-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

For a heavier Fable 5 pass:

```bash
tmux send-keys -t cursor-task 'agent --model "claude-fable-5-thinking-xhigh" --yolo --approve-mcps' Enter
tmux capture-pane -p -t cursor-task -S -120
tmux send-keys -t cursor-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

For an Opus heavy review / deep reasoning pass:

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

Use the known-good Antigravity defaults first. Prefer exact stable `--model` slugs and add native `--effort` only for models that support it, then verify the visible model/effort and reject fallback warnings. Use `/model` or `/effort` TUI switching only as a fallback.

```bash
tmux new-session -d -s "agy-task"
tmux send-keys -t agy-task 'agy --model claude-opus-4-6-thinking --dangerously-skip-permissions' Enter
tmux capture-pane -p -t agy-task -S -120
tmux send-keys -t agy-task 'Continue from the current worktree only. Do not restart from scratch. Do not use local wrappers such as rtk; use raw repo commands only. <YOUR TASK HERE>' Enter
```

### Model selection

If a non-current Antigravity model is required, launch with its exact stable slug first and add effort only when supported:

```bash
tmux new-session -d -s "agy-opus"
tmux send-keys -t agy-opus 'agy --model claude-opus-4-6-thinking --dangerously-skip-permissions' Enter
tmux capture-pane -p -t agy-opus -S -120
```

If the flag fails or the visible label is wrong, switch inside the pane before sending the task prompt:

```bash
tmux send-keys -t agy-task '/model' Enter
tmux capture-pane -p -t agy-task -S -120
```

Then choose the skill-defined model/effort in the TUI:

- `claude-opus-4-6-thinking` — heavy reasoning/review; no separate effort flag.
- `claude-sonnet-4-6` — balanced reasoning.
- `gemini-3.6-flash-high` — faster scoped lane; use `gemini-3.6-flash-medium`, then `gemini-3.5-flash-medium`, only as fallbacks.

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
tmux send-keys -t codex-task 'codex --model "gpt-5.6-sol" -c model_reasoning_effort=high --sandbox workspace-write --ask-for-approval never' Enter
tmux capture-pane -p -t codex-task -S -120
tmux send-keys -t codex-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

For a balanced everyday pass:

```bash
tmux send-keys -t codex-task 'codex --model "gpt-5.6-terra" -c model_reasoning_effort=medium --sandbox workspace-write --ask-for-approval never' Enter
tmux capture-pane -p -t codex-task -S -120
tmux send-keys -t codex-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

For a fast/cost-efficient pass:

```bash
tmux send-keys -t codex-task 'codex --model "gpt-5.6-luna" -c model_reasoning_effort=medium --sandbox workspace-write --ask-for-approval never' Enter
tmux capture-pane -p -t codex-task -S -120
tmux send-keys -t codex-task 'Continue from the current worktree only. Do not restart from scratch. <YOUR TASK HERE>' Enter
```

For a large parallelizable job with automatic task delegation:

```bash
tmux send-keys -t codex-task 'codex --model "gpt-5.6-sol" -c model_reasoning_effort=ultra --sandbox workspace-write --ask-for-approval never' Enter
tmux capture-pane -p -t codex-task -S -120
tmux send-keys -t codex-task 'Continue from the current worktree only. Do not restart from scratch. Split independent workstreams when useful, then synthesize and verify the result. <YOUR TASK HERE>' Enter
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

### Cursor first, Codex or Agy second

1. Run Cursor CLI for scoped implementation, cleanup, or reasoning.
2. Inspect the pane output and then inspect the diff.
3. Run Codex or Antigravity for review, verification, or an alternative lane when useful.
4. Run verification locally.

### Antigravity as a verification or exploration lane

Use Antigravity CLI after implementation when you want another agent harness to inspect the repo, run raw verification commands, or test agent/subagent behavior. Keep prompts explicit about not using local wrappers such as `rtk` in user-facing snippets.

### Codex as coding or image-capable lane

Use Codex CLI when you want OpenAI's local coding agent directly in the pane, especially for implementation/review tasks or image-aware workflows. Keep image generation requests inside the interactive lane; do not switch to `codex exec` only because the task mentions images.

The default direct path is still interactive for all tools. Do not switch Cursor into headless `-p` mode unless the user explicitly asks for a script-style capture. Do not switch Antigravity into `agy -p` / `--print` / `--prompt` mode by default. Do not switch Codex into `codex exec` by default. Launch first, check readiness, then send the task prompt.

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

- prefer `--yolo --approve-mcps` for Cursor direct runs
- prefer `--sandbox workspace-write --ask-for-approval never` for Codex direct runs
- inspect pane output directly before assuming the executor is still progressing normally

### Workspace trust prompt

Symptoms:

- the CLI launches, but local project agents or commands are skipped because the folder is not yet trusted
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
- create a fresh Herdr job tab when `DIRECT_BACKEND=herdr`, or a fresh tmux session when `DIRECT_BACKEND=tmux`
- resend a shorter prompt with narrower scope
- never recover by switching Codex to `codex exec` unless the user explicitly asked for headless/script output

### Prompt not actually submitted

Symptoms:

- text appears in the input box but Cursor, Antigravity, or Codex has not entered thinking
- text you sent is still sitting in the inbox / input area

Mitigation:

- inspect the pane
- if the message still appears unsent in the inbox or input area, send `enter` once through `herdr agent send-keys <target> enter` or the matching tmux pane before assuming the session is stuck
- if needed, send `Enter` again explicitly
- if the prompt was not submitted, resend the real task prompt only after the pane is ready

---

## Minimal backend command cheatsheet

Herdr jobs:

```bash
herdr agent read <target> --source recent-unwrapped --lines 120
herdr agent send-keys <target> ctrl+c
herdr agent wait <target> --until idle --until done --until blocked --timeout 120000
herdr tab close <tab-id>
```

Tmux fallback:

List sessions:

```bash
tmux list-sessions
```

Capture pane output:

```bash
tmux capture-pane -p -t "cursor-task" -S -120
tmux capture-pane -p -t "agy-task" -S -120
tmux capture-pane -p -t "codex-task" -S -120
```

Interrupt current task:

```bash
tmux send-keys -t cursor-task C-c
tmux send-keys -t agy-task C-c
tmux send-keys -t codex-task C-c
```

Kill session:

```bash
tmux kill-session -t cursor-task
tmux kill-session -t agy-task
tmux kill-session -t codex-task
```

Create fresh session:

```bash
tmux new-session -d -s "cursor-task-fresh"
tmux new-session -d -s "agy-task-fresh"
tmux new-session -d -s "codex-task-fresh"
```

---

## Short operator checklist

Before launching Codex:

1. Did the packaged selector choose and report a usable Herdr or tmux backend?
2. Am I launching `codex`, not `codex exec`?
3. Am I avoiding `--dangerously-bypass-approvals-and-sandbox`?
4. Is `--sandbox workspace-write --ask-for-approval never` present unless the task needs stricter approvals?
5. Will I verify readiness with `herdr agent start` plus `agent read`, or with `tmux capture-pane`, before prompting?

If any answer is no, do not launch Codex yet.

## Stuck lane checklist

When a direct CLI lane looks stuck:

1. Check the pane.
2. Decide whether it is thinking, blocked on approval, or unhealthy.
3. If unhealthy, abandon the old Herdr tab or tmux session without silently changing backends.
4. Start a fresh interactive job container in the already selected backend.
5. Confirm the launch is ready, then send a shorter, narrower prompt.
6. Confirm the new prompt was actually submitted.
7. Keep Antigravity pane-first unless the user explicitly asks for print/headless output.
8. Keep Codex pane-first unless the user explicitly asks for `codex exec` or script/headless output.

The key rule is simple: **fresh backend container, narrow scope, pane-first truth**.
