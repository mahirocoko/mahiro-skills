# Provenance policy

Use provenance to decide what an output is allowed to become.

## Usage levels

- `reference-only` — inspection, prompt design, mood/reference board, or third-party pack notes. Never promote into runtime production assets.
- `source-candidate` — candidate output that can enter QA. Promotion requires human/main-agent approval and usually further cleanup.
- `production-approved` — approved for runtime promotion after manifest validation and target-size QA.

## Source lanes

- `codex` — good for handoff orchestration, slicing, extraction, manifest generation, QA boards, integration patches, and source-candidate cleanup when allowed.
- `gemini` — preferred source-art lane for projects that explicitly use Gemini for production mascot/source art.
- `imagegen` — approved image generation source; keep original source sheet and provenance notes.
- `manual` — human-authored or hand-edited source.
- `external-reference` — local reference only unless license and human approval say otherwise.

`sourceLane` names the executor/origin lane; it does not prove how poses or pixels were authored. Pair new jobs with `sourceRequirement`:

- `imagegen-required` requires `poseAuthorship: generated-poses`, a compact local provider receipt, and hash-bound raw generated raster artifacts;
- `manual-rig-allowed` permits disclosed human/manual or transform-rig authorship but still needs target-size motion review and human promotion;
- `diagnostic-only` cannot become `production-approved`.

Never infer imagegen authorship from `sourceLane: codex` alone. The receipt binds local delivered bytes to the reported lane but is not a signed provider attestation.

## Attributed prompt and algorithm sources

- The bundled Image Cockpit prompt catalog is MIT-licensed source text pinned to a specific upstream revision. Keep `image-cockpit-LICENSE.txt`, exact source locators, and the distinction between original prompts and adapted templates in installed copies.
- Prompt/catalog provenance does not become generated-asset provenance. A rendered prompt still needs a new job source lane, source artifacts, QA, and approval state.
- Native-grid recovery carries separate notices for the Sprite Fusion-derived algorithm family and the chongdashu pipeline explanation. Recovery does not repair unknown ownership or upgrade `reference-only`/`source-candidate` inputs.
- Motion-reference video and decoded frames remain `reference-only` unless a later authored output independently passes the production workflow. Preserve source hash and selected-cycle metadata.
- Atlas assembly preserves the approval status of hash-matching approved inputs; it cannot create or infer approval.

## Mahiro project cautions

- Traymori/Mori production source art has stricter rules: Codex should not invent Mori production source art by default. Use Codex for extraction, slicing, QA, and integration unless Mahiro explicitly asks for a Codex source candidate.
- Do not feed non-commercial/reference packs into models unless the license and Mahiro explicitly allow it.
- Actual runtime size QA is the truth. For menu-bar/tray assets, inspect 18-22px; for compact sprites, inspect the target frame size and nearby downscaled previews.

## Parallel candidate lanes

When running tournament-style candidates, every candidate must write to an isolated folder. Never let candidates share a root outbox while they are still generating, because “newest generated image” heuristics can mix artifacts across lanes. Promote only the selected winner after QA.
