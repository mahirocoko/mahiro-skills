---
name: mahiro-unslop
description: Audit and repair generic AI output in UI/design, prose, interface copy, or code while preserving product character, meaning, and behavior. Use when asked to unslop, anti-slop, remove AI tells, or make generic AI output feel deliberate in one of these lanes. Do not auto-load for ordinary implementation, unrelated polish, or work already owned by a named domain skill.
---

# Mahiro Unslop

A draft for personal, real-world use. The UI/design lane is a near-verbatim port
of Damir Sokolovsky's `unslop`; the other lanes remain selective, preservation-first
adaptations. A successful run can change nothing. This is not an AI-authorship
detector or a mandate to make everything minimal.

## Operating posture

Audit before editing. Current user instructions and repository contracts override
the skill. Preserve real features, facts, working behavior and deliberate product
identity; do not preserve generic visual decisions merely because they already
exist. For UI/design, follow that lane's concrete references, values, composition
rules and final checklist as written—the shared wrapper must not soften them into
optional probes. Do not replace one template with another or manufacture findings.

## Scope and handoffs

Choose a lane from the target, not a questionnaire. Load only its reference;
combine lanes only where the requested change crosses them.

| Lane | Read when | Contract |
| --- | --- | --- |
| UI/design | A screen looks AI-generated | [UI/design](references/ui-design.md): near-verbatim `heydamir/unslop` workflow, references, ordered passes and checklist |
| Prose | Writing sounds formulaic or inflated | [Prose](references/prose.md): contextual findings and preservation-first cleanup |
| Interface-copy | Labels, errors, status, onboarding, confirmations | [Interface copy](references/interface-copy.md): terms, actions, recovery, locale contracts |
| Code | AI-written code needs taste review | [Code](references/code.md): repo rules first, then `mahiro-style`; optional executable lint only by request |

Named owners keep their jobs: `mahiro-style` owns Mahiro code taste;
`motion-design` owns an explicitly requested motion system; asset skills own
asset production; repo owners govern accessibility, typography, i18n and domain
behavior. Route to an available owner when needed, without assuming it is installed
or granting new permissions. Ordinary implementation does not trigger this skill.

## Decision sequence

1. Recover the target, desired outcome, and authorization: audit-only or changes.
   Inspect the named surface, nearby source, and current local rules. Ask only if
   a missing decision would change scope; do not search unrelated projects.
2. Read the selected lane. Record concrete defects by location or quoted span,
   why they matter here, and what must stay. Protect deliberate choices.
3. Choose the intervention. For UI, classify heavy, light, or no-change and then
   follow the selected mode in the UI lane; heavy mode is not a minimal polish pass.
   For text and code, prefer a no-op to an uncertain edit.
4. Apply only authorized repairs. Preserve behavior, real features and facts. Let
   the UI lane change generic copy, decoration, type, layout proportions and visual
   treatment where its audit and checklist require it.
5. Compare with the original and validate the changed scope using the lane's
   checks. Return modifications, preserved constraints, evidence and limitations.

## Examples

- “Unslop this dashboard; keep our palette.” Audit the rendered dashboard and
  source. If only spacing and redundant badges are defective, use light mode:
  repair those, not the palette, font or layout.
- “Anti-slop this paragraph, just flag issues.” Quote contextual defects and
  protections; do not rewrite. An accurate technical use of “pipeline” stays.
- “Remove generic AI code from this diff.” Read repo rules and select a
  `mahiro-style` lens. This does not authorize installing a linter or redesigning UI.

## Stop gates

- Audit-only means no edits. A bare invocation without a recoverable target needs
  one short question, not an invented project.
- Stop before a new UI direction unless already approved or the user explicitly
  delegated it. When delegated, follow the UI lane's full direction and checklist;
  do not retreat to superficial cleanup. No-change remains a complete result.
- Do not invent claims, data, recovery actions, features, voice, or architecture.
  Flag uncertainty and ask only where it blocks a safe repair.
- Do not install tools, mutate lint configuration, or expand into a rewrite merely
  because a scanner reports matches. Missing tooling is a limitation, not consent.

## Output contract

Return the lane and scope, concrete findings (including protected choices when
relevant), changes made or proposed, and exact validation performed. Include
UI severity and five-line direction when applicable. State “No actionable
findings” when appropriate. Keep suggestions separate from applied changes.
For a text-only deliverable, keep the cleaned text separate from a brief change
note; an exact no-op returns the source unchanged with any note outside it.

## Validation / self-check

Check the diff against the requested boundary. Re-read facts, negations,
conditions, names, quantities, locale placeholders and behavior contracts.
Run the target repo's narrow relevant tests and native formatter when available;
report missing tools and unexecuted checks. Rendered/runtime evidence is required
for visual claims: source edits and passing tests do not prove appearance,
interaction behavior, or human acceptance. Without a render, label UI findings
source-based hypotheses and visual results unverified. Self-checks are not
independent acceptance.

## Provenance

Read [provenance](references/provenance.md) for attribution, source snapshots and
adaptation boundaries; it is not an additional runtime workflow.

ARGUMENTS: $ARGUMENTS
