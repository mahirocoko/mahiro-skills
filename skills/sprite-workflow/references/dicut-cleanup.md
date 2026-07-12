# Dicut cleanup lane

Use this lane when generated sprite sheets return an imperfect chroma matte and ordinary color-distance keying creates halos, translucent edges, or sliver artifacts.

This is the `asset-designer` cleanup lens applied to `sprite-workflow`.

## When to use

Use for generated sprite sheets with:

- fur, hair, feathers, tails, thin swords, or fine appendages;
- non-flat chroma backgrounds such as magenta/green gradients;
- subject colors close to the key color, e.g. pink ears/flowers near magenta;
- frame spacing that is visually regular but not exact enough for width/frames slicing;
- visible slivers between frames after extraction.

## Cleanup doctrine

1. Preserve the raw generated PNG unchanged.
2. Treat source as `source-candidate`, not production.
3. Prefer edge-connected background removal for fur/fine-edge work:
   - remove only key-colored regions connected to image/crop edges;
   - preserve interior pink/green details that are not connected to the background.
4. Use component-aware slicing when imagegen spacing is uneven:
   - detect foreground x-runs after edge-connected key removal;
   - crop each run with padding;
   - center each detected frame into the runtime cell.
5. Generate light/dark/checker previews and a cleanup report.
6. Run visual honesty gate at target size before promotion.

## Recommended command shape

```bash
python3 ~/.letta/skills/sprite-workflow/scripts/extract-chroma-sheet.py \
  --input raw-candidate.png \
  --output-dir outbox/dicut-candidate-1 \
  --frames 8 \
  --frame-size 176x176 \
  --chroma-key '#ff00ff' \
  --background-mode edge-connected \
  --slice-mode component-x-runs \
  --key-tolerance 0.16 \
  --component-run-padding 10 \
  --resize-percent 48 \
  --trim \
  --spill none \
  --state run \
  --sheet-name cat-samurai-run-sheet.png \
  --preview-name cat-samurai-run-preview.gif \
  --json
```

## Grid extraction and failures

Fixed slicing supports explicit two-dimensional grids with `--source-layout grid --source-columns N --source-rows N`; output order is always row-major. `component-grid` partitions the source by those nominal cell bounds before choosing bodies. Each populated cell must contain exactly one body that passes the derived (2% of cell area) or explicit `--component-min-body-area` threshold and `--component-center-confidence` gate. Uneven body sizes are valid; global-largest selection is not used.

Detached FX is assigned only to the cell containing its center. It may cross that boundary only by the explicit `--component-overflow-distance`; crops are clamped to the nominal cell plus that allowance. A missing or ambiguous body, a large competitor, or a component crossing farther into another cell rejects the entire recovery. Component recovery fails closed and never silently falls back to fixed slicing. Run a separate, explicit fixed-grid command only after reviewing and recording the failure.

Extraction and comparison output directories must be absent or empty, and artifact name options accept basenames only. This prevents stale files and path traversal from being mistaken for the current result.

If edge-connected cleanup leaves colored matte on semi-transparent edges, mark the output as draft and either regenerate with a stricter flat key or do targeted defringe/manual cleanup.

## QA risks for cat-samurai-like assets

- White fur can look fuzzy if matte/alpha remains too soft.
- Pink ears/flowers are close enough to magenta that global keying can destroy detail.
- Tail and sword can be mistaken for tiny detached slivers.
- Costume micro-detail can remain noisy even after extraction succeeds.
- Script QA may pass while visual quality still fails.

## Visual honesty requirement

Do not call a dicut result final just because extraction and QA scripts passed. Inspect target-size light/dark/checker previews. If the asset looks fuzzy, translucent, slivered, off-style, or detail-destroyed, report it as a failed/draft cleanup.

## Compare modes helper

Use `compare-dicut-modes.py` when you are unsure whether edge-connected cleanup or color-distance+spill cleanup is safer. It runs both modes, creates light/dark/checker previews, runs QA, writes `compare-dicut-modes.json` and `compare-dicut-modes.md`, and recommends a safe draft winner. Edge-connected is the default recommendation when both modes pass QA because it better preserves fur/fine edges and real pink/magenta details; spill must be clearly better before it wins.

Recommended shape:

```bash
python3 ~/.letta/skills/sprite-workflow/scripts/compare-dicut-modes.py \
  --input raw-candidate.png \
  --output-dir outbox/dicut-compare-candidate-1 \
  --frames 8 \
  --frame-size 176x176 \
  --chroma-key '#ff00ff' \
  --key-tolerance 0.16 \
  --resize-percent 28 \
  --slice-mode component-x-runs \
  --component-run-padding 8 \
  --gravity center \
  --state tea-sip \
  --sheet-name sprite-sheet.png \
  --preview-name preview.gif \
  --json
```

Do not treat the helper winner as final approval. It recommends a draft cleanup mode; the main agent still performs visual honesty review across light, dark, checker, and source-detail comparison. Do not judge only on dark previews. Spill cleanup is a fallback for obvious fringe, not a default replacement for edge-connected cleanup.

## Winner selection rule

For generated mascot sprites with pink ears, flowers, blush, or other detail close to a magenta key:

1. Prefer `edge-connected` when both modes pass QA and visual quality is close.
2. Use `spill` only when edge-connected leaves obvious fringe/residue on multiple QA backgrounds and spill does not visibly erase real pink/detail.
3. Always inspect light, dark, and checker previews. Do not choose by dark preview alone.
4. If both modes require tradeoffs, keep the output as draft and regenerate with a better flat key or a safer key color.

## Subtle-loop stability

For idle, breathing, sipping, sleeping, or other subtle loops, center checks are not enough. A frame can keep a similar center while its alpha bounds get wider or shift because of a tail/sword/halo fragment, causing a visible one-frame pop.

Use `qa-sprite-sheet.py` bounds checks when reviewing subtle loops:

```bash
python3 ~/.letta/skills/sprite-workflow/scripts/qa-sprite-sheet.py sheet.png \
  --frames 8 \
  --frame-size 176x176 \
  --max-center-range 12 \
  --max-bounds-x-range 4 \
  --max-bounds-width-range 4 \
  --report qa.json \
  --json
```

If a single settle frame jitters, do not blindly shift it by center math only. Compare adjacent frames at zoom size and choose the less distracting fix: recut/clear a sliver, shift the frame, or repeat a stable settle frame if the motion is meant to be calm.

## Review helpers after cleanup

For subtle loops, use these deterministic helpers after QA previews:

```bash
python3 ~/.letta/skills/sprite-workflow/scripts/make-frame-zoom.py sheet.png \
  --output-dir outbox/review \
  --frames 8 \
  --frame-size 176x176 \
  --adjacent 6 \
  --json

python3 ~/.letta/skills/sprite-workflow/scripts/motion-jitter-report.py qa.json \
  --output outbox/review/motion-jitter.json \
  --json
```

If one generated settle frame pops, use `smooth-settle-frame.py` only after visual review and record the tradeoff. Repeating a stable settle frame can be better than preserving noisy motion, but it is an explicit aesthetic decision, not an automatic cleanup.

For flat runtime asset folders, prefer `promote-named-artifact.py` over generic `promote-artifact.py` so promotion writes `<asset-name>-sprite-sheet.png`, `<asset-name>-preview.gif`, and `<asset-name>-manifest.json` instead of `manifest.json` and `frames/*`.
