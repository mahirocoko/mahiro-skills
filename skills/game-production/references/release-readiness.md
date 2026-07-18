# Release Readiness

Apply this gate to one exact release artifact and named targets. Use `ready`, `conditionally ready`, or `not ready`; avoid percentage confidence without a repo-defined model.

## 1. Scope and content freeze

Confirm:

- target platforms/browsers, audience, regions, languages and distribution channel
- included gameplay modes, characters, levels/maps, enemies/bosses, progression, tutorials and endings
- production art, animation, VFX, environment, UI and audio coverage
- explicit cuts, known issues, severity/owner and post-release backlog
- no preview-only, candidate, placeholder, unlicensed or debug content is mislabeled as shipped production content

A conditional release must name the conditions and prevent shipment until they are satisfied.

## 2. Build and configuration

Require:

- clean, reproducible release command using the repo's package manager/toolchain
- exact version/build/hash identity and generated artifact inventory
- production environment/configuration and secret handling
- debug menus, cheats, preview scenes, test endpoints, logging and write guards intentionally configured
- asset/audio bundles and manifests resolved from runtime-approved locations
- dependency, license and vulnerability review appropriate to the project

## 3. Gameplay and content closure

Verify the complete scoped game:

- first-session path, onboarding and prompt access to gameplay
- success, failure, retry, pause/resume and quit/re-entry
- all required progression, unlocks, rewards, purchases/economy and endings
- representative legal builds/characters/modes, not only the easiest path
- no progression dead end, duplicate reward, corrupted state or inaccessible content
- human acceptance for feel, difficulty, clarity, touch/controller comfort and final presentation

## 4. Save, data and recovery

Require, as applicable:

- versioned schema and supported migration sources
- malformed/partial/blocked-storage fallback
- idempotent rewards, transactions and result writes
- mode/profile isolation where rules differ
- settings/locale/control persistence
- account/cloud conflict and offline behavior if present
- backup, reset, deletion, rollback and support recovery paths
- release rollback that does not silently destroy saves created by the newer version

Test only the game's owned keys/data. Never clear unrelated browser or device storage during QA.

## 5. Platform, browser and accessibility matrix

Cover the promised matrix:

- supported browsers/devices/OS and minimum hardware
- keyboard, pointer/touch, controller and focus/semantic input as applicable
- viewport, orientation, safe area, scaling and resize/background/foreground behavior
- every shipped locale, fallback, font, wrapping and semantic/live copy
- contrast, readable text, remapping where promised, reduced motion/effects, pause and audio alternatives
- production-build console/network failures and offline/loading states

A partial language must not be exposed as complete. A visually hidden accessibility surface must remain synchronized with live game state.

## 6. Performance and reliability

Require evidence against repo-defined budgets for:

- startup and scene/loading transitions
- steady-state and worst-case legal gameplay
- frame pacing/update/render, memory and cleanup over long runs
- entity/VFX/audio/UI load and background/foreground recovery
- storage/network behavior and failure recovery where present
- crash-free completion, retry and repeated-session behavior

Record any approved quality/performance tradeoff and its human owner.

## 7. Deployment and operations

Require:

- staging or equivalent release rehearsal
- hosting/store configuration, cache/CDN/service-worker behavior and asset invalidation
- environment variables, domains, certificates and security headers as applicable
- monitoring/crash reporting/analytics with privacy-safe configuration
- rollback procedure, previous artifact availability and accountable operator
- support/contact path, known-issue communication and incident ownership

Do not add analytics or remote services merely because a release checklist mentions them. Their need and consent/privacy contract must be approved.

## 8. Legal and rights

Inventory and assign qualified approval for:

- title/trademark/domain/store-name clearance
- ownership and licenses for code, fonts, art, generated assets, music, SFX and voice
- reference boundaries and provenance; no runtime imports from study-only material
- third-party notices and attribution
- privacy policy, cookies/consent, analytics, ads, monetization and child-directed obligations
- age/content ratings, regional restrictions and platform/store terms
- open-source license compatibility and redistribution obligations

Agents may gather evidence and flag gaps. They do not provide legal clearance.

## 9. Ship decision

Use this record:

```text
Artifact/build:
Targets:
Readiness: ready | conditionally ready | not ready
Passed gates:
Open blockers:
Accepted known issues:
Migration/rollback:
Legal/platform approvers:
Release owner and decision:
Evidence packet:
```

`Ready` requires no open ship blocker and explicit release-owner approval of the exact artifact. A successful deploy rehearsal alone is not a ship decision.
