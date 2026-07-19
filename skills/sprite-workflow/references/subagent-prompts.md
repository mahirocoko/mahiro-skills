# Subagent prompts

Always give subagents literal paths. Do not pass only a repo root and hope they infer where to write.

## Contract planner

```txt
READ target repo from: <TARGET_REPO>
READ job folder from: <JOB_DIR>
WRITE output to: <JOB_DIR>/outbox/contract-plan.md

Plan the sprite asset contract. Do not generate production art. Define frame size, states, frame order, anchors, output files, QA checks, and provenance risks. Preserve repo-specific asset rules.
```

## Codex/image worker

```txt
READ target repo from: <TARGET_REPO>
READ job folder from: <JOB_DIR>
WRITE outputs only under: <JOB_DIR>/outbox/

For `imagegen-required`, use the real provider lane and return only untouched raster sources under `raw-generated/`, a hash-bound `provider-receipt.json`, and `status.json` or `blocker.json`. The receipt must declare `poseAuthorship: generated-poses` and contain the compact `providerReceipt` object with provider, model, operation, and sourceArtifacts. Do not slice, clean, resize, normalize, score, promote, or edit runtime/source/docs/tests. Raw provider dimensions and slightly varied chroma are normalization evidence, not automatic failure when the requested frames remain recoverable. Do not change source code unless explicitly asked.
```

## QA reviewer

```txt
READ target repo from: <TARGET_REPO>
READ outputs from: <JOB_DIR>/outbox/
WRITE output to: <JOB_DIR>/outbox/qa-report.md

Review target-size readability, alpha/background safety, frame consistency, anchor stability, animation rhythm, and provenance compliance. Mark pass/fail and list exact blockers.
```

## Integration worker

```txt
READ target repo from: <TARGET_REPO>
READ approved outputs from: <JOB_DIR>/outbox/
WRITE only the integration files explicitly assigned by the main agent.

Integrate approved assets after promotion only. Preserve runtime asset globs so QA/source folders are not imported accidentally.
```

## Tournament candidate worker

Use for Image Cockpit-style animation candidates when running 2-3 lanes in parallel.

```txt
READ target repo from: <TARGET_REPO>
READ job folder from: <JOB_DIR>
READ candidate contract from: <JOB_DIR>/job.json
WRITE outputs only under: <JOB_DIR>/outbox/candidates/<candidate-id>/

Generate this candidate independently from the same source and motion/effect contract. Do not copy another candidate. For `imagegen-required`, return only untouched provider raster sources, a hash-bound receipt, and status/blocker sidecars; the main orchestrator owns canonical extraction, normalization, QA, review packets, and promotion. Do not fail solely because provider canvas dimensions/chroma are not runtime-final when frame recovery is unambiguous. Do not create a custom compositor, manual rig, or transform substitute for a `sprite-generate` job. Do not promote into production and do not write into another candidate folder.
```

## Tournament QA / winner selector

```txt
READ candidates from: <JOB_DIR>/outbox/candidates/
WRITE output to: <JOB_DIR>/outbox/winner-report.md

Compare raw and normalized candidates using Image Cockpit-inspired gates: completeness, provenance, alpha/chroma recoverability, consistent identity/scale/baseline, target-size readability, equipment continuity, motion progression, action semantics, one-cycle seam, and warnings. Mechanical score is advisory only; detached fragments, identity drift, or duplicated action meaning override it. Pick one winner or mark all failed. Do not promote; only report the winner path and blockers.
```
