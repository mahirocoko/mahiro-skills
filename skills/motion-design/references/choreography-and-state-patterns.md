# Choreography and semantic state patterns

This reference consolidates upstream choreography, narrative, multi-element, entrance/exit, and state-feedback guidance. Recipes are starting structures, not component APIs or mandatory sequences.

## Build from the state graph

List real states and transitions before keyframes:

```text
idle -> intent -> pending -> success | error
  \-> cancel/interruption/navigation-away
```

For each edge, record:

- authoritative trigger and semantic completion event
- visual start/end state
- focus and reading-order outcome
- reversible, interruptible, or one-way behavior
- rapid-repeat and stale-response behavior
- narrow/wide viewport adaptation
- reduced-motion equivalent

Animation completion should not silently become product-state authority.

## Narrative scale

Use only the beats the transition earns:

1. **Setup/anticipation** — establish context or prepare a rare material action.
2. **Action** — make the primary change legible.
3. **Reaction** — show related consequences or continuity.
4. **Resolution** — settle into the usable state.

For routine feedback, action plus resolution may be enough. For immediate press acknowledgement, one response beat may be enough. Add stillness after a larger sequence so the new state can be read; do not insert decorative pauses into task flow.

## Choreography hierarchy

- Choose one focal change per beat.
- Let supporting motion use less displacement, contrast, or duration than the focal change.
- Start from the trigger or a truthful shared origin when spatial continuity matters.
- Keep grouped elements in a coherent timing/easing family.
- Use reading order, distance from trigger, semantic priority, or spatial grouping to determine sequence.
- Counter-motion can clarify depth or physical response, but it is optional and should remain subordinate.
- Break large travel into meaningful intermediate states only when the intermediate state communicates progress or path; do not add keyframes to satisfy an arbitrary ratio.

A useful attention heuristic is to keep only a minority of a dense group in prominent motion at once. Test the actual composition rather than applying a fixed one-third rule.

## Entrance and exit continuity

Choose an entrance that explains origin or hierarchy:

- **Direct** — position plus optional opacity for spatial arrival.
- **Emergent** — scale/shape plus optional opacity for local appearance.
- **Reveal** — mask/clip for contained disclosure when the runtime supports it.
- **Assembled** — multiple parts only when their construction is meaningful.

Choose an exit that explains destination or removal:

- **Direct departure** — moves toward a truthful edge or destination.
- **Dissolve** — relationship to space is unimportant.
- **Collapse** — removal from a local hierarchy.
- **Transfer** — moves toward a visible destination such as a collection or slot.

Pair entry and exit around object identity, origin/destination, reading direction, and responsive layout. Overlap outgoing and incoming views only when both remain understandable and focus does not land in an inert state.

## Overlay and disclosure pattern

For dialogs, popovers, drawers, dropdowns, and accordions:

1. update semantics and focus according to the component contract
2. establish backdrop/container relationship
3. reveal readable content in hierarchy order only when delay remains negligible
4. keep close/dismiss controls immediately discoverable
5. reverse or cancel cleanly under rapid input
6. finish with correct focus and non-interactive hidden content

Backdrop, container, and content do not need three separate decorative beats. Height animation can trigger layout work; inspect repo primitives and content variability before recommending it.

## Navigation and view transition pattern

- Preserve route/view truth independently from visual travel.
- Use direction only when it matches real information architecture and locale/reading direction.
- Shared-element continuity must preserve identity, clipping, stacking, and responsive geometry.
- Restore or move focus at the semantic view boundary, not at an arbitrary flourish.
- Handle browser back/forward, direct load, interrupted navigation, and reduced motion.
- Avoid animating an old view after it has become inaccessible or semantically stale.

## List, grid, and reordering pattern

- Existing items move only enough to explain reflow.
- New or removed items receive the strongest local cue; unaffected items remain quiet.
- Use reading order or spatial proximity for stagger, then compress or remove the sequence for long groups.
- Preserve item identity during sorting, filtering, optimistic updates, rollback, and virtualization.
- Do not animate every row on every refresh if repeated motion obscures scanning.

## Input and selection states

### Press, toggle, and selection

Acknowledge input immediately, then settle into the authoritative state. Keep hit area, focus ring, and label readable. For optimistic updates, define rollback motion or use a neutral pending state; do not celebrate before success is authoritative.

### Hover and focus

Hover may enrich pointer use but cannot be the only affordance. Keyboard focus needs a clear, stable indication even with reduced motion. Avoid moving targets under the pointer or focus cursor.

### Drag and direct manipulation

Maintain contact between input and object, reveal valid destinations, and distinguish preview from committed state. On cancel or failed drop, return or reconcile without making the user chase the object. Prefer direct tracking over decorative easing during active manipulation; ease only the release/settle when appropriate.

## Async and feedback states

### Pending/loading

- acknowledge the action before showing progress
- distinguish indeterminate activity from measured progress
- avoid switching to a spinner for operations too short to perceive; avoid flicker through repo-proven delay/minimum-display handling
- maintain layout and context where possible
- pause or stop loops when hidden, complete, canceled, or reduced

### Success

Confirm what completed and where the user should look next. Scale the celebration to consequence and frequency. Routine saves may need only a stable label/icon change; rare milestones may earn a short layered reaction. Color, particles, and motion cannot be the only confirmation.

### Error

Make the affected object and recovery action clear. A brief directional cue can draw attention, but repeated shake, flash, or vibration can feel punitive and may trigger discomfort. Preserve typed input, focus the correct recovery point, and use text/icon/structure alongside motion.

### Warning and disabled

Warnings should remain readable without pulsing. Disabled/enabled changes need truthful semantics and contrast; opacity or scale alone may not meet that requirement.

## Interruption contract

For each material transition, decide:

- **reverse** — return smoothly to the previous state
- **retarget** — continue from the current visual value toward a new state
- **snap** — move immediately to authoritative state when continuity is less important
- **queue** — only when ordered completion is product-required
- **discard/reconcile** — ignore stale async results and render current truth

Test rapid clicks, key repeat, touch cancellation, route changes, resize, background/foreground, and reduced-motion setting changes. No orphaned overlays, stale timers, trapped focus, or never-settled promises should remain.
