---
name: sprite-workflow
description: CLI-first sprite/Codex handoff workflow for sprite sheets, mascot frames, contact sheets, preview GIFs, QA, and promotion gates. Use when creating sprite sheets, slicing animation frames, preparing Codex/imagegen handoff jobs, reviewing mascot assets, or promoting generated sprite artifacts into a repo.
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
- Passing scripts/QA does not mean an asset is production-ready. Inspect the actual output at target size before saying final/done/promoted; if silhouette, detail, alpha, animation readability, or style quality is weak, report it honestly and stop promotion.
- Decide true alpha vs chroma-key source before generation. If generated transparency bakes checkerboard/white matte, switch to chroma-key and run cleanup/QA rather than accepting it as final.

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

## Workflow

1. Inspect target repo asset rules and current runtime contract.
2. Create a job with `new-job.py`; include literal target repo, kind, frame size, states, source lane, and provenance usage.
3. Preserve Image Cockpit-style fields separately: positive prompt, negative prompt / avoid, notes, selected source, sprite/effect context, and tournament metadata. Write the concrete prompt/brief into `prompt.md` and any human constraints into `provenance.md`.
4. For hard animation/effect jobs, consider Image Cockpit-style parallel candidate lanes (`--tournament-candidates 3`) with isolated outboxes and a winner-selection QA pass. Dispatch subagents with literal paths. Use `references/subagent-prompts.md` for role templates.
5. Require outputs in `outbox/`: `manifest.json`, `frames/`, `contact-sheet.html`, optional `preview.gif`, and `qa-report.md`. Preserve raw generated files separately from cleaned winner assets.
6. For chroma-key imagegen outputs, run `extract-chroma-sheet.py` instead of ad-hoc ImageMagick cleanup. When the matte is imperfect or the asset has fur/fine edges, run `compare-dicut-modes.py` to compare edge-connected vs color-distance+spill cleanup before choosing a draft. Treat edge-connected as the safer default when the subject has pink/magenta details near a magenta key; only prefer spill when it is clearly better across light/dark/checker previews and does not erase real detail. Then run `validate-manifest.py`, `make-contact-sheet.py`, `make-qa-previews.py`, and `qa-sprite-sheet.py`; if center drift is flagged, run `center-align-frames.py` and QA again. Run `make-preview-gif.py` when Pillow is available or when a repo-local Python environment provides it.
7. Review target-size QA before promotion, including light/dark/checker previews when the asset has transparency or chroma-key cleanup. For idle/subtle loops, run `make-frame-zoom.py` and `motion-jitter-report.py`; inspect adjacent-frame zooms or the preview GIF for one-frame pops because center drift can pass while alpha-bounds width/x drift still causes visible jitter. Treat this as a visual honesty gate, not a rubber stamp: if the asset looks fuzzy, overly translucent, detail-destroyed, poorly animated, off-style, or otherwise not good enough, say so and do not call it final.
8. If QA flags missing appendages/tail, edge contact, residue, center drift, bounds drift, or visual weakness, fix extraction settings or regenerate; do not swap in a worse-motion candidate just because one detail is preserved. For calm settle/hold phases only, `smooth-settle-frame.py` may replace a noisy frame with a stable neighbor, but report the reduced motion tradeoff.
9. Promote with `promote-named-artifact.py --approve --asset-name <name>` only after Mahiro/main agent approves when targeting flat runtime folders such as `public/assets`; avoid generic `manifest.json` / `frames/*` outputs unless the target folder is dedicated to one asset.

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
