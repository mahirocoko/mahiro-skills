# direct-cli skill

`/direct-cli` is the packaged playbook for running Cursor CLI, Antigravity CLI, and Codex CLI directly through Herdr-managed panes with a portable tmux fallback.

It is for situations where you want to bypass the usual orchestration runtime but still keep good operator posture: narrow scope, current-worktree continuation, pane-first verification, launch first then send the task prompt, and fresh-session recovery when the lane looks unhealthy.

The default posture is now explicit: `--backend auto` selects Herdr only when the invocation already runs inside a healthy compatible Herdr pane; otherwise it uses tmux. `--backend herdr` and `--backend tmux` are explicit overrides. Launch with yolo-style approval flags, verify readiness from the selected pane backend, then send the real prompt. Avoid Cursor, Antigravity, and Codex headless mode by default. Antigravity is the exception for exact multiline initial prompts: `agy --prompt-interactive "$(cat prompt.txt)"` keeps the pane interactive and avoids the known tmux multiline split; Herdr exact multiline delivery is still treated as unproven. Model catalogs can change independently of binary versions; use `agent models`, `agy models`, and `codex debug models` for current catalog truth, and use each CLI's help/doctor commands for flags and health.

For production-ish asset/imagegen work, use `/codex-asset-production` as the front door and `/direct-cli` as the executor layer. For sprite-like sheets, start from `/sprite-workflow` and use direct lanes only for scoped handoff/execution.

For one job with several direct lanes, use a single Herdr job tab or tmux job session with multiple panes. The playbook supports **role fanout** (shared context, different lane roles) and **same-prompt fanout**. Tmux uses one byte-identical prompt pasted through a buffer and was sandbox-verified locally with matching SHA-256 hashes across three pane captures. Herdr uses the packaged `prompt-fanout.py` to pass one UTF-8 prompt to every named agent, require a real activity transition, and only then wait for settled state; this avoids matching stale idle state immediately after dispatch. For Agy specifically, use the playbook's multiline caveat instead of assuming either backend is lossless.

Long Herdr work may use skill-level `--detach`. The packaged `herdr-jobs.py` stores a private durable job record, exact prompt hash/copy, lifecycle baselines, watcher status, and bounded per-agent result captures under the local user state directory; it returns after bounded dispatch and sends a generic best-effort macOS completion notification containing only job ID and status. A later main-agent turn uses `list`, `show`, and `collect` to reconcile interrupted watchers, recover results, and synthesize them. This Phase 1 path is Herdr-only and deliberately does not inject messages into a Letta conversation, cancel agents, prune history, or silently fall back to tmux.

Backend selection is deterministic and observable through the packaged `scripts/select-backend.sh`. Auto mode requires `HERDR_ENV=1`, a non-empty `HERDR_PANE_ID` that resolves to a live pane (including a retained move alias), and a running compatible server from `herdr status --json`; live status/pane calls are bounded to five seconds by default and binary presence alone is not enough. Auto requires tmux to exist before choosing the fallback and fails before mutation when neither backend works. Herdr integrations may improve state/session identity but are optional and are never installed automatically. Once a backend creates state, direct-cli does not silently retry in the other backend.

Herdr topology creation is not shell readiness. After creating a tab or split, direct-cli submits and waits for an exact shell-ready marker, then checks that the shell is the only foreground process before `agent start`; this avoids the foreground-proven `agent_pane_busy` startup race.

Default models are explicit too: Cursor quick implementation / cleanup uses `composer-2.5-fast`; Cursor balanced implementation uses `composer-2.5`; Cursor Fable 5 reasoning uses `claude-fable-5-thinking-high`, with `claude-fable-5-thinking-xhigh` for heavier review; Cursor heavy Opus review uses `claude-opus-4-8-thinking-high`; newer `claude-sonnet-5-thinking-high` stays opt-in until direct-lane evidence justifies replacing a default. Antigravity uses foreground-verified stable slugs: `claude-opus-4-6-thinking` for heavy review, `claude-sonnet-4-6` for balanced work, and `gemini-3.6-flash-high` for faster work, with `gemini-3.6-flash-medium` then `gemini-3.5-flash-medium` as fallbacks. Codex uses `gpt-5.6-sol` with high reasoning for flagship work, `gpt-5.6-terra` medium for balanced work, `gpt-5.6-luna` medium for fast/cost-efficient work, `gpt-5.6-sol` ultra for large parallelizable work, and `gpt-5.3-codex-spark` high for specialized ultra-fast bounded work.

If a command-style invocation names the lane but not the model — for example `/direct-cli cursor ...`, `/direct-cli agy ...`, or `/direct-cli codex ...` — ask the user which skill-defined model/effort pair to use before launching. Do not present the full CLI model list unless the user requests it or a preferred model fails. For Cursor, offer Composer 2.5 Fast/Balanced, Fable 5 Thinking High/Extra High, Opus 4.8 Thinking High, and the opt-in Sonnet 5 candidate; for Antigravity, offer Opus 4.6, Sonnet 4.6, and Gemini 3.6 Flash High; for Codex, offer Sol high, Terra medium, Luna medium, Sol ultra, and Spark high. Launch Codex GPT-5.6 with separate model and effort config rather than encoding effort in the model slug.

`--effort` in `/direct-cli` is lane-aware. Pass it through natively to `agy --effort` only when that selected model supports the requested effort; otherwise stop rather than accepting Agy's silent fallback to its default model. Translate it to Codex `-c model_reasoning_effort=<level>`; for Cursor, choose an exact effort-bearing model ID or supported parameterized model expression. If effort is omitted for an explicit Codex GPT-5.6 model, default to Sol high, Terra medium, or Luna medium; never turn on ultra implicitly.

## What this skill is for

Use it when you want AI to:

- open a fresh direct executor session
- keep work limited to the current worktree
- inspect Herdr or tmux pane output as execution truth
- run multi-pane Herdr tabs or tmux sessions with a lane registry, prompt fanout, and clear write policy
- recover cleanly from approval blocking, session corruption, or unsent prompts
- launch Cursor with `--yolo --approve-mcps`, Antigravity with `--dangerously-skip-permissions`, and Codex with `--sandbox workspace-write --ask-for-approval never`, then send the task prompt after readiness

## What this skill is not

- not a replacement for normal orchestration flows
- not an invitation to restart work from scratch
- not a generic Herdr or tmux tutorial

## How to read the docs

- `SKILL.md` is the agent entrypoint and short operating summary
- `playbook.md` is the preserved long-form operator manual
- `playbook.md` also contains backend selection, Herdr lane lifecycle, preserved tmux launch examples, and current freshness notes

## Recommended usage

```text
/direct-cli cursor "fresh session for current-worktree-only cleanup"
/direct-cli agy "pre-release verification pass"
/direct-cli codex "OpenAI-native implementation pass"
/direct-cli cursor --model claude-fable-5-thinking-high "Fable 5 reasoning pass"
/direct-cli agy --model claude-opus-4-6-thinking "inspect this repo"
/direct-cli codex --model gpt-5.6-sol --effort high "image-aware coding pass"
/direct-cli codex --backend herdr --model gpt-5.6-sol --effort high "Herdr-native implementation lane"
/direct-cli cursor --backend tmux --model composer-2.5-fast "portable tmux lane"
/direct-cli "run same-prompt fanout across Codex and multiple Agy models"
/direct-cli recovery "the direct lane looks stuck"
```

## Working rule

Keep the executor lane narrow, current-worktree-only, pane-verified, and interactive. Select and announce the backend before creating anything, use its known-good launch commands in `playbook.md`, wait for pane readiness, then send the task prompt. If the lane becomes unhealthy, prefer a fresh Herdr tab or tmux session over heroic recovery.
