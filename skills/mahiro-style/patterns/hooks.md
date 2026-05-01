# Hooks

## Intent

This page owns hook shape, hook extraction, and the boundary between route or component orchestration and reusable behavior, query, or mutation logic.

Use it when the question is whether a hook should exist, what it should return, and whether a hook is carrying transport, state, or UI responsibilities in the right place.

For the full shared failure-flow doctrine, see `error-handling.md`.

## Detect

- Custom hook returns more than five unrelated values (queries, setters, handlers, formatted strings)
- Hook named `usePage` or `use[ScreenName]` that owns fetch, state, navigation, and formatting for one route only
- Simple two-line `useState` wrapped in a custom hook with no reuse or ownership benefit
- Hook imports service classes AND manages dialog/modal state AND performs navigation
- Reusable domain hook lives under a component folder even though the repo has a clearer hook-owned home
- Hook mixes fetch and mutation orchestration in one file even though the repo already separates `fetchers` and `mutations`
- Hook grows a local `getErrorMessage` or `resolveErrorText` helper even though the repo already has a shared resolver pattern
- Hook owns provider setup, query client creation, or store hydration because that was easier than finding the app shell owner
- Hook rebuilds endpoint strings, headers, payload mapping, or response mapping even though the repo has or should have a service boundary

## Hook Boundaries

Mahiro-style hooks package behavior, not confusion.

- A hook is a good home for reusable stateful behavior, query wiring, and event orchestration that multiple screens or components need.
- A fetcher hook can own server-state read orchestration: cache key shape, enabled conditions, request cancellation, query options, and the service method it calls.
- A mutation hook can own write orchestration: mutation function selection, optimistic or success invalidation, callbacks, and UI-facing mutation state.
- A hook is not an automatic home for every block of code that happens to use `useState` or `useEffect`.
- The hook boundary should make the caller simpler without hiding the real owner of transport, routing, or rendering.

## Current Reality vs Preferred Direction

- `Current Reality`: follow the repo's established hook homes, naming, split between fetchers and mutations, and section-order conventions.
- `Preferred Direction`: hooks should package reusable behavior and server-state orchestration while keeping transport contracts in services, app-wide state in stores/providers, and visible page composition in routes or components.
- `Not Established Yet`: a route-only `usePage`, `useScreen`, or `useEverything` hook is not earned just because the page feels long.
- `Adoption Triggers`: extract a hook when behavior repeats, query/mutation wiring becomes shared, a stateful interaction is reused across sections, or route/component readability improves without hiding ownership.

## Hook Ownership Modes

Use the hook shape that matches the responsibility:

1. **Fetcher hook** owns read-side server-state orchestration around a service or backend SDK call: query key, enabled conditions, cancellation, stale/refetch options, and surfaced query state.
2. **Mutation hook** owns write-side orchestration: mutation selection, success/error callbacks, invalidation/refetching, optimistic updates when the repo uses them, and caller-facing mutation actions.
3. **Interaction hook** owns reusable client behavior such as disclosure, keyboard shortcuts, drag/drop, viewport behavior, or multi-component selection when the behavior has a real reuse boundary.
4. **Adapter hook** owns framework or library glue that would otherwise leak repetitive setup into components, while keeping final rendering decisions with the render owner.

Keep route-only params, one-off redirects, one-off modal flags, and page-only formatting inline until reuse or ownership pressure appears. A hook should clarify ownership, not merely hide length.

## Boundary Handoffs

- Routes may call hooks for query, mutation, or reusable behavior, but routes still own the visible page outline when they are the page entry point.
- Services own REST endpoint strings, request construction, response mapping, and transport-level failure signals.
- Stores and providers own app-wide client state, persistence, SSR hydration, and runtime setup.
- Components own rendering, local presentational state, and final loading/empty/error fallback UI when that UI is specific to the component or section.

## Non-negotiable

- Create a hook only when it gives a clearer reusable boundary than leaving the logic inline.
- Keep hook outputs deliberate: expose the state and actions the caller actually needs.
- Keep hook internals readable when they grow, using the repo's accepted section-order pattern if the repo already uses one.
- Keep fetcher hooks read-focused and mutation hooks write-focused when the repo already separates those homes.
- Keep service calls inside hooks only as orchestration around an existing service or module-local backend SDK operation; do not rebuild transport details inside the hook.
- Do not move route-only orchestration into a hook just to make the route look shorter.
- Do not let hooks become a back door that mixes service transport design, provider placement, and shared UI ownership into one file.
- Do not hide recoverable query or mutation failures behind local hook-only message mappers when the repo already has a shared resolver and stable app-owned error codes or failure signals.
- Do not make hooks return raw query objects plus unrelated setters, navigation helpers, modal flags, and formatted display strings as one grab bag.

## Preference

- Prefer hooks that describe a domain behavior, such as `useApprovalFilters` or `useConsoleSidebar`, instead of vague utility names.
- Prefer calling services from hooks when the hook owns server-state wiring, cache invalidation, or mutation orchestration.
- Prefer returning named values and handlers over opaque arrays unless the local repo has a strong established pattern.
- Prefer keeping rich JSX decisions in components and keeping hooks focused on behavior, state, and orchestration.
- Prefer hook-owned folders such as a repo's `hooks/` area or a module-scoped hooks subtree instead of hiding reusable hooks under `components/`.
- Prefer leaving route-local filtering, selection, disclosure, and URL-state orchestration inline when the route is still the only real owner and no reuse boundary has emerged.
- Prefer separating query-fetch hooks from mutation hooks when the repo already distinguishes `fetchers` and `mutations` as different homes.
- Prefer fetcher hooks that hide repetitive query mechanics but still let callers understand what data is being requested.
- Prefer mutation hooks that expose domain actions and mutation state without owning the final screen copy or layout.
- Prefer letting hooks surface loading, empty, and error state in a way that keeps the caller's rendering decisions readable instead of hiding every branch inside the hook.
- Prefer hooks to expose stable error signals, query error state, or mutation error state, while the render owner decides the final fallback UI and translated copy.
- Prefer leaving tiny `useState`, `useMemo`, or `useEffect` blocks inline unless extraction creates reuse, isolates a real behavior, or makes ownership clearer.

## Contextual

- In a responsibility-first app, hooks can sit beside services and React Query wiring cleanly because transport still belongs to services and the hook owns consumption.
- In a multi-app repo, hooks can coordinate query-state helpers and shared packages without replacing service contracts.
- In a lighter app, many screens can stay simple without custom hooks until behavior actually repeats.
- Some route files will stay a little thick on purpose because the logic is still route-owned; that is healthier than inventing a hook boundary too early.
- A route can coordinate several hooks without surrendering page ownership. The hook should simplify a behavior or server-state operation; the route should still show how the screen is assembled.
- A component can keep local interaction state when the state has one owner. Promote it to a hook only when another section needs the same behavior or the behavior itself becomes the reusable unit.
- Follow local formatter, snippet, and import rules from the active repo. This page decides hook responsibility, not tool-specific syntax.

## Examples

- A domain hook owns query wiring around a service, then returns shaped state plus domain actions the screen needs.

```tsx
const useApprovalQueue = (filters: IApprovalFilters) => {
  const queueQuery = useQuery({
    queryKey: ['approval-queue', filters],
    queryFn: ({ signal }) => ApprovalService.listQueue(filters, { signal }),
  })

  return {
    query: queueQuery,
    items: queueQuery.data?.items ?? [],
    error: queueQuery.error,
  }
}
```

- A mutation hook owns invalidation and mutation state, but leaves confirmation UI and final copy to the component or render owner.

```tsx
const useApproveItem = () => {
  const queryClient = useQueryClient()

  const approveMutation = useMutation({
    mutationFn: ApprovalService.approve,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-queue'] }),
  })

  return {
    approve: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    approveError: approveMutation.error,
  }
}
```

- A local interaction hook owns disclosure state and keyboard behavior for a reusable screen section.

```tsx
const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { isOpen, setIsOpen, query, setQuery }
}
```

- A repo with split hook homes can keep fetch and mutation responsibilities separate even when both serve the same domain module.

```ts
// hooks/fetchers/use-employee-directory.ts
const useEmployeeDirectory = () => {
  return useQuery({
    queryKey: ['employee-directory'],
    queryFn: EmployeeService.listDirectory,
  })
}
```

```ts
// hooks/mutations/use-invite-employee.ts
const useInviteEmployee = () => {
  return useMutation({
    mutationFn: EmployeeService.invite,
  })
}
```

- A hook can surface a normalized error to the caller without deciding the final fallback message itself.

```ts
const useInviteEmployee = () => {
  const inviteMutation = useMutation({
    mutationFn: EmployeeService.invite,
  })

  return {
    invite: inviteMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
    inviteError: inviteMutation.error,
  }
}
```

```tsx
const InviteEmployeeButton = ({ email, role }: IInviteEmployeeInput) => {
  const { showErrorMessage } = useFetchError()
  const { invite, isInviting } = useInviteEmployee()

  const handleInvite = async () => {
    try {
      await invite({ email, role })
    } catch (error) {
      showErrorMessage(error)
    }
  }

  return <Button disabled={isInviting} onClick={handleInvite}>Invite</Button>
}
```

- A route keeps loader-like navigation decisions inline when they are unique to that route instead of creating a one-off hook with no reusable boundary.
- A fetcher hook owns query options and calls the domain service, while the route decides whether to render loading, empty, error, or data sections.
- A mutation hook owns invalidation and exposes `submit` plus `isSubmitting`, while the component owns the confirmation UI and final translated success or failure copy.

```tsx
const SettingsPage = () => {
  const { tab } = useParams()
  const navigate = useNavigate()

  if (!VALID_TABS.includes(tab)) {
    navigate('/settings/general', { replace: true })
    return null
  }

  return <SettingsLayout activeTab={tab} />
}
```

## Anti-Examples

- A `usePage` hook that quietly fetches data, opens dialogs, navigates, formats display strings, and shapes JSX copy for one route only.

```tsx
const useApprovalPage = () => {
  const router = useRouter()
  const { data } = useQuery({ queryKey: ['approvals'], queryFn: fetchApprovals })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const formattedTitle = `Approvals (${data?.length ?? 0})`

  const handleRowClick = (id: string) => {
    setSelectedId(id)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    router.push('/dashboard')
  }

  return { data, isModalOpen, selectedId, formattedTitle, handleRowClick, handleClose }
}
```

- A hook that returns raw service payloads plus unrelated setters because it became a dumping ground for screen state.

```tsx
const useEmployeeDashboard = () => {
  const employees = useQuery({ ... })
  const attendance = useQuery({ ... })
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [isExporting, setIsExporting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  return {
    employees: employees.data,
    attendance: attendance.data,
    searchTerm, setSearchTerm,
    sortBy, setSortBy,
    isExporting, setIsExporting,
    toastMessage, setToastMessage,
  }
}
```

- Moving a simple two-line `useState` block into a custom hook even though no reuse or clearer ownership appears.

```tsx
const useDisclosure = () => {
  const [isOpen, setIsOpen] = useState(false)
  return { isOpen, setIsOpen }
}
```

- Building a new `getInviteErrorMessage()` helper inside one hook even though the same failure is already resolved elsewhere through a shared error-code path.
- Hiding every loading, empty, and error branch inside a hook so the component can no longer see the real render contract.
- Treating this page as the owner of provider scope or global state policy. Those belong to `stores-state.md`.
- Treating hooks as the default solution for every long route instead of extracting sections, constants, services, or keeping route-owned orchestration visible.
- Creating a hook that initializes app-wide providers, query clients, persisted stores, or SSR hydration because a page needed those concerns first.
