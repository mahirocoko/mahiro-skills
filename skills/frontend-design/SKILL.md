---
name: frontend-design
description: Creates repo-grounded, brand-relative frontend design briefs, taste theses, reference synthesis, redesign preservation decisions, reference-set plans, asset requirements, rendered fidelity reviews, and scoped comparison/selection contracts. Also use for a large frontend-reference corpus review when the user asks to inspect or reverse engineer many live site/app UIs, synthesize frontend-design evidence, or decide corpus adequacy for a named frontend design decision. Do not use this corpus trigger for generic deep research or broad source-backed synthesis without that frontend design decision. Do not auto-load for ordinary implementation, bug fixes, or native model-taste baselines.
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
- an explicit comparison of multiple rendered frontend directions
- a large frontend-reference corpus review to inspect or reverse engineer many live site/app UIs, synthesize frontend-design evidence, or judge corpus adequacy for a named frontend design decision

Route generic topic research, broad source-backed synthesis, and non-frontend corpora without a named frontend design decision to `deep-research` instead.

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
- an owner-approved Mac product aesthetic fallback for confirmed Mahiro personal Web/App projects when material brand/repo direction is thin

This skill does not own:

- generic anti-AI cleanup after rendering: use `uncodixify`
- asset planning, source strategy, delivery manifests, cleanup, and QA: use `asset-designer`
- per-asset generation prompts: use `web-asset-prompts`
- Codex imagegen/source/QA lane orchestration: use `codex-asset-production`
- repo architecture or code-style invention: repo docs and `mahiro-style` take precedence
- automatic style classification, fixed taste dials, mandatory image counts, or universal font/palette/motion rules

## Usage

```text
/frontend-design [brief|redesign|reference-set|fidelity|comparison] [context]
```

Default mode is `brief`. Interpret arguments conversationally; there is no command-dispatch or brief-generation script, and no hidden scoring layer.

`comparison` is an opt-in review mode, not a default design phase. Keep retention separate as `session-only | project-private | project-shared`; default to `session-only` unless the human owner explicitly approves durable project retention.

## Evidence Priority

Use this order:

1. explicit user/product/brand constraints and approved brand direction
2. repo-local `AGENTS.md`, docs, tokens, primitives, assets, and current implementation
3. user-provided references and named products
4. current official design-system guidance when the repo actually uses that system
5. the owner-approved Mac product profile only for confirmed Mahiro personal work when material brand/repo direction is thin
6. fallback design judgment

Do not transplant a reference's framework, component anatomy, palette, typography, or motion stack when the target repo contradicts it.

## Effort Ladder

Use the smallest workflow that can change the decision:

- **Bounded task** — current evidence, requested change, preserve boundary, and focused verification only.
- **Design/redesign brief** — add material Brand Read, mode, structure, and reference decisions.
- **Whole-composition or high-risk work** — add separate audits, claim tracing, section map, approval gates, whole-composition checkpoint, and durable rendered QA.
- **Comparison (opt-in)** — use two directions for material pairwise ambiguity or two to three isolated directions for whole-composition selection; do not add comparison artifacts to bounded work by default.

Do not complete ceremony merely because a template exists. Omit non-material sections instead of marking a large packet `not applicable`.

### Reference-driven learning mode

When the owner supplies a live reference and asks to learn from or make a frontend lab “like this,” treat the reference's complete visible page anatomy as the default scope unless they explicitly bound it. Before the first implementation edit, make a compact section map of the material sequence and label each section Keep, Adapt, or Reject.

Implement adapted non-regulated anatomy through original copy, brand, and content without waiting for a separate prompt for ordinary sections such as a gallery, access/pricing comparison, CTA, or footer. For access/pricing comparisons, use owner- or repo-provided product facts first. In an explicitly sandboxed learning lab only, clearly fictional placeholder values may be used when the surface is visibly labeled as a demo and not a live transaction; never present them as real product data. Ask before changing or inventing a real payment, authentication, legal, consent, privacy, or conversion contract—not merely because the reference contains its visual anatomy.

When the owner accepts one rendered section or screen as the axis for a larger family, define the shared experience contract before propagating it. Record the shared visual grammar, media/content ownership, input and reduced-motion rules, and compact/detail relationship separately from each variant's interaction job. Do not leave the accepted anchor as a polished special case while other items imitate only its surface styling.

When a compact preview claims to represent a detail experience, prefer the same runtime or component family with an explicit compact mode. If that is not feasible, document the behavioral difference instead of implying parity. Update prompts, specs, notes, and accessibility names in the same change as the runtime mechanism, then verify matched compact/detail states at target viewports.

## Phase Workflow

### Phase 1: Ground in Repo Reality

Inspect only enough evidence to answer:

- What is being designed and who owns it?
- What stack, package manager, tokens, primitives, icons, fonts, and motion tools already exist?
- What routes, labels, forms, analytics hooks, accessibility behavior, and brand assets must survive?
- What brand promise, audience, emotional read, visual heritage, and category expectations are repo-proven or explicitly approved?
- Is this greenfield, a visual preservation pass, or an approved overhaul?

Label missing evidence instead of filling it with portable taste defaults. The approved owner profile is not repo evidence: activate it only through its narrow personal-project gate and record it as approved direction.

For multi-section redesign or composition work, keep the material evidence views separate before planning:

- **Baseline audit** — what the current rendered surface does well, fails to explain, or cannot prove.
- **Reference audit** — anatomy, pacing, media roles, responsive behavior, and explicit keep/adapt/reject decisions.
- **Brand audit** — repo-proven identity, approved direction, tokens, assets, visual heritage, and unknowns.
- **Product-truth audit** — every proposed claim or demonstration traced to current code, docs, data behavior, or an explicit caveat.

Use only the audit views that can materially change the task. Do not impose a whole-page evidence packet on a small component fix.

### Phase 2: Write the Brand Read, Taste Thesis, and Design Read

Separate brand evidence into repo-proven reality, approved direction, reference-derived hypothesis, recommended direction, and unknown. Load [references/brand-taste.md](references/brand-taste.md) when positive visual judgment or cross-brand differentiation is material.

When `frontend-design` is already active for a material visual-direction decision, ownership is confirmed as a Mahiro personal project, and explicit product/brand plus repo direction are too thin for that decision, load [references/mahiro-mac-product-profile.md](references/mahiro-mac-product-profile.md). Treat it as a strong positive prior for both presentation and working-surface jobs across Web and App runtimes, not repo truth or corpus-derived doctrine. Ownership may be confirmed by Mahiro's statement, an explicit request for the profile, or repo-local docs/trusted project memory that explicitly labels the work as Mahiro's personal project; a repository namespace, package author, remote owner, or local path alone is insufficient. If ownership alone remains material and unknown, ask one bundled question. Explicit requirements, repo evidence, established design systems, accessibility behavior, and approved references override it. Do not activate it for client/team/third-party/uncertain ownership, merely because a product runs on or targets macOS, or during a native model-taste baseline.

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

For design/redesign planning, proof-led composition, or a durable implementation handoff, load [references/brief-workflow.md](references/brief-workflow.md).

### Phase 4: Analyze References as Evidence

When the large frontend-reference corpus trigger above applies, load [references/reference-corpus.md](references/reference-corpus.md) and use its coverage, clustering, saturation, outlier, provenance, and promotion contracts. Do not load it for a normal one- or two-reference brief or a research-completeness question without a named frontend design decision.

For each reference, separate:

- **Keep**: supports the page job, hierarchy, comprehension, affordance, accessibility, or brand clarity.
- **Adapt**: useful anatomy, but incompatible details must be translated through repo constraints.
- **Reject**: decoration, fake product state, impossible behavior, copied trade dress, or implementation specificity without local support.
- **Unknown**: cannot be proven from a still image, partial screenshot, generated text, or missing viewport/state.

Then classify its **Reference Fit** for the target brand/job as Exemplary, Near miss, Repetitive formula, Reject for this job, or Unproven. Prefer pairwise rationale over a context-free numeric taste score. A reference that looks polished but can move across unrelated brands through a token swap is weak brand evidence.

Before asking the human owner to choose, translate abstract visual labels into visible evidence: what is on screen, what it helps the user understand or do, and which material evaluation job is being judged. After selection, record the concrete relationship that caused the choice; `not selected` is not automatically `rejected`, and one selected reference does not establish a broad style preference. When brand impact, product proof, design-system fit, or working-surface clarity are separate material decisions, allow different winners instead of forcing one overall result.

For an explicitly requested multi-variant composition exploration, keep product content, assets, constraints, and target states matched; isolate lanes; preserve an immutable pre-reveal critic verdict; let the human owner select an option or `Neither` before revealing the mapping; and use the comparison contract in [references/reference-contracts.md](references/reference-contracts.md).

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

When typography materially carries the composition, realistic localized copy changes wrapping, or the user asks for an overall typography review, define a semantic type ladder before implementation and use the typography hierarchy gate in [references/brief-workflow.md](references/brief-workflow.md). Do not let display, page title, section title, quote, deck, body, metadata, or media-marker roles drift into one oversized tier.

When the owner profile is active, identify the evidence gap it fills, whether the surface uses the presentation or working-surface lane, which product object/transformation determines the composition, which generic composition was rejected, which decisions came from the profile, and which stronger evidence overrode it.

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
- For an explicitly reference-driven learning lab, do not stop after the first implemented section or wait for prompts for the remaining mapped non-regulated anatomy. Stop only at a real contract boundary or when the owner bounded the scope.
- Preserve the active bounded lane when feedback is ambiguous. During motion, typography, responsive, interaction-state, or asset-QA work, interpret words such as “overall,” “incomplete,” or “not pass” inside that lane unless the owner explicitly reopens composition, anatomy, IA, or asset scope. Ask one concise question before crossing lanes when the broader scope would materially change the implementation.
- Do not invent brand assets, product data, metrics, legal copy, routes, or user-owned content. The only exception is the clearly fictional placeholder access/pricing values permitted for an explicitly sandboxed learning lab above.
- Do not claim a generated image proves runtime behavior.
- Do not add dependencies, design systems, fonts, icon libraries, or animation engines without repo evidence and approval where required.
- Do not silently change route slugs, nav labels, form names/order, analytics identifiers, legal copy, logos, or established accessibility behavior.
- If a reference conflicts with the product or repo, document the conflict instead of forcing fidelity.
- Do not activate the owner Mac product profile when ownership is unknown or the work belongs to a client, employer, team, or third party.
- Do not let the owner profile override explicit product/brand direction, repo implementation, accessibility behavior, an established design system, or approved references.
- In `comparison` mode, critic and agent votes remain advisory. Do not reveal the mapping before the human owner selects an option or `Neither`. Treat selection as session-only with project promotion pending; do not durably promote a direction, retain a project decision, or edit skill guidance without separate approval for the requested retention scope.
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
- When the owner profile is active, the brief labels it as approved personal preference, confirms the personal-project gate, selects the presentation or working-surface lane, records overrides, and keeps the recommendation reversible.
- References were decomposed into anatomy rather than copied as a style package.
- Reference Fit was judged against the target brand/job, not universal attractiveness or a numeric taste score.
- The design would not become a different brand merely through a token swap unless shared anatomy is justified by product/design-system reality.
- Brand-specific typographic voice, hero cadence, proof framing, and CTA closure were checked for deeper cross-brand convergence.
- Typography-led and long-form work defines a semantic type ladder, prefers one top display tier per composition unless product/brand evidence supports more, and keeps quote, body, metadata, and media markers in their reading roles.
- Rendered typography QA checks computed size, line height, measure, and wrapping for every material role at primary and narrow viewports, including mid-page section anchors rather than only the first viewport.
- Localized and Thai-first work uses real copy to check diacritics, mixed-language baselines, breakpoint continuity, and whether line height/measure can solve readability before increasing font size.
- When brand differentiation is material, the signature expression shapes the main composition, interaction, or evidence relationship rather than surviving as removable decoration.
- Required states include focus, loading, empty, error, and disabled only where the product needs them.
- Responsive behavior is explicit for high-risk layouts.
- Motion has a product purpose and a reduced-motion path when non-trivial.
- Asset counts come from planned coverage, not a universal one-image-per-section rule.
- When product/proof media is present, it remains meaningfully inspectable at target viewports; uncropped-but-unreadable evidence is not accepted.
- Requested, planned, completed, and blocked deliverables reconcile when producing a reference set.
- Native model-taste experiments were not preconditioned by this skill unless explicitly selected.
- Multi-section composition resets have a section map and a whole-composition rendered checkpoint before local polish.
- Reference-driven learning labs map the complete visible anatomy before implementation, adapt ordinary non-regulated sections without extra prompts, and label any static transaction-like surface as non-live.
- When an accepted anchor governs a collection, the shared-versus-variant contract is explicit, compact/detail evidence is matched, and prompts/specs describe the current runtime rather than a superseded mechanism.
- Implementation-backed visual claims have durable, truthfully named viewport/language/state evidence rather than transient or mislabeled screenshots.

## References

- [references/brief-workflow.md](references/brief-workflow.md) — redesign modes, reference review, and brief composition
- [references/reference-contracts.md](references/reference-contracts.md) — reference-set manifest, generated-reference analysis, and fidelity matrix
- [references/brand-taste.md](references/brand-taste.md) — Brand Read, Taste Thesis, Reference Fit, conditional principles, and rendered cross-brand comparison
- [references/mahiro-mac-product-profile.md](references/mahiro-mac-product-profile.md) — owner-approved strong Web/App aesthetic fallback for confirmed Mahiro personal projects with thin direction
- [references/evidence-tools.md](references/evidence-tools.md) — executable capture sidecars, interaction coverage, same-state closure, and reproducible packet/receipt hashing
- [references/reference-corpus.md](references/reference-corpus.md) — large-collection coverage, clustering, saturation, outlier, provenance, and safe-promotion workflow

ARGUMENTS: $ARGUMENTS
