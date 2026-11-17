# TypeScript Guidelines

This page may carry both observed repo TypeScript behavior and the preferred house-style blueprint. If the target repo follows Mahiro-style conventions, keep that posture visible even when the local codebase is still early.

## Configuration

- **Strict mode**: [Enabled/Disabled]
- **No implicit any**: [Enabled/Disabled]
- **Strict null checks**: [Enabled/Disabled]

Base config lives in `[config path]`.

Use local config as the source of truth for compiler behavior, but allow the naming and export guidance below to preserve the intended TypeScript style for a new repo.

## Naming Conventions

### Interfaces

- **Prefix**: `I` for interfaces when the repo follows Mahiro-style TypeScript.
- **PascalCase**: Rest of the name

Treat `I`-prefixed interfaces and unprefixed aliases as `Preferred Direction` when the repo is silent. Local and generated naming wins; do not force conversions of existing non-`I` contracts.

```ts
// Repo-silent fallback
interface IButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary'
}
```

If the target repo has a non-`I` posture, document and preserve it instead of forcing the fallback prefix.

### Types

- **PascalCase** for type aliases
- Avoid `I` prefix for `type` aliases unless the target repo already uses it consistently

```ts
// Preferred
type ButtonVariant = 'primary' | 'secondary'

// Avoid unless the repo explicitly uses this posture
type IButtonVariant = 'primary' | 'secondary'
```

### Enums

- **PascalCase** for enum names
- [Document whether values stay explicit, uppercase, or API-mapped]

## Exports

### Type Exports

Follow established local type-export conventions. Otherwise, export a props or payload contract only when it is part of the public API or another owner needs it; do not export every local type automatically.

Local, generated, and framework conventions win. When the repo is silent:

- Ordinary components and service classes: declare locally, then bottom grouped public value/type exports.
- `types/` and `utils/`: export public declarations inline with whitespace between declarations.
- Constants and hooks may export inline.
- Routes: named framework exports stay inline; default page exports go at the bottom only where the framework permits.

```tsx
// Only when the props contract is public/reused or local policy requires it
export { Button, type IButtonProps }
```

Keep private interfaces and implementation helpers unexported.

### Barrels (`index.ts`)

Use barrel files to re-export when the repo actually uses them.

Barrels are not a mandatory baseline. Introduce one only for an established public surface or a locally proven need, not to shorten every import.

## Type Imports

Use `type` keyword for type-only imports when possible.

```ts
import type { IButtonProps } from './button.types'
import { Button } from './button'
```

## Path Aliases

- `[real alias mapping]`

## Common Patterns

### Component Props

Prefer interface-based props with the repo's current naming posture. For Mahiro-style repos, keep the `I` prefix.

```tsx
interface IButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
}

const Button = ({ variant = 'primary', ...props }: IButtonProps) => {
  return <button data-variant={variant} {...props} />
}

export { Button }
```

This is the repo-silent fallback: declare the component locally and export its public surface at the bottom, leaving its private props interface unexported. Preserve established inline exports, framework requirements, and generated code when they are the local winner.

### Function Shape

When the repo is silent, prefer arrow functions with explicit block bodies and returns for app-owned components, hooks, helpers, and callbacks. Void callbacks use block bodies without inventing return values. Local function conventions, generated code, and framework-required syntax win; do not rewrite unrelated functions.

### Store State / Service Response / Domain Payload

Use names that keep domain signal clear. Interface payloads keep the `I` prefix in Mahiro-style repos; plain aliases should usually stay unprefixed.

```ts
interface IUpdateProfilePayload {
  displayName: string
}

interface IProfileResponse {
  id: string
  displayName: string
}

type ProfileId = string
```

## Avoid `any`

```ts
// Avoid
const data: any = fetchData()

// Better
const data: unknown = fetchData()
```

## Utility Types

Use TypeScript utility types.

## Preferred Direction

- Keep the page's naming guidance strong enough that a new repo inherits the intended interface/type posture from day one.
- Use `I`-prefixed interfaces and unprefixed aliases as fallback only; preserve existing local and generated contracts without forced conversion.
- Do not rewrite clearly established local TypeScript doctrine, but do not erase the house-style blueprint just because the repo is still young.
