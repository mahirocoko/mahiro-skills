# Tournament scoring and quality gates

Use tournaments when one prompt is unlikely to produce reliable sprite animation. This adapts Image Cockpit's hidden candidate outbox + quality-gate model.

## Candidate isolation

- Run 2-3 candidates in parallel for hard animation/effect jobs.
- Give every candidate the same source and contract.
- Write each candidate under its own folder.
- Do not mix generated images between candidates; record timestamps/paths if using a shared generated-images folder.
- Candidate folders may contain QA/contact/debug artifacts; root outbox should receive only approved winner files.

## Quality classifications

- `usable-final` / gold — complete, verified, visually acceptable, download/promote allowed.
- silver — verified with warnings; requires human review before promotion.
- bronze / `quarantined-candidate` — useful for diagnostics only; not final.
- `quality-failed` / blocked — failed material quality gate.
- running/waiting — incomplete or not stable yet.
- debug-artifact — review-only helper output.

## Score dimensions

Score candidates by evidence, not vibes alone:

1. Contract completeness: expected files, manifest, frame count, dimensions.
2. Identity preservation: same character, outfit colors, props, proportions.
3. Cell safety: no cropping, body crossing, detached heads/parts, edge contact.
4. Chroma/alpha safety: flat removable key or clean alpha; no residue/translucency damage.
5. Center/baseline stability: stable anchor, foot baseline, scale, head size.
6. Motion readability: enough frame-to-frame progression for the selected action.
7. Target-size readability: silhouette/detail reads at runtime size.
8. Visual honesty: if it looks bad, it fails even when scripts pass.
9. Warning count/severity: fewer hard warnings wins.
10. Provenance: source-candidate vs production-approved clarity.

## Motion gates

Static or nearly static rows fail. For actions:

- `idle-breathing`: feet planted, subtle body/secondary motion visible in enough frames.
- `walk-cycle`: alternating foot contacts/passing poses are readable.
- `run-cycle`: stronger leg arcs and body lean than walk.
- `attack`: anticipation, strike, follow-through, recovery.
- effects: clear onset, peak, decay or loop progression.

## Winner selection template

```txt
READ candidates from: <JOB_DIR>/outbox/candidates/
WRITE report to: <JOB_DIR>/outbox/winner-report.md

For each candidate, inspect manifest/QA/contact sheets and target-size previews. Score completeness, identity, cell safety, alpha/chroma, center/baseline, motion readability, target-size readability, warnings, and provenance. Pick one winner only if it is good enough for human review/promotion. If all candidates are fuzzy, static, cropped, off-style, or detail-destroyed, mark all failed and recommend regenerate or master-sprite cleanup.
```

## Publish gate

Do not publish/promote until:

- all required direction/frame artifacts exist;
- artifacts are stable and verified;
- manifest is written last;
- QA/report says usable or explicitly human-approved despite warnings;
- visual honesty gate passes at target size.
