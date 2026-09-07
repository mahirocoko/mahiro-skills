---
description: Creates a new character/IP identity or preserves one human-selected character while adapting composition, crop, scale, posture, or target-surface fit through direct image references.
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

# /creating-character-ip

Execute the `creating-character-ip` skill with args: `$ARGUMENTS`

Use Explore only when no character has human approval. Use Adapt only with an
exact directly accessible human-selected image; never replace the source pixels
with a prose summary or chain one generated adaptation into the next.

**If you have a Skill tool available**: Use it directly with
`skill: "creating-character-ip"` instead of reading the file manually.

**Otherwise**: Resolve the installed `creating-character-ip/SKILL.md` under the
current agent's configured skills root, then follow ALL instructions in it. Do
not assume a source-checkout-relative `skills/...` path.
