# Golden example: reload warning with repeated false leads

Use this example to understand Fable's reasoning shape. Do not copy its
technical solution into another repository without matching evidence.

## Situation

A managed runtime bundle emitted a React maximum-update warning only during a
host reload. Static source checks passed. Nearby UI code looked suspicious, and
the host stack ended inside framework internals.

## Failed ordinary loop

1. A framework patch was attempted before ownership was agreed.
2. A nearby integration was blamed because its activity was temporally close.
3. Registration count looked like a threshold, so several registrations were
   consolidated.
4. Static checks passed, but the all-enabled foreground runtime still warned.

Each step produced useful evidence, but the narrative was promoted too early.
The fourth result refuted final-cardinality-only reasoning.

## Fable reframe

Mission:

- fix only the owned bundle
- keep every feature enabled
- do not patch the host framework or separately owned integration
- require repeated foreground reload evidence

Adaptive read-only lanes:

- **Host/core lane** — trace external-store publish and factory lifecycle
- **Bundle lane** — audit activation, cleanup, panels, timers, and side effects
- **Experiment lane** — design a bounded matrix that separates count, ordering,
  transition reloads, and stable-state reloads

Each lane had a claim to disprove rather than a request to endorse the current
theory.

## Convergence

The synthesis found three compatible facts:

1. every registry mutation published synchronously into a legacy React host;
2. the host awaited asynchronous bundle factories;
3. final registration count alone did not describe one nested update chain.

The smallest owned change split the largest registration groups across real
macrotask boundaries and rechecked generation abort state before registering.
The regression suite proved no synchronous registration, a real timer turn, and
zero stale registration after abort.

## Acceptance

- all owned entries enabled
- installed/source equality checked
- focused, clean-environment, and package checks passed
- several consecutive foreground reloads produced no fresh warning records
- temporary diagnostics removed only after human confirmation

Outcome: `VERIFIED`.

## Transferable lessons

- A framework stack identifies the symptom path, not automatically the owned
  fix location.
- Temporal proximity is not causal ownership.
- A passing static budget is not runtime acceptance.
- Separate transition observations from stable-state observations.
- After the same theory fails twice, preserve the evidence and change the
  hypothesis—not only the patch.
- The main agent should converge specialist evidence into one smallest owned
  change, then require verification at the same scope as the claim.
