import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { resolveCommandArtifact, resolveRoot } from "./adapters";
import type { DoctorCheck, DoctorResult, InstallReceipt, InstallScope, ScopedAgent } from "./types";

function receiptPath(root: string, agent: ScopedAgent, scope: InstallScope): string {
  return join(root, ".mahiro-skills", "receipts", `${scope}-${agent}.json`);
}

function checkScope(agent: ScopedAgent, scope: InstallScope, env = process.env): DoctorResult {
  const root = resolveRoot(agent, scope, env);
  const checks: DoctorCheck[] = [];

  checks.push({
    label: "root-resolved",
    ok: root.length > 0,
    detail: root,
  });

  const path = receiptPath(root, agent, scope);
  const hasReceipt = existsSync(path);
  checks.push({
    label: "receipt-readable",
    ok: hasReceipt,
    detail: hasReceipt ? path : "Receipt not found",
  });

  if (hasReceipt) {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as InstallReceipt;

    for (const skill of receipt.installedSkills) {
      const skillPath = join(root, "skills", skill);
      checks.push({
        label: `skill:${skill}`,
        ok: existsSync(skillPath),
        detail: skillPath,
      });
    }

    for (const command of receipt.installedCommands) {
      const commandPath = join(root, resolveCommandArtifact(agent, command).targetRelativePath);
      checks.push({
        label: `command:${command}`,
        ok: existsSync(commandPath),
        detail: commandPath,
      });
    }
  }

  return { agent, scope, root, checks };
}

export function doctor(agent: ScopedAgent, scope: InstallScope | undefined, env = process.env): DoctorResult[] {
  if (scope) {
    return [checkScope(agent, scope, env)];
  }

  return [checkScope(agent, "local", env), checkScope(agent, "global", env)];
}
