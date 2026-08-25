# direct-cli skill

`/direct-cli` is the packaged playbook for running Cursor CLI, Antigravity CLI, Codex CLI, and Pi directly through Herdr-managed panes with a portable tmux fallback. Natural requests such as `use Pi` or `ใช้ Pi` select the same Pi lane as `/direct-cli pi`.

It is for situations where you want to bypass the usual orchestration runtime but still keep good operator posture: narrow scope, current-worktree continuation, pane-first verification, launch first then send the task prompt, and fresh-session recovery when the lane looks unhealthy.

The default posture is now explicit: `--backend auto` selects Herdr only when the invocation already runs inside a healthy compatible Herdr pane; otherwise it uses tmux. `--backend herdr` and `--backend tmux` are explicit overrides. Launch interactively, verify readiness from the selected pane backend, then send the real prompt. Intended current-worktree lanes default to uninterrupted execution: Cursor `--yolo --approve-mcps --trust`, Antigravity `--dangerously-skip-permissions`, Codex `--dangerously-bypass-approvals-and-sandbox`, and Pi `--approve` with `read,bash,edit,write,grep,find,ls`. These flags remove routine approval blocking; they do not authorize destructive or out-of-scope work. Opt down only when Mahiro explicitly requests a safe/read-only/sandboxed lane. Avoid Cursor, Antigravity, Codex, and Pi headless modes by default. Antigravity is the exception for exact multiline initial prompts: `agy --prompt-interactive "$(cat prompt.txt)"` keeps the pane interactive and avoids the known tmux multiline split; Herdr exact multiline delivery is still treated as unproven. Model catalogs can change independently of binary versions; use `agent models`, `agy models`, `codex debug models`, and `pi --list-models` for current catalog truth, and use each CLI's help/doctor commands for flags and health.

Pi is deliberately bounded. The mahiro-skills Pi adapter installs skill trees only—it does not install Pi, create a PATH launcher, or configure a provider. The direct lane resolves `DIRECT_PI_COMMAND`, then `pi` on `PATH`, then Mahiro's isolated wrapper; it must verify the executable, live models, and every required launch flag before creating pane state. Use an explicit tool allowlist and never expose literal API keys. PATH presence alone does not prove a canonical binary because `pi` may resolve to a wrapper; use named Herdr lifecycle only when the target pane proves it will launch the same executable and provider environment that passed preflight.

For production-ish asset/imagegen work, use `/codex-asset-production` as the front door and `/direct-cli` as the executor layer. For sprite-like sheets, start from `/sprite-workflow` and use direct lanes only for scoped handoff/execution.

For one job with several direct lanes, use a single Herdr job tab or tmux job session with multiple panes. The playbook supports **role fanout** (shared context, different lane roles) and **same-prompt fanout**. Tmux loads one prompt buffer and checks byte identity at the boundary. Herdr uses the packaged `prompt-fanout.py` to pass one UTF-8 prompt to every named agent, require a real activity transition, and only then wait for settled state; this avoids matching stale idle state immediately after dispatch. For Agy specifically, use the playbook's multiline caveat instead of assuming either backend is lossless.

Long Herdr work may use skill-level `--detach`. The callback-primary `herdr-jobs.py` stores exact parent/target receipts, separate task/dispatch hashes, a private mode-0600 message ledger, and bounded results under the local user state directory; `auto` selects callback only after exact parent-pane proof and otherwise preserves the watcher fallback. Callback dispatch appends one identical footer to every target. Named peers use metadata-only best-effort `agent.prompt`; the exact parent Letta pane uses one atomic metadata-only `pane.run` because Letta is not a named Herdr agent. Accepted delivery is never receipt/proof, and final reports complete only after the exact parent receives them. Bodies come only from private files (8 KiB each, 200 messages per job); idempotency, ACL, receive acknowledgements, parent-visible audit (with explicit parent-only body inclusion), explicit retry, and all-target final reports are durable. A one-shot silence deadline wakes the parent without continuous monitoring; use `recover` to invoke the existing watcher when needed. `list`/`show`/`wait`/`collect` remain controller-side observation and collection; there is no tmux fallback, separate Letta process, automatic cancellation, pruning, or history replay.

Backend selection is deterministic and observable through the packaged `scripts/select-backend.sh`. Auto mode requires `HERDR_ENV=1`, a non-empty `HERDR_PANE_ID` that resolves to a live pane (including a retained move alias), and a running compatible server from `herdr status --json`; live status/pane calls are bounded to five seconds by default and binary presence alone is not enough. Auto requires tmux to exist before choosing the fallback and fails before mutation when neither backend works. Herdr integrations may improve state/session identity but are optional and are never installed automatically. Once a backend creates state, direct-cli does not silently retry in the other backend.

Herdr topology creation is not shell readiness. After creating a tab or split, direct-cli submits and waits for an exact shell-ready marker, then checks that the shell is the only foreground process before `agent start`; this avoids the foreground-proven `agent_pane_busy` startup race.

The curated role-to-model mapping has one owner: `playbook.md`. This README and the command wrappers intentionally do not copy the model catalog. Before launch, intersect the current playbook choices with the live CLI catalog; if the requested/default route is unavailable, report that fact rather than reviving an older catalog entry. For Pi, announce and use the model only when `--list-models` returns one configured choice; otherwise ask for provider/model.

`--effort` in `/direct-cli` is lane-aware. Pass it through natively to `agy --effort` only when that selected model supports the requested effort; otherwise stop rather than accepting Agy's silent fallback to its default model. Translate it to Codex `-c model_reasoning_effort=<level>`; for Cursor, choose an exact effort-bearing model ID or supported parameterized model expression. If effort is omitted, use the current role default from `playbook.md` after catalog verification; never turn on ultra implicitly.

## What this skill is for

Use it when you want AI to:

- open a fresh direct executor session
- keep work limited to the current worktree
- inspect Herdr or tmux pane output as execution truth
- run multi-pane Herdr tabs or tmux sessions with a lane registry, prompt fanout, and clear write policy
- recover cleanly from approval blocking, session corruption, or unsent prompts
- launch Cursor with `--yolo --approve-mcps --trust`, Antigravity with `--dangerously-skip-permissions`, and Codex with `--dangerously-bypass-approvals-and-sandbox`, then send the task prompt after readiness
- launch Pi interactively with `--approve` and the explicit autonomous implementation allowlist `read,bash,edit,write,grep,find,ls`, using named Herdr lifecycle only when the target pane proves it resolves the same executable/provider environment that passed preflight

## What this skill is not

- not a replacement for normal orchestration flows
- not an invitation to restart work from scratch
- not a generic Herdr or tmux tutorial

## How to read the docs

- `SKILL.md` is the agent entrypoint and short operating summary
- `playbook.md` is the long-form operator manual and the single owner of curated model roles
- `playbook.md` also contains backend selection, Herdr lane lifecycle, and launch examples

## Recommended usage

```text
/direct-cli cursor "fresh session for current-worktree-only cleanup"
/direct-cli agy "pre-release verification pass"
/direct-cli codex "OpenAI-native implementation pass"
/direct-cli pi "bounded Pi implementation pass"
/direct-cli pi --provider <provider> --model <model> "bounded Pi provider pass"
/direct-cli cursor --model <model> "reasoning pass"
/direct-cli agy --model <model> "inspect this repo"
/direct-cli codex --model <model> --effort <level> "image-aware coding pass"
/direct-cli codex --backend herdr --model <model> --effort <level> "Herdr-native implementation lane"
/direct-cli cursor --backend tmux --model <model> "portable tmux lane"
/direct-cli "run same-prompt fanout across Codex and multiple Agy models"
/direct-cli recovery "the direct lane looks stuck"
```

## Working rule

Keep the executor lane narrow, current-worktree-only, pane-verified, and interactive. Select and announce the backend before creating anything, use its known-good launch commands in `playbook.md`, wait for pane readiness, then send the task prompt. Pi `--detach` and Pi fanout remain unsupported in the initial contract because the packaged helpers require named Herdr-agent lifecycle. If a lane becomes unhealthy, prefer a fresh Herdr tab or tmux session over heroic recovery.
