# Local install example

Use local scope when you want skills and slash commands installed into the current project instead of your global agent root.

## Preview the default bundle

```bash
bun ./src/cli.ts plan --agent opencode --scope local
```

The plan prints JSON with the resolved root, source paths, target paths, and collision markers.

## Install the default bundle

```bash
bun ./src/cli.ts install --agent opencode --scope local
```

Expected local targets:

- `.opencode/skills/<name>/...`
- `.opencode/commands/<name>.md`
- `.opencode/.mahiro-skills/receipts/local-opencode.json`

## Install selected skills

```bash
bun ./src/cli.ts install project recap --agent opencode --scope local
```

This installs the selected skills plus their paired slash-command wrappers.

## Verify

```bash
bun ./src/cli.ts doctor --agent opencode --scope local
bun ./src/cli.ts list --agent opencode --scope local
```
