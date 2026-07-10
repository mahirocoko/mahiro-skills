# Frontend Reference Contracts

Use these contracts for generated web/mobile references and reference-to-implementation review. They are manifests, not mandatory image counts.

## Table of Contents

1. Reference-set manifest
2. Generated-reference analysis
3. Fidelity comparison
4. Completion reconciliation

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
- Product/brand source:
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

## 4. Completion Reconciliation

```text
Requested deliverables: N
Planned deliverables: N
Completed deliverables: N
Missing/blocked: none | explicit named list
Evidence: paths, renders, checks
```

Do not manufacture extra units to satisfy a fixed template. Do not hide missing units behind “similar to above” or unlabeled placeholders.
