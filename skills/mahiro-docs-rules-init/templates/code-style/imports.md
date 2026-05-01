# Import Guidelines

This page can carry both observed repo import behavior and the preferred import blueprint. If the repo follows Mahiro-style structure, keep that guidance visible without pretending every rule is already auto-enforced.

## Import Order

[Formatter or linter] automatically organizes imports when you run `[verified command]`.

If the repo does not auto-sort imports, say that directly and present the preferred order as guidance rather than as enforced behavior.

### General Order

1. External libraries
2. Internal packages or workspace packages
3. Aliased imports
4. Relative imports
5. Type imports (grouped together when possible)

```ts
// Correct
import { useMemo } from 'react'

import type { IProfileCardProps } from '@/components/profile/profile-card'
import { Avatar } from '@/components/avatar'

import { formatDisplayName } from './format-display-name'
```

## Type Imports

Use `type` keyword for type-only imports:

```ts
// Correct
import type { ComponentProps } from 'react'
import type { IProfileCardProps } from '@/components/profile/profile-card'
import { useState } from 'react'
```

If the repo uses Mahiro-style TypeScript, keep `I`-prefixed interfaces visible in import examples instead of flattening the type posture away. If the target repo proves a different posture, document that as local reality.

## Path Aliases

Document the real alias mapping used by the repo.

```ts
[repo-faithful alias examples]
```

Common examples may include `@/components`, `@/hooks`, `@/lib`, `@/routes`, `@/services`, or `@/types`, but only keep the ones the repo actually uses.

## Relative Imports

Keep relative imports shallow:

```ts
// Preferred
[preferred shallow import example]

// Acceptable
[same-folder example]

// Avoid
[too-deep relative import example]
```

## Dynamic Imports

Document this only if the framework or repo uses meaningful dynamic import patterns.

## Named vs Default Exports

Keep this section aligned with the repo or house export posture. Do not force generic "named vs default" balance if the target style has a stronger opinion.

### Services

```ts
[repo-faithful service export example]
```

### Components

```tsx
[repo-faithful component export example]
```

### Types

```ts
[repo-faithful type export example]
```

## Barrel Files (`index.ts`)

Use re-exports for clean imports when the repo actually uses them:

```ts
[repo-faithful barrel example]
```

## Side Effect Imports

Avoid side effect imports unless necessary:

```ts
[repo-faithful side effect import example]
```

## Duplicate Imports

[Formatter or linter] consolidates duplicate imports.

## Unused Imports

[Formatter or linter] [warns/errors] on unused imports. Remove them before committing.

## Preferred Direction

- Keep import examples close to the intended repo style, including explicit type imports and any interface naming posture.
- Separate enforced ordering from suggested ordering when the repo is still young.
- Prefer examples that look like real project code, not generic linter documentation.
- Do not flatten `I`-prefixed interface imports out of examples when that posture is part of the house style.
- Do not introduce folder paths that the repo does not already use.
