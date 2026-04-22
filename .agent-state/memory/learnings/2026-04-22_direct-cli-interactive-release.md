# Lesson Learned: direct-cli interactive release

**Date**: 2026-04-22
**Tags**: direct-cli, tmux, cursor, gemini, trust-prompt, release, v0.1.16
**Slug**: direct-cli-interactive-release

## Insight
When a skill is meant to guide direct CLI execution, the strongest examples are not generic command templates. They are commands that were actually run in tmux on the current machine and observed to work. That changes the tone of the skill from aspirational guidance to operator-grade procedure.

## Evidence From This Session
- Cursor interactive lane worked with `agent --model "claude-opus-4-7-high" --yolo --approve-mcps ...` and returned `CURSOR_DIRECT_CLI_OK` in the pane.
- Gemini interactive lane worked with `gemini -m "gemini-3.1-pro-preview" --approval-mode yolo -i ...` and returned `GEMINI_DIRECT_CLI_OK`, then surfaced a workspace trust prompt.
- The trust prompt needed its own policy because it is not bypassed by yolo approval flags.

## Why It Matters
This gives `direct-cli` a better default posture: start from tested interactive examples, watch the pane, fall back to discovery only when a machine-specific uncertainty exists, and treat workspace trust as a normal gate instead of a failure. That makes the skill more reusable and lowers repeated operator hesitation.

## Reuse Rule
For future direct CLI skills or playbooks, prefer this order:
1. tested interactive example
2. pane verification
3. fallback discovery for missing models or uncertain flags
4. explicit trust-prompt handling
