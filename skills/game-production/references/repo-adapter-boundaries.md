# Repo Adapter Boundaries

Adapt the production workflow to the game; do not adapt the game to this skill.

## Evidence priority

Use the target repo's conflict order when defined. Otherwise prefer:

1. verified current implementation and configuration
2. explicit current-reality repo guidance
3. approved product, game-design, roadmap and architecture decisions
4. reference studies as evidence, never implementation source
5. general production judgment where the repo is silent

Record contradictions. Do not silently “normalize” them into a framework pattern.

## Adapter inventory

Before proposing work, capture:

```text
Repo root and write scope:
Package manager/toolchain:
Engine/framework and version:
Entry points/composition roots:
Source-of-truth docs:
Runtime/content/asset/audio roots:
Canonical IDs and schemas:
Save keys/versions/migrations:
Commands and required checks:
Target platforms/viewports/inputs/locales:
Performance budgets and evidence status:
Debug/reproduction paths:
Deployment/legal owners:
Protected accepted baselines:
Not established/adoption triggers:
```

Cite paths. Never infer root commands from nested demos, references or tooling packages.

## Preserve engine-specific contracts

Keep repo-local forms for:

- scenes/states/entities/components/systems and lifecycle ownership
- renderer versus rule/simulation boundaries
- event/input/camera/physics/timer semantics
- content definitions and stable IDs
- asset loaders, atlases, manifests, anchors and animation state families
- VFX geometry, blend/alpha, cleanup and reduced-effects behavior
- audio event IDs, buses, mix snapshots and streaming/load policy
- UI shell and game-runtime communication boundaries
- save/profile/settings/result schemas and migration adapters
- debug globals, query parameters, seeds, telemetry and test hooks

Do not introduce a universal ECS, scripting language, service layer, React shell, state library, backend, cloud save, atlas format or content database because it is familiar. Require a repo-specific adoption trigger and migration plan.

## Preserve numeric budgets locally

Numeric values belong to the target repo. Examples include:

- logical viewport, backing scale, camera zoom and safe-area policy
- actor/projectile/pickup/VFX/audio limits
- spawn work per frame, pooling and culling padding
- update/render/frame/loading/memory/bundle limits
- pickup, collision, telegraph and control geometry
- balance envelopes, duration, wave/content counts and reward constraints
- touch target, typography and localized-layout limits
- save history, storage, retry and network limits

Record whether a number is accepted, provisional, diagnostic or historical. Do not copy case-study numbers, browser defaults or platform folklore into another repo.

## Keep state families separate

Model the repo's existing distinction between:

- reference/study material and runtime assets
- source masters, generated candidates, cleaned outputs and promoted assets
- preview-only and playable content
- debug/in-memory profiles and persistent player data
- separate modes, rankings or economies with incompatible rules
- accepted baseline and replacement candidate
- production build and release artifact

A type, manifest or path boundary that prevents accidental promotion is production evidence. Preserve it unless an approved migration supersedes it.

## Save and migration boundary

When persistence exists:

- identify every owned key/schema/version and current adapter
- preserve decode compatibility until its removal gate is explicit
- test valid old data, malformed data, blocked storage, duplicate result/reward and rollback
- keep debug runs from writing production progression, rankings or analytics
- avoid broad storage clearing; touch only owned data
- add backend/cloud/account layers only for an approved cross-device, integrity, recovery or social requirement

## Reference and legal boundary

- Treat external games/products as evidence for patterns, risks and vocabulary—not permission to copy source, assets, UI, names, exact values, content or trade dress.
- Keep study/reference folders non-runtime unless the repo explicitly promotes licensed material.
- Require provenance and rights status for generated and third-party assets/audio before production promotion.
- Route title/trademark, privacy, ratings and platform interpretation to qualified owners.

## Director-to-lane handoff

Use this bounded adapter contract:

```text
Objective and target promotion state:
Allowed paths:
Protected engine/schema/budget contracts:
Inputs and provenance:
Expected outputs:
Required automated/runtime/device/human evidence:
Canonical integration owner:
Stop conditions:
```

A specialist may propose a contract change, but must not silently rewrite the adapter boundary. The production director reconciles the proposal with affected gameplay, content, save, performance, localization, accessibility, deploy and legal gates.

## Evidence grounding boundary

The game-production workflow was distilled from real repository evidence: gate-based roadmap exits, current-reality versus preferred-direction labels, protected accepted modes, preview-only art types, deterministic seeds and simulations, exact browser/build evidence, target-device and human foreground gates, versioned local saves, idempotent rewards, debug-write isolation, and reference/IP boundaries.

Use that case to ask better production questions. Do not copy its engine, viewport, content counts, save keys, balance values, render scale, phase numbering, terminology or product direction into another game.
