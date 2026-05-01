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

Treat `I`-prefixed interface naming as the preferred Mahiro-style posture for new or still-forming repos. Only soften this when the target repo already shows a strong repeated non-`I` pattern.

```ts
// Correct
interface IButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary'
}

// Avoid unless the repo explicitly rejects Mahiro-style interface naming
interface ButtonProps {}
```

If the target repo already has a stable non-`I` posture, document that explicitly instead of silently forcing the prefix. Otherwise, keep `I`-prefixed interfaces visible throughout the page.

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

Always export types alongside implementations when the repo does so.

If the repo follows Mahiro-style export posture, keep exported interface names explicit:

```tsx
export { Button, type IButtonProps }
```

### Barrels (`index.ts`)

Use barrel files to re-export when the repo actually uses them.

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

export const Button = ({ variant = 'primary', ...props }: IButtonProps) => {
  return <button data-variant={variant} {...props} />
}
```

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
- Preserve `I`-prefixed interface naming as the default Mahiro-style convention unless the target repo clearly establishes an alternative.
- Do not rewrite clearly established local TypeScript doctrine, but do not erase the house-style blueprint just because the repo is still young.
