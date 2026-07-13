---
name: studying-codrops
description: Studies Codrops/Tympanus articles, live demos, source repositories, showcases, case studies, spotlights, and curated archives as explicit evidence. Use only when the user names Codrops/Tympanus or invokes studying-codrops to map the site, study an item or theme, compare references, or produce project-fit adaptation guidance. Does not auto-load for ordinary frontend work and does not turn Codrops into a universal style doctrine.
---

# Studying Codrops

Study Codrops as distinct evidence lanes: article, live behavior, source, showcase, case study, and editorial context. Extract transferable lessons without copying recognizable expression or making Codrops the default taste authority.

## Trigger Policy

Use this skill only when the user explicitly:

- names Codrops or Tympanus
- invokes `/studying-codrops`
- shares a Codrops article, demo, Webzibition entry, case study, spotlight, or linked source repo
- asks to learn a creative-web technique specifically through Codrops evidence
- asks to map, refresh, compare, or build a learning path from Codrops

Do not auto-load it for ordinary frontend implementation, animation, landing-page design, UI audits, or generic reference research when Codrops is not named.

## Scope and Boundaries

This skill owns:

- Codrops site-family mapping and bounded corpus selection
- article, demo, source, case-study, showcase, spotlight, and roundup analysis
- article/demo/source relationship checks
- technique, interaction, production, and editorial lessons
- provenance, license, asset-ownership, and transferability notes
- project-fit evidence that can feed another skill or implementation spike

This skill does not own:

- final product or brand direction: use `frontend-design`
- broad research where Codrops is only one source among many: use `deep-research`
- a full repository architecture study detached from Codrops evidence: use `learn`
- generic-AI UI cleanup: use `uncodixify`
- copying Codrops code, assets, trade dress, demo composition, or client work

Codrops findings are candidate evidence, not design authority. Repo rules, product truth, brand constraints, accessibility, and explicit user direction remain higher priority.

## Usage

```text
/studying-codrops [map|item|theme|compare|project-fit|refresh] [URL, theme, or project context]
```

Default mode:

- `item` when one Codrops-related URL is supplied
- `theme` when a technique is named
- `map` when the user asks what Codrops contains

## Modes

### Map

Describe current content families, scale, active navigation, and legacy surfaces. Load [references/site-map.md](references/site-map.md), but refresh live counts before making current-number claims.

### Item

Resolve the smallest useful evidence set around one item:

```text
article or catalogue entry
→ live demo or finished website
→ source repository when available
→ author/case-study context
→ target-project relevance when requested
```

Do not require every edge to exist. Mark missing, inaccessible, stale, or unrelated evidence explicitly.

### Theme

Build a stratified set across relevant lanes and time periods. Avoid letting recent GSAP, Three.js, WebGL, or award-site work dominate merely because it is abundant. Compare at least one counterexample or low-complexity alternative when the decision matters.

### Compare

Compare multiple Codrops items, article claims against live behavior/source, or Codrops evidence against a target UI. Keep each evidence unit independent until observations are recorded.

### Project Fit

Translate selected evidence through a named repo/product. Produce `Keep | Adapt | Reject | Prototype | Unknown` decisions. This mode informs `frontend-design` or a bounded implementation spike; it does not replace repo grounding or a product brief.

### Refresh

Refresh metadata-only inventory from public Codrops sitemaps/APIs. Do not mirror article bodies, screenshots, videos, assets, or repositories into the skill. Use the bundled script when useful:

```bash
bun "$SKILL_DIR/scripts/codrops.ts" inventory
bun "$SKILL_DIR/scripts/codrops.ts" inspect <codrops-or-github-url>
```

`$SKILL_DIR` is the installed `studying-codrops` directory. The script prints bounded metadata to stdout and accepts only Codrops/Tympanus or GitHub URLs. Keep output session-only by default. Write it beneath an approved `.agent-state/studying-codrops/` root only after the user approves `project-private` retention. Generated local evidence is not packaged skill source.

## Effort Ladder

- **Quick orientation** — map one lane or identify article/demo/source links; no large packet.
- **Item study** — article claims, rendered behavior, source evidence, license, and transferability.
- **Theme study** — stratified sample, comparison table, saturation/holdout rule, and project relevance.
- **Project adaptation** — target repo reality, selected evidence, bounded prototype decision, and rendered verification plan.

Use the smallest level that can change the user's decision.

## Evidence Workflow

### 1. Classify the lane

Identify whether the unit is:

- Tutorial
- Playground experiment
- Creative Hub demo
- Webzibition showcase
- Case Study
- Studio, Designer, or Developer Spotlight
- Motion, website, or demo roundup
- CSS Reference or Blueprint
- Sketch
- GitHub/CodePen/source artifact
- Collective/newsletter/archive item

Do not treat Webzibition as a tutorial, a roundup as implementation proof, or a case study as reusable source.

### 2. Resolve provenance

Record canonical URL, title, author/studio, publication date, lane, linked demo, linked source, license status, asset provenance status, and observation date. Separate Codrops-owned pages from contributor and third-party links.

### 3. Read claims

Extract only claims relevant to the requested decision:

- intended effect or editorial job
- dependencies and architecture
- constraints and disclosed limitations
- production versus experiment framing
- performance, mobile, browser, accessibility, and reduced-motion notes

Use short paraphrases. Do not copy article bodies.

### 4. Observe live behavior

Record viewport, browser, date, states tested, input method, responsive behavior, performance symptoms, failures, and accessibility risks. If rendered/browser evidence is unavailable, say so and do not infer behavior from prose or a cover image.

### 5. Inspect source only when material

Check the actual source/repo relationship, revision, license, dependencies, key files, render/animation ownership, lifecycle cleanup, responsive assumptions, hard-coded geometry, demo-only shortcuts, and third-party assets. Load [references/demo-source-review.md](references/demo-source-review.md).

### 6. Synthesize transferability

Classify every material finding as:

- directly reusable pattern
- adaptable concept
- inspiration only
- demo-only trick
- unsuitable for this target
- unknown until prototype

Then decide `Keep | Adapt | Reject | Prototype | Unknown`. A polished result alone is not evidence that its mechanism suits the target.

### 7. Route the outcome

Use the result as one of:

- a learning note
- a bounded prototype brief
- a cited input to `frontend-design`
- a repo-study handoff to `learn`
- a broader-source expansion through `deep-research`

Load [references/study-contract.md](references/study-contract.md) for the full evidence packet and comparison templates.

## Corpus Rules

For a multi-item study:

- sample by lane, era, interaction job, technical stack, and editorial format
- state requested, selected, completed, blocked, and holdout counts
- keep recent and historical examples
- include low-complexity/CSS/DOM alternatives where relevant
- keep Webzibition and roundups as curation evidence, not code evidence
- reserve an unseen holdout before promoting a durable method
- stop when new items no longer change the named decision; do not crawl for volume alone

Initial live taxonomy and anti-bias guidance are in [references/site-map.md](references/site-map.md). Conditional lessons from the initial representative study are in [references/observed-patterns.md](references/observed-patterns.md); treat them as hypotheses to verify, not universal rules.

## Provenance, License, and Retention

Load [references/provenance-and-retention.md](references/provenance-and-retention.md) before retaining evidence, cloning a linked repo, quoting code, or proposing reuse.

Default rules:

- store links, metadata, hashes/revisions, and original analysis
- do not package copied articles, screenshots, videos, fonts, models, textures, images, audio, or full source snapshots
- treat source without an explicit license as unavailable for copying
- treat demo assets as separately owned unless proven otherwise
- discuss mechanisms; do not reproduce recognizable expression or client-specific work
- default retention to `session-only`
- require explicit approval for `project-private` or `project-shared` retention

## Stop Gates

- Stop or lower confidence when article, demo, source, revision, license, or asset provenance cannot be verified.
- Stop treating the task as `studying-codrops` when Codrops becomes only one source in a broad research corpus.
- Do not recommend source reuse when the repository license is missing or incompatible.
- Do not use screenshots or generated descriptions as proof of interaction behavior.
- Do not call a visual showcase production-ready implementation evidence.
- Do not add WebGL, WebGPU, canvas, GSAP, Three.js, smooth-scroll, or transition dependencies to a target repo without repo evidence and approval.
- Require fallback/reduced-motion planning when motion is essential to meaning or navigation.
- Do not promote a finding into portable skill doctrine from one attractive example.
- If a target project is named, stop before implementation when the proposed mechanism conflicts with its stack, accessibility, performance, or product contracts.

## Output Contract

For a quick request, return:

1. **Evidence** — checked article/demo/source/case-study units and status
2. **Findings** — what each source actually supports
3. **Transferability** — reuse/adapt/inspiration/demo-only/unsuitable/unknown
4. **Decision** — keep/adapt/reject/prototype/unknown
5. **License/IP notes**
6. **Next step**

For a full study, use:

1. Scope, mode, target decision, and non-goals
2. Corpus manifest and coverage
3. Article/case-study claims
4. Demo observations by viewport/state
5. Source findings with revision/file evidence
6. Transferability matrix
7. Project-fit decisions
8. License, provenance, and retention status
9. Blockers, counterexamples, and holdout result
10. Recommended prototype or routed handoff

If material evidence is missing, state:

```text
This is a partial Codrops study, not an implementation recommendation.
```

## Validation / Self-check

- Codrops was explicitly requested.
- Every material claim identifies article, demo observation, source path/revision, target repo, or inference.
- Current counts were refreshed or clearly dated.
- Article, demo, source, showcase, case study, and roundup roles were not conflated.
- Live behavior claims include browser/viewport/state evidence.
- Source reuse claims include license and asset-provenance checks.
- The result does not become a universal Codrops style or house motion recipe.
- Transfer decisions are relative to a named job or clearly labeled as general learning.
- Retention scope is explicit and defaults to session-only.
- Multi-item studies include coverage, anti-bias, stop, and holdout logic.
- The next owner is clear: learning note, prototype, `frontend-design`, `learn`, or `deep-research`.

## References

- [references/site-map.md](references/site-map.md) — content families, live scale, current navigation, sampling lanes, and anti-bias guidance
- [references/study-contract.md](references/study-contract.md) — evidence manifest, observation, comparison, transferability, and project-fit templates
- [references/demo-source-review.md](references/demo-source-review.md) — rendered-demo, source, performance, accessibility, and productionization checklist
- [references/provenance-and-retention.md](references/provenance-and-retention.md) — license, asset ownership, cache, retention, and IP boundaries
- [references/observed-patterns.md](references/observed-patterns.md) — conditional findings from the initial representative Codrops study
