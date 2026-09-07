---
name: creating-character-ip
description: Creates simple lovable character/IP concepts and preserves a human-selected character while adapting its composition, crop, scale, posture, or target-surface fit through direct image references. Use when users ask to create a mascot or character IP, make a cute IP image, keep the same generated character, move an existing mascot to another corner, recompose it for an app icon or avatar, or generate controlled identity-preserving variants. Do not use for broad non-character logo exploration, UI icon sets, final vector artwork, trademark clearance, or production asset integration.
---

# Creating Character IP

Create one recognizable character identity, obtain a human visual lock, then
adapt that same identity without quietly redesigning it. Creation and adaptation
live in this one skill, but a human selection gate separates the two routes.

This skill is self-contained. It does not invoke, install, or require another IP
skill at runtime.

## Operating Posture

Act as a character/IP director, not a broad logo designer or production finisher.
Optimize for a simple ownable silhouette, lovable personality, identity
continuity, and intentional composition. Resist the easy failure mode: inventing
a cute new mascot or forcing every character into the same centered-or-cornered
template when the job is to preserve and art-direct an accepted character.

The human owns identity and taste. The image model owns only its returned raster.
The target repository owns integration and runtime correctness.

## Scope and Handoffs

This skill owns:

- grounding a character direction in current product truth
- generating independent character candidates when no accepted identity exists
- freezing one human-selected image as the identity authority
- adapting one approved structural axis through direct image-reference calls or
  an exact mirror-safe deterministic transform
- preserving prompts, provider identities, first returns, and review evidence
- recording the human selection before production work begins

This skill does not own:

- abstract symbols, wordmarks, monograms, or broad logo-territory exploration
- final vectors, trademark/similarity clearance, print systems, or icon families
- provider authentication, pane lifecycle, dicut, background removal, production
  export, asset catalogs, or product-repository integration

Use `direct-cli` or the current provider owner for receipt-bound generation.
Use `asset-designer` after selection for production cleanup, alpha/dicut, variants,
and delivery QA. Let the target repository own installation. These are handoffs,
not hidden dependencies on another character-IP method.

When a product repository supplies context only, keep it read-only. Store prompts,
raw outputs, receipts, reports, and boards in a personal workspace or explicitly
approved lab until the human asks to integrate a selected result.

## Route Decision

Choose exactly one route before creative work:

| Current state | Route | Required input |
| --- | --- | --- |
| No character has human approval | **Explore** | Product truth; no image reference |
| One character image is human-selected | **Adapt** | Exact accessible selected raw |
| The selected image exists only in chat and the visual owner cannot access it | **Blocked** | Establish a direct file/attachment route |
| A production asset exists and only packaging is requested | **Handoff** | Route to production/integration owner |

Do not automatically run Explore and Adapt as one uninterrupted batch. A model
or agent cannot award the visual lock required between them.

## Decision Sequence

### 1. Establish product and artifact truth

Resolve only what changes the draw:

- what the product does, who it serves, and how the character should feel
- whether the user already selected a subject, feature, palette, or material
- eventual surface and smallest relevant display size
- symbols, cultural meanings, competitors, or character families to avoid
- artifact owner, provider route, and exact proposed call count

Prefer the product brief, current identity owner, and accepted rendered evidence.
Do not turn a bounded character request into a branding workshop.

### 2. Run only the required route

For **Explore**, read and follow
[the creation route](references/explore-route.md). Propose grounded directions
and obtain the human direction gate before generation unless the current request
already authorizes the exact batch.

For **Adapt**, read and follow
[the adaptation route](references/adapt-route.md). Hash the exact selected image,
write an identity lock, and vary one approved axis. Run its mirror-only
short-circuit before opening a provider call; when generation is still required,
every candidate receives the same original reference.

### 3. Verify the live provider boundary

Use an instruction-following image model with a proven generation schema and,
for Adapt, proven image-reference input. Recheck the live tool before every job;
do not fabricate support for image references, previous-image IDs, transparency,
dimensions, negative prompts, or model selection.

Skip the provider boundary when Adapt resolves to an approved deterministic
mirror. Never spend a generation call merely to reverse mirror-safe pixels.

The bounded Care evidence used GPT Image 2, but that historical result is not a
permanent provider-routing rule. Read
[provenance and evidence](references/provenance-and-evidence.md) when reviewing
or materially revising this workflow.

Before a paid or remote call, announce the provider/model when known and exact
call count. Standing permission may remove another approval gate, but never
removes the announcement, duplicate-submit protection, or receipt.

### 4. Preserve one-pass evidence

For every candidate:

1. Persist the exact UTF-8 prompt before submission.
2. Bind the result to the exact returned provider path and available identity.
3. Preserve only that receipt-bound artifact; never scan for the newest file.
4. Record prompt, reference, and raw hashes plus dimensions and call counts.
5. Keep the first return untouched through the human gate.

Do not silently retry, filter, repair, crop, resample, recolor, remove a
background, or replace a weak return. If a provider returns no image, record the
failure and continue only when doing so cannot duplicate an unknown submission.

For a deterministic mirror, preserve the accepted source unchanged and record
the exact transform, source/output hashes, dimensions, and provider call count
of zero. Label the result a deterministic derivative, never a generated
candidate.

### 5. Inspect pixels without grading taste

Present every return at equal visual size. Keep raw files as evidence owners; a
board is only a mechanical derivative.

Inspect full-resolution pixels plus the actual target size or mask. Report:

- assigned direction versus observed composition
- identity retained, drifted, or ambiguous
- clipping, mask pressure, lost paired features, or unreadable details
- dimensions, mode, prompt/reference mapping, provider identity, and counts

Never say a requested corner, posture, palette, or gesture succeeded because it
appeared in the prompt. Separate mechanical findings from taste and leave the
selection to the human.

### 6. Lock selection and hand off

Record the selected label, human wording, accepted properties, source hash, and
rejected alternatives. Scope acceptance narrowly: approval of composition does
not authorize changing palette, anatomy, expression, prop, or material.

After selection:

- preserve the selected native raw unchanged
- prefer an exact deterministic mirror over regeneration when the requested
  change is mirror-only and every directional/asymmetric cue may reverse
- make deterministic target exports only when the target contract requires them
- do not pre-round app-icon artwork; the platform owns its display mask
- hand alpha/dicut, vectors, platform variants, legal review, and repository
  integration to their current owners
- never call a raw character production-ready from visual selection alone

## Prompt Posture

Describe the image rather than its commercial label. During raw draws, do not
tell the image model that it is making a `logo`, `brand mark`, `app icon`, or
`icon asset`; those terms can invite text, badges, mockups, centered-sticker
grammar, and familiar logo clichés. Keep target-surface constraints in the
workflow and express only necessary geometry in the provider prompt.

Use one dominant silhouette, a few large rounded forms, one defining feature,
broad color masses, and a face subordinate to the silhouette. Remove detail that
disappears at `32 × 32`. Do not default to any one placement. Centered, side-crop,
high/low, and corner compositions are all valid when the direction, silhouette,
or target surface justifies them. Avoid centering by habit, but do not turn corner
placement into another mandatory template.

## Example

Situation: a user likes one generated rounded companion and its sprout, cheeks,
expression, and soft material, then asks for the same exact artwork on the
opposite side of a small square surface.

Decision: choose Adapt, freeze those identity properties, and run the mirror
safety audit. If the sprout, gesture, gaze, marks, and baked lighting may all
reverse, preserve the selected raw and create one exact horizontal-flip
derivative with no provider call. Present both under the target mask. If any cue
must keep its original direction, use a reference edit instead.

Boundary: an exact flip is a derivative, not an independent generated candidate.
Do not substitute it when the user wants two creative alternatives or a move
that preserves handedness/orientation. If no source character has human approval,
use Explore first. If the user already chose a production image and asks only to
install it, skip creative work and hand off to the target repository.

## Stop Gates

Stop and ask or report a blocker when:

- product purpose, intended personality, or subject cannot be inferred
- Adapt has no human-selected source image
- a mirror request has unresolved text, handedness, prop, gaze, mark, lighting,
  or directional semantics
- the raw source cannot reach the chosen visual owner directly
- the live provider does not support the required reference input
- call count, paid-provider authority, or artifact ownership is unclear
- multiple simultaneous changes make identity retention impossible to judge
- the only write location is a context-only product repository
- the request jumps from a raw candidate to final-logo or legal claims

## Output Contract

Before **Explore** generation, return:

1. grounded product interpretation
2. concise character directions and rationale
3. candidate labels, composition distribution, provider, and exact call count
4. artifact owner and human direction gate

Before **Adapt** execution, return:

1. selected source path and hash
2. identity lock: preserve / may change / reject
3. single variation axis, candidate labels, and target-surface checks
4. deterministic transform plus zero-call receipt, or provider/reference route
   plus exact call count, and the artifact owner

After generation, return:

1. every label and assigned variation
2. raw/prompt/reference/provider receipts and failure/retry counts
3. one neutral board plus target-size or target-mask evidence
4. observed deviations without filtering candidates
5. the human selection question

After selection, return the exact human verdict, accepted properties, rejected
alternatives, unresolved production/legal checks, and named handoff owner.

## Validation / Self-check

Before closing, confirm:

- exactly one route owned the current creative step
- no runtime dependency on another IP/logo skill was introduced
- Explore candidates were independent
- mirror-only Adapt requests used the deterministic short-circuit when every
  asymmetric/directional cue could safely reverse
- deterministic mirrors were labelled as derivatives with zero provider calls
- Adapt candidates all used the same selected source without output chaining
- the raw image reached the visual owner directly, not through a prose substitute
- the batch varied one structural axis rather than redesigning everything
- composition was assigned from direction/subject/target evidence rather than a
  universal centered or corner template
- provider prompts omitted end-use language unless generated typography was
  explicitly requested
- requested and observed composition were reported separately
- full-size and target-size/mask pixels were inspected
- human selection preceded production transformation or integration
- context-only product repositories remained untouched
- commit, push, release, and legal-clearance boundaries stayed explicit

## References

- Read [the Explore route](references/explore-route.md) only when creating an
  initial character identity without a selected reference.
- Read [the Adapt route](references/adapt-route.md) only when preserving one
  human-selected character through reference edits.
- Read [provenance and evidence](references/provenance-and-evidence.md) when
  reviewing, distributing, or materially revising the skill.
