---
name: frontend-design
description: Creates repo-grounded frontend design briefs, reference anatomy, redesign plans, asset requirements, and reference-to-implementation fidelity contracts. Use explicitly when the user asks for frontend design planning, a design brief, reference breakdown, redesign direction, or an image-first implementation handoff. Do not auto-load for native model-taste baselines.
---

# Frontend Design

Turn product intent, repo evidence, and visual references into an implementation-ready frontend brief. This skill owns design planning and handoff structure, not a universal visual style.

## Trigger Policy

Use this skill only when the user explicitly asks for one of these:

- a frontend design brief or design plan
- reference anatomy or visual-direction synthesis
- preserve-versus-overhaul redesign planning
- a web/mobile reference-set plan
- an image-first frontend implementation handoff
- a fidelity review between references and rendered UI

Do not auto-load it for every frontend implementation task. For native model-taste experiments, including GPT-5.6 Sol baselines, keep the first pass limited to repo rules, the product brief, explicit references/assets, and the model's own judgment. Use this skill only in a separately named comparison lane or when Mahiro explicitly requests it.

## Scope and Boundaries

This skill owns:

- page/app job, audience, desired action, and constraints
- repo-backed tokens, primitives, assets, and current design-system evidence
- reference anatomy: structure, hierarchy, media roles, states, and responsive implications
- greenfield, preserve, or overhaul mode selection
- section/screen structure and high-level asset requirements/roles
- reference-set, analysis, and fidelity contracts
- a concise implementation handoff

This skill does not own:

- generic anti-AI cleanup after rendering: use `uncodixify`
- production asset manifests, cleanup, or promotion: use `asset-designer`
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

1. explicit user/product/brand constraints
2. repo-local `AGENTS.md`, docs, tokens, primitives, assets, and current implementation
3. user-provided references and named products
4. current official design-system guidance when the repo actually uses that system
5. fallback design judgment

Do not transplant a reference's framework, component anatomy, palette, typography, or motion stack when the target repo contradicts it.

## Phase Workflow

### Phase 1: Ground in Repo Reality

Inspect only enough evidence to answer:

- What is being designed and who owns it?
- What stack, package manager, tokens, primitives, icons, fonts, and motion tools already exist?
- What routes, labels, forms, analytics hooks, accessibility behavior, and brand assets must survive?
- Is this greenfield, a visual preservation pass, or an approved overhaul?

Label missing evidence instead of filling it with portable taste defaults.

### Phase 2: Write the Design Read

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

For redesign details, load [references/brief-workflow.md](references/brief-workflow.md).

### Phase 4: Analyze References as Evidence

For each reference, separate:

- **Keep**: supports the page job, hierarchy, comprehension, affordance, accessibility, or brand clarity.
- **Adapt**: useful anatomy, but incompatible details must be translated through repo constraints.
- **Reject**: decoration, fake product state, impossible behavior, copied trade dress, or implementation specificity without local support.
- **Unknown**: cannot be proven from a still image, partial screenshot, generated text, or missing viewport/state.

Generated images are reference boards, not proof of responsive behavior, accessibility, real copy, motion, or implementation correctness.

### Phase 5: Build the Brief

Define only what the implementer needs:

1. surface job, audience, and primary action
2. mode and preservation boundary
3. information architecture or section/screen sequence
4. visual-system cues grounded in repo/reference evidence
5. typography, color, surface, and spacing roles without invented tokens
6. component responsibilities and important interaction states
7. responsive/mobile behavior
8. motion/media purpose and reduced-motion expectations
9. high-level asset roles, placement constraints, and ownership route
10. implementation constraints, ambiguities, and verification plan

Do not force layout diversity, asymmetry, bento, dual themes, image generation, or animation merely to make the output look designed.

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

For reference-set and fidelity templates, load [references/reference-contracts.md](references/reference-contracts.md).

`frontend-design` names the role an asset must serve. Filenames, ratios, production strategy, manifests, cleanup, QA, and promotion remain owned by `asset-designer` and its routed production skills.

## Stop Gates

- Stop and ask when preserve versus overhaul materially changes the requested result and cannot be inferred.
- Do not invent brand assets, product data, metrics, legal copy, routes, or user-owned content.
- Do not claim a generated image proves runtime behavior.
- Do not add dependencies, design systems, fonts, icon libraries, or animation engines without repo evidence and approval where required.
- Do not silently change route slugs, nav labels, form names/order, analytics identifiers, legal copy, logos, or established accessibility behavior.
- If a reference conflicts with the product or repo, document the conflict instead of forcing fidelity.

## Output Contract

Return or write a brief with this stable shape:

1. **Current reality** — checked repo/product evidence
2. **Design read** — surface, audience, action, direction, constraints
3. **Mode** — greenfield, preserve, overhaul, reference-set, or fidelity
4. **Structure** — IA, sections/screens, component ownership
5. **Reference decisions** — keep, adapt, reject, unknown
6. **Visual and interaction system** — roles, states, responsive/motion intent
7. **Asset requirements** — needed roles/placements/constraints and routed owner, without duplicating the production manifest
8. **Implementation constraints** — preserve boundaries and unsupported assumptions
9. **Verification** — target viewports/states and evidence to capture
10. **Open question/blocker** — none or one material unresolved item

For combined plan-and-build requests, keep the brief concise, then continue implementation unless the user asked for a planning-only artifact.

## Validation / Self-check

Before finishing:

- Every claimed repo rule has a checked source.
- The brief states what is current reality versus recommended direction.
- References were decomposed into anatomy rather than copied as a style package.
- Required states include focus, loading, empty, error, and disabled only where the product needs them.
- Responsive behavior is explicit for high-risk layouts.
- Motion has a product purpose and a reduced-motion path when non-trivial.
- Asset counts come from planned coverage, not a universal one-image-per-section rule.
- Requested, planned, completed, and blocked deliverables reconcile when producing a reference set.
- Native model-taste experiments were not preconditioned by this skill unless explicitly selected.

## References

- [references/brief-workflow.md](references/brief-workflow.md) — redesign modes, reference review, and brief composition
- [references/reference-contracts.md](references/reference-contracts.md) — reference-set manifest, generated-reference analysis, and fidelity matrix

ARGUMENTS: $ARGUMENTS
