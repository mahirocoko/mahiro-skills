---
name: auditing-context-contracts
description: Audits repository context contracts when APIs, routes, packages, capabilities, ownership, generated prose, comments, agent-state, or historical records may have drifted. Use for text-contract migrations, stale documentation audits, current-versus-historical owner checks, context cleanup, or evidence-backed closeout after material contract changes. Do not auto-load for ordinary copy edits.
---

# /auditing-context-contracts — Context Contract Audit

Treat every text surface that an agent may read as an executable context
contract. A green build cannot compensate for active comments, Markdown,
generated prose, agent-state, or memory that confidently describes a different
system.

This skill audits and, when the user requested repair, aligns those contracts
with current source and runtime truth. It does not turn keyword search into a
semantic oracle.

## Scope and boundaries

This skill owns:

- mapping current, generated, supporting, historical, and transient text owners
- comparing material claims with source, configuration, runtime, and tests
- locating explicitly retired names or claims across declared paths
- measuring documentation volume and overlap before proposing cleanup
- designing defect-specific regressions for context drift
- repairing or demoting text only when the request authorizes edits

This skill does not:

- let prose overrule current implementation or observed runtime behavior
- infer semantic absence from an exact-string search
- hand-edit generated output when an owning generator exists
- auto-rewrite comments or documentation from scanner findings
- treat source, test, browser, rendered, or human evidence as interchangeable
- delete historical evidence merely because it is old or repetitive
- authorize commits, pushes, releases, or destructive cleanup

## Trigger gate

Use this skill when at least one material context contract may have changed:

- an API, route, package, command, capability, or ownership boundary migrated
- active docs/comments disagree with current source or runtime
- generated prose or an agent-state summary may be stale
- current and historical records both read as authoritative
- a refactor or release needs text-contract closeout
- the user asks for a context-contract, source-truth, or documentation drift audit

Do not auto-load it for a typo, isolated copy polish, or implementation that
does not change an agent-readable contract.

## Phase workflow

### Phase 1: Declare the audit mandate

State:

- the changed contract and concrete anchor
- the target repository and current source-of-truth order
- active paths, generated paths, historical paths, and transient state paths
- protected contracts and explicit non-goals
- known retired identifiers or claims
- whether the request is audit-only or audit-and-repair

If the changed contract is unknown, form one falsifiable hypothesis and run the
cheapest disconfirming probe before broad inventory work.

### Phase 2: Build the owner map

Classify every material surface by function, not by file extension alone:

| Class | Meaning | Default treatment |
| --- | --- | --- |
| Executable/current truth | Source, config, schemas, generators, and observed runtime behavior | Verify first |
| Active contract owner | Current AGENTS/CLAUDE rules, README, docs, comments, manifests, and tests | Must agree with current truth |
| Generated contract | Machine-produced docs, examples, manifests, or summaries | Regenerate through the owner |
| Supporting evidence | Research, matrices, QA reports, and decision records | Link to the current owner |
| Historical/superseded | Dated prior states retained for provenance | Label scope and point to current truth |
| Transient agent state | Goal, handoff, plan, scratch, or memory output | Refresh, resolve, or clearly bound |

For every disputed claim, name one canonical current owner. Do not create a new
summary document when an existing owner can be corrected.

### Phase 3: Collect bounded mechanical evidence

Use exact search for exact names and semantic/code search for concepts. Declare
the paths and terms so another reviewer can reproduce the coverage.

The bundled scanner is optional and deliberately narrow:

```bash
bun skills/auditing-context-contracts/scripts/scan-context-contracts.ts \
  --root . \
  --active-path 'AGENTS.md' \
  --active-path 'docs/**/*.md' \
  --retired 'old-route-name' \
  --historical-path 'docs/history/**/*.md' \
  --historical-marker 'Status: superseded' \
  --historical-marker 'Current owner:'
```

The scanner intentionally accepts literal retired terms only; use the target
repo's established exact/AST/semantic tools for broader searches. It reads
explicit globs, reports exact matches and missing required historical markers
as stable JSON, never edits files, and exits:

- `0` when no findings exist
- `1` when matches, marker warnings, or skipped files need review
- `2` when inputs are invalid or active globs resolve to no files

Hard ceilings bound total globs, literal patterns, historical markers, unique
files, bytes per file, aggregate readable bytes, and reported findings. A caller
may lower the per-file ceiling but cannot raise it. Symlinked, outside-root,
binary, invalid-UTF-8, and oversized inputs fail closed as review findings or
invalid-scope errors.

Scanner output is a location map, not proof that wording is stale, exhaustive,
or semantically aligned. Read every finding in context.

### Phase 4: Test claims at the right evidence layer

Choose only the layers required by the claim, but never promote lower-layer
evidence into a higher-layer verdict:

1. **Source/static** — declarations, imports, configuration, generated output,
   schemas, and exact ownership text.
2. **Host/runtime or DOM/behavior** — executed route, API, CLI, native host, DOM,
   state, accessibility, or source synchronization.
3. **Computed/resolved** — values resolved by a real host or browser, such as
   final styles, paths, capabilities, or configuration.
4. **Rendered/human** — composition, clipping, responsive quality, copy meaning,
   product direction, and human acceptance.

A unit test does not prove runtime integration. Browser evidence does not prove
native behavior. An agent cannot verify a human-owned product criterion.

### Phase 5: Build the contradiction and coverage ledger

For each material claim record:

| Claim | Current owner | Conflicting surface | Evidence layer | Verdict | Next action |
| --- | --- | --- | --- | --- | --- |

For each claimed regression, describe one plausible broken implementation and
the narrow probe that would fail. Classify coverage as:

- **Direct** — the exact defect shape fails
- **Indirect** — adjacent behavior is covered, but the defect can still pass
- **Missing** — no executable guard exists
- **Human-only** — the criterion cannot be truthfully automated

Broad green suites and homogeneous mocks are supporting evidence, not a direct
regression by default.

### Phase 6: Repair without destroying provenance

When edits are authorized:

1. Correct the canonical current owner first.
2. Update all active supporting surfaces in the same change.
3. Regenerate machine-owned output through its generator and freshness check.
4. Date and demote useful historical records; link them to current truth.
5. Remove redundant historical files only after durable decisions have been
   promoted and Git or another explicit ledger preserves provenance.
6. Resolve stale Goal/handoff/agent-state claims that still present themselves
   as current.
7. Add defect-specific tests where text drift can be checked deterministically.

Never change product behavior merely to satisfy stale prose unless the user
chooses that product direction.

### Phase 7: Verify and close

Run the narrow context checks first, then the repo's required generators,
tests, type checks, builds, or runtime probes. Use a fresh verifier for a
material migration and ask it to disprove the owner map and claimed coverage.

Stop at one verdict:

- **ALIGNED** — required owners and evidence layers agree
- **CONDITIONALLY ALIGNED** — named non-blocking or human-only boundaries remain
- **NOT ALIGNED** — active contradictions or missing evidence remain
- **BLOCKED** — a concrete dependency prevents a truthful verdict

## Integration with related skills

- `mahiro-guidance-refine` decides where a newly learned rule should persist.
- `mahiro-docs-rules-init` bootstraps missing repo guidance; this skill audits
  contradictions after contracts exist or migrate.
- `mahiro-style` is fallback doctrine and never outranks target-repo truth.
- `fable` coordinates long or high-risk repair when the audit spans several
  ownership boundaries or repeated hypotheses.
- `rrr` and `forward` own retrospective and handoff artifacts; this skill checks
  whether those artifacts still masquerade as current truth.

## Output contract

Return:

1. **Audit mandate** — changed contract, scope, mode, and non-goals
2. **Current owner map** — claim → canonical owner → supporting surfaces
3. **Contradictions** — exact path/line, competing claims, severity, and verdict
4. **Evidence matrix** — required layer, collected evidence, and boundary
5. **Regression coverage** — direct / indirect / missing / human-only plus probe
6. **Disposition** — corrected, regenerated, retained, demoted, removed, or open
7. **Volume evidence** — measured files/words/links/overlap when cleanup occurred
8. **Final verdict** — aligned state, checks, unresolved items, and next owner

## Validation / self-check

Before closing, confirm:

- repo files and current runtime outranked remembered doctrine
- every material claim has one named current owner
- search scope and exact patterns are reported without semantic overclaiming
- generated files were regenerated rather than hand-patched
- historical evidence was dated/demoted or removed with provenance preserved
- every regression claim includes a plausible broken case
- evidence layers match the reported verdict
- human-owned acceptance remains human-owned
- commit, push, release, and destructive boundaries had explicit permission
