# Master sprite first

Use this production path when generated animation sheets keep drifting, dicut is fragile, or Mahiro wants production-quality mascot sprites rather than quick references.

## Why

Animation generation compounds errors:

- character identity drifts frame by frame;
- outfit colors and details mutate;
- backgrounds become non-flat chroma mattes;
- frame spacing becomes irregular;
- dicut cleanup must solve many inconsistent edges at once.

A clean master sprite gives the animation lane a stable source and a visual quality target.

## Path

1. Generate or edit one clean master sprite pose first.
2. Dicut/cleanup the master with light/dark/checker QA.
3. Inspect at target runtime size.
4. Approve the master style explicitly before animation.
5. Generate animation from the approved master, preferably as subtle edits/motion rather than a brand-new character sheet.
6. Compare dicut modes per candidate.
7. Promote only after script QA and visual honesty review both pass.

## Master sprite acceptance

A master sprite is not approved unless:

- silhouette reads at target size;
- full body/props/tail are visible;
- outfit/color identity is preserved;
- detail density is appropriate for the runtime size;
- alpha/chroma cleanup works on light/dark/checker backgrounds;
- no generated background/shadow/halo remains;
- Mahiro/main agent accepts the visual style.

## Prompt posture

For master sprites, prefer:

```text
Create one clean full-body runtime sprite, centered, idle/action-ready, exact flat chroma key, generous padding, simplified details, no scenery, no shadow, no gradient, no halo, no text.
```

Avoid asking imagegen for complex animation until the master reads well.

## When to stop

Stop and regenerate/rebrief instead of cleanup-looping when:

- the master is fuzzy illustration rather than sprite;
- costume details are unreadable/noisy;
- pose silhouette is weak;
- key color is baked into fur/hair edges;
- subject colors are too close to the chroma key for safe extraction;
- animation frames change the character model.
