# Frontend Design Brief Workflow

Use this reference when the task needs design/redesign planning, proof-led composition, reference synthesis, or a durable implementation handoff.

## Table of Contents

1. Brand Read, Taste Thesis, and design read
2. Work mode and composition strategy
3. Audit packet
4. Reference review
5. Brief template
6. Whole-composition first pass
7. Verification planning

## 1. Brand Read, Taste Thesis, and Design Read

Resolve these fields from explicit requirements and repo evidence:

```text
Surface/job:
Audience:
Primary action:
Brand promise and category job:
Desired emotional read:
Personality and productive tension:
Existing identity, assets, and visual heritage:
Category conventions to keep or intentionally break:
Existing design system:
Reference direction:
Quiet constraints: accessibility, trust, regulation, performance, localization
Unknowns:
```

Avoid aesthetic labels without anatomy. “Premium,” “modern,” and “editorial” are incomplete until they identify hierarchy, media role, typography role, density, interaction, and product fit.

Label important brand claims as repo-proven reality, approved direction, reference-derived hypothesis, recommended direction, or unknown. Then write:

```text
Taste thesis: <brand/product> should feel <specific emotional/behavioral qualities> so <audience> can <primary action or belief>, without becoming <relevant failure>.

Design read: <surface/job> for <audience>, helping them <primary action>, using <brand/repo-backed direction> under <key constraints>.
```

Load [brand-taste.md](brand-taste.md) when the task needs positive visual judgment, pairwise reference selection, or cross-brand formula review.

## 2. Work Mode and Composition Strategy

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

Choose a composition strategy independently from the mode:

### Local Preservation

Keep the current page/screen anatomy. Use for a bounded visual, state, accessibility, or hierarchy fix whose owner and product contract are already correct.

### Targeted Recomposition

Replace, reorder, or reconnect the smallest block that cannot serve its user question, proof, or action. Preserve the surrounding composition.

### Whole-Composition Reset

Use when current anatomy—not only styling—prevents the page/screen from telling a coherent product story, showing truthful proof, or supporting the primary action, and repeated local polish would preserve the failure.

Reset may change section sequence within the approved IA and content inventory, proof placement, hierarchy, surface rhythm, transitions, and mobile sequencing. It must preserve navigation, verified product behavior, content ownership, routes, analytics/legal contracts, approved brand identity, accessibility, localization, and real assets unless those changes receive separate approval.

Record the trigger and preservation boundary. `Overhaul` describes how much visual language changes; `whole-composition reset` describes how much structural relationship changes. They are not synonyms.

When a reset changes regulated or safety-critical claims, consent, authentication, transactions, legal disclosures, privacy/data-flow promises, or conversion mechanics, stop before implementation until those changed contracts and their proof/verification plan are explicitly approved. The current request counts only when it names and approves those changes. Analysis and a proposed brief may continue while approval is pending.

## 3. Audit Packet

For a multi-section redesign, separate the evidence so a visually attractive reference cannot silently override the product or brand. Use the smallest subset justified by task risk.

When scope or repo uncertainty is high, collect these audits as separate read-only artifacts or parallel lanes, then synthesize one evidence packet before planning. Parallel evidence collection must not become concurrent editing of the same implementation surface.

### Baseline Audit

Check the current rendered surface and implementation:

- routes, navigation, conversion paths
- design tokens, fonts, icons, primitives, component variants
- layout/container/breakpoint conventions
- content ownership and localization
- forms, field names/order, autofill, validation
- focus, keyboard, contrast, reduced motion
- semantic landmarks, one meaningful page heading and logical heading hierarchy, accessible control names, useful alt text, and stable media fallbacks
- analytics/test selectors and stable IDs
- existing assets, source/runtime status, crop behavior
- performance-sensitive media and motion
- capture readiness for fonts, critical media, lazy content, and the intended animation/UI state
- desktop/mobile/language/state screenshots that are current, truthfully named, and matched to the inspected implementation

### Reference Audit

Record section anatomy, reading path, surface rhythm, media/proof roles, responsive behavior, and explicit borrow/adapt/reject decisions. Compare the reference and current baseline at matched viewports/states when making visual claims. A reference is not a source of product claims, brand tokens, or exact trade dress.

When a live external reference supports a claim, use the optional live-reference state record in [reference-contracts.md](reference-contracts.md). Treat session-, referral-, region-, or overlay-dependent surfaces as partial evidence unless their state is frozen and reproducible.

### Brand Audit

Record canonical tokens, type, logo geometry, imagery, density, motion posture, visual heritage, approved direction, and unknowns. Prefer current executable tokens and selected runtime assets over stale mood boards.

### Product-Truth Audit

Trace every proposed claim or demonstration before it enters the section map:

| Claim or demonstration | Source path/evidence | Verified behavior or fact | Proof artifact | Caveat | Evidence status |
| --- | --- | --- | --- | --- | --- |

Remove, qualify, or block claims without repository or explicit product-owner evidence. Generated UI and plausible copy are not product proof.

Record findings as:

```text
Current reality:
Keep:
Improve:
Not established yet:
Needs approval:
```

### Pre-code Decision Ledger

After the material audits and before implementation, synthesize only decisions that can change the composition or its protected contracts:

| Evidence | Conflict or uncertainty | Design consequence | Decision | Rejected alternative | Status |
| --- | --- | --- | --- | --- | --- |

Include effort, change authorization, composition strategy, section sequence, primary action, proof placement, signature relationship, critical asset need, protected-contract decision, and blocking unknown only when material. Keep this pre-code ledger separate from any post-render comparison Decision Record: the ledger explains why a hypothesis was authorized; the Decision Record explains what the human selected after admissible renders.

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

Also record **Reference Fit** for the target brand and job:

- Exemplary for this job
- Near miss
- Repetitive formula
- Reject for this job
- Unproven

Prefer pairwise explanation over numeric scoring. Ask whether the reference still belongs to the target brand after removing the logo, and whether its expressive anatomy could move to an unrelated product through only a color/font/token swap.

## 5. Brief Template

In the ledger below, include signature fields only when visual identity or brand differentiation is material. Include proof fields and proof position only when product proof is material. Omit those fields for bounded work where they cannot change the decision.

```markdown
# Frontend Design Brief

## Current Reality
- ...

## Brand Read and Taste Thesis
- Repo-proven brand reality:
- Approved direction:
- Reference-derived hypothesis:
- Recommended direction:
- Unknown:
- Taste thesis:
- Signature expression (when material):
- Signature carrier (when material):
- Primary proof carrier / source / evidence status (when product proof is material):
- Proof-validity check — exact claim supported / why this evidence form fits (when product proof is material):
- Signature-proof relationship (when both are material):
- Restraint boundary:

## Design Read
- Surface/job:
- Audience:
- Primary action:
- Direction:
- Constraints:

## Mode and Preservation Boundary
- Mode:
- Composition strategy:
- Reset trigger, if any:
- Must preserve:
- Approved to change:

## Structure
- First meaningful proof position — desktop/mobile — rationale if delayed (when product proof is material):
1. Section/screen — job — primary content/action

For a multi-section whole-composition reset, add:

| Section | User question | Verified product fact | Proof artifact | Surface / transition role | Mobile behavior / proof-role parity | Evidence status |
| --- | --- | --- | --- | --- | --- | --- |

## Reference Decisions
- Keep:
- Adapt:
- Reject:
- Unknown:
- Reference Fit and pairwise rationale:

## Visual and Interaction System
- Typography roles:
- Color/surface roles:
- Spacing/density:
- Components/states:
- Responsive behavior:
- Motion/media role — evidence contribution — fallback/reduced-motion path:

## Asset Requirements
- Role/placement/visual priority — intended viewport behavior — crop/focal/safe-zone constraints — truth/IP constraints — visual acceptance criteria — routed owner

Keep this high-level. `asset-designer` owns filenames, ratios/formats, source strategy, asset planning, delivery manifests, cleanup, QA, and downstream production routing. Link to its manifest or delivery notes when available; do not maintain a parallel asset inventory in the frontend brief.

## Implementation Constraints
- ...

## Verification
- Viewports:
- States:
- Evidence:

## Open Question / Blocker
- None | one material question
```

## 6. Whole-Composition First Pass

Use this checkpoint only for a multi-section whole-composition reset:

Before coding, accept the section map as one product story: each section must answer one user question, carry one truthful proof role, and make the reading path, primary action, and close coherent. State which existing anatomy survives and which is replaced. If the complete sequence is not acceptable as the first-pass composition, revise the map instead of polishing sections in isolation.

1. implement the complete semantic section/screen sequence before polishing isolated cards or components;
2. establish the first-pass typography, color, spacing, surfaces, real proof, and responsive relationships across the whole composition;
3. run the narrowest useful build/runtime check;
4. capture the whole composition and section anchors at the primary viewport;
5. inspect repeated shapes, weak transitions, proof legibility, product/category clarity, mobile sequencing, and the closing action;
6. then perform local polish and, only after a rendered baseline exists, an evidence-triggered `uncodixify` pass.

Do not use this workflow to expand a small component fix into a page redesign.

## 7. Verification Planning

When motion is material, declare its ownership before choosing an engine: isolated CSS state transition, native shared-object continuity, coordinated timeline, or viewport-triggered choreography are different jobs. Do not select or reject CSS, View Transitions, GSAP, ScrollTrigger, or another engine from dependency preference alone; choose the smallest mechanism that owns the required sequencing, responsive behavior, interruption, cleanup, and fallback contract.

Choose evidence that can disprove a weak brief:

- rendered desktop and narrow/mobile screenshots
- keyboard/focus walkthrough
- real-content overflow and long-label checks
- semantic landmark, heading, control-name, alt-text, and media-fallback checks
- loading/empty/error states where applicable
- motion and reduced-motion behavior, with every verdict scoped to the exact surface and states reviewed; Motion PASS is not Composition, Hero, or Page PASS
- initial, meaningful mid, settled, reduced-motion, and failed-media/fallback states listed as separate required cases when copy, proof, action, or navigation depends on staged media or motion
- fast-scroll, back-scroll, viewport-bottom reachability, interrupted/reloaded state, inline-style cleanup, overflow, and hidden-content checks when viewport triggers or coordinated timelines are material
- critical overlap, occlusion, and z-order checks at narrow widths as recorded visual plus DOM/geometry judgment unless structured tooling is explicitly added; distinguish intentional overlap from blocked text, proof, or actions
- contrast and interaction affordance
- reference fidelity classification
- brand-recognition review without relying on logo/name
- token-swap/formula-resistance comparison against a meaningfully different brand when taste is being evaluated
- deeper cross-brand comparison of typographic voice, hero cadence, proof framing, CTA closure, and mobile reading rhythm
- target-viewport proof-media inspection; uncropped but unreadable evidence does not pass
- asset target-size/crop inspection
- product claims and demonstrations checked against the product-truth audit
- after copy and visual polish, reconcile every implemented claim and demonstration against the product-truth matrix again, including availability/CTA truth, privacy/data flow, permissions, third-party-provider boundaries, and schematic caveats
- reconcile routed asset manifests or delivery notes with runtime files; stale, retired, missing-source, or unresolved asset status remains open rather than being treated as approved
- durable QA artifacts with truthful viewport, language, state, and scroll-target metadata
- section-anchor and DOM-geometry checks when a full-page capture is unreliable

Do not call the brief validated merely because the code builds.
