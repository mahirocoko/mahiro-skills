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
  "provenance": {
    "sourceLane": "codex",
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

## `outbox/manifest.json`

Required fields:

```json
{
  "frameSize": [32, 32],
  "states": ["idle", "work"],
  "frames": [
    { "file": "frames/idle-00.png", "state": "idle", "index": 0, "durationMs": 160 }
  ],
  "anchors": {
    "default": [16, 30]
  },
  "provenance": {
    "sourceLane": "codex",
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
- Keep raw provider details out of manifest files; use `qa-report.md` for human-readable notes.
