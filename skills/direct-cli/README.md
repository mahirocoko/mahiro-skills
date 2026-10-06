# direct-cli skill

`/direct-cli` is the packaged playbook for running Cursor CLI, Antigravity CLI, and Codex CLI directly through verified Orca or Herdr managed terminals with a portable tmux fallback.

It is for situations where you want to bypass the usual orchestration runtime but still keep good operator posture: narrow scope, current-worktree continuation, pane-first verification, launch first then send the task prompt, and fresh-session recovery when the lane looks unhealthy.

The default posture is explicit: `--backend auto` first selects Herdr from a healthy compatible managed pane, then Orca only when the invocation runs inside an exact live writable Orca terminal bound to the tracked current target, then tmux. Browser inspection is separately owned and does not determine the executor backend. `--backend orca`, `--backend herdr`, and `--backend tmux` are explicit fail-closed overrides. Launch interactively, verify readiness from the selected pane backend, then send the real prompt. Intended current-worktree lanes default to uninterrupted execution: Cursor `--yolo --approve-mcps --trust`, Antigravity `--dangerously-skip-permissions`, and Codex `--dangerously-bypass-approvals-and-sandbox`. These flags remove routine approval blocking; they do not authorize destructive or out-of-scope work. Opt down only when Mahiro explicitly requests a safe/read-only/sandboxed lane. Avoid Cursor, Antigravity, and Codex headless modes by default. Antigravity is the exception for exact multiline initial prompts: `agy --prompt-interactive "$(cat prompt.txt)"` keeps the pane interactive and avoids the known tmux multiline split; Herdr exact multiline delivery is still treated as unproven. Model catalogs can change independently of binary versions; use `agent models`, `agy models`, and `codex debug models` for current catalog truth, and use each CLI's help/doctor commands for flags and health.

For production-ish asset work, use `/asset-designer` as the front door; it routes Agy/Gemini dicut first and keeps Codex as an explicit fallback/A-B. Use `/direct-cli` only as the executor layer and `/codex-asset-production` for Codex source/imagegen or assigned fallback work.

For one job with several direct lanes, use one receipt-bound Orca terminal tab with splits, one Herdr job tab, or one tmux job session. The playbook supports **role fanout** (shared context, different lane roles) and **same-prompt fanout**. Tmux loads one prompt buffer and checks byte identity at the boundary. Herdr uses the packaged `prompt-fanout.py` to pass one UTF-8 prompt to every named agent, require a real activity transition, and only then wait for settled state; this avoids matching stale idle state immediately after dispatch. Orca direct fanout remains manual and receipt-bound until an equivalent byte-identity helper exists. For Agy specifically, use the playbook's multiline caveat instead of assuming any backend is lossless.

Multi-pane output collection is receipt-bound rather than recency-based. Keep each lane's exact output path or provider/result identity, never claim the newest file in a shared output directory as proof of lane ownership, and fail closed when the mapping is missing. This preserves multi-pane speed while preventing one lane from accidentally collecting a sibling's result.

Long Herdr work may use skill-level `--detach`. The callback-primary `herdr-jobs.py` stores exact parent/target receipts, separate task/dispatch hashes, a private mode-0600 message ledger, and bounded results under the local user state directory; `auto` selects callback only after exact parent-pane proof and otherwise preserves the watcher fallback. Callback dispatch appends one identical footer to every target. Named peers use metadata-only best-effort `agent.prompt`; the exact parent Letta pane uses one atomic metadata-only `pane.run` because Letta is not a named Herdr agent. Accepted delivery is never receipt/proof, and final reports complete only after the exact parent receives them. A detached receipt-revalidating lifecycle guard persists positive `working` evidence and requires a continuously stable `idle`/`done` window before it can emit one missing-callback warning; transient lifecycle labels reset confirmation. A separate one-shot silence deadline remains armed until acknowledgement and covers work that never settles or is not received. Neither path needs a controller Monitor. A wake is attention only: callback `recover` runs from the exact parent after completed dispatch and persisted working evidence, performs bounded synchronous output capture, then rechecks callback records plus receipt-bound status/sequence and defers terminalization while work is active, state changed, or a final callback already exists. Bodies come only from private files (8 KiB each, 200 messages per job); idempotency, ACL, receive acknowledgements, parent-visible audit, explicit retry, and all-target final reports are durable. `list`/`show`/`wait`/`collect` remain controller-side observation and collection; there is no tmux fallback, separate Letta process, automatic cancellation, pruning, or history replay.

Backend selection is deterministic and observable through the packaged `scripts/select-backend.sh`. Auto mode first requires Orca terminal/worktree/tab/pane markers, a ready connected runtime from `orca status --json`, an exact live writable non-orphaned caller receipt from `orca terminal show`, and a non-archived `orca worktree show` path matching the current `pwd -P`. If that fails, Herdr requires `HERDR_ENV=1`, a non-empty `HERDR_PANE_ID` resolving to a live pane, and a running compatible server. Live checks are bounded to five seconds by default and binary presence alone is not enough. Tmux is the final portable fallback. Once a backend creates state, direct-cli does not silently retry elsewhere.

Caller and target Orca worktrees are intentionally separate identities. If the main agent changes cwd from its host Orca worktree into another tracked Orca checkout, the caller receipt can remain in worktree A while the direct lane targets worktree B through exact `path:$TARGET_CWD`. The implementation must preserve both receipts rather than forcing their IDs to match or silently launching in A.

The Orca backend loads the installed version's `orca-cli` guide, creates a direct terminal against the explicit current `path:$TARGET_CWD`, records handle/worktree/incarnation identity, waits for TUI readiness, requires `turn_started` after prompt send, and reads the exact terminal before closeout. This is intentionally distinct from Orca's supervised orchestration runtime. Use the separate `orchestration` skill when the job needs task DAGs, ask/reply, durable `worker_done`, federation, or supervised cleanup. Direct-cli `--detach` remains Herdr-only.

Herdr topology creation is not shell readiness. After creating a tab or split, direct-cli submits and waits for an exact shell-ready marker, then checks that the shell is the only foreground process before `agent start`; this avoids the foreground-proven `agent_pane_busy` startup race.

The curated role-to-model mapping has one owner: `playbook.md`. This README and the command wrappers intentionally do not copy the model catalog. Before launch, intersect the current playbook choices with the live CLI catalog; if the requested/default route is unavailable, report that fact rather than reviving an older catalog entry.

`--effort` in `/direct-cli` is lane-aware. Pass it through natively to `agy --effort` only when that selected model supports the requested effort; otherwise stop rather than accepting Agy's silent fallback to its default model. Translate it to Codex `-c model_reasoning_effort=<level>`; for Cursor, choose an exact effort-bearing model ID or supported parameterized model expression. If effort is omitted, use the current role default from `playbook.md` after catalog verification; never turn on ultra implicitly.

## What this skill is for

Use it when you want AI to:

- open a fresh direct executor session
- keep work limited to the current worktree
- inspect Orca, Herdr, or tmux pane output as execution truth
- run receipt-bound Orca splits, multi-pane Herdr tabs, or tmux sessions with a lane registry and clear write policy
- recover cleanly from approval blocking, session corruption, or unsent prompts
- launch Cursor with `--yolo --approve-mcps --trust`, Antigravity with `--dangerously-skip-permissions`, and Codex with `--dangerously-bypass-approvals-and-sandbox`, then send the task prompt after readiness

## What this skill is not

- not a replacement for normal orchestration flows
- not an invitation to restart work from scratch
- not a generic Orca, Herdr, or tmux tutorial

## How to read the docs

- `SKILL.md` is the agent entrypoint and short operating summary
- `playbook.md` is the long-form operator manual and the single owner of curated model roles
- `playbook.md` also contains backend selection, Orca and Herdr lane lifecycles, and launch examples

## Recommended usage

```text
/direct-cli cursor "fresh session for current-worktree-only cleanup"
/direct-cli agy "pre-release verification pass"
/direct-cli codex "OpenAI-native implementation pass"
/direct-cli cursor --model <model> "reasoning pass"
/direct-cli agy --model <model> "inspect this repo"
/direct-cli codex --model <model> --effort <level> "image-aware coding pass"
/direct-cli cursor --backend orca --model <model> "Orca-native direct lane"
/direct-cli codex --backend herdr --model <model> --effort <level> "Herdr-native implementation lane"
/direct-cli cursor --backend tmux --model <model> "portable tmux lane"
/direct-cli "run same-prompt fanout across Codex and multiple Agy models"
/direct-cli recovery "the direct lane looks stuck"
```

## Working rule

Keep the executor lane narrow, current-worktree-only, pane-verified, and interactive. Select and announce the backend before creating anything, use its known-good launch commands in `playbook.md`, wait for pane readiness, then send the task prompt. If a lane becomes unhealthy, prefer a fresh container in the already-selected backend over heroic recovery.
