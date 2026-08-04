# Multi-agent install example

Use multi-agent planning when you want the same skill set available across multiple agent runtimes.

## Preview Cursor, Gemini, Letta Code, and Pi targets

```bash
bun ./src/cli.ts plan project --agent cursor --agent gemini --agent letta-code --agent pi --scope local
```

Equivalent comma-separated form:

```bash
bun ./src/cli.ts plan project --agent cursor,gemini,letta-code,pi --scope local
```

## Install

```bash
bun ./src/cli.ts install project --agent cursor,gemini,letta-code,pi --scope local
```

Expected local targets:

- `.cursor/skills/project/...`
- `.cursor/commands/project.md`
- `.gemini/skills/project/...`
- `.gemini/commands/mh-project.toml`
- `.agents/skills/project/...`
- `.pi/skills/project/...`

## Verify

```bash
bun ./src/cli.ts doctor --agent cursor --scope local
bun ./src/cli.ts doctor --agent gemini --scope local
bun ./src/cli.ts doctor --agent letta-code --scope local
bun ./src/cli.ts doctor --agent pi --scope local
```

Pi and Letta Code are skills-only targets. Pi discovers the installed tree and exposes `/skill:project`; it does not receive a copied `commands/project.md` artifact. For an isolated global Pi runtime, set `PI_CODING_AGENT_DIR` to that runtime's agent config directory before planning, installing, listing, updating, uninstalling, or running doctor.
