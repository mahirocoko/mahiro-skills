---
name: gemini
description: Control Gemini via MQTT WebSocket. Use when Gemini tab automation or message sending is needed.
---

# /gemini - Smooth MQTT Control for Gemini

Control a Gemini browser tab by exact tab ID through the bundled Local Gemini Proxy and MQTT. Treat precision and response capture as runtime claims: run the health/capability checks before reporting success.

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
/gemini viral "fat cat"                   # Identity-first Gemini prompt-pack flow
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

When the user runs `/gemini viral ...`, use the identity-first direction logic in this section, then route the final prompt pack through Gemini when explicitly requested.

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

`/gemini viral` owns prompt-pack preparation and the explicit Gemini handoff described here. Do not route to an absent standalone command or claim broader production-browser orchestration that this skill does not provide.

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

This is the intended sequence, not proof of success. Require a successful runtime postcondition from the exact tab before reporting that Gemini responded.

## Requirements

1. The bundled **Local Gemini Proxy** from `$SKILL_DIR/extension/`, built from `background-src.js` and loaded as an unpacked extension. Its own `manifest.json` is the version owner; do not compare it with an unrelated upstream extension version.
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
| `deep-research.ts` | Fail-closed Deep Research-mode handoff |
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

**Note:** For YouTube learning and local note capture, use `/watch`.

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
bun full-smooth.ts
bun send-chat.ts "Your message"
bun youtube-transcribe.ts "https://youtube.com/..."
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

### `gem_submit_v1` — trusted-upload Custom Gem submit command

The current Studio path splits ownership deliberately: Mahiro Browser Control's Trusted build creates the exact inactive Gem tab and uploads the ordered hash-bound Product gallery files plus optional Creator file through its reviewed debugger/file-chooser contract; Local Gemini Proxy receives only the resulting tab/upload receipt plus metadata, routes the one-time attestation and trusted Send back to the receipt's exact `chrome.runtime.id` owner, then verifies the visible attachments, types the bounded message, sends once, and returns one attributable response. Never pin routing to only one unpacked Browser Control ID: standalone Browser Control and product-owned Affiliate Copilot builds have distinct path-derived IDs and separate `chrome.storage.local` owners. Routing remains fail-closed through an explicit reviewed allowlist of those two owners; an arbitrary syntactically valid extension ID is rejected before any cross-extension message. The only accepted Custom Gem bases are `https://gemini.google.com/gem/d6f1958dff66` and `https://gemini.google.com/gem/a217413102ab`; normalized requests and trusted receipts retain the matching extension owner, `gemId`, exact `gemUrl`, and exact base-page `currentUrl`.

Publish exactly one metadata-only request to `claude/browser/command` with:

- `action: "gem_submit_v1"` and `version: "custom-gem-browser-submit-command-v2"`;
- the same canonical UUID in `id` and `requestId`, an exact approved `gemUrl` with `gemUrl === currentUrl` at the base page (the normalized request derives its `gemId`), exact trusted-upload `tabId`, bounded `message`, `messageSha256`, `messageUtf8Bytes`, and `timeoutMs`;
- `requiredTerminalMarkers`: one to eight unique, non-empty strings with no surrounding whitespace or NUL, each at most 256 UTF-8 bytes and at most 1024 UTF-8 bytes in aggregate;
- one to five ordered metadata-only `sources` with role `product_gallery`, optionally followed by one `creator_image` (maximum six total); each has basename `filename`, `mimeType`, `bytes`, and `sha256`—never base64, raw bytes, or local paths;
- one `custom-gem-source-upload-result-v2` receipt identity (`browserControlExtensionId` + `commandId` + `receiptId`).

The extension requires the exact pre-uploaded tab and URL, the expected one-to-six visible `gem-media-attachment` tiles bound to Browser Control's trusted ordered Product-then-optional-Creator receipt (or legacy ordered filename markers), and one sender-ID-authenticated one-time attestation binding the request UUID, exact Browser Control extension owner, exact `gemId`/`gemUrl`/base `currentUrl`, message hash, receipt, and ordered source metadata. It fingerprints source count and order, terminal markers, and normalized base URL binding, then durably reserves the request in `chrome.storage.local` before consuming the attestation or attempting Send; altered in-flight or cross-target duplicates fail conflict, a restart with an incomplete reservation returns ambiguous, and old completed results compact to non-expiring no-resend tombstones. The bounded 10,000-request store fails closed instead of evicting tombstones. It then requires an empty composer and arms a tab-specific URL-change observer while the tab is still the exact base Gem URL. After one Send click, only a newly observed exact Gem conversation transition that reaches `complete` may receive the canonical-visible-message/one-response watcher. Attribution compares one normalized visible user query to the normalized supplied message (NBSP becomes space, whitespace collapses) while the command still binds the byte-exact request through `messageSha256`. Success also requires exactly one following model response before any next user message. Its text projection must remain byte-for-byte stable for at least 800 ms, contain every required terminal marker in the declared order, and remain at most 64 KiB. Once those conditions hold, an auxiliary image/tool child outside that text projection may remain busy; missing or reordered markers never make stable partial text terminal. Starting from a historic conversation URL or navigating elsewhere fails closed. It never uploads files in this command, never falls back to an active/first tab, never clicks Send again after navigation, and treats post-Send timeout/disconnect as ambiguous.

### `gem_recover_v1` — read-only exact-conversation recovery

Use `action: "gem_recover_v1"` with `version: "custom-gem-browser-recover-command-v1"` and exactly these fields: `id`, `action`, `version`, `requestId`, `gemUrl`, `conversationUrl`, `tabId`, `message`, `messageSha256`, `messageUtf8Bytes`, `requiredTerminalMarkers`, and `timeoutMs`. `id` and `requestId` must be the same canonical UUID; `gemUrl` must be one approved base, `conversationUrl` must be one exact conversation URL beneath that same Gem, and message, marker, tab, hash, byte-count, and timeout bounds are identical to `gem_submit_v1`.

Recovery requires the current explicit tab URL to equal `conversationUrl`; it never navigates, uploads, attests, clicks, sends, or reads/writes submit durable state. It finds exactly one user query whose canonical visible text equals the canonical supplied message (NBSP becomes space and whitespace collapses), while `messageSha256` binds the byte-exact request, then exactly one following model response before any next user query. The same 800 ms stability, ordered-marker, and 64 KiB text-projection gates apply. A timeout or attribution failure is `failed`, never `ambiguous`. Success is exactly `version: "custom-gem-browser-recovery-result-v1"` with `id`, `requestId`, `state: "succeeded"`, `gemId`, `gemUrl`, `currentUrl` equal to `conversationUrl`, `conversationUrl`, `tabId`, `messageSha256`, `requiredTerminalMarkers`, `rawResponse`, `responseSha256`, `responseUtf8Bytes`, and `recoveredAt`.

### `gem_followup_v1` — automatic successful-conversation follow-up

Use `action: "gem_followup_v1"` with `version: "custom-gem-browser-followup-command-v1"` to send an automatic follow-up message in an existing successful Custom Gem conversation.

Publish exactly one request to `claude/browser/command` with:

- `action: "gem_followup_v1"` and `version: "custom-gem-browser-followup-command-v1"`;
- the same canonical UUID in `id` and `requestId`;
- approved base `gemUrl` (`https://gemini.google.com/gem/d6f1958dff66` or `https://gemini.google.com/gem/a217413102ab`);
- exact `conversationUrl` and `currentUrl`, where `currentUrl === conversationUrl` and both represent the exact conversation child under `gemUrl`;
- exact `tabId` of the existing open tab (must not create or navigate tabs);
- bounded `message` (up to 8192 bytes, trimmed, no NUL), exact `messageSha256`, and `messageUtf8Bytes`;
- `requiredTerminalMarkers`: 1 to 8 unique, trimmed strings with no NUL, at most 256 UTF-8 bytes each and at most 1024 UTF-8 bytes in aggregate;
- `timeoutMs`: 30,000 to 360,000 ms;
- `authorizationReceipt`: object binding `version: "custom-gem-followup-authorization-result-v1"`, allowlisted `browserControlExtensionId`, `commandId` (safe ID string), and `receiptId` (64-character lowercase SHA-256).

The extension uses the existing tab only, verifies tab URL equals `conversationUrl`, reserves the durable request, verifies the one-time attestation via `CONSUME_CUSTOM_GEM_FOLLOWUP_ATTESTATION_V1`, ensures an empty composer with 0 attachments, writes and verifies the exact message, requests exactly one `TRUSTED_CUSTOM_GEM_FOLLOWUP_SEND_V1` click from Browser Control, and awaits exactly one attributable response with ordered terminal markers and 800 ms stable text.

Any uncertain outcome or disconnection after Send transitions to `state: "ambiguous"`, quarantines the tab, and is never retried automatically. Succeeded result is `version: "custom-gem-browser-revision-result-v1"` with `mode: "automatic_followup"`, `stage: "response_complete"`, exact conversation identity, message hash, required terminal markers, `rawResponse`, `responseSha256`, and `responseUtf8Bytes`.

### `gem_start_v1` — legacy standalone transactional command

Publish exactly one request to `claude/browser/command` with:

- `action: "gem_start_v1"` and `version: "custom-gem-browser-command-v1"`;
- canonical UUID `requestId`, exact `gemUrl` set to one of `https://gemini.google.com/gem/d6f1958dff66` or `https://gemini.google.com/gem/a217413102ab`, optional exact `tabId`, `message`, and `timeoutMs` in the inclusive 30s–360s range;
- one to five ordered `images` with role `product_gallery`, optionally followed by one `creator_image` (maximum six total). Each image must provide `filename`, `mimeType` (`image/jpeg|image/png|image/webp`), decoded raw-byte `bytes`, `sha256`, and canonical `base64`.

This legacy compatibility command still validates binary input, but it is not the current Studio upload path because Gemini's native file chooser requires Browser Control's Trusted owner. Do not use it as proof that unattended Studio upload works.

The extension enforces 3 MiB per image, 4 MiB total across all sources, 8192 UTF-8 message bytes, and a 64 KiB raw-response ceiling aligned with Studio import. It verifies decoded bytes, MIME signatures, and SHA-256 before tab work; uses only the explicit tab or creates one inactive exact-URL tab; never falls back to an active/first tab; and never logs the full command or base64. Per-tab/request locks and a request replay cache prevent duplicate execution. After Send, timeout/disconnect is `ambiguous`, the tab is quarantined, and the command is never resent automatically.

The submit result is `version: "custom-gem-browser-result-v1"` with the exact `requestId`, `state: "succeeded" | "failed" | "ambiguous"`, exact `gemId`, `gemUrl`, base-page `currentUrl`, the v1 `url` alias, `tabId`, `conversationUrl`, ordered source hashes/bytes, `messageSha256`, `requiredTerminalMarkers`, stage/error details, and success-only `responseSha256`, bounded `rawResponse`, and response UTF-8 byte count. The browser path is fail-closed: it requires stable composer/upload/send selectors, the expected one-to-six visible attachment tiles bound to Browser Control's trusted ordered Product-then-optional-Creator receipt (or legacy ordered filename markers), decoded visible attachment images, and a source-count-aware enabled Send interval (2 seconds for one or two sources, scaling to 8 seconds for six) before the single click. It then requires a response/message baseline and exactly one attributable marker-complete text projection stable for at least 800 ms. It returns no DOM, HTML, or unrelated page text.

After one reviewed local extension build is loaded, `reload_extension_v1` acknowledges on the local MQTT response topic and then calls `chrome.runtime.reload()`. This exists only to make later local development reloads automatable; never use it as proof that a new build loaded until a capability probe passes.

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
  text: 'Hello from the local client!'
});
// Observe the exact-tab response postcondition before reporting success.
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Commands timeout | Check topic names: `claude/browser/*` |
| Chat doesn't type | Rebuild/reload the bundled extension, then run `doctor.ts` and inspect the exact-tab state/tool checks |
| Tab not found | Use `list_tabs` to see available tabs |
| Extension offline | Open extension sidebar |

## Extension Source

Canonical source is bundled under `$SKILL_DIR/extension/`. `background-src.js` owns the service-worker source and `background.js` is generated by the repo build command.
