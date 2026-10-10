# Shared UI Boundaries

## Intent

This page owns reusable UI versus domain-specific UI boundaries, especially the point where business logic starts leaking into shared components.

Use it when the question is whether something belongs in shared UI, in a domain wrapper around shared UI, or entirely inside one module.

## Detect

- Shared component imports a domain-specific service, store, or domain constant
- Shared component contains hardcoded domain labels like status workflow names or module-specific copy
- Component in `ui/` or a shared package is only used by one module
- Domain-specific mapping logic (status-to-tone, domain-to-label) lives inside a shared primitive instead of a domain wrapper
- Call sites repeatedly override a reusable primitive's shell geometry, border, shadow, padding, or typography instead of letting the primitive own its default visual contract

## Reusable UI Boundary Rules

Shared UI should stay broad enough to serve multiple domains without importing one domain's business rules into every caller.

## Before Changing an Existing UI Contract

Use this preflight when the repo already has primitives, recipes, or a design system:

1. Find the primitive used by the real consumer, not just a similarly named file.
2. Read its public API, variants, and semantic token owners.
3. Inspect the nearest accepted usage for the same control or surface job.
4. Check app-level CSS and theme overrides that may change the primitive's resolved paint.
5. Reuse the existing contract before adding an owner-local recipe or shared variant. A single local paint need does not establish a reusable variant.

Keep the edit at the owner responsible for the change:

| Owner          | Responsibility                                                |
| -------------- | ------------------------------------------------------------- |
| Primitive      | Intrinsic shell, baseline geometry, focus and disabled states |
| Composition    | Placement, sibling spacing, section layout                    |
| Domain wrapper | Product labels, status mapping, workflow behavior             |

These are default boundaries, not proof that every native element is a duplicate. A route-owned composition may intentionally use native elements and local layout rules. Do not create a token, variant, or primitive layer merely to satisfy this preflight when the repo has none.

Verify provenance as well as naming: map a semantic class to its current rule and the rule to its source owner. An import or class name alone does not prove the consumer uses the canonical shell; caller overrides can still replace it. Compare resolved paint and relevant rendered states when the claim depends on those properties. Evidence scope belongs to `../foundations/review-checklist.md`.

Before adding a trailing icon, inspect the primitive for an injected chevron, check, or other affordance. In compact rows, give the label and metadata explicit space ownership rather than letting two trailing owners compete. Default control size is a fallback, not a universal geometry mandate: preserve justified compact toolbars and icon overlays through the repo's existing size/variant contract.

## Composed surface pain checks

Run the relevant rows before writing a shared-UI consumer, then check the actual
outcome before reporting it. These are failure probes, not a new visual system:
use the local recipe and accepted density, never turn an example into a universal
pixel value. Skip unrelated rows; a naming-only change does not need browser QA.

| Recurring pain                                                      | Why it slips through                                            | Before writing                                                                                                                    | Cheap disconfirming check                                                                                                                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A real primitive import still produces a copied or overridden shell | Provenance gets mistaken for correct consumption                | Name the primitive, public variant, app override and nearest accepted consumer                                                    | Trace each visible background, border, radius and shadow to its real rule; inspect the composed consumer, not the import alone                                       |
| Spacing is counted twice or applied to the wrong child              | Each utility looks reasonable in isolation                      | Give each row, label and section one spacing owner; inspect flex/grid gaps, margins and wrapper selectors together                | Measure direct-child distances; challenge `gap` plus sibling margins and inline labels whose vertical margins do not affect flow                                     |
| Equal control heights still leave fields misaligned                 | Only the height or inner input was checked                      | Map label line boxes, label-to-shell gaps, shell padding and sibling geometry                                                     | Measure label and outer-shell top/bottom on one mounted form; exercise a conditional field and long label                                                            |
| Input, Select and native exceptions diverge in paint or states      | Default background tokens get treated as the complete recipe    | Map the full field-family recipe, including hover, focus, disabled and invalid; document deliberate native exceptions             | Compare resolved paint and focus geometry in relevant states; different token names may resolve identically, and identical defaults may hide different state recipes |
| Labels, metadata and trailing affordances collide                   | Each child exists, but no one owns remaining space              | Inspect injected primitive icons; give leading content, flexible label, fixed metadata and trailing affordance explicit ownership | Open the real overlay and stress long labels at the narrow supported width; measure gaps, clipping and submenu reachability                                          |
| Icons are incomplete or do not follow state                         | A nominal SVG box or plausible selector gets accepted           | Use the complete owned icon and locate the element carrying the state attribute                                                   | Inspect target-size silhouettes together and both open/closed states; a screenshot of one state does not prove state behavior                                        |
| A reference match preserves the subtree but loses page anatomy      | A cropped capture or token list is treated as the entire source | Establish exact fidelity versus taste evidence; inspect visible ancestors/siblings and freeze accepted edit boundaries            | Compare the relevant rendered source set and current consumer; retain navigation/content outside the crop unless the owner explicitly removed it                     |

Do not force canonical upstream primitives to become visually identical merely
because they appear in one form. First determine whether the local contract wants
the same field family or a deliberate hierarchy; report an unresolved choice
rather than silently forking the primitive or redesigning the page.

## Non-negotiable

- Keep shared UI generic in vocabulary, inputs, and output responsibilities.
- Let reusable primitives own their shell contract: geometry, focus states, disabled states, border, shadow, intrinsic spacing, and baseline typography unless the target repo documents a different ownership model.
- Keep business mapping, domain status rules, workflow labels, and module copy outside shared primitives.
- Wrap shared primitives with domain components when a domain needs custom mapping or composition.
- Do not move page-specific logic into shared UI just to reduce lines in a route or screen file.
- Do not over-customize shared primitives at call sites to chase one screen's local look. Prefer wrapper layout/positioning classes; change the primitive only when the default contract itself is wrong or repeated needs prove a new variant.
- Keep shared UI ownership here, not inside `components.md` or `route-boundaries.md`.

## Preference

- Prefer shared UI APIs that accept domain-neutral props such as `label`, `tone`, `icon`, `value`, or `children`.
- Prefer domain wrappers like `ApprovalStatusBadge` when the domain meaning matters more than primitive reuse.
- Prefer shared UI folders or packages for true cross-domain primitives only after the abstraction has repeated enough to be stable.
- Prefer semantic styling contracts and local design-system tokens from the repo instead of hardcoding domain palette meaning in shared components.
- Prefer caller `className` usage for placement, spacing between siblings, and contextual layout; avoid using it to replace a primitive's entire shell.

## Contextual

- A token-first app can keep domain-specific screens on top of shared primitives. The shared layer stays generic because the domain layer carries product vocabulary.
- A multi-app repo can keep shared UI and shared query-state helpers in packages while app code still owns product-specific wording and workflow behavior.
- Even in a single app, shared layout and reusable UI should not become a silent home for domain service calls or route-specific business branching.
- Follow the local repo's component package, token system, and export conventions. This page decides reuse boundaries, not packaging syntax.

## Examples

- A reusable `StatusBadge` exposes `label` and `tone`, while `ApprovalStatusBadge` maps approval statuses into those props.

```tsx
interface IStatusBadgeProps {
  label: string;
  tone: "info" | "warning" | "success";
}

const StatusBadge = ({ label, tone }: IStatusBadgeProps) => {
  return <span data-tone={tone}>{label}</span>;
};
```

- A domain wrapper keeps business mapping outside the primitive, so the domain owns approval wording and tone rules.

```tsx
const ApprovalStatusCell = ({ status }: { status: ApprovalStatus }) => {
  return (
    <StatusBadge
      label={getApprovalLabel(status)}
      tone={getApprovalTone(status)}
    />
  );
};
```

- A generic table primitive renders columns and slots, while the domain module owns data shaping, empty-state wording, and row actions.
- A shared dialog shell handles layout and focus behavior, while the domain wrapper supplies domain copy, mutation wiring, and submit rules.
- A reusable avatar or input owns its size scale, border, radius, shadow, and focus ring; the caller wraps it for negative margin, grid position, or section spacing instead of restyling the shell each time.

## Anti-Examples

- A shared badge that hardcodes `pending-payroll-review` labels and approval workflow translations.

```tsx
const StatusBadge = ({ status }: { status: ApprovalStatus }) => {
  if (status === "pending-payroll-review") {
    return <span>Pending payroll review</span>;
  }

  return <span>Status</span>;
};
```

- A shared form field that imports domain stores or service classes from one domain.
- Moving domain-specific UI into a package or `ui/` folder after only one use, then forcing other domains to adapt to that accidental API.
- Treating any visually polished component as shared by default even when its meaning is still tied to one screen.
- Passing a long `className` that replaces a shared primitive's padding, border, radius, shadow, and typography when the call site only needed layout positioning.
