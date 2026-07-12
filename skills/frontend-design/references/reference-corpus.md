# Reference-Corpus Research

Use this workflow when the user asks to inspect, reverse engineer, or decide whether research is complete across a large collection of live references. Do not load it for an ordinary one- or two-reference brief.

This is a research method, not a pattern library. It helps turn a changing set of sites or screens into traceable design evidence without promoting one corpus's visual habits into universal doctrine.

## Contents

1. [Boundaries](#1-boundaries)
2. [Freeze the Corpus Contract](#2-freeze-the-corpus-contract)
3. [Build the Coverage Ledger](#3-build-the-coverage-ledger)
4. [Inspect in Bounded Batches](#4-inspect-in-bounded-batches)
5. [Cluster by Decision Logic](#5-cluster-by-decision-logic)
6. [Decide Saturation](#6-decide-saturation)
7. [Write the Synthesis](#7-write-the-synthesis)
8. [Promote Findings Safely](#8-promote-findings-safely)
9. [Validation / Self-check](#9-validation--self-check)

## 1. Boundaries

- Keep source-specific names, screenshots, URLs, claims, and observations in a project-local research archive or versioned authoring study.
- Put only conditional, repo-neutral method or judgment into the packaged skill.
- Treat live pages as stateful evidence. Auth, cookies, referral parameters, locale, region, consent, experiments, viewport, and capture timing can change the result.
- Do not count a successful HTTP response as a successful visual inspection.
- Do not infer runtime behavior, mobile behavior, accessibility, or motion from a still image alone.
- Do not give every corpus member equal evidentiary weight merely because every item has a row.

Before browsing, state the decision this research must support. A corpus can be sufficient for one decision and insufficient for another.

### Local Evidence Retention and Privacy

- Keep raw captures, browser state, and session artifacts ignored and session-private by default. Record the owner, retention scope, and review/expiry date.
- Before any commit or share, sanitize secret or opaque query/fragment tokens, non-public referral identifiers, headers, cookies, local/session storage, auth/session identifiers, and personal data. A provenance manifest may retain documented public source attribution, but must not retain the sensitive value it replaces.
- Do not commit third-party screenshots, downloaded site bundles, cookies/storage exports, authenticated surfaces, or personal data without separate human approval and a verified right to retain them.
- Treat committing, sharing, and extending retention as separate approvals. At the review/expiry date, ask the owner before deleting or extending local evidence.

## 2. Freeze the Corpus Contract

Record a compact manifest before deep inspection. Keep these field IDs stable when the record is machine-readable:

```text
corpus_id:
research_question:
population_snapshot:
selection_source:
inclusion_exclusion:
dedupe_key:
independence_groups:
strata_targets:
batch_plan:
saturation_rule:
retention:
```

Preserve the source inventory separately from the inspection ledger. If the live collection changes, record the new snapshot instead of silently rewriting the old population.

Keep observation attempts append-only:

```text
observation_id:
source_id:
attempt:
supersedes:
requested_url:
canonical_url:
resolved_url:
redirect_chain:
captured_at:
transport_state:
access_constraints:
surface_currency:
entry_context:
region:
locale:
overlay_state:
viewports:
dpr:
motion_states:
method:
artifact_refs:
artifact_hashes:
population_disposition:
inspection_depth:
admissibility:
limitations:
```

When attempts are retried, give each attempt an identity and mark which attempt supersedes which. Do not overwrite contradictory or failed attempts; they explain evidence quality. Group shared brands, studios, platforms, or templates when independence matters; repeated pages from one family are not automatically independent support.

## 3. Build the Coverage Ledger

Use one row per stable corpus unit. At minimum, reconcile:

| Field ID | What to record |
|---|---|
| `source_id` | Stable ID, canonical label, aliases, source category |
| `transport_state` | Requested, canonical, resolved, redirect chain, and one primary result: reachable, automated-blocked, or unreachable |
| `access_constraints` | Zero or more cross-cutting auth, region, referral, session, consent, experiment, or overlay constraints; redact sensitive values |
| `surface_currency` | Current, stale, or unknown destination/surface status |
| `population_disposition` | Included or excluded, with the applicable selection rule |
| `inspection_depth` | One primary depth: full, partial, structure-only, or none against the required evidence dimensions |
| `admissibility` | Admissible, limited, or inadmissible for the research question |
| `surface_job` | What the surface helps the visitor understand or do |
| `anatomy` | Major compositional regions and their sequence |
| `first_proof` | When product proof is material, the earliest inspectable evidence of the product or promise |
| `signature_carrier` | When brand differentiation is material, what makes the composition recognizably this product or brand |
| `proof_carrier` | When product proof is material, what demonstrates product truth or behavior and the exact claim it supports |
| `responsive_role` | When responsive proof is material, how its explanatory role survives or transforms |
| `motion_role` | When motion is material, its declared job and the evidence that remains without it |
| `trust_mode` | When trust is material, the locally observed evidence that addresses the relevant uncertainty |
| `failure_unknown` | Missing state, collision, unreadable proof, blocked route, unsupported inference |

Keep `not observed`, `not applicable`, and `unknown` distinct. A blank cell must not masquerade as negative evidence.

Track disjoint totals for each dimension:

```text
expected_total:
discovered_total:
expected_missing_total:
unexpected_discovered_total:
included_total:
excluded_total:
attempted_total:
unattempted_total:
full_total:
partial_total:
structure_only_total:
none_total:
admissible_total:
limited_total:
inadmissible_total:
transport_reachable_total:
transport_automated_blocked_total:
transport_unreachable_total:
surface_current_total:
surface_stale_total:
surface_currency_unknown_total:
```

Reconcile identities, not only counts. Require:

- `expected_total + unexpected_discovered_total = discovered_total + expected_missing_total`
- `discovered_total = included_total + excluded_total`
- `included_total = attempted_total + unattempted_total`
- `attempted_total = full_total + partial_total + structure_only_total + none_total`
- `attempted_total = admissible_total + limited_total + inadmissible_total`
- `attempted_total = transport_reachable_total + transport_automated_blocked_total + transport_unreachable_total`
- `attempted_total = surface_current_total + surface_stale_total + surface_currency_unknown_total`

Report visual and DOM/runtime coverage separately when their depth differs. Transport state, surface currency, inspection depth, and analytic admissibility are separate dimensions whose values must not overlap internally. Access constraints are non-exclusive context flags; do not force them into a sum identity or treat them as transport failures.

## 4. Inspect in Bounded Batches

Start with the full inventory, then inspect bounded batches that preserve category and state diversity. Deep-inspect:

- representative members of each materially different product job or compositional strategy
- outliers that contradict the current thesis
- partial or unstable pages that could change a conclusion
- both desktop and mobile when responsive behavior is part of the decision
- initial and settled states when lazy content, animation, hydration, overlays, or redirects can alter the composition

For each batch, record:

```text
batch_id:
planned_ids:
accounted_ids:
attempted_ids:
deferred_ids:
full_ids:
partial_ids:
structure_only_ids:
none_ids:
admissible_ids:
limited_ids:
inadmissible_ids:
new_cluster_ids:
revised_cluster_ids:
outlier_ids:
remaining_strata_gaps:
current_unanswered_question:
saturated:
```

Within a batch, `planned_ids` and `accounted_ids` must be the same set; `attempted_ids` and `deferred_ids` must partition that set. The inspection-depth ID sets must partition `attempted_ids`, as must the admissibility ID sets. Do not count a deferred or inadmissible observation as an analytic outlier.

Use screenshots for visual evidence and DOM or runtime inspection for structure, geometry, semantics, and state. Keep tool failures as evidence limitations rather than repairing the narrative after the fact.

## 5. Cluster by Decision Logic

Cluster observations by the design decision they explain, not by framework, trend label, palette, or superficial resemblance.

Choose only the cluster questions that can change the declared research decision. The following are prompts, not a default taxonomy:

- Which elements carry identity, evidence, action, and orientation for this surface?
- Which relationship between those roles changes the target decision?
- How does the surface adapt across the required viewports and states?
- Which interaction or media behavior is essential, and what fallback preserves its meaning?
- How does information order follow the product or user task?
- What evidence addresses the material uncertainty for this audience?
- Which runtime, state, semantic, or geometry failure invalidates the intended read?

Maintain explicit cluster and outlier registers:

```text
cluster_id:
conditional_pattern:
member_observation_ids:
independence_groups:
counterexample_ids:
scope_limits:
status:

observation_id:
outlier_type:
related_cluster_ids:
reason:
disposition:
```

An analytic outlier can weaken a proposed rule, reveal a missing condition, or show that two apparently similar products require different trust or proof strategies. Keep it distinct from an evidence gap: a blocked, unreachable, or contaminated observation cannot serve as a counterexample until its relevant surface is admissible.

Do not reduce the corpus to aesthetic archetypes and then prescribe those archetypes to unrelated brands.

## 6. Decide Saturation

Saturation is a decision claim, not a percentage or a feeling that many pages were viewed.

Before inspection, name the open questions. After each bounded batch, ask whether it added:

- a new decision-changing cluster
- a contradiction that changes a condition or boundary
- an outlier that changes sampling or weighting
- a state or evidence failure that weakens confidence

Declare the corpus sufficient only when all planned IDs reconcile, required strata and admissible-evidence targets are met, remaining gaps are unlikely to change the target decision, and the plan's predeclared quiet window of completed, meaningfully varied batches adds neither a new cluster nor a material cluster revision. There is no universal batch count. State which decision and population snapshot are saturated and which claims remain out of scope.

Do not claim broad market saturation from a category-skewed collection. If an unresolved gap could plausibly reverse the recommendation, continue research or mark the decision blocked.

## 7. Write the Synthesis

A durable synthesis should contain:

1. scope, source, decision, as-of context, and retention location
2. population, access-state, inspection-depth, and admissibility reconciliation
3. capture method, viewports, states, and evidence limitations
4. decision-logic clusters with representative and contradictory evidence
5. explicit outliers and failed/unstable states
6. saturation judgment tied to the target decision
7. what the corpus cannot establish
8. a promotion map: retain locally, promote conditionally, test behaviorally, or reject

Keep the source inventory as a machine-readable sidecar when it is too large for the prose study. Link the two and preserve hashes or another integrity receipt when reproducibility matters.

## 8. Promote Findings Safely

Use this path:

```text
raw source-specific evidence
→ versioned authoring study or project research record
→ repo-neutral conditional principle
→ behavioral or structural test when the contract must remain stable
```

Promotion requires all of the following:

- the finding changes recurring design judgment or research reliability
- its condition and failure boundary can be stated without source-specific trade dress
- contradictory or partial evidence is disclosed
- the rule does not conflict with repo, product, brand, or user evidence
- the owner has approved durable retention at the requested scope

Track candidates with stable fields and explicit state:

```text
candidate_id:
when:
prefer:
because:
evidence_cluster_ids:
counterexample_ids:
scope:
status: research-only | promotion-proposed | promoted
approval:
```

A candidate needs repeated support across relevant independence groups, contradiction and outlier review, conditional wording, scope, and explicit maintainer approval before `promoted`. Research completion never edits packaged guidance automatically; use the repo's guidance-refinement workflow for an approved promotion.

Do not promote a font, palette, section count, source/category-specific vocabulary, named archetype, or motion style merely because it recurs in one corpus. Do not turn representative examples into mandatory templates.

## 9. Validation / Self-check

- The research names the decision it supports.
- The frozen inventory and live inspection state are not conflated.
- Population, transport-state, surface-currency, inspection-depth, and admissibility identities reconcile within their disjoint dimensions.
- Retries, redirects, aliases, and transport outcomes are preserved separately from material auth, region, locale, referral, session, consent, and viewport constraints.
- Visual coverage and DOM/runtime coverage are reported separately when they differ.
- Clusters describe decision logic rather than style labels.
- Outliers and contradictions can change the thesis instead of being discarded.
- The saturation statement is scoped to a decision and acknowledges category bias.
- Source-specific evidence stays local or in authoring records.
- Packaged guidance remains conditional, brand-relative, and repo-neutral.
