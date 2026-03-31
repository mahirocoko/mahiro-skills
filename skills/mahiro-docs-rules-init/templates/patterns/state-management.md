# State Management

## Zustand Stores

[Document the repo's actual client-state library here.]

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

## Best Practices

1. **Minimal global state**: Only store values that truly need to be shared
2. **Use selectors**: Avoid broad store subscriptions
3. **Keep server state in the server-state layer**
4. **Keep client state in the client-state layer**
