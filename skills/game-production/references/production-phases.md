# Production Phases

Use phase labels as evidence gates, not calendar labels or percentages. A project may have production-grade subsystems while the whole game remains a prototype.

## Shared phase record

For each phase, record:

```text
Question to prove | Included experience | Explicit exclusions | Required evidence | Human gate | Exit decision | Reopen trigger
```

Keep accepted earlier behavior protected unless the next phase explicitly reopens it.

## Prototype readiness

**Question:** Is one material gameplay, interaction, art, pipeline, or technical hypothesis viable?

Require only the evidence needed for that hypothesis:

- runnable bounded proof
- explicit placeholder/debug boundaries
- reproducible setup or seed when practical
- obvious failure criteria
- no false production, content-complete, or release claim

A prototype may use placeholder art/audio, local-only state, debug UI, one device, narrow content, or temporary architecture. It is not ready for broad asset/content multiplication unless the prototype also proves the contracts those lanes need.

**Exit:** A human can accept or reject the hypothesis from direct evidence.

## Vertical-slice readiness

**Question:** Can one representative end-to-end experience express the intended game at credible quality?

Require:

- a complete start-to-finish loop with success, failure, retry and result handling
- representative gameplay, one content arc, UI/HUD, environment, art/animation/VFX and audio
- real input and target viewport/platform behavior
- deterministic or otherwise reproducible balance/debug evidence
- minimum save/reward behavior if persistence is part of the product promise
- localization/accessibility paths needed to expose layout or interaction risk
- browser/device and human play evidence
- explicit list of prototype shortcuts still present

A preview-only asset family, headless simulation, concept board, or debug scene supports a slice but does not replace runtime integration.

**Exit:** The slice proves production direction and reveals the repeatable pipeline, without claiming full content breadth.

## Production readiness

**Question:** Can the team produce, integrate, validate and maintain the complete intended game repeatably?

Require:

- stable runtime/content/save/asset/audio/localization contracts
- representative items promoted through every required lane
- whole-game content inventory and controlled scope
- production tools and workflows with named owners
- regression coverage for accepted gameplay, content and persistence
- target-device budgets measured at representative worst case
- browser/platform, input, viewport, locale and accessibility matrices
- provenance and licensing records for production assets and audio
- failure recovery, migration and observability appropriate to the product
- clear candidate, validated and promoted states

Do not force data-driven schemas, renderer/rules separation, or a particular engine pattern if the repo uses another maintainable contract. Production readiness is repeatability and control, not architectural fashion.

**Exit:** New content can enter the game without reopening core architecture or bypassing QA, and the complete scoped game can reach content-complete state predictably.

## Release readiness

**Question:** Is one exact artifact safe and approved to ship to the named platforms/audience?

Require:

- content-complete/frozen scope and resolved ship blockers
- exact build identity and reproducible release commands
- production configuration with debug/preview/test paths controlled
- save compatibility, migrations, corruption fallback and rollback/recovery
- final platform/browser/device, input, locale and accessibility evidence
- performance/loading/storage/network evidence against repo budgets
- deployment rehearsal, monitoring and rollback ownership
- privacy, analytics, monetization, ratings, licensing, title/trademark and store obligations as applicable
- known issues, support path and release-owner acceptance

**Exit:** The release owner approves the exact artifact and evidence packet, not merely the branch or latest local build.

## Useful phase discipline

- Keep current reality separate from preferred direction and undecided work.
- Allow an accepted prototype baseline to remain protected while a replacement candidate passes behavior, complete-content, migration, balance, browser/device and human gates.
- Isolate incompatible modes or save lanes until compatibility is intentionally designed.
- Make failed runs, partial completion and recovery part of the core-loop gate when they affect player progression.
- Treat final art and audio as open until their representative runtime paths pass at real scale and density.
- State which earlier assumptions a new phase supersedes; do not let historical budgets silently override the active contract.
