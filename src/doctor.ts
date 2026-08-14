import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { resolveCommandArtifact, resolveRoot, resolveSkillArtifact } from "./adapters";
import type { DoctorCheck, DoctorResult, InstallReceipt, InstallScope, ScopedAgent } from "./types";

function receiptPath(root: string, agent: ScopedAgent, scope: InstallScope): string {
  return join(root, ".mahiro-skills", "receipts", `${scope}-${agent}.json`);
}

function checkAgyAlias(checks: DoctorCheck[], skill: string, skillPath: string): void {
  const skillFilePath = join(skillPath, "SKILL.md");
  const content = existsSync(skillFilePath) ? readFileSync(skillFilePath, "utf8") : "";

  checks.push(
    {
      label: `skill-alias-name:${skill}`,
      ok: new RegExp(`^name: mh-${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").test(content),
      detail: `Expected Agy alias name mh-${skill}`,
    },
    {
      label: `skill-alias-user-only:${skill}`,
      ok: /^disable-model-invocation:\s*true\s*$/m.test(content),
      detail: "Expected disable-model-invocation: true",
    },
    {
      label: `skill-alias-slash-enabled:${skill}`,
      ok: !/^disable-slash-command\s*:/m.test(content),
      detail: "Expected no disable-slash-command field",
    },
  );
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
      const skillPath = join(root, resolveSkillArtifact(agent, skill).targetRelativePath);
      checks.push({
        label: `skill:${skill}`,
        ok: existsSync(skillPath),
        detail: skillPath,
      });

      if (agent === "agy" && existsSync(skillPath)) {
        checkAgyAlias(checks, skill, skillPath);
      }
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
