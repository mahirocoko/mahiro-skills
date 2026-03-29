#!/usr/bin/env bun
import { createPlan } from "./plan";
import { install } from "./install";
import { listInstalled } from "./list";
import { doctor } from "./doctor";
import type { CliOptions, InstallScope, ScopedAgent } from "./types";

function parseArgs(argv: string[]): CliOptions {
  if (argv.length === 0) {
    throw new Error("Missing command. Use: plan | install | list | doctor");
  }

  const [commandRaw, ...rest] = argv;
  if (!["plan", "install", "list", "doctor"].includes(commandRaw)) {
    throw new Error(`Unsupported command '${commandRaw}'.`);
  }

  let agent: ScopedAgent | undefined;
  let scope: InstallScope | undefined;
  let overwrite = false;
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

    items.push(token);
  }

  if (!agent) {
    throw new Error("Missing required flag --agent.");
  }

  if (commandRaw !== "doctor" && !scope) {
    throw new Error("Missing required flag --scope.");
  }

  return {
    command: commandRaw as CliOptions["command"],
    items,
    agent,
    scope,
    overwrite,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  switch (options.command) {
    case "plan": {
      console.log(JSON.stringify(createPlan(options.agent, options.scope as InstallScope, options.items), null, 2));
      return;
    }
    case "install": {
      console.log(JSON.stringify(install(options.agent, options.scope as InstallScope, options.items, options.overwrite), null, 2));
      return;
    }
    case "list": {
      const receipt = listInstalled(options.agent, options.scope as InstallScope);
      console.log(JSON.stringify(receipt ?? { agent: options.agent, scope: options.scope, installedSkills: [], installedCommands: [] }, null, 2));
      return;
    }
    case "doctor": {
      console.log(JSON.stringify(doctor(options.agent, options.scope), null, 2));
      return;
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
