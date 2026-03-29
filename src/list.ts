import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { resolveRoot } from "./adapters";
import type { InstallReceipt, InstallScope, ScopedAgent } from "./types";

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
