---
name: frontend-design
description: Creates repo-grounded, brand-relative frontend design briefs, taste theses, reference synthesis, redesign preservation decisions, reference-set plans, asset requirements, and rendered fidelity contracts. Use explicitly for those artifacts or decisions, not ordinary frontend implementation or bug fixes. Do not auto-load for native model-taste baselines.
---

# Frontend Design

Turn product intent, brand evidence, repo reality, and visual references into an implementation-ready frontend brief. This skill owns positive brand-relative taste, design planning, and handoff structure—not a universal visual style.

## Trigger Policy

Use this skill only when the user explicitly asks for one of these:

- a frontend design brief or design plan
- a brand-relative visual direction or taste thesis
- reference anatomy or visual-direction synthesis
- preserve-versus-overhaul redesign planning
- a web/mobile reference-set plan
- an image-first frontend implementation handoff
- a fidelity review between references and rendered UI

Do not auto-load it for every frontend implementation task. For native model-taste experiments, keep the first pass limited to repo rules, the product brief, explicit references/assets, and the model's own judgment. Use this skill only in a separately named comparison lane or when explicitly requested.

## Scope and Boundaries

This skill owns:

- page/app job, audience, desired action, and constraints
- brand evidence, Brand Read, Taste Thesis, and Reference Fit reasoning
- repo-backed tokens, primitives, assets, and current design-system evidence
- reference anatomy: structure, hierarchy, media roles, states, and responsive implications
- greenfield, preserve, or overhaul mode selection
- section/screen structure and high-level asset requirements/roles
- reference-set, analysis, and fidelity contracts
- a concise implementation handoff

This skill does not own:

- generic anti-AI cleanup after rendering: use `uncodixify`
- asset planning, source strategy, delivery manifests, cleanup, and QA: use `asset-designer`
- per-asset generation prompts: use `web-asset-prompts`
- Codex imagegen/source/QA lane orchestration: use `codex-asset-production`
- repo architecture or code-style invention: repo docs and `mahiro-style` take precedence
- automatic style classification, fixed taste dials, mandatory image counts, or universal font/palette/motion rules

## Usage

```text
/frontend-design [brief|redesign|reference-set|fidelity] [context]
```

Default mode is `brief`. Interpret arguments conversationally; there is no script or hidden scoring layer.

## Evidence Priority

Use this order:

1. explicit user/product/brand constraints and approved brand direction
2. repo-local `AGENTS.md`, docs, tokens, primitives, assets, and current implementation
3. user-provided references and named products
4. current official design-system guidance when the repo actually uses that system
5. fallback design judgment

Do not transplant a reference's framework, component anatomy, palette, typography, or motion stack when the target repo contradicts it.

## Effort Ladder

Use the smallest workflow that can change the decision:

- **Bounded task** — current evidence, requested change, preserve boundary, and focused verification only.
- **Design/redesign brief** — add material Brand Read, mode, structure, and reference decisions.
- **Whole-composition or high-risk work** — add separate audits, claim tracing, section map, approval gates, whole-composition checkpoint, and durable rendered QA.

Do not complete ceremony merely because a template exists. Omit non-material sections instead of marking a large packet `not applicable`.

## Phase Workflow

### Phase 1: Ground in Repo Reality

Inspect only enough evidence to answer:

- What is being designed and who owns it?
- What stack, package manager, tokens, primitives, icons, fonts, and motion tools already exist?
- What routes, labels, forms, analytics hooks, accessibility behavior, and brand assets must survive?
- What brand promise, audience, emotional read, visual heritage, and category expectations are repo-proven or explicitly approved?
- Is this greenfield, a visual preservation pass, or an approved overhaul?

Label missing evidence instead of filling it with portable taste defaults.

For multi-section redesign or composition work, keep four evidence views separate before planning:

- **Baseline audit** — what the current rendered surface does well, fails to explain, or cannot prove.
- **Reference audit** — anatomy, pacing, media roles, responsive behavior, and explicit keep/adapt/reject decisions.
- **Brand audit** — repo-proven identity, approved direction, tokens, assets, visual heritage, and unknowns.
- **Product-truth audit** — every proposed claim or demonstration traced to current code, docs, data behavior, or an explicit caveat.

Use only the audit views that can materially change the task. Do not impose a whole-page evidence packet on a small component fix.

### Phase 2: Write the Brand Read, Taste Thesis, and Design Read

Separate brand evidence into repo-proven reality, approved direction, reference-derived hypothesis, recommended direction, and unknown. Load [references/brand-taste.md](references/brand-taste.md) when positive visual judgment or cross-brand differentiation is material.

When visual direction, brand differentiation, reference selection, or whole-composition identity is material, record one conditional Taste Thesis. Omit it for bounded accessibility, state, spacing, or component work.

```text
Taste thesis: <brand/product> should feel <specific emotional/behavioral qualities> so <audience> can <primary action or belief>, without becoming <relevant failure>.
```

Record one concise interpretation:

```text
Design read: <surface/job> for <audience>, helping them <primary action>, using <repo-backed visual/system direction> under <key constraints>.
```

Ask at most one bundled question only when the answer would materially change structure, preservation mode, or asset scope. Otherwise proceed with explicit assumptions.

### Phase 3: Select the Work Mode

- **Greenfield**: no established UI, or a new visual system is explicitly approved.
- **Preserve**: modernize hierarchy, rhythm, states, and quality without changing brand/IA contracts.
- **Overhaul**: a new visual language is approved, while product content and operational contracts remain protected unless separately authorized.
- **Reference set**: plan named web sections or mobile screens before generation.
- **Fidelity**: compare references with the rendered implementation and classify differences.

Select a composition strategy separately from the work mode:

- **Local preservation** — retain the existing anatomy and improve a bounded area.
- **Targeted recomposition** — replace or reorder the smallest block that cannot perform its job.
- **Whole-composition reset** — rebuild the page/screen relationship when the current anatomy blocks the product story, proof, or primary action and local polish cannot resolve it.

A whole-composition reset may reorder sections only within the approved IA and content inventory. It does not authorize invented product behavior, new brand language, navigation or route/IA changes, unsupported copy, or replacement of verified assets. Preserve those contracts unless the user explicitly approves changing them.

For redesign details, load [references/brief-workflow.md](references/brief-workflow.md).

### Phase 4: Analyze References as Evidence

For each reference, separate:

- **Keep**: supports the page job, hierarchy, comprehension, affordance, accessibility, or brand clarity.
- **Adapt**: useful anatomy, but incompatible details must be translated through repo constraints.
- **Reject**: decoration, fake product state, impossible behavior, copied trade dress, or implementation specificity without local support.
- **Unknown**: cannot be proven from a still image, partial screenshot, generated text, or missing viewport/state.

Then classify its **Reference Fit** for the target brand/job as Exemplary, Near miss, Repetitive formula, Reject for this job, or Unproven. Prefer pairwise rationale over a context-free numeric taste score. A reference that looks polished but can move across unrelated brands through a token swap is weak brand evidence.

Generated images are reference boards, not proof of responsive behavior, accessibility, real copy, motion, or implementation correctness.

### Phase 5: Build the Brief

Define only what the implementer needs:

1. surface job, audience, and primary action
2. Brand Read, Taste Thesis, evidence status, and unknowns when material
3. mode and preservation boundary
4. information architecture or section/screen sequence
5. visual-system cues grounded in brand/repo/reference evidence
6. typography, color, surface, spacing, imagery, density, and restraint roles without invented tokens
7. component responsibilities and important interaction states
8. responsive/mobile behavior
9. motion/media purpose and reduced-motion expectations
10. high-level asset roles, placement constraints, and ownership route
11. implementation constraints, ambiguities, and verification plan

Do not force layout diversity, asymmetry, bento, dual themes, image generation, or animation merely to make the output look designed.

For a multi-section whole-composition reset, map each section's user question, verified product fact, proof artifact, surface/transition role, mobile behavior, and evidence status before implementation. A proposed claim or product demonstration without source evidence must be removed, qualified, or marked blocked.

### Phase 6: Route Specialist Work

Use the smallest matching lane:

```text
frontend-design brief
→ asset-designer (multi-asset plan, layers, filenames, delivery)
→ web-asset-prompts (one generated asset prompt)
→ codex-asset-production (bounded imagegen/source/cleanup/QA lanes)
→ implementation
→ rendered desktop/mobile evidence
→ uncodixify audit, only when explicitly requested or concrete drift appears
```

Run `uncodixify` only after the first rendered composition exists. It is a second-pass audit for observed generic drift, not a preconditioner for the native-model baseline or first whole-composition pass.

For reference-set and fidelity templates, load [references/reference-contracts.md](references/reference-contracts.md).

`frontend-design` names the role and visual contract an asset must serve. `asset-designer` owns filenames, ratios/formats, source strategy, asset planning, delivery manifests, cleanup, QA, and downstream production routing.

## Stop Gates

- Stop and ask when preserve versus overhaul materially changes the requested result and cannot be inferred.
- Do not invent brand assets, product data, metrics, legal copy, routes, or user-owned content.
- Do not claim a generated image proves runtime behavior.
- Do not add dependencies, design systems, fonts, icon libraries, or animation engines without repo evidence and approval where required.
- Do not silently change route slugs, nav labels, form names/order, analytics identifiers, legal copy, logos, or established accessibility behavior.
- If a reference conflicts with the product or repo, document the conflict instead of forcing fidelity.
- Before implementing a whole-composition reset that changes regulated or safety-critical claims, consent, authentication, transactions, legal disclosures, privacy/data-flow promises, or conversion mechanics, require explicit approval of those changed contracts. The current request counts only when it names and approves those changes; otherwise stop after the proposed brief and verification plan.
- Do not treat a clean build or one full-page screenshot as visual proof. Preserve durable viewport/state evidence, and use section anchors plus DOM geometry when full-page capture output is duplicated, blank, or otherwise unreliable.
- New or transformed production assets require a routed asset handoff; `frontend-design` specifies role, placement, viewport behavior, crop/safe-zone, truth/IP constraints, and visual acceptance criteria, then `asset-designer` coordinates source strategy, manifest, production routing, cleanup, QA, and delivery.

## Output Contract

Return or write a brief with this stable shape:

For a small bounded task, keep the same evidence discipline but return only material sections; omit the rest instead of expanding the task to complete the template.

1. **Current reality** — checked repo/product/brand evidence and its status
2. **Brand Read and Taste Thesis, when material** — audience, category job, desired emotional read, positive direction, restraint boundary, unknowns
3. **Design read** — surface, action, direction, constraints
4. **Mode and composition strategy** — work mode plus local preservation, targeted recomposition, or whole-composition reset
5. **Structure** — IA, sections/screens, component ownership
6. **Reference decisions and fit** — keep/adapt/reject/unknown plus exemplary/near-miss/formula/unproven reasoning
7. **Visual and interaction system** — brand translation, roles, states, responsive/motion intent
8. **Asset requirements** — needed roles/placements/constraints and routed owner, without duplicating the production manifest
9. **Implementation constraints** — preserve boundaries and unsupported assumptions
10. **Verification** — target viewports/states and evidence to capture
11. **Open question/blocker** — none or one material unresolved item

For combined plan-and-build requests, keep the brief concise, then continue implementation unless the user asked for a planning-only artifact.

## Validation / Self-check

Before finishing:

- Every claimed repo rule has a checked source.
- The Brand Read distinguishes repo-proven reality, approved direction, hypothesis, recommendation, and unknown.
- The Taste Thesis defines a positive brand direction and relevant failure boundary without becoming a house style.
- The brief states what is current reality versus recommended direction.
- References were decomposed into anatomy rather than copied as a style package.
- Reference Fit was judged against the target brand/job, not universal attractiveness or a numeric taste score.
- The design would not become a different brand merely through a token swap unless shared anatomy is justified by product/design-system reality.
- Brand-specific typographic voice, hero cadence, proof framing, and CTA closure were checked for deeper cross-brand convergence.
- The signature expression shapes the main composition, interaction, or proof relationship rather than surviving as removable decoration.
- Required states include focus, loading, empty, error, and disabled only where the product needs them.
- Responsive behavior is explicit for high-risk layouts.
- Motion has a product purpose and a reduced-motion path when non-trivial.
- Asset counts come from planned coverage, not a universal one-image-per-section rule.
- Product/proof media remains meaningfully inspectable at target viewports; uncropped-but-unreadable evidence is not accepted.
- Requested, planned, completed, and blocked deliverables reconcile when producing a reference set.
- Native model-taste experiments were not preconditioned by this skill unless explicitly selected.
- Multi-section composition resets have a section map and a whole-composition rendered checkpoint before local polish.
- Implementation-backed visual claims have durable, truthfully named viewport/language/state evidence rather than transient or mislabeled screenshots.

## References

- [references/brief-workflow.md](references/brief-workflow.md) — redesign modes, reference review, and brief composition
- [references/reference-contracts.md](references/reference-contracts.md) — reference-set manifest, generated-reference analysis, and fidelity matrix
- [references/brand-taste.md](references/brand-taste.md) — Brand Read, Taste Thesis, Reference Fit, conditional principles, and rendered cross-brand comparison

ARGUMENTS: $ARGUMENTS
