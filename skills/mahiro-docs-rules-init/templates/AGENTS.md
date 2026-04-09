# [Repo Name]

Short identity line for this repo.

## Purpose

- What this repo is for
- Primary app or product surface
- High-level goal of the codebase today

If the repo is still early, say what it currently is, not what it may become later.

## Stack Snapshot

- Package manager: `[pnpm/npm/bun/yarn]`
- Framework or runtime: `[React Router / Next.js / Remix / Vite React / etc.]`
- Language: `[TypeScript / JavaScript]`
- Styling: `[Tailwind / CSS Modules / plain CSS / etc.]`
- Data or state: `[TanStack Query / Zustand / Context / etc.]`
- i18n: `[Lingui / react-i18next / none / etc.]`

Only include tools that the repo actually uses today.

If a major capability is absent, say `none` instead of silently implying a default stack.

## Commands At A Glance

- Install: `[verified command]`
- Dev: `[verified command]`
- Build: `[verified command if available]`
- Test: `[verified command if available]`
- Lint: `[verified command if available]`
- Typecheck: `[verified command if available]`

If a command does not exist, say so plainly instead of guessing the conventional one.

Prefer the command shape contributors should actually run in this repo today.

## Core Directories

### Current Reality

- List only directories that actually exist and matter.
- For each one, say what belongs there in one line.
- Keep this section concrete. Prefer `src/routes - route entry files and page wiring` over vague labels like `source code`.
- Prefer app and product-facing directories first. Mention local tooling directories only if contributors genuinely need to know them to work safely.

### Not Established Yet

- Call out important layers that do not exist yet but may appear later.
- Only include layers that are likely enough to matter soon.

### If Introduced Later

- Describe the preferred future shape without pretending it already exists.
- Keep this short. AGENTS should guide future change, not read like an architecture proposal.

## Working Rules

### Current Reality

- Follow local repo patterns before introducing new abstractions.
- Keep new work consistent with the strongest repeated local shape, not isolated files.
- Prefer owner-local code until repetition proves a shared layer is needed.
- If the repo is inconsistent, anchor to the most trustworthy repeated pattern and soften the rest.

### Preferred Direction

- Capture the direction new work should follow, even if the codebase is still uneven.
- Write this as a near-term coding posture, not a broad team aspiration.

### Adoption Triggers

- Note when to introduce new layers such as services, shared UI, or shared state.
- Triggers should be observable, such as repeated logic across owners, not subjective taste.

## How To Change This Repo Safely

- Match the existing file and export posture before introducing a new pattern.
- Keep route or screen files thin if the repo already separates feature logic.
- Extract shared code only after repeated usage across multiple owners and a clearly domain-neutral boundary.
- Keep constants, placeholder data, and copy with the owner when they are used in one place.
- When confidence is low, choose the simpler local pattern and document uncertainty.

This section should read like practical review guidance. Every bullet should help answer "what should I do when editing this repo?"

## Naming and Structure

### Current Reality

- file naming posture
- export naming posture
- route vs screen vs component boundaries
- owner-local constants, hooks, or services posture

### Preferred Direction

- folder context can shorten filenames
- exports should keep enough domain signal
- single-owner data should stay with the owner by default
- names should stay specific enough to be searchable outside their folder

### When To Adopt

- describe when to extract constants, split files, or create shared abstractions
- Prefer concrete thresholds like "after the second or third owner" rather than "when it feels reusable".

## Change Heuristics

- **Add a new file** when one file starts mixing multiple responsibilities.
- **Extract a shared component or hook** when the same pattern appears across multiple real owners and the boundary is clearly generic.
- **Keep code local** when reuse is still speculative.
- **Document preferred future shape** only when there is already a visible migration direction.

Avoid filler heuristics. If a heuristic is too generic to guide a review, rewrite or remove it.

## Docs Map

- `docs/onboarding.md` - setup and first-run flow
- `docs/project-overview.md` - stack and runtime shape
- `docs/file-organization.md` - where code should live

Add only the docs pages that this repo actually has after generation.

If a page is intentionally skipped because the repo lacks signals, omit it instead of leaving a placeholder mention in AGENTS.

## Precedence

When rules conflict, use this order:

1. this `AGENTS.md`
2. other repo-local instruction files
3. established repeated repo patterns
4. reference grammar or fallback doctrine

Explicit local evidence beats imported preference.

## Safety

- Do not commit secrets.
- Do not force destructive git operations.
- Verify commands against repo scripts before documenting them.
- Do not describe planned architecture as if it already exists.
- Do not let reference repo taste override explicit local evidence.

## Writing Standard For Generated AGENTS

- Keep the file tight enough to scan quickly during implementation.
- Prefer short evidence-backed bullets over polished narrative paragraphs.
- Separate `Current Reality` from `Preferred Direction` whenever maturity is mixed.
- Remove empty sections instead of leaving thin filler.
- The final result should feel repo-specific on first read, not template-shaped.
- Avoid meta-instructions addressed to the writer. The final AGENTS should read like repo guidance, not generator commentary.
- Avoid over-listing local tooling folders or generated docs unless they materially help someone change code.
