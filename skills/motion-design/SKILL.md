---
name: motion-design
description: Creates UI/product motion briefs, systems, choreography, semantic state-motion plans, reduced-motion contracts, and rendered motion audits. Use only when motion design is a named decision involving motion personality or tokens, timing, easing, springs, stagger, interaction states, or reduced motion. Do not auto-load for ordinary frontend implementation, tiny incidental transitions, static visual design, game combat VFX, or Codrops study without a named motion-design decision.
---

# Motion Design

Define purposeful UI and product motion, then hand it to the target runtime with evidence-backed constraints. Motion must explain change, preserve orientation, provide feedback, guide attention, or express approved personality; do not add it merely to make a surface feel designed.

## Explicit Trigger Policy

Use this skill when the request explicitly names or materially asks for:

- a motion-design system, motion brief, or animation choreography
- motion personality, motion tokens, or a reusable transition grammar
- timing, easing, spring, stagger, overlap, or sequencing decisions
- semantic motion for interaction states such as loading, success, error, selection, navigation, disclosure, drag, or interruption
- reduced-motion planning for non-trivial product motion
- a rendered audit of motion quality, continuity, accessibility, or performance

Do not auto-load it for:

- ordinary frontend implementation or bug fixing
- tiny incidental hover, focus, or color transitions that do not require a motion decision
- static visual, brand, product, layout, or composition direction
- game combat/runtime VFX, telegraphs, projectiles, impacts, trails, auras, or effect pooling
- Codrops/Tympanus study when motion design is not the named decision

If motion is only a minor implementation detail, follow the target repo's existing conventions without expanding into this workflow.

## Ownership Boundaries

This skill owns:

- UI/product motion briefs and system grammar
- purposeful timing, easing, spring-feel, stagger, overlap, and choreography recommendations
- semantic entrance, exit, transition, feedback, interruption, and state motion
- motion-personality translation from approved brand/product direction
- reduced-motion equivalence planning
- rendered motion audit and a bounded implementation handoff

Adjacent owners remain authoritative:

- `frontend-design` owns brand, product, visual, layout, and composition direction. This skill translates approved direction into motion; it does not invent or overrule it.
- `studying-codrops` owns Codrops evidence, source relationships, and transferability. Codrops findings may inform a motion brief, but this skill does not claim that evidence.
- `vfx-workflow` owns game/runtime VFX and gameplay-authoritative cue timing.
- target-repo code, runtime behavior, and browser/device QA prove implementation. This skill does not replace repo inspection, executable tests, profiling, or rendered evidence.

## Numeric and Runtime Posture

All durations, distances, percentages, spring qualities, stagger intervals, and element counts in this package are starting heuristics—not executable APIs, standards, guarantees, or universal budgets. Translate them through the target repo's existing tokens, animation runtime, platform conventions, content, accessibility settings, and measured behavior.

Do not claim support for CSS, Web Animations, GSAP, Motion, Lottie, native springs, or any other library merely because the brief uses general motion vocabulary. Inspect the actual stack before naming syntax or parameters. Spring values are especially non-portable across engines.

## Modes and Effort

Choose the smallest mode that can change the decision:

- **Brief** — one bounded surface, transition family, or product flow.
- **System** — shared semantic roles, timing/easing families, personality, reduced-motion rules, and adoption boundaries.
- **Choreography** — a multi-element or multi-view sequence with beats, hierarchy, overlap, interruption, and completion.
- **State** — semantic interaction states and transitions, including async and error paths.
- **Audit** — compare the intended contract with rendered behavior in representative states.

Do not create a system packet for a single obvious transition. Do not prescribe implementation when the user asked only for a brief or audit.

## Bounded Workflow

### 1. Bound the decision

Record:

- target surface, flow, states, platforms, inputs, viewports, and repetition frequency
- named user/product job and the confusion or delay motion should reduce
- active mode, in-scope transitions, protected behavior, and non-goals
- whether the work is recommendation-only, implementation handoff, or rendered audit

If there is no clear functional, orientation, feedback, hierarchy, or approved expressive job, recommend no motion or less motion.

### 2. Ground in current reality

For a target repo, inspect only enough to identify:

- current state machine, component ownership, route/view lifecycle, and interruption paths
- existing motion tokens, primitives, dependencies, platform APIs, and reduced-motion handling
- established focus, keyboard, touch, pointer, scroll, loading, error, and responsive behavior
- performance-sensitive surfaces and available browser/device/test tooling
- approved brand/product direction from the user, repo, or `frontend-design`

Label repo-proven behavior, approved direction, recommendation, and unknown separately. A still image does not prove motion behavior; a prose brief does not prove runtime support.

### 3. Define purpose and personality

For each transition, state:

```text
Event/state change -> user meaning -> motion job -> no-motion/reduced-motion equivalent
```

Then define a small personality profile using qualities such as direct or expressive, crisp or soft, restrained or elastic, geometric or organic, sparse or layered. Derive it from approved direction and usage frequency rather than assigning a default archetype.

Load [decision-and-personality.md](references/decision-and-personality.md) when purpose, emotional intent, property choice, or motion personality is unresolved.

### 4. Build the semantic motion grammar

Specify roles before numbers:

- response, transition, emphasis, progress, continuity, and ambient roles
- quick, standard, deliberate, and continuous timing tiers only when the product needs them
- entrance, exit, on-surface, and looping easing families
- spatial origin, direction, distance, scale, opacity, shape, and continuity rules
- spring use by semantic job, with overshoot and settle constraints rather than portable parameter claims
- repeated-component stagger and total-sequence bounds

Load [timing-and-easing.md](references/timing-and-easing.md) when selecting duration, easing, spring feel, distance scaling, or stagger heuristics.

### 5. Choreograph states and sequences

Map the real state graph, including idle, intent, pending, success, error, cancel, interrupt, disabled, and return where applicable. Define:

- start and end states, trigger, authority, and completion condition
- primary focus, supporting reactions, ordering, overlap, and stillness
- entering/exiting continuity and layout reflow behavior
- cancellation, reversal, rapid repeat, navigation-away, and stale-response behavior
- focus, reading order, pointer/touch/keyboard equivalence, and responsive adaptation

Load [choreography-and-state-patterns.md](references/choreography-and-state-patterns.md) for narrative beats, entrance/exit continuity, overlays, lists, navigation, feedback, loading, and interruption patterns.

### 6. Bound ambient motion

Treat ambient motion as optional and degradable. Name its product or atmosphere job, attention budget, start/stop condition, pause behavior, offscreen/background behavior, and reduced-motion result. Remove it when it competes with reading, interaction, semantic feedback, or repeated task work.

Load [ambient-motion.md](references/ambient-motion.md) before recommending loops, pulses, shimmer, parallax, floating layers, cursor response, or decorative continuous motion.

### 7. Plan accessibility, platform, and performance

Define an equivalent experience, not merely an animation-off switch:

- preserve state, hierarchy, focus, progress, and completion meaning without required spatial motion
- avoid making color or motion the sole semantic carrier
- adapt to input, viewport, device capability, background tabs, and interruption
- prefer repo-native low-cost properties and profile representative runtime states
- retain semantic motion before decorative motion under pressure

Load [accessibility-platform-performance.md](references/accessibility-platform-performance.md) whenever motion is spatial, continuous, scroll-linked, high-density, cross-platform, performance-sensitive, or required for meaning.

### 8. Hand off or audit

For implementation, map the brief to existing repo primitives and tokens. Do not introduce an animation dependency, global token layer, or new abstraction without repo evidence and an approved adoption reason.

For audit, observe the actual build at representative viewports, inputs, content lengths, repetition rates, reduced-motion settings, and performance conditions. Compare event timing, visual completion, semantic completion, focus, interruption, and cleanup. Record exact route/state/build evidence and distinguish observed behavior from inference.

Load [quality-and-troubleshooting.md](references/quality-and-troubleshooting.md) for the rendered audit matrix, diagnostic smells, and correction order.

## Motion Brief / Output Contract

Return only material sections for a bounded request; use the full shape for a system or high-risk flow:

1. **Decision and scope** — surface, mode, motion job, in-scope states, non-goals
2. **Current reality** — checked repo/runtime/design evidence, existing primitives, and unknowns
3. **Personality** — approved source plus a concise quality profile and restraint boundary
4. **State map** — triggers, start/end states, semantic authority, interruption, completion
5. **Motion grammar** — semantic roles, properties, directions, timing/easing/spring/stagger recommendations
6. **Choreography** — focus, beats, ordering, overlap, continuity, responsive behavior
7. **Reduced-motion equivalence** — meaning preserved, spatial/continuous motion changed, user controls
8. **Performance and platform constraints** — repo-local budgets, likely hot paths, profiling plan
9. **Implementation handoff** — existing owners/primitives to use, files or adapters if known, no unsupported API claims
10. **Rendered verification** — routes, states, viewports, inputs, settings, traces/captures, and acceptance criteria
11. **Open blocker or next step** — smallest evidence-producing action

When material runtime evidence is unavailable, say:

```text
This is a motion-design recommendation, not verified implementation behavior.
```

## Stop Gates

Stop or narrow the affected boundary when:

- motion has no named user, product, orientation, feedback, hierarchy, or approved expressive purpose
- brand/product/composition direction is material but missing; route that decision to `frontend-design`
- Codrops evidence is being inferred without a `studying-codrops` study
- the request crosses into gameplay-authoritative or game/runtime VFX; route it to `vfx-workflow`
- the target state machine, semantic completion event, focus behavior, or interruption path is unknown and guessing would change product behavior
- reduced motion would remove required meaning, progress, focus, or completion feedback
- a proposed dependency, token layer, or animation abstraction lacks repo evidence and approval
- performance or quality is being judged from a still, isolated demo, or unrepresentative state
- rendered motion conflicts with runtime state, accessibility settings, responsive layout, or user input
- decorative or ambient motion competes with task completion, reading, semantic feedback, or repeated use

## Validation / Self-check

Before finishing, confirm:

- the explicit trigger applies and the task did not expand from an incidental transition
- every motion has a named purpose; unnecessary motion was removed
- brand/product/composition decisions remain owned by `frontend-design`
- Codrops evidence and game/runtime VFX remain with their specialist owners
- recommendations distinguish repo truth, approved direction, heuristic, observation, and unknown
- the state map covers completion, cancel, interruption, rapid repeat, and responsive/input variants where material
- motion does not carry critical meaning alone and reduced motion preserves an equivalent state story
- numeric values are labeled and used as heuristics, not APIs or guarantees
- implementation claims name actual repo primitives/runtime evidence
- rendered audits identify build, route, state, viewport, input, motion setting, and observed result
- repeated use, accessibility, and representative performance were checked before calling the motion successful

## References

- [references/decision-and-personality.md](references/decision-and-personality.md) — read when deciding whether motion belongs, choosing communicative properties, or translating approved direction into a motion personality
- [references/timing-and-easing.md](references/timing-and-easing.md) — read for duration, directional easing, spring-feel, distance, overlap, and stagger heuristics
- [references/choreography-and-state-patterns.md](references/choreography-and-state-patterns.md) — read for narrative beats, multi-element sequencing, entrance/exit continuity, and semantic interaction-state patterns
- [references/ambient-motion.md](references/ambient-motion.md) — read before adding continuous, scroll-linked, pointer-linked, parallax, shimmer, pulse, or decorative motion
- [references/accessibility-platform-performance.md](references/accessibility-platform-performance.md) — read for reduced-motion equivalence, responsive/input adaptation, profiling, and degradation
- [references/quality-and-troubleshooting.md](references/quality-and-troubleshooting.md) — read when auditing rendered motion or diagnosing hierarchy, timing, continuity, accessibility, or performance problems
- [references/upstream-provenance.md](references/upstream-provenance.md) — read for upstream source, pinned revision, adapted scope, and Mahiro-local ownership changes

Upstream-derived guidance is adapted under the bundled [MIT license](LICENSE). Routing, trigger, ownership, evidence, and stop-gate policy are Mahiro-local additions documented in provenance.

ARGUMENTS: $ARGUMENTS
