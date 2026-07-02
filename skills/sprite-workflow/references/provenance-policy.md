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

## Mahiro project cautions

- Traymori/Mori production source art has stricter rules: Codex should not invent Mori production source art by default. Use Codex for extraction, slicing, QA, and integration unless Mahiro explicitly asks for a Codex source candidate.
- Do not feed non-commercial/reference packs into models unless the license and Mahiro explicitly allow it.
- Actual runtime size QA is the truth. For menu-bar/tray assets, inspect 18-22px; for compact sprites, inspect the target frame size and nearby downscaled previews.

## Parallel candidate lanes

When running tournament-style candidates, every candidate must write to an isolated folder. Never let candidates share a root outbox while they are still generating, because “newest generated image” heuristics can mix artifacts across lanes. Promote only the selected winner after QA.
