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

import type { IProfileCardProps } from '@/features/profile/types'
import { Avatar } from '@/components/Avatar'

import { formatDisplayName } from './formatDisplayName'
```

## Type Imports

Use `type` keyword for type-only imports:

```ts
// Correct
import type { ComponentProps } from 'react'
import type { IProfileCardProps } from '@/features/profile/types'
import { useState } from 'react'
```

If the repo uses `I`-prefixed interfaces, keep that naming visible in import examples instead of flattening it away.

## Path Aliases

Document the real alias mapping used by the repo.

```ts
[repo-faithful alias examples]
```

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
