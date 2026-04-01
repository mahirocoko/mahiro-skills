---
name: gemini
description: Control Gemini via MQTT WebSocket. Use when Gemini tab automation or message sending is needed.
---

# /gemini - Smooth MQTT Control for Gemini

Direct control of Gemini browser tab via MQTT WebSocket. **Tab precision works!**

For full identity-first video direction, prefer `/viral` as the primary workflow.
Use `/gemini viral` when you specifically want the Gemini-routed variant inside the Gemini toolchain.

`$SKILL_DIR` = the installed `gemini` skill directory for the current agent.

## Quick Start

```bash
/gemini chat "Hello Gemini!"              # Send to active Gemini tab
/gemini new "Your message"                # Create new tab + chat
/gemini transcribe <youtube-url>          # Transcribe YouTube video
/gemini research "topic"                  # Deep Research mode
/gemini model fast|thinking|pro           # Select model
/gemini image "prompt"                    # Create image via Gemini tool
/gemini music "prompt"                    # Create music via Gemini tool
/gemini guided "prompt"                   # Guided learning via Gemini tool
/gemini tool "canvas" "prompt"            # Generic tool runner
/gemini viral "fat cat"                   # Gemini-routed viral flow (use /viral for primary identity-first flow)
/gemini doctor                             # Health checks (mqtt/state/tools/chat)
/gemini canvas                            # Open Canvas mode
```

## Multi-Account Gemini (`/u/<index>`)

If you use multiple Google accounts, set target account index via env:

```bash
export GEMINI_ACCOUNT_INDEX=1
```

Scripts that open/find `/app` tabs will target `https://gemini.google.com/u/1/app` when this is set.

Per-command override is also supported in script flags:

```bash
bun "$SKILL_DIR/scripts/viral-video.ts" "fat cat host" --send --account 1
bun "$SKILL_DIR/scripts/deep-research.ts" --account 1 "topic"
bun "$SKILL_DIR/scripts/doctor.ts" --account 1
```

## Viral Director Mode (Interview-First, Gemini-Routed)

When user runs `/gemini viral ...`, mirror the same identity-first direction logic as `/viral`, then route final output through Gemini.

### Interaction Contract

1. Run in phases: `RESET GATE -> PHASE 0 -> PHASE 0.5 -> info request -> PHASE 1 -> PHASE 2`.
2. Ask the user to confirm choices at each phase before moving on.
3. Keep Thai script lines male voice ending with `ครับ`.
4. Keep Flow prompts in English and copy/paste ready.
5. Reuse the exact same `VISUAL DNA` text in every generated clip prompt.

### RESET GATE (Thai-first)

Ask these Thai-first selectors before Visual DNA so users can start from clean context:

- Clip direction: `story series | character comedy | mystery hook | edutainment`
- Visual style: `3d toon like pixar | realistic | anime | stylized custom`
- Character archetype: `hero | underdog | chaotic friend | silent observer | custom`
- Dialogue intensity: `heavy dialogue | balanced | minimal dialogue`

Close with one-line lock format:

`direction=<...>; style=<...>; character=<...>; dialogue=<...>`

### PHASE 0 (Visual DNA)

- Confirm you received the character concept/reference.
- Produce one `VISUAL DNA` paragraph in English that locks:
  - identity and face,
  - outfit and props,
  - environment,
  - lighting mood,
  - camera look and style.
- If uncertain, use soft certainty words: `appears`, `likely`, `seems`.

### PHASE 0.5 (Director Options)

Ask user to pick all of these before scripting:

- Goal: `Story | Series | Education | Announcement | Brand`
- Structure: `1 clip | 2 clips | 3 clips | 4 clips | custom`
- Visual style: `cinematic warm | clean studio | cozy lifestyle | neon`
- Dialogue mode: `full lip-sync | partial | no lip-sync` (default to dialogue-first)
- Comedy flavor: `soft funny | dry sarcasm | relatable pain | deadpan`
- Ending style: `cliffhanger | payoff | open loop | soft CTA (follow/save/share)`
- Series mode: `one-off | mini | standard | long | custom`

Close PHASE 0.5 with a compact selector instruction so user can answer in one line.

### Required Info (minimum only)

After options are chosen, ask only minimal fields by goal:

- Story: one-sentence premise + emotional/comedy tone
- Series: series premise + episode-1 conflict + recurring hook
- Education: topic + intended viewer outcome
- Announcement: announcement subject + key logistics
- Brand: brand/theme/emotion target

### PHASE 1 (Style Selection)

- Provide 3 style directions matched to selected goal.
- Each style includes one Thai hook line matching the character and director lock.
- Ask user to choose style `1/2/3`.

### PHASE 2 (Flow Production Pack)

Generate by selected structure:

- 1 clip: single full clip pack
- 2 clips: `HOOK` then `CLOSER`
- 3 clips: `HOOK`, `CORE`, `CLIFFHANGER/FOLLOW`
- 4 clips: `HOOK`, `PROOF/STORY`, `CORE`, `CLIFFHANGER/FOLLOW`
- custom: follow user clip/scene count

Each clip must include:

- Thai script (or on-screen text + SFX plan when no lip-sync)
- Tone
- Image prompt (English, copy/paste ready)
- Flow prompt (English, copy/paste ready) starting with the exact locked `VISUAL DNA`
- Optional spoken dialogue in quotes when voice direction is required (example: `"...ครับ"`)
- Negative prompt

### Series Rule

If series mode is not one-off, add:

- `SERIES BIBLE` (title, premise, voice, recurring gag, visual rules, CTA rule)
- `EPISODE MAP`
- Then output only EP1 unless user requests another episode.

### /gemini viral execution behavior

- First run the interview phases above.
- Only after user confirms lock + style, send final prompt pack to Gemini.
- If user says `Auto`, pick sensible defaults and still show a one-line `Director Lock` before generation.

### Auto Defaults (Story-First)

- Goal: `Story`
- Structure: `3 clips`
- Visual: `cinematic warm`
- Dialogue: `full lip-sync`
- Comedy flavor: `relatable pain`
- Ending: `cliffhanger`
- Series mode: `one-off`

### Non-sales Default Policy

- `/gemini viral` is story-first by default.
- Do not push product-selling angle unless user explicitly asks for ad/sell mode.
- Prefer retention mechanics: curiosity hook, tension, payoff or cliffhanger, continuation bait.

### Character-First Workflow (Core)

- For production generation, prefer this order by default:
  1) generate 4 character reference images,
  2) user selects one canonical `main ref`,
  3) generate videos using that same ref each clip.
- Prompt hygiene is mandatory:
  - never include metadata labels in generation prompt text (e.g. `Character reference 1 of 4:`),
  - include full base character DNA in every prompt (avoid shorthand-only references like `same exact cat identity` alone).

### Critical ID Mapping Rule (Flow)

- If user provides edit ID (`/edit/<uuid>`), resolve it against tile aliases and media name ID (`img src ?name=<uuid>`) before popup selection.
- Treat tile surfaces as linked aliases: `editId`, `nameId`, `fe_id_*` UUID.
- Always return explicit `selectionProof` and use it to verify deterministic selection.

If the user asks for full presenter identity studio and Flow production orchestration, route to `/viral` and keep `/gemini viral` as the Gemini-routed execution path.

## Slash Command Router

When user runs `/gemini ...`, route arguments as follows:

- `/gemini viral "<character concept>" [flags]`
  - Default execute (prompt-only): `bun "$SKILL_DIR/scripts/viral-video.ts" "<character concept>" [flags]`
  - If user explicitly asks to relay to Gemini chat, append `--send`.
  - If `--no-send` is present, remove `--send` from flags and run prompt-only.

Example:

```bash
/gemini viral "แมวอ้วนจอมอู้งาน"
/gemini viral "แมวอ้วนจอมอู้งาน" --type story --framework micro-drama
/gemini viral "แมวอ้วนจอมอู้งาน" --mode gem --type ad
```

## The Smooth Flow

```
create_tab → tabId → inject_badge → chat → GEMINI RESPONDS!
```

## Requirements

1. **Gemini Proxy Extension** v2.8.8+ (green badge = connected)
2. **Mosquitto broker** with dual listeners:
   - TCP port 1883 (for CLI/Bun scripts)
   - WebSocket port 9001 (for browser extension)
3. **Extension sidebar open** (click extension icon)
4. **Mosquitto CLI tools** for some helper scripts:
   - `mosquitto_pub`
   - `mosquitto_sub`

## Scripts

Located in `scripts/` under the installed `gemini` skill directory:

| Script | Purpose |
|--------|---------|
| `status.ts` | Show extension status + all tabs (like debug console) |
| `list-tabs.ts` | List all Gemini tabs with IDs |
| `deep-research.ts` | Deep Research automation |
| `send-chat.ts` | Send single chat message |
| `full-smooth.ts` | Complete flow demo |
| `youtube-transcribe.ts` | Transcribe YouTube video |
| `create-image.ts` | Activate Create image tool + send prompt |
| `use-tool.ts` | Generic tool runner (`create image/music/canvas/guided learning`) |
| `create-music.ts` | Activate Create music tool + send prompt |
| `canvas-prompt.ts` | Activate Canvas tool + send prompt |
| `guided-learning.ts` | Activate Guided learning tool + send prompt |
| `doctor.ts` | End-to-end health checks (`ping/state/tools/chat`) |
| `viral-video.ts` | Build viral/ad/story/how-to video prompt workflow (direct or GEM mode) |

**Note:** For YouTube learning, use `/watch` skill which includes Oracle integration.

**Runtime note:** `youtube-transcribe.ts` shells out to `mosquitto_pub` and `mosquitto_sub`, so those binaries must be installed and on `PATH`.

## Extension Build + Verify

From the `mahiro-skills` repo root:

```bash
bun run gemini:build-extension
bun run gemini:verify
```

- `gemini:build-extension` rebuilds `skills/gemini/extension/background.js`
- `gemini:verify` rebuilds the extension, then runs root typecheck and tests

If you edit `skills/gemini/extension/background-src.js`, rebuild before loading or reloading the unpacked extension.

### Run Scripts

```bash
cd "$SKILL_DIR/scripts"
node --experimental-strip-types full-smooth.ts
node --experimental-strip-types send-chat.ts "Your message"
node --experimental-strip-types youtube-transcribe.ts "https://youtube.com/..."
bun "$SKILL_DIR/scripts/create-image.ts" "minimal logo with teal accents"
bun "$SKILL_DIR/scripts/create-music.ts" "lofi ambient intro with warm synth"
bun "$SKILL_DIR/scripts/canvas-prompt.ts" "draft an architecture decision record"
bun "$SKILL_DIR/scripts/guided-learning.ts" "teach me MQTT retained messages"
bun "$SKILL_DIR/scripts/use-tool.ts" "create image" "poster with retro style"
bun "$SKILL_DIR/scripts/doctor.ts"
bun "$SKILL_DIR/scripts/viral-video.ts" "fat cat host" --type viral --mode direct
bun "$SKILL_DIR/scripts/viral-video.ts" "fat cat host" --mode gem --type ad
bun "$SKILL_DIR/scripts/viral-video.ts" "fat cat host" --type story --send
bun "$SKILL_DIR/scripts/viral-video.ts" "fat cat host" --framework micro-drama --count 5 --pretty
```

## Viral Video Copilot

Generate ready-to-use prompt packs for short-form video creation flow (Google downstream video generation).

```bash
bun "$SKILL_DIR/scripts/viral-video.ts" "character concept" [flags]

# Core flags
--mode direct|gem      # direct = send one-shot strategist prompt, gem = build reusable GEM instruction
--type viral|ad|story|howto
--framework auto|accidental-spokesperson|micro-drama|impossible-tutorial
--lang Thai
--duration 8
--platform "TikTok/Reels/Shorts"
--tone "funny, punchy, meme-friendly"
--audience "Gen Z + millennial social users"
--count 7              # number of concepts requested in prompt bundle
--pretty               # pretty-print JSON output bundle
--send                 # send prompt to Gemini tab via MQTT
--no-send              # force prompt-only output even if --send appears
--new                  # when used with --send, force new Gemini tab
```

`direct` mode produces a strict JSON prompt bundle that asks Gemini for ranked idea concepts + production pack with a deterministic schema.

Default short-clip duration for this workflow is **8 seconds** unless `--duration` is provided.

`gem` mode produces a strict JSON prompt bundle that asks Gemini to build a reusable GEM package (system instruction + starter prompts + first session prompt + schema).

## MQTT Topics

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `claude/browser/command` | → Extension | Send commands |
| `claude/browser/response` | ← Extension | Command results |
| `claude/browser/status` | ← Extension | Online/offline |

**IMPORTANT**: Topics are `claude/browser/*` NOT `claude-browser-proxy/*`!

## Commands

### Tab Management

```json
{"action": "create_tab"}
// → {tabId: 2127157543, success: true}

{"action": "list_tabs"}
// → {tabs: [...], count: 3}

{"action": "focus_tab", "tabId": 2127157543}
// → {success: true}

{"action": "inject_badge", "tabId": 2127157543, "text": "HELLO"}
// → {success: true, injected: true}
```

### Chat (with Tab Precision!)

```json
{
  "action": "chat",
  "tabId": 2127157543,
  "text": "Your message to Gemini"
}
```

### Get Data

```json
{"action": "get_url", "tabId": 123}     // {url, title}
{"action": "get_text", "tabId": 123}    // {text}
{"action": "get_state", "tabId": 123}   // {loading, responseCount, tool}
{"action": "get_dom", "tabId": 123, "selector": "main"} // {nodes:[...]} structured element snapshot
{"action": "get_html", "tabId": 123}    // {html} truncated page HTML
```

### Model Selection

```json
{"action": "select_model", "model": "thinking"}
// "fast", "pro", or "thinking"

{"action": "list_tools"}
// → {items:[{label, disabled, role}], count, gated}

{"action": "select_tool", "tool": "create image"}
// → activate a tool in Gemini composer

{"action": "create_image", "prompt": "..."}
// → select Create image tool + send prompt

{"action": "create_with_tool", "tool": "guided learning", "prompt": "..."}
// → generic tool runner for create image/music/canvas/guided learning
```

## Example: Full Smooth Flow

```typescript
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

// Helper function
async function send(action, params = {}) {
  return new Promise((resolve) => {
    const id = `${action}_${Date.now()}`;
    client.subscribe('claude/browser/response');
    client.on('message', (topic, msg) => {
      const data = JSON.parse(msg.toString());
      if (data.id === id) resolve(data);
    });
    client.publish('claude/browser/command',
      JSON.stringify({ id, action, ...params }));
  });
}

// The Flow
const tab = await send('create_tab');           // 1. Create tab
await new Promise(r => setTimeout(r, 4000));    // 2. Wait for load
await send('inject_badge', {                    // 3. Verify targeting
  tabId: tab.tabId,
  text: 'SMOOTH!'
});
await send('chat', {                            // 4. Send chat
  tabId: tab.tabId,
  text: 'Hello from Claude!'
});
// → Gemini responds!
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Commands timeout | Check topic names: `claude/browser/*` |
| Chat doesn't type | Extension needs v2.8.8+ |
| Tab not found | Use `list_tabs` to see available tabs |
| Extension offline | Open extension sidebar |

## Extension Source

`github.com/laris-co/claude-browser-proxy` (v2.8.8+)
