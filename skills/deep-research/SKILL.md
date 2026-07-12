---
name: deep-research
description: Deep research via Gemini. Use when the user asks for comprehensive analysis or source-backed research. Route a large corpus of live frontend/site/app UI references tied to a named frontend design decision to frontend-design instead.
alias: /gemini research
---

# /deep-research

**Alias for `/gemini research`** - Deep Research automation via Gemini.

Opens new tab, selects Deep Research mode, sends prompt, and starts research.

## Routing Boundary

Use `frontend-design`, not this skill, when the request combines all three: a large reference corpus, live frontend/site/app UIs as the units, and a named frontend design decision. Use `deep-research` for generic topics, broad source-backed synthesis, non-frontend corpora, or research without that design decision.

## Usage

```bash
/deep-research <topic>
```

## Examples

```bash
/deep-research compare yeast S-33 vs T-58
/deep-research best practices for brewing Belgian ales
/deep-research React Server Components vs traditional SSR
```

## Workflow

1. Create new Gemini tab
2. Select Deep Research mode (Tools → Deep Research)
3. Send research prompt
4. Click "Start research" button
5. Wait for results

## Script

The automation script handles the full flow:

```bash
bun "$SKILL_DIR/scripts/deep-research.ts" "<topic>"
```

`$SKILL_DIR` = the installed `deep-research` skill directory for the current agent. Do not hardcode a Claude-specific path.

## Requirements

- MQTT broker running (`mosquitto`)
- Claude Browser Proxy extension installed and connected (v2.9.39+)
- Gemini tab access

## MQTT Commands Used

| Step | Action | Command |
|------|--------|---------|
| 1 | New tab | `create_tab` with gemini.google.com |
| 2 | Select mode | `select_mode` → Deep Research |
| 3 | Send prompt | `chat` with research topic |
| 4 | Start | `clickText` → "Start research" |
