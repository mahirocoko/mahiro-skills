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

Produce sprite workflow outputs according to job.json and prompt.md. Required outputs: manifest.json, frames/, contact-sheet source or notes, qa-report.md. Do not promote files into the repo. Do not change source code unless explicitly asked.
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

Generate this candidate independently from the same source and motion/effect contract. Do not copy another candidate. Required outputs: manifest.json, frames or direction sheets, qa-report.md, and optional preview GIF. Keep work/contact/debug files inside this candidate folder. Do not promote into production and do not write into another candidate folder.
```

## Tournament QA / winner selector

```txt
READ candidates from: <JOB_DIR>/outbox/candidates/
WRITE output to: <JOB_DIR>/outbox/winner-report.md

Compare candidates using Image Cockpit-inspired gates: completeness, manifest validity, alpha/chroma safety, consistent identity/scale/baseline, target-size readability, motion amount, frame progression, warnings count, and provenance. Pick one winner or mark all failed. Do not promote; only report the winner path and blockers.
```
