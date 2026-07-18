---
name: game-production
description: Directs complete, production-grade game work across gameplay, content, art, environment, UI, audio, localization, accessibility, saves, performance, browser QA, deployment, and legal gates. Use when auditing game maturity, building a whole-game production inventory, planning a prototype or vertical slice, coordinating production lanes, defining promotion states, or deciding production/release readiness. It is a thin production director, not an engine framework.
---

# Game Production

Direct the whole game from repo reality to the requested readiness gate. Coordinate specialist lanes and evidence; do not replace the engine, invent a portable architecture, or treat a polished demo as a complete game.

## Core posture

- Treat verified implementation and configuration as stronger evidence than plans, then use current repo docs, approved product decisions, references, and general judgment in that order.
- Label claims as **current reality**, **approved direction**, **not established**, or **adoption trigger** when the distinction matters.
- Keep the plan gate-based rather than date-based. A phase exits only when its defining product question has evidence.
- Preserve repo-local engine schemas, save versions, content IDs, asset manifests, commands, ownership boundaries, and numeric budgets. Never replace them with skill defaults.
- Prefer the smallest playable, testable proof that retires the next production risk, while maintaining a whole-game view.
- Separate automated correctness, runtime integration, visual/audio acceptance, gameplay feel, and human release approval. One does not imply the others.
- Add no script unless a repeated deterministic operation or fail-closed validation need is proven.

This workflow is informed by real game-production evidence: gate-based phases, honest current-reality labels, deterministic and browser evidence, human foreground gates, isolated preview versus playable art contracts, versioned saves, and explicit performance budgets. Treat those as contract discipline, not universal values or architecture.

## Scope and boundaries

This skill owns:

- repo maturity inspection and readiness classification
- a complete game inventory with gaps, dependencies, owners, and evidence
- production sequencing, promotion states, stop gates, and cross-lane coordination
- readiness decisions and a concise production report

This skill does not own:

- engine/framework selection or generalized engine abstractions without an approved adoption gate
- specialist asset, sprite, VFX, frontend, audio, localization, runtime, legal, or deployment execution
- invented balance, performance, accessibility, save, browser, or content budgets
- self-approval of taste, fun, legal clearance, platform submission, or release

## Workflow

### 1. Resolve the production mandate

Identify:

- requested outcome and target audience/platforms
- target gate: **prototype**, **vertical slice**, **production**, or **release**
- protected accepted behavior and explicit non-goals
- allowed write scope, approval boundaries, and irreversible actions

Do not collapse the readiness levels:

- **Prototype-ready** proves a narrow mechanic, interaction, or technical risk with placeholders allowed.
- **Vertical-slice-ready** proves one representative end-to-end experience at credible quality and reproducibility.
- **Production-ready** proves repeatable pipelines, content scalability, integrated systems, controlled budgets, and regression coverage across the intended game.
- **Release-ready** proves the shippable build, platform/browser matrix, migration/rollback, compliance, legal rights, distribution, and owner acceptance.

Read [production-phases.md](references/production-phases.md) before setting or changing a phase gate.

### 2. Inspect repo maturity before planning

Inspect only evidence relevant to the requested gate, but cover the whole game surface:

- repo guidance, roadmap, product/game design, architecture, commands, package manager, engine version, deployment config
- runnable entry points, game states/modes, rules/simulation boundaries, content definitions, debug/reproduction paths
- asset roots, manifests, provenance, animation/VFX/audio contracts, preview-only versus runtime-promoted content
- UI/menu/meta surfaces, input methods, responsive/scaling behavior, localization, accessibility and reduced-effects paths
- save keys/schemas, migrations, idempotency, failure recovery, debug-write isolation, backend/cloud boundaries
- tests, type/lint/build checks, browser/manual QA, telemetry, target-device evidence, performance budgets
- licenses, third-party notices, reference boundaries, title/brand/platform requirements, privacy/analytics/monetization obligations

Report absence as **not established**, not as permission to invent. If docs and implementation disagree, record the mismatch and use the repo's source-of-truth rule; do not silently choose the more convenient contract.

Read [repo-adapter-boundaries.md](references/repo-adapter-boundaries.md) whenever adapting this workflow to a target repo.

### 3. Build the whole-game inventory

Create one canonical inventory. Reuse or extend the repo's existing tracker rather than creating a competing source of truth.

For every material item, record:

```text
Domain | Deliverable/contract | Current state | Target state | Evidence | Owner/lane | Dependencies | Budget/schema | Risk | Next gate
```

Cover these domains even when the answer is `not established` or `out of scope`:

1. product pillars, audience, platforms, core loop, failure/reward loop
2. gameplay systems, controls, camera, combat, progression, economy, balance
3. content breadth: characters, enemies, bosses, levels/maps/modes, upgrades/items, tutorials and endings
4. art direction, characters, animation, VFX, environment, props, icons and provenance
5. UI/HUD, menus/meta, onboarding, input semantics, responsive and safe-area behavior
6. audio: music, ambience, SFX, mix, ducking, captions/substitutes and licensing
7. localization: source ownership, locale coverage, font/layout, fallback and terminology
8. accessibility: remapping, focus/semantics, contrast, text, motion/effects, audio alternatives and difficulty assists
9. save/profile/settings: schema versions, migrations, corruption fallback, idempotency, mode isolation, reset/recovery
10. runtime architecture, tools, content pipeline, deterministic repro and observability
11. performance: frame/update/render/loading/memory/entity/VFX/network/storage budgets on target devices
12. browser/platform QA, packaging, deployment, rollback, analytics/privacy, legal/IP and store requirements

Do not count a concept image, preview scene, placeholder event ID, debug mode, or headless simulation as integrated production content unless its runtime contract and promotion evidence say so.

### 4. Classify maturity and critical path

Compare inventory evidence with the requested readiness level. For each gap classify:

- **blocker** — prevents the target gate or invalidates its evidence
- **critical** — must complete on the target path
- **parallel** — can run independently after contracts stabilize
- **deferred** — explicitly outside this gate with a named reopen trigger

Choose the smallest critical path that closes whole-game blockers. Avoid multiplying content before one representative item has passed its full gameplay-to-release pipeline.

### 5. Route specialist lanes

Route work; do not absorb specialist ownership.

| Need | Preferred lane |
| --- | --- |
| Asset inventory, source strategy, filenames, cleanup, manifests, delivery QA | `asset-designer` |
| Generated source art and bounded cleanup/QA orchestration | `codex-asset-production` |
| Sprite sheets, animation families, anchors, frame QA, atlases, promotion | `sprite-workflow` |
| Runtime VFX timing, geometry, ownership, emitters/shaders, reduced-effects integration | `vfx-workflow` when available; otherwise the repo's VFX/runtime owner |
| Menu/meta/web shell visual brief and rendered fidelity | `frontend-design` when the task is explicitly design-led |
| Audio direction, event map, implementation, mix and loudness/device QA | repo-local audio lane or a named audio specialist |
| Engine scenes, gameplay rules, input, saves, tooling and integration | repo-local runtime guidance and engine-specific skills |
| Browser interaction and viewport/state evidence | `playwright-cli` plus repo-local QA commands |
| Thai prose/localization quality | `kien-thai` or `kode-thai` when their trigger applies; use equivalent locale reviewers for other languages |
| Licensing, privacy, ratings, store/platform terms, title/trademark | qualified human/legal owner; agents may inventory evidence only |

Give each lane a bounded handoff: objective, allowed paths, protected contracts, inputs, required outputs, promotion target, budgets/schemas to preserve, validation, and stop conditions. Parallel lanes must not write the same canonical files. The director reconciles dependencies and evidence before promotion.

### 6. Use explicit promotion states

Map to repo-local names when they already exist. Do not rewrite established status vocabulary.

```text
discovered → contracted → candidate → integrated → validated → promoted → release-approved
                         ↘ rejected / deferred / blocked
```

- **Discovered**: inventoried; ownership or contract may be incomplete.
- **Contracted**: purpose, runtime shape, budgets, acceptance evidence, and owner are explicit.
- **Candidate**: produced in an isolated lane; not canonical.
- **Integrated**: connected to the intended runtime path without claiming quality acceptance.
- **Validated**: required automated, runtime, device/browser, and specialist checks pass.
- **Promoted**: owner accepts it as the canonical production baseline for the stated scope.
- **Release-approved**: release owner accepts the exact shipped artifact and its legal/deploy evidence.

Never infer promotion from a file being present, a build passing, or a worker approving its own output. Preserve hashes/version/build identity when the repo uses them.

### 7. Coordinate cross-discipline gates

Sequence contracts so downstream work receives stable inputs:

1. product/core-loop and mode boundaries
2. gameplay rules, content schema, save and deterministic reproduction
3. representative content through complete art/environment/UI/audio paths
4. localization, accessibility and responsive/input variants during integration, not after content freeze
5. target-device performance and browser/platform regression at representative worst case
6. content-complete QA, deployment rehearsal, rollback/migration, legal and release approval

For performance and QA planning, read [performance-qa.md](references/performance-qa.md). For the final ship decision, read [release-readiness.md](references/release-readiness.md).

## Stop gates

Stop planning or promotion at the affected boundary when:

- the target readiness level, platform, protected scope, or source of truth is materially ambiguous
- the core loop or representative slice has not passed human play/feel acceptance, but broad content multiplication is requested
- required schemas, budgets, migration rules, or platform requirements are unknown and guessing would create compatibility risk
- a candidate would overwrite canonical/runtime assets without review, provenance, or rollback
- preview/reference/debug content is being treated as playable, persistent, or release content without its missing contracts
- gameplay, save, economy, analytics, privacy, legal, or monetization behavior would change without explicit approval
- automated evidence passes but browser/device, accessibility, localization, visual, audio, or human gates remain open
- performance evidence is from the wrong build, non-representative settings, debug acceleration, or uncontrolled concurrent runs
- release artifacts cannot be tied to a reproducible build identity, migration path, deployment target, and rollback plan
- a specialist lane is absent for a high-risk task; mark it blocked or assign a qualified owner rather than impersonating approval

## Output contract

Return or write a concise production packet:

1. **Mandate and target gate** — platforms, audience, readiness level, protected scope, non-goals
2. **Repo maturity** — current reality, approved direction, not established, adoption triggers
3. **Whole-game inventory** — canonical matrix or link to the repo-owned inventory
4. **Readiness verdict** — ready, conditionally ready, or not ready, with evidence
5. **Critical path** — ordered blockers and why they gate the target
6. **Lane plan** — owner, bounded handoff, dependencies, promotion target
7. **Budgets and schemas preserved** — exact repo-local sources; no invented defaults
8. **Validation matrix** — automated, runtime, browser/device, localization/accessibility, visual/audio, human, legal/deploy
9. **Promotion decisions** — exact artifact/state, approver, evidence, rejected/deferred items
10. **Next gate** — smallest evidence-producing step, stop condition, and remaining owner decision

If implementing as part of the request, update the packet as evidence changes. Do not create production ceremony that the repo cannot maintain.

## Validation / self-check

Before finishing, confirm:

- the target readiness label matches evidence rather than aspiration
- the inventory covers every required domain and distinguishes missing from out of scope
- one canonical tracker exists; no parallel manifest or roadmap was invented
- every blocker has an owner, dependency, next evidence, and stop condition
- every specialist task is routed with bounded write scope and protected contracts
- preview, candidate, integrated, promoted, and release-approved states are not conflated
- gameplay/content/art/environment/UI/audio/localization/accessibility/save/performance/browser/QA/deploy/legal gates are represented
- engine-specific schemas and numeric budgets remain repo-local and cited
- automated checks are separated from target-device/browser and human acceptance
- save migration, debug-write isolation, corruption/retry, and idempotency are covered when persistence exists
- reference/IP provenance and runtime import boundaries are covered for external or generated material
- the exact release artifact, deployment target, rollback path, and owner approval are covered for release work
- no script was added without a proven deterministic need

## References

- [production-phases.md](references/production-phases.md) — prototype, vertical slice, production and release gates
- [performance-qa.md](references/performance-qa.md) — budget discovery, evidence matrix, browser/device and human QA
- [release-readiness.md](references/release-readiness.md) — content freeze, save/deploy/legal/platform and ship decision
- [repo-adapter-boundaries.md](references/repo-adapter-boundaries.md) — preserve engine, schema, budget and ownership boundaries

ARGUMENTS: $ARGUMENTS
