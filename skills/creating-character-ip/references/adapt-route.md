# Adapt route — preserve identity while changing one axis

Use this route only after the human selects one exact character image. First
decide whether the requested axis can be satisfied by a deterministic mirror.
When an image model is still required, the source pixels must reach it directly;
prose or a main-agent reconstruction is not an identity reference.

## Freeze the selected source

Record the exact source path, dimensions, mode, and SHA-256. Write an identity
lock before prompting:

```text
Preserve:
- dominant silhouette and paired defining feature
- face geometry and expression
- accepted subject colors and material treatment
- accepted held object or gesture

May change in this batch:
- <one approved axis: composition OR crop OR scale OR posture OR surface fit>

Reject:
- new character, costume, prop, facial expression, palette, or material
- unassigned composition change; preserve an accepted placement unless
  composition is the selected variation axis
- replacing the selected image with a textual approximation
```

Scope human acceptance precisely. If the user approved only the character, do
not silently treat the old composition as locked. If the user approved both,
freeze both.

## Short-circuit pure mirror requests

Before opening a provider call, ask whether the requested result is the exact
same accepted pixels mirrored horizontally or vertically. Inspect:

- text, letters, numbers, arrows, symbols, and reading direction
- asymmetric marks, anatomy, costume, hair, or paired features
- handed props, gestures, pose, gaze, and facing direction
- baked light, shadow, highlight, material grain, and scene direction
- target-side semantics such as overlay-safe space or directional UI meaning

If every observed cue may reverse and the human wants a truly mirrored result,
use an exact deterministic flip. Preserve the selected raw, record the operation,
tool, source/output hashes, dimensions, and provider call count of zero, then
inspect the derivative at the real target size or mask. Label it a deterministic
derivative, not a generated candidate.

Do not flip when the user wants repositioning while identity orientation stays
fixed, when any cue must remain unmirrored, or when the user explicitly wants
independent creative alternatives. Continue with reference-based Adapt instead.

## Choose one variation axis

Prefer one pair before a larger batch:

| Axis | Sensible default | Main failure to inspect |
| --- | --- | --- |
| Composition | two explicit target-fit arrangements | unrequested recentering or forced corner placement |
| Crop | close / moderate | lost face or defining feature |
| Scale | dominant / restrained | weak identity or mask pressure |
| Posture | two explicit gestures | anatomy and expression drift |
| Surface fit | two target geometries | target contract rewriting identity |

Corner studies are one composition option, not the default Adapt grammar.
Generate four corners only when the user explicitly requests that experiment.
Upper corners often fight upright bodies, ears, horns, or leaves; require target
mask evidence and report clipping honestly rather than promising compliance.

Every candidate must receive the same original selected source. Never use a
generated adaptation as the next candidate's reference; chaining confounds the
comparison and accumulates identity drift.

This provider rule applies only after the deterministic mirror short-circuit did
not resolve the request.

## Reference-edit prompt skeleton

Keep stable identity wording byte-identical across the batch and change only the
assigned variation paragraph.

```text
Create one complete full-bleed 1:1 square image. Use the supplied image only as the identity reference for the same character; replace only <approved axis>.
Background: preserve <accepted background behavior>.
Subject: preserve the same recognizable identity: <silhouette>, <paired feature>, <face/expression>, <accepted colors>, and <defining object or gesture>.
Simplification: retain the accepted treatment while removing only detail that becomes noise at <target size>. Do not invent anatomy, accessories, or decoration.
Variation: <one exact position/crop/scale/posture/surface instruction>. Keep load-bearing face and paired features visible. Leave <intended negative-space relationship>. Use only the assigned composition; do not default to either center or corner placement.
Finish: show only this one character on the full canvas with normal square outer corners.
Constraints: no text, watermark, frame, mockup, extra subject, scenery, identity redesign, palette replacement, expression change, new prop, or unassigned composition change.
```

Do not include `logo`, `brand mark`, `app icon`, or `icon asset` in the provider
prompt. Express mask safety as visible geometry while the surrounding workflow
owns the actual target surface.

## Check the target surface

### App icon

- Keep the raw square unrounded; the platform applies its mask.
- Build a mask preview without altering the raw.
- Inspect face, paired features, and defining prop under the target mask at
  home-screen size.
- Treat edge crops as intentional only when load-bearing identity survives.
- Make a deterministic required-size export only after selection.

### Avatar

- Centering may be valid when explicitly requested for a symmetrical portrait.
- Inspect circle and square crops separately; one does not prove the other.

### Sticker or transparent character

- Select the composition first on a controlled background.
- Route alpha generation, dicut, edge cleanup, and target-size inspection to
  `asset-designer` after selection.

### Hero or layout asset

- Assign subject side and overlay-safe negative space explicitly.
- Keep the accepted identity source unchanged across layout variants.
- Do not replace direct image inspection with a prose brief.

## Review actual output

Label requested and observed state separately when they differ:

```text
C3 — upper-left requested; observed left/bottom mass; ear clips under mask
```

Inspect full-resolution pixels and the intended target size. Mechanical review
may report drift, clipping, readability, or contract failure; human taste selects
the candidate.

After selection, record the accepted identity and variation together. Production
integration must use that exact raw, mirror derivative, or deterministic export;
it must not regenerate the character for convenience.
