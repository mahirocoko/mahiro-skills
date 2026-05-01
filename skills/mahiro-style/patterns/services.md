# Services

## Intent

This page owns service layer intent, transport boundaries, API contracts, and where data-fetching mechanics belong.

Use it when the question is where API transport should live, where mapping should happen, and how route, hook, and service responsibilities should stay separate.

For the full shared failure-flow doctrine, see `error-handling.md`.

## Detect

- Route or component file contains inline `fetch` calls with endpoint strings
- Component builds request headers, query params, or POST bodies directly
- Service module manages Zustand state, dialog visibility, or router navigation alongside transport
- Multiple files duplicate the same endpoint URL or request-building logic
- Service method returns an untyped payload even though the repo already types request and response contracts
- Caller builds one-off user-facing error strings from raw transport failures because the service layer never normalized the shared failure shape

## Service Responsibilities

For REST/API apps, services are the preferred transport boundary. They are the home for endpoint calls, request shaping, response mapping decisions, and shared transport mechanics. Hooks, queries, route loaders, and mutations orchestrate services; they should not rebuild endpoint details themselves.

## Current Reality vs Preferred Direction

Service guidance is contextual, but the Mahiro default is clear: REST/API transport should be service-owned.

- `Current Reality`: if the repo already has service classes or service modules, preserve that boundary and improve its typing, method names, mapping, and failure signals.
- `Preferred Direction`: for REST/API apps, use service-owned transport by default. Hooks own query/mutation orchestration, cache keys, loading/error state, and invalidation; services own request construction, endpoint naming, API client calls, response mapping, and transport-level failure signals.
- `Supabase-direct Exception`: if the repo calls Supabase client/RPC/table APIs directly as its backend SDK, module fetcher/mutation hooks may own the Supabase call, query key, local row type, mapper, and invalidation while the operation remains module-local.
- `Not Established Yet`: a Supabase-direct repo with one-off module-local RPC calls has not necessarily earned `app/services/` or repository classes.
- `Adoption Triggers`: introduce or promote a service/repository boundary when REST/API endpoints exist, endpoint construction repeats, auth/header logic repeats, response mapping is reused, failure normalization is shared, or multiple hooks/routes need the same domain operation.

## Transport Ownership Modes

### REST/API Service-Owned Default

Use this for typical backend APIs, API proxies, Axios/fetch clients, `BaseService` patterns, or app-owned HTTP clients.

```text
route/page/component
  -> hook/query/mutation
    -> DomainService.method()
      -> API client / BaseService / fetch / axios
```

In this mode:

- services own endpoint paths, request payload shaping, response mapping, and transport failure signals
- hooks own cache keys, query/mutation state, invalidation, and UI-facing orchestration
- routes and components own composition/rendering, never endpoint details

### Supabase-Direct Exception

Use this when Supabase is acting as the repo's backend SDK rather than a generic REST transport.

```text
route/page/component
  -> fetcher/mutation hook
    -> Supabase client/RPC/table call
      -> local row type + mapper
```

This exception is still bounded: routes and presentational components should not call Supabase directly. Promote to a service/repository when the same operation repeats, mapping grows, or several hooks need the same domain operation.

## Non-negotiable

- Keep API transport out of route files and presentational components.
- For REST/API apps, put request building, endpoint intent, and response-shaping logic behind a service boundary.
- For Supabase-direct apps, keep Supabase calls inside fetcher/mutation hooks only while they remain module-local; promote repeated domain operations to a service/repository.
- Reuse the repo's existing service base pattern when one exists, instead of inventing a new fetch style next to it.
- Keep service APIs explicit enough that callers know the domain action they are invoking.
- Keep service request and response surfaces typed enough that callers can read the contract without opening the transport helper.
- Keep one-owner service request and response interfaces near the service; promote them to the repo's domain type owner only when several owners import the same contract.
- Keep hooks focused on orchestration around services: query keys, enabled conditions, cache invalidation, loading/error state, and UI-facing composition.
- Normalize shared transport failures close to the service boundary when the repo already uses stable app-owned error codes or failure signals plus a shared resolver.
- Do not let services own user-facing fallback copy or render-time translation. Services can emit stable error signals; UI owners choose the final wording.
- Do not use this page to decide provider scope or global client state ownership. Those belong to `stores-state.md`.

## Preference

- Prefer domain-named service modules and methods that read like product actions, such as `ApprovalService.listQueue` or `GoalService.getSummary`.
- Prefer keeping data mapping close to the service when the mapping is tied to the transport contract.
- Prefer hooks, queries, mutations, or route loaders to consume services rather than rebuild endpoint details inline.
- Prefer concise method-level documentation when the local repo already expects it for service clarity.
- Prefer static class methods or equally explicit module exports when the local repo already uses them to make service intent easy to scan.
- Prefer stable app-owned error codes or failure signals over leaking raw upstream messages into every caller.
- Prefer typed service methods with domain language over generic `getData`, `submit`, `request`, or `callApi` wrappers.
- Prefer service payload names that include the domain operation, such as `IListInvoicesInput` or `IInviteEmployeeResponse`, instead of generic `IRequest`, `IParams`, or `IResponse`.
- Prefer domain `types/` contracts only after the same API shape becomes shared by services, hooks, routes, and render owners.

## Contextual

- A REST/API app should normally use services even when the app is small, because service boundaries prevent endpoint details from leaking into hooks, routes, and components.
- A Supabase-direct app can keep transport row types, query key helpers, mappers, and invalidation near `hooks/fetchers` and `hooks/mutations` until the operation repeats or the mapper becomes a domain contract.
- A repo with an established `BaseService`, API proxy, Axios client, or fetch wrapper should route new domain API work through that existing transport path.
- Local HTTP clients, JSDoc rules, and exact method style belong to the repo. This page decides who owns transport and mapping.
- Local type placement belongs to `code-style.md` and `project-structure.md`; this page only decides whether service contracts are typed and where transport-facing contracts stop.

## Examples

- A service method wraps the approval queue endpoint and returns shaped data, while a hook or route uses React Query around that method.

```ts
interface IApprovalQueueInput {
  status: 'pending' | 'approved'
  page: number
}

interface IApprovalQueueResponse {
  items: IApprovalQueueItem[]
  total: number
}

export class ApprovalService {
  static listQueue(input: IApprovalQueueInput, config?: IRequestConfig) {
    return postJSON<IApprovalQueueResponse>('/approval.listQueue', input, config)
  }
}
```

- A typed request and response contract keeps transport details explicit without leaking them into the caller. It can stay beside the service while it has one owner.

```ts
interface IInviteEmployeeInput {
  email: string
  role: 'manager' | 'employee'
}

interface IInviteEmployeeResponse {
  inviteId: string
}

export class EmployeeService {
  static invite(input: IInviteEmployeeInput) {
    return postJSON<IInviteEmployeeResponse>('/employee.invite', input)
  }
}
```

- A service can map raw transport failures into a stable app-owned code without deciding the final user-facing copy.

```ts
enum ErrorCode {
  INVITE_EMAIL_TAKEN = 'invite-email-taken',
  NETWORK_UNAVAILABLE = 'network-unavailable',
  UNKNOWN = 'unknown-error',
}

interface IInviteEmployeeFailure {
  code: ErrorCode
  detail?: string
}

export class EmployeeService {
  static async invite(input: IInviteEmployeeInput) {
    try {
      return await postJSON<IInviteEmployeeResponse>('/employee.invite', input)
    } catch (error) {
      throw normalizeInviteEmployeeFailure(error) satisfies IInviteEmployeeFailure
    }
  }
}
```

- A query or route loader consumes the domain service instead of rebuilding transport details inline.

```tsx
const approvalQueueQuery = useQuery({
  queryKey: ['approval-queue', status, page],
  queryFn: ({ signal }) => ApprovalService.listQueue({ status, page }, { signal }),
})
```

- A shared base service handles auth headers or common error handling once, while domain services expose business-intent methods.
- A route or hook imports a service method by domain name instead of embedding `fetch` calls and endpoint strings inline.
- When service request and response contracts are part of the domain API surface, move the whole related contract set to the repo's domain type owner instead of splitting one record into `types/` while keeping wrapper payloads beside the service.

```ts
// services/invoice-service.ts
import type { IListInvoicesInput, IListInvoicesResponse } from '@/types/invoice'

export class InvoiceService {
  static list(input: IListInvoicesInput, config?: IRequestConfig) {
    return postJSON<IListInvoicesResponse>('/invoice.list', input, config)
  }
}
```

```ts
// types/invoice.ts
export interface IInvoice {
  id: string
  status: InvoiceStatus
  total: number
}

export interface IListInvoicesInput {
  status: InvoiceStatus
  page: number
}

export interface IListInvoicesResponse {
  items: IInvoice[]
  total: number
}
```

The request, response, and record move together once they describe a shared domain API contract. Keep a payload beside the service only while the service is truly the only owner.

- A Supabase-direct repo can expose `useFetchCompanyPeople`, local RPC row types, and query-key helpers from a fetcher module without adding `CompanyService` yet; the key is that Supabase calls are still out of routes and presentational components.

## Anti-Examples

- A route file that opens `fetch('/api/approval.listQueue')` inline because the service layer felt like extra work.

```tsx
const approvalQueueQuery = useQuery({
  queryKey: ['approval-queue'],
  queryFn: async () => {
    const response = await fetch('/api/approval.listQueue', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    return response.json()
  },
})
```

- A presentational component that imports a service class and performs its own network request.
- A service module that also owns Zustand state, router redirects, and dialog visibility.
- A query hook that rebuilds REST endpoint URLs, headers, request bodies, and response mapping even though a service boundary exists or should exist.
- Returning untyped blobs from a service when the repo already values explicit contracts for payloads and responses.
- Exporting generic service payload names such as `IParams` or `IResponse` from multiple service files, making imports ambiguous.
- Moving a service-only payload into app-wide `types/` before another owner imports it.
- Letting every hook or component invent its own copy for the same transport failure because the service layer never exposed a shared failure shape.
- Treating service naming as the whole problem while ignoring whether transport logic actually leaked into callers.
- Adding `app/services/` to a Supabase-direct repo before any adoption trigger exists, then duplicating the mapping and invalidation logic that hooks already owned cleanly.
