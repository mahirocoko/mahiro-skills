# Rendered quality and troubleshooting

This reference adapts upstream quality and troubleshooting guidance. It evaluates observed motion in the actual product; it does not treat a recipe, token table, passing build, or still image as quality proof.

## Evidence packet

Record:

```text
Build/revision:
Route/surface and data state:
Viewport/zoom/device/browser:
Input method:
Motion/reduced-motion setting:
Trigger and authoritative completion event:
Capture or trace:
Observed result:
Expected contract:
Mismatch and severity:
```

Review at normal speed first. Slow motion can diagnose velocity and overlap but cannot prove the experience feels correct at real speed.

## Audit matrix

### Purpose and semantics

- Every material motion maps to an actual state change or approved expressive job.
- Input acknowledgement is immediate enough for the product context.
- Visual completion does not disagree with semantic completion.
- Loading, success, error, cancellation, and rollback remain truthful.
- Motion, color, or a transient moment is not the only semantic carrier.

### Hierarchy and attention

- One focal change leads each beat.
- Supporting and ambient motion remain visibly subordinate.
- Repeated use does not make routine work noisy or slow.
- Stagger reinforces reading order or causality rather than delaying content.
- Decorative motion stops competing when an error, progress state, or user action needs attention.

### Timing and feel

- Easing matches arrival, departure, continuity, or constant-rate meaning.
- Duration fits distance, frequency, content, and perceived weight.
- Overshoot and oscillation suit the approved personality and state consequence.
- The sequence settles cleanly without dead time or an abrupt unexplained stop.
- Paired transitions feel related without needing identical numbers.

### Continuity and state behavior

- Origin, destination, object identity, and layout reflow remain understandable.
- Rapid repeat, reverse, interruption, navigation-away, and stale async response reconcile to current truth.
- Focus and hit targets remain stable and usable.
- Responsive variants preserve the same state story.
- Hidden/unmounted/backgrounded effects pause or clean up correctly.

### Accessibility and performance

- Reduced motion is equivalent and usable, not merely absent.
- Large spatial, zoom, parallax, shake, spin, and continuous motion have justified alternatives.
- Representative traces show no unresolved interaction, layout, paint, memory, or cleanup problem.
- Decorative layers degrade before semantic feedback.
- The result was checked with real content, not only an isolated ideal case.

## Diagnostic smells

| Symptom | Inspect first | Common bounded corrections |
|---|---|---|
| Feels robotic | constant velocity, identical start/stop, false path | choose truthful easing/path; vary only semantically related timing |
| Feels slow | response latency, long stagger tail, decorative anticipation | acknowledge sooner; shorten/remove nonessential beats; group items |
| Feels abrupt | missing state cue, wrong easing, no readable arrival | clarify origin/destination; add a short settle; avoid adding flourish first |
| Feels flat | weak hierarchy or unclear state, not necessarily missing layers | strengthen the primary state cue; add one supporting reaction only if useful |
| Feels cheap | inconsistent personality, exaggerated overshoot, arbitrary properties | reduce properties; normalize semantic roles; retune in runtime |
| Too distracting | too many active elements, high displacement/contrast, loops | remove ambient/secondary motion; reduce density; preserve one focal event |
| No personality | generic values detached from approved direction | define a concise personality profile and apply it by role |
| Inconsistent | same event uses different origin/easing/completion | standardize the semantic family and document exceptions |
| Motion lies | visual state leads/lags authority or implies false destination | bind to real state events; remove fake progress; reconcile interruption |
| Dropped frames | layout/paint cost, element count, JS work, retained layers | profile; simplify properties/layers; stagger only if it improves both clarity and cost |
| Reduced mode breaks | animation carried focus, status, or layout authority | restore semantic state directly; redesign the reduced variant |

## Correction order

Fix the highest-level cause before polishing curves:

1. product truth and authoritative state
2. motion purpose and necessity
3. focus, input, reduced-motion, and responsive behavior
4. hierarchy, origin/destination, and continuity
5. response latency, duration, easing, overlap, and settle
6. secondary and ambient details
7. runtime cost and cleanup regressions introduced by the final design

Performance should be considered throughout, but visual micro-tuning cannot compensate for a false state model or inaccessible focus path.

## Severity guide

### Blocker

- motion conflicts with semantic state, focus, navigation, or user input
- reduced motion removes essential meaning or operation
- continuous or interrupted motion cannot stop/clean up
- rendered behavior causes a material accessibility or runtime failure

### High

- response feels disconnected from input
- hierarchy or origin/destination is materially unclear
- routine motion delays repeated tasks
- representative performance evidence shows unresolved jank or resource growth

### Moderate

- personality, easing, overlap, or settle is inconsistent but semantics remain clear
- optional secondary/ambient motion is too prominent
- a bounded responsive or content-length variant needs retuning

Do not block release merely because a decorative layer, archetype, one-third heuristic, or multi-layer recipe is absent.

## Final audit verdict

Use one verdict:

- **Verified** — contract matches representative rendered evidence.
- **Conditionally verified** — core semantics pass; named platform/state evidence remains.
- **Recommendation only** — no representative implementation evidence exists.
- **Blocked** — a semantic, accessibility, interruption, or measured runtime mismatch remains.

List the exact evidence and remaining owner. “Looks smooth” is not a verdict.
