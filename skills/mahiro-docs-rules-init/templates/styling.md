# Styling

## Current Reality

- styling stack in use today
- how components usually receive styles
- token or design-system usage if real
- where global styles, presets, theme config, or token definitions live
- whether the repo mixes utility classes with a component library such as Ant Design, Base UI, Radix, or local primitives

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
