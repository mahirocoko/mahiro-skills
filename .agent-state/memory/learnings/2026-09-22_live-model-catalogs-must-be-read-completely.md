---
artifact: reference-learning
authority: non-canonical
status: candidate
source: .agent-state/memory/retrospectives/2026-09/22/13.35_direct-cli-live-model-catalog-release.md
---

# Read live model catalogs completely before changing routing

## Intent

Keep model-routing updates grounded in complete runtime evidence.

## Trigger

A CLI model catalog is large enough to be truncated, paginated, sampled, or
bounded before deciding whether a named model is available.

## Action

Query the exact candidate IDs or parse the complete catalog structurally. Treat
a missing result from a partial view as unknown, not absent. Change the
canonical routing owner only after the selected and superseded IDs have both
been checked against the complete live response.

## Boundary

This rule establishes availability evidence, not model quality. A model being
present does not automatically make it the preferred route; curated role choice
still needs task-fit evidence and the owning skill's policy.

## Rationale

Catalog ordering and output length change independently of CLI versions. A
valid model can appear outside an arbitrary output slice, while a stale curated
model can remain documented after disappearing from the runtime. Exact or
structured extraction avoids both false absence and stale availability claims.

Tags: direct-cli, model-routing, live-catalog, evidence, validation
