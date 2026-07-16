# Brand-Relative Taste

Use this reference when a frontend brief needs positive visual judgment, not only structure and anti-generic cleanup.

Taste is not one portable aesthetic. It is the quality of choosing and resolving visual decisions that express a particular brand while helping a particular product job.

## Table of Contents

1. Evidence and Brand Read
2. Taste Thesis
3. Brand translation
4. Reference Fit
5. Conditional principles
6. Rendered comparison
7. Failure modes and stop gates

## 1. Evidence and Brand Read

Read brand evidence in this order:

1. explicit user and product requirements;
2. repo-local brand docs, tokens, type, assets, components, content, and current implementation;
3. approved user-provided references and named product/category constraints;
4. repeated visual behavior that can be observed in rendered evidence;
5. a clearly labeled recommendation;
6. unknown.

Do not convert a weak inference into brand truth. Record each important claim as:

- **Repo-proven reality** — directly supported by current files or implementation.
- **Approved direction** — explicitly chosen by the user or product owner.
- **Reference-derived hypothesis** — plausible, but not yet established in the target brand.
- **Recommended direction** — a proposed translation with rationale.
- **Unknown** — insufficient evidence; do not fill it with house taste.

Use this compact Brand Read:

```text
Brand promise:
Audience and context:
Product/category job:
Desired emotional read:
Personality and productive tension:
Trust / energy / playfulness posture:
Existing identity, assets, and visual heritage:
Category conventions to keep:
Category conventions intentionally approved to break:
Unknowns:
```

If brand evidence is thin, make a restrained recommendation and keep it reversible. Do not invent a detailed personality system merely to complete the template.

### Owner-Approved Fallback Profiles

An explicitly approved owner profile can supply a strong positive prior when its activation contract is satisfied. It is **approved direction**, not repo-proven reality or a universal taste claim.

- Apply it only within its named ownership, product, and evidence-gap scope.
- Record which decisions come from the profile and keep them reversible.
- Let explicit user/product direction, repo evidence, established systems, accessibility behavior, and approved references override it.
- Do not launder a personal preference into a corpus finding or apply it to unrelated client/team work.

For confirmed Mahiro personal Web/App projects with materially thin direction, `SKILL.md` may route to the owner-approved Mac product profile.

## 2. Taste Thesis

Write one sentence that connects brand character to product behavior:

```text
Taste thesis: <brand/product> should feel <specific emotional/behavioral qualities> so <audience> can <primary action or belief>, without becoming <relevant category or brand failure>.
```

Useful theses create tension and boundaries. “Modern,” “premium,” “clean,” and “editorial” are not enough by themselves.

Example shape:

```text
Taste thesis: This operational product should feel precise and calm enough to earn trust, but not so sterile that complex work becomes intimidating.
```

The thesis is a decision filter, not marketing copy. If a visual move cannot be explained through the thesis, product job, repo system, accessibility, or content, reconsider it.

## 3. Brand Translation

Translate the thesis into relationships rather than fixed values:

| Area | Brand-relative question |
| --- | --- |
| Composition | What should dominate first, and what should deliberately stay quiet? |
| Hierarchy | Which information or action earns the strongest contrast and scale? |
| Typography | What voice, pacing, line-break character, and role contrast fit the brand and real content—and remain distinct from unrelated brand work? |
| Color/material | Which surface relationships express the brand without weakening contrast or state clarity? |
| Imagery/media | What subject, crop, scale, and integration communicate both brand and offering? |
| Density/rhythm | Should the product feel focused, energetic, abundant, technical, calm, or editorial, and why? |
| Components/states | How does the brand survive forms, tables, errors, loading, and non-default states? |
| Motion | What motion character explains state or reinforces the brand without replacing domain evidence? |
| Restraint | Which attractive move should be omitted because it competes with the job or makes the brand generic? |

Shared primitives are acceptable. Identical expressive anatomy across unrelated brands is not automatically acceptable merely because tokens differ.

A signature expression must shape the main composition, interaction, or proof relationship. A detached ornament that can be removed without changing the design's reading path is not carrying the thesis.

## 4. Reference Fit

Judge references against the target Brand Read and product job, not universal attractiveness.

Classify each reference:

- **Exemplary for this job** — brand character, hierarchy, media, and action reinforce each other.
- **Near miss** — polished or useful, but one or more choices conflict with the brand or product job.
- **Repetitive formula** — anatomy can move across unrelated brands by swapping only logo, type, color, or imagery.
- **Reject for this job** — the dominant idea undermines trust, comprehension, action, accessibility, ownership, or brand clarity.
- **Unproven** — available evidence cannot support the claim.

Pairwise comparison is preferred over context-free scoring:

```text
Reference A vs Reference B
- Which belongs more convincingly to this brand without relying on the logo?
- Which supports the primary action more clearly?
- Which translates brand traits into repeatable UI decisions rather than decoration?
- Which contains fewer transplantable formulas?
- Which concrete decisions caused the preference?
- What did the losing option do better?
```

Before asking the owner to choose, explain each option in visible language:

- what is visibly on screen;
- what action, reading path, or behavior it creates;
- which product/page decision is being judged.

Do not rely on compressed labels such as `premium`, `editorial`, `technical`, `quiet`, or `playful` without naming the concrete visual relationship. If the comparison mixes materially different questions—such as brand impact, product proof, design-system fit, or repeated-work clarity—name those questions first and allow different winners.

After selection, ask which concrete factors caused the preference. Record the winning relationship rather than converting the selected reference into a general style preference. `Not selected` is not `rejected`; preserve useful loser strengths and do not infer that an unselected palette, material, category, or visual family is broadly disliked.

Do not aggregate taste into a numeric score. Record the rationale and the evidence.

## 5. Conditional Principles

Convert repeated evidence into conditional guidance:

Use a `when / prefer / because / evidence` structure so the principle keeps its brand and product context.

```text
When: <brand/product situation>
Prefer: <relationship or decision>
Because: <brand and product reason>
Evidence: <repo, approved reference, or rendered comparison>
```

Good principles preserve context. Weak rules declare one font, radius, palette, density, layout, image count, or motion level inherently tasteful.

Example shape:

```text
When: the primary job is configuration or purchase comparison
Prefer: a dominant relationship between inputs, consequences, and the decision endpoint
Because: task causality should outrank atmosphere
Evidence: rendered task flow and content-stress state
```

## 6. Rendered Comparison

Taste claims require rendered evidence when implementation is part of the task.

For a current-versus-candidate comparison, keep these matched:

- product content and primary action;
- assets and source evidence;
- viewport and required states;
- implementation constraints;
- evaluation questions.

Capture desktop and mobile plus at least one content-stress or non-default state.

Product or proof media must remain meaningfully inspectable at the target viewport. “Uncropped” is not enough when the evidence becomes too small to support the claim.

Review each render as:

- **Strong fit** — coherent and recognizably brand-specific.
- **Plausible but generic** — usable, but transferable too easily.
- **Brand conflict** — a dominant decision contradicts brand or product behavior.
- **Unproven** — evidence does not demonstrate the claim.

Then compare winning outputs across different brands. Check for suspicious repetition in typographic voice and cadence, hero reading rhythm, proof framing, section order, card geometry, image placement, CTA closure, and mobile collapse. Reuse may come from product or design-system reality; otherwise explain or remove it. If two unrelated brands retain substantially the same expressive anatomy after replacing their assets and copy, revisit both Taste Theses even when the palettes and product objects differ.

## 7. Failure Modes and Stop Gates

Avoid:

- **Token-swap branding** — the same expressive layout with new colors, fonts, and logos.
- **Exemplar worship** — copying a successful reference instead of translating its decision logic.
- **Formula laundering** — repeatedly using one hero, card grid, split layout, or cinematic object under different brand language.
- **Decorative signature** — naming a brand idea in the brief but leaving it as a removable motif instead of letting it shape composition or interaction.
- **Category stereotype** — treating every finance, wellness, enterprise, luxury, or playful brand as visually identical.
- **Numeric taste theater** — weighted scores that hide judgment instead of explaining it.
- **Still-image overclaiming** — inferring motion, accessibility, responsiveness, or state quality from one frame.
- **Negative-only taste** — rejecting generic moves without defining a positive brand direction.
- **Cross-brand contamination** — teaching one approved brand's expressive grammar as the default for future brands.

Stop and ask when brand positioning, audience, or preserve-versus-overhaul scope would materially change the Taste Thesis and cannot be established from evidence. Otherwise proceed with one explicit, reversible recommendation and label the uncertainty.
