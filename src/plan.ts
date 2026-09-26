import { existsSync, lstatSync } from "fs";
import { join } from "path";

import { resolveCommandArtifact, resolveRoot, resolveSkillArtifact, supportsCommands } from "./adapters";
import { getRepoInventory } from "./repo";
import { packagedSkillDependencies } from "./skill-dependencies";
import { hasRetiredGeminiReceipt, retiredGeminiReceiptPath } from "./retired-gemini";
import type { InstallPlan, InstallScope, InstallTarget, RepoInventory, ScopedAgent, SkippedItem } from "./types";

function hasNonLinkCollision(target: string): boolean {
  try {
    return !lstatSync(target).isSymbolicLink();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function makeTarget(root: string, name: string, kind: "skill" | "command", sourceRoot: string, agent: ScopedAgent): InstallTarget {
  const source = kind === "skill"
    ? join(sourceRoot, "skills", name)
    : join(sourceRoot, resolveCommandArtifact(agent, name).sourceRelativePath);
  const target = kind === "skill"
    ? join(root, resolveSkillArtifact(agent, name).targetRelativePath)
    : join(root, resolveCommandArtifact(agent, name).targetRelativePath);

  if (!existsSync(source)) {
    throw new Error(`Missing packaged ${kind} source '${source}'.`);
  }

  return {
    name,
    kind,
    source,
    target,
    action: "copy",
    collision: hasNonLinkCollision(target),
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

// Dependency keys are packaged source identities. Adapter naming, including Agy `mh-*`, is applied by makeTarget.
function expandPackagedSkillDependencies(skills: readonly string[], inventory: RepoInventory): string[] {
  const expanded: string[] = [];
  const seen = new Set<string>();

  const visit = (name: string): void => {
    if (seen.has(name)) {
      return;
    }
    seen.add(name);
    for (const dependency of packagedSkillDependencies[name] ?? []) {
      if (!inventory.skills.includes(dependency)) {
        throw new Error(`Packaged skill '${name}' depends on missing skill '${dependency}'.`);
      }
      visit(dependency);
    }
    expanded.push(name);
  };

  for (const name of skills) {
    visit(name);
  }
  return expanded;
}

function adaptDescriptionForAgent(description: string | undefined, agent: ScopedAgent): string | undefined {
  if (!description || supportsCommands(agent)) {
    return description;
  }

  const skillsDescription = description.replace(" plus agent-native command entrypoints", "").replace(/\.$/, "");
  if (agent === "agy") {
    return `${skillsDescription}; 'agy' installs only namespaced /mh-* Agent Skill aliases and does not copy command wrappers.`;
  }

  return `${skillsDescription}; '${agent}' installs Agent Skills only and does not copy command wrappers.`;
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

    return finishResolved(inventory, agent, resolvedSkills, resolvedCommands, skipped, warnings, description);
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
  return finishResolved(inventory, agent, resolvedSkills, resolvedCommands, skipped, warnings, description);
}

function finishResolved(
  inventory: RepoInventory,
  agent: ScopedAgent,
  resolvedSkills: string[],
  resolvedCommands: string[],
  skipped: SkippedItem[],
  warnings: string[],
  description: string | undefined,
): { skills: string[]; commands: string[]; skipped: SkippedItem[]; warnings: string[]; description?: string } {
  const skills = expandPackagedSkillDependencies(resolvedSkills, inventory);
  const commands = [...resolvedCommands];
  if (supportsCommands(agent)) {
    for (const skill of skills) {
      if (inventory.commands.includes(skill)) {
        commands.push(skill);
      }
    }
  }

  return {
    skills,
    commands: unique(commands),
    skipped,
    warnings,
    description,
  };
}

export function createPlan(agent: ScopedAgent, scope: InstallScope, items: string[], env = process.env): InstallPlan {
  const inventory = getRepoInventory(env.MAHIRO_SKILLS_REPO_ROOT);
  const root = resolveRoot(agent, scope, env);
  const resolved = resolveRequestedItems(inventory, items, agent);

  if (agent === "agy" && hasRetiredGeminiReceipt(scope, env)) {
    resolved.warnings.push(
      `Retired Gemini CLI receipt detected at '${retiredGeminiReceiptPath(scope, env)}'; install removes only unchanged receipt-managed canonical targets so Agy exposes the /mh-* aliases.`,
    );
  }

  const skills = resolved.skills.map((name) => makeTarget(root, name, "skill", inventory.repoRoot, agent));
  const commands = resolved.commands.map((name) => makeTarget(root, name, "command", inventory.repoRoot, agent));

  return {
    agent,
    scope,
    root,
    requested: items,
    description: adaptDescriptionForAgent(resolved.description, agent),
    skills,
    commands,
    skipped: resolved.skipped,
    warnings: resolved.warnings,
  };
}
