---
name: sprite-workflow
description: CLI-first sprite production workflow for prompt libraries, imagegen handoffs, sprite sheets, motion references, chroma/grid extraction, runtime anchor and scale QA, native-grid recovery, atlases, previews, and promotion gates.
---

# /sprite-workflow

Use this skill when sprite or mascot assets need a repeatable workflow rather than a one-off prompt. Pair with `asset-designer` for source strategy, cutout/chroma-key cleanup, QA previews, and production asset manifests; pair with `web-asset-prompts` for per-asset prompt wording.

## Skill routing

| User intent | Use |
| --- | --- |
| Decide what assets a UI/page needs, filenames, layers, QA, delivery manifest | `asset-designer` |
| Write/refine one production-ready image prompt/spec | `web-asset-prompts` |
| Have Codex generate/source/clean/QA production-ish asset families | `codex-asset-production` |
| Sprite sheets, animation frames, frame QA, GIF previews, promotion gates | `sprite-workflow` |
| Open tmux panes for Gemini/Cursor/Agy/Codex execution | `direct-cli` as executor layer only |


## Core posture

- Define the asset contract before generation: frame size, states, frame order, anchors, transparency, provenance, runtime target.
- Keep source, job, QA, and promotion separate. Do not write directly into production asset folders from a generation lane.
- Treat Codex as strong for handoff orchestration, slicing, manifest creation, QA, and integration. Treat source-art authorship separately when a repo has provenance rules.
- Main agent owns final taste/provenance gate. Subagents can produce candidates and QA reports, but they do not approve production promotion by themselves.
- Passing scripts/QA does not mean an asset is production-ready. Keep a visual honesty gate: inspect the actual output at target size before saying final/done/promoted; if silhouette, detail, alpha, animation readability, or style quality is weak, report it honestly, do not call it final, and stop promotion.
- Decide true alpha vs chroma-key source before generation. If generated transparency bakes checkerboard/white matte, switch to chroma-key and run cleanup/QA rather than accepting it as final.
- Treat motion video, native-grid recovery, prompt examples, and third-party material as typed inputs with explicit provenance. None of them upgrades an asset to production approval.
- Run only the phases the asset needs. “All phases are available” does not mean every sprite should be video-derived, pixel-snapped, or packed into an atlas.

## Default folder contract

Resolve repo-local state from the target repo root, not raw cwd:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
SPRITE_ROOT="$AGENT_STATE_DIR/sprite-workflow"
```

Job layout:

```txt
.agent-state/sprite-workflow/jobs/<job-id>/
  job.json
  prompt.md
  provenance.md
  assets/
  outbox/
    manifest.json
    frames/
    contact-sheet.html
    preview.gif
    qa-report.md
  status.json
  logs/
```

## Scripts

Use bundled scripts from this skill directory:

Production hash/format validation, native-review promotion, GIF generation, native-grid recovery, and atlas assembly require a Python interpreter with Pillow. Use the repo/project interpreter that can `import PIL` (or install Pillow explicitly); do not assume every `python3` on `PATH` resolves to the same environment. Image extraction/QA also requires ImageMagick, and motion intake requires `ffmpeg` plus `ffprobe`.

```bash
python3 skills/sprite-workflow/scripts/new-job.py --help
python3 skills/sprite-workflow/scripts/validate-manifest.py --help
python3 skills/sprite-workflow/scripts/make-contact-sheet.py --help
python3 skills/sprite-workflow/scripts/make-preview-gif.py --help
python3 skills/sprite-workflow/scripts/extract-chroma-sheet.py --help
python3 skills/sprite-workflow/scripts/make-qa-previews.py --help
python3 skills/sprite-workflow/scripts/qa-sprite-sheet.py --help
python3 skills/sprite-workflow/scripts/make-frame-zoom.py --help
python3 skills/sprite-workflow/scripts/motion-jitter-report.py --help
python3 skills/sprite-workflow/scripts/center-align-frames.py --help
python3 skills/sprite-workflow/scripts/smooth-settle-frame.py --help
python3 skills/sprite-workflow/scripts/compare-dicut-modes.py --help
python3 skills/sprite-workflow/scripts/score-candidates.py --help
python3 skills/sprite-workflow/scripts/promote-artifact.py --help
python3 skills/sprite-workflow/scripts/promote-named-artifact.py --help
python3 skills/sprite-workflow/scripts/prompt-catalog.py --help
python3 skills/sprite-workflow/scripts/verify-image-cockpit-catalog.py --help
python3 skills/sprite-workflow/scripts/make-native-review.py --help
python3 skills/sprite-workflow/scripts/bottom-align-frames.py --help
python3 skills/sprite-workflow/scripts/compare-action-scale.py --help
python3 skills/sprite-workflow/scripts/rollup-sprite-batch.py --help
python3 skills/sprite-workflow/scripts/extract-motion-reference.py --help
python3 skills/sprite-workflow/scripts/snap-native-grid.py --help
python3 skills/sprite-workflow/scripts/validate-snap-report.py --help
python3 skills/sprite-workflow/scripts/assemble-approved-atlas.py --help
python3 skills/sprite-workflow/scripts/validate-atlas-manifest.py --help
```

Key scripts:

- `new-job.py` — create a job folder, `job.json`, `prompt.md`, `provenance.md`, and status/log/outbox folders.
- `validate-manifest.py` — validate frame size, states, frames, file references, and provenance fields.
- `make-contact-sheet.py` — generate an HTML contact sheet from a manifest without external dependencies.
- `make-preview-gif.py` — generate animated GIF previews when Python Pillow is available; otherwise fail with a clear dependency message.
- `extract-chroma-sheet.py` — turn raw chroma-key imagegen sheets into transparent frames, a normalized sheet, GIF, and manifest without accepting baked checkerboard output.
- `make-qa-previews.py` — composite transparent sheets onto light/dark/checker backgrounds for asset-designer review.
- `qa-sprite-sheet.py` — gate sheet dimensions, alpha bounds, edge risk, center drift, bounds/silhouette drift, detached slivers, magenta residue, and appendage-width consistency.
- `make-frame-zoom.py` — generate zoomed all-frame and adjacent-frame strips for target-size visual/jitter review.
- `motion-jitter-report.py` — summarize center/bounds ranges and neighbor deltas from QA JSON.
- `center-align-frames.py` — shift extracted frames horizontally to a stable visual center while preserving baseline.
- `smooth-settle-frame.py` — replace a noisy settle frame with a stable neighbor/hold frame and rebuild sheet/preview with a tradeoff report.
- `compare-dicut-modes.py` — run edge-connected and color-distance+spill cleanup modes, generate QA previews/reports, and recommend a safe draft winner before visual review; edge-connected is the default when both pass unless spill is clearly better.
- `score-candidates.py` — rank candidate QA JSON reports before choosing a winner.
- `promote-artifact.py` — copy validated artifacts into a target folder only when provenance and human approval flags pass.
- `promote-named-artifact.py` — promote approved sheet/preview/manifest using explicit `<asset-name>-sprite-sheet.png`, `<asset-name>-preview.gif`, and `<asset-name>-manifest.json` filenames.
- `prompt-catalog.py` — validate, search, inspect, and render the MIT-attributed 107-example Image Cockpit prompt library plus reusable adapted templates.
- `verify-image-cockpit-catalog.py` — compare all 107 exact prompt fields against the pinned upstream checkout and refresh the hash receipt only after zero mismatches.
- `make-native-review.py` — create explicit pre-normalization review evidence tied to the source manifest.
- `bottom-align-frames.py` — apply clipping-safe integer Y translation without resizing or altering frame order.
- `compare-action-scale.py` — compare median body/composite scale across action QA reports; warning-first unless explicitly escalated.
- `rollup-sprite-batch.py` — map requested action/direction slots to delivered manifests, missing coverage, unique source IDs, and intentional reuse.
- `extract-motion-reference.py` — capability-gated, bounded ffmpeg intake for one human-selected cycle from a local video; it never generates art or samples an entire clip by default.
- `snap-native-grid.py` — bounded experimental recovery of a square native pixel grid from eligible nearest-neighbor-like PNG input; it refuses unsupported/low-confidence inputs.
- `assemble-approved-atlas.py` — deterministically assemble hashed `production-approved` frame manifests without scaling, trimming, rotation, or implicit approval.

## Workflow

1. Inspect target repo asset rules and current runtime contract. Decide whether the job needs only the core generation/cleanup path or optional motion-reference, native-grid, or atlas lanes; see `references/pipeline-phases.md`.
2. Search the attributed prompt library when useful (`prompt-catalog.py search ...`), inspect the exact original and source locator, or render an adapted parameterized template. Treat catalog text as a brief source, not generated-asset provenance.
3. Create a job with `new-job.py`; include literal target repo, kind, frame size, explicit frame count, action/direction, content and anchor policy, source lane, provenance usage, and stable lineage IDs where available.
4. Preserve Image Cockpit-style fields separately: positive prompt, negative prompt / avoid, notes, selected source, sprite/effect context, and tournament metadata. Write the concrete prompt/brief into `prompt.md` and any human constraints into `provenance.md`.
5. For hard animation/effect jobs, consider Image Cockpit-style parallel candidate lanes (`--tournament-candidates 3`) with isolated outboxes and a winner-selection QA pass. Dispatch subagents with literal paths. Use `references/subagent-prompts.md` for role templates.
6. If motion video is useful, record it as `reference-only`, select one true cycle explicitly, and run `extract-motion-reference.py`. Never treat whole-clip even sampling as a production loop or hard-code one provider.
7. Require outputs in `outbox/`: `manifest.json`, `frames/`, contact/native-review surfaces, optional `preview.gif`, and QA reports. Preserve raw generated/video/native-grid files separately from cleaned winner assets.
8. For chroma-key imagegen outputs, run `extract-chroma-sheet.py` instead of ad-hoc cleanup. It supports horizontal and explicit row-major 2D grids; component recovery fails closed rather than silently falling back. Compare dicut modes when needed, then run manifest, contact, alpha-background, body/FX, enclosed-hole, center/bounds/bottom, and motion QA.
9. Before normalization, create and inspect native review evidence. Use horizontal and bottom translation independently; never infer feet from detached FX. For mixed body/FX work, supply a body mask or fail closed. Compare body scale across related actions and roll up expected coverage/reuse for multi-action deliveries.
10. Review target-size output, adjacent frames, light/dark/checker alpha, motion progression, and one-cycle seam. Script warnings are evidence, not aesthetic approval. Fix extraction/regenerate when needed; use settle-frame replacement only for deliberate calm holds and report reduced motion.
11. Use native-grid recovery only for eligible square axis-aligned binary-alpha/opaque pixel-like PNGs. Refusal is a valid result. Preserve the report and upstream algorithm notices; pixel snapping does not cure source licensing or grant production approval.
12. Promote named artifacts only after explicit review. Assemble a runtime atlas only from hashed `production-approved` manifests under the strict atlas contract; atlas assembly preserves approval but does not create it.

## Read when needed

- `references/contract.md` — manifest schema and job JSON shape.
- `references/provenance-policy.md` — source vs reference vs production approval rules.
- `references/subagent-prompts.md` — bounded worker prompts and write policies.
- `references/repo-adapters.md` — repo-specific adapter notes for Traymori, Agent Halo, Otobun, and generic repos.
- `references/image-cockpit-patterns.md` — detailed workflow patterns borrowed from Image Cockpit: prompt fields, motion/effect presets, tournament lanes, runner/outbox rules.
- `references/prompt-presets.md` — Image Cockpit-style reusable prompt blocks for character, sprite animation, motion presets, image edit, and effect sheets.
- `references/runner-contracts.md` — Codex/imagegen worker contract: real raster outputs, blocker sidecars, staging rules, and per-workflow obligations.
- `references/tournament-scoring.md` — candidate isolation, quality classifications, scoring dimensions, and winner/publish gates.
- `references/asset-cleanup.md` — asset-designer cleanup strategy: alpha vs chroma-key, edge halos, QA backgrounds, delivery manifest, promotion gates.
- `references/dicut-cleanup.md` — asset-designer-guided chroma/dicut lane: edge-connected key removal, component-aware slicing, fine-edge risks, and QA gates.
- `references/master-sprite-first.md` — production path for approving a clean master sprite before animation when imagegen sheets drift or cleanup is fragile.
- `references/pipeline-phases.md` — phase router and end-to-end order across prompt, runtime QA, motion, native-grid, and atlas lanes.
- `references/prompt-catalog.md` — full 107-example attributed Image Cockpit prompt library, exact originals, reusable adapted templates, and CLI usage.
- `references/motion-reference-intake.md` — provider-neutral capability gate, bounded local video extraction, and selected-cycle provenance.
- `references/native-grid-snap-contract.md` / `references/pixel-snap-provenance.md` — stable/refusal scope and MIT-derived algorithm provenance.
- `references/atlas-contract.md` — strict hashed approved-manifest atlas input/output contract.
