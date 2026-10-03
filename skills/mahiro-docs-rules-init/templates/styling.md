# Styling

## Current Reality

- styling stack in use today
- how components usually receive styles
- token or design-system usage if real
- where global styles, presets, theme config, or token definitions live
- whether the repo mixes utility classes with a component library such as Ant Design, Base UI, Radix, or local primitives

### Ownership Map

Include only owners proven by the target repo. For each, name the source path, a real consumer, and the responsibility it owns:

- token/theme definitions and app-level overrides
- primitive shell and reusable variant/recipe definitions
- app composition for placement and sibling spacing
- domain wrappers for labels, status mapping, and workflow behavior
- generated/registry outputs and their source or generator, when present

Describe the edit path from consumer to canonical source. Map documented semantic classes to real current rules rather than treating their names as proof. Remove absent layers; do not generate a fictional token or primitive system for a small static page.

## Preferred Direction

- how new styling work should be shaped
- prefer semantic tokens and shared primitive defaults before one-off raw palette classes
- use class-merging helpers such as `cn()` only when the repo already has them
- keep product/domain styling with the owner until a cross-owner visual contract is proven

## Not Established Yet

- call out gaps honestly, such as incomplete tokens or mixed styling systems
- do not document a token system, `cn()` helper, variant helper, or shared primitive layer as current reality unless the repo proves it

## Working Rules

- when to use local styles
- when to use shared variants or primitives
- how to avoid one-off styling drift
- where token definitions live, if the repo has Tailwind, CSS variables, Ant Design/Base UI/CVA, or another token system
- which raw palette or one-off classes are discouraged by local doctrine
- how shared primitives should encode reusable visual meaning before app code repeats low-level styling

Use the ownership map to state which caller overrides are supported and which shell changes belong in the primitive or recipe. Prefer the nearest accepted usage before adding a local style or shared variant; repeated cross-owner need and a stable boundary must justify a new shared contract. Fix generated styling through its source owner instead of hand-editing the output.

## Verification

- List only scripts or checks supported by this repo, with the property each can establish.
- Distinguish an available command from a check executed during this init pass.
- Link to existing rendered evidence only when present; state when runtime, resolved paint, or visual acceptance was not checked.
- Do not run a dev server or browser to make this document appear verified. Do not invent QA commands or claim that a build establishes rendered correctness.
