# API and Data Fetching

## Current Reality

- where fetch logic lives today
- whether route loaders, hooks, services, or query libraries are used
- how mutations and errors are handled today
- whether data access is REST/API service based or direct SDK based

## Preferred Direction

- how new data access should be shaped

Use the repo's real ownership model first:

- Next App Router plus REST/API repos usually read best when route files stay thin and shared transport lives in services or service-like helpers.
- React Router Framework plus Supabase-direct repos usually read best when hooks or route modules own the calls and keep the data path local.
- Do not force services into a repo that already owns data in hooks or direct route modules.

## Not Established Yet

- call out missing service layers, cache rules, or shared API helpers honestly

Say plainly when a service layer is not established yet, or when the repo does not need one because direct SDK access already belongs to the hook or route owner.

## Working Rules

- where to place fetch logic
- when to introduce services
- how to separate server state, client state, and UI state
- when to keep direct Supabase or SDK calls inside hooks

Short rule of thumb:

- REST or API logic that repeats across owners should move toward a service layer.
- Supabase-direct or similar SDK calls can stay in hooks when the repo already treats them as owner-local data access.
