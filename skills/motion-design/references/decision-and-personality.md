# Decision framework and motion personality

This reference adapts upstream decision, emotional-intent, property-selection, motion-personality, and UI animation-principle guidance. The routing and evidence posture in `SKILL.md` are Mahiro-local.

All numbers and mappings below are hypotheses to test in context, not executable APIs or universal rules.

## Decide whether motion belongs

Start with the state change and user job, not an animation technique.

| Motion job | What it should clarify | Common low-motion alternative |
|---|---|---|
| Respond | Input was received | Immediate state/color/shape change |
| Reveal or conceal | Content became available or unavailable | Instant layout update with focus continuity |
| Transition | Relationship between views or states | Direct replacement with clear heading/focus update |
| Orient | Where an object came from or went | Persistent spatial labels or breadcrumbs |
| Emphasize | What changed or needs attention | Static contrast, placement, icon, or copy |
| Explain relationship | How objects, causes, or progress connect | Connector, grouping, status text, or ordered layout |
| Express approved personality | How the product should feel | Static visual language from approved design direction |
| Create atmosphere | Optional environmental tone | Static art, color, texture, or no effect |

Ask:

1. What event or state changed?
2. What might the user otherwise miss or misunderstand?
3. Is the transition frequent, time-critical, stressful, interruptible, or one-time?
4. What is the minimum motion that communicates the answer?
5. Does the same meaning survive when spatial or continuous motion is reduced?

If a static change communicates the state more clearly, prefer it. Delight is not permission to delay task completion.

## Evidence order

Derive motion from:

1. explicit product and accessibility requirements
2. repo-proven states, primitives, tokens, and platform behavior
3. approved brand/product/composition direction from `frontend-design`
4. user-provided motion references, treated as hypotheses until behavior is observed
5. context-dependent motion judgment

Do not infer a brand personality from industry category alone. Do not assign “corporate” as a default simply because the surface is an application.

## Three decision lenses

### Intent

Name the target result: confidence, calm, urgency, continuity, delight, weight, precision, or another approved quality. Treat emotion-to-motion associations as hypotheses:

- crisp, direct motion can support urgency or confidence
- smooth, continuous motion can support calm or continuity
- restrained overshoot can support playfulness or reward
- slow, controlled motion can support weight or ceremony
- angular paths can feel mechanical or tense; curved paths can feel organic or friendly

Culture, reading direction, platform conventions, product context, and repetition can change these readings. Validate them rather than treating path direction or duration as a universal emotional language.

### Narrative

Even short transitions have an implicit story:

```text
current state -> change becomes legible -> new state settles
```

Longer sequences may add anticipation and reaction, but not every interaction needs them. Skip wind-up, flourish, and secondary action when they delay feedback or add no meaning.

### Craft

Choose properties, path, easing, timing, and overlap that support the intent. Motion craft should preserve object identity, hierarchy, and causal relationships—not maximize the number of animated layers.

## Motion personality profile

Describe a product's motion as a set of axes rather than a mandatory archetype:

| Axis | Restrained end | Expressive end |
|---|---|---|
| Response | immediate/crisp | staged/deliberate |
| Continuity | direct cuts | spatially connected |
| Elasticity | damped/no overshoot | springy/overshooting |
| Geometry | straight/mechanical | curved/organic |
| Density | one change at a time | layered reactions |
| Rhythm | uniform/predictable | varied/syncopated |
| Atmosphere | static | ambient/continuous |

A concise profile might be:

```text
Direct and crisp for repeated task feedback; softly continuous for view changes; no overshoot except approved celebration; sparse ambient motion.
```

The upstream playful, premium, corporate, and energetic archetypes remain useful review vocabulary, not defaults or complete brand strategies:

- **Playful** may use arcs, elasticity, anticipation, and varied rhythm.
- **Premium/controlled** may use restraint, smooth continuity, and little or no overshoot.
- **Professional/direct** may use predictable timing, clear state transitions, and sparse layering.
- **Energetic** may use fast response, stronger contrast, larger displacement, and sharper rhythm.

Mix qualities by semantic role when justified. A repeated data-entry action and a rare success celebration do not need identical intensity, but they should still feel related.

## Semantic property choice

Select the fewest properties that communicate the change.

| Property | Often communicates | Questions before use |
|---|---|---|
| Position | origin, destination, progression, reordering | Is the spatial relationship true at all viewports and reading directions? |
| Scale | activation, proximity, hierarchy, impact | Does it distort text, hit targets, or layout perception? |
| Opacity | presence, absence, priority | Is meaning still clear without relying on opacity alone? |
| Rotation | transformation, processing, orientation | Is rotation semantically expected or merely decorative? |
| Shape/mask | reveal, transformation, containment | Does it preserve legibility and perform in the target runtime? |
| Color | status, activation, hierarchy | What non-color carrier preserves meaning? |
| Shadow/depth | elevation, attachment, focus | Is the paint cost acceptable and the light model coherent? |

One property can be sufficient. A second can clarify continuity or state. Additional layers need an explicit job and should not compete with the primary change.

## Selective animation principles for UI

Use these only when they improve comprehension or approved expression:

- **Anticipation** — a small preparatory cue before a material action; omit for immediate feedback and routine micro-interactions.
- **Staging** — establish one focal change per beat; do not dim or blur context if that harms reading or orientation.
- **Follow-through and overlap** — related objects can settle at slightly different times to preserve causality.
- **Slow-in/slow-out** — acceleration and deceleration can make spatial movement legible; linear motion can remain appropriate for mechanically constant progress or rotation.
- **Arcs** — useful for organic or physical objects; straight paths can be correct for mechanical interfaces.
- **Secondary action** — supports the primary event only when it does not compete for attention.
- **Exaggeration** — reserve for rare, approved emphasis or celebration; repeated controls usually require restraint.
- **Appeal** — consistency, legibility, and satisfying completion matter more than flourish.

Squash/stretch, particles, bounce, parallax, and ambient layers are optional techniques—not quality requirements.

## Decision record

For each material family, capture:

```text
Family/state change:
User meaning:
Frequency and urgency:
Primary property and why:
Supporting property, if needed:
Personality qualities:
Reduced-motion equivalent:
Evidence source:
Unknown to validate:
```
