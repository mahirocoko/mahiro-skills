# State Management

## Current Reality

- server-state library in use today, if any
- client-state library in use today, if any
- persisted state policy, if established

If the repo has no dedicated client-state layer, say so directly instead of inventing a store pattern.

## Client State Stores

[Document the repo's actual client-state library here, such as Zustand, Context, Redux, or none.]

## Current Store

Location: `[store path]`

```ts
[repo-faithful store example]
```

## Usage

```tsx
[repo-faithful selector usage example]
```

## Creating a New Store

Only include this section when the repo already has a store layer or when the generated docs are explicitly setting a Preferred Direction for one.

```ts
[repo-faithful new-store example]
```

## Selectors

Use selectors to prevent unnecessary re-renders.

## Async Actions

Prefer the repo's server-state tool for async server work. Keep the client-state store focused on client state, preferences, and cross-component UI state unless the repo has a different explicit rule.

## Server State vs Client State

- **Server state**: [TanStack Query / other server-state tool]
- **Client state**: [Zustand / other client-state tool]
- **Persisted state**: [safe preferences or pointers only, unless local auth policy proves otherwise]

Server-owned records, memberships, lists, and remote entities should stay in the server-state layer. Do not mirror them into client-state stores unless the repo already has an explicit rule for that.

Persisted stores should prefer safe preferences, active-scope pointers, theme/language settings, and other local UI choices. Auth tokens or backend-owned records need explicit repo policy before documenting them as acceptable.

## Not Established Yet

- client-state store layer
- persisted store policy
- server-state/query layer

Remove bullets for layers the repo already proves.

## Best Practices

1. **Minimal global state**: Only store values that truly need to be shared
2. **Use selectors**: Avoid broad store subscriptions
3. **Keep server state in the server-state layer**
4. **Keep client state in the client-state layer**
5. **Persist carefully**: Persist only local preferences or pointers unless repo evidence proves a stronger policy
