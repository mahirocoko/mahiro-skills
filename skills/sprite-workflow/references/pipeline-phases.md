# Sprite workflow phase router

All lanes are available in one skill, but a job should run only the lanes its runtime contract needs.

## Core path

1. Inspect repo/runtime rules and define frame/action/direction/anchor/content/provenance contracts.
2. Search an exact attributed prompt example or render an adapted template when useful.
3. Approve a clean source/master before animation when identity drift is likely.
4. Generate or edit into isolated candidate outboxes; use blocker sidecars when capability is absent.
5. Extract/clean frames, preserve action and lineage, and create native pre-normalization review evidence.
6. Run target-size, alpha, body/FX, spatial, vertical, temporal, and cross-action QA.
7. Promote only after human/main-agent visual approval.

## Phase A — runtime correctness

- Keep frame count independent from state count.
- Preserve action, direction, content policy, anchor policy, provenance, and source IDs through extraction and promotion.
- Review native frames before translation/normalization.
- Use integer translation-only center/bottom alignment; refuse clipping.
- Measure bottom drift and adjacent vertical changes. A body mask is required when detached FX makes composite alpha unsafe for anchor/scale measurement.
- Compare related action scale against an approved reference and record explicit exclusions for intentional shape changes.
- For batches, report requested slots, missing slots, unique sources, and intentional reuse separately.

## Phase B — optional motion and complex extraction

- Motion video is `reference-only`; capability means local intake can run, not that a provider is preferred.
- Select one cycle explicitly. Preserve raw video and extraction hashes/timestamps. Never use whole-clip sampling as the production default.
- Use explicit row-major 2D grid metadata. Component-grid recovery must fail visibly when ambiguous; a fixed fallback requires a second explicit run.
- Report body and nearby FX components without deleting them automatically.
- Enclosed alpha holes are resolution-normalized warnings by default because valid silhouettes may contain intentional gaps.

## Phase C — optional true-pixel and delivery lanes

- Native-grid recovery is a bounded experimental correction lane, not a universal “make pixel art” filter. Stable scope is square, axis-aligned, opaque/binary-alpha, nearest-neighbor-like PNG input with strong grid evidence. Refusal is a valid result when that evidence is absent.
- Keep source, report, recovered native output, and provenance notices. Refused/low-confidence inputs must not emit a misleading production candidate.
- Atlas assembly consumes only contained, hash-matching `production-approved` frame manifests. It performs no scaling, trimming, rotation, or approval upgrade.

## Always reject

- provider branding as a permanent capability rule;
- one chroma key for every palette;
- fixed grid/cell sizes as universal defaults;
- east/west mirroring without an explicit mirror-safe contract;
- whole-video even sampling presented as one true loop;
- largest-component deletion as a silent default;
- script QA presented as final visual approval.
