# Retiring an installer adapter without deleting valid user state

**Tags**: adapter-retirement, receipts, content-hash, agy, gemini, context-contracts

Removing an installer adapter is broader than deleting its type and artifact directory. The current contract must be migrated across planner capabilities, target transforms, source inventory, TUI choices, docs, examples, tests, receipts, and the installed footprint.

For installed cleanup, fail closed:

1. Resolve the retired root from the exact requested scope.
2. Require the expected receipt path, schema, agent, scope, and root.
3. Validate canonical item names and a one-to-one unique target-state set.
4. Reconstruct target paths rather than trusting arbitrary receipt paths.
5. Remove only targets whose current content hash equals the recorded installed hash.
6. Preserve modified, malformed, or unrelated targets and report them explicitly.
7. Delete the retired receipt only when no managed target was preserved.

Also distinguish a standalone skill payload from an adapter with the same product name. In this migration, `skills/gemini` remained valid for Gemini web/MQTT control even though the Gemini CLI install adapter and TOML command family were removed.

Finally, run both identifier searches and semantic capability-prose searches. The verifier found stale “Gemini CLI/TOML command” claims that a directory-name-only grep missed.
