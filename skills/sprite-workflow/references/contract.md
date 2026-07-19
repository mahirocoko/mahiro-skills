# Sprite workflow contract

## `job.json`

Required fields:

```json
{
  "id": "20260701-asset-id",
  "kind": "sprite-sheet",
  "workflowMode": "sprite-generate",
  "title": "Mori idle frames",
  "targetRepo": "/absolute/path/to/repo",
  "createdAt": "2026-07-01T00:00:00Z",
  "prompt": "positive prompt or generated strict contract",
  "negativePrompt": "text, watermark, cropped feet",
  "jobNotes": "preserve character identity; QA all cells before finalizing",
  "generationHints": { "seed": "", "size": "", "count": 1, "quality": "auto" },
  "frameSize": [32, 32],
  "frameCount": 8,
  "states": ["idle", "work"],
  "sourceAssets": [],
  "selectedImage": { "name": "", "assetPath": "", "source": "" },
  "spriteContext": {
    "action": "idle-breathing",
    "frames": 8,
    "grid": { "columns": 4, "rows": 2, "gutter": 0 },
    "cell": { "width": 256, "height": 256 },
    "directions": ["front", "front three-quarter", "side", "back three-quarter", "back"],
    "chromaKey": "green",
    "variant": "standard"
  },
  "effectContext": null,
  "tournament": { "candidateCount": 3, "isolateOutboxes": true },
  "action": "idle-breathing",
  "direction": "side",
  "contentPolicy": "character-only",
  "anchorPolicy": "feet",
  "lineage": { "sourceIds": ["sha256:approved-master"] },
  "motionReference": null,
  "gridExtraction": null,
  "provenance": {
    "sourceLane": "codex",
    "sourceRequirement": "imagegen-required",
    "usage": "source-candidate"
  }
}
```

Supported `kind` values:

- `sprite-sheet`
- `animation-strip`
- `icon-frame-extract`
- `qa-only`

Supported provenance `sourceLane` values:

- `codex`
- `gemini`
- `imagegen`
- `manual`
- `external-reference`

Supported provenance `usage` values:

- `reference-only`
- `source-candidate`
- `production-approved`

Supported provenance `sourceRequirement` values:

- `imagegen-required`
- `manual-rig-allowed`
- `diagnostic-only`

Jobs created by `new-job.py` bind their outbox manifest to the job's `sourceLane` and `sourceRequirement`; the manifest may not omit or downgrade either value. Legacy standalone manifests remain readable when this field is absent.

Schema-v2 fields are optional for backward compatibility. When any are present, set `schemaVersion: 2` and preserve them through extraction, normalization, QA, and promotion:

- `frameCount` is independent from `states.length`; one action state may contain many frames.
- `action` and `direction` identify authored motion and view separately from runtime state labels.
- `contentPolicy` identifies whether composite alpha represents character/body, attached props, detached FX, or FX-only content. Body-aware anchor/scale measurement must fail closed when its required body mask is absent.
- `anchorPolicy` records the intended semantic measurement; it does not authorize scripts to treat detached dust, weapons, shadows, or capes as feet.
- `lineage.sourceIds` records stable source identities used for reuse/coverage rollups.
- `motionReference` is always reference metadata with explicit human-selected cycle bounds; it cannot confer production approval.
- `gridExtraction` records explicit rows, columns, row-major order, and recovery mode. Component recovery must not silently fall back.


## Image Cockpit-inspired fields

Preserve these concepts when preparing Codex/imagegen jobs:

- `workflowMode`: one of `image-generate`, `image-edit`, `sprite-generate`, `sprite-edit`, `effect-animation`.
- `prompt`: positive prompt or generated strict contract.
- `negativePrompt`: avoid list; keep it separate from the positive prompt.
- `jobNotes`: preservation, QA, edit notes, and promotion constraints.
- `generationHints`: seed/size/count/quality.
- `selectedImage`: source image identity and copied asset path.
- `spriteContext`: action, frames, grid, cell, directions, chroma key, variant.
- `effectContext`: category/type/style/palette/frameCount/frameSize/layout/loop/anchor/blend.
- `tournament`: candidate count and isolated outbox policy for multi-lane generation.

For Image Cockpit-style standard animation, prefer five separate direction images (`front`, `front-three-quarter`, `side`, `back-three-quarter`, `back`) with 4×2 frames each, then compose the final sheet after QA.

## Prompt catalog contract

The bundled `data/prompt-catalog.json` preserves 107 exact Image Cockpit examples with stable IDs, collection/category/tags, original positive/negative prompts, notes, and source locators at pinned upstream revision `b997e78609773975a98617568818ac32f40cf1a7`. `data/prompt-templates.json` is an adapted parameterized authoring surface and is not claimed byte-equal to originals. Use `prompt-catalog.py validate` before relying on either.

Prompt provenance identifies source text only. Generated assets still need their own `sourceLane`, source files, QA, usage level, and approval evidence.

## Motion-reference intake contract

`extract-motion-reference.py` writes a separate `motion-reference.json` under an owned output directory. It records the local video hash, explicit `startSeconds`/`endSeconds`/`durationSeconds`, `humanSelected: true`, `wholeClipDefault: false`, extraction rate/count, and per-frame hashes. The script never invokes a generation provider. Missing ffmpeg/ffprobe is a blocker, not permission to fabricate frames.

See `motion-reference-intake.md` for bounded input limits and selected-cycle rules.

## `outbox/manifest.json`

Required fields:

```json
{
  "frameSize": [32, 32],
  "frameCount": 1,
  "action": "idle-breathing",
  "direction": "side",
  "contentPolicy": "character-only",
  "anchorPolicy": "feet",
  "states": ["idle", "work"],
  "frames": [
    { "file": "frames/idle-00.png", "state": "idle", "index": 0, "durationMs": 160 }
  ],
  "anchors": {
    "default": [16, 30]
  },
  "lineage": {
    "sourceIds": ["sha256:approved-master"],
    "normalization": null
  },
  "reviews": {
    "nativePreNormalization": {
      "kind": "native-pre-normalization-review",
      "approved": true,
      "sourceManifest": { "path": "/absolute/native/manifest.json", "sha256": "..." },
      "sourceSheet": { "path": "/absolute/native/sprite-sheet.png", "sha256": "..." },
      "reviewArtifact": { "file": "native-pre-normalization.png", "sha256": "..." },
      "evidence": { "file": "native-review.json", "sha256": "..." },
      "reviewedAt": "2026-07-11T00:00:00Z",
      "notes": "Inspected silhouette, appendages, alpha, and target-size readability before normalization."
    }
  },
  "provenance": {
    "sourceLane": "codex",
    "sourceRequirement": "imagegen-required",
    "poseAuthorship": "generated-poses",
    "providerReceipt": {
      "provider": "codex-imagegen",
      "model": "provider-model-id",
      "operation": "imagegen",
      "sourceArtifacts": [
        { "file": "raw-generated/provider-source.png", "sha256": "..." }
      ]
    },
    "usage": "source-candidate"
  }
}
```

Rules:

- `frameSize` must be two positive integers.
- `states` must be non-empty.
- Every frame `state` must appear in `states`.
- Every frame file is resolved relative to the manifest directory.
- `anchors` values, when present, must be `[x, y]` pairs.
- Normalized outputs must retain native pre-normalization review evidence before named promotion. Review evidence describes an actual inspection; it is not created by QA success alone.
- Translation-only normalization records integer shifts and must fail rather than clip alpha.
- `action`, direction, content/anchor policy, lineage, frame timing, and provenance survive promotion when present.
- For `imagegen-required`, keep only the compact local provenance assertion above in the manifest and preserve the hash-bound raw raster artifacts through promotion. This verifies local artifact continuity, not a signed provider attestation. Put verbose provider logs and human-readable notes in `qa-report.md`.
- When `extract-chroma-sheet.py` consumes an `imagegen-required` `--source-job`, pass the worker's `--provider-receipt`. Extraction verifies that the selected input is one of the receipt's hash-bound source artifacts, copies all receipt artifacts under the normalized output's `raw-generated/`, and preserves `sourceLane`, `sourceRequirement`, `poseAuthorship`, and `providerReceipt` in the derived manifest. Missing or mismatched receipt evidence fails before extraction.
- Extraction without a structured source job is `diagnostic-only`; it may support cleanup/QA but cannot later become `production-approved`. Use a real job contract rather than the legacy atlas path when the output is intended for promotion.

This local manifest is conceptually aligned with Image Cockpit's handoff and quality gates but is not schema-compatible with `image-cockpit.animation.v2`. Do not claim import/export compatibility or copy Image Cockpit's timeline/editor/pack machinery without a separate adapter contract.

The strict native-grid report and approved-atlas contracts are separate because their security/integrity requirements differ from legacy frame manifests. See `native-grid-snap-contract.md`, `pixel-snap-provenance.md`, and `atlas-contract.md`.
