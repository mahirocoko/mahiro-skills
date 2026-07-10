# Frontend Design Brief Workflow

Use this reference when the task needs redesign planning, reference synthesis, or a durable implementation handoff.

## Table of Contents

1. Design read
2. Work modes
3. Current-state audit
4. Reference review
5. Brief template
6. Verification planning

## 1. Design Read

Resolve these fields from explicit requirements and repo evidence:

```text
Surface/job:
Audience:
Primary action:
Product/brand constraints:
Existing design system:
Reference direction:
Quiet constraints: accessibility, trust, regulation, performance, localization
```

Avoid aesthetic labels without anatomy. “Premium,” “modern,” and “editorial” are incomplete until they identify hierarchy, media role, typography role, density, interaction, and product fit.

## 2. Work Modes

### Greenfield

Use when no current system exists or a new one is explicitly approved. Establish a small coherent token and component direction without pretending it is current repo reality before implementation lands.

### Preserve

Use when existing brand, IA, routes, and product behavior should survive. Prefer this progression:

1. accessibility/functional regressions
2. hierarchy and scanability
3. spacing and rhythm
4. typography roles
5. color/surface consistency
6. interaction states
7. targeted recomposition
8. block replacement only when the current block cannot serve its job

### Overhaul

Use only with explicit approval. A new visual language does not automatically authorize changes to content, IA, analytics, legal copy, forms, or brand ownership.

### Reference Set

Plan the smallest named set of sections/screens needed to resolve implementation ambiguity. Do not default to one image per section or a fixed page count.

### Fidelity

Compare the actual rendered implementation with a reference or approved brief. Fidelity means preserving intent and hierarchy under real constraints, not reproducing impossible pixels.

## 3. Current-State Audit

Check relevant evidence before recommending change:

- routes, navigation, conversion paths
- design tokens, fonts, icons, primitives, component variants
- layout/container/breakpoint conventions
- content ownership and localization
- forms, field names/order, autofill, validation
- focus, keyboard, contrast, reduced motion
- analytics/test selectors and stable IDs
- existing assets, source/runtime status, crop behavior
- performance-sensitive media and motion

Record findings as:

```text
Current reality:
Keep:
Improve:
Not established yet:
Needs approval:
```

## 4. Reference Review

For every reference, use this table:

| Decision | Question |
| --- | --- |
| Keep | Does it improve hierarchy, comprehension, affordance, accessibility, or brand clarity? |
| Adapt | Is the anatomy useful but the exact style/stack incompatible with repo reality? |
| Reject | Is it decorative filler, copied trade dress, fake state, impossible behavior, or unsupported implementation detail? |
| Unknown | Is the claim unprovable from the available frame, state, viewport, or generated copy? |

Extract anatomy such as:

- section/screen job and sequence
- content hierarchy and reading path
- typography roles, not font-name copying
- media role and crop/focal behavior
- component responsibilities and states
- spacing rhythm and density
- navigation/CTA relationship
- mobile collapse and safe-area implications
- motion purpose and fallback

## 5. Brief Template

```markdown
# Frontend Design Brief

## Current Reality
- ...

## Design Read
- Surface/job:
- Audience:
- Primary action:
- Direction:
- Constraints:

## Mode and Preservation Boundary
- Mode:
- Must preserve:
- Approved to change:

## Structure
1. Section/screen — job — primary content/action

## Reference Decisions
- Keep:
- Adapt:
- Reject:
- Unknown:

## Visual and Interaction System
- Typography roles:
- Color/surface roles:
- Spacing/density:
- Components/states:
- Responsive behavior:
- Motion/media purpose:

## Asset Requirements
- Role/placement — constraints — routed owner

Keep this high-level. `asset-designer` owns filenames, ratios, production strategy, manifests, cleanup, QA, and delivery status.

## Implementation Constraints
- ...

## Verification
- Viewports:
- States:
- Evidence:

## Open Question / Blocker
- None | one material question
```

## 6. Verification Planning

Choose evidence that can disprove a weak brief:

- rendered desktop and narrow/mobile screenshots
- keyboard/focus walkthrough
- real-content overflow and long-label checks
- loading/empty/error states where applicable
- motion and reduced-motion behavior
- contrast and interaction affordance
- reference fidelity classification
- asset target-size/crop inspection

Do not call the brief validated merely because the code builds.
