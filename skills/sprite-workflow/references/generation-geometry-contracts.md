# Generation geometry and scale contracts

Evidence pin: `0x0funky/agent-sprite-forge` at `64fd0b57d3f2ae117ef0a95e4c2decc25b4c9dd2`, especially `skills/generate2dsprite/SKILL.md` and `references/prompt-rules.md`.

Use these contracts conditionally. They refine generation and QA; they do not replace the target repo's runtime schema.

## Accepted-master shared scale profile

For a multi-action grounded character:

1. Approve one clean idle or run master at the intended cell size, standing-equivalent scale, body root/feet line, padding, and component policy.
2. Record one shared scale profile from that accepted master: source identity/hash, output cell size, raw-to-output scale, semantic anchor, trim/padding policy, and body-component selection.
3. Reuse the profile for compatible grounded idle, walk, run, attack-body, hurt, and cast-body sheets. Do not choose a fresh fit scale per action or hide generation drift with per-frame resizing.
4. Compare each action to the profile before and after normalization. Preserve legitimate crouch/recoil pose bounds, but reject unexplained anatomy or standing-scale drift.

Do not force the grounded profile onto jumps, knockback, flying actors, projectiles, FX, or creatures whose authored silhouette changes radically. If a body mask/component cannot be separated from detached FX, fail body-scale measurement closed.

## Body and FX prompt separation

For fixed-cell heroes and other high-value actors, request body-only animation by default. Keep wide slash arcs, muzzle flashes, projectiles, impact bursts, detached dust, and long trails in separate raster FX sheets. If an integrated weapon remains in the body sheet, keep it close to the body and preserve the accepted-master scale and anchor.

## Conditional prompt clauses

### Elongated creatures

Use for long quadrupeds, serpentine bodies, long tails, wings, or attack extensions that nearly fill a cell:

> Keep the torso center fixed and every pose inside one shared central 70%–72% silhouette envelope. Tuck the tail and long appendages inward. Express pounce, bite, or recoil through in-place compression and extension, not whole-body travel across the cell. Keep snout, paws, wings, weapon, and tail fully inside every cell.

“Generous margin” alone is insufficient. Regenerate on output-edge contact or paste clamping; do not relax containment to rescue a clipped pose.

### Rooted bosses

Use for massive grounded boss idles:

> Lock both feet and the pelvis against lateral translation. Express weight through vertical torso compression, chest/core pulse, shoulder settling, and small delayed motion in attached ornaments. Do not use whole-body left/right sway as the idle beat.

QA the feet and pelvis as the root while allowing upper-body and attached secondary motion.

### Ground-contact FX

Use for fire, aura bases, landing dust, shockwaves, and other billboard/contact effects:

> Use one explicit shared ignition/contact baseline at a fixed cell coordinate. Keep contact width, camera distance, and scale stable while tips, embers, or effect height animate above it. Do not bake a ground plate, lava pool, tile, perspective floor, or shadow into the transparent effect.

Measure the authored contact baseline, not detached embers or changing tip height. Prefer the main connected effect component when particles corrupt anchoring. Any looser anchor threshold is effect-specific and requires visual confirmation of a fixed baseline, zero output-edge contact, zero clipping/paste clamping, and correct composite placement; never weaken grounded-character gates globally.
