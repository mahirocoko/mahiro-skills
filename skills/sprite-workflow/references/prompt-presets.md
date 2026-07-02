# Prompt presets

These presets adapt Image Cockpit's prompt-field model into portable CLI text blocks for `sprite-workflow` jobs. They are not magic final prompts; they are scaffolds that keep generation from drifting into ad-hoc prose.

## Shared field model

Keep these fields separate in `job.json` and prompts:

- `prompt` — positive creative brief.
- `negativePrompt` — avoid list; never bury it only inside prose.
- `jobNotes` — preservation, QA, runner, and promotion notes.
- `selectedImage.assetPath` — exact source image to inspect/edit when present.
- `spriteContext` — action, frames, grid, cell, directions, chroma key, variant.
- `effectContext` — category, type, style, palette, frame count, frame size, layout, loop, anchor, blend.
- `tournament` — candidate isolation and winner selection metadata.

## Shared character/source block

Use for character or mascot sprite generation/editing:

```text
Inspect the selected source image first. Preserve the exact character identity: species, face, palette, outfit colors, props, proportions, and silhouette. The source image is not loose inspiration for a redesign.

Keep one full-body character in every cell. Keep head, ears/hair, hands, equipment, tail/appendages, and both feet visible. Keep stable scale, head size, center, and foot baseline. Prefer simplified readable sprite details over noisy illustration texture.
```

## Shared sheet contract block

Use for sprite sheets:

```text
Return a real raster PNG/WebP sprite sheet, not SVG/canvas/procedural/placeholder output.
Use the requested grid, cell size, frame count, directions, and chroma key exactly.
Treat grid/cell as strict cut lines: no gutters unless requested, no extra sheet margin, no character pixels crossing cell borders.
Use a perfectly flat chroma-key background in every cell when true alpha is unavailable: exact solid key color from edge to edge, no gradient, no lighting variation, no texture, no shadow, no glow, no antialias halo/matte around the silhouette, and no background color drift. Do not bake checkerboard, shadows, scenery, text, labels, frame numbers, UI, watermarks, or border guides into the sheet.

For multi-frame sheets, leave generous spacing between frames and keep each character fully inside its cell. Tail, sword, ears, cups, effects, and appendages must not cross into neighboring cells.
```

## Shared negative prompt

```text
text, label, number, watermark, logo, signature, UI, frame border, guide lines, scenery, detailed background, floor shadow, gradient background, shaded background, lighting variation on background, glow around silhouette, antialias matte, checkerboard, cropped head, cropped ears, cropped hands, cropped feet, cropped tail, missing weapon, missing prop, extra limbs, duplicate character, duplicated head, detached body parts, body crossing cell border, inconsistent scale, character redesign, photorealistic, 3d render, vector art, blurry, painterly, noisy micro-detail
```

## Pixel art single character

Use before animation when the source character itself is not clean enough.

```text
Create one full-body clean pixel-art character asset from the source/brief. Center the character in an idle-ready pose with clear feet contact and comfortable padding. Preserve identity and outfit colors. Simplify detail for target-size readability. Transparent background preferred; if unavailable use a perfectly flat chroma key specified in spriteContext.chromaKey.
```

## Image edit / region edit

```text
Edit the selected source image, do not create a new unrelated variant. Preserve original canvas size/aspect ratio. Preserve full-body visibility and transparency when possible. Change only requested regions/annotations. If transparency cannot be preserved, use a flat chroma fallback. Return a real edited PNG/WebP with no placeholder output.
```

## Standard direction-split animation

Image Cockpit's standard animation shape is five separate direction images, not one huge combined sheet:

- suffixes: `front`, `front-three-quarter`, `side`, `back-three-quarter`, `back`;
- each direction image: 4 columns × 2 rows = 8 frames;
- default cells: 256×256 unless `spriteContext.cell` says otherwise;
- each direction must show the same character, same scale, same outfit colors, same pixel density.

```text
Generate exactly five separate direction PNG/WebP images for front, front-three-quarter, side, back-three-quarter, and back. Each direction image is a 4x2 sheet with 8 distinct frames. Do not return only one combined 5x8 sheet. Keep each frame full-body, centered, padded, with stable baseline and flat chroma key.
```

## Motion-specific blocks

### `idle-breathing`

```text
Feet stay planted. Show readable breathing/secondary motion in at least several frames: subtle chest/shoulder/head movement plus cloth, hair/fur, scarf, tail, or equipment follow-through. Do not return eight identical still frames.
```

### `walk-cycle`

```text
Create a readable in-place walk cycle. Frames must alternate clear foot positions: contact, down/passing, opposite contact, up/passing. Keep torso/head stable, baseline stable, and feet visible. Tail/cloth/equipment may sway subtly. Static or nearly static rows fail even if the sheet layout is correct.
```

### `run-cycle`

```text
Create a stronger in-place run cycle with larger leg arcs, forward lean, and clearer arm/tail/cloth follow-through than walking. Preserve identity and baseline. Avoid motion blur or cropped limbs.
```

### `basic-attack`

```text
Create anticipation, strike, impact/follow-through, and recovery frames. Weapon/hand path must be readable without crossing cell borders. Preserve full body and stable anchor.
```

### `hurt-reaction`

```text
Create a short hit reaction: neutral, recoil, squash/lean, recovery. Keep the character recognizable and avoid gore, dismemberment, or extreme deformation.
```

### `death-downed`

```text
Create a downed/fainting sequence: losing balance, falling/downed, settle. Keep it game-safe and readable. Do not crop body parts or add extra characters.
```

### `spell-cast`

```text
Create charge, cast, release, and settle frames. Magic effects should stay inside cells and not hide the character silhouette. Use requested effect palette when supplied.
```

### `jump-hop`

```text
Create crouch/anticipation, lift, airborne, landing, settle. Preserve baseline logic and avoid cropped ears/feet during airborne frames.
```

### `guard-block`

```text
Create raise guard, hold/block, impact recoil, return. Shield/weapon/arms must remain inside cell and readable.
```

### `victory-cheer`

```text
Create celebratory body/arm/tail movement with stable scale. Avoid large props leaving the cell.
```

### `interact-pickup`

```text
Create bend/reach, pickup/contact, lift, return. Keep head/feet visible and avoid ground-object clutter unless requested.
```

### `ranged-attack`

```text
Create aim, draw/charge, release, follow-through, recovery. Projectile or muzzle effect must stay within cell or be represented as a separate effect sheet when large.
```

### `skill-release`

```text
Create a stronger special-action sequence with clear anticipation, release, follow-through, and settle. Keep character identity readable and avoid effect clutter hiding the pose.
```

### `knockback`

```text
Create readable recoil/slide frames while keeping the character inside the cell. Preserve baseline/anchor and avoid duplicate heads or detached parts.
```

### `item-use`

```text
Create reach/use/hold/return frames around a small prop. Prop must be visible but not dominate the character.
```

### `talk`

```text
Create subtle talking motion: mouth/head/hand/ear/tail changes. No speech bubbles, text, or UI. Feet remain planted.
```

## Effect animation preset

```text
Create one real transparent PNG game VFX sprite sheet. Follow effectContext exactly: category, type, style, palette, frameCount, frameSize, layout, loopMode, anchor, blendMode, and sheetSize. Every populated frame must show temporal progression. Do not bake checkerboard, matte background, preview background, text, labels, frame numbers, arrows, UI, logos, watermarks, or border guides into the image.
```

## Effect category hints

- `slash-arc`: readable crescent/cross/spin trail, strong leading edge, fades over time.
- `hit-spark`: compact impact burst centered on contact, quick decay.
- `magic-cast`: circle/runes/particles build up, loop or charge motion.
- `projectile`: clear travel direction, stable projectile core, optional trail.
- `impact`: burst/dust/shockwave expansion then fade.

## Visual fail examples to call out

Mark generated outputs as failed/draft when:

- motion is static or nearly static;
- outfit/colors drift from source identity;
- character is fuzzy illustration rather than clean sprite;
- details become noisy at target size;
- alpha/chroma cleanup makes the character translucent;
- feet/head/tail/weapon are cropped;
- body parts cross cell boundaries;
- generated sheet dimensions or cell counts are wrong.
