import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { resolveRoot } from "./adapters";
import type { InstalledSummary, InstallReceipt, InstallScope, ScopedAgent, SupportedAgent } from "./types";

const installedAgents: SupportedAgent[] = ["opencode", "claude-code", "cursor", "gemini"];
const installedScopes: InstallScope[] = ["local", "global"];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
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
        installed: unique([...receipt.installedSkills, ...receipt.installedCommands]).sort(),
      });
    }
  }

  return summaries;
}
