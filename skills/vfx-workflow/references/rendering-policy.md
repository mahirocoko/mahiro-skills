# Rendering and accessibility policy

## Procedural, atlas, or hybrid

Choose procedural effects when geometry must track live gameplay, scale continuously, recolor reliably, or vary without multiplying assets. Typical candidates are rings, cones, lines, beams, trails, gradients, pulses, and bounded particles.

Choose an atlas when authored frame silhouettes, painterly breakup, impact poses, or exact art timing carry the effect. Require approved frame order, duration, pivot/anchor, alpha, blend intent, color-space intent, provenance, and runtime import metadata. Send raster generation, extraction, cleanup, frame QA, and atlas work to `sprite-workflow` and `codex-asset-production`.

Use hybrid composition for a small authored identity layer over procedural geometry/readability. Keep layers independently suppressible; do not bury the semantic footprint inside a dense atlas.

## Depth and blend

- Define explicit depth groups for behind-body, body-attached, front-body, ground, overhead, and UI cues.
- Test occlusion against characters, terrain, props, particles, and UI. Ground truth such as telegraphs must remain legible without always drawing every decoration on top.
- Use additive/screen blending for light energy only when backgrounds and exposure preserve shape. Use alpha/normal or an opaque edge for silhouettes and semantic bounds.
- Prevent stacked additive effects from washing out allegiance, collision boundaries, text, or photosensitive-safe contrast.
- Keep premultiplied/straight alpha, texture color space, filtering, and blend equations as repo-local import/renderer decisions and record them in the manifest.

## Color and accessibility

- Encode meaning redundantly through shape, edge style, icon, direction, cadence, value, or spatial pattern in addition to hue.
- Check representative color-vision deficiencies, low contrast, bright/dark backgrounds, HDR-like bloom conditions, and grayscale/value separation where supported.
- Keep flashes, strobing, camera shake, chromatic displacement, blur, and rapid scale changes bounded by the repository's accessibility policy.
- Preserve readable warning lead-in and collision shape when bloom, post-processing, transparency, or particle density is reduced.

### Reduced motion

Reduce or replace camera shake, screen displacement, parallax, rapid travel, spinning, zoom, and large oscillation. Prefer stable fades, holds, restrained scale, or localized changes while preserving event timing and direction.

### Reduced effects

Reduce spawn count, trails, secondary bursts, decals, distortion, overdraw, bloom, and persistent ambience. Preserve semantic telegraphs, active AOE bounds, allegiance, pickup availability, status identity, and damage/heal confirmation.

Treat these as independent settings and test all combinations. Neither mode may alter gameplay timing or collision.

## Deterministic decoration

Derive decorative variation from a stable event/cue ID plus a versioned salt when replay, rollback, capture comparison, or synchronized spectators require repeatability. Keep sequence ownership local to the cue so pool order and frame rate do not alter results. Decorative seeds may vary angle, frame choice, noise phase, or spawn placement; they must never determine gameplay spread, hit, crit, loot, or status.

## Pooling and pressure degradation

Reset transforms, parent/socket, timers, color, alpha, material parameters, frame index, trails/history, callbacks, event IDs, seeds, visibility, depth, and accessibility state on acquire/release. Make release idempotent and cover completion, cancel, source death, target death, scene unload, rollback, and errors.

Define repo-local quality tiers and pressure signals. Degrade in this order unless the target repo proves otherwise:

1. cull offscreen/nonsemantic ambience;
2. reduce secondary particles, decals, light/distortion, and trail history;
3. simplify decorative atlas/procedural layers and update frequency;
4. preserve semantic geometry and one clear arrival/confirmation cue;
5. if even critical rendering cannot run, retain the cheapest accessible fallback rather than silently dropping gameplay meaning.

Avoid mid-cue quality changes that alter implied area or deadline. Apply at spawn or transition at a semantically safe boundary. Keep exact counts, memory limits, overdraw targets, and frame-time budgets repo-local.
