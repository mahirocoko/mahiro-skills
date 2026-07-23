# Ambient and continuous motion

This reference adapts upstream ambient-pattern guidance with a stricter Mahiro-local restraint: ambient motion is optional, degradable, and never proof of polish.

All example values are heuristics to tune in the actual runtime.

## Admission gate

Before adding a loop, answer:

- What product, status, orientation, or approved atmosphere job does it serve?
- Why is a static treatment insufficient?
- Can it run without competing with reading, input, semantic feedback, or another focal motion?
- When does it start, stop, pause, leave the viewport, enter the background, or lose relevance?
- What happens under reduced motion, low power, performance pressure, and repeated use?

If these answers are weak, keep the surface static. Never pulse a CTA, float an illustration, or add particles solely to manufacture engagement.

## Attention and hierarchy

Ambient motion should carry substantially less displacement, contrast, speed, and event density than the primary interaction. The upstream 10–20% amplitude idea can be used as an initial visual comparison, not a measurable universal budget.

- keep one dominant moving layer at most around active task content
- avoid synchronized loops that produce periodic attention spikes
- use long, varied cycles only when variation does not look random or broken
- provide still intervals when continuous motion is not semantically required
- stop decorative motion while a nearby error, progress, or user action needs attention

## Pattern decisions

### Pulse or breathing

Use for a truly live/waiting status or approved soft atmosphere, not as a generic attention hack. Start with very small scale or opacity variation and multi-second cycles. Avoid changing text geometry, hit targets, or contrast below acceptable levels.

### Floating or drifting

Use only for decorative objects whose position is not interpreted as data, control location, or spatial truth. Small multi-second movement can be enough. Do not float actionable controls, body text, form fields, or objects the pointer must acquire.

### Gradient or light shift

Keep contrast, legibility, and color meaning stable across the entire cycle. A change should be difficult to notice in a glance if it is truly ambient. Profile large painted areas and filters in the target browser/device.

### Shimmer

Skeleton shimmer may indicate indeterminate loading, but it can become visually noisy across large lists. Stop it at completion and provide a non-moving reduced-motion treatment. Do not use shimmer to imply real progress or to decorate static content as “premium.”

### Continuous rotation

Linear rotation can correctly communicate mechanically continuous processing. Stop when processing stops, distinguish activity from progress, and avoid large or full-screen spinning forms. Decorative slow rotation needs the same admission gate as any other loop.

### Parallax and scroll-linked motion

Parallax can support depth or narrative relationships but carries vestibular, readability, input, and performance risk.

- keep text and primary controls stable
- use few layers with truthful depth relationships
- limit displacement relative to viewport and container
- avoid pointer-linked lag on touch or keyboard paths
- provide a static/reduced alternative
- test scroll direction changes, fast scroll, resize, zoom, nested scrollers, and restored scroll position

Do not infer production readiness from a smooth isolated demo.

### Particles and decorative fields

Use only for rare celebration or approved atmosphere. Bound count, lifetime, contrast, event rate, stacking, and cleanup through repo-local profiling. Decorative randomness must not affect product state. Remove particles before semantic cues when degrading.

## Lifecycle contract

Every continuous effect should define:

```text
Owner:
Purpose:
Start condition:
Stop/completion condition:
Pause when offscreen/backgrounded:
Visibility and resize behavior:
Reduced-motion result:
Performance degradation:
Cleanup/cancellation:
```

A loop with no owner or terminal behavior is not ready for handoff.

## Audit questions

- Does the effect remain quiet after 30 seconds and on the hundredth visit?
- Can the user read and operate nearby content without tracking the loop?
- Does it stop when hidden, complete, canceled, or no longer relevant?
- Is the reduced-motion version fully understandable?
- Does the effect preserve frame pacing in representative content, not only an empty demo?
- Does any loop imply false progress, urgency, availability, or interactivity?
