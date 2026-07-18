# Image Cockpit v0.1.6 workflow follow-up

Evidence pin: `dreiachse-cyber/image-cockpit-for-codex-workflows` at `79a219c99a8923e9b341c6f9ffcfe5dfd844063e` (`v0.1.6`), especially the release notes, Animation Timeline / Pack v2 QA, Animation Quality Gate v2 QA, VFX Composite Stage QA, and effect-quality implementation.

This is a workflow follow-up only. The bundled 107-prompt catalog and its receipt remain exactly pinned to the separate v0.1.5 revision documented in `prompt-catalog-schema.md`; do not refresh, relabel, or claim v0.1.6 prompt fidelity.

## Portable animation metadata overlay

Add these fields only when the target runtime or review needs them. Keep them alongside the canonical frame manifest rather than imposing an engine-specific schema:

- physical frame files remain immutable source artifacts; logical `frameOrder` may reference them for holds, duplicates, or reverse playback without copying raster data
- `durationMs` is per logical frame; also record a fallback/default FPS only when useful
- `playbackMode` is explicit: `loop`, `one-shot`, or `ping-pong`; do not infer a one-shot loop seam
- optional `pivot`, `anchor`, `socket`, `hitbox`, and `hurtbox` geometry uses normalized `[0,1]` coordinates; events use explicit logical-frame or time references
- distinguish authored/default metadata from human edits when that history matters; direction-specific exceptions must be explicit rather than silently diverging
- preserve event names and timing independently from frame labels; common phase events include startup, active, impact, recovery, and loop point

Metadata editing must not regenerate, rescale, or rewrite accepted frame PNGs. This contract does not require a universal editor, export pack, or any particular engine adapter.

## Raw versus normalized QA

Preserve two evidence lanes:

1. **Raw/native:** center, body/root or contact anchor, bounds, silhouette/identity, palette, neighboring-frame change, action phases, and loop seam where applicable.
2. **Normalized:** the same measurements after cleanup or translation, plus every per-frame correction (`scale`, `translateX`, `translateY`) and aggregate correction amount.

A normalized pass must not erase a raw warning. Large correction can make a preview usable while still identifying a generation defect. Compare raw and normalized views directly, inspect adjacent frames and first/last loop frames, and keep automated metrics advisory unless the local hard gate explicitly adopts them.

## Separate body and raster FX

For fixed-cell character work, keep the accepted body animation separate from wide slash arcs, muzzle flashes, projectiles, impacts, dust, and other detached raster FX. This prevents an FX bounding box from shrinking or displacing the body and lets gameplay compose layers independently. Combine them only when the runtime explicitly supports the wider cell and origin contract.

A composite preview is review evidence, not a new source master:

- preserve separate character and effect sheets/layers
- attach the effect to an authored socket; if missing, record a pivot/anchor/estimated fallback visibly
- start and peak the effect against named character events, then review event-to-peak delta
- inspect front/back depth, blend, offset, scale, rotation, opacity, clipping, and target backgrounds
- preserve original layer timing; a preview time-scale override must be explicit
- export or promotion must retain the separate layers even when a combined preview is provided

## Effect-sheet QA

Review transparent effect sheets on checker, light, dark, and representative game backgrounds. For every frame and the full sequence, check:

- real alpha, no matte/checker baked into pixels, alpha continuity, and abrupt opacity jumps
- clipping and output-edge contact
- overdraw risk from excessive alpha coverage or oversized diffuse bounds
- energy centroid motion, brightness envelope, palette continuity, temporal progression, and loop seam only for loops
- expected event peak versus measured peak frame
- ground/contact or projectile geometry against the intended socket/anchor

Geometry overlays are review-only: safe area, cell/effect bounds, anchor/socket, contact baseline, pivot, hitbox, and hurtbox. Toggle them over the raster preview; never bake guides into the production sheet. A warning does not become approval without target-size visual review.

## Deliberate exclusions

Do not port Image Cockpit's universal timeline/editor/export pack, engine-specific formats, resumable tournament runner state, or combined pack machinery into this canonical skill. Motion Pilot remains experimental, Best-only, default OFF upstream and is not a canonical default here.
