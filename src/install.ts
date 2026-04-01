import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "fs";
import { dirname, extname, join } from "path";

import { createPlan } from "./plan";
import type { InstallReceipt, InstallResult, InstallScope, InstallTarget, PlanStatus, ScopedAgent } from "./types";

const installedDescriptionPrefix = "Mahiro Skill | ";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function prefixFrontmatterDescription(content: string): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return content;
  }

  const nextContent = frontmatterMatch[0].replace(/^description:\s+(.*)$/m, (_match, description: string) => {
    if (description.startsWith(installedDescriptionPrefix)) {
      return `description: ${description}`;
    }

    return `description: ${installedDescriptionPrefix}${description}`;
  });

  return content.replace(frontmatterMatch[0], nextContent);
}

function prefixTomlDescription(content: string): string {
  return content.replace(/^description\s*=\s*"([^"]*)"/m, (_match, description: string) => {
    if (description.startsWith(installedDescriptionPrefix)) {
      return `description = "${description}"`;
    }

    return `description = "${installedDescriptionPrefix}${description}"`;
  });
}

function rewriteInstalledDescription(stagingPath: string, targetPath: string): void {
  const stats = statSync(stagingPath);
  if (stats.isDirectory()) {
    const markdownPath = join(stagingPath, "SKILL.md");
    const content = readFileSync(markdownPath, "utf8");
    const nextContent = prefixFrontmatterDescription(content);

    if (nextContent !== content) {
      writeFileSync(markdownPath, nextContent);
    }

    return;
  }

  const content = readFileSync(stagingPath, "utf8");
  const extension = extname(targetPath);
  const nextContent = extension === ".toml" ? prefixTomlDescription(content) : prefixFrontmatterDescription(content);

  if (nextContent !== content) {
    writeFileSync(stagingPath, nextContent);
  }
}

function copyTarget(target: InstallTarget, overwrite: boolean): void {
  if (target.collision && !overwrite) {
    throw new Error(`Collision detected at '${target.target}'. Re-run with --overwrite to replace it.`);
  }

  ensureParent(target.target);
  const stagingPath = `${target.target}.tmp-mahiro-skills`;
  rmSync(stagingPath, { recursive: true, force: true });
  cpSync(target.source, stagingPath, { recursive: true });
  rewriteInstalledDescription(stagingPath, target.target);

  if (overwrite && existsSync(target.target)) {
    rmSync(target.target, { recursive: true, force: true });
  }

  renameSync(stagingPath, target.target);
}

function resolveStatus(installedCount: number, skippedCount: number): PlanStatus {
  if (installedCount > 0 && skippedCount > 0) {
    return "partially-installed";
  }

  if (installedCount > 0) {
    return "installed";
  }

  return skippedCount > 0 ? "skipped" : "unsupported";
}

function writeReceipt(agent: ScopedAgent, scope: InstallScope, root: string, description: string | undefined, installedSkills: string[], installedCommands: string[], repoRoot: string): string {
  const receiptPath = join(root, ".mahiro-skills", "receipts", `${scope}-${agent}.json`);
  ensureParent(receiptPath);

  const receipt: InstallReceipt = {
    agent,
    scope,
    root,
    description,
    sourceRepoPath: repoRoot,
    installedSkills,
    installedCommands,
    installedAt: new Date().toISOString(),
  };

  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  return receiptPath;
}

export function install(agent: ScopedAgent, scope: InstallScope, items: string[], overwrite: boolean, env = process.env): InstallResult {
  const plan = createPlan(agent, scope, items, env);
  const sourceRepoPath = env.MAHIRO_SKILLS_REPO_ROOT || readRepoRoot();

  if (!overwrite) {
    const collision = [...plan.skills, ...plan.commands].find((entry) => entry.collision);
    if (collision) {
      throw new Error(`Collision detected at '${collision.target}'. Re-run with --overwrite to replace it.`);
    }
  }

  for (const target of [...plan.skills, ...plan.commands]) {
    copyTarget(target, overwrite);
  }

  const installedSkills = plan.skills.map((entry) => entry.name);
  const installedCommands = plan.commands.map((entry) => entry.name);
  const receiptPath = writeReceipt(agent, scope, plan.root, plan.description, installedSkills, installedCommands, sourceRepoPath);

  return {
    status: resolveStatus(installedSkills.length + installedCommands.length, plan.skipped.length),
    agent,
    scope,
    root: plan.root,
    description: plan.description,
    installed: unique([...installedSkills, ...installedCommands]),
    skipped: plan.skipped,
    warnings: plan.warnings,
    receiptPath,
  };
}

export function readRepoRoot(): string {
  const packageJsonPath = join(import.meta.dir, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { name: string };
  if (packageJson.name !== "mahiro-skills") {
    throw new Error("Unable to resolve mahiro-skills repo root.");
  }
  return join(import.meta.dir, "..");
}
