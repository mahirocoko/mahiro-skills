# Runtime cue contract

## Boundary model

Describe times relative to authoritative gameplay events, not arbitrary animation frames:

```text
intent -> telegraph-open -> cast-start -> commit -> launch
       -> arrival (damage/heal/status) -> resolve -> cleanup
                         \-> cancel/interruption/reconcile
```

A cue may start before an authoritative event, but label it as predicted or anticipatory. Define the correction path. At `arrival`, gameplay resolves regardless of whether impact rendering is available. When visual travel duration cannot equal simulation travel, decide explicitly whether to scale visual travel, delay only non-authoritative feedback, or communicate the mismatch; never move gameplay arrival silently.

For each cue record:

- stable cue and gameplay-event IDs;
- source/target entity and allegiance;
- intent, commit, arrival, cancel, and cleanup boundaries used;
- transform space, semantic socket/anchor, offset, facing, and mirror policy;
- follow/detach behavior after launch and source/target destruction;
- semantic vs decorative layers;
- time-scale, pause, replay/rollback, and offscreen policy;
- accessibility and pressure variants;
- terminal cleanup paths.

## Family responsibilities

| Family | Runtime truth to preserve |
| --- | --- |
| Telegraph | Effective danger/interaction shape, onset, commit deadline, cancel state, edge readability. Decoration must not enlarge implied collision. |
| Cast | Wind-up, ownership, direction, interruption, and commit. Keep cast body motion and attached VFX independently controllable. |
| Projectile | Launch and authoritative arrival, trajectory model, source/target loss, predicted/reconciled path, and impact handoff. A visual projectile is not the collider. |
| Trail | Recent motion/direction without changing the perceived hit area. Detach and expire cleanly; avoid pooled history leakage. |
| Impact | Confirm the resolved event at the authoritative contact/location. Distinguish blocked, immune, miss, crit, heal, and ordinary hit without relying only on color. |
| AOE | Center, footprint, active window, tick cadence if meaningful, allegiance, and end state. Separate active-area readability from ambient particles. |
| Aura | Persistent owner/radius/status with low idle cost. Survive owner animation changes and terminate on removal/despawn. |
| Status | State identity, stacks/severity/duration when relevant, refresh/replacement rules, and body/UI coordination. Avoid obscuring telegraphs. |
| Barrier | Protected owner/area, remaining or break state when exposed, hit response, depletion, and break timing. Keep barrier visuals separate from hurtbox logic. |
| Pickup | Availability, ownership/eligibility, attraction, collection commit, and collected/denied response. Do not let decorative magnet motion imply early collection. |
| UI feedback | Explain the same resolved event in screen space: damage, heal, status, cooldown, error, target, or pickup. Deduplicate world/UI signals by event ID. |

## Sockets, anchors, and mirroring

- Use semantic names such as `cast-hand`, `weapon-tip`, `body-center`, `ground-origin`, or `ui-target`; map them through a repo-local adapter.
- State whether offsets are in entity-local, sprite-local, world, camera, or screen space. Avoid magic offsets scattered through effect code.
- Specify fallback order for missing sockets and fail visibly in development when a critical attachment is absent.
- Mirror position, orientation, atlas frame, and directional emission as separate decisions. Do not mirror text, asymmetric emblems, lighting logic, or authored handedness by accident.
- Sample attached sockets at the runtime phase required by the renderer to avoid one-frame lag. Keep that exact engine ordering repo-local.
- Decide whether a cue follows, freezes, transfers, or dies when its owner changes facing, animation, parent, scene, or lifetime.

## Body/VFX separation

Keep body, equipment, gameplay collision, and VFX as separate data/layers even when previewed together. This enables independent depth, tint, mirroring, accessibility, pooling, and replacement. Do not derive body bounds or anchors from detached sparks, glows, shadows, or trails. For authored composites, retain separate-layer exports and a composition manifest; use `sprite-workflow` for sheet/layer production and cleanup.
