---
name: web-asset-prompts
description: Turn generic image-generation requests into production-ready website asset prompts. Use for transparent PNG cutouts, overlay-safe hero/card images, aspect ratios, crop safety, UI/web image assets, and website-ready raster asset sets.
---

# /web-asset-prompts

Use this skill when generated images must work as real website assets, not just attractive standalone pictures.

It converts vague image requests into production web asset specs with explicit use case, asset type, aspect ratio, crop safety, transparency needs, safe padding, and constraints.

This is a guidance-only skill. It does not run a local script. Apply the rules directly when rewriting image-generation prompts or preparing prompt sets for image generation tools.

Boundary: use this skill for prompt specs and prompt rewrites only. Use `asset-designer` when the task involves asset planning, cutout cleanup, layer separation, delivery manifests, or deciding what assets a page needs.

Phase role: `web-asset-prompts` is the per-asset prompt writer. It answers **how to ask an image model for one web-usable asset**. It should not become the asset-pack planner; use `asset-designer` for deciding the asset set, filenames, layer split, QA composites, or delivery manifest.

Recommended chain:

```txt
frontend-design brief
  -> asset-designer asset plan / manifest
  -> web-asset-prompts per-asset generation prompts
  -> image generation or cleanup
  -> asset-designer QA / delivery notes
```

## Supported asset modes

- `photo-card` — full-bleed editorial/card image
- `overlay-photo` — image with text-safe negative space
- `transparent-cutout` — transparent PNG compositing asset
- `chroma-key-cutout-source` — flat chroma-key source image for local background removal
- `product-transparent-cutout` — transparent PNG product/package asset
- `ingredient-transparent-cutout` — transparent PNG ingredient/object asset
- `journal-image` — editorial article/card image
- `hero-image` — large website hero image

## Workflow

1. Identify the web role: transparent cutout, product transparent cutout, ingredient transparent cutout, chroma-key cutout source, overlay photo, journal image, hero image, or full-bleed card photo.
2. Run the single-asset preflight and lock these inputs before writing the prompt:
   - Asset mode: pick one mode only.
   - Ratio and canvas: state the exact aspect ratio or canvas shape.
   - Output type: choose transparent PNG, chroma-key source, or full-bleed photo.
   - Crop and overlay safety: call out safe padding, subject placement, and any text-safe negative space.
   - Forbidden artifacts: no text, logos, watermarks, labels, clipped edges, or other unusable output.
   - Delivery intent: say whether the result is a production asset or reference-only.
3. Add the correct aspect ratio and crop-safety requirements.
4. Write the final image-generation prompt so it stands on its own.
5. Apply the final prompt QA check before returning it.

## Single-asset preflight

Use this as a compact gate for one asset only:

- Asset mode: confirm the exact mode and do not mix modes.
- Ratio and canvas: specify the exact ratio or canvas, such as `1:1`, `4:5`, `16:9`, or `21:9`.
- Output type: state whether the target is a transparent PNG, chroma-key cutout source, or full-bleed raster image.
- Crop and overlay safety: require safe padding, a fully visible subject, and text-safe negative space when the asset will sit under copy.
- Forbidden artifacts: ban generated text, fake labels, logos, watermarks, clipped subjects, and messy edges.
- Delivery intent: label the result as either a production asset or reference-only.

## Response format

When using this skill, return a compact production spec:

```md
Asset mode: <mode>
Recommended ratio: <ratio>
Output format: <PNG with alpha | JPG/PNG full-bleed photo>
Delivery intent: <production asset | reference-only>
Final prompt: <ready-to-use image generation prompt>
Implementation notes: <crop, padding, overlay, or save-location notes if relevant>
```

For batches, repeat the same shape per asset and keep filenames stable.

## Final prompt QA

Before returning the prompt, check that it is:

- free of generated text, fake logos, and watermarks
- free of clipped subjects or edge-cut objects
- free of busy overlay areas where text would fight the image
- free of chroma-key color bleeding into the subject
- usable as-is, without needing extra cleanup instructions

## Production web asset rules

Always decide the asset's web role before writing the prompt.

### Transparent cutouts

Use for objects that need to be placed on cards, grids, product sections, CTA panels, or layered compositions.

Required prompt markers:

- transparent PNG cutout
- isolated object
- no background
- generous padding
- subject fully visible
- clean silhouette
- final transparent output should be trimmed to the visible subject bounds unless layout-safe padding is explicitly needed
- no cast shadow
- no floor plane
- centered web compositing asset

Default ratios:

- product/object cutout: `4:5`
- ingredient/object cutout: `1:1`
- tall decorative cutout: `3:4`

### Chroma-key cutout source images

Use this when the image generator cannot reliably produce true transparency, when native transparent output is unavailable, or when the workflow will remove the background locally after generation.

Prompt this as a source image for extraction, not as the final transparent file.

Important: source images need generous padding for clean extraction, but the final transparent asset should usually be trimmed after background removal. Preserve only intentional layout-safe padding.

Required prompt markers:

- transparent-cutout source image for web compositing
- perfectly flat solid chroma-key background
- one uniform key color
- no shadows, gradients, texture, wall, floor plane, reflections, or lighting variation in the background
- subject fully visible
- generous padding on all sides
- clean silhouette
- subject separated from the background
- do not use the chroma-key color anywhere in the subject
- no text, logo, watermark, labels, clutter, or clipped edges
- final extracted transparent asset should be trimmed to the subject bounds after key removal unless layout-safe padding is intentionally required

Default key colors:

- `#ff00ff` for botanical, green, leafy, or natural subjects
- `#00ff00` for non-green subjects
- choose a key color that does not appear in the subject

Contact shadow rule:

- Prefer no shadow for clean extraction.
- Allow only a very soft neutral contact shadow when the asset needs grounding.
- Never allow colored shadows or shadows that blend into the chroma-key background.

Default ratios:

- object or product source: `4:5`
- ingredient source: `1:1`
- decorative vertical source: `3:4`

### Full-bleed web photos

Use for hero cards, editorial cards, journal cards, and photographic backgrounds.

Required prompt markers:

- editorial web card image
- explicit aspect ratio
- crop-safe composition
- no text, no logo, no watermark
- subject not touching edges
- usable at responsive breakpoints

Add `overlay-safe negative space` when text or gradients may sit over the image.

Default ratios:

- card photo: `4:5` or `3:4`
- journal image: `16:10`
- hero image: `16:9` or `21:9`
- square gallery card: `1:1`

## Avoid

- vague “beautiful image” prompts without web role
- cropped products, clipped leaves, or subjects touching the canvas edge
- busy scenes that fight text overlays
- generated text, fake labels, logos, or watermarks
- strong shadows on transparent cutouts unless the shadow is meant to be composited separately
- perspective that makes product/object cutouts hard to place in a layout

## Examples

### Transparent cutout rewrite

Generic request:

```txt
olive leaf branch for botanical nutrition website
```

Production prompt:

```txt
Create a transparent PNG cutout of an olive leaf branch for a botanical nutrition website. Isolated object, no background, centered web compositing asset, 1:1 canvas, full branch visible, clean natural silhouette, crisp leaf edges, no cast shadow, no floor plane, no text, no logo, no watermark. Trim the final transparent output to the visible branch bounds unless layout-safe padding is intentionally required. Keep the color palette muted olive green and warm natural botanical tones. The result must be easy to place on ingredient cards and cream-colored website surfaces.
```

### Chroma-key cutout source rewrite

Generic request:

```txt
dicut botanical ingredient for web card
```

Production prompt:

```txt
Create a transparent-cutout source image for web compositing. Generate a botanical ingredient subject on a perfectly flat solid #ff00ff chroma-key background for local background removal. The background must be one uniform color with no shadows, gradients, texture, wall, floor plane, reflections, or lighting variation. Keep the subject fully visible with generous padding on all sides for extraction. Use a clean silhouette and keep the subject clearly separated from the background. Do not use #ff00ff anywhere in the subject. Include only a very soft neutral contact shadow if the asset needs grounding. No text, logo, watermark, labels, clutter, or clipped edges. After background removal, trim the final transparent asset to the visible subject bounds unless layout-safe padding is intentionally required.
```

### Overlay-safe photo rewrite

Generic request:

```txt
calm wellness portrait for landing page card
```

Production prompt:

```txt
Create an editorial web card image of a calm wellness portrait for a premium landing page. Aspect ratio 4:5, crop-safe composition, subject fully visible and not touching edges, soft natural light, warm cream and muted sage palette, refined clinical-botanical mood. Leave overlay-safe negative space in the lower third for a short text caption or gradient overlay. Avoid busy background detail, generated text, logos, watermarks, harsh contrast, and exaggerated spa clichés.
```

### Hero image rewrite

Generic request:

```txt
premium nutrition hero image with food and botanical elements
```

Production prompt:

```txt
Create a large responsive website hero image for a premium botanical nutrition landing page. Aspect ratio 16:9, wide crop-safe composition that remains usable on desktop and mobile crops, subject cluster placed away from critical edges, generous calm negative space for headline placement, warm ivory background, muted sage and deep olive accents, refined natural-light editorial photography. No text, no logo, no watermark, no clutter, no harsh shadows, and no busy detail in the overlay-safe copy area.
```

## Pairing

- Pair with `imagegen` when actually generating raster assets.
- Pair with `frontend-design` when asset prompts come from a landing-page handoff.
- Pair with `uncodixify` when generated assets are part of a frontend revamp and the visual system needs restraint.
- Pair with `asset-designer` when more than one asset, layer, crop variant, or delivery format must be planned.

## Boundary with `asset-designer`

Keep the two skills separate:

- `web-asset-prompts`: one asset mode, one generation prompt/spec, ratio/output format, crop safety, no-text/no-logo/no-watermark constraints.
- `asset-designer`: multi-asset planning, filenames, layer strategy, transparent cutout cleanup, shadow/background separation, previews, and delivery manifest.

If the prompt depends on page/component context, take that context from `frontend-design` or `asset-designer`, then return the final image-generation prompt without expanding into a full asset plan.
