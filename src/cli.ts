#!/usr/bin/env bun
import { createPlan } from "./plan";
import { install } from "./install";
import { listInstalled } from "./list";
import { doctor } from "./doctor";
import { runGuided } from "./guided";
import { createPromptIO } from "./prompt";
import { supportedAgents, type CliOptions, type InstallScope, type ScopedAgent } from "./types";

const VALID_CLI_AGENTS = new Set<ScopedAgent>(supportedAgents);

function pushAgentTokens(agents: ScopedAgent[], raw: string): void {
  for (const part of raw.split(",")) {
    const token = part.trim();
    if (token.length === 0) {
      continue;
    }

    if (!VALID_CLI_AGENTS.has(token as ScopedAgent)) {
      throw new Error(`Unsupported agent '${token}'.`);
    }

    agents.push(token as ScopedAgent);
  }
}

function dedupeAgents(agents: ScopedAgent[]): ScopedAgent[] {
  return [...new Set(agents)];
}

function requireAgents(options: CliOptions): ScopedAgent[] {
  if (options.agents.length === 0) {
    throw new Error("Missing required flag --agent.");
  }

  return options.agents;
}

function requireScope(options: CliOptions): InstallScope {
  if (!options.scope) {
    throw new Error("Missing required flag --scope.");
  }

  return options.scope;
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.length === 0) {
    return {
      command: "tui",
      items: [],
      agents: [],
      overwrite: false,
      yes: false,
    };
  }

  const [commandRaw, ...rest] = argv;
  if (!["plan", "install", "list", "doctor", "guided", "tui"].includes(commandRaw)) {
    throw new Error(`Unsupported command '${commandRaw}'.`);
  }

  const agents: ScopedAgent[] = [];
  let scope: InstallScope | undefined;
  let overwrite = false;
  let mode: CliOptions["mode"];
  let yes = false;
  const items: string[] = [];

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === "--agent") {
      const next = rest[i + 1];
      if (next === undefined) {
        throw new Error("Missing value for --agent.");
      }

      pushAgentTokens(agents, next);
      i += 1;
      continue;
    }
    if (token === "--scope") {
      scope = rest[i + 1] as InstallScope;
      i += 1;
      continue;
    }
    if (token === "--overwrite") {
      overwrite = true;
      continue;
    }
    if (token === "--mode") {
      const nextMode = rest[i + 1];
      if (nextMode !== "plan" && nextMode !== "install" && nextMode !== "list") {
        throw new Error(`Unsupported guided mode '${nextMode}'.`);
      }
      mode = nextMode;
      i += 1;
      continue;
    }
    if (token === "--yes") {
      yes = true;
      continue;
    }

    items.push(token);
  }

  const resolvedAgents = dedupeAgents(agents);

  if (commandRaw !== "guided" && commandRaw !== "tui" && resolvedAgents.length === 0) {
    throw new Error("Missing required flag --agent.");
  }

  if (commandRaw !== "doctor" && commandRaw !== "guided" && commandRaw !== "tui" && !scope) {
    throw new Error("Missing required flag --scope.");
  }

  return {
    command: commandRaw as CliOptions["command"],
    items,
    agents: resolvedAgents,
    scope,
    overwrite,
    mode,
    yes,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  switch (options.command) {
    case "plan": {
      const agents = requireAgents(options);
      const scope = requireScope(options);
      const plans = agents.map((agent) => createPlan(agent, scope, options.items));
      console.log(JSON.stringify(plans.length === 1 ? plans[0] : plans, null, 2));
      return;
    }
    case "install": {
      const agents = requireAgents(options);
      const scope = requireScope(options);
      const results = agents.map((agent) => install(agent, scope, options.items, options.overwrite));
      console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
      return;
    }
    case "list": {
      const agents = requireAgents(options);
      const scope = requireScope(options);
      const receipts = agents.map((agent) => {
        const receipt = listInstalled(agent, scope);
        return receipt ?? { agent, scope, installedSkills: [], installedCommands: [] };
      });
      console.log(JSON.stringify(receipts.length === 1 ? receipts[0] : receipts, null, 2));
      return;
    }
    case "doctor": {
      const agents = requireAgents(options);
      const results = agents.flatMap((agent) => doctor(agent, options.scope));
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    case "guided":
    case "tui": {
      const io = createPromptIO();
      const result = await runGuided(options, process.env, io);
      if (!io.isInteractive) {
        console.log(JSON.stringify(result, null, 2));
      }
      return;
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
