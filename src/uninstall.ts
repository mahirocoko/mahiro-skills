import { lstatSync, rmSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

import { resolveCommandArtifact, resolveRoot, resolveSkillArtifact } from "./adapters";
import { listInstalled, receiptPath } from "./list";
import { packagedDependents } from "./skill-dependencies";
import type { InstallReceipt, InstallScope, InstallUnitKind, ScopedAgent, SkippedItem, UninstalledTarget, UninstallResult, UninstallStatus } from "./types";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function sortNames(values: string[]): string[] {
  return unique(values).sort();
}

function resolveTarget(root: string, agent: ScopedAgent, kind: InstallUnitKind, item: string): string {
  if (kind === "skill") {
    return join(root, resolveSkillArtifact(agent, item).targetRelativePath);
  }

  return join(root, resolveCommandArtifact(agent, item).targetRelativePath);
}

function resolveRequested(receipt: InstallReceipt, items: string[]): { skills: string[]; commands: string[]; skipped: SkippedItem[] } {
  const requested = items.length > 0 ? sortNames(items) : sortNames([...receipt.installedSkills, ...receipt.installedCommands]);
  const receiptSkills = new Set(receipt.installedSkills);
  const receiptCommands = new Set(receipt.installedCommands);
  const skills: string[] = [];
  const commands: string[] = [];
  const skipped: SkippedItem[] = [];

  for (const item of requested) {
    const hasSkill = receiptSkills.has(item);
    const hasCommand = receiptCommands.has(item);

    if (hasSkill) {
      skills.push(item);
    }

    if (hasCommand) {
      commands.push(item);
    }

    if (!hasSkill && !hasCommand) {
      skipped.push({
        item,
        kind: "item",
        reason: `Item '${item}' is not recorded in the ${receipt.agent} (${receipt.scope}) install receipt.`,
      });
    }
  }

  return {
    skills: sortNames(skills),
    commands: sortNames(commands),
    skipped,
  };
}

function removeInstallPath(target: string): boolean {
  try {
    if (lstatSync(target).isSymbolicLink()) {
      unlinkSync(target);
      return true;
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return false;
    }
    throw error;
  }

  rmSync(target, { recursive: true, force: true });
  return true;
}

function removeTarget(root: string, agent: ScopedAgent, kind: InstallUnitKind, item: string): UninstalledTarget {
  const target = resolveTarget(root, agent, kind, item);
  const removed = removeInstallPath(target);

  return {
    item,
    kind,
    target,
    removed,
  };
}

function dependencyBlock(receipt: InstallReceipt, skills: string[]): SkippedItem | null {
  const removing = new Set(skills);

  for (const skill of skills) {
    for (const dependent of packagedDependents(skill)) {
      if (receipt.installedSkills.includes(dependent) && !removing.has(dependent)) {
        return {
          item: skill,
          kind: "skill",
          reason: `Cannot uninstall '${skill}' while receipt-managed '${dependent}' remains installed. Uninstall '${dependent}' as well, or uninstall all receipt items.`,
        };
      }
    }
  }

  return null;
}

function writeNextReceipt(path: string, receipt: InstallReceipt, removedSkills: string[], removedCommands: string[]): boolean {
  const removedSkillSet = new Set(removedSkills);
  const removedCommandSet = new Set(removedCommands);
  const nextReceipt: InstallReceipt = {
    ...receipt,
    installedSkills: receipt.installedSkills.filter((item) => !removedSkillSet.has(item)),
    installedCommands: receipt.installedCommands.filter((item) => !removedCommandSet.has(item)),
    targetStates: receipt.targetStates?.filter((state) => (
      state.kind === "skill" ? !removedSkillSet.has(state.name) : !removedCommandSet.has(state.name)
    )),
  };

  if (nextReceipt.installedSkills.length === 0 && nextReceipt.installedCommands.length === 0) {
    rmSync(path, { force: true });
    return true;
  }

  writeFileSync(path, JSON.stringify(nextReceipt, null, 2));
  return false;
}

function resolveStatus(targets: UninstalledTarget[], skipped: SkippedItem[]): UninstallStatus {
  const uninstalledCount = targets.length;

  if (uninstalledCount > 0 && skipped.length > 0) {
    return "partially-uninstalled";
  }

  if (uninstalledCount > 0) {
    return "uninstalled";
  }

  return "skipped";
}

export function uninstall(agent: ScopedAgent, scope: InstallScope, items: string[], env = process.env): UninstallResult {
  const root = resolveRoot(agent, scope, env);
  const path = receiptPath(root, agent, scope);
  const receipt = listInstalled(agent, scope, env);

  if (!receipt) {
    return {
      status: "skipped",
      agent,
      scope,
      root,
      uninstalled: [],
      targets: [],
      skipped: [{ item: items.length > 0 ? items.join(",") : "all", kind: "item", reason: `No install receipt found for ${agent} (${scope}).` }],
      receiptPath: path,
      receiptRemoved: false,
    };
  }

  const requested = resolveRequested(receipt, items);
  const blocked = dependencyBlock(receipt, requested.skills);
  if (blocked) {
    return {
      status: "skipped",
      agent,
      scope,
      root,
      uninstalled: [],
      targets: [],
      skipped: [...requested.skipped, blocked],
      receiptPath: path,
      receiptRemoved: false,
    };
  }

  const targets = [
    ...requested.skills.map((item) => removeTarget(root, agent, "skill", item)),
    ...requested.commands.map((item) => removeTarget(root, agent, "command", item)),
  ];
  const receiptRemoved = targets.length > 0 ? writeNextReceipt(path, receipt, requested.skills, requested.commands) : false;

  return {
    status: resolveStatus(targets, requested.skipped),
    agent,
    scope,
    root,
    uninstalled: sortNames([...requested.skills, ...requested.commands]),
    targets,
    skipped: requested.skipped,
    receiptPath: path,
    receiptRemoved,
  };
}
