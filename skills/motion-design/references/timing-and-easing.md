# Timing, easing, springs, and stagger

This reference adapts upstream timing/easing tables and choreography guidance. Values are starting heuristics for rendered tuning, not APIs, standards, guarantees, or repo-independent tokens.

## Separate response from completion

A control should acknowledge input quickly even when the resulting transition continues. Record both:

- **response latency** — time until visible acknowledgement
- **motion duration** — time until the visual transition settles
- **semantic completion** — event that makes the product state complete

Never make business logic, navigation, focus, or async success depend on a decorative animation finishing unless the target product explicitly defines that contract.

## Duration starting points

Use these only to establish an initial render:

| Interaction scale | Example starting range | Tuning concern |
|---|---:|---|
| Immediate acknowledgement | roughly 50–150 ms | must feel connected to input |
| Small state or icon change | roughly 120–250 ms | legibility without lag |
| Component entrance/exit | roughly 180–350 ms | spatial continuity and repetition |
| Overlay or major panel | roughly 250–450 ms | focus shift and perceived weight |
| View/page context change | roughly 350–650 ms | orientation without blocking progress |
| Rare editorial or ceremonial reveal | roughly 600–1200 ms | only with approved purpose and skip/reduced path |
| Ambient cycle | seconds rather than hundreds of milliseconds | must not demand repeated attention |

Tune shorter for frequent, task-focused, interruptible interactions. Allow more time only when distance, complexity, comprehension, or approved ceremony requires it. Large distance does not automatically justify a long delay; responsive layout may require a different path instead.

Entrances may need more legibility than exits, so an exit can begin around two-thirds to three-quarters of its paired entrance duration. Treat that ratio as a hypothesis, not a rule. Destructive exits may need enough time to understand what changed, while urgent dismissal may need less.

## Directional easing

Common starting families:

- **Entering** — decelerate toward rest so arrival is legible.
- **Exiting** — accelerate away when the departing object no longer needs inspection.
- **Moving on-screen** — smooth both ends when both origin and destination matter.
- **Constant progress or rotation** — linear can be appropriate when constant rate is the meaning.
- **Ambient loop** — seamless, low-contrast easing with no visible restart.

These are communicative tendencies. Match paired transitions and inspect actual velocity, not only the easing label. A library's named easing may not match another runtime's curve.

## Springs

Specify spring intent semantically:

| Spring feel | Appropriate use | Risk |
|---|---|---|
| Damped/snappy | direct manipulation, toggles, short settling | can feel abrupt if displacement is large |
| Gentle/settled | panels, shared elements, soft continuity | can feel sluggish in repeated tasks |
| Elastic/bouncy | rare playful feedback or reward | repeated oscillation competes with task work |
| No overshoot | precise, serious, destructive, or high-frequency states | can still feel natural with good easing |

Record desired overshoot, oscillation count, settle behavior, and interruption response. Do not copy stiffness, damping, mass, tension, or friction numbers across libraries; their units and solvers differ. Tune in the actual runtime.

## Distance, weight, and content

Duration can increase with perceived distance or visual weight, but only enough to keep the path readable. Check:

- viewport-relative rather than fixed-pixel distance
- object size and density
- whether text must remain readable during motion
- whether layout is reflowing beneath the object
- whether the same transition occurs repeatedly
- whether a direct cut would preserve orientation better on narrow screens

As an initial experiment, doubling a modest travel distance might require only about 1.2–1.4× duration rather than double duration. Render and measure before retaining the value.

## Stagger and overlap

Stagger should reveal hierarchy or reading order, not make later items wait.

| Pattern | Starting interval | Typical concern |
|---|---:|---|
| Tight cascade | roughly 20–50 ms | dense lists, small repeated items |
| Standard sequence | roughly 40–100 ms | cards, panels, short groups |
| Deliberate beat | roughly 100–180 ms | rare hero/editorial sequence |
| Continuous wave | roughly 30–60 ms | data or spatial pattern, if meaning remains clear |

Keep the total sequence bounded. Around 400–500 ms is a useful warning point for routine UI, not an absolute ceiling. For long lists, animate a visible group, compress the interval, group items, or skip the stagger rather than delaying the tail.

Use overlap to express relationship:

- low overlap feels methodical and separate
- moderate overlap feels connected and efficient
- high overlap feels fluid but can obscure event order

Paired items may share an easing family while varying start time or duration. Secondary reactions can use a different curve only when their subordinate role remains clear.

## Timing palette

A system may define semantic tiers such as:

```text
response -> standard transition -> deliberate context change -> continuous
```

Do not create a mandatory three-token palette when the repo already has a different system or the product needs fewer roles. Each token should name semantic use, reduced-motion behavior, and runtime owner—not only a number.

## Tuning order

When motion feels wrong, tune in this order:

1. verify purpose and state authority
2. reduce/remove unnecessary animated properties
3. fix response latency
4. correct easing direction and path
5. tune duration and overlap
6. tune overshoot/settle
7. add secondary motion only if a clear gap remains

A faster duration does not fix unclear causality; extra bounce does not fix weak hierarchy.
