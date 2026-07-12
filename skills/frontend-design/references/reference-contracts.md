# Frontend Reference Contracts

Use these contracts for generated web/mobile references and reference-to-implementation review. They are manifests, not mandatory image counts.

## Table of Contents

1. Reference-set manifest
2. Generated-reference analysis
3. Fidelity comparison
4. Brand-relative pairwise comparison
5. Comparison mode: anonymous composition exploration
6. Rendered QA evidence contract
7. Completion reconciliation

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

## 5. Comparison Mode: Anonymous Composition Exploration

Use `comparison` only when the human owner explicitly asks to choose among multiple rendered frontend directions. It is not a default design phase, native-model preconditioner, or bounded-task requirement. Pairwise ambiguity uses two directions; whole-composition selection uses two to three isolated directions. Longitudinal synthesis requires a separate explicit request.

Keep retention independent from running the comparison:

```text
Retention: session-only | project-private | project-shared
```

Default to `session-only`. Calibration is the result of approved retained decisions, not automatic model personalization.

### Shared Evidence Packet

Freeze one packet before maker work:

- decision/run/packet ID, repository, brand/product, surface, product job, source revision, and owner;
- product content, primary action, approved brand direction, assets/source status, constraints, protected contracts, and explicit exclusions;
- target viewport/language/interaction-state matrix and one evaluation question set;
- frozen inputs versus permitted lane variables;
- comparable tool access, iteration budget, readiness threshold, and completion contract.

When testing fresh composition rather than refining the current UI, exclude current implementation anatomy from maker inputs while retaining product truth and repo constraints. If a shared-packet field changes, invalidate every lane and restart the comparison under a new packet ID.

### Maker Contract

- Use isolated write areas with no shared implementation files or sibling inspection.
- Give every maker the same packet and deliverable contract.
- Assign a genuinely different neutral composition hypothesis and falsifier to each maker. Palette, font, radius, decoration, or token swaps fail the hypothesis gate.
- Record the hypothesis choice in the pre-code Decision Ledger from [brief-workflow.md](brief-workflow.md).
- Require each maker to explain the dominant relationship, reading path, proof placement, mobile/desktop transformation, predicted benefit, cost, restraint boundary, and falsifier.

### Admissibility Gate

Apply the rendered QA contract in section 6 before visual criticism. Every option must pass the same packet, identity, readiness, viewport/state, and completion checks. An inadmissible option pauses the comparison; it is not a loser. If the critic requests an implementation fix, keep the mapping sealed, return the option to its maker or declared QA owner, recapture the same state after the fix, rerender every option affected by a fairness change, and start a new immutable critic verdict record.

### Maker → Critic → Human Selection

1. Route admissible renders behind neutral labels, filenames, routes, titles, and metadata; seal the option mapping outside the review surface.
2. Give a fresh read-only critic the neutral renders, evaluation questions, and live interaction surface when needed. Do not expose mapping, author/model identity, maker rationale, or prior votes.
3. Write an immutable preliminary critic verdict before reveal: `Option ... | Neither`, confidence, rendered evidence, risks, and loser strengths. Later disagreement must not rewrite it.
4. Let the human owner inspect the admissible renders and select an option or `Neither`. Agent and critic votes remain advisory; no human decision leaves the run pending.
5. Reveal the mapping only after the human decision.
6. Record critic/human agreement or disagreement without revising the preliminary verdict.
7. If the human selects `Neither`, promote no option or principle. Correct the packet, hypotheses, assets, or execution before rerunning.
8. Append a scoped Decision Record only when the human explicitly approves durable retention.

Use the judgment questions and conditional-principle semantics in [brand-taste.md](brand-taste.md); do not duplicate or replace them with numeric scoring here.

### Comparison State Contract

| Current state | Event or condition | Next state | Mapping | Durable record | Promotion |
| --- | --- | --- | --- | --- | --- |
| inactive | bounded task or comparison not explicitly requested | inactive | none | none | none |
| preparing | hypotheses differ only by palette, font, radius, decoration, or tokens | blocked | sealed | none | none |
| preparing | any rendered option is inadmissible or unmatched | blocked | sealed | none | none |
| admissible | critic verdict not yet written | critic-pending | sealed | none | none |
| critic-pending | immutable critic verdict written | human-pending | sealed | none | none |
| human-pending | human selection not provided | human-pending | sealed | none | none |
| human-pending | human selects an option | revealed-selected | reveal now | retention-dependent | selected project/surface only |
| human-pending | human selects Neither | revealed-neither | reveal now | retention-dependent | none |
| admissible or human-pending | critic requests an implementation fix | blocked | sealed | none | none; same-state recapture and new critic record required |
| revealed-selected or revealed-neither | retention is session-only | closed | revealed | none | session result only; Neither still promotes nothing |
| revealed-selected | project retention explicitly approved | recorded | revealed | append Decision Record | project/surface only |
| revealed-neither | project retention explicitly approved | recorded | revealed | append Decision Record | none |
| recorded | later evidence contradicts or narrows the decision | recorded | already revealed | append superseding or narrowing link | reevaluate; do not erase history |

### Post-selection Decision Record

Keep this artifact separate from the pre-code Decision Ledger.

| Field | Required content |
| --- | --- |
| Decision identity | decision ID, run ID, and packet ID |
| Project context | repository, brand/product, surface, and product job |
| Source and targets | source revision and target viewport/language/interaction-state matrix |
| Retention | `session-only`, `project-private`, or `project-shared` |
| Experiment controls | frozen inputs and permitted variables |
| Maker hypotheses | neutral hypotheses and falsifiers |
| Admissibility | status and evidence per option |
| Preliminary critic verdict | immutable option or `Neither`, confidence, evidence, risks, and loser strengths |
| Human selection | `pending`, `selected`, or `neither` |
| Decision basis | `visual`, `product`, `accessibility`, `feasibility`, or `mixed` |
| Human rationale | explicit paraphrased rationale, or `not provided` |
| Agent inference | separately labeled inference; never rewrite it as human feedback |
| Post-reveal relationship | critic/human agreement or disagreement |
| Preserve | selected decisions to preserve |
| Loser strengths | strengths worth testing without silently merging them |
| Rejected interpretations | rejected formulas, readings, or tradeoffs |
| Conditional learning | `when / prefer / because / evidence`, or `none` |
| Scope boundaries | applies-to and does-not-apply-to |
| Revalidation | falsifier and revisit condition |
| Decision status | `tentative`, `active`, `superseded`, or `withdrawn` |
| Portability | `project-only`, `portable-candidate`, or `explicitly-promoted` |
| History links | supersession and conflict links |

If feasibility or deadline drives the human choice, record that basis but leave taste-oriented conditional learning as `none` unless the human separately provides a visual or product rationale.

### Retention and Reuse Contract

| Retention | Durable write | Later reads | Approval |
| --- | --- | --- | --- |
| session-only | no Decision Record | current session only | default; no extra approval |
| project-private | append project-local Decision Record | same repository and matching applies-to scope only | explicit human approval |
| project-shared | append to an approved shared project document | same repository and matching applies-to scope only | explicit human approval; sharing or committing remains a separate action |

Follow the target repository's existing state/docs convention. If none exists, recommend `.agent-state/frontend-design/decisions/<date>-<surface>.md`; do not hardcode a new tracked docs path. Never read another repository's decisions implicitly. Paraphrase explicit feedback rather than persisting private conversation excerpts, and never store “the owner likes X” as portable doctrine.

One selection may establish an approved direction only for its recorded project/surface. Portable doctrine requires independent repeated evidence, contradiction review, and explicit maintainer promotion. Later contradictory evidence appends a superseding or narrowing link instead of erasing history. Route any proposal to change repo guidance, memory, or global skills through `mahiro-guidance-refine`; a selection result never edits skill files automatically.

### Longitudinal and Holdout Checks

Run longitudinal synthesis only on explicit request.

| Holdout | Conditioned lane | Control lane | Required boundary |
| --- | --- | --- | --- |
| same-project | load only retained decisions matching repository and applies-to scope | load no retained decision | keep packet, render states, and evaluation sealed and matched |
| cross-brand negative | load no decision from the source project | load no retained decision | neither project memory nor winning expressive anatomy may leak globally |

A `portable-candidate` remains unavailable cross-project until explicitly promoted.

## 6. Rendered QA Evidence Contract

Use durable QA artifacts when implementation is part of the task and visual, responsive, localization, state, or proof-quality claims need evidence. Choose a risk-based matrix; do not impose every viewport or state on a small bounded change.

For comparison or high-risk work that needs machine-checkable state identity, interaction coverage, same-state closure, or reproducible packet/receipt hashes, use [evidence-tools.md](evidence-tools.md) and its dependency-free validator. Browser tooling still owns capture; the validator decides whether the resulting artifact is admissible.

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
- Capture readiness: fonts / critical media / lazy content / intended animation or UI state
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

- Wait for the declared ready condition before capture: fonts loaded, critical images decoded, lazy content present, and the intended animation/UI state reached or deliberately frozen. Record what was actually ready.
- Attempt a whole-composition capture when page-level rhythm is under review.
- Validate full-page output against DOM geometry before treating it as evidence.
- If fixed/sticky regions duplicate, blank bands appear, or geometry disagrees, mark the capture unreliable.
- If a dynamic reference cannot reach a stable ready state, mark the image incomplete and fall back to section-anchor captures, important DOM rectangles, content/heading inventory, and per-state screenshots rather than explaining away a broken image.
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

## 7. Completion Reconciliation

```text
Requested deliverables: N
Planned deliverables: N
Completed deliverables: N
Missing/blocked: none | explicit named list
Evidence: paths, renders, checks
```

Do not manufacture extra units to satisfy a fixed template. Do not hide missing units behind “similar to above” or unlabeled placeholders.
