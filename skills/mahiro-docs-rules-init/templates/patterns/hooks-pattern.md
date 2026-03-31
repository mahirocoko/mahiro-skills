# Hooks Pattern

This page is blueprint-allowed. It can show the preferred hook shape for the repo family, but it must still say clearly when a dedicated hook layer is not established yet.

## Code Organization

Use clear section comments to organize hook code. This keeps hooks easier to read and maintain.

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
| `// _Memo` | `useMemo` for computed values |
| `// _Callback` | `useCallback` for memoized functions |
| `// _Form` | form schemas and form instances |
| `// _Event` | event handler functions |
| `// _Effect` | `useEffect` hooks |

### Example

```ts
[repo-faithful hook example]
```

## Query Hooks

Use the repo's actual query and mutation library here.

If the repo has no query layer yet, keep the hook blueprint modest and label it as future-facing guidance rather than current established architecture.

## `useMutation` Template

```ts
interface IUpdateProfilePayload {
  displayName: string
}

export const useMyMutation = () => {
  return useMutation({
    mutationFn: (payload: IUpdateProfilePayload) => MyService.method(payload),
  })
}
```

## `useQuery` Template

```ts
export const useFetchMyData = () => {
  return useQuery({
    queryKey: ['my-data'],
    queryFn: () => MyService.getData(),
  })
}
```

## Best Practices

1. **Keep hooks focused**: One clear responsibility per hook
2. **Return simple APIs**: Prefer small return surfaces
3. **Type everything**: Hook params and return shapes should stay explicit

## Preferred Direction

- Keep the hook examples close to the intended repo style, including section comments when they are part of the house pattern.
- Let small repos stay small, but do not erase useful hook blueprint just because the current repo is early.
- Separate "not established yet" from the preferred hook posture.
- Keep interface naming visible in hook payload and response examples when the repo family uses `I`-prefixed interfaces.
