# Asset cleanup and QA preview strategy

Pair `sprite-workflow` with the `asset-designer` lens whenever generated sprite assets need to become practical runtime assets.

## Role split

- `sprite-workflow`: job orchestration, Codex handoff, subagent lanes, sprite manifests, frame slicing, contact sheets, GIF previews, promotion gates.
- `asset-designer`: asset role, source strategy, cutout/chroma-key decision, edge cleanup plan, QA backgrounds, delivery manifest, production-readiness assessment.
- `web-asset-prompts`: final prompt wording for one generated asset when prompt precision matters.

## Decide alpha vs chroma-key before generation

Default decision matrix:

| Situation | Choose | Why |
| --- | --- | --- |
| Generator reliably returns true alpha | transparent PNG | least cleanup |
| Alpha returns checkerboard/white matte | chroma-key source | easier controlled extraction |
| Subject is white/fur/light | magenta key `#ff00ff` | avoids erasing white subject pixels |
| Subject is pink/magenta-heavy | green key `#00ff00` | avoids erasing pink details |
| Subject has both green and magenta | use a high-contrast custom key and document it | avoid subject-color collision |
| Edge softness matters | source-candidate + manual cleanup | simple threshold masks may fringe |

Do not ask for “transparent” and accept a checkerboard preview as production. If the model bakes checkerboard or white/gray matte into the raster, classify it as a source candidate and either regenerate with a chroma-key source or clean it explicitly.

## Folder convention

Keep outputs non-destructive:

```txt
outbox/
  raw-generated/          # unmodified imagegen outputs
  candidates/<id>/        # isolated candidate outputs/logs
  winner/
    frames/
    manifest.json
    sheet.png
    preview.gif
    contact-sheet.html
    qa-report.md
    preview-light.png
    preview-dark.png
    preview-checker.png
```

Production folders should receive only approved runtime artifacts. Keep raw, source, QA, and logs out of runtime globs unless the target repo explicitly wants docs evidence.

## Cleanup checklist

Before calling a sprite asset usable:

- transparent corners are actually transparent
- no checkerboard, matte, white box, or chroma-key color remains around the subject
- no obvious edge fringe/halo on dark and light backgrounds
- fine details survive cleanup, especially white fur, hair, ears, hands, props, and small flowers
- frame dimensions match the manifest exactly
- visual baseline and scale are stable unless the motion intentionally changes height
- motion reads at target preview size
- no text, watermark, labels, frame numbers, UI panels, or grid lines
- raw generated files and cleanup notes are preserved for provenance

## QA previews

Always prefer at least these backgrounds for candidate review:

- dark: catches light matte/white fringe
- light: catches dark outline damage and transparent holes
- checker: catches alpha holes and transparent bounds
- target runtime background when known

For sprites, check both the sheet and animated preview. A single still contact sheet can look acceptable while the GIF reveals baseline jitter or frame timing issues.

## Delivery manifest row

Use this compact asset-designer row when handing off a sprite candidate:

| filename | role | format | source strategy | expected QA checks | notes |
| --- | --- | --- | --- | --- | --- |
| `winner/sheet.png` | transparent sprite sheet | PNG | imagegen chroma-key source + local cleanup | dimensions, alpha, halo, frame count, baseline, motion | source-candidate until approved |
| `winner/preview.gif` | animation preview | GIF | generated from frames | smoothness, final hold, target-size readability | review only |
| `winner/contact-sheet.html` | QA contact sheet | HTML | local script | per-frame inspection | not runtime |
| `winner/qa-report.md` | QA/provenance report | Markdown | manual + script output | blockers/caveats recorded | not runtime |

## Promotion rule

Promotion requires all of:

1. Manifest validates.
2. QA previews pass on light/dark/checker or caveats are accepted.
3. Provenance usage is `production-approved`, or `source-candidate` is explicitly allowed with human approval.
4. Runtime target path is known and does not import QA/source/log folders accidentally.

## CLI pipeline, not manual one-off cleanup

For chroma-key imagegen sheets, prefer this pipeline over ad-hoc commands:

```bash
python3 ~/.letta/skills/sprite-workflow/scripts/extract-chroma-sheet.py \
  --input outbox/raw-generated/candidate.png \
  --output-dir outbox/winner \
  --frames 8 \
  --frame-size 176x176 \
  --chroma-key '#ff00ff' \
  --source-cell-width 243 \
  --crop-width 254 \
  --crop-height 470 \
  --crop-y 170 \
  --resize-percent 42 \
  --trim \
  --spill magenta

python3 ~/.letta/skills/sprite-workflow/scripts/make-qa-previews.py outbox/winner/sprite-sheet.png
python3 ~/.letta/skills/sprite-workflow/scripts/qa-sprite-sheet.py outbox/winner/sprite-sheet.png \
  --frames 8 \
  --frame-size 176x176 \
  --preserve-right-appendage \
  --report outbox/winner/qa.json
```

If a QA gate fails, adjust extraction settings or regenerate from the same motion contract. Do not replace a good-motion winner with a worse candidate only to preserve a single detail such as a tail.

## Center drift and sliver QA

After extraction, run center and detached-sliver gates before promotion:

```bash
python3 ~/.letta/skills/sprite-workflow/scripts/qa-sprite-sheet.py outbox/winner/sprite-sheet.png \
  --frames 8 \
  --frame-size 176x176 \
  --allow-bottom-edge \
  --preserve-right-appendage \
  --target-center-x 88 \
  --max-center-drift 4 \
  --max-center-range 6 \
  --max-sliver-components 0 \
  --report outbox/winner/qa.json
```

If center drift is real but the candidate is otherwise good, align frames from the sheet rather than swapping candidates:

```bash
python3 ~/.letta/skills/sprite-workflow/scripts/center-align-frames.py \
  --input outbox/winner/sprite-sheet.png \
  --output-dir outbox/winner-centered \
  --frames 8 \
  --frame-size 176x176 \
  --target-center-x 88
```

Use sliver clear regions or better extraction settings for detached artifacts. Do not let automated QA pass if visible detached slivers remain in light/dark/checker previews.
