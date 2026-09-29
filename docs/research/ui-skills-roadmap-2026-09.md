# Focused UI Skills Roadmap — 2026-09

**Status:** Historical research and controlled-lab record. The untracked lab (including all eight unpublished drafts, fixtures, scripts and local evidence) was deleted at Mahiro's request on 2026-09-29. The findings below describe past experiments, not currently available skills or reproducible local artifacts. No skill was adopted, installed, bundled or published from this work.

**Lifecycle:** Retained as a dated decision record and possible starting point for a *new*, separately approved experiment. Past lab-only receipts and source diffs are no longer locally available; numerical and QA claims below are recorded results, not independently replayable from this repository. Current skill availability is owned by the canonical skill catalog and manifest, not this roadmap. Do not recover or treat the deleted drafts as active instructions without Mahiro's approval.

## Objective

Build a focused, composable set of Mahiro-owned UI skills that helps agents make interfaces better without generic AI slop, unsupported visual claims, scope drift, or self-approved taste decisions.

The roadmap deliberately does **not** create one omnibus frontend skill. `make-interfaces-feel-better` is the proposed *entry/routing* skill for an explicit improve request; domain skills own the actual rules and changes. A coordinator may select a relevant available skill, but it must not imply that every host can invoke another skill automatically. Each skill keeps one clear job, one evidence boundary, and explicit handoffs to existing owners.

## Product principles

1. **Repo evidence for compatibility, not source dismissal.** Inspect existing primitives, tokens, route contracts, accepted references, and target-repo guidance; a style convention does not erase a substantiated accessibility/task-blocking finding.
2. **Evidence before verdict.** Source, computed, rendered, inferred, and human-owned claims remain separate.
3. **Focused ownership.** Typography, color, layout, accessibility, polish, stress, variants, and reference analysis do not silently become one owner.
4. **Mahiro's direction remains human-owned.** Technical readiness never becomes visual/product acceptance.
5. **Smallest useful change.** A UI request is not permission for token migration, refactor, dependency installation, or unrelated cleanup.
6. **Respectful adaptation.** Preserve external source intent and provenance. Separate the source claim, target-repo compatibility evidence, and Mahiro-local adaptation; do not universalize or reject source rules merely because they are external.

## Target skill map

| Skill | Primary job | Phase | Initial status |
| --- | --- | --- | --- |
| `interface-review` | Read-only-default scope, ownership, diff classification, evidence, technical handoff | 1 | Lab draft (also has explicit bounded fix mode); not adopted |
| `interface-accessibility` | Semantics, keyboard, focus, reflow, reduced-motion floor | 2 | Proposed core domain |
| `interface-layout` | Hierarchy, grouping, rhythm, density, responsive anatomy, overflow | 2 | Proposed core domain |
| `interface-typography` | Type ownership, wrapping, measure, numerals, rendered text | 2 | Proposed core domain |
| `interface-colors` | Semantic roles, theme mapping, painted contrast, token ownership | 2 | Proposed core domain |
| `interface-writing` | Product UI labels, actions, errors, empty states, terminology and meaning | 2 | Proposed core domain; not Thai prose authoring |
| `interface-polish` | Radius, optical alignment, surfaces, icons, restrained micro-interaction | 2 | Proposed core domain |
| `make-interfaces-feel-better` | Explicit improvement request → available relevant owners → integrated result and honest gaps | 3 | Proposed thin coordinator; no domain rules |
| Interactive UI skill lab | Owned before/after fixture and actual skill-run evidence | 4 | Proposed isolated proof, not a packaged skill |
| `oklch-color-engineering` | Conversion, gamut, P3, palette math, APCA/WCAG measurement | Later | Parked: rights and numeric validation |
| `interface-break` | Adversarial state/content/viewport stress testing | Later | Deferred, not a coordinator dependency |
| `interface-variants` | Controlled one-axis alternatives and human selection | Later | Deferred, not a coordinator dependency |
| `interface-reference` | Measured/derived/inferred reference analysis | Later | Conditional on a demonstrated ownership gap |

Existing owners remain authoritative for adjacent jobs:

- `kien-thai` / `kode-thai` own Thai prose quality.
- `motion-design` owns named motion personality, choreography, timing systems, and reduced-motion design decisions.
- `studying-codrops` owns Codrops/Tympanus source study.
- `asset-designer` and related asset skills own generated/extracted asset production.
- `direct-cli` and `fable` own executor routing and long-task orchestration.

## Phase 0 — Contract and ownership baseline

**Goal:** Establish the shared grammar before creating domain skills.

### Work

- Confirm final naming and ownership boundaries for the first wave.
- Write one shared evidence ladder: source, computed, rendered, inferred, and human-owned.
- Define `Current Reality / Accepted Direction / Not Established / Unknown` ownership fields.
- Define the review handoff: technical result versus Mahiro visual/product gate.
- Define stop gates for ambiguous ownership, protected visuals, missing browser evidence, and scope expansion.
- Define provenance expectations for adapted external material, including how to preserve source-qualified values without universalizing them.

During the experiment, the working evidence/ownership contract lived in the `interface-review` lab draft reference. All eight candidates—six domains, coordinator and review—were outside the default package catalog; those lab files have since been deleted. If the direction is reopened, each new candidate must own its minimum proof and handoff boundary without assuming a sibling draft is installed. A valid lab `SKILL.md` was never a packaged canonical skill.

### Reference and rights map (studied 2026-09-25)

- [Jakub Krehel's modular skills](https://github.com/jakubkrehel/skills) at `267330e1adfc66a718fb65fa6918c1f06d0a689e` — MIT; source-qualified domain and review mechanics, not a ready-made Mahiro package.
- [Jakub Krehel's standalone polish skill](https://github.com/jakubkrehel/make-interfaces-feel-better) at `35545ea1512ad59fa463e6b1f95ca9c052981fe6` — MIT; primarily polish guidance, not the upstream owner of our proposed coordinator behavior.
- [Emil Kowalski's design-engineering skills](https://github.com/emilkowalski/skills) at `d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128` — MIT; useful job-specific motion and mobile-web boundaries, not a license to turn every value into a universal UI rule.
- [Jakub Krehel's OKLCH skill](https://github.com/jakubkrehel/oklch-skill) at `daa2ec87cc80bc7e7e812f84c5b34d5990240fcb` — no license file or README license statement observed, and its example palette does not follow its stated lightness formula. Read as dated evidence only; do not copy text or trust example numbers as computed proof.

Write original, human-readable Mahiro-owned guidance. Retain public source credit in repo documentation; if any substantial licensed source text is ever copied, retain its actual copyright and permission notice in the distributable artifact. The four local five-reader learn indexes are ignored session evidence, not packaged skill dependencies.

### Public presentation and workflow evidence (observed 2026-09-25)

The current public [skills page](https://jakub.kr/skills) presents six focused `/better-*` domains, `/better-interface` as their combined review, `/interface-review` as detailed analysis, and `/break` plus `/variant` as separate stress/exploration tools. This supports the domain boundaries, but it also shows that aggregation, report-only review, stress testing and variation are distinct jobs rather than one automatic pipeline. Its `/better-colors` description explicitly centers OKLCH conversion and engineering; the Mahiro `interface-colors` candidate intentionally remains a semantic-paint owner and does not claim that unlicensed technical color-engineering scope.

The public article [Using AI as a design engineer](https://jakub.kr/work/using-ai-as-a-design-engineer) describes AI as an accelerator for human-directed experiments, not an idea or taste replacement. Its workflow starts with short project-specific rules, assumes each conversation lacks implicit context, uses planning for larger work, decomposes requests into smaller prompts, builds scaffolding quickly, and then relies on the design engineer to understand, tweak, polish and discard. This is workflow evidence, not reusable instruction text.

Applied to this lab, the seven-skill same-turn A/B primarily tested **aggregate integration restraint**. It did not reproduce the source author's selective daily workflow and cannot invalidate a domain merely because the combined demo failed. Future proof should use one human-chosen task, one dominant owner, one accepted baseline and one integrated human gate; add a second domain only when its evidence changes that exact fix.

### Exit gate

- The contract has one owner and no competing active wording.
- One applies and one does-not-apply example are reviewed for every cross-skill boundary.
- The contract does not prescribe a universal color, font, spacing, motion, or component style.

### Public distribution gate

Before packaging or publishing any focused skill:

- Treat the complete skill directory and all bundled references/scripts/assets as public and independently installable.
- Remove absolute machine paths, private repository names, personal contact details, agent/conversation identifiers, receipts, credentials, internal endpoints, quotas, memory locations, and private product claims.
- Keep examples repo-neutral and fictional or generic.
- Make sibling-skill handoffs optional: if a sibling skill is absent, the output must disclose the unavailable handoff instead of inventing it.
- Verify external provenance, license compatibility, and public URLs before retaining adapted material.
- Keep target-repository tokens, routes, product decisions, and private workflow details in the target repo rather than the public skill.
- Run a final public-surface scan over every packaged file before the skill is promoted or added to a bundle.
- A UI review may inspect route files and public preview commands, but must not open target-project `.env`/credential/service-account contents to discover a route. If a preview requires a secret, disclose the gap and use a safe fixture or ask for a route instead.
- Validate that the resulting archive extracts and that every bundled file matches its source. The local `creating-skills` packager printed success on 2026-09-24 but emitted an invalid DEFLATE ZIP (`unzip -t` failed). A disposable system-`zip` artifact extracted and matched the then-current four-file draft byte-for-byte; the current draft has three files after the source-credit move. That historical archive is not a release receipt for the current draft; revalidate any future package. Do not modify Letta Code upstream without separate approval.

## Phase 1 — `interface-review`

**Goal:** Create the evidence and reporting backbone without embedding every visual domain inside it. Keep the name `interface-review` for the current draft: the source skill with that name owns change-scope routing, while this adaptation also supports an explicitly named surface. The distinction is disclosed in its public entrypoint; verify install behavior before promotion if both copies might be installed together. Its existing `fix` mode requires a separate explicit instruction; planning a read-only review does not remove that code path or authorize using it.

### Minimum scope

- Review and diff modes; read-only by default.
- Scope and coverage table.
- Ownership ledger.
- Introduced / regression / pre-existing classification.
- Evidence tier on every material finding.
- `Not reviewed` and `Not verified` output rules.
- Considered-but-rejected section.
- Technical verdict plus explicit Mahiro visual gate.
- Keep the source's change-scope order, no invented last-commit review, bounded consumer expansion, removed-line/equivalent-replacement checks, intent coverage, and non-mutating PR reads.
- For any future packaged candidate, keep source credit in the repo README and adaptation decisions in this research note, outside the packaged skill; defer domain prescriptions without treating them as rejected.

### Validation

First run a controlled read-only review in the proposed repo-owned lab fixture, then—only after agreeing on a specific product page/state and enforcing its read boundary—run a separate real-UI dogfood. A lab is a safe first proof of the contract, not a substitute for the later real-consumer gate. A report is useful only if it:

- does not self-approve visual taste
- does not re-litigate protected direction
- distinguishes source from rendered evidence
- identifies missing proof honestly
- stops at the correct handoff

**Dogfood state (2026-09-24): blocked, not accepted.** Two fresh read-only Agy browser-QA lanes were stopped before a report existed. The first read a target project's dotenv file while discovering a route; its contents were not retained in the skill/report. The retry used a known public route and strict allowlisted files, but read extra local MCP schema files outside that allowlist. Both lanes were closed, no product-repo edits were observed, and neither attempt supplies valid rendered acceptance evidence. Do not repeat the same broad agent/browser hypothesis a third time or promote this skill on the basis of validator/test/package checks. A prompt-only allowlist was insufficient: a future product-repo run needs a materially enforced read boundary and explicit target approval. The controlled lab can precede it without silently turning that lab into real-product acceptance.

## Phase 2 — Core domain skills

Mahiro approved creating and validating these independently as a *usable core*, not as empty routing stubs:

1. `interface-accessibility`
2. `interface-layout`
3. `interface-typography`
4. `interface-colors`
5. `interface-writing`
6. `interface-polish`

### Shared constraints

- Each skill owns one domain and states its adjacent handoffs.
- When retaining a source numeric heuristic, keep its original conditions and citation; do not universalize it. Record an explicit ownership or target-scope reason when excluding one from active candidate guidance rather than silently omitting it.
- `interface-polish` owns contextual surface/icon craft and feedback for interaction states that the product already owns, drawing on the MIT-licensed `better-ui` and `make-interfaces-feel-better` sources. It must not invent hover elevation, shadow or motion for a static surface merely because an upstream demo includes a hover state. Require `event/state change → user meaning → feedback job → static cue`; otherwise choose no change. The proposed coordinator in Phase 3 must not duplicate these rules. Purpose, timing, easing, springs, stagger, shared-layout continuity, sequencing, interruption systems, motion personality and non-trivial reduced-motion equivalence stay with `motion-design`; accessibility consequences and input-equivalence checks stay with `interface-accessibility`.
- `interface-writing` owns product UI communication: action labels, error and recovery instructions, empty states, terminology, disclosure clarity, and semantic consistency. It must not turn into general copywriting, generate unsupported product promises, or grade natural Thai prose as if a local-only installed skill were guaranteed. When `kien-thai`/`kode-thai` are present, hand Thai prose quality off optionally; UI text purpose and component fit remain with `interface-writing` and target-repo owners.
- Do not adapt text from the `oklch-skill` checkout into a public skill until its rights are verified. Its sample palette is also inconsistent with its written lightness algorithm; check arithmetic and current official color/contrast sources independently before proposing any color-engineering skill.
- Theme and token changes require explicit task scope.
- A source test or class-name check cannot claim rendered behavior.
- Use realistic Thai UI content to expose geometry and font defects; hand off prose quality only if a suitable Thai-writing skill is actually installed. Local copies of `kien-thai`/`kode-thai` are not canonical package dependencies here. `interface-typography` verifies rendered text geometry; `interface-writing` verifies UI message/job, not font paint or grammar.

### Numeric-source adaptation decisions for the draft set

- **Retained conditionally in the deleted draft:** Jakub's MIT `better-layout` proposes at least a 2× between/within-group gap, 12px between adjacent filled/bordered controls, and 24px around borderless controls **when the target has no established density system**. The former `interface-layout` draft treated them as source-qualified starting probes, not product defaults; measured content and existing compact conventions can reject them. Source provenance is in the reference and rights map above.
- **Not promoted as universal polish rules:** The MIT `better-ui` and standalone `make-interfaces-feel-better` sources give concrete radius formulas, a 1px image edge, `scale(0.96)` press response, ≤150ms frequent feedback, ~100ms entrance stagger, icon scale/blur recipes, 1.5/2px icon strokes and 40/44px target aims. These are not all the same owner or quality gate. The deleted `interface-polish` draft retained the *jobs* (inspect nested geometry, complete icons, material and incidental state feedback) but not those values as defaults: named sequence/timing belongs to `motion-design`; target minimum/access barriers to `interface-accessibility`; image edge and stroke weight require the actual asset, background, type, source direction and rendered state. The sources remain valid *conditional candidates* for a later explicit target, not rejected advice. Do not install them wholesale or quietly substitute a different number while claiming source fidelity.

### Phase gate

Before a domain skill is considered usable (not before its first draft), require:

- a clear trigger and non-trigger
- a minimal output contract
- at least one counterexample
- a proof method for each important claim
- no ownership collision with existing Mahiro skills

## Phase 3 — `make-interfaces-feel-better` coordinator

**Goal:** Give an explicitly requested UI improvement one clear entry point without creating a new omnibus frontend doctrine. This Mahiro-owned *coordination job* differs from the upstream MIT `make-interfaces-feel-better` skill's standalone polish domain; record that distinction and check name collision if both are installed.

### Routing contract

- Identify the user's page/component, requested change, protected direction and current styling system; do not start with every domain.
- Route semantic/keyboard/focus work to `interface-accessibility`; structure, spacing and responsive geometry to `interface-layout`; text rendering to `interface-typography`; paint and contrast to `interface-colors`; UI labels, feedback and recovery meaning to `interface-writing`; contextual surfaces, icons and incidental micro-interaction to `interface-polish`.
- Use `interface-review` for a separately requested review/diff and evidence-backed technical handoff. If it is user-invoked in the active host, **ask the user to invoke it** rather than calling it through another skill. Route named motion systems to the existing `motion-design` owner; never use polish as a way around that boundary.
- Load only relevant available domain skills, let each own its domain rules, and consolidate compatible changes without relitigating accepted visual direction. If an owner is missing, disclose the gap; do not synthesize its full doctrine from the coordinator.
- An Agent Skill is guidance, not a guaranteed cross-host subroutine. Verify whether the current host can dispatch sibling skills. This repo's Agy adapter registers namespaced user-invoked `/mh-*` aliases and disables implicit model invocation on the installed aliases; there, give the exact suggested handoff rather than claim an automatic call.
- Fix code only when the user requested improvement. A review request stays read-only; installation, dependency addition, token migration and broad redesign each need their own scope. Record actual changed source, computed/rendered checks, unresolved domains, and Mahiro's pending visual verdict.

### Disconfirming checks

- A request just for wrapping must not quietly alter page color, animation or layout.
- A missing or user-only sibling must not be reported as an automatically completed review.
- An unchanged, intentional surface is a valid “no change” result; do not invent a defect to demonstrate the coordinator.
- The upstream polish skill's exact values remain with their source context in the owning domain, not as mandatory defaults inside this routing skill.

### Phase gate

The coordinator is ready for a controlled lab only after one installed-host invocation proves its routing/fallback behavior with at least one core domain and one missing or user-only sibling. This does **not** certify the entire core set, the visual result, or a real product.

## Phase 4 — Historical isolated interactive UI skill lab

**Historical goal:** Show a human-observable difference, inspired by the *interactive teaching format* of [the public Interfaces article](https://interfaces.dev/magazine/issues/details-that-make-interfaces-feel-better) observed 2026-09-25, rather than copied text, assets, or visual design. The lab was removed on 2026-09-29; the following protocol records what was attempted and would require fresh approval, fixtures and evidence to repeat.

1. Start with one small, original fixture (for example, text wrapping with adjustable width); hold content, container widths, relevant states and starting source constant across comparisons. Add radius or interruptible motion only after the first case works. Before planting an impairment, classify it as an objective contract failure or a visual hypothesis. Objective failures need reproducible evidence; visual hypotheses need Mahiro's explicit acceptance as defects before they enter blind scoring. A formula, reviewer preference or stronger contrast is not sufficient by itself. Hash and preserve the accepted baseline before impairment.
2. Show the actual UI states side by side at desktop and mobile width, with a control that exposes the difference. Explain the owning rule, the changed code, and the circumstances where the recommendation does **not** apply.
3. To label a panel **Before skill / After skill**, run the real relevant skill on the recorded baseline and preserve the resulting diff/receipt. A hand-authored `Not recommended / Recommended` demo can teach a principle but cannot claim skill causality.
4. Run `interface-review` in its read-only mode: compare its report with/without the skill separately if useful. A visual After requires an explicitly authorized implementation pass and fresh read-only rendered QA; a writer's own checks and screenshots are not independent acceptance.
5. Collect exact rendered states, interactions, relevant console errors/warnings, source diff and unresolved coverage. Score each domain only on its owned evidence, then judge the integrated component separately. A passing token, contrast or typography result must not become a whole-component PASS by averaging. Mahiro judges visual/product improvement. One successful fixture is a lab result, not a public-skill or real-consumer pass.

### Controlled blind run result — 2026-09-25

The hash-bound Quiet Signals run used byte-identical impaired files, prompt, `gpt-5.6-sol-high`, effort and tool policy in standalone sibling-free Git roots. Candidate A was Jakub's modular set; Candidate B was the Mahiro six-domain set plus thin coordinator. Both invoked seven real skills successfully, and fresh independent Chrome QA found clean runtime, console and network behavior. The local fixtures and receipts cited by this result were deleted with the lab; this paragraph is a historical report, not a replayable test.

Mahiro's pre-reveal verdict was **Neither**. Both candidates improved muted-text readability (`#656d7b` baseline to `#858e9c` / `#858d9a`), so the color result is a bounded PASS for both. Candidate B/Mahiro also improved title and heading tracking. Candidate A/Jakub handled the narrow dynamic preview header more cleanly; Candidate B kept a squeezed two-column Quiet state. The interactive demo still looked worse than the baseline to Mahiro even though domain-level improvements were real. Preserve this as evidence against mechanical aggregate winners: no candidate is approved for adoption, default bundling, installation, publication or release from this run.

### Selective typography-only result — 2026-09-25

Mahiro next approved a current-lab-only review/fix for the human-confirmed compressed `Quiet Signals` article title. A hash-bound baseline differed from the retained controlled foundation only by `.article-title { letter-spacing: -0.08em; }`. A standalone GPT-5.6 Sol High host exposed and invoked only `interface-typography`; it changed that one value to `-0.02em` without coordinator or sibling skills. Fresh independent Agy/Gemini 3.8 Flash High Chrome DevTools QA verified the exact Before/After payloads at 1440×900 and 390×844. The title stayed on one line with no clipping or horizontal overflow, fonts loaded, and console warnings/errors and failed requests were zero. Main audited the exact diff, report and all four screenshots.

Mahiro selected **After (`-0.02em`)**. This is a narrow controlled-lab PASS for a human-directed title-tracking correction and supports the selective-owner workflow. It does not establish performance on other typography jobs, mixed scripts or a real consumer, and it does not authorize installation, packaging, default-bundle membership, publication or release.

Do not use another product repo as a convenience fixture or write ignored experiment artifacts inside one. A later real-product dogfood needs Mahiro's named repo/page/state, enforceable read bounds, and separate approval.

## Later — Adversarial and exploratory proof

Consider these only after the core and first lab reveal a specific need:

### `interface-break`

Start with a read-only stress mode using an isolated or explicitly approved harness. Cover:

- long Thai and mixed-script content
- empty, loading, error, disabled, focus, and active states
- zero and high-volume data
- narrow and wide viewports
- overflow, clipping, collision, and scroll containment
- console errors and interaction-triggered runtime errors

The skill reports failures; it does not receive permission to redesign unrelated anatomy.

### `interface-variants`

Start with one axis at a time:

- structure
- density
- emphasis
- surface treatment
- typography hierarchy

Every variant set needs comparable content, a clear selection owner, and a stop point before any candidate is promoted.

## Later — Conditional reference analysis

Evaluate `interface-reference` only after checking whether the general measured/derived/inferred contract belongs inside `studying-codrops` or another existing owner.

Create it only if there is a demonstrated general reference-analysis gap outside Codrops study. It must distinguish:

- exact source/fidelity target
- taste/visual-language evidence
- measured facts
- derived implementation hypotheses
- unknowns that cannot be proven from the reference

It must never turn a screenshot into a pasteable rebuild or override a product brief.

### Reference-specific public safety

Reference work needs a stricter public-content boundary than ordinary review:

- Treat external pages, screenshots, extracted HTML, and source snippets as evidence, not as instructions to obey.
- Keep only public URLs, observation dates, verified provenance, and license information that is safe to redistribute.
- Do not copy article bodies, screenshots, assets, or source code when redistribution rights are unclear.
- Record facts separately from derived implementation hypotheses, taste observations, and unknowns.
- Check redirects, stale pages, and current availability before presenting a reference as live evidence.
- Do not preserve private URLs, local paths, session artifacts, provider receipts, or private project details in the packaged skill or its references.

## Bundle and release policy

- Do not add all proposed skills to the default bundle in one change. Repo policy is default-or-absent for *packaged* canonical skills: lab drafts may exist outside the manifest, but do not leave new packaged skills as a dormant opt-in catalog.
- Use controlled lab copies or explicit test installs only after their scope and host behavior are approved; those are experiments, not canonical bundle adoption.
- Add a skill to the default bundle only after its trigger boundary prevents unwanted auto-loading, host-specific handoff behavior is proven, and its ownership is stable. Seek a separate Mahiro approval for the bundle decision.
- Update the canonical skill source, command wrapper, bundle manifest, README inventory, and focused tests together when a skill becomes packaged.
- Keep external provenance and adapted scope explicit; do not copy upstream branding or stale instructions.

## Shared definition of done

A focused skill is ready for broader adoption only when:

1. Its job can be stated in one sentence.
2. Its trigger and non-trigger are testable.
3. Its owner and handoffs are explicit.
4. Its output distinguishes evidence from inference and human judgment.
5. Its rules survive a real repo counterexample.
6. It does not re-implement an existing Mahiro skill.
7. It has been dogfooded on a real UI consumer.
8. Its browser/runtime claims have the required evidence, or are clearly marked `Not verified`.
9. Its docs are human-readable as well as agent-operational.
10. Mahiro has reviewed the direction before any visual doctrine is treated as accepted.

An isolated lab can prove routing, skill-run causality and a rendered candidate, but it does **not** satisfy item 7. No passing build, copied example, screenshot, or independent technical QA substitutes for item 10.

## Completed lab sequence and current boundary

Mahiro approved and completed the **six candidates, coordinator and owned lab implementation** on 2026-09-25. The historical execution sequence was:

1. **Map and stage:** reconcile the review and six-domain owner map and stage all candidates outside the default package catalog. Do not change existing product repos.
2. **Core build:** implement and validate six usable domain candidates one at a time, preserving distinct ownership, source-qualified examples, one counterexample and optional handoffs each. Do not create an OKLCH skill, `break`, variants or reference analysis as a prerequisite.
3. **Coordinator:** author `make-interfaces-feel-better` as a thin improvement entry point. Test actual skill availability and one missing/user-only fallback in the selected host; do not assume a skill can automatically call another across hosts.
4. **Lab:** build one isolated, interactive, owned fixture and produce a real Before skill / After skill run with a code diff plus fresh read-only browser QA. Keep hand-authored explanatory demos distinct from observed skill results.
5. **Human gate:** let Mahiro inspect the lab result and decide which skill/visual direction earns further work. Only then agree on a specific, safely bounded real-UI dogfood; adoption, packaging and release remain separate decisions.

The aggregate controlled result was **Neither**. Both candidates improved muted-text readability; Candidate B/Mahiro also improved title and heading tracking; Candidate A/Jakub handled the narrow dynamic preview header more cleanly; the integrated demo still failed Mahiro's bar. The later typography-only lab run then earned a bounded PASS for `interface-typography` on the one human-directed title-tracking correction. A subsequent small-model `interface-polish` run produced a plausible foundation but inconclusive uplift, and Mahiro rejected its skill arm because hover elevation on a static parent falsely implied whole-card clickability. The polish draft was revised around an owner-backed affordance gate, then replayed on that exact counterexample: fresh no-skill and revised-skill arms both chose no change and remained byte- and pixel-identical to the foundation. Treat this as a bounded regression PASS for fail-closed behavior, not comparative uplift—the explicit product contract was enough for both arms to make the same decision. All drafts were lab-only and are now deleted. Do not repeat the all-skills aggregate trial or broaden the typography result or polish regression proof into adoption evidence. A real-consumer proof still needs Mahiro's named repo/page/state and separate approval; any new lab proof must be explicitly reopened, use one dominant domain, and not imply bundle, install, publication or release permission.
