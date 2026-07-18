# Performance and QA

Discover and preserve target-repo budgets. This reference supplies categories and evidence rules, never universal numbers.

## Budget discovery

Search repo guidance, runtime constants, telemetry, verification packets, issue history and target-platform docs for:

- update, render, frame pacing and minimum acceptable responsiveness
- entity, projectile, pickup, particle, audio-voice and draw-call ceilings
- memory, bundle, initial load, scene transition and asset decode budgets
- backing resolution, camera scale, viewport, safe area and device pixel ratio policy
- network, storage, save size and synchronization limits when applicable
- per-frame spawn/work smoothing, pooling, culling and cleanup contracts
- reduced-motion/effects behavior and accessibility timing constraints

Record exact source paths and whether each value is accepted, provisional, diagnostic, historical or not established. A historical cap from an old mode must not override the active contract.

## Evidence matrix

Use the smallest matrix that covers the release promise:

| Evidence class | What it proves | Common false claim |
| --- | --- | --- |
| Unit/pure rules | deterministic logic, invariants, migrations, calculations | gameplay feels good |
| Simulation | repeated balance, conservation, long-run envelopes | renderer/device performance |
| Type/lint/build | static and packaging correctness | browser/runtime correctness |
| Runtime smoke | lifecycle and integration in the real build | target-device quality |
| Browser automation | flows, semantics, persistence, viewport states | touch comfort or visual taste |
| Instrumented performance | measured runtime behavior under named conditions | uncontrolled real-world performance |
| Visual/audio review | readability, hierarchy, timing, mix and identity | mechanical correctness |
| Human play | feel, comfort, difficulty, clarity and acceptance | exhaustive regression coverage |
| Release rehearsal | deploy/config/migration/rollback integrity | product or legal approval |

Never summarize several open rows as “QA passed.” Name the exact passed and pending classes.

## Representative test states

Select states from repo reality:

- boot/ready/onboarding and first playable input
- success, failure, pause, retry, reset and interrupted transitions
- progression choice, inventory/meta, settings and results
- minimum and maximum supported viewports, safe areas and orientation policy
- every supported input method and focus/semantic path
- every shipped locale using real copy, font and wrapping
- default, reduced-motion/effects and high-contrast or equivalent modes
- representative ordinary load and worst-case legal load
- long-run, background/foreground, reload and storage-failure paths
- save migration from every supported prior version plus malformed/partial data
- production build with debug acceleration and write-changing diagnostics disabled or isolated

Do not use debug time scaling or synthetic enemy clearing as balance evidence. It may prove lifecycle or cap behavior when labeled accurately.

## Browser and target-device discipline

- Test the production build, not only the development server.
- Record browser/device/OS, viewport, input, locale, build identity and relevant settings.
- Run performance captures one controlled instance at a time unless concurrency is the subject.
- Separate automation browser timing from foreground target-device rendering.
- Verify pointer conversion, camera/scaling, fixed UI, culling and touch hit targets at supported sizes.
- Preserve console/network failures, screenshots/video, telemetry and exact reproduction steps when they are material.
- Use hashes or build filenames when the repo already tracks exact artifacts.

## Gameplay and content QA

Check more than nominal completion:

- core loop begins promptly and communicates objective/state
- success, failure and early failure rewards match product rules
- contrasting characters/builds/modes preserve intended differences
- authored content reaches all expected transitions and rewards exactly once
- no debug path writes real progression, scores or analytics unless intentionally designed
- deterministic seeds reproduce the same relevant decisions without coupling unrelated randomness
- visual telegraphs show complete mechanical geometry before decorative effects
- transient actors, VFX, audio and input state clean up on death, retry, scene change and shutdown

## Performance failure handling

When a budget fails:

1. Preserve the exact failing state and build identity.
2. Determine whether the limit is gameplay/content, simulation, renderer, asset, VFX, audio, UI or browser overhead.
3. Fix the owning lane rather than weakening unrelated accepted behavior.
4. Re-run the exact state, then representative regressions.
5. Require human acceptance if the fix changes density, camera, input, effects, readability, audio mix or feel.

A lower render scale, lower entity cap, reduced effect count or changed camera can be a valid production decision only when recorded as an approved tradeoff with target-device evidence.

## QA closure record

For each gate report:

```text
Build/state | Budget or contract | Method | Evidence | Result | Owner | Pending human gate | Reproduction
```

Passing builds do not prove balance, touch comfort, visual clarity, audio quality, localization quality, accessibility usability or release acceptance.
