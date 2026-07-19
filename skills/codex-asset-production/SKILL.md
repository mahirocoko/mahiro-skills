---
name: codex-asset-production
description: Coordinates Codex imagegen and asset-designer/dicut lanes for production-ish web/game visual assets and bounded game-VFX asset production. Use when asset work needs Codex to generate source art, cut out, clean up, QA, or report provenance for mascots, icons, UI plates, props, share cards, sprite-like assets, or effect textures/atlases.
---

# Codex Asset Production

## Overview
Use this workflow when Mahiro wants Codex to act as the visual designer for production-ish assets, not just a mood-board generator. The main agent owns art direction, contracts, repo integration, and final reporting; Codex owns image generation plus asset-designer-style cutout/cleanup and edge QA whenever possible. Do not conflate Codex procedural PNG/script output with real imagegen output: procedural drafts are diagnostic/reference candidates unless the lane explicitly used image generation.

## Skill routing

| User intent | Use |
| --- | --- |
| Decide what assets a UI/page needs, filenames, layers, QA, delivery manifest | `asset-designer` |
| Write/refine one production-ready image prompt/spec | `web-asset-prompts` |
| Have Codex generate/source/clean/QA production-ish asset families | `codex-asset-production` |
| Sprite sheets, animation frames, raster bodies, frame QA, GIF previews, promotion gates | `sprite-workflow` |
| Runtime VFX design, timing, emitters, shaders, and integration architecture | `vfx-workflow` |
| Source textures, dicut, atlases, and bounded composite QA for game VFX | `codex-asset-production` |
| Open tmux panes for Gemini/Cursor/Agy/Codex execution | `direct-cli` as executor layer only |


## Steps
1. **Define the asset contract before generation**
   - Write or update a short manifest: asset family, intended use, source references, allowed output folder, states/variants, background/alpha expectations, QA surfaces, and promotion status.
   - Propagate the owning workflow's source requirement unchanged: `imagegen-required`, `manual-rig-allowed`, or `diagnostic-only`. Do not reinterpret an imagegen-required action family as permission for a procedural or transform-rig substitute.
   - Separate asset families instead of generating a full screen and cropping it later: e.g. mascot states, nav/action icons, UI surfaces/background plates, decorative props, share-card elements.
   - Mark generated Thai/English text in images as placeholder/reference unless copy has been separately authored.

2. **Open Codex designer/dicut lanes**
   - Use interactive Codex/tmux lanes when available; attach the relevant reference images and the manifest.
   - Resolve each Codex lane's current model/effort through `direct-cli`; do not duplicate a stale model catalog here and do not invent effort-suffixed slugs such as `gpt-5.6-sol-high`. Keep the model slug and `model_reasoning_effort` separate at launch.
   - Give each lane one clear asset family and constrain writes to that family folder or a scratch folder. Multiple panes are OK when families are independent.
   - Prefer two explicit passes when quality matters: an imagegen/source-sheet lane first, then a separate dicut-only lane that reads the source sheet and owns cutout/cleanup/QA. This avoids silently letting the main shell become the final dicut owner after an imagegen lane succeeds.
   - Ask Codex to use the asset-designer lens: create source art, cut/clean the assets, inspect edges, produce QA previews/contact sheets, and update manifests with honest status. If strict asset-designer behavior matters, explicitly require Codex to read/load the asset-designer skill before generation or dicut; do not rely on the main agent's contract language as proof every lane used the skill.
   - If the intended pass is imagegen, say so explicitly in the lane prompt (for example, generate raster source sheets with image generation before dicut). If Codex instead produces assets procedurally via scripts/libraries, label the output as a procedural draft/reference, not an imagegen pass.
   - For an `imagegen-required` handoff, collect the raw generated raster artifacts and a hash-bound provider receipt before returning to `sprite-workflow`. If those are absent, treat the lane as blocked; do not let later dicut, manifest, or mechanical QA upgrade it.

3. **Orchestrate multi-lane Codex imagegen jobs when speed or diversity matters**
   - One asset job can use one tmux session with multiple Codex panes; use `direct-cli` for the pane mechanics. Do not create scattered one-pane sessions for one visual problem.
   - Treat Codex `ultra` as a job-level automatic-delegation choice, not a default for every pane. Do not combine several manual Codex panes with ultra in every pane unless Mahiro explicitly wants nested fanout and accepts the extra token/coordination cost. Prefer either explicit manual lanes with ordinary effort or one deliberate ultra lane for a large parallelizable asset job.
   - Choose the fanout mode deliberately:
     - **Same-prompt fanout** for independent visual diversity: paste the exact same imagegen/source prompt into multiple Codex panes with tmux buffer fanout, and keep each lane isolated until the main agent compares outputs.
     - **Role fanout** for pipeline speed: split `source/imagegen`, `variant exploration`, `dicut/cleanup`, `QA/contact-sheet`, and optional `review/critique` lanes.
   - Keep a lane registry before launch: pane title, model, role, allowed paths, output directory, and whether the lane may write. Example roles: `codex-source-a`, `codex-source-b`, `codex-dicut`, `codex-qa`.
   - Give each source lane its own scratch/output folder; never let parallel lanes write the same canonical asset path. Main agent collects Codex imagegen outputs from lane folders or `$CODEX_HOME/generated-images/...`, records provenance, and promotes only accepted files.
   - Main agent should act as orchestrator: define contract, dispatch lanes early, capture pane outputs, compare candidates, pick winners, assign final cleanup, inspect actual files, then integrate. Do not let a lane self-promote its own output into runtime paths without main-agent review.
   - Use subagents alongside direct panes when useful: repo-scout for asset contracts/runtime paths, sprite-forge for sprite/frame QA, ui-review for in-app composition, thai-copy-review/kien-thai for copy-bearing images, and asset-designer for alpha/edge review.

4. **Use a bounded game-VFX orchestration lane**
   - Route runtime VFX design, timing, emitters, shaders, and integration architecture to `vfx-workflow`; route raster contracts, extraction, alpha/frame validation, canonical atlas assembly, and frame promotion to `sprite-workflow`. This lane owns bounded candidate execution and handoff for source effects, cleanup, candidate atlas layout, and composite review—not collision/damage semantics, VFX runtime architecture, canonical validation, or promotion.
   - Define the contract first: effect taxonomy and mechanical geometry (for example telegraph, trail, impact, aura, or screen-space accent plus radius/arc/path/footprint), friendly/hostile/neutral ownership, target viewport and actual-size footprint, and a body-free source requirement. Source sheets must isolate the effect from characters, projectiles, weapons, UI labels, and scene backgrounds.
   - Record alpha and blend expectations (`straight` or `premultiplied`; `alpha`, `additive`, or another named mode), luminance/color envelope across intended backgrounds, and a reduced-effects fallback that preserves mechanical readability without relying on bloom, hue alone, or high-intensity flashes.
   - Use explicit roles: `vfx-source` generates isolated source effects; `vfx-dicut` executes matte/residue cleanup and returns candidate alpha evidence under the `sprite-workflow` contract; `vfx-atlas` prepares a candidate trim/padding/order/UV handoff but never replaces `sprite-workflow` validation, approved-atlas assembly, or promotion; `vfx-runtime-composition` builds review composites in the real target viewport/runtime; `vfx-accessibility-review` checks ownership readability, luminance/color limits, and the reduced-effects fallback.
   - Keep existing executor, candidate, cleanup, and promotion boundaries: each role writes only to its assigned scratch/family path, never self-promotes, and reports provenance including source lane/model/prompt plus file hashes for accepted inputs and outputs. The main agent selects candidates and promotes only after cleanup and QA.
   - Require real-runtime composite QA with actual stage layers, camera scale, blend mode, ownership variants, and reduced-effects mode. Contact sheets and synthetic previews are supporting evidence, not runtime approval.
   - Do not copy or reimplement Image Cockpit UI/state; consume only the narrow asset contract and outputs needed by the owning runtime workflow.

5. **Generate assets by role, not by screen crop**
   - For icons, generate icon sheets or individual icons explicitly; prefer SVG/CSS-colorable redraws for production if raster icons fail dark/light theming.
   - For faithful icon SVG refinement, especially when Mahiro says to use `direct-cli`/Agy/Gemini 3.5 High, open an Agy lane with the visible model set to Gemini 3.5 Flash (High), constrain writes to the icon SVG/QA/manifest paths, and have it redraw/trace from the named reference rather than inventing new metaphors. If the user wants exact source alignment, narrow the visual source to the specified contact sheet and compare generated SVGs over that source; adjust only mismatched parts.
   - For mascots, generate state-specific isolated source art with a consistent character model.
   - For UI plates/surfaces, treat CSS as the production default unless raster alpha survives edge QA and responsive constraints.
   - When a UI plate source is already visually good, prefer dicut/cleanup over regeneration: crop by explicit role/cell, preserve material texture and intended dark/light pixels, remove only backing/guides/residue, and avoid global flood-fill or over-transparent cleanup that erases wood/parchment/paint character.
   - For props/share elements, split only pieces that survive edge checks; reject pieces with halos, holes, text residue, or weak silhouettes.
   - For building/object source sheets, a pretty illustration board is not enough: require clear grid/cell spacing, generous padding around every asset, no crowded bottom rows, and a flat or easily sampled background before dicut. If equal-grid cropping touches neighboring pieces, switch to full-sheet background removal plus connected-component bounds instead of forcing fixed cell crops.
   - When the user asks for faithful reference alignment, compare the generated source against the named reference before cleanup: geometry, proportions, role, and visual language must match. If it merely borrows the mood while inventing a new kit, label it `inspired/drifted candidate`, do not promote it, and regenerate or defer before dicut.

6. **Prefer chroma-key sources over fake transparency**
   - If direct transparent PNGs show checkerboards or uncertain alpha, reject them and use a clean chroma key that does not appear in the art.
   - For generated sprite sheets, request an exact flat chroma background, no gradient/lighting/shadow/glow/anti-alias matte around the silhouette, generous spacing between frames, and one isolated character per cell. If the provider instead returns a larger canvas or slightly non-byte-exact chroma but every requested full-body frame remains unambiguous and recoverable, preserve the untouched raster/receipt and return `source-ready-normalization-required` to `sprite-workflow`; do not self-reject solely because raw provider pixels are not runtime-final.
   - Sample the actual matte/background color from the generated source instead of assuming the requested key was exact (for example, a requested `#ff00ff` can come back as a nearby magenta gradient or shaded matte). Use fuzzed transparency carefully and preserve sRGBA/alpha rather than accidentally converting the image to grayscale or dropping channels.
   - Verify alpha by compositing on light, sky/cream, peach, checker, and dark backgrounds; do not trust a contact sheet or checkerboard preview as real transparency.

7. **Make Codex own final dicut and edge QA**
   - Codex should perform the cutout/cleanup and inspect edges using asset-designer criteria.
   - Start dicut lanes in normal workspace-write when possible, but if Codex hits sandbox write errors, stop and ask before retrying with scoped full-access. State the allowed paths, no-app-code, no-destructive, and no-commit constraints in the prompt.
   - Have Codex write trial outputs to a separate folder first. The main agent should compare trial vs canonical QA, ask/confirm before replacement, then move accepted outputs into canonical paths and remove or neutralize duplicate trial assets so future implementers do not pick the wrong folder.
   - Main-shell cleanup is only diagnostic/integration fallback unless Mahiro explicitly approves it as final. Do not claim main-shell cutouts are final Codex dicut.

8. **QA before promotion**
   - Require contact sheets and previews on multiple backgrounds, but also open the actual output PNGs: contact sheets can hide loose trim, star/dot bounding-box bloat, or edge residue.
   - For SVG icon QA, do not rely on ImageMagick rasterization when stroke rendering looks suspicious; use browser-rendered HTML previews/screenshots instead. If direct source matching matters, add an overlay QA view that places the SVG over the reference/contact sheet, regenerate it after patches, and keep reports honest about single-color `currentColor` limitations versus watercolor/texture parity.
   - Build composition mocks from the real target stage/runtime layers plus the candidate PNGs, not from QA preview composites, debug labels, or contact-sheet screenshots; rebuild mocks after replacing canonical cleaned assets.
   - For hard chroma sprite sheets, compare cleanup modes instead of guessing: edge-connected key removal usually preserves interior pink/detail better, while color-distance plus magenta spill cleanup can reduce fringe but may eat details. Prefer component-aware frame slicing over naive `width / frameCount` slicing when tails, swords, or silhouette edges cross nominal cell boundaries. Do not choose the winner from dark preview alone; compare light, dark, checker, and source/detail preservation before overriding the edge-connected safe default.
   - For subtle/idle animation loops, center drift checks are not enough. Inspect adjacent-frame zooms/GIFs and bounds x/width/height ranges so one wider or shifted silhouette frame does not slip through as visual jitter. If a settle frame jitters from cleanup residue or silhouette drift, a stable neighboring hold frame can be a better review draft than preserving tiny noisy motion.
   - Inspect dark backgrounds for matte residue, light backgrounds for white halos, checker previews for accidental opaque pixels, and actual-size/crop views for readability.
   - Treat loose trim, matte/chroma fringe, holes, sliver components from neighboring assets, or source-background residue as cleanup failures, not production candidates; compare cleaned outputs against previous diagnostics before marking them improved. When using region/alpha cleanup, verify it did not convert colors to grayscale, leave visible rectangular artifacts, or erase intentional small details.
   - Update the manifest with per-asset status: candidate/reference, rejected/regenerate, CSS/SVG preferred, diagnostic/history, or runtime-promoted.
   - Avoid accumulating parallel `clean/`, `final/`, or redo folders when the user wants the current asset set replaced; move accepted cleaned outputs into the canonical folder and delete stale diagnostics/QA that would make implementers pick the wrong file.
   - Keep runtime promotion separate from design-reference approval until the app has concrete asset path, size, and responsive contracts.
   - Once a candidate is accepted into a fixed-size runtime surface, measure the actual DOM/target boxes before export, create delivery PNGs at those sizes in a runtime-specific folder, and point CSS/runtime imports there. Keep large clean/source masters separate; if fixed-size export reveals edge artifacts, rebuild from a trimmed/centered master instead of hiding the issue with CSS.

9. **Report provenance and limitations**
   - Say which lane generated each source, which lane performed dicut/cleanup, and which assets were rejected.
   - Be explicit about limitations like rough alpha, dark-mode failure, raster-not-production, or text placeholders.

## Common Pitfalls
- Treating Codex as a pure idea generator and letting the main shell do final cutouts after Mahiro asked Codex to own dicut.
- Assuming a requested magenta background is a flat chroma key; imagegen may return gradients, shaded mattes, or anti-aliased fringe that need edge-aware cleanup and visual QA.
- Calling procedural/script-generated Codex assets an imagegen pass when no image generation was actually used.
- Generating one full-screen composition, slicing pieces out, and calling them production assets.
- Trusting fake checkerboard transparency or failing to inspect alpha on dark backgrounds.
- Promoting raster icons that only work on light cream surfaces into themeable production UI.
- Calling a candidate/reference asset runtime-ready before the implementation has size/path/token constraints.
- Scaling large source/clean UI assets directly in production CSS after the runtime size is known, which can hide blurry edges or reveal unbalanced transparent padding later.
- Leaving manifests with stale `pending` or overconfident status after a cleanup/QA pass.

Related skills: pair with `asset-designer` for cleanup/alpha/edge QA, `web-asset-prompts` for per-asset prompt wording, `sprite-workflow` for raster body/sprite-sheet/frame promotion gates, `vfx-workflow` for runtime VFX design and architecture, and `direct-cli` when opening bounded Codex/Gemini/Agy lanes.
