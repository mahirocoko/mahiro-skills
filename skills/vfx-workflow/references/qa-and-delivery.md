# QA, manifests, and promotion

## Collision-overlay review

Provide a debug view that can show, for the same event ID and clock:

- authoritative hit/hurt/interaction shapes;
- telegraph and active AOE geometry;
- projectile simulation position/path and rendered projectile position/path;
- cast commit, arrival, tick, cancel, and cleanup timestamps;
- semantic sockets/anchors, pivots, facing, mirror state, and depth group;
- predicted versus confirmed/reconciled state.

Review frame-stepped and at normal speed. Capture before commit, at commit, immediately before/at/after arrival, cancellation, and cleanup. Fail promotion when visual boundaries materially imply a different safe area, direction, deadline, target, or contact point. Decorative overshoot is acceptable only when an unmistakable semantic boundary remains.

## Runtime review matrix

Exercise the cue:

- alone and under representative combat/crowd pressure;
- on bright, dark, noisy, and color-conflicting scenes;
- at expected camera zooms, aspect ratios, pixel densities, and mirrored facings;
- with pause, slow/fast time scale, frame drops, tab/background throttling where relevant, scene changes, and entity destruction;
- across supported device classes, input modes, browsers, GPUs/renderers, and quality tiers defined by the repo;
- with default, reduced-motion, reduced-effects, and combined accessibility settings;
- after repeated pooled reuse and abrupt cancellation;
- with debug overlays disabled to confirm production composition.

Use measured repo-local budgets. Inspect frame time, allocation/GC, pool misses, texture memory, draw calls/batches, overdraw/fill, particle count, and long-session growth as applicable. Do not transplant budgets from another engine or product.

## Cue manifest

Use the repository's native format. Preserve these concepts without copying an external tool's UI or schema wholesale:

```text
cue identity/version
family and gameplay event(s)
intent/commit/launch/arrival/cancel/cleanup bindings
semantic/decorative layer inventory
source type: procedural | atlas | hybrid
asset/material/shader references and hashes where supported
socket/anchor/space/mirror/follow/depth/blend policy
accessibility variants
pool/reset and pressure-degradation policy
deterministic seed version/salt policy
engine/browser adapter and import notes
source, generator/editor, cleanup lane, license/rights notes
candidate/rejected/approved status and reviewer evidence
```

Keep jobs, sources, candidates, returned artifacts, status, and logs distinct. Support resumable review under stable cue/job IDs and repair only rejected layers/directions when practical; accepted artifacts should not change silently. A fallback or procedural placeholder must be labeled as such and never presented as authored production art.

These are portable workflow ideas adapted from Image Cockpit v0.1.6: explicit handoff boundaries, isolated candidate outputs, stable IDs, resumable status, selective repair, synchronized comparisons, separate body/effect layers, persisted review decisions, import/export round trips, deterministic diagnostic fallbacks, and evidence-backed human approval. Adopt the ideas, not its application UI or schema.

## Cleanup gates

Verify that every cue:

- unregisters listeners/callbacks and releases pooled children, trails, decals, lights, audio links, and UI companions;
- clears references that retain scenes/entities/textures;
- handles duplicate completion/cancel safely;
- cannot respawn stale particles or callbacks after pooled reuse;
- survives scene unload, hot reload/restart paths, and renderer/context loss when relevant;
- leaves no long-session growth beyond documented caches/pools.

## Promotion gates

Require all applicable gates:

1. **Truth:** kernel boundaries and collision overlays agree with the cue contract.
2. **Readability:** allegiance, area, direction, deadline, and arrival remain understandable in-context.
3. **Accessibility:** color redundancy and both reduction modes preserve meaning.
4. **Reliability:** pooling, cancellation, reconciliation, and cleanup pass repeated use.
5. **Performance:** supported device/browser tiers meet repo-local budgets with declared degradation.
6. **Provenance:** runtime artifacts, generation/cleanup lanes, rights notes, versions, and hashes are recorded.
7. **Human review:** an owner reviews real runtime captures at target scale and explicitly approves promotion.

Automated checks and overlays provide evidence but do not grant aesthetic or production approval. Record blockers and keep failed candidates out of canonical runtime paths.
