---
name: codex-asset-production
description: Coordinates Codex imagegen/source-art lanes and explicit Codex dicut fallback or A/B work for production-ish web/game visual assets. Use when asset work needs Codex-generated source art, Codex-specific provenance, or a named fallback after Agy/Gemini dicut is unavailable or visibly weaker.
---

# Codex Asset Production

## Overview
Use this workflow when Mahiro wants Codex to generate production-ish source art or serve as an explicit dicut fallback/A-B lane, not just a mood-board generator. The main agent owns art direction, contracts, repo integration, and final reporting. Codex owns its image-generation/source artifacts and any specifically assigned fallback candidate; `asset-designer` owns the cross-provider dicut route, where Agy/Gemini is tried first on comparable semantic extraction work. Do not conflate Codex procedural PNG/script output with real imagegen output: procedural drafts are diagnostic/reference candidates unless the lane explicitly used image generation.

## Skill routing

| User intent | Use |
| --- | --- |
| Decide what assets a UI/page needs, filenames, layers, QA, delivery manifest | `asset-designer` |
| Write/refine one production-ready image prompt/spec | `web-asset-prompts` |
| Dicut, remove backgrounds, clean edges, or separate layers | `asset-designer`; use Agy/Gemini first and this skill only for a named Codex fallback/A-B |
| Have Codex generate/source production-ish asset families | `codex-asset-production` |
| Sprite sheets, animation frames, raster bodies, and bounded candidate QA | The target repo owns the runtime contract; this skill owns only Codex source or explicitly assigned fallback candidates |
| Runtime VFX design, timing, emitters, shaders, collision truth, and integration | The target repo's gameplay/VFX owner |
| Codex-generated source textures, fallback dicut candidates, atlases, and bounded composite QA for game VFX | `codex-asset-production` under the target repo's contract |
| Open panes for Cursor/Agy/Codex/Pi execution | `direct-cli` as executor layer only |


## Steps
1. **Define the asset contract before generation**
   - Write or update a short manifest: asset family, intended use, source references, allowed output folder, states/variants, background/alpha expectations, QA surfaces, and promotion status.
   - Propagate the owning workflow's source requirement unchanged: `imagegen-required`, `manual-rig-allowed`, or `diagnostic-only`. Do not reinterpret an imagegen-required action family as permission for a procedural or transform-rig substitute.
   - Separate asset families instead of generating a full screen and cropping it later: e.g. mascot states, nav/action icons, UI surfaces/background plates, decorative props, share-card elements.
   - Mark generated Thai/English text in images as placeholder/reference unless copy has been separately authored.

2. **Open Codex source lanes and the selected dicut handoff**
   - Use interactive Codex/tmux lanes when available; attach the relevant reference images and the manifest.
   - Resolve each Codex lane's current model/effort through `direct-cli`; do not duplicate a stale model catalog here and do not invent effort-suffixed slugs such as `gpt-5.6-sol-high`. Keep the model slug and `model_reasoning_effort` separate at launch.
   - Give each lane one clear asset family and constrain writes to that family folder or a scratch folder. Multiple panes are OK when families are independent.
   - Prefer two explicit passes when quality matters: a Codex imagegen/source-sheet lane first, then an `asset-designer` handoff that assigns Agy/Gemini as the first semantic-dicut candidate writer. Open a Codex dicut lane only when an explicit fallback trigger or same-input A/B requires it.
   - Ask Codex source lanes to create source art, inspect source fidelity, produce source previews/contact sheets, and update manifests with honest status. If Codex receives a fallback dicut assignment, explicitly require it to load the asset-designer criteria and write to a separate candidate folder; do not let it overwrite the Agy candidate or canonical outputs.
   - If the intended pass is imagegen, say so explicitly in the lane prompt (for example, generate raster source sheets with image generation before dicut). If Codex instead produces assets procedurally via scripts/libraries, label the output as a procedural draft/reference, not an imagegen pass.
   - For an `imagegen-required` handoff, collect the raw generated raster artifacts and a hash-bound provider receipt before returning to the current task owner. If those are absent, treat the lane as blocked; do not let later dicut, manifest, or mechanical QA upgrade it.

3. **Orchestrate multi-lane Codex imagegen jobs when speed or diversity matters**
   - One asset job can use one tmux session with multiple Codex panes; use `direct-cli` for the pane mechanics. Do not create scattered one-pane sessions for one visual problem.
   - Treat Codex `ultra` as a job-level automatic-delegation choice, not a default for every pane. Do not combine several manual Codex panes with ultra in every pane unless Mahiro explicitly wants nested fanout and accepts the extra token/coordination cost. Prefer either explicit manual lanes with ordinary effort or one deliberate ultra lane for a large parallelizable asset job.
   - Choose the fanout mode deliberately:
     - **Same-prompt fanout** for independent visual diversity: paste the exact same imagegen/source prompt into multiple Codex panes with tmux buffer fanout, and keep each lane isolated until the main agent compares outputs.
     - **Role fanout** for pipeline speed: split Codex `source/imagegen`, `variant exploration`, Agy `dicut/cleanup`, optional Codex `dicut-fallback`, `QA/contact-sheet`, and optional `review/critique` lanes.
   - Keep a lane registry before launch: pane title, model, role, allowed paths, output directory, and whether the lane may write. Example roles: `codex-source-a`, `codex-source-b`, `agy-dicut`, `codex-dicut-fallback`, `asset-qa`.
   - Give each source lane its own scratch/output folder; never let parallel lanes write the same canonical asset path. Bind every generated artifact to that lane's exact provider-returned path plus available session/result identity at generation time, then copy that exact artifact into the lane folder. Never discover concurrent outputs by global newest-file or modification-time search in a shared generated-images root; if the exact mapping is missing, fail that lane instead of guessing. Compare hashes before presentation and investigate unexpected duplicates.
   - Main agent should act as orchestrator: define contract, dispatch lanes early, capture pane outputs, compare candidates, pick winners, assign final cleanup, inspect actual files, then integrate. Do not let a lane self-promote its own output into runtime paths without main-agent review.
   - Use temporary specialist roles alongside direct panes only when the current runtime exposes them: repo-scout for asset contracts/runtime paths, sprite-forge for sprite/frame QA, ui-review for in-app composition, thai-copy-review/kien-thai for copy-bearing images, and asset-designer for alpha/edge review. These role labels are not packaged skill dependencies; preserve the bounded role split with available tools when a named specialist is absent.

4. **Use a bounded game-VFX orchestration lane**
   - Route runtime VFX design, timing, emitters, shaders, collision/damage semantics, canonical validation, and promotion to the target repo's gameplay/VFX owner. This lane owns bounded candidate execution and handoff for source effects, cleanup, candidate atlas layout, and composite review—not runtime architecture or product acceptance.
   - Define the contract first: effect taxonomy and mechanical geometry (for example telegraph, trail, impact, aura, or screen-space accent plus radius/arc/path/footprint), friendly/hostile/neutral ownership, target viewport and actual-size footprint, and a body-free source requirement. Source sheets must isolate the effect from characters, projectiles, weapons, UI labels, and scene backgrounds.
   - Record alpha and blend expectations (`straight` or `premultiplied`; `alpha`, `additive`, or another named mode), luminance/color envelope across intended backgrounds, and a reduced-effects fallback that preserves mechanical readability without relying on bloom, hue alone, or high-intensity flashes.
   - Use explicit roles: `vfx-source` generates isolated source effects; `vfx-dicut` executes matte/residue cleanup and returns candidate alpha evidence to the current task owner; `vfx-atlas` prepares a candidate trim/padding/order/UV handoff but never claims canonical runtime assembly or promotion; `vfx-runtime-composition` builds review composites in the real target viewport/runtime; `vfx-accessibility-review` checks ownership readability, luminance/color limits, and the reduced-effects fallback.
   - Keep existing executor, candidate, cleanup, and promotion boundaries: each role writes only to its assigned scratch/family path, never self-promotes, and reports provenance including source lane/model/prompt plus file hashes for accepted inputs and outputs. The main agent selects candidates and promotes only after cleanup and QA.
   - Require real-runtime composite QA with actual stage layers, camera scale, blend mode, ownership variants, and reduced-effects mode. Contact sheets and synthetic previews are supporting evidence, not runtime approval.
   - Do not copy or reimplement Image Cockpit UI/state; consume only the narrow asset contract and outputs needed by the owning runtime workflow.

5. **Generate assets by role, not by screen crop**
   - For icons, generate icon sheets or individual icons explicitly; prefer SVG/CSS-colorable redraws for production if raster icons fail dark/light theming.
   - For faithful icon SVG refinement, especially when Mahiro asks for a direct-cli Agy/Gemini lane, select the exact current model through `direct-cli` live preflight instead of copying a historical display label. Constrain writes to the icon SVG/QA/manifest paths and have the lane redraw/trace from the named reference rather than inventing new metaphors. If the user wants exact source alignment, narrow the visual source to the specified contact sheet and compare generated SVGs over that source; adjust only mismatched parts.
   - For mascots, generate state-specific isolated source art with a consistent character model.
   - For UI plates/surfaces, treat CSS as the production default unless raster alpha survives edge QA and responsive constraints.
   - When a UI plate source is already visually good, prefer dicut/cleanup over regeneration: crop by explicit role/cell, preserve material texture and intended dark/light pixels, remove only backing/guides/residue, and avoid global flood-fill or over-transparent cleanup that erases wood/parchment/paint character.
   - For props/share elements, split only pieces that survive edge checks; reject pieces with halos, holes, text residue, or weak silhouettes.
   - For building/object source sheets, a pretty illustration board is not enough: require clear grid/cell spacing, generous padding around every asset, no crowded bottom rows, and a flat or easily sampled background before dicut. If equal-grid cropping touches neighboring pieces, switch to full-sheet background removal plus connected-component bounds instead of forcing fixed cell crops.
   - When the user asks for faithful reference alignment, compare the generated source against the named reference before cleanup: geometry, proportions, role, and visual language must match. If it merely borrows the mood while inventing a new kit, label it `inspired/drifted candidate`, do not promote it, and regenerate or defer before dicut.

6. **Verify native transparency before chroma-key fallback**
   - When the target requires transparency and the selected provider exposes a native transparent-background control, request that structured control **and** state genuine transparent/no-background pixels in the creative prompt. Prompt wording does not replace the structured control, and the structured control does not replace explicit asset intent.
   - Treat a provider or tool claim such as `transparent: true` as request/receipt evidence, not the output postcondition. Inspect the actual raster mode and alpha extrema/corners; an RGB result, baked checkerboard, or visible backdrop is a failed native-alpha output even when the call reports success.
   - Preserve a failed raw output and follow the owning workflow's bounded regenerate/edit policy before routing a still-opaque source to `asset-designer` for Agy/Gemini-first dicut. Do not silently upgrade or post-process the raw into a claimed native-alpha success.
   - If direct transparent PNGs show checkerboards or uncertain alpha, reject them and use a clean chroma key that does not appear in the art.
   - For generated sprite sheets, request an exact flat chroma background, no gradient/lighting/shadow/glow/anti-alias matte around the silhouette, generous spacing between frames, and one isolated character per cell. If the provider instead returns a larger canvas or slightly non-byte-exact chroma but every requested full-body frame remains unambiguous and recoverable, preserve the untouched raster/receipt and return `source-ready-normalization-required` to the current task owner; do not self-reject solely because raw provider pixels are not runtime-final.
   - Sample the actual matte/background color from the generated source instead of assuming the requested key was exact (for example, a requested `#ff00ff` can come back as a nearby magenta gradient or shaded matte). Use fuzzed transparency carefully and preserve sRGBA/alpha rather than accidentally converting the image to grayscale or dropping channels.
   - Verify alpha by compositing on light, sky/cream, peach, checker, and dark backgrounds; do not trust a contact sheet or checkerboard preview as real transparency.

7. **Route final dicut through Agy first and retain Codex fallback**
   - Follow `asset-designer`: Agy/Gemini writes the first semantic-dicut candidate after the current model and no-fallback state are visibly verified through `direct-cli`.
   - Use Codex as an explicit fallback or same-input A/B when Agy is unavailable, model verification fails, semantic extraction damages load-bearing detail, the provider/runtime is Codex-specific, or the Codex candidate visibly wins. Never switch executors silently.
   - Give Agy and Codex separate candidate folders and the same untouched source. Main compares actual output pixels and QA backgrounds before replacing canonical assets.
   - Treat white fur, low-contrast edges, hair, feathers, and translucent material as hard proof cases. A semantic matte can outperform chroma cleanup while still deleting or hardening important detail; preserve a stronger deterministic outer edge when a bounded hybrid is visibly better.
   - Main-shell cleanup remains diagnostic/integration fallback unless Mahiro explicitly approves it as final. Do not report any executor's cutout as final from script success or self-reported PASS alone.

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
- Treating Codex as the automatic final dicut owner because it generated the source.
- Treating Agy/Gemini as a universal winner and skipping the hardest same-input proof, especially for white fur or low-contrast detail.
- Falling back from Agy to Codex without reporting the trigger, candidate paths, and visual evidence.
- Assuming a requested magenta background is a flat chroma key; imagegen may return gradients, shaded mattes, or anti-aliased fringe that need edge-aware cleanup and visual QA.
- Calling procedural/script-generated Codex assets an imagegen pass when no image generation was actually used.
- Generating one full-screen composition, slicing pieces out, and calling them production assets.
- Trusting fake checkerboard transparency or failing to inspect alpha on dark backgrounds.
- Trusting a provider's transparency claim without checking the returned raster mode and alpha extrema.
- Collecting the globally newest generated file during concurrent panes instead of the exact provider-returned path for that lane.
- Promoting raster icons that only work on light cream surfaces into themeable production UI.
- Calling a candidate/reference asset runtime-ready before the implementation has size/path/token constraints.
- Scaling large source/clean UI assets directly in production CSS after the runtime size is known, which can hide blurry edges or reveal unbalanced transparent padding later.
- Leaving manifests with stale `pending` or overconfident status after a cleanup/QA pass.

Related skills: pair with `asset-designer` for cleanup/alpha/edge QA, `web-asset-prompts` for per-asset prompt wording, and `direct-cli` when opening bounded Cursor/Agy/Codex/Pi lanes. Keep runtime sprite/VFX assembly, gameplay semantics, and production promotion with the target repo's current owners.
