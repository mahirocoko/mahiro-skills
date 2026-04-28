import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { resolveRoot } from "./adapters";
import { supportedAgents, type InstalledSummary, type InstallReceipt, type InstallScope, type ScopedAgent } from "./types";

const installedAgents = supportedAgents;
const installedScopes: InstallScope[] = ["local", "global"];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function sortNames(values: string[]): string[] {
  return unique(values).sort();
}

function receiptPath(root: string, agent: ScopedAgent, scope: InstallScope): string {
  return join(root, ".mahiro-skills", "receipts", `${scope}-${agent}.json`);
}

export function listInstalled(agent: ScopedAgent, scope: InstallScope, env = process.env): InstallReceipt | null {
  const root = resolveRoot(agent, scope, env);
  const path = receiptPath(root, agent, scope);
  if (!existsSync(path)) {
    return null;
  }

  return JSON.parse(readFileSync(path, "utf8")) as InstallReceipt;
}

export function listInstalledSummaries(env = process.env): InstalledSummary[] {
  const summaries: InstalledSummary[] = [];

  for (const agent of installedAgents) {
    for (const scope of installedScopes) {
      const receipt = listInstalled(agent, scope, env);
      if (!receipt) {
        continue;
      }

      summaries.push({
        agent,
        scope,
        installedSkills: sortNames(receipt.installedSkills),
        installedCommands: sortNames(receipt.installedCommands),
        installed: sortNames([...receipt.installedSkills, ...receipt.installedCommands]),
      });
    }
  }

  return summaries;
}
