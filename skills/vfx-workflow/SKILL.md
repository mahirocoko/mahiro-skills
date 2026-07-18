---
name: vfx-workflow
description: Defines, implements, reviews, and promotes runtime visual-effects systems and cues for games and interactive web apps. Use for telegraphs, casts, projectiles, trails, impacts, AOE, auras, statuses, barriers, pickups, UI feedback, cue timing, sockets, collision overlays, accessibility, pooling, VFX manifests, or runtime VFX QA.
---

# VFX Workflow

Own runtime VFX truth from gameplay event to reviewed in-context cue. Keep gameplay authoritative: visuals may anticipate, explain, and decorate an event, but must not decide whether damage, healing, collision, or status application occurred.

## Boundaries

- Own cue contracts, runtime composition, timing, attachment, rendering policy, accessibility variants, pressure behavior, evidence, and promotion.
- Keep exact engine adapters, import settings, shader APIs, browser workarounds, effect budgets, pool sizes, and thresholds in the target repository.
- Route raster effect-sheet contracts, extraction, alpha cleanup, frame QA, canonical atlas assembly, and promotion to `sprite-workflow`. Route Codex image generation and bounded candidate cleanup/layout execution to `codex-asset-production`; its outputs still return through `sprite-workflow` validation and promotion. Consume approved artifacts; do not recreate those pipelines here.
- Prefer repo-native primitives and conventions. Do not introduce a VFX framework when a small cue adapter fits.

## Workflow

1. **Inspect runtime truth**
   - Locate the gameplay kernel, event/damage path, render layers, camera, entity transforms, pause/time-scale rules, accessibility settings, pooling, and cleanup lifecycle.
   - Record repo-local adapters and budgets rather than inventing universal values.

2. **Write the cue contract**
   - Classify every phase as telegraph, cast, projectile, trail, impact, AOE, aura, status, barrier, pickup, or UI feedback.
   - Name gameplay boundaries explicitly: intent, commit, launch, damage/heal/status arrival, resolve, cancel, despawn.
   - Define which cues are semantic/readability-critical and which are decorative/degradable.
   - Read [runtime-cues.md](references/runtime-cues.md) for timing, family behavior, sockets, mirroring, and body/VFX separation.

3. **Choose the rendering source**
   - Use procedural geometry/particles for scalable shapes, continuous beams, rings, trails, noise, responsive recoloring, and parameterized motion.
   - Use an approved atlas for authored silhouettes, hand-painted breakup, frame-specific timing, or art-direction that procedural primitives cannot retain.
   - Use a hybrid only when each layer has a clear job. Never use generated raster output as runtime-ready without asset-lane provenance and QA.
   - Read [rendering-policy.md](references/rendering-policy.md) for depth, blend, color, accessibility, seeds, and pressure degradation.

4. **Implement from kernel to cue**
   - Trigger from authoritative events or their explicit prediction/reconciliation layer; never infer gameplay hits from particle overlap or animation completion.
   - Attach through semantic sockets/anchors and documented transform space. Preserve body animation independently from VFX transforms.
   - Make cancellation, interruption, entity death, scene change, pause, replay, rollback, and pooled reuse explicit.
   - Keep decorative randomness deterministic from stable event identity where replay or synchronization matters; do not feed decorative seeds back into gameplay.

5. **Review with truth overlays**
   - Compare rendered telegraph/projectile/impact/AOE extents and contact timing against real collision and damage-arrival boundaries.
   - Review at target scale, crowded scenes, representative backgrounds, camera motion/zoom, mirrored facings, occlusion depths, accessibility modes, and degraded quality tiers.
   - Read [qa-and-delivery.md](references/qa-and-delivery.md) for evidence, manifests, browser/device/performance checks, cleanup, and human promotion gates.

6. **Promote deliberately**
   - Require automated/runtime checks where available plus human review of readability, timing feel, visual hierarchy, and accessibility.
   - Promote only the reviewed cue/material/atlas versions named in the manifest. Keep candidates and diagnostics outside canonical runtime paths.

## Non-negotiable invariants

- Gameplay arrival is authoritative even if visual impact is late, skipped, pooled, reconciled, or disabled.
- Telegraph geometry communicates the effective gameplay area; decorative overshoot must not imply extra danger.
- Reduced motion and reduced effects are separate controls: one changes movement/camera behavior, the other reduces visual density/cost.
- Pressure degradation removes decoration before semantic cues and preserves danger, allegiance, interactability, and damage confirmation.
- Color is never the only carrier of team, danger, status, or success/failure meaning.
- Pooled instances reset every mutable field and release on every terminal path.
- A clean frame or passing benchmark is not promotion; inspect the effect in the real runtime.

## Stop gates

Stop at the affected boundary when:

- the authoritative gameplay event, collision geometry, arrival time, ownership, or cleanup path is unknown;
- a rendered telegraph, projectile, AOE, or impact materially disagrees with gameplay truth;
- a critical socket/anchor or mirrored transform is missing and guessing would misplace the cue;
- generated or extracted raster effects lack provenance, alpha/runtime QA, or promotion approval;
- reduced-motion, reduced-effects, pooling, or pressure degradation would alter gameplay timing or remove semantic cues;
- performance is being judged without the target repo's representative runtime state and device/browser evidence;
- the requested change would move collision, damage, status, or simulation authority into decorative rendering.

## Output contract

Report:

1. cue families and authoritative gameplay boundaries;
2. files/adapters changed and repo-local budgets used;
3. rendering, attachment, accessibility, pooling, and degradation decisions;
4. QA evidence and unresolved mismatches;
5. manifest/provenance status and human promotion decision.

## Validation / self-check

Before finishing, confirm:

- each cue family names its authoritative gameplay boundary and semantic/decorative layers;
- collision overlays and arrival timing match the implemented gameplay path;
- sockets, anchors, mirroring, follow/detach, cancel, pause, death, scene-change, and pool-reset behavior are explicit;
- reduced motion and reduced effects preserve danger, allegiance, interaction, status, and damage/heal meaning;
- pressure degradation removes decoration before semantic cues and uses repo-local budgets;
- generated raster effects retain separate approved source, cleanup, QA, and runtime-composition evidence;
- browser/device/performance evidence names the exact build and representative state;
- human promotion covers in-context readability and timing feel rather than only isolated sheets or benchmarks.
