# mahiro-skills examples

These examples are copyable walkthroughs for the CLI/TUI surface. They are documentation fixtures, not a separate executable package.

## Examples

- [`install-local.md`](./install-local.md) — install the default bundle or selected skills into a project-local agent root.
- [`multi-agent-install.md`](./multi-agent-install.md) — plan and install the same skills across Cursor and Gemini.
- [`tui-session.md`](./tui-session.md) — walk through the interactive TUI home menu, automatic receipt-recorded updates, planning, install preview, list, and receipt detail.

## Validation

Run the same commands from the repository root unless the example says otherwise:

```bash
bun ./src/cli.ts plan --agent opencode --scope local
bun ./src/cli.ts guided --mode list
bun test
```
