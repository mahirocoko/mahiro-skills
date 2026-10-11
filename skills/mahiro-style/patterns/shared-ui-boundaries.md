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

For stateful affordances, locate the runtime attribute on the actual node that
owns the selector; do not infer it from a familiar group/peer class. Trace a
selection's machine value to its displayed label through the primitive's public
API or domain mapping, then inspect the closed trigger after selection. A
readable option in the popup does not prove the trigger displays that label.
Values already intended as human labels do not need a new mapping layer.

For typography mismatches, trace the semantic role through caller classes,
class-merger output and the winning font family/size, not only a generated CSS
rule. Keep a logo-only face in its logo role rather than a generic display alias
that leaks into product UI. Check the relevant hierarchy, wraps and Thai glyph
clearance at rendered size; use the project's typography owner or available
focused typography guidance for direction, not universal type sizes or tracking.

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
| Input-like controls diverge in border/background                    | Only text inputs or inner elements get checked                  | Inventory the actual field family and each outer paint owner; recover prior local examples and justified contextual variants      | Compare outer-shell border width/style/color and background in matching states; include multiline fields and composed triggers, not just the editor's text input     |
| Labels, metadata and trailing affordances collide                   | Each child exists, but no one owns remaining space              | Inspect injected primitive icons; give leading content, flexible label, fixed metadata and trailing affordance explicit ownership | Open the real overlay and stress long labels at the narrow supported width; measure gaps, clipping and submenu reachability                                          |
| Icons are incomplete or do not follow state                         | A nominal SVG box or plausible selector gets accepted           | Use the complete owned icon and locate the element carrying the state attribute                                                   | Inspect target-size silhouettes together and both open/closed states; a screenshot of one state does not prove state behavior                                        |
| A reference match preserves the subtree but loses page anatomy      | A cropped capture or token list is treated as the entire source | Establish exact fidelity versus taste evidence; inspect visible ancestors/siblings and freeze accepted edit boundaries            | Compare the relevant rendered source set and current consumer; retain navigation/content outside the crop unless the owner explicitly removed it                     |

### Field family: shared border/background, independent anatomy

Interpret "input style" as consistent border and background across ordinary
input-like controls, not only the HTML input element. Inventory real consumers:
Input, Textarea, Select, DatePicker, Combobox and search/value triggers where
present. Recover the nearest local examples before inventing a new interpretation.
Keep each control's geometry, anatomy and behavior; this requirement does not
demand identical radius, shadow or focus mechanics, nor justify withdrawing
otherwise correct work on those properties.

Compare border width/style/color and background at the **outer paint owner** in
matching states. A transparent, borderless inner input is valid when InputGroup
or a composed trigger owns the field surface; do not add a second frame. Inspect
hover, focus, disabled and invalid when relevant without forcing different
interaction mechanisms to become identical. Compact inline or quiet controls
may have deliberately different paint, but establish that role from the local
or human contract rather than inventing an exemption after finding a mismatch.

Inspect the whole winning paint chain: theme values, surrounding surface such as
Dialog, primitive, composition overrides and state. Shared field paint is a
comparison criterion, not a ban on holistic diagnosis or an instruction to paint
popups/dialogs like fields. Treat suggested causes as hypotheses: identical fill
alone does not prove Dialog is wrong, and an unchanged canonical primitive does
not disprove a disappearing field. Test the competing cause with the smallest
bounded probe and repair the evidenced owner through an existing variant or
supported composition API. Push back when evidence contradicts a suggestion.

Report the consumers and states actually inspected. Equal heights, valid labels,
imports and a clean console do not prove border/background parity or a visible
boundary. Source checks establish only source facts; rendered checks and human
visual acceptance remain separate. Do not claim the entire family passed while
an existing member or its shell was omitted.

## Non-negotiable

- Keep shared UI generic in vocabulary, inputs, and output responsibilities.
- Let reusable primitives own their shell contract: geometry, focus states, disabled states, border, shadow, intrinsic spacing, and baseline typography unless the target repo documents a different ownership model.
- Keep business mapping, domain status rules, workflow labels, and module copy outside shared primitives. Reuse the canonical entity display mapping and missing-data fallback across sibling consumers unless a proven local surface contract intentionally differs; shared CSS alone does not establish data consistency.
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
