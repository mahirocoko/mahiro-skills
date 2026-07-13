# Conditional Patterns from the Initial Study

These are author hypotheses from a stratified 2026-07 Codrops inventory plus deep checks of named exemplars. The claim-to-evidence/status matrix lives in `docs/authoring/studying-codrops-study-2026-07.md`; numbered anchors below refer to that 58-item manifest. They are hypotheses to test against the current item and target—not portable style rules.

## Evidence lanes answer different questions

- A Tutorial best explains mechanism and sequence.
- A live demo best proves visible states and interaction feel.
- Source best proves architecture, dependencies, cleanup, and shortcuts.
- A Case Study best explains product/studio intent and production trade-offs.
- Webzibition and roundups best reveal vocabulary and clusters.
- Spotlights best reveal practice and decision culture.
- Historical repos best reveal durable interaction grammar and obsolete implementation assumptions.

No lane substitutes for the others.

Evidence anchors: study items #1, #16–25, #26–43, and #51–54; statuses vary from deep-read to metadata-checked as recorded in the authoring matrix.

## Strong studies join evidence instead of collecting links

The useful unit is often an evidence chain:

```text
editorial intent → live behavior → source mechanism → target adaptation
```

For example, the Wave Propagation Cube Grid article explains instancing, data-texture trail updates, synchronized depth deformation, and production optimizations, while its Demo and Code links establish where independent behavior/source checks should continue. The initial pass did not inspect a source revision or file path. Missing edges should lower confidence, not be filled by visual inference.

Evidence anchors: #1 and #27.

## One coherent mechanism usually carries the signature

Representative work often gets identity from one relationship—scroll assembling panels, pointer history driving displacement, a grid transitioning state, or typography responding to motion—rather than from stacking unrelated effects. This suggests a project-relative question: what single interaction/proof relationship deserves to carry the experience? It does not imply every product needs a signature effect.

Evidence anchors: #1, #27, and #49–50.

## State continuity matters more than effect count

Page transitions, grid-to-detail changes, thumbnail flows, and scroll galleries are strongest when geometry, content, and navigation remain legible across states. Study initial, interrupted, fallback, and settled states; a polished middle frame is not enough.

Evidence anchors: #2, #5, #10, #19, and #49–50. Treat this as a test hypothesis until live states are observed.

## Creative demos expose production questions early

Recurring risks include scroll ownership, resize behavior, DPR/GPU cost, source/demo drift, perpetual animation loops, mobile input, asset loading, lifecycle disposal, and reduced motion. Treat production notes as evidence only when article, demo, or source actually demonstrates them.

Evidence anchors: #1, #27, and #28; only #1 and #27 received deep reads in the initial pass.

## Historical examples are valuable at the anatomy level

Older CSS masks, SVG text fills, sidebars, page transitions, and interaction repos can still teach state anatomy, timing roles, and affordance patterns. Their dependencies, prefixes, event models, browser assumptions, and accessibility should not be copied without current verification.

Evidence anchors: #5–7 and #51–54.

## Showcase inclusion is not implementation endorsement

Webzibition and curated roundups prove that editors selected an expressive result. They do not prove source quality, accessibility, performance, originality, licensing, or target fit. Use them to discover references, then seek stronger evidence.

Evidence anchors: #21–25 and #38–43.

## Case studies are contextual, not recipes

Production stories reveal why a team chose a comic, 3D world, WebGPU pipeline, editorial rhythm, or content system. Transfer the decision framing and constraints; do not transplant the client's visual expression or assume the same stack is justified elsewhere.

Evidence anchors: #26–31; #27 received the initial deep read.

## Source availability changes the confidence class

An article with a matched demo and licensed source supports a stronger implementation lesson than a cover image or Visit link. Even then, demo assets and client materials remain separate. A missing license changes the recommendation from reuse to study-only.

Evidence anchors: #1 versus #21–25 and #51–54. Repository match, revision, license, and asset rights still require per-item checks.

## Diversity checks prevent a false Codrops doctrine

Recent Codrops heavily features GSAP, Three.js, WebGL, WebGPU, scroll, and experimental portfolios. A balanced study must also include CSS, SVG, DOM, typography, editorial/process, historical components, and low-complexity alternatives. Otherwise the method will confuse editorial abundance with universal frontend need.
