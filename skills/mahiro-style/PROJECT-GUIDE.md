# Building a Project in Mahiro-style

This guide turns `/mahiro-style` doctrine into a practical project-building playbook.

Mahiro-style is not a fixed folder template. It is an ownership model: every file should have a clear owner, every abstraction should be earned, and local repo reality always wins before fallback preference.

## 1. Precedence Comes First

Before shaping a project, resolve rules in this order:

```text
┌────────────────────────────────────┐
│ 1. AGENTS.md / local rules          │  strongest
├────────────────────────────────────┤
│ 2. Other repo instruction files     │
├────────────────────────────────────┤
│ 3. Established repo patterns        │
├────────────────────────────────────┤
│ 4. Mahiro-style fallback doctrine   │  only when repo is silent
└────────────────────────────────────┘
```

Use these labels when describing a rule:

- `Current Reality` - proven by local docs, code, config, scripts, or repeated active patterns.
- `Preferred Direction` - Mahiro-style fallback for new work when local reality is silent or drifting.
- `Not Established Yet` - a layer or convention the repo has not earned.
- `Adoption Triggers` - concrete conditions that justify introducing the preferred shape later.

Do not phrase Mahiro preference as current repo fact unless the repo proves it.

## 2. App-local Source Shape

For a responsibility-first app, start from app-local ownership rather than a copied feature-folder template.

```text
src/
├── app/                  # routes, layouts, route groups, route handlers
├── components/           # app-owned UI and domain modules
├── hooks/                # fetchers, mutations, store hooks, utility hooks
├── services/             # API transport and domain service methods
├── stores/               # client state and hydration helpers
├── constants/            # app-wide constants, query keys, config
├── enums/                # shared string enums when useful
├── providers/            # app-wide runtime providers
├── types/                # shared API/domain contracts
├── utils/                # app-local pure helpers
├── i18n/                 # runtime i18n helpers/providers
├── locales/              # translation catalogs
├── styles/               # global styles/theme entry
└── libs/                 # configured clients such as axios or SDK instances
```

Not every project needs every folder. Add a folder when the ownership exists.

```text
Good:
- Create services/ when API transport exists.
- Create hooks/fetchers when read-side query orchestration exists.
- Create hooks/mutations when write-side orchestration exists.
- Create types/ when a contract is shared across owners.

Bad:
- Creating every folder from a template before the project has earned those owners.
- Inventing an ownership tree when the repo already proves app routes plus components/modules, hooks, services, and types.
```

## 3. React Router Framework Variation

Some frameworks use `app/` as the project source root. Treat that as route-root variation, not a different ownership model.

```text
app/
├── routes/               # route modules
├── components/           # app-owned UI and domain modules
├── hooks/                # fetchers, mutations, store hooks, utility hooks
├── services/             # API/backend SDK service methods when earned
├── stores/               # client state and hydration helpers
├── constants/            # app-wide constants and query keys
├── providers/            # app-wide runtime providers
└── types/                # shared API/domain contracts
```

Route-root examples:

```text
Next/App Router:
src/app/(auth)/orders/page.tsx

React Router Framework:
app/routes/orders.tsx
```

## 4. Route Files Are Visible Page Orchestrators

Routes are entry points. They should show how the screen is assembled without becoming a dump for every detail.

Routes may own:

- route params and search params
- URL state such as filters, tabs, and pagination
- route-local guards, redirects, and not-found decisions
- page-level loading, empty, and error shells
- visible composition of domain sections

Routes should not own:

- REST endpoint strings
- request headers and payload mapping
- global provider setup
- persisted store hydration
- huge config maps or mock data arrays
- full table/form implementation

```text
┌─────────────────────────────┐
│ route/page                  │
│ - params                    │
│ - URL state                 │
│ - guard                     │
│ - compose sections          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ components/modules/<domain> │
│ - table                     │
│ - form                      │
│ - section                   │
│ - dialog                    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ hooks/fetchers, mutations   │
│ - query key                 │
│ - query/mutation wiring     │
│ - invalidation              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ services/<domain>.ts        │
│ - endpoint                  │
│ - request shape             │
│ - response mapping          │
└─────────────────────────────┘
```

## 5. REST/API Transport Belongs in Services

For REST/API apps, API proxies, Axios/fetch clients, or RPC-over-HTTP endpoints, services are the preferred transport boundary.

```text
route/page/component
  -> hook/query/mutation
    -> DomainService.method()
      -> API client / BaseService / fetch / axios
```

Example:

```ts
interface IListOrdersInput {
  status: OrderStatus
  page: number
}

interface IListOrdersResponse {
  items: IOrder[]
  total: number
}

export class OrderService {
  static list(input: IListOrdersInput, config?: IRequestConfig) {
    return postJSON<IListOrdersResponse>('/order.list', input, config)
  }
}
```

Fetcher hook:

```ts
const useFetchOrders = (input: IListOrdersInput) => {
  return useQuery({
    queryKey: ['orders', input],
    queryFn: ({ signal }) => OrderService.list(input, { signal }),
  })
}
```

Avoid embedding transport in routes or presentational components:

```ts
fetch('/api/order.list', {
  method: 'POST',
  body: JSON.stringify({ status, page }),
})
```

## 6. Supabase-direct Is a Bounded Exception

When a repo uses Supabase client/RPC/table APIs as its backend SDK, module-local fetcher and mutation hooks may own the Supabase operation.

```text
route/page/component
  -> hooks/fetchers/use-fetch-people.ts
    -> Supabase client/RPC/table call
      -> local row type + mapper
```

Rules for this exception:

- routes and presentational components still should not call Supabase directly
- hooks own query keys, mappers, and invalidation while the operation is module-local
- repeated operations or growing mappers should be promoted to a service/repository boundary

## 7. Hooks Package Behavior, Not Length

Hooks should clarify reusable behavior or server-state orchestration. They should not hide a long route without creating a better owner.

Good hook shapes:

- `useFetchOrders`
- `useMutationOrder`
- `useDisclosure`
- `useKeyboardShortcut`
- `useFetchError`

Bad hook shapes:

- `usePage`
- `useEverything`
- `useOrdersScreen` when it owns fetch, modal state, navigation, formatting, and render decisions all at once

```text
┌────────────────┬────────────────────────────────────┐
│ Fetcher hook   │ query key, query options, read flow │
│ Mutation hook  │ mutation fn, invalidation, callbacks│
│ Interaction    │ reusable UI behavior               │
│ Adapter hook   │ framework/library glue             │
└────────────────┴────────────────────────────────────┘
```

## 8. Stores Own Client State, Not Backend Truth

Remote/backend data should stay in the server-state layer, not in a local store.

```text
Server-state:
- lists
- detail payloads
- loading/refetch/error state
- cache invalidation

Client store:
- theme
- language
- sidebar open state
- selected scope id
- auth-derived client state
- hydration flag
```

```text
┌─────────────────────────────┐
│ Backend truth               │
│ orders, users, projects     │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Server-state layer          │
│ React Query / loader cache  │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Client preference           │
│ theme, lang, selected id    │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Store                       │
│ Zustand/context/etc.        │
└─────────────────────────────┘
```

Persistence rules:

- do not persist full API responses
- do not persist access tokens, refresh tokens, or session secrets unless the repo explicitly proves that storage strategy is approved
- persist only explicitly safe preference or pointer fields such as theme, language, and active scope ids

## 9. Providers Own App Runtime

Providers are for ambient app runtime, not domain workflows.

Good provider jobs:

- query client
- i18n provider
- theme provider
- auth/session bootstrap
- popup/dialog/toast provider
- icon sprite or viewport runtime

Bad provider jobs:

- fetching project lists
- validating workflow state
- holding table rows
- owning route-specific redirects
- calling mutations

## 10. Components: Presentational and Domain-aware

Presentational components mostly explain structure, styling, and slots.

Domain-aware components may carry domain vocabulary, mapping, and screen-specific composition.

```tsx
interface IStatusBadgeProps {
  label: string
  tone: 'info' | 'warning' | 'success'
}

const StatusBadge = ({ label, tone }: IStatusBadgeProps) => {
  return <span data-tone={tone}>{label}</span>
}
```

Domain wrapper:

```tsx
const OrderStatusCell = ({ status }: { status: OrderStatus }) => {
  const { t } = useLingui()

  return (
    <StatusBadge
      label={t(getOrderStatusLabel(status))}
      tone={getOrderStatusTone(status)}
    />
  )
}
```

Shared primitives should not know business statuses directly.

## 11. Shared UI Must Stay Generic

```text
shared UI:
- Button
- Dialog
- Table
- StatusBadge
- Empty
- Pagination

domain wrappers:
- OrderStatusCell
- EmployeeInviteDialog
- ProjectBillingTable
- ApprovalQueueSection
```

```text
┌───────────────────────────┐
│ shared/UI primitive       │
│ generic, reusable         │
└─────────────┬─────────────┘
              │ wrapped by
              ▼
┌───────────────────────────┐
│ domain component          │
│ maps business meaning     │
└─────────────┬─────────────┘
              │ used by
              ▼
┌───────────────────────────┐
│ route/page/module         │
│ composes screen           │
└───────────────────────────┘
```

## 12. Type Placement Follows Ownership

Do not move every interface into `types/` by default.

```text
Implementation-local:
  stay in the implementation file

Owner-local:
  stay near the owner, such as a component/hook/service/module folder

Domain/shared:
  move to types/<domain>.ts after several owners use the same contract
```

Example:

```text
src/services/order.ts
  - IListOrdersInput can stay here while the service is the only owner

src/types/order.ts
  - IOrder
  - IListOrdersInput
  - IListOrdersResponse
  after service + hook + route + component share the API shape
```

When an API contract is promoted, keep related request, response, and record contracts together so the API shape is not split across owners without reason.

## 13. Constants and i18n

If extracted text must be translated, constants should hold descriptors, not runtime translations.

```ts
import { msg } from '@lingui/core/macro'

export const ERROR_MESSAGE_MAP = {
  inviteEmailTaken: msg`This email is already invited.`,
  networkUnavailable: msg`Network unavailable. Try again.`,
}
```

Render owner translates:

```tsx
const { t } = useLingui()

return <p>{t(ERROR_MESSAGE_MAP.inviteEmailTaken)}</p>
```

Avoid calling translation functions in static constants files.

## 14. Error Handling

Shared error flow should use stable signals and one resolver path.

```text
service / transport
  -> normalize failure into stable code
hook
  -> surfaces error state
render owner
  -> translates final message
```

```ts
enum ErrorCode {
  INVITE_EMAIL_TAKEN = 'invite-email-taken',
  UNKNOWN = 'unknown-error',
}
```

```ts
const ERROR_MESSAGE_MAP = {
  [ErrorCode.INVITE_EMAIL_TAKEN]: msg`This email is already invited.`,
  [ErrorCode.UNKNOWN]: msg`Something went wrong.`,
}
```

```ts
const getErrorMessage = (code: ErrorCode) => {
  return ERROR_MESSAGE_MAP[code] ?? ERROR_MESSAGE_MAP[ErrorCode.UNKNOWN]
}
```

## 15. Naming

Names should reveal domain, job, and scope.

Good:

```text
approval-queue-card.tsx
useApprovalFilters
ApprovalService
orders-table-section.tsx
project-billing-dialog.tsx
```

Bad:

```text
card.tsx
useData
api.ts
utils.ts
list.tsx
config.ts
```

Folder context can shorten filenames, but exported names should remain searchable.

```text
components/modules/profile/sidebar.tsx -> ProfileSidebar
components/modules/profile/avatar.tsx  -> ProfileAvatar
```

Avoid:

```text
sidebar.tsx -> Sidebar
avatar.tsx  -> Avatar
```

## 16. Mahiro-style Review Checklist

Ask these questions during implementation and review:

```text
1. Is there a local rule?
2. Does the repo already repeat a pattern?
3. Is this Mahiro fallback or current repo reality?
4. Does the route still read as a page outline?
5. Are service, hook, store, provider, and type owners clear?
6. Is shared UI still generic?
7. Is i18n extraction still translation-safe?
8. Does error handling use stable signals and a shared resolver?
9. Did UI depth increase because it earned a real job?
10. Did the refactor preserve product feel?
```

## 17. Final Architecture Picture

```text
┌──────────────────────────────────────────┐
│ App shell / root layout                  │
│ providers, i18n, theme, query client     │
└─────────────────────┬────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────┐
│ Route / page                             │
│ params, guards, URL state, composition   │
└─────────────────────┬────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────┐
│ Domain modules                           │
│ sections, tables, forms, dialogs         │
└──────────────┬───────────────┬───────────┘
               │               │
               ▼               ▼
┌──────────────────────┐   ┌──────────────────────┐
│ hooks/fetchers       │   │ hooks/mutations      │
│ query keys, reads    │   │ writes, invalidation │
└──────────────┬───────┘   └──────────────┬───────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────────────────┐
│ services / backend SDK boundary          │
│ endpoint, payload, mapper, failure signal│
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ stores                                   │
│ local client state, safe persistence     │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ constants / types / i18n                 │
│ shared contracts, descriptors, configs   │
└──────────────────────────────────────────┘
```

## 18. Short Summary

Writing a project in Mahiro-style means:

- start from ownership, not templates
- keep routes as readable page outlines
- use services for REST/API transport
- treat Supabase-direct as a bounded exception
- make hooks own behavior and orchestration, not hidden page complexity
- keep backend truth in server-state layers, not stores
- keep providers ambient and app-wide
- keep shared UI generic
- let domain modules carry business meaning
- place types, constants, i18n, and errors with their real owners
- let repo-local reality beat Mahiro fallback every time
