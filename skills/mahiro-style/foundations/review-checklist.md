# Review Checklist

## Intent

Use this page as a practical review lens for AI-written code and refactors.

Its job is to catch two kinds of drift on a diff:

- repo-rule drift: the change ignores local doctrine or stable repo patterns
- Mahiro-shape drift: the change technically works but becomes thicker, vaguer, or less deliberate than the repo needs

Review this page against the actual diff. Do not treat it as a philosophy summary.

## Review Order

Always review in this winner order before making style judgments:

1. `AGENTS.md`
2. Other repo-local instruction files such as `CLAUDE.md`
3. Established repo patterns
4. Mahiro fallback doctrine

If a diff feels wrong, first identify which layer it violates. Do not jump straight to Mahiro taste when the repo already decided the rule.

## Non-negotiable

- Check the diff against the exact four-level precedence order: `AGENTS.md` -> other repo-local instruction files -> established repo patterns -> Mahiro fallback doctrine.
- Reject reviews that treat Mahiro fallback doctrine as stronger than explicit local doctrine or repeated repo shape.
- Flag route or screen files that grow into mixed ownership modules containing orchestration, domain contracts, config, helper maps, mock data, and rendering in one place.
- Flag extracted constants or config if the move weakens translation posture, especially in repos that already use Lingui or another explicit i18n flow.
- Flag naming that hides domain meaning behind vague buckets such as `data`, `items`, `list`, `meta`, or `config` when the business concept can be named directly.
- Flag nested feature exports that become too generic for code search, such as `Sidebar` or `Avatar` from `profile/sidebar.tsx` or `profile/avatar.tsx`.
- Flag shared UI changes that absorb page-specific business rules just to reduce line count in a route or feature file.
- Flag UI trees that get deeper without earning a real semantic, layout, accessibility, state, or ownership boundary.
- Flag refactors that preserve logic but noticeably drift from the established product feel of a screen, such as turning a sparse premium surface into a verbose instructional one.
- Flag spacing overrides on shared primitives when they appear reflexive rather than driven by a clear visual requirement.
- Flag local one-off error message mappers when the repo already has a shared error resolver or stable error-code path.
- Flag raw upstream error strings shown directly in UI when the repo already normalizes shared failures.

## Preference

- Start review comments with the winning rule source: local doc, repeated repo pattern, or Mahiro fallback.
- Prefer comments that name the ownership problem directly, such as route thickness, naming drift, contract leakage, or i18n-boundary breakage.
- Prefer refactors that make the next edit location more obvious, not just files that are smaller.
- Prefer domain-owned constants, services, hooks, and components over convenience extractions into generic shared buckets.
- Prefer review comments that ask whether a new hook earned a reusable or shared boundary, instead of assuming extraction is a win because the route got shorter.
- Prefer owner-local data when the extracted constants or compose props do not buy meaningful reuse or clarity.
- Prefer review comments that compare the diff against repeated repo examples instead of isolated one-off files.
- Prefer shallow, explicit UI structure with locally owned styling over wrapper-on-wrapper trees, wrapper components that do not earn a real boundary, and fragile descendant styling.
- Prefer comments that ask whether new UI copy genuinely helps the user act, or merely explains internal implementation that should stay in docs.
- Prefer review comments that ask where a recoverable failure is normalized, surfaced, and finally translated instead of treating all error handling as one concern.

## Contextual

Apply the same review order everywhere, but let the local repo decide the winning shape.

### Repo-rule drift prompts

- What does `AGENTS.md` say about this exact concern?
- If `AGENTS.md` is silent, do other repo-local instruction files narrow the choice?
- If local docs are partial, does the active codebase repeat one stable pattern three or more times?
- Is this diff following a migration leftover or an actually repeated current pattern?
- Am I about to request a Mahiro-style cleanup before proving that the repo has not already chosen a different rule?

### Mahiro-shape drift prompts

- Did the route or screen get thinner and more orchestration-focused after the refactor, or did it just move code around?
- Did a new hook earn a real reusable or shared boundary, or did route-local orchestration just move into `hooks/` to reduce line count?
- Did the change separate ownership cleanly between routes, components, hooks, services, stores, and constants?
- Did naming become more domain-specific and contract-aware, or more generic?
- Did owner-local filenames keep exported component names contextual enough for code search, such as `ProfileSidebar` from `profile/sidebar.tsx`?
- If contracts or config moved, do they now live in a clearer domain home?
- Did the diff extract constants or child props only to reduce line count, even though the child component was still the natural owner?
- If copy moved into constants, is the result still aligned with the repo's Lingui or translation posture?
- If the diff adds error handling, is the failure shape shared at the right owner layer, or is each hook and component inventing its own fallback text?
- If the diff adds a repeated shared failure flow, did the implementation follow `patterns/error-handling.md` as the canonical owner?
- Did reusable UI stay generic, or did business logic leak into shared components?
- Are long props still expressing one clear component contract, or are scattered parent internals leaking through the boundary?
- Did the refactor add HTML wrapper layers or wrapper components that only mirror visual grouping, even though the same UI could stay readable with fewer layers?
- Does each UI layer have a visible job, or is the depth just hiding weak component boundaries?
- Did the change preserve the screen's established product feel, or did technically correct logic come with heavier copy, denser spacing, or a less intentional tone?
- Did shared primitives keep their default spacing where appropriate, or did the diff add overrides before proving a visual need?

### Real review themes to keep active

- Route thickness: route files should orchestrate, not become giant domain dumps.
- Hook extraction discipline: route-local state can stay in the route until a real reusable boundary appears.
- Lingui and constants posture: extraction is only a win if translation-safe behavior stays intact.
- Error ownership: transport normalization, shared resolvers, and render-time fallback copy should not collapse into one local helper.
- Naming and contracts: names should reveal business meaning, and contracts should live with clear owners.
- Repo-local doctrine first: check local rules before asking for fallback Mahiro cleanup.
- Owner-local versus shared extraction: if a layout child or feature child is the only consumer, prefer keeping the data and translation close to that owner.
- UI structure restraint: extra wrappers need a reason; do not approve anonymous nesting or wrapper components that do not earn a real boundary.
- Product-feel preservation: if the screen used to feel spare, premium, or direct, refactors should not make it louder or more instructional by accident.

## Examples

- "`AGENTS.md` says routes stay thin, but this diff moves view config, route metadata, and rendering back into the route entry file. Keep orchestration in the route and move owned data back to a domain file." 
- "The repo already repeats `useLingui` and render-boundary translation. This constants extraction introduces plain string blobs without preserving that posture. Keep the extraction, but preserve the repo's i18n boundary." 
- "`UserList` and `employeeRows` are clearer than `data` and `items` here because the diff is shaping domain contracts, not generic collections." 
- "This shared component now knows page-specific approval rules. Keep the reusable shell generic and move the approval logic back to the feature-owned layer." 
- "No local doc covers this exact hook split, but the repo repeatedly keeps query hooks near feature services. Review against that repeated pattern before applying Mahiro fallback taste." 
- "This refactor added three wrapper layers, but none of them own layout, semantics, state, or a real boundary. Keep the UI flatter and let the real section or row own the structure directly." 
- "The filename `profile/sidebar.tsx` is fine, but the export should still carry folder context. Prefer `ProfileSidebar` over `Sidebar` so the component stays searchable outside this folder." 
- "The route got shorter, but the new hook still owns one-off selection, disclosure, and URL-state logic for a single route. Keep that orchestration inline until a reusable boundary actually appears." 
- "The prop list is long, but it still reads as one clear component contract. That is acceptable here; the real issue to watch is leaking parent internals, not prop count by itself." 
- "This diff adds `getInviteErrorMessage()` inside one hook, but the repo already repeats a shared resolver and stable error codes for this failure family. Keep normalization shared and let the render owner translate the final message."

## Anti-Examples

- "Mahiro usually prefers this" without first checking `AGENTS.md`, other local docs, or repeated repo patterns.
- Approving a refactor because the biggest file got shorter even though ownership became more confusing.
- Praising constants extraction while ignoring that the diff broke Lingui-safe or translation-safe flow.
- Asking for generic reuse when the extracted component now carries route-specific business rules.
- Praising a hook extraction just because the route file got shorter, without proving that a reusable or shared hook boundary now exists.
- Accepting vague names such as `config`, `items`, or `data` when the domain contract is already known.
- Treating anti-pattern guidance as a separate source to go read later instead of catching the drift directly in this review.
- Treating long props as an automatic smell without checking whether they still express one clear component contract.
- Approving deeper UI trees just because the JSX was split up, even though the extra wrappers do not add a real responsibility.
- Approving a diff that surfaces raw backend error text directly in UI even though the repo already uses a shared error normalization path.
