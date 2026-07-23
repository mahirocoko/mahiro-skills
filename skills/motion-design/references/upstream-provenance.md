# Upstream provenance

## Source

- Upstream repository: <https://github.com/LottieFiles/motion-design-skill>
- Pinned revision: `f9a8a041b85185ee4881b3471d3415e939aac772`
- Upstream license: MIT; the exact notice is preserved in [`../LICENSE`](../LICENSE)

## Imported and adapted scope

This package adapts conceptual guidance from the upstream `skills/motion-design/` package at the pinned revision:

- decision framework, emotional intent, property choice, and UI-adapted animation principles
- motion-personality vocabulary
- timing, easing, spring-feel, distance, overlap, and stagger guidance
- choreography, narrative beats, entrance/exit continuity, and interaction-state patterns
- ambient and continuous-motion constraints
- platform, accessibility, responsive, and performance considerations
- quality review and troubleshooting cues

The upstream material was consolidated from its `director/`, `patterns/`, and `reference/` documents into six progressive-disclosure references. Duplicate tables and recipes were merged; numeric claims and absolutes were reframed as context-dependent heuristics.

This is not a full repository copy. The upstream README, `.gitignore`, installation material, process documentation, metadata/version claims, and original 16-document layout were not imported.

## Mahiro-local changes

The following are local policy and ownership decisions, not claims made by upstream:

- explicit-trigger-only activation and the non-trigger guard
- ownership routing to `frontend-design`, `studying-codrops`, and `vfx-workflow`
- target-repo code/runtime/browser QA as implementation authority
- bounded modes, evidence posture, motion brief/output contract, stop gates, and validation checklist
- rejection of default personality archetypes and motion-for-motion's-sake
- explicit distinction between heuristics and executable runtime/library APIs
- reduced-motion equivalence, interruption, state-authority, and rendered-audit contracts

When citing doctrine, distinguish an adapted upstream motion principle from these Mahiro-local routing and workflow boundaries.
