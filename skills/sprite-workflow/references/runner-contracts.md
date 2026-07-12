# Runner contracts

This adapts Image Cockpit's Codex runner contract into `sprite-workflow` language. Use it when dispatching Codex/direct workers so they produce real image artifacts and do not pollute repo roots.

## Universal runner rules

- Read `job.json` and `prompt.md`; trust them as the generation contract.
- Do not perform broad repo audits when the job already includes the contract.
- Write final results only under the assigned outbox/candidate folder.
- Do not edit source code, package files, docs, git metadata, or configuration.
- Do not create procedural placeholders, SVG, canvas drawings, diagrams, or text-only substitutes for imagegen output.
- If image generation/editing is unavailable or blocked, write a small blocker JSON sidecar instead of fake art.
- Keep QA/debug/contact/comparison/temp files outside the root final outbox until the candidate is approved.
- Verify workflow-specific capabilities before accepting a job. If a required image/video/runtime capability is absent, use the existing blocker sidecar; do not hard-code one provider as permanently capable.
- Preserve `action`, direction, frame count, content/anchor policy, lineage/source IDs, and source hashes in returned metadata when the job provides them.

Blocker sidecar schema:

```json
{
  "status": "blocked",
  "reasonKind": "policy_or_safety | imagegen_unavailable | unknown",
  "userMessage": "Short user-safe reason.",
  "suggestion": "Short retry suggestion."
}
```

## `image-generate`

- Use built-in image generation when available.
- Interpret `prompt`, `negativePrompt`, `generationHints`, and `jobNotes` literally.
- Preserve concrete subject, style, palette, composition, and production constraints.
- For character/creature assets, keep full body visible with padding.
- Avoid text/logos/watermarks/labels/numbers unless explicitly requested.

## `image-edit`

- Inspect `selectedImage.assetPath` first.
- Treat the selected image as the exact base image, not loose inspiration.
- Use annotation rectangles/numbered comments when present.
- Preserve original canvas size/aspect ratio.
- Do not zoom, crop, or reframe into a portrait/detail shot unless requested.
- Preserve transparency or use flat chroma fallback.
- Change only requested regions when possible.

## `sprite-generate`

- Inspect `selectedImage.assetPath` first.
- Generate real raster sprite-sheet assets from the source character image.
- Follow `spriteContext.grid`, `spriteContext.cell`, `spriteContext.directions`, `spriteContext.variant`, and `spriteContext.chromaKey` exactly.
- Keep one full-body character centered inside each strict cell with padding.
- No cropping, duplicated heads, detached parts, or body parts crossing cells.
- Each populated cell must be a distinct frame for `spriteContext.action`; static rows fail.
- For standard direction split, return exactly five direction sheets with suffixes:
  - `front`
  - `front-three-quarter`
  - `side`
  - `back-three-quarter`
  - `back`
- Each direction sheet is 4×2 frames unless the job says otherwise.
- Stage all work under candidate/staging folders; publish final root files only after complete self-check.

## `effect-animation`

- Use real image generation for a transparent PNG effect sheet.
- Follow `effectContext` exactly: category, type, style, palette, frame count, frame size, layout, loop, anchor, blend.
- No checkerboard, solid matte, UI panels, labels, frame numbers, arrows, border guides, text, logos, or watermarks.
- Every populated frame must show temporal progression.
- Include compact metadata JSON and GIF preview when feasible.

## `motion-reference`

- This is a local reference-intake lane, not a generation substitute and not a production sprite result.
- Require an explicit human-selected start/end (or duration) for one cycle. Never sample an entire multi-cycle clip by default and call it a loop.
- Preserve the raw video, source hash, selected-cycle bounds, extraction rate/count, and frame hashes in an owned output directory.
- Use argument-vector ffmpeg/ffprobe execution with bounded dimensions, duration, frame count, and total decoded pixels. Missing tools produce a blocker.

## `native-grid-recovery`

- Run only on inputs within the stable contract. A low-confidence/refused report is a successful safety outcome, not a reason to force output.
- Preserve the source and report; do not combine grid recovery with chroma removal, alignment, upscaling, atlas packing, or promotion.
- Do not claim exact upstream parity unless the implementation and fixtures prove it.

## `approved-atlas`

- Consume only contained, hash-matching `production-approved` frame manifests under the atlas contract.
- Do not scale, trim, rotate, deduplicate, mirror, or modify source pixels.
- Reject traversal/symlink escape, duplicate IDs/state-index pairs, invalid anchors, hash mismatch, dimensions mismatch, or unapproved inputs.

## Worker prompt template

```txt
You are processing a sprite-workflow handoff job.

READ job JSON: <JOB_DIR>/job.json
READ prompt: <JOB_DIR>/prompt.md
READ selected source assets from: <JOB_DIR>/assets/
WRITE outputs only under: <JOB_DIR>/outbox/<candidate-or-work-folder>/

Trust job.json/prompt.md as the contract. Use imagegen/built-in image generation when available. Return real raster image artifacts only. If image generation is unavailable, write a blocker JSON sidecar; do not create placeholder art.

Before finishing, self-check: output dimensions, frame count, grid/cell contract, full-body visibility, identity preservation, flat chroma/alpha safety, target-size readability, and motion progression.
```
