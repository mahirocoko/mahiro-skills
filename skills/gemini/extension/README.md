# Local Gemini Proxy Extension

Chrome/Firefox extension for controlling Gemini tabs via MQTT.

## Installation

### Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `extension/` folder
5. Click the extension icon to open the side panel and verify connection

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from this folder

## Requirements

- **Mosquitto** running with WebSocket enabled (port 9001)
- Start with: `brew services start mosquitto`

## Build

From the `mahiro-skills` repo root:

```bash
bun run gemini:build-extension
```

If you change `background-src.js`, rebuild `background.js` before reloading the unpacked extension.

## MQTT Topics

| Topic                     | Direction | Purpose              |
| ------------------------- | --------- | -------------------- |
| `claude/browser/command`  | → Ext     | Commands from Claude |
| `claude/browser/response` | ← Ext     | Command results      |
| `claude/browser/status`   | ← Ext     | Online/offline       |

## Commands

| Action         | Params             | Description                |
| -------------- | ------------------ | -------------------------- |
| `ping`         | —                  | Health check               |
| `list_tabs`    | —                  | List all Gemini tabs       |
| `list_flow_tabs` | —                | List all Google Flow tabs  |
| `list_tabs_all` | —                 | List Gemini + Flow tabs    |
| `create_tab`   | url?, mode?        | Open new Gemini tab        |
| `create_flow_tab` | url?, projectId? | Open new Google Flow tab  |
| `open_flow_project` | projectId, tabId? | Open/focus specific Flow project |
| `flow_current_project` | tabId?      | Read current Flow project ID |
| `flow_new_project` | tabId?         | Click New project in Flow  |
| `flow_select_tool` | tabId?, tool, projectId? | Select Flow tool (Create Image, Ingredients to Video, etc.) |
| `flow_configure_create_image` | tabId?, projectId?, aspectRatio?, outputsPerPrompt?, model? | Configure Create Image panel options |
| `flow_submit_prompt` | tabId?, prompt, projectId? | Legacy submit path in Flow composer (prefer `flow_type_prompt` + `flow_generate_image` for images) |
| `flow_simulate_image_to_video` | tabId?, imagePrompt, videoPrompt, projectId? | Simulate Create Image -> Ingredients to Video pipeline |
| `focus_tab`    | tabId              | Focus specific tab         |
| `close_tab`    | tabId              | Close tab                  |
| `get_url`      | tabId              | Get tab URL                |
| `get_text`     | tabId              | Extract page text          |
| `get_dom`      | tabId?, selector?, maxNodes?, includeHidden?, includeHtml?, maxTextLength?, maxHtmlLength? | Read structured DOM element snapshot |
| `get_html`     | tabId?, maxChars?  | Get page HTML (truncated)  |
| `get_state`    | tabId?             | Get Gemini page state      |
| `chat`         | tabId, text        | Send message to Gemini     |
| `inject_badge` | tabId, text?       | Show visual badge          |
| `select_model` | tabId, model       | Switch model (fast/pro/etc) |
| `list_tools`   | tabId?             | List Tools menu items + disabled state |
| `select_tool`  | tabId?, tool       | Activate a tool by name (e.g. create image) |
| `create_image` | tabId?, prompt     | Select Create image + send prompt |
| `create_with_tool` | tabId?, tool, prompt | Generic tool + prompt flow |

### New Flow UI Commands (Veo 3.1, Ingredients Mode)

| Action         | Params             | Description                           |
| -------------- | ------------------ | ------------------------------------- |
| `flow_select_video_tab` | tabId?, projectId? | Switch to Video tab in Flow |
| `flow_select_ingredients_mode` | tabId?, projectId? | Select Ingredients submode under Video controls |
| `flow_select_frames_mode` | tabId?, projectId? | Select Frames submode under Video controls |
| `flow_select_asset` | tabId, assetId, projectId?, slot?, assetIndex?, assetExactId? | Select asset from library by ID/title with optional deterministic disambiguation |
| `flow_select_latest_image_ingredient` | tabId?, projectId? | Select the latest generated image tile in Ingredients mode |
| `flow_set_model` | tabId, model, projectId? | Set video model (veo31-fast, veo31-quality, veo2-fast, veo2-quality) |
| `flow_set_multiplier` | tabId, multiplier, projectId? | Set generation count (x1, x2, x3, x4) |
| `flow_set_aspect_ratio` | tabId, ratio, projectId? | Set aspect ratio (landscape, portrait) |
| `flow_type_prompt` | tabId, text, projectId? | Type prompt in the input field |
| `flow_generate_image` | tabId?, projectId? | Click Create/Generate image (includes one retry and detection signal) |
| `flow_generate_video` | tabId?, projectId? | Close open settings menu, click send/create, and verify generation signal |
| `create_image` | tabId?, prompt     | Select Create image + send prompt |
| `create_with_tool` | tabId?, tool, prompt | Generic tool + prompt flow |

Notes:
- `tabId` is optional for most tab actions. If omitted, the extension targets the active Gemini tab first, then falls back to any open Gemini tab.
- The extension UI runs in the browser side panel (not popup) in Chromium-based browsers.
- The side panel has an **Account Target** switcher (`/u/0`, `/u/1`, custom). Open-tab and model actions use the selected account index.
- In Video mode, controls are applied in this order: `Video tab` -> `Frames/Ingredients submode` -> `ratio` -> `multiplier` -> `model`.

## Test

```bash
bun ../scripts/status.ts
```

## Mosquitto Config

`/opt/homebrew/etc/mosquitto/mosquitto.conf`:

```
allow_anonymous true

listener 1883

listener 9001
protocol websockets
```

Restart: `brew services restart mosquitto`

## Troubleshooting

- If you see `Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist`, reload the extension in `chrome://extensions` and reopen the side panel.
- If status stays disconnected, verify WebSocket broker on `ws://localhost:9001` and check extension background logs in DevTools.
