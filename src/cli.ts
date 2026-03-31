#!/usr/bin/env bun
import { createPlan } from "./plan";
import { install } from "./install";
import { listInstalled } from "./list";
import { doctor } from "./doctor";
import { runGuided } from "./guided";
import { createPromptIO } from "./prompt";
import type { CliOptions, InstallScope, ScopedAgent } from "./types";

function requireAgent(options: CliOptions): ScopedAgent {
  if (!options.agent) {
    throw new Error("Missing required flag --agent.");
  }

  return options.agent;
}

function requireScope(options: CliOptions): InstallScope {
  if (!options.scope) {
    throw new Error("Missing required flag --scope.");
  }

  return options.scope;
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.length === 0) {
    throw new Error("Missing command. Use: plan | install | list | doctor | guided");
  }

  const [commandRaw, ...rest] = argv;
  if (!["plan", "install", "list", "doctor", "guided"].includes(commandRaw)) {
    throw new Error(`Unsupported command '${commandRaw}'.`);
  }

  let agent: ScopedAgent | undefined;
  let scope: InstallScope | undefined;
  let overwrite = false;
  let mode: CliOptions["mode"];
  let yes = false;
  const items: string[] = [];

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === "--agent") {
      agent = rest[i + 1] as ScopedAgent;
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

  if (commandRaw !== "guided" && !agent) {
    throw new Error("Missing required flag --agent.");
  }

  if (commandRaw !== "doctor" && commandRaw !== "guided" && !scope) {
    throw new Error("Missing required flag --scope.");
  }

  return {
    command: commandRaw as CliOptions["command"],
    items,
    agent,
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
      console.log(JSON.stringify(createPlan(requireAgent(options), requireScope(options), options.items), null, 2));
      return;
    }
    case "install": {
      console.log(JSON.stringify(install(requireAgent(options), requireScope(options), options.items, options.overwrite), null, 2));
      return;
    }
    case "list": {
      const agent = requireAgent(options);
      const scope = requireScope(options);
      const receipt = listInstalled(agent, scope);
      console.log(JSON.stringify(receipt ?? { agent: options.agent, scope: options.scope, installedSkills: [], installedCommands: [] }, null, 2));
      return;
    }
    case "doctor": {
      console.log(JSON.stringify(doctor(requireAgent(options), options.scope), null, 2));
      return;
    }
    case "guided": {
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
