---
artifact: reference-learning
authority: non-canonical
status: candidate
source: .agent-state/memory/retrospectives/2026-09/29/17.18_global-skill-manager-overview.md
---

# Collection overview before per-item inspection

**Tags:** collection-manager, tui, bulk-inspection, read-only, progress, ux

## Intent

Help a person decide which item needs attention without forcing a detail visit for every item.

## Trigger

A management list contains multiple installed or owned objects, and the important status requires expensive file verification or upstream requests rather than only local metadata.

## Action

Show locally known ownership and presence state in every row immediately. Offer one explicit read-only check-all action for the expensive states; stream per-row progress, preserve successful results for detail navigation, show unknown/failure as distinct from current, and allow stopping after the active request. Use item detail for explanation and a separate final Review for writes.

## Boundary

Do not silently contact upstream on merely opening or moving through the list. A batch *inspection* is not a batch *mutation*: it must not create receipts, claim foreign ownership, install, update, or remove anything. Authoritative mutators still recheck state after any awaited external call and before writes. Human acceptance of the list's usefulness remains separate from test coverage.

## Rationale

Cleaning up the selected-item workflow alone still leaves the collection question unanswered. One bounded inspection gives a usable overview while keeping network cost and mutation consent visible. This is a non-canonical reference candidate; it does not revise the existing batch-action confirmation guidance.
