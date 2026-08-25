---
tags: [direct-cli, herdr, callbacks, concurrency, recovery, letta]
---
# Direct-CLI callbacks need receipt-bound wake and bounded silence

A callback system is not complete when workers can merely write results. It needs an exact recipient transport, durable delivery state, explicit acknowledgement ownership, and a bounded silence path.

## Durable rules

- Treat Herdr as best-effort online transport; Direct-CLI owns receipts, ACLs, durable ledger, idempotency, retry, acknowledgement, audit, and recovery.
- A Letta pane reported through Herdr metadata is not necessarily a named Herdr agent. Probe the exact recipient. For the current runtime, named workers/peers use `agent.prompt`, while the exact parent Letta receipt uses one atomic single-line metadata-only `pane.run`.
- Never put message bodies, prompts, results, or secrets into wake text or command arguments. Wakes carry only identifiers and an exact receive command.
- Transport acceptance is not proof. Final reports become terminal only after the exact parent receives and acknowledges every report.
- “No continuous monitoring” still needs a one-shot silence deadline that sleeps, records expiry, and wakes an explicit recovery command.
- Revalidate the original sender during retry, not only the retrying parent and destination.
- After an external dispatch call, reload shared state under the job lock before transitioning status or spawning deadline helpers. Otherwise a fast callback can be overwritten by stale controller state.
- Verify the user's normal topology first. For Mahiro's workflow, same workspace/different tabs is a required live case, not an inference from cross-workspace success.

## Evidence pattern

Use fake transport for deterministic ACL, retry, crash-window, and race tests, but require live proof for recipient capability and actual wake behavior. A high test count cannot substitute for the exact parent turn appearing in the real conversation.
