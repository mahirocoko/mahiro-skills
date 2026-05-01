# Stores and State

## Intent

This page owns client state placement, store scope, server-state versus client-state separation, and provider scope as a state ownership concern.

Use it when the question is whether state belongs in component state, a store, a query cache, or a provider, and how wide that state scope should be.

## Detect

- Store combines auth state, modal flags, domain filters, and mutation handlers in one object
- Query result data is copied into a Zustand store instead of staying in the query cache
- Global provider wraps the entire app for state only used in one route subtree
- Component uses `useAppStore` for a concern that only affects one screen or module
- Component subscribes to the whole store object when a narrow selector would keep rerenders and ownership clearer

## State Placement and Provider Scope

State should live at the smallest scope that still matches its lifetime and sharing needs.

Mahiro's preferred REST/API app shape keeps remote/server state in TanStack Query or the repo's equivalent server-state layer, long-lived client state in app-local stores, and SSR-to-client hydration in the root layout plus provider runtime for cookies, locale, auth, theme, and query setup.

## Current Reality vs Preferred Direction

- `Current Reality`: follow the repo's established state stack, whether it uses TanStack Query, loaders, Zustand, context providers, or another local pattern.
- `Preferred Direction`: keep server or backend-owned data in the repo's server-state layer and keep client stores for local preferences, auth-derived client state, UI state, and cross-component selections.
- `Not Established Yet`: do not add a global store just because state feels inconvenient in one route.
- `Adoption Triggers`: introduce or widen a store when state survives route changes, is shared by multiple distant owners, needs explicit persistence, or represents a long-lived client preference rather than remote records.

## Non-negotiable

- Keep server state in the repo's server-state layer, such as a query cache, instead of duplicating it into client stores by default.
- If the repo's server-state layer is not TanStack Query, preserve the local equivalent. The doctrine is ownership, not one library.
- Use stores for client state that truly needs cross-screen, cross-layout, SSR cookie hydration, persistence, or long-lived sharing.
- Keep provider scope aligned with the lifetime of the state or context it owns. Root providers are for app runtime concerns, not arbitrary module convenience.
- Do not let a store become a dumping ground for unrelated UI flags, domain data, transport helpers, and side effects.
- Keep provider and state-scope rules here, not in `services.md`.
- Keep providers ambient. Auth session bootstrapping, query clients, theme, and i18n are good provider jobs. Domain collections, remote records, and workflow validation should stay in query-backed hooks or services.
- Do not put API calls, mutation orchestration, router redirects, toast copy, or backend payload shaping inside generic stores. Those belong in services, fetcher hooks, mutation hooks, route gates, or render owners.
- Persist only explicit preference/session fields. Never persist query results, full remote entities, or action functions.

## State Ownership Modes

Use the smallest owner that matches the state lifetime:

1. **Component state** owns single-screen UI details: modal open flags, hover state, dirty flags, local form readiness, temporary selections.
2. **URL state** owns shareable filters, tabs, pagination, and view state that should survive reloads or links. `nuqs`-style query state fits this better than a global store.
3. **Server-state layer** owns backend records, lists, detail payloads, loading state, refetching, request cancellation, cache invalidation, and query rendering helpers.
4. **Module store** owns cross-component client state inside one route or domain subtree when props/context would become noisy but app-wide scope is still too wide.
5. **App store** owns long-lived client concerns shared by the shell: auth token/session-derived state, settings such as language, theme, selected workspace/scope ids, sidebar shell state, and explicit persisted preferences.
6. **Provider/runtime context** owns ambient app setup: query client, SSR hydration, i18n catalog/locale, theme bridge, dialog/toast/popup providers, viewport/runtime helpers, and icon sprites.

If a value represents backend truth, it should almost always be in mode 3. If a value represents a user's local preference or selected pointer to backend truth, it may belong in mode 5.

## SSR Hydration and Provider Runtime

For REST/API apps with server-rendered roots, prefer this hydration bridge:

- Server root layout reads cookies and route params, resolves locale/theme/auth/session hints, and passes a serialized minimal payload into a client provider.
- Client app provider initializes only long-lived client stores from that payload before rendering app children.
- Query client creation belongs in the provider/runtime layer: fresh on the server, singleton in the browser, then exposed through `QueryClientProvider`.
- Auth disappearance should clear the server-state cache intentionally, because cached remote data may no longer belong to the current session.
- Theme and language can be store-backed when they must affect both SSR markup and client runtime. Their SSR readers must mirror the store persistence format.
- Client-only infrastructure such as popup/dialog/toast, progress bars, viewport helpers, or generated icon sprites can mount in the provider when it is truly app-wide.

This keeps the root layout and app provider as the hydration seam, not a place for domain fetching or workflow logic.

## Preference

- Prefer local component state for short-lived UI toggles, form openness, hover state, and other single-owner concerns.
- Prefer module-scoped stores before app-wide stores when the state is only shared inside one domain area.
- Prefer root-level providers only for app-wide concerns such as query clients, theming, auth session bootstrapping, or global shell state.
- Prefer explicit persistence decisions instead of automatically persisting every store field.
- Prefer stores for lightweight client selectors such as active-scope choice, sidebar openness, or the current portal mode, while remote entity records stay in the server-state layer.
- Prefer selector-based store reads so components subscribe only to the fields they actually need.
- Prefer `partialize`-style persistence when available: persist only explicitly safe preference or pointer fields such as theme, language, and active scope ids. Do not persist access tokens, refresh tokens, full session secrets, derived flags, actions, fetched records, or transient UI.
- Prefer store SSR helpers beside the store when persisted data must be reconstructed on the server. The SSR reader and client persistence format should change together.

## Contextual

- A responsibility-first app makes the server-state versus client-state split very visible: fetcher/mutation hooks plus a query cache for remote data, lightweight client stores for auth/settings/theme, and providers near the app shell for app-wide concerns.
- The same split still applies in a smaller app before the module surface grows large.
- A multi-app repo reinforces the same boundary, where shared query helpers can exist but app-level state still needs clear ownership.
- Local persistence middleware, provider APIs, and package wrappers belong to the repo. This page decides scope and lifetime, not library syntax.
- A repo with persisted workspace or setting preferences should persist only the preference keys, not the remote entities those keys point to.
- App-local duplication of auth/settings stores or providers can be the right current reality when product apps differ. Extract only when the shared boundary is domain-neutral and stable.

## Examples

- Auth-derived client state and hydration flags can live in a store because they are long-lived client concerns shared across the app shell. Whether raw access or refresh tokens may live there is repo-security-policy dependent; they should not be persisted unless the repo explicitly proves that storage strategy is approved.

```ts
interface IAuthState {
  accessToken: string | null
  isHydrated: boolean
  setAccessToken: (accessToken: string | null) => void
  clear: () => void
}

export const useAuthStore = create<IAuthState>((set) => ({
  accessToken: null,
  isHydrated: false,
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null }),
}))
```

- A sign-out helper can clear client auth state and server-state cache together without making the auth store own query internals.

```ts
const useSignOut = () => {
  const queryClient = useQueryClient()
  const clearAuth = useAuthStore((state) => state.clear)

  return () => {
    clearAuth()
    queryClient.clear()
  }
}
```

- Query data for an approval list stays in the server-state layer, while a local filter panel open state stays in the screen component or a small module store.
- A project list stays in React Query; the selected project slug or workspace id can be URL state or a persisted lightweight store field.
- A provider lives in `root` or an app shell only when multiple routes need the context, otherwise the provider stays close to the owning module.
- A module-scoped store can own a route subtree concern, but it should not automatically become the app-wide home for unrelated UI and transport state.
- A scope switcher can persist only the selected scope id in a store, while the actual remote records still come from the query layer.
- A component can read `isSidebarOpen` through a selector instead of subscribing to the whole layout store.

```ts
const isSidebarOpen = useLayoutStore((state) => state.isSidebarOpen)
```

## Anti-Examples

- Copying every query result into Zustand just because another screen might need it later.
- Creating one `useAppStore` that owns auth state, modal state, table filters, mutations, and navigation helpers for unrelated domains.

```ts
export const useAppStore = create((set) => ({
  accessToken: '',
  approvalFilters: {},
  isCreateModalOpen: false,
  hoveredCardId: '',
  submitApproval: async () => {},
  resetEverything: () => set({}),
}))
```

- Mounting a global provider for a module concern that is only used by one route subtree.
- Treating stores as the right answer for any state that feels inconvenient in a component.
- Using a provider or Zustand store as the source of truth for remote domain records that already belong in the backend plus a query cache.
- Reading the full store object in every consumer when a selector would keep the subscription narrower and the state dependency more explicit.
- Persisting whole API responses, table rows, profile objects, or list caches in cookies/local storage because they are useful after refresh.
- Hiding service calls inside store actions so UI code can call `useAppStore().fetchProjects()` instead of going through fetcher/mutation hooks.
- Using the root app provider as a hidden domain orchestrator for domain fetches, route-specific redirects, or form workflow state.
