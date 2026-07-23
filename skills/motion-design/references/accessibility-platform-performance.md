# Accessibility, platform, and performance

This reference adapts upstream context-adaptation guidance. Current target-repo requirements, platform guidance, browser behavior, and measured runtime evidence override these general heuristics.

## Reduced-motion equivalence

Reduced motion is a design variant, not a blanket `duration: 0` rule and not always “replace everything with opacity.” Preserve:

- input acknowledgement
- state, status, progress, and completion meaning
- focus and reading order
- object identity or destination when required for orientation
- ability to pause, dismiss, cancel, or continue

Common transformations:

| Original behavior | Candidate reduced behavior |
|---|---|
| large spatial entrance | direct appearance or short low-displacement transition |
| spring/bounce | damped settle or direct state change |
| parallax/scroll-linked travel | static layers or discrete state changes |
| autoplay ambient loop | static frame, paused state, or user-initiated playback |
| multi-step choreography | simultaneous or grouped transition with stable focus |
| zoom/full-screen travel | cut/crossfade or local continuity cue |
| particles/celebration | stable icon, copy, sound/haptic only if separately supported and user-controlled |

Opacity fades can still be uncomfortable or obscure focus if long, full-screen, or repeated. Validate with users and current platform guidance where accessibility risk is material.

## Vestibular and cognitive considerations

Treat these as review triggers:

- large-scale zoom or full-viewport movement
- scroll hijacking, parallax, perspective shifts, or multiple moving depth layers
- rapid direction changes, oscillation, shaking, spinning, or flashing
- moving text or controls
- long autoplay sequences without control
- inconsistent motion for the same interaction
- critical information shown only through motion, color, or a transient moment

Keep task behavior predictable. Avoid punitive error motion and repeated celebration in high-frequency workflows. Ensure the final state remains available long enough to understand without replaying the animation.

## Input and focus

- Pointer hover is enhancement, not a keyboard/touch contract.
- Press acknowledgement should remain connected to input without moving the target away.
- Keyboard focus must remain visible throughout transitions and land at the semantic destination.
- Touch cancellation, pointer leave, key repeat, and assistive-technology-triggered actions need the same authoritative state result.
- Drag and direct manipulation should track input directly; decorative latency belongs only in release/settle if appropriate.
- Scroll-triggered content must not become inaccessible when scripting, observers, or motion are unavailable.

## Responsive and platform adaptation

Do not scale desktop choreography by a fixed duration multiplier. Reconsider the motion model:

- narrow layouts may replace lateral travel with local reveal or direct state change
- touch surfaces lack hover and often need faster, localized acknowledgement
- large displays may require legible but not necessarily longer travel
- dense working surfaces usually need quieter, more repeatable motion than one-time presentation surfaces
- locale and reading direction can change the meaning of left/right progression
- resize, orientation change, zoom, dynamic type, and content reflow can invalidate fixed paths
- native platforms may supply transition and spring conventions that should remain authoritative

Test the same semantic transition across representative content lengths and viewports. Avoid hard-coded geometry unless the repo proves it is stable.

## Performance posture

No property is “free,” and GPU/compositor behavior is not guaranteed across browsers, elements, effects, or devices. As a starting point:

- transforms and opacity are often lower risk than layout-changing properties, but still require profiling
- width, height, margin, and content-dependent geometry can trigger repeated layout
- shadows, filters, masks, blur, large gradients, and large composited layers can be expensive
- many simultaneous elements, overdraw, retained layers, and long-lived observers can cost more than one complex element
- `will-change` and forced layer promotion can increase memory and should be used only with measured need
- JavaScript animation work competes with input, rendering, and application logic

Use the target repo's budgets and tooling. If none exist, report measurements rather than inventing a universal element count or frame-rate pass line.

## Profiling plan

Capture:

- exact build/revision, route, state, dataset/content size, viewport, zoom, and device/browser
- input path and whether reduced motion is enabled
- frame pacing and long-task symptoms during representative interaction
- layout, style, paint, composite, memory, and script evidence as available
- behavior under rapid repeat, resize, background/foreground, and route teardown
- comparison against the same interaction with decorative layers disabled

A smooth video is not a performance trace. A single trace on a developer machine is not cross-platform proof.

## Degradation order

When runtime pressure or reduced-effects policy applies:

1. preserve semantic state and immediate feedback
2. preserve focus, progress, completion, danger/error, and orientation cues
3. simplify secondary reactions and long travel
4. remove particles, parallax, blur, cursor response, and ambient loops
5. shorten or eliminate decorative delays

Never delay or change product truth to let a decorative sequence finish.

## Acceptance checks

- Reduced motion preserves an equivalent state story and usable focus path.
- Motion and color are not the sole carriers of critical meaning.
- Autoplay or continuous effects have pause/stop and lifecycle behavior appropriate to current requirements.
- Responsive variants preserve semantics instead of merely shrinking distances.
- Browser/device evidence uses representative content and interaction frequency.
- Cleanup removes timers, observers, animation handles, retained layers, and stale state on every terminal path.
