# Multi-agent install example

Use multi-agent planning when you want the same skill set available across multiple agent runtimes.

## Preview Cursor, Agy, Letta Code, and Pi targets

```bash
bun ./src/cli.ts plan project --agent cursor --agent agy --agent letta-code --agent pi --scope local
```

Equivalent comma-separated form:

```bash
bun ./src/cli.ts plan project --agent cursor,agy,letta-code,pi --scope local
```

## Install

```bash
bun ./src/cli.ts install project --agent cursor,agy,letta-code,pi --scope local
```

Expected local targets:

- `.cursor/skills/project/...`
- `.cursor/commands/project.md`
- `.agents/skills/mh-project/...` for Agy's namespaced `/mh-project` alias
- `.agents/skills/project/...`
- `.pi/skills/project/...`

## Verify

```bash
bun ./src/cli.ts doctor --agent cursor --scope local
bun ./src/cli.ts doctor --agent agy --scope local
bun ./src/cli.ts doctor --agent letta-code --scope local
bun ./src/cli.ts doctor --agent pi --scope local
```

Agy, Pi, and Letta Code do not receive copied command-wrapper artifacts. Agy exposes its transformed full skill copy as `/mh-project`; Pi discovers the installed tree as `/skill:project`. For an isolated global Pi runtime, set `PI_CODING_AGENT_DIR` to that runtime's agent config directory before planning, installing, listing, updating, uninstalling, or running doctor.
