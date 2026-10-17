import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, renameSync, rmSync, statSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { dirname, join, relative } from "path";

import { hashPath, hashSkillPayload } from "./content-hash";
import { cleanupPiCommandAliases } from "./adapters";
import { includeSkillPayload } from "./skill-payload";
import { createPlan } from "./plan";
import { listInstalled } from "./list";
import { cleanupRetiredGeminiInstall } from "./retired-gemini";
import type { InstallPlan, InstallReceipt, InstallReceiptTargetState, InstallResult, InstallScope, InstallTarget, PlanStatus, ScopedAgent } from "./types";

function reviewPathIdentity(path: string): unknown {
  try {
    const stats = lstatSync(path);
    if (stats.isSymbolicLink()) {
      // Replacement owns the link, not its referent; do not read outside that boundary.
      return { link: readlinkSync(path), mode: stats.mode };
    }
    return hashPath(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function reviewReceiptIdentity(path: string): unknown {
  let stats;
  try {
    stats = lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (!stats.isFile() && !stats.isSymbolicLink()) {
    throw new Error("Install receipt must be a readable file.");
  }
  // Receipt reading is already required; hash that exact file, never a referent tree.
  return {
    link: stats.isSymbolicLink() ? readlinkSync(path) : undefined,
    mode: stats.mode,
    contentHash: createHash("sha256").update(readFileSync(path)).digest("hex"),
  };
}

/** Review identity includes raw receipt bytes, not merely its parsed policy labels. */
export function installReviewIdentity(plan: InstallPlan): string {
  return JSON.stringify({
    agent: plan.agent,
    scope: plan.scope,
    root: plan.root,
    requested: plan.requested,
    receipt: reviewReceiptIdentity(join(plan.root, ".mahiro-skills", "receipts", `${plan.scope}-${plan.agent}.json`)),
    targets: [...plan.skills, ...plan.commands].map((target) => ({
      ...target,
      sourceHash: target.kind === "skill" ? hashSkillPayload(target.source) : hashPath(target.source),
      installedHash: reviewPathIdentity(target.target),
    })),
  });
}

export interface InstallFailureEvidence {
  agent: ScopedAgent;
  scope: InstallScope;
  targets: { name: string; kind: InstallTarget["kind"]; target: string; status: "changed" | "unchanged" | "not-attempted" | "unknown"; inspectionError?: string; recoveryPath?: string }[];
  receiptSync: "not-needed" | "synced" | "failed";
  receiptError?: string;
}

export class InstallFailure extends Error {
  constructor(
    message: string,
    readonly evidence: InstallFailureEvidence,
  ) {
    super(`${message}\nInstall progress: ${JSON.stringify(evidence)}`);
    this.name = "InstallFailure";
  }
}

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

function rewriteAgySkillFrontmatter(content: string, name: string): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error(`Agy skill '${name}' is missing YAML frontmatter.`);
  }

  const lines = frontmatterMatch[1].split("\n").filter((line) => !/^disable-slash-command\s*:/.test(line));
  let hasName = false;
  let hasModelInvocation = false;
  const rewritten = lines.map((line) => {
    if (/^name\s*:/.test(line)) {
      hasName = true;
      return `name: mh-${name}`;
    }

    if (/^disable-model-invocation\s*:/.test(line)) {
      hasModelInvocation = true;
      return "disable-model-invocation: true";
    }

    return line;
  });

  if (!hasName) {
    throw new Error(`Agy skill '${name}' frontmatter is missing its name field.`);
  }

  if (!hasModelInvocation) {
    rewritten.push("disable-model-invocation: true");
  }

  const nextFrontmatter = `---\n${rewritten.join("\n")}\n---`;
  return content.replace(frontmatterMatch[0], nextFrontmatter);
}

function rewriteInstalledTarget(stagingPath: string, agent: ScopedAgent, target: InstallTarget): void {
  const stats = statSync(stagingPath);
  if (stats.isDirectory()) {
    const markdownPath = join(stagingPath, "SKILL.md");
    const content = readFileSync(markdownPath, "utf8");
    const adaptedContent =
      agent === "agy" && target.kind === "skill"
        ? rewriteAgySkillFrontmatter(content, target.name)
        : agent === "pi" && target.kind === "skill"
          ? // Pi exposes native /skill:name; trigger is not a skill field.
            content.replace(/^---\n([\s\S]*?)\n---/, (frontmatter) => frontmatter.replace(/^trigger:[^\n]*\n/gm, ""))
          : content;
    const nextContent = prefixFrontmatterDescription(adaptedContent);

    if (nextContent !== content) {
      writeFileSync(markdownPath, nextContent);
    }

    return;
  }

  const content = readFileSync(stagingPath, "utf8");
  const nextContent = prefixFrontmatterDescription(content);

  if (nextContent !== content) {
    writeFileSync(stagingPath, nextContent);
  }
}

interface StagedTarget {
  target: InstallTarget;
  directory: string;
  payload: string;
  sourceHash: string;
  installedHash: string;
}

function stageTarget(target: InstallTarget, agent: ScopedAgent, directories: string[]): StagedTarget {
  ensureParent(target.target);
  const directory = mkdtempSync(join(dirname(target.target), ".mahiro-stage-"));
  directories.push(directory);
  const payload = join(directory, "payload");
  const sourceHash = target.kind === "skill" ? hashSkillPayload(target.source) : hashPath(target.source);
  cpSync(target.source, payload, {
    recursive: true,
    filter: target.kind === "skill" ? (source) => includeSkillPayload(relative(target.source, source), lstatSync(source).isDirectory()) : undefined,
  });
  if (!sourceHash || hashPath(payload) !== sourceHash) {
    throw new Error(`Source changed while staging '${target.name}'; review again.`);
  }
  rewriteInstalledTarget(payload, agent, target);
  const installedHash = hashPath(payload);
  if (!installedHash) {
    throw new Error(`Unable to fingerprint staged target '${target.name}'.`);
  }
  return { target, directory, payload, sourceHash, installedHash };
}

function replaceStaged(entry: StagedTarget): void {
  const backup = join(entry.directory, "previous");
  let backedUp = false;
  try {
    // Rename the own path, including symlinks; never follow it for deletion.
    try {
      lstatSync(entry.target.target);
      renameSync(entry.target.target, backup);
      backedUp = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    renameSync(entry.payload, entry.target.target);
  } catch (error) {
    if (backedUp) {
      // If restoration fails, keep the recovery directory and report it.
      try {
        renameSync(backup, entry.target.target);
      } catch (restoreError) {
        throw new Error(`Replacement failed: ${String(error)}; restoration failed: ${String(restoreError)}`);
      }
    }
    throw error;
  }
}

function recoveryBackupMayExist(directory: string): boolean {
  try {
    lstatSync(join(directory, "previous"));
    return true;
  } catch (error) {
    // Preserve uncertain recovery bytes as well as dangling links.
    return (error as NodeJS.ErrnoException).code !== "ENOENT";
  }
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

function mergeTargetStates(existing: InstallReceiptTargetState[], current: InstallReceiptTargetState[]): InstallReceiptTargetState[] {
  const states = new Map(existing.map((state) => [`${state.kind}:${state.name}`, state]));
  for (const state of current) {
    states.set(`${state.kind}:${state.name}`, state);
  }
  return [...states.values()];
}

function writeReceipt(agent: ScopedAgent, scope: InstallScope, root: string, description: string | undefined, installedSkills: string[], installedCommands: string[], targetStates: InstallReceiptTargetState[], repoRoot: string): string {
  const receiptPath = join(root, ".mahiro-skills", "receipts", `${scope}-${agent}.json`);
  ensureParent(receiptPath);

  const receipt: InstallReceipt = {
    schemaVersion: 2,
    agent,
    scope,
    root,
    description,
    sourceRepoPath: repoRoot,
    installedSkills,
    installedCommands,
    targetStates,
    installedAt: new Date().toISOString(),
  };

  const stagingDirectory = mkdtempSync(join(dirname(receiptPath), ".mahiro-receipt-"));
  try {
    const stagedReceipt = join(stagingDirectory, "receipt.json");
    writeFileSync(stagedReceipt, JSON.stringify(receipt, null, 2));
    renameSync(stagedReceipt, receiptPath);
  } finally {
    rmSync(stagingDirectory, { recursive: true, force: true });
  }
  return receiptPath;
}

export function install(agent: ScopedAgent, scope: InstallScope, items: string[], overwrite: boolean, env = process.env, reviewedIdentity?: string): InstallResult {
  const plan = createPlan(agent, scope, items, env);
  const identity = installReviewIdentity(plan);
  if (reviewedIdentity !== undefined && identity !== reviewedIdentity) {
    throw new Error("Install content changed after review; review again before execution.");
  }
  const sourceRepoPath = env.MAHIRO_SKILLS_REPO_ROOT || readRepoRoot();
  const existingReceipt = listInstalled(agent, scope, env);
  const description = plan.description ?? existingReceipt?.description;
  const targets = [...plan.skills, ...plan.commands];
  if (!overwrite) {
    const collision = targets.find((entry) => entry.collision);
    if (collision) {
      throw new Error(`Collision detected at '${collision.target}'. Re-run with --overwrite to replace it.`);
    }
  }

  const directories: string[] = [];
  const completed: StagedTarget[] = [];
  const before = targets.map((target) => hashPath(target.target));
  const reviewedTargets = targets.map((target) => JSON.stringify(reviewPathIdentity(target.target)));
  const reviewedReceiptPath = join(plan.root, ".mahiro-skills", "receipts", `${scope}-${agent}.json`);
  const reviewedReceipt = JSON.stringify(reviewReceiptIdentity(reviewedReceiptPath));
  let attempted = -1;
  let receiptPath: string | undefined;
  let piAliasesRetired = false;
  const synchronize = (): string => {
    if (JSON.stringify(reviewReceiptIdentity(reviewedReceiptPath)) !== reviewedReceipt) {
      throw new Error("Receipt changed during execution; refusing to overwrite concurrent receipt edits.");
    }
    return writeReceipt(
      agent,
      scope,
      plan.root,
      description,
      unique([...(existingReceipt?.installedSkills ?? []), ...completed.filter((entry) => entry.target.kind === "skill").map((entry) => entry.target.name)]),
      piAliasesRetired ? [] : unique([...(existingReceipt?.installedCommands ?? []), ...completed.filter((entry) => entry.target.kind === "command").map((entry) => entry.target.name)]),
      mergeTargetStates(
        // A failed, uncompensated target must not retain a misleading old baseline.
        (existingReceipt?.targetStates ?? [])
          .filter((state) => !(piAliasesRetired && state.kind === "command"))
          .filter((state) => !targets.some((target, index) => index === attempted && hashPath(target.target) !== before[index] && !completed.some((entry) => entry.target === target) && target.name === state.name && target.kind === state.kind)),
        completed.map((entry) => ({ name: entry.target.name, kind: entry.target.kind, sourceHash: entry.sourceHash, installedHash: entry.installedHash })),
      ),
      sourceRepoPath,
    );
  };
  try {
    // Fully copy, adapt and fingerprint every payload before replacing any target.
    const staged = targets.map((target) => stageTarget(target, agent, directories));
    if (installReviewIdentity(plan) !== identity) {
      throw new Error("Install content changed during staging; review again before execution.");
    }
    for (const [index, entry] of staged.entries()) {
      if (JSON.stringify(reviewPathIdentity(entry.target.target)) !== reviewedTargets[index] || JSON.stringify(reviewReceiptIdentity(reviewedReceiptPath)) !== reviewedReceipt) {
        throw new Error("Target or receipt changed before replacement; review again before execution.");
      }
      attempted = index;
      replaceStaged(entry);
      completed.push(entry);
    }
    const piCleanup = agent === "pi" ? cleanupPiCommandAliases(plan.root, existingReceipt, existingReceipt?.installedCommands ?? []) : null;
    piAliasesRetired = agent === "pi";
    receiptPath = synchronize();
    const migrationWarnings = agent === "agy" ? cleanupRetiredGeminiInstall(scope, env).warnings : (piCleanup?.warnings ?? []);
    return {
      status: resolveStatus(targets.length, plan.skipped.length),
      agent,
      scope,
      root: plan.root,
      description,
      installed: unique(targets.map((target) => target.name)),
      skipped: plan.skipped,
      warnings: unique([...plan.warnings, ...migrationWarnings]),
      receiptPath,
    };
  } catch (error) {
    const evidence: InstallFailureEvidence = {
      agent,
      scope,
      targets: targets.map((target, index) => {
        let status: InstallFailureEvidence["targets"][number]["status"] = "not-attempted";
        let inspectionError: string | undefined;
        if (index <= attempted) {
          try {
            status = hashPath(target.target) === before[index] ? "unchanged" : "changed";
          } catch (inspectionFailure) {
            status = completed.some((entry) => entry.target === target) ? "changed" : "unknown";
            inspectionError = String(inspectionFailure);
          }
        }
        return {
          name: target.name,
          kind: target.kind,
          target: target.target,
          status,
          inspectionError,
          recoveryPath: directories[index] && recoveryBackupMayExist(directories[index]!) && !completed.some((entry) => entry.target === target) ? directories[index] : undefined,
        };
      }),
      receiptSync: receiptPath ? "synced" : "not-needed",
    };
    if (!receiptPath && (completed.length > 0 || evidence.targets.some((target) => target.status === "changed" || target.status === "unknown"))) {
      try {
        synchronize();
        evidence.receiptSync = "synced";
      } catch (receiptError) {
        evidence.receiptSync = "failed";
        evidence.receiptError = String(receiptError);
      }
    }
    throw new InstallFailure(error instanceof Error ? error.message : String(error), evidence);
  } finally {
    for (const directory of directories) {
      // Preserve a failed restoration backup rather than destroying recovery bytes.
      if (recoveryBackupMayExist(directory) && !completed.some((entry) => entry.directory === directory)) continue;
      try {
        rmSync(directory, { recursive: true, force: true });
      } catch {
        /* Target/receipt outcome is already reported; staging cleanup is best effort. */
      }
    }
  }
}

export function readRepoRoot(): string {
  const packageJsonPath = join(import.meta.dir, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { name: string };
  if (packageJson.name !== "mahiro-skills") {
    throw new Error("Unable to resolve mahiro-skills repo root.");
  }
  return join(import.meta.dir, "..");
}
