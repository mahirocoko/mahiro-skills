# Hooks Pattern

This page is blueprint-allowed. It can show the preferred hook shape for the repo family, but it must still say clearly when a dedicated hook layer is not established yet.

Hooks are a reusable behavior boundary first. Data-access hooks are only one common subclass.

## Code Organization

Use clear section comments to organize hook code when the file is long enough to need them. This is a shortcut, not a requirement for every hook.

If the target repo follows Mahiro-style section ordering, preserve it here even when the current codebase still has only a few hooks.

### Section Order

1. Imports
2. Hook function
3. Inside hook body (in order):
   - hooks initialization
   - section comments
   - return statement

### Section Comments

| Section | Purpose |
|---------|---------|
| `// _Ref` | `useRef` declarations |
| `// _State` | `useState` declarations |
| `// _Query` | TanStack Query or other query hooks |
| `// _Mutation` | TanStack Query or other mutation hooks |
| `// _Memo` | memoized derived values when memoization has a clear purpose |
| `// _Callback` | `useCallback` for memoized functions |
| `// _Form` | form schemas and form instances |
| `// _Event` | event handler functions |
| `// _Effect` | `useEffect` hooks |

Local evidence supports `_Memo` as the standard section label for derived values that need memoization. Do not invent new section labels for local shaping, mapping, route context, or transport context unless the target repo already uses them. Prefer plain derived values by default; use `useMemo` only when there is a clear reason such as a measurable performance win, stable value for memoized children, or effect-dependency control.

### Behavior-First Example

```ts
export const useDisclosure = (initialOpen = false) => {
  // _State
  const [isOpen, setIsOpen] = useState(initialOpen)

  // _Callback
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((value) => !value), [])

  return { isOpen, open, close, toggle }
}
```

Use a simple behavior hook like this when the repo is talking about reusable UI state, form behavior, DOM interactions, derived state, or route-adjacent behavior that does not need a transport layer.

## Common Hook Categories

- behavior hooks
- form hooks
- DOM/ref hooks
- derived-state hooks
- route-adjacent hooks
- data hooks, only when the repo really gives hooks ownership of transport or query orchestration

## Data Hooks

Use this section only when hooks own data access in the target repo.

### Query Hooks

Use the repo's actual query and mutation library here.

If the repo has no query layer yet, keep the hook blueprint modest and label it as future-facing guidance rather than current established architecture.

For React Router Framework plus Supabase-direct repos, hooks can own direct data access and the page should say that plainly. For Next App Router plus REST/API repos, hooks may wrap service calls, but route modules still own the route boundary.

Use the repo's actual backend client or helper in direct-SDK examples. Do not introduce a client helper name unless the target repo already has it.

## REST/API `useMutation` Template

```ts
interface IUpdateProfilePayload {
  displayName: string
}

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: (payload: IUpdateProfilePayload) => ProfileService.update(payload),
  })
}
```

Use this shape only when the repo has a service or service-like REST/API boundary.

## Supabase-Direct Mutation Template

```ts
interface IUpdateProfilePayload {
  displayName: string
}

export const useUpdateProfile = () => {
  const client = [repo Supabase client]

  return useMutation({
    mutationFn: async (payload: IUpdateProfilePayload) => {
      return client.from('profiles').update(payload)
    },
  })
}
```

Use this shape only when the repo already treats backend SDK calls as hook-owned data access.

## REST/API `useQuery` Template

```ts
export const useFetchProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => ProfileService.get(),
  })
}
```

## Supabase-Direct Query Template

```ts
export const useFetchProfile = () => {
  const client = [repo Supabase client]

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      return client.from('profiles').select('*').single()
    },
  })
}
```

## Best Practices

1. **Keep hooks focused**: One clear responsibility per hook
2. **Return simple APIs**: Prefer small return surfaces
3. **Type everything**: Hook params and return shapes should stay explicit
4. **Use section comments sparingly**: Add them when they make a long hook easier to scan, then stop when the hook becomes a split candidate
5. **Do not turn every hook into a data hook**: stateful UI behavior, DOM control, form flow, and derived logic are all valid hook owners too

## Preferred Direction

- Keep the hook examples close to the intended repo style, including section comments when they are part of the house pattern.
- Let small repos stay small, but do not erase useful hook blueprint just because the current repo is early.
- Separate "not established yet" from the preferred hook posture.
- Treat hooks as reusable behavior boundaries first, then add transport/query ownership only where the repo proves it.
- Keep direct SDK or Supabase access in the hook when that is the repo's real pattern.
- Do not imply services are required in hook-owned data repos.
