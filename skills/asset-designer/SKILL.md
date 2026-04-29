---
name: asset-designer
description: Personal designer workflow for website image assets. Use when users want to cut out/dicut images, remove backgrounds, separate layers, clean edges, create transparent PNG assets, generate missing web assets, or prepare production-ready asset packs for UI/web projects.
---

# /asset-designer

Use this skill when the user wants practical website image assets, not just prompts.

This is a guidance-only skill. It does not run a local script. It defines how to think like a personal asset designer: inspect inputs, decide whether to cut out, separate layers, clean edges, generate replacements, and deliver web-usable assets.

Pair with `web-asset-prompts` whenever new image-generation prompts are needed.

Boundary: use this skill for asset planning, cutout cleanup strategy, layer separation, delivery manifests, and deciding what assets a page needs. Use `web-asset-prompts` for the actual prompt specs and prompt rewrites.

Phase role: `asset-designer` is the asset director. It answers **what assets should exist, how they should be produced, how they should be packaged, and how they should be QA'd**. It should not become the primary prompt writer for a single image; delegate that step to `web-asset-prompts`.

Recommended chain:

```txt
frontend-design brief
  -> asset-designer asset plan / manifest
  -> web-asset-prompts per-asset generation prompts
  -> image generation or cleanup
  -> asset-designer QA / delivery notes
```

## Core principle

Start from the website job, not the picture.

Every asset must have a clear role:

- full-bleed hero image
- overlay-safe card image
- product transparent cutout
- ingredient transparent cutout
- chroma-key cutout source
- testimonial/avatar crop
- decorative foreground layer
- contact shadow layer
- background plate
- responsive delivery variant

If the role is unclear, infer the likely web role from the page, component, or surrounding copy before asking for more detail.

## Operating modes

### 1. User provides an image

Treat the image as source material to transform.

Workflow:

1. Identify the subject and intended web role.
2. Classify extraction difficulty:
   - simple product/object
   - plant/leaf/fine edge
   - hair/fur/feathers
   - glass/liquid/translucent material
   - strong shadow/reflection
   - low-resolution or compressed source
3. Choose the asset operation:
   - transparent cutout / background removal
   - edge cleanup / defringe
   - transparent bounds trimming
   - shadow separation
   - background plate cleanup
   - responsive crop variants
   - layer split for foreground / shadow / background
4. Preserve the original image. Save derived outputs non-destructively.
5. Validate the result against real web backgrounds and likely crop containers.

Recommended deliverables:

- `subject.png` — transparent master cutout
- `subject.webp` — optimized transparent delivery variant when useful
- `shadow.png` — optional separate soft contact shadow
- `background.jpg` or `background.png` — optional cleaned background plate
- `preview-light.png` and `preview-dark.png` — optional QA composites
- `README.md` or notes describing usage and constraints

### 2. User provides no image

Treat the request as asset direction and create a generation plan.

Workflow:

1. Infer brand/page context from nearby files or the user's description.
2. Decide the needed asset set and filenames.
3. Choose asset mode for each file:
   - `hero-image`
   - `overlay-photo`
   - `photo-card`
   - `transparent-cutout`
   - `chroma-key-cutout-source`
   - `product-transparent-cutout`
   - `ingredient-transparent-cutout`
   - `journal-image`
4. Use `web-asset-prompts` doctrine to write generation prompts.
5. Prefer chroma-key cutout sources when true transparency is unreliable.
6. Keep outputs web-composable: crop safe, edge safe, no fake text, no watermark, no clipped subject.

Recommended deliverables:

- asset manifest with filenames, roles, dimensions/ratios, and prompts
- generated source files if generation tooling is available
- final web assets after cleanup or background removal
- usage notes for CSS layout and crop behavior

## Decision matrix

| Situation | Default choice | Why |
| --- | --- | --- |
| Product/object needs to sit on cards | transparent cutout | composable and reusable |
| Generator cannot produce reliable alpha | chroma-key cutout source | easier local extraction |
| Photo will have text over it | overlay-safe photo | preserves readable copy area |
| Article/card image | journal image, 16:10 | consistent card grid crops |
| Hero/masthead | hero image, 16:9 or 21:9 | responsive wide layout |
| Hair/fur/glass | soft matte/manual cleanup | hard masks usually fail |
| Strong shadow needed | separate shadow layer | avoids baked-in halo problems |
| Unknown page context | inspect surrounding UI first | asset role drives the output |

## Cutout quality checklist

Before declaring a cutout ready, check:

- transparent corners are actually transparent
- subject is not clipped
- edges have no obvious fringe or chroma spill
- fine details are not destroyed
- asset works on light and dark backgrounds
- padding is sufficient for CSS transforms and responsive placement
- transparent bounds are trimmed unless intentional layout-safe padding is needed
- shadow is absent or separated unless intentionally baked in
- output filename reflects asset role, not just subject name

## Layering rules

Separate layers when it improves layout control.

Common layer split:

```txt
asset-name/
  subject.png
  shadow.png
  background.jpg
  preview.png
  notes.md
```

Use separate `shadow.png` when:

- the subject needs grounding on cards
- the same cutout may appear on different backgrounds
- extraction creates dirty edge halos around the original shadow

Keep shadow subtle, neutral, and independent from the subject alpha when possible.

## Generation planning rules

When generating missing assets:

- specify the web role first
- specify ratio/canvas and output format
- specify crop safety and padding
- prohibit text, logos, watermarks, labels, and clipped edges
- for cutouts, choose true alpha or chroma-key source explicitly
- for photo assets, reserve overlay-safe negative space when needed
- generate fewer, more useful assets over many generic images

## Response format

For planning or reviewing an asset task, return:

```md
Intent: <transparent cutout | layer split | generate assets | crop variants | cleanup>
Inputs: <provided images or none>
Asset roles: <list roles>
Recommended workflow: <steps>
Deliverables: <filenames and formats>
Risks: <hair/fur/glass/shadow/crop/fringe/etc>
Prompts needed: <yes/no; use web-asset-prompts if yes>
```

For a concrete asset pack, return a manifest:

```md
| filename | role | ratio | format | source strategy | notes |
| --- | --- | --- | --- | --- | --- |
```

## Examples

### Provided image to layer plan

User request:

```txt
Cut out this product image and make it usable on a landing page card.
```

Asset-designer response:

```md
Intent: transparent cutout + optional shadow separation
Inputs: provided product image
Asset roles: product transparent cutout, contact shadow layer, preview composite
Recommended workflow:
1. Preserve the original file unchanged.
2. Remove the background with soft edges.
3. Trim transparent bounds to the visible product unless intentional layout-safe padding is needed.
4. Separate the contact shadow if it is useful for grounding.
5. Export a transparent master PNG and an optimized WebP variant.
6. QA on warm cream, white, dark green, and the target card background.
Deliverables: product-subject.png, product-subject.webp, product-shadow.png, product-preview.png, notes.md
Risks: label fidelity, edge halo, baked-in shadow, clipped product corners
Prompts needed: no, unless a replacement or missing angle must be generated with web-asset-prompts
```

### No image to asset manifest

User request:

```txt
Create assets for a botanical nutrition landing page ingredient grid.
```

Asset-designer response:

```md
| filename | role | ratio | format | source strategy | notes |
| --- | --- | --- | --- | --- | --- |
| olive-leaf-source.png | chroma-key cutout source | 1:1 | PNG | generate via web-asset-prompts | use #ff00ff key for green subject |
| tonic-vessel-source.png | chroma-key cutout source | 4:5 | PNG | generate via web-asset-prompts | no labels, no floor plane |
| avocado-card.jpg | full-bleed photo card | 4:5 | JPG/PNG | generate via web-asset-prompts | crop-safe with no text |
| mineral-powder-source.png | chroma-key cutout source | 1:1 | PNG | generate via web-asset-prompts | preserve generous padding |
```

## When to ask one question

Ask only when the answer materially changes the workflow:

- whether the final asset must be a true transparent PNG or a chroma-key cutout source is acceptable
- whether a provided image's identity/product details must be preserved exactly
- whether the output is for a specific page/component with strict dimensions
- whether manual cleanup quality is expected or a quick draft is enough

Otherwise choose the safest production default and proceed.

## Pairing

- Use `web-asset-prompts` for prompt rewriting and generated-asset prompt doctrine.
- Use `imagegen` when actual raster generation or editing is required.
- Use `frontend-design` when the asset plan is derived from a landing-page or UI handoff.
- Use `uncodixify` when assets must support restrained, non-generic frontend visual output.

## Boundary with `web-asset-prompts`

Keep the two skills separate:

- `asset-designer`: multi-asset planning, filenames, roles, layer strategy, crop variants, QA backgrounds, and delivery manifest.
- `web-asset-prompts`: one asset request at a time, final prompt wording, ratio/output format, crop safety, and image-generation constraints.

If a user asks “what images does this page need?”, start here. If a user asks “write the prompt for this one image/cutout/background”, use `web-asset-prompts`.
