# Frontend Reference Contracts

Use these contracts for generated web/mobile references and reference-to-implementation review. They are manifests, not mandatory image counts.

## Table of Contents

1. Reference-set manifest
2. Generated-reference analysis
3. Fidelity comparison
4. Brand-relative pairwise comparison
5. Rendered QA evidence contract
6. Completion reconciliation

## 1. Reference-Set Manifest

```markdown
# Reference Set

## Scope
- Deliverable type: web sections | mobile screens | state variants
- Requested units: <count or named request>
- Planned units: <named list>
- Platform/viewports: <desktop/mobile/iOS/Android/etc.>
- Why each unit is needed: <implementation ambiguity it resolves>

## Shared Design Bible
- Product/brand evidence and status:
- Brand promise and category job:
- Desired emotional read:
- Taste Thesis:
- Signature expression:
- How the signature expression changes the main composition/interaction:
- Restraint boundary:
- Category conventions to keep or intentionally break:
- Palette roles:
- Typography character and roles:
- Spacing/density rhythm:
- Radius/surface language:
- Imagery treatment:
- Navigation/CTA family:
- Motion posture:

## Units
| Unit | Purpose | Composition | Content/copy status | Media role | Implementation notes | Status |
| --- | --- | --- | --- | --- | --- | --- |

## Continuity Checks
- shared tokens and component family
- navigation/state continuity
- screen-to-screen data continuity for mobile flows
- generated text marked uncertain/reference-only
- provenance and source paths recorded
```

Use `unknown`, `not established`, or `not applicable` for unsupported fields. Do not complete the design bible from portable house taste.

Plan coverage first. Generate additional detail views only when a missing state or composition blocks implementation.

## 2. Generated-Reference Analysis

```markdown
# Reference Analysis: <name>

- Source image/path:
- Purpose:
- Target Brand Read / product job:
- Evidence status: repo-proven | approved | reference-derived hypothesis | recommended | unknown
- Viewport/platform assumption:
- Visible copy:
- Uncertain/generated copy:
- Layout/grid:
- Reading path and hierarchy:
- Typography relationships:
- Spacing rhythm and density:
- Palette/contrast:
- Components and visible states:
- Media framing/crop/focal behavior:
- Responsive/mobile implications:
- Motion suggested but unproven:
- Visual thesis communicated by the frame:
- Reference Fit: exemplary | near miss | repetitive formula | reject for this job | unproven
- Brand-specific decisions worth preserving:
- Transplantable formula risk:
- Repo-compatible implementation constraints:
- Ambiguities requiring clarification or regeneration:
```

Do not infer exact spacing, accessibility, component states, or motion timing from a still image unless separately documented.

## 3. Fidelity Comparison

Compare a rendered implementation against the approved brief/reference:

| Area | Reference intent | Rendered evidence | Classification | Action |
| --- | --- | --- | --- | --- |

Classifications:

- **Preserved** — intent and hierarchy survived real implementation.
- **Intentionally adapted** — changed for repo, accessibility, content, responsive, or performance constraints; rationale recorded.
- **Drifted** — unapproved loss or distortion of intended direction.
- **Unverifiable** — missing viewport, state, source asset, or runtime evidence.
- **Needs another render/reference** — ambiguity cannot be resolved honestly from current evidence.

Always test actual target viewports and real content. A visual similarity claim without rendered evidence remains unverified.

## 4. Brand-Relative Pairwise Comparison

Use pairwise review when choosing references or comparing current and candidate briefs/renders:

```markdown
# Brand-Relative Pairwise Review

## Matched Evidence
- Brand Read and Taste Thesis:
- Product content / primary action:
- Assets and repo constraints:
- Viewports and required states:

## A vs B
- Which belongs more convincingly to this brand without relying on logo/name?
- Which supports the primary action more clearly?
- Which translates brand traits into repeatable UI decisions rather than decoration?
- Which keeps product/proof media meaningfully inspectable at the target viewport?
- Which contains fewer transplantable formulas?
- Which concrete decisions caused the preference?
- What did the losing option do better?

## Outcome
- Strong fit | Plausible but generic | Brand conflict | Unproven
- Conditional principle: when / prefer / because / evidence
```

For cross-brand evaluation, compare the winning outputs' typographic voice and cadence, hero reading rhythm, proof framing, section order, card geometry, image placement, CTA closure, and mobile collapse. Shared primitives are acceptable; identical expressive anatomy needs a product, brand, or design-system reason. A token swap is not the only failure: if assets and copy change but the expressive anatomy still belongs equally to both brands, revisit the Taste Theses.

Do not aggregate taste into a numeric score.

## 5. Rendered QA Evidence Contract

Use durable QA artifacts when implementation is part of the task and visual, responsive, localization, state, or proof-quality claims need evidence. Choose a risk-based matrix; do not impose every viewport or state on a small bounded change.

```markdown
# Rendered QA Evidence

## Matrix
| Viewport / device class | Language | UI/content state | Scroll target | Why this case is high risk | Status |
| --- | --- | --- | --- | --- | --- |

## Artifact Record
- Artifact path:
- URL / route:
- CSS viewport and DPR:
- Language / locale:
- UI/content state:
- Scroll target and open controls:
- Captured at:
- Source commit/worktree state:
- Console / page errors:
- Horizontal overflow:
- Keyboard / focus result:
- Reduced-motion result:
- Issue found:
- Fix or remaining caveat:
- Recheck artifact / measurement:
```

Use truthful names such as:

```text
<surface>-<viewport>-<language>-<state>-<scroll-target>.png
```

Do not label an artifact `current`, `desktop`, `mobile`, or with a language/state it does not actually contain. Record CSS viewport and DPR separately from bitmap dimensions.

### Capture Reliability

- Attempt a whole-composition capture when page-level rhythm is under review.
- Validate full-page output against DOM geometry before treating it as evidence.
- If fixed/sticky regions duplicate, blank bands appear, or geometry disagrees, mark the capture unreliable.
- Fall back to section-anchor captures, important DOM rectangles, and per-state screenshots rather than explaining away a broken full-page image.
- Keep console/page errors, horizontal overflow, focus, open controls, long content, and reduced-motion checks tied to the same recorded state.

### QA Closure Loop

For each high-risk matrix row:

1. enter the language, route, and UI/content state from a clean recorded state;
2. capture or measure the named target;
3. record the issue against that exact state;
4. apply the fix;
5. recapture or re-measure the same state;
6. link the recheck evidence and keep unresolved rows open rather than marking the matrix complete.

For a whole-composition reset, the risk matrix should consider the primary desktop layout, an intermediate/tablet width when layout relationships change, narrow and smallest-supported mobile widths, every supported language where wrapping or meaning changes, and at least one meaningful open/interactive state. Tie console errors, horizontal overflow, and important DOM rectangles to those same cases. These are coverage categories, not mandatory fixed viewport numbers for every task.

### Asset Production Handoff

When a new or transformed asset is required, `frontend-design` records:

- role, placement, hierarchy, and product/brand purpose;
- intended viewport behavior, crop, focal point, and safe-zone constraints;
- truth, privacy, licensing, and IP constraints;
- visual acceptance criteria and routed production owner.

`asset-designer` owns filenames, folders, ratios/formats, source strategy, asset planning, delivery manifests, cleanup, QA, and downstream production routing. Link to its manifest or delivery notes when available; do not duplicate an asset inventory in the frontend contract.

## 6. Completion Reconciliation

```text
Requested deliverables: N
Planned deliverables: N
Completed deliverables: N
Missing/blocked: none | explicit named list
Evidence: paths, renders, checks
```

Do not manufacture extra units to satisfy a fixed template. Do not hide missing units behind “similar to above” or unlabeled placeholders.
