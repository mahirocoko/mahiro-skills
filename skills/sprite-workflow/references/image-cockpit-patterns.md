# Image Cockpit workflow patterns to borrow

Source analyzed: `dreiachse-cyber/image-cockpit-for-codex-workflows` (`src/App.tsx`, `server/index.ts`, README, smoke scripts).

Current pinned follow-up: `b997e78609773975a98617568818ac32f40cf1a7` (`v0.1.5`). The bundled prompt catalog includes all 107 app-visible examples: 101 Markdown-backed entries plus six legacy inline examples. Full MIT text and source locators ship with the skill.

## Core model

Image Cockpit does not treat sprite work as a single prompt. It builds a structured handoff job:

```json
{
  "workflowMode": "image-generate | image-edit | sprite-generate | sprite-edit | effect-animation",
  "prompt": "positive prompt / generated contract prompt",
  "negativePrompt": "avoid list",
  "jobNotes": "generation/edit notes and QA contract",
  "generationHints": { "seed": "", "size": "", "count": 1, "quality": "auto" },
  "selectedImage": { "name": "", "assetPath": "", "size": "", "source": "" },
  "annotationContext": { "annotations": [], "coordinateSpace": "canvas + normalized + pixel rectangles" },
  "spriteContext": { "action": "", "frames": 0, "grid": {}, "cell": {}, "chromaKey": "", "variant": "", "directions": [] },
  "effectContext": {},
  "tournament": { "id": "", "candidateIndex": 0, "candidateCount": 3, "hiddenOutbox": true },
  "returnTo": { "outboxDir": "", "expected": ["png", "webp", "gif", "json"] }
}
```

Portable lesson: preserve separate fields for positive prompt, negative prompt / avoid, notes, selected source, and strict context instead of collapsing everything into one text prompt.

## Pixel Art Generation

UI fields:

- Pixel Art Prompt → `prompt`
- Negative Prompt → `negativePrompt`
- Generation Notes → `jobNotes`
- Seed / size / count / quality → `generationHints`

Runner behavior:

- Use imagegen / built-in `image_gen` when available.
- Create a real raster image; never create procedural/SVG/canvas/diagram/placeholder output.
- If imagegen is unavailable or blocked, write a small blocker JSON sidecar instead of fake image output.
- Output final image files with the job id prefix.
- Keep QA/temp/contact/debug files out of the root outbox.

## Image Editing

UI fields:

- Edit Prompt → `prompt`
- Selected image → `selectedImage.assetPath`
- Avoid → `negativePrompt`
- Edit Notes → `jobNotes`
- Numbered regions → `annotationContext.annotations`

Runner contract:

- Inspect selected image first.
- Use numbered region comments plus normalized/pixel rectangles when present.
- Preserve original canvas size/aspect ratio.
- Keep full character visible; do not zoom/crop/reframe unless requested.
- Preserve transparency, or use a flat chroma fallback if needed.
- Change requested regions only when possible.

## Animation Generation

UI flow:

1. Selected source
2. Choose Motion
3. Generate
4. Download/preview

Motion presets include locked actions such as:

- `idle-breathing`
- `walk-cycle`
- `run-cycle`
- `basic-attack`
- `hurt-reaction`
- `death-downed`
- `spell-cast`
- `jump-hop`
- `guard-block`
- `victory-cheer`
- `interact-pickup`
- `ranged-attack`
- `skill-release`
- `knockback`
- `item-use`
- `talk`

Standard animation contract:

- 5 directions: `front`, `front three-quarter`, `side`, `back three-quarter`, `back`.
- 8 frames per direction.
- 256×256 cells by default.
- The app asks Codex to return **five separate direction images**, not one combined 5×8 sheet.
- Each direction image is 4 columns × 2 rows = 8 cells.
- Required file suffixes: `front`, `front-three-quarter`, `side`, `back-three-quarter`, `back`.
- Final manifest schema: `image-cockpit.direction-split-animation.v1`.

QA contract:

- One full-body character per cell.
- Same character identity, scale, head size, body proportions, outfit colors, props, pixel density.
- Stable character center and foot baseline within each direction.
- At least 24px inner padding when possible.
- No cropped head/feet/hands/equipment/effects.
- No body parts crossing cell borders.
- No duplicated heads or fragments below feet.
- Chroma key is flat and removable when transparency is unavailable.
- Static or nearly static rows fail even if direction/padding is correct.

Tournament behavior:

- Default candidate count is 3 (`MAX_ACTIVE_CODEX_JOBS=3`).
- Each candidate receives the same source/motion contract plus notes like “Generate this candidate independently”.
- Candidate outboxes are hidden under `.tournaments/<tournament-id>/<job-id>`.
- The app compares the first usable candidates after at least 2 are ready or all are terminal.
- Winner score roughly = quality rank + verified/stable bonuses - warning penalties.
- Winner is published to root outbox; remaining live runners are cancelled.

Portable lesson: for hard animation sprite jobs, run parallel bounded candidates, keep candidate outputs isolated, score/QA them, then promote only one winner.

The v0.1.5 publication path also preserves normalized `spriteContext.action` in direction-split/tournament winner manifests. Canonical manifests therefore keep action identity separate from runtime states and preserve it through promotion.

The release distinguishes 100 requested animation slots from 80 unique generated jobs because some artifacts intentionally serve multiple slots. Canonical batch rollups similarly report requested coverage, delivered slots, unique source IDs, and reuse rather than inflating output counts.

## Effect Animation

UI fields:

- Effect Type: category + subtype
- Sheet: frame count, canvas size, layout, loop, anchor, style, palette
- Prompt: Effect Prompt
- Avoid: Effect Avoid / Negative Prompt
- Notes: Effect Notes
- Preview background toggles: checker, dark, light, neutral

Effect categories:

- `slash-arc`: crescent, cross, spinning
- `hit-spark`: burst, metal, shield
- `magic-cast`: circle, runes, summon
- `projectile`: bolt, fireball, arrow-trail
- `impact`: explosion, dust, shockwave

Style options:

- `pixel-clean`
- `painterly-soft`
- `arcade-bold`
- `anime-flare`

Palette options:

- `cyan-white`
- `violet-gold`
- `ember-orange`
- `toxic-green`
- `mono-white`

Sheet options:

- frame counts: 4, 6, 8, 12, 16
- canvas sizes: 64, 96, 128, 192, 256
- layouts: `grid-4x2`, `horizontal-strip`, `grid-4x4`
- loop modes: `one-shot`, `loop`, `ping-pong-loop`
- anchors: `center`, `bottom-center`, `caster-hand`, `projectile-center`, `impact-ground`

Effect output contract:

- Return one transparent PNG sprite sheet.
- No checkerboard, solid matte, preview grid, UI panels, labels, frame numbers, text, logos, watermarks, arrows, or border guides baked into the output.
- Every populated frame must show temporal progression.
- Include metadata JSON and GIF preview when feasible.
- Preview backgrounds (checker/dark/light/neutral) are review modes only, not generation backgrounds.

## Runner prompt lessons

- Tell the worker to trust the job JSON and avoid broad repo audits.
- Tell it exactly where to write final results.
- Keep staging/QA/debug artifacts away from root outbox.
- Prefer blocker sidecars over fake images when capability is missing.
- For parallel candidates, never blindly copy the newest generated image; isolate artifacts per job or record timestamps/paths per invocation.

## Pair with asset cleanup

Use `asset-cleanup.md` after generation when Image Cockpit-style outputs return checkerboard, matte, chroma spill, oversized sheets, or candidate artifacts that need runtime-safe cleanup and QA previews.

Image Cockpit's moderate/severe interior-alpha-hole thresholds are useful evidence but resolution-dependent. Canonical QA normalizes enclosed-hole area against body bounds, warns by default, and requires visual review for intentional gaps; strict alpha failure is explicit.

## Portable CLI equivalent

The local `sprite-workflow` equivalent of Image Cockpit's middle pipeline is:

1. `extract-chroma-sheet.py` for deterministic key removal, frame slicing, normalization, manifest, and GIF.
2. `make-qa-previews.py` for light/dark/checker review surfaces.
3. `qa-sprite-sheet.py` for dimensions, alpha bounds, residue, edge risk, and appendage consistency.
4. `score-candidates.py` for candidate ranking before promotion.

This keeps sprite work contract-driven instead of relying on manual crop/trim loops.
