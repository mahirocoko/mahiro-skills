---
description: Coordinates Codex imagegen/source-art lanes and explicit Codex dicut fallback or A/B work for production-ish web/game assets. Use when the job needs Codex-generated source art, Codex-specific provenance, or a named fallback after Agy/Gemini dicut is unavailable or visibly weaker.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - WebFetch
---

# /codex-asset-production

Execute the `codex-asset-production` skill with args: `$ARGUMENTS`

**If you have a Skill tool available**: Use it directly with `skill: "codex-asset-production"` instead of reading the file manually.

**Otherwise**: Resolve the installed `codex-asset-production/SKILL.md` under the current agent's configured skills root, then follow ALL instructions in it. Do not assume a source-checkout-relative `skills/...` path.
