# Multi-agent install example

Use multi-agent planning when you want the same skill set available across multiple agent runtimes.

## Preview Cursor, Gemini, and Letta Code targets

```bash
bun ./src/cli.ts plan project --agent cursor --agent gemini --agent letta-code --scope local
```

Equivalent comma-separated form:

```bash
bun ./src/cli.ts plan project --agent cursor,gemini,letta-code --scope local
```

## Install

```bash
bun ./src/cli.ts install project --agent cursor,gemini,letta-code --scope local
```

Expected local targets:

- `.cursor/skills/project/...`
- `.cursor/commands/project.md`
- `.gemini/skills/project/...`
- `.gemini/commands/mh-project.toml`
- `.agents/skills/project/...`

## Verify

```bash
bun ./src/cli.ts doctor --agent cursor --scope local
bun ./src/cli.ts doctor --agent gemini --scope local
bun ./src/cli.ts doctor --agent letta-code --scope local
```
