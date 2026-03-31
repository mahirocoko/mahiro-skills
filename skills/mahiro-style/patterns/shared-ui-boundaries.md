# Shared UI Boundaries

## Intent

This page owns reusable UI versus feature-specific UI boundaries, especially the point where business logic starts leaking into shared components.

Use it when the question is whether something belongs in shared UI, in a feature wrapper around shared UI, or entirely inside one feature.

## Detect

- Shared component imports a feature-specific service, store, or domain constant
- Shared component contains hardcoded domain labels like status workflow names or feature-specific copy
- Component in `ui/` or a shared package is only used by one feature
- Feature-specific mapping logic (status-to-tone, domain-to-label) lives inside a shared primitive instead of a feature wrapper

## Reusable UI Boundary Rules

Shared UI should stay broad enough to serve multiple domains without importing one domain's business rules into every caller.

## Non-negotiable

- Keep shared UI generic in vocabulary, inputs, and output responsibilities.
- Keep business mapping, domain status rules, workflow labels, and feature copy outside shared primitives.
- Wrap shared primitives with feature components when a domain needs custom mapping or composition.
- Do not move page-specific logic into shared UI just to reduce lines in a route or screen file.
- Keep shared UI ownership here, not inside `components.md` or `route-boundaries.md`.

## Preference

- Prefer shared UI APIs that accept domain-neutral props such as `label`, `tone`, `icon`, `value`, or `children`.
- Prefer feature wrappers like `ApprovalStatusBadge` when the domain meaning matters more than primitive reuse.
- Prefer shared UI folders or packages for true cross-feature primitives only after the abstraction has repeated enough to be stable.
- Prefer semantic styling contracts and local design-system tokens from the repo instead of hardcoding feature palette meaning in shared components.

## Contextual

- A token-first app can keep feature-specific screens on top of shared primitives. The shared layer stays generic because the feature layer carries product vocabulary.
- A monorepo can keep shared UI and shared query-state helpers in packages while app code still owns product-specific wording and workflow behavior.
- Even in a single app, shared layout and reusable UI should not become a silent home for domain service calls or route-specific business branching.
- Follow the local repo's component package, token system, and export conventions. This page decides reuse boundaries, not packaging syntax.

## Examples

- A reusable `StatusBadge` exposes `label` and `tone`, while `ApprovalStatusBadge` maps approval statuses into those props.

```tsx
interface IStatusBadgeProps {
  label: string
  tone: 'info' | 'warning' | 'success'
}

const StatusBadge = ({ label, tone }: IStatusBadgeProps) => {
  return <span data-tone={tone}>{label}</span>
}
```

- A feature wrapper keeps business mapping outside the primitive, so the domain owns approval wording and tone rules.

```tsx
const ApprovalStatusCell = ({ status }: { status: ApprovalStatus }) => {
  return <StatusBadge label={getApprovalLabel(status)} tone={getApprovalTone(status)} />
}
```

- A generic table primitive renders columns and slots, while the feature owns data shaping, empty-state wording, and row actions.
- A shared dialog shell handles layout and focus behavior, while the feature wrapper supplies domain copy, mutation wiring, and submit rules.

## Anti-Examples

- A shared badge that hardcodes `pending-payroll-review` labels and approval workflow translations.

```tsx
const StatusBadge = ({ status }: { status: ApprovalStatus }) => {
  if (status === 'pending-payroll-review') {
    return <span>Pending payroll review</span>
  }

  return <span>Status</span>
}
```

- A shared form field that imports feature stores or service classes from one domain.
- Moving feature-specific UI into a package or `ui/` folder after only one use, then forcing other features to adapt to that accidental API.
- Treating any visually polished component as shared by default even when its meaning is still tied to one screen.
