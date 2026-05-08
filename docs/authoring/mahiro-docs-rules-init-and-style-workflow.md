# Workflow: `mahiro-docs-rules-init` + `mahiro-guidance-refine` + `mahiro-style`

## Goal

Use these skills together with a clear division of labor:

- `mahiro-docs-rules-init` sets the baseline docs and rules.
- `mahiro-guidance-refine` turns real session feedback into targeted docs/rules/style proposals.
- `mahiro-style` reviews, aligns, and catches code/style drift.

They should not replace each other directly because they solve different problems.

## 1. New Repo or Weak Docs Baseline

Use first:

- `mahiro-docs-rules-init`

Goal:

- create `AGENTS.md`
- create the first docs family
- give the repo a usable baseline rules layer

Recommended flow:

1. Inspect repo reality.
2. Run `mahiro-docs-rules-init`.
3. Generate docs only from real repo signals.
4. Run `mahiro-style` to review Mahiro-style alignment.
5. Fix targeted drift if needed.

Best for:

- new repos
- repos with only `README.md`
- repos with scattered or very weak docs

## 2. Session Feedback or User-Corrected Pattern

Examples:

- user says the agent output did not match their preferred pattern
- user corrects communication style, code style, review style, or workflow order
- a session reveals repeat friction that should become a repo-local rule proposal
- the agent needs to preserve a lesson without turning a one-off preference into global doctrine

Use first:

- `mahiro-guidance-refine`

Goal:

- classify the feedback as durable or transient
- separate repo-local guidance from global Mahiro doctrine
- propose the smallest docs/rules/style update
- require approval before editing `AGENTS.md`, docs, skills, or style guidance

Recommended flow:

1. Capture the exact correction or desired pattern.
2. Inspect repo-local docs/rules before using fallback style.
3. Classify evidence: direct user feedback, repo-proven pattern, repeated friction, inference, or transient context.
4. Produce a proposal with target file, rationale, confidence, and rollback note.
5. Edit only after approval.
6. Use `rrr` or `forward` if the lesson should stay as session memory or next-session work instead of a durable rule.

Best for:

- refining docs after real feedback
- keeping rules aligned with what the user actually wants
- preventing transient session context from leaking into durable doctrine
- patching existing docs without full regeneration

## 3. Incremental Repo Growth

Examples:

- adding `components/`
- introducing shared UI
- adding route partials
- introducing a service layer
- introducing a state layer
- changing i18n patterns

Use first:

- `mahiro-style`

Goal:

- review which docs pages should change
- update docs in a targeted way
- prevent docs from drifting away from repo reality
- prevent abstractions from growing faster than Mahiro-style allows

Recommended flow:

1. Inspect repo changes.
2. Run `mahiro-style` with the relevant lens.
3. Identify the pages that need updates, such as:
   - `AGENTS.md`
   - `docs/file-organization.md`
   - `docs/patterns/component-conventions.md`
   - `docs/api-data-fetching.md`
   - `docs/i18n-guidelines.md`
4. Edit only the affected pages.
5. Run `mahiro-style` again if you want a second review pass.

Useful `mahiro-style` lenses here:

- `structure`
- `boundaries`
- `i18n`
- `review`

Best for:

- repos that already have a docs baseline
- repos evolving incrementally
- repos that do not want a full docs regeneration pass

If the incremental change came from explicit user feedback about how agents should behave, run `mahiro-guidance-refine` before editing docs so the feedback is classified and approval-gated.

## 4. Major Restructure

Examples:

- route-first grows a real shared component layer
- services or stores become established
- i18n posture changes materially
- formatter, lint, or command posture changes
- multiple docs pages no longer match repo reality

Recommended approach:

Use two steps.

Step 1:

- run `mahiro-docs-rules-init` as a regeneration pass
- do not expect it to be a perfect sync engine

Step 2:

- run `mahiro-style` on the generated output
- fix targeted drift afterward

Recommended flow:

1. Inspect the repo's new reality.
2. Run `mahiro-docs-rules-init`.
3. Compare generated output with existing docs.
4. Run `mahiro-style review`.
5. Fix drift related to:
   - owner-local posture
   - premature shared abstraction
   - i18n boundary ownership
   - naming drift
   - route thickness
6. Finalize the docs set.

Best for:

- repos with large structural changes
- repos where several docs pages are stale at once
- repos that want a docs-family reset without losing Mahiro-style quality

## 5. Shortcut Decision Tree

Ask these questions first.

### A. Is there no real docs baseline yet?

- yes -> use `mahiro-docs-rules-init`
- no -> go to question B

### B. Did the user correct agent behavior or state a preferred pattern to preserve?

- yes -> use `mahiro-guidance-refine`
- no -> go to question C

### C. Did only a few layers or patterns change?

- yes -> use `mahiro-style` and update docs selectively
- no -> go to question D

### D. Did the repo structure change enough that multiple pages are stale together?

- yes -> run `mahiro-docs-rules-init`, then `mahiro-style`
- no -> `mahiro-style` is enough

## 6. Recommended Practical Policy

Use `mahiro-docs-rules-init` when:

- starting a repo
- docs are missing or very weak
- you need the first baseline docs family
- you need a large docs reset

Use `mahiro-style` when:

- docs already exist
- a new layer is being added incrementally
- you want to review whether docs and code are still aligned
- you want targeted docs updates
- you want to check whether wording drifted away from Mahiro-style

Use `mahiro-guidance-refine` when:

- feedback from a session should become a proposed rule or doc update
- the user says the agent missed their desired pattern
- a code-style/workflow/communication correction might be durable
- you need approval-gated docs/rules maintenance from lessons learned

## 7. Best Combined Workflow

The most practical default is:

1. Use `mahiro-docs-rules-init` once to bootstrap.
2. Use `mahiro-guidance-refine` when real session feedback should become a proposal or approved docs/rules patch.
3. Use `mahiro-style` as the default alignment and drift-review lens.
4. Return to `mahiro-docs-rules-init` only when the repo changes shape in a major way.
5. In the future, consider adding a `sync` mode to `mahiro-docs-rules-init`.

## 8. Future Improvement Suggestion

The clean long-term shape is three explicit modes for `mahiro-docs-rules-init`.

### `init`

- create the first baseline docs and rules

### `sync`

- update docs to match current repo reality
- preserve existing wording and manual doctrine where possible

### `audit`

- do not edit files
- report:
  - which pages are stale
  - which pages should be added
  - which pages drifted from Mahiro-style
  - which pages drifted from repo reality

## Final Recommendation

Default workflow:

- first pass: `mahiro-docs-rules-init`
- feedback-driven rules refinement: `mahiro-guidance-refine`
- normal alignment review: `mahiro-style`
- major restructure: `mahiro-docs-rules-init` -> `mahiro-style`

This gives the best balance between:

- reality-first docs
- Mahiro-style alignment
- maintenance effort that stays practical
