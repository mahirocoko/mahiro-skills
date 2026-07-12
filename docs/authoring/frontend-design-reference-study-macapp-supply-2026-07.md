# Frontend-Design Reference Study: Macapp Supply v0.1.0

Status: reference-only authoring evidence. This is not packaged design doctrine.

Snapshot: 2026-07-12, Asia/Bangkok. Skill package basis: `0.1.54`; repository basis: `6586e02b952d5b55e4331985c9a17499c4bb6092`. The working tree already contained uncommitted `frontend-design` work, so repository HEAD alone does not identify the evaluated skill draft.

## Scope and provenance

This study reverse engineered the [Macapp Supply](https://macapp.supply/) index, the 78 internal app-entry URLs enumerated by its [sitemap](https://macapp.supply/sitemap.xml), and their external product destinations. The target decision was whether the existing `frontend-design` skill needed stronger, reusable judgment about proof-led composition, responsive evidence, motion, live-reference state, and large-corpus research.

The unit of analysis was the rendered surface at a recorded state and viewport, not the company or product. The study does not establish product quality, conversion performance, full accessibility or performance conformance, causal effects, general market prevalence, or a preferred Mac-app aesthetic.

The frozen population is preserved in the sanitized [inventory sidecar](frontend-design-reference-study-macapp-supply-2026-07.csv). It contains stable catalog identity, source category, requested/outbound/effective URLs, redirects, HTTP result, and the original mixed-dimension reachability note for all 78 entries; the opaque Cursor referral code and Framer `dub_id` are redacted. The detailed written observations are versioned as [audit 01–26](frontend-design-reference-study-macapp-supply-2026-07/audit-01-26.md), [audit 27–52](frontend-design-reference-study-macapp-supply-2026-07/audit-27-52.md), and [audit 53–78](frontend-design-reference-study-macapp-supply-2026-07/audit-53-78.md).

The sanitized [committed provenance manifest](frontend-design-reference-study-macapp-supply-2026-07/provenance.json) is the source of truth for committed artifact hashes, coverage, sanitization, retention, and limitations. Do not copy hashes from prose or the ignored local archive into a second ledger.

Raw browser-session artifacts, source snapshots, DOM evidence, and contact sheets remain in the ignored local archive:

```text
.agent-state/frontend-design/research/macapp-supply-2026-07/
```

No third-party screenshots, downloaded site bundles, cookies/storage exports, auth/session material, personal data, or secret/opaque referral identifiers are committed. Public source-attribution values such as `ref=macapp.supply`, `atp=solt`, and `via=solt` remain documented. Those exclusions and the local evidence policy are recorded in the committed provenance manifest.

The versioned audit shards intentionally preserve historical `/tmp` screenshot paths from the original capture session. Those paths are provenance labels, not fresh-clone dependencies; the referenced third-party images remain in the ignored local archive. Contract tests verify the published shard hashes.

The host source snapshot exposed commit `a0238ae228d5c4b35f82590319e7d011322e4423` at capture time. A live recheck on the same date still exposed 78 sitemap entries and 36 cards in the initial Hot view before progressive loading.

## Evidence coverage and limits

- Population: 78 entries across 13 source categories.
- Some desktop/mobile browser-visible surface plus DOM/structure capture: 74 entries; capture presence does not imply equal comparability.
- Structure/asset evidence only: Maestri and Glyph, after browser navigation failures.
- Material visual gaps: Caesura and ScreenLex.
- Transport result: 76 destinations returned HTTP 200, one automated GET returned 403 while remaining browser-reachable, and one destination returned no usable response.
- Access/surface context: the legacy CSV labels 75 destinations `reachable`; Coreviz was region-gated, Cursor and Notion were session/referral-sensitive, and Caesura was stale/unreachable. These constraints are not transport categories and may overlap.
- Seven rows have material comparability limits: Cursor, Caesura, Maestri, Glyph, ScreenLex, Coreviz, and Presentify.

Coverage breadth should not be mistaken for market representativeness. Utility and Productivity contribute 23 entries each, or 46/78 of the corpus. The remaining categories are AI 5, Analytics 1, Business 1, Communication 1, Design 5, Dev 6, Lifestyle 3, Marketing 1, Photography 2, Video 3, and Writing 4.

The three audit shards also have different schemas and desktop capture contexts. The first visual-audit metadata file contains 29 attempt records for 26 catalog indices because indices 8, 10, and 14 were retried; the raw attempts do not encode a complete supersession lineage. Four audit labels use aliases rather than the catalog label. The raw inventory has no `checked_at`, shard 27–52 has no embedded audit date, and desktop viewports are 1440×900, unspecified, and 1440×1000 respectively. These artifacts are reliable as a frozen research record, but not as perfectly uniform measurements.

## Method

The audit combined:

1. host index and sitemap inspection
2. inventory, redirect chain, and transport-result capture
3. desktop and mobile visual inspection where reachable
4. DOM/structure inspection for anatomy, semantics, geometry, and state
5. initial/settled state plus separate auth, session, referral, region, overlay, and failed-navigation notes where material
6. per-surface judgment of page job, first proof, signature carrier, proof carrier and supported claim, mobile proof-role parity, motion role, trust mode, and failure conditions

Evidence was treated as tiered: desktop+mobile visual evidence with bounded DOM inspection; visual evidence with partial DOM or state interference; text/assets only; or unreachable/unverified. Unknowns were not imputed, and state/capture failures were kept separate from design counterexamples. Shared brand, studio, platform, or template families were not assumed to be independent support.

Still images were not treated as proof of interaction or responsive behavior. HTTP 200 was not treated as successful page evidence. Failed and contradictory states remain in the record.

## Host reverse engineering

Macapp Supply describes itself as a manually curated shelf of well-designed macOS apps. Its broad whitespace, light chrome, tight typographic hierarchy, cover/icon/name/tagline unit, and category chips keep attention on the catalog. Desktop gives the first four records large cards, the next twelve medium cards, and later records smaller cards; mobile collapses to one column while retaining the core identity and summary of each item. Search behaves like a command palette, the surface exposes Hot and Latest modes, and the frozen data has 13 categories, five Featured entries, 27 Supply Picks, and two entries carrying both flags. Latest visibly follows record creation time; the Hot ranking rule was not established.

The implementation progressively reveals results near an intersection sentinel. That keeps the first view light, but the audited version lacked an equally clear manual load-more or URL-pagination fallback. Horizontal category chips, client-state drift, stale outbound destinations, auth/referral variation, and JS-dependent first paint are the main reliability risks. Outbound links append a Macapp Supply referral parameter, and the host notes that some destinations may be affiliate links. Editorial flags and host-assigned categories are discovery metadata, not independent quality labels. The host is a useful discovery interface, but its curation, card-order salience, shared design families, and category skew are not a neutral sample of frontend design.

## Decision findings

### 1. Product behavior can become proof geometry

The strongest pages do not merely place a product screenshot below a generic headline. They turn a product-specific behavior into the dominant spatial relationship: a capture tool uses capture framing, a menu utility uses menu context, a compression product foregrounds before/after weight, and an environment or collaboration product makes spatial continuity legible.

This supports a conditional design principle: when product behavior is the core promise, the first meaningful composition should expose inspectable proof of that behavior. It does not prescribe one hero layout.

### 2. Signature and proof are related but not interchangeable

Some pages use one carrier for both brand recognition and product evidence; others need separate carriers. GatherOS, CleanShot, Corner Time, Compresto, Keeby, Pokey, and Onlook were useful positive examples because their product model affects the composition rather than surviving as removable decoration.

A beautiful mascot, glow, device shell, or typographic gesture can supply signature without proving the product. Conversely, a generic screenshot can show software without making the page recognizably belong to that product. Briefs should name both roles and test whether each is doing real work.

### 3. Mobile parity is parity of proof role, not parity of layout

Strong mobile adaptations change crop, ordering, scale, or interaction while keeping the proof's explanatory job. Weak adaptations hide the proof, reduce it to unreadable texture, or preserve a desktop composition too literally. Responsive review should therefore ask whether the same user question is answered, not whether the pixels match.

### 4. Motion needs a declared job and a non-motion path

The useful motion patterns fell into three roles: demonstrate behavior, explain system/context, or deliver one brand beat. Ambient movement can be acceptable, but it is optional and must not be the only carrier of meaning. First paint, reduced motion, failed media, and static fallback all need to retain the core proof.

### 5. Product-derived information architecture is stronger than portable landing-page anatomy

The more convincing sites derive section order and grouping from the product's own objects, workflow, constraints, or comparison logic. Reusable marketing sections are not automatically wrong, but generic centered hero, gradient headline, dual CTA, bento features, and delayed screenshot proof often make unrelated products converge.

This finding should affect analysis questions, not create a ban list. A familiar pattern remains valid when it serves the product, audience, and repo evidence.

### 6. Trust mode varies by product

Different products earn belief through different evidence: inspectable UI, performance or before/after results, privacy and local processing, integration context, technical detail, customer proof, pricing clarity, or provenance. A universal social-proof block would miss the actual risk in many of these products.

### 7. State quality is part of visual quality

First-paint blanks, route or referral drift, consent/auth overlays, region gates, loading-only compositions, unreadable proof, z-order collisions, and semantic debt repeatedly weakened otherwise polished work. DynamicLake's generic/delayed proof, Atlas and Coreviz gate/state limitations, Cursor's session-sensitive route, Supaste/Cooldock collisions, and heavy Droppy/Backdrop surfaces were useful counter-evidence.

Rendered review must therefore capture truthful state, geometry, occlusion, and first-paint/fallback behavior—not just one settled full-page screenshot.

## Retrospective adequacy decision

The corpus is sufficient for the narrow review question considered here. This is a retrospective adequacy judgment, not a contract-compliant saturation result: the research began without a predeclared strata target, admissibility target, quiet window, independence-group plan, or batch novelty ledger. Those missing controls limit the retrospective claim; they do not invalidate the prospective method approved below, and this study must not be described as having followed that method from the start.

Within that limitation, the four incomplete visual cases and seven materially limited rows are unlikely to reverse the cross-cutting findings about proof/evidence relationships, responsive role preservation, motion purpose, product-derived IA, trust variation, or state-aware QA. Across the later audited range, additional cases reinforced or qualified those relationships without adding a decision-changing category. This supports the scoped update, not a prevalence or formal saturation claim.

It is not sufficient to claim a complete taxonomy of high-quality web design, category-neutral market prevalence, accessibility conformance, implementation-stack preference, or a universal Mac-app aesthetic. Research should continue if a future decision depends on those questions or on the blocked/outlier sites themselves.

## Promotion decisions

Mahiro explicitly approved all three bounded promotion candidates on 2026-07-12 after two review passes. The approval applies only to the scopes recorded below; it does not promote source-specific Mac visual language, named examples, frequency claims, or a universal frontend aesthetic. Observation IDs use the one-based catalog/audit position; limitation IDs resolve through the committed provenance manifest.

| Candidate ID | Evidence IDs | Counterexample / limitation IDs | Scope | Status | Mahiro approval |
| --- | --- | --- | --- | --- | --- |
| `fd-proof-evidence-001` | `obs-09`, `obs-12`, `obs-15`, `obs-17`, `obs-18`, `obs-73` | `obs-14`, `obs-49`–`obs-52`, `obs-61`, `obs-72`; `lim-state-context`, `lim-visual-gaps` | Conditional proof/signature, responsive-role, motion-fallback, and state-aware QA questions only when material | `promoted` | approved by Mahiro on 2026-07-12 |
| `fd-corpus-method-001` | `obs-01`–`obs-78`; `lim-schema-drift`, `lim-visual-gaps` | `lim-category-skew`, `lim-no-formal-saturation` | Optional large frontend-reference corpus method tied to a named frontend design decision | `promoted` | approved by Mahiro on 2026-07-12 |
| `fd-proof-validity-001` | `obs-12`, `obs-15`, `obs-17`, `obs-18`, `obs-73` | `obs-09`, `obs-14`, `obs-61`; `lim-state-context` | Conditional question connecting a proof carrier to its supported claim and evidence fitness | `promoted` | approved by Mahiro on 2026-07-12 |

Retained only as source-specific authoring evidence:

- Mac visual vocabulary, individual site rankings, named exemplars, palettes, fonts, fixed section counts, named aesthetic archetypes, and frequency claims from this skewed collection

The durable lesson is how to investigate and condition design judgment, not how to make every product site resemble this corpus.

## Version policy

- Patch: factual, labeling, or link corrections that do not change findings.
- Minor: a new dimension, adjudication pass, or rerun of this frozen population.
- Major: a changed corpus, unit of analysis, method, or promotion conclusion.

Do not overwrite a materially changed conclusion. Add a dated supersession note and retain the earlier study version or revision in history.
