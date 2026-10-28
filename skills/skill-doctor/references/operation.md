# Explicit transcript workflows

Resolve `SKILL_ROOT` to the selected canonical skill directory. The helper is a Bun TypeScript CLI with no dependencies, no model calls, no browser and no automatic source discovery. Output parents must exist; every operation creates a new private directory and refuses overwrite. `--approve-scope` records an already obtained human approval; it does not obtain approval itself.

## Prepare Letta evidence

Supply explicit agent/conversation IDs and an ISO cutoff fixed before retrieval. Do not substitute `default`. Use literal full IDs from the user/runtime after confirming them, not inferred IDs from an export.

```sh
bun "$SKILL_ROOT/scripts/doctor.ts" collect \
  --agent "$AGENT_ID" --conversation "$CONVERSATION_ID" \
  --end "$FIXED_END_ISO" --out "$FRESH_APPROVED_OUTPUT" --approve-scope
```

This invokes one native command only, with stdout and stderr connected directly to private regular-file handles:

```sh
letta messages list --agent "$AGENT_ID" --conversation "$CONVERSATION_ID" \
  --order asc --limit 500
```

The declared native cap is `MAX_RECORDS = 500`; there is **no cursor pagination**. Main's Letta 0.34.8 local-backend probe found piped stdout truncated around 64 KiB and `--after` returning repeated IDs; direct file output retained the complete selected JSON. This adapter follows that proven transport without guessing a backend. Fewer than 500 records still do not prove full history. Exactly 500 sets `recordCapReached: true` and stop reason `record_limit`, meaning potentially truncated history even if some records are after the cutoff.

A private temporary capture directory is created only within the approved output parent's workspace, after the scope/fresh-output gate. Files are exclusive-create, mode 0600, inside a private mode-0700 directory. The adapter monitors growing stdout/stderr sizes every 5 ms against 8 MiB per stream, terminates on excess or a 30-second timeout, and checks size again before reading. Monitoring is sampled, not an OS disk quota: a fast writer can briefly overshoot the threshold before termination, but oversized data is never imported. Both handles and only the adapter's temporary directory are always cleaned on success or refusal. Normalized artifacts are created afterward in the fresh approved output; no raw capture is retained there.

The response must be an exact JSON array, not plaintext or JSON surrounded by logs. Nonzero CLI exits, stderr diagnostics, timeout, oversized output, malformed JSON, metadata/sort errors or repeated IDs refuse the run; there is no salvage of broken JSON and no success artifact. The terminal failure retains exit/diagnostic detail where available. Verify every returned record's identity before normalization, including hidden and after-cutoff records; any foreign/missing identity refuses the entire response. No backend discovery, raw database access or HOME scans. Limits are hard constants, not CLI flags that disable protections.

Import an already selected exact Letta JSON array instead:

```sh
bun "$SKILL_ROOT/scripts/doctor.ts" import \
  --agent "$AGENT_ID" --conversation "$CONVERSATION_ID" \
  --end "$FIXED_END_ISO" --source "$ABSOLUTE_SELECTED_EXPORT" \
  --out "$FRESH_APPROVED_OUTPUT" --approve-scope
```

Import is limited to 2,000 records and 8 MiB. It uses the same identity/visibility/duplicate checks, with stop reason `import_end` below the cap and `record_limit` at the cap. Larger exports require a separately approved bounded selection, not silent truncation. The import does not paginate an export or discover adjacent files.

## Prepare Pi evidence

Select one approved absolute Pi session JSONL and obtain its exact header session ID and an explicit entry ID identifying the branch endpoint. Fix the ISO cutoff before reading; never discover, default to the latest file, infer the active branch from file order, or invent a Letta agent ID. An endpoint may be an interior historical entry. Pi `/session` can identify the current session; use an explicitly approved source and evidence for its endpoint rather than guessing. Session exports can contain sensitive material; obtain scope approval before reading and separate evaluator/provider approval before transmission.

```sh
bun "$SKILL_ROOT/scripts/doctor.ts" import-pi \
  --source "$ABSOLUTE_SELECTED_JSONL" --session "$SESSION_ID" --leaf "$ENTRY_ID" \
  --end "$FIXED_END_ISO" --out "$FRESH_APPROVED_OUTPUT" --approve-scope
```

This imports bounded Pi v3 JSONL, checking session identity, IDs and ancestry before normalization; malformed input, invalid structure, mismatched identity or excess bounds refuse rather than salvage. The selected raw root-to-entry ancestry is historical evidence, **not** a reconstruction of model-visible context. Other branches, system entries, thinking, summaries, custom/extension messages, context edits and unsupported entries are omitted; original pre-compaction messages may remain. Compaction and context edits are not applied. Images, signatures and tool-result details/nested metadata are omitted. Assistant tool-call blocks remain in their assistant event with call IDs, names and arguments; tool results are separate `tool_return` events. No Pi agent identity or user authorship is inferred. Inspect manifest and omissions, and report all limitations before evaluation.

## Prepared artifacts

`manifest.json` contains schema version 1, scope, source, limits (`records`, `captures: 1`, `bytes`, `eventBytes`), one capture's byte/hash metadata under `pages`, omissions and history. `events.json` is the normalized event array. Typed/explicit system, reasoning and summary records are omitted; user-wire-role context remains unverified data, not human evidence.

- Letta required source fields: `id`, `date`, `agent_id`, `conversation_id`, `message_type`. All identity fields must match the approved IDs exactly. Dates must be parseable and ascending. Pi uses its session header and entry IDs/parent links instead; it does not fabricate these Letta fields.
- Visible types: `user_message`, `assistant_message`, `approval_request_message`, `tool_call_message`, `tool_return_message`. Letta 0.34.8 local attempted tool invocations use `approval_request_message`, preserved as `kind: "tool_request"`. Requests are citable attempted actions, never proof of approval, execution or success. `tool_call_message` is retained when explicitly supplied but likewise does not prove an outcome. Payloads remain under their original `message`, `text`, `content`, `tool_call`, `tool_return` keys; `tool_calls`, `tool_call_id` and `status` are retained when present for transport/linkage evidence.
- Event: `id`, `date`, `kind` (user/assistant/tool_request/tool_call/tool_return), `humanOrigin`, `contextMarkers`, `sourceType`, `sourceHash`, `originalBytes`, `clipped`, `omittedContentBlocks`, `data`, `outcome: "not_inferred"`.
- A `user_message` is a wire role, not proof that a human authored a directive: `humanOrigin: "not_established"` applies to all such events. Literal `<system-reminder>`, `<system-alert>`, `<task-notification>` and `<available_skills>` wrappers are listed in `contextMarkers` as conservative provenance-review flags, not a heuristic authorship verdict. Preserve automated skill injections and task notifications as data. Do not cite their claims as direct human feedback or treat embedded summaries as human history. Unmarked/mixed content can still be automated; marker absence proves nothing. Resolve ambiguous provenance with approved evidence before making a human-authority claim; otherwise abstain. Other event roles use `humanOrigin: "not_applicable"`.
- Page SHA-256 hashes cover exact received UTF-8 source bytes, including formatting. Letta event/omission hashes cover UTF-8 `JSON.stringify` of the complete original record in its parsed key order, not the normalized payload. Pi event/omission hashes cover the original JSONL entry line. This distinction matters: a page hash is original-byte provenance, while a record hash is serialized-record provenance. Neither creates missing original history.
- Payloads above 64 KiB become a declared `clippedJsonPrefix`, not a fabricated complete JSON object. Original byte counts/hashes survive. Letta tool results below the bound are preserved unchanged; Pi results retain only the supported fields described above. Any clipped result may be insufficient to judge command success.
- Reasoning/system/summary types and explicit `is_summary`/`is_compaction` records are omitted with ID/type/hash/reason. Typed reasoning/thinking/redacted_thinking/summary/compaction/system blocks in content arrays are removed and counted. Unknown record types are omitted. Do not heuristically convert system summaries into user evidence.
- History is always `partial: true`, with `recordCapReached`, first observed date, fixed end, stop reason, errors, details and `baseline: "unknown"`. Capture/import ending below its cap does not prove full history. Report earlier compaction boundaries explicitly in evaluator limitations when known. Omissions after cutoff also retain IDs and hashes.

Never evaluate missing records as if they were successful, and never treat tool-return transport as command/test outcome. Keep the approved source export separately if source-byte reproduction is needed; the helper stores hashes, not hidden raw pages.

## Independent evaluator handoff

After separate provider/agent approval, give a fresh evaluator session the prepared artifacts, the four rubric references, and SKILL.md's scoring/attribution constraints. Identify the session in the report. API execution transmits supplied material to that provider; this helper does not eliminate that transmission. No automatic grader launch is included.

Author JSON to this concrete shape (values must be actual independent judgments, not this illustrative structure):

```text
{
  schema: 1,
  evaluator: { independent: true, session: "fresh-session-id" },
  limitations: ["Specific visible-history, clipping and baseline limits"],
  axes: {
    efficiency: AxisResult,
    code_quality: AxisResult,
    procedure_compliance: AxisResult,
    verbosity: AxisResult
  },
  episodes: [Episode, ...],
  recommendations: [Recommendation, ...],
  abstention: "Why no instruction change is supported, when recommendations is empty"
}
AxisResult = { label, score, reason, evidence: [visible_event_id, ...] }
Episode = {
  id, failed: boolean, axes: [axis_name, ...],
  evidence: [visible_event_id, ...], positive: [visible_event_id, ...],
  counter: [visible_event_id, ...], explanation,
  cause: "missing/wrong_instruction" | "ignored_existing_instruction" |
    "code_product_infra" | "model_variance" | "insufficient_evidence",
  confidence: "low" | "medium" | "high"
}
Recommendation = {
  episode: episode_id, owner: "named active instruction owner",
  change: "candidate instruction decision", instructionEvidence: [visible_event_id, ...],
  rationale: "Actual instruction gap, availability/baseline evidence and prevention mechanism"
}
```

Exactly four axes are required. Scored labels use original numeric values; `insufficient_evidence` uses null on any axis. Scored reasons require visible citations. Every failing axis (raw score below 0.5) needs a failed cited episode; insufficient evidence does not fail. A corrected failed episode can coexist with a passing overall assessment and must not force a lower grade. Episodes require evidence, positive and counter arrays; when none are visible, explain why in `explanation`. Recommendations additionally require an applicable failing rubric score, a failed missing/wrong-instruction episode, medium/high confidence, named owner and instruction citations belonging to that episode. This preserves the upstream failed-conversation proposal gate without suppressing intermediate observations. Do not infer absence from missing history. Unknown additional top-level report fields are refused. No required count of episodes, causes or improvements.

## Validate and render

The independently authored report is an explicitly selected input file. Render to another fresh directory so no evidence is overwritten:

```sh
bun "$SKILL_ROOT/scripts/doctor.ts" render \
  --agent "$AGENT_ID" --conversation "$CONVERSATION_ID" --end "$FIXED_END_ISO" \
  --dataset "$ABSOLUTE_PREPARED_DIRECTORY" --report "$ABSOLUTE_AUTHORED_JSON" \
  --out "$FRESH_APPROVED_REPORT_OUTPUT" --approve-scope
```

For a Pi dataset, repeat its explicit source, session, endpoint and cutoff instead of Letta identity flags; render checks the manifest binding without rereading the source:

```sh
bun "$SKILL_ROOT/scripts/doctor.ts" render \
  --source "$ABSOLUTE_SELECTED_JSONL" --session "$SESSION_ID" --leaf "$ENTRY_ID" --end "$FIXED_END_ISO" \
  --dataset "$ABSOLUTE_PREPARED_DIRECTORY" --report "$ABSOLUTE_AUTHORED_JSON" \
  --out "$FRESH_APPROVED_REPORT_OUTPUT" --approve-scope
```

This validates, writes machine `report.json` and readable `report.md`, and exits nonzero on refusal. It never opens a browser or applies instructions. The dataset directory must contain the helper's manifest/events pair with the same explicit scope and cutoff. Validation of labels and citation IDs is mechanical; whether a cited passage truly supports a gap, and whether the evaluator was genuinely independent, still need evidence review. Do not present schema validation as causal proof.
