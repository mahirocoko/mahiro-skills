import { existsSync } from "fs";
import { join } from "path";

import { resolveRoot, supportsCommands } from "./adapters";
import { getRepoInventory } from "./repo";
import type { InstallPlan, InstallScope, InstallTarget, RepoInventory, ScopedAgent, SkippedItem } from "./types";

function makeTarget(root: string, name: string, kind: "skill" | "command", sourceRoot: string): InstallTarget {
  const source = kind === "skill" ? join(sourceRoot, "skills", name) : join(sourceRoot, "commands", `${name}.md`);
  const target = kind === "skill" ? join(root, "skills", name) : join(root, "commands", `${name}.md`);

  return {
    name,
    kind,
    source,
    target,
    action: "copy",
    collision: existsSync(target),
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function resolveRequestedItems(inventory: RepoInventory, items: string[], agent: ScopedAgent): { skills: string[]; commands: string[]; skipped: SkippedItem[]; warnings: string[]; description?: string } {
  const warnings: string[] = [];
  const skipped: SkippedItem[] = [];
  const resolvedSkills: string[] = [];
  const resolvedCommands: string[] = [];
  let description: string | undefined;

  if (items.length === 0 && inventory.bundles.length === 0) {
    warnings.push("Bundle metadata missing; fell back to all packaged skills and supported commands.");
    resolvedSkills.push(...inventory.skills);
    if (supportsCommands(agent)) {
      resolvedCommands.push(...inventory.commands);
    }

    return {
      skills: unique(resolvedSkills),
      commands: unique(resolvedCommands),
      skipped,
      warnings,
      description,
    };
  }

  const requestedItems = items.length > 0 ? items : [inventory.defaultBundle?.name ?? "fallback-all"];

  for (const item of requestedItems) {
    const bundle = inventory.bundles.find((entry) => entry.name === item);
    if (bundle) {
      if (requestedItems.length === 1) {
        description = bundle.description;
      }
      resolvedSkills.push(...bundle.skills.filter((name) => inventory.skills.includes(name)));
      if (supportsCommands(agent)) {
        resolvedCommands.push(...bundle.commands.filter((name) => inventory.commands.includes(name)));
      }
      continue;
    }

    const isSkill = inventory.skills.includes(item);
    const isCommand = inventory.commands.includes(item);

    if (isSkill) {
      resolvedSkills.push(item);
      if (isCommand && supportsCommands(agent)) {
        resolvedCommands.push(item);
      }
      continue;
    }

    if (isCommand) {
      if (supportsCommands(agent)) {
        resolvedCommands.push(item);
      } else {
        skipped.push({ item, kind: "command", reason: `Agent '${agent}' does not support commands in v0.` });
      }
      continue;
    }

    if (item === "template") {
      skipped.push({
        item,
        kind: "item",
        reason: "'template' is an authoring scaffold and is not installable in v0.",
      });
      continue;
    }

    throw new Error(`Unknown install item '${item}'.`);
  }
  return {
    skills: unique(resolvedSkills),
    commands: unique(resolvedCommands),
    skipped,
    warnings,
    description,
  };
}

export function createPlan(agent: ScopedAgent, scope: InstallScope, items: string[], env = process.env): InstallPlan {
  const inventory = getRepoInventory(env.MAHIRO_SKILLS_REPO_ROOT);
  const root = resolveRoot(agent, scope, env);
  const resolved = resolveRequestedItems(inventory, items, agent);

  const skills = resolved.skills.map((name) => makeTarget(root, name, "skill", inventory.repoRoot));
  const commands = resolved.commands.map((name) => makeTarget(root, name, "command", inventory.repoRoot));

  return {
    agent,
    scope,
    root,
    requested: items,
    description: resolved.description,
    skills,
    commands,
    skipped: resolved.skipped,
    warnings: resolved.warnings,
  };
}
