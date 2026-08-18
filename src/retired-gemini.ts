import { existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";

import { hashPath } from "./content-hash";
import type { InstallReceiptTargetState, InstallScope } from "./types";

const SKILL_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

interface RetiredGeminiReceipt {
  schemaVersion?: number;
  agent?: string;
  scope?: string;
  root?: string;
  installedSkills?: unknown;
  installedCommands?: unknown;
  targetStates?: unknown;
}

export interface RetiredGeminiCleanupResult {
  receiptPath: string;
  detected: boolean;
  removed: string[];
  preserved: string[];
  receiptRemoved: boolean;
  warnings: string[];
}

function resolveRetiredRoot(scope: InstallScope, env: NodeJS.ProcessEnv): string | null {
  if (scope === "local") {
    return join(env.MAHIRO_SKILLS_CWD || process.cwd(), ".gemini");
  }

  const home = env.MAHIRO_SKILLS_HOME || env.HOME;
  return home ? join(home, ".gemini") : null;
}

function emptyResult(receiptPath: string): RetiredGeminiCleanupResult {
  return {
    receiptPath,
    detected: false,
    removed: [],
    preserved: [],
    receiptRemoved: false,
    warnings: [],
  };
}

function isTargetState(value: unknown): value is InstallReceiptTargetState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<InstallReceiptTargetState>;
  return typeof state.name === "string"
    && (state.kind === "skill" || state.kind === "command")
    && typeof state.sourceHash === "string"
    && /^[a-f0-9]{64}$/.test(state.sourceHash)
    && typeof state.installedHash === "string"
    && /^[a-f0-9]{64}$/.test(state.installedHash);
}

function targetPath(root: string, state: InstallReceiptTargetState): string {
  return state.kind === "skill"
    ? join(root, "skills", state.name)
    : join(root, "commands", `mh-${state.name}.toml`);
}

export function retiredGeminiReceiptPath(scope: InstallScope, env = process.env): string | null {
  const root = resolveRetiredRoot(scope, env);
  return root ? join(root, ".mahiro-skills", "receipts", `${scope}-gemini.json`) : null;
}

export function hasRetiredGeminiReceipt(scope: InstallScope, env = process.env): boolean {
  const path = retiredGeminiReceiptPath(scope, env);
  return path !== null && existsSync(path);
}

export function cleanupRetiredGeminiInstall(scope: InstallScope, env = process.env): RetiredGeminiCleanupResult {
  const root = resolveRetiredRoot(scope, env);
  const path = retiredGeminiReceiptPath(scope, env);
  if (!root || !path) {
    return emptyResult("");
  }

  const result = emptyResult(path);
  if (!existsSync(path)) {
    return result;
  }
  result.detected = true;

  let receipt: RetiredGeminiReceipt;
  try {
    receipt = JSON.parse(readFileSync(path, "utf8")) as RetiredGeminiReceipt;
  } catch {
    result.warnings.push(`Preserved unreadable retired Gemini CLI receipt at '${path}'.`);
    return result;
  }

  const installedSkills = Array.isArray(receipt.installedSkills)
    && receipt.installedSkills.every((name) => typeof name === "string" && SKILL_NAME_PATTERN.test(name))
    ? receipt.installedSkills as string[]
    : null;
  const installedCommands = Array.isArray(receipt.installedCommands)
    && receipt.installedCommands.every((name) => typeof name === "string" && SKILL_NAME_PATTERN.test(name))
    ? receipt.installedCommands as string[]
    : null;
  const states = Array.isArray(receipt.targetStates) && receipt.targetStates.every(isTargetState)
    ? receipt.targetStates
    : null;
  const expectedStateKeys = installedSkills && installedCommands
    ? new Set([
      ...installedSkills.map((name) => `skill:${name}`),
      ...installedCommands.map((name) => `command:${name}`),
    ])
    : null;
  const stateKeys = states ? states.map((state) => `${state.kind}:${state.name}`) : [];
  const stateKeySet = new Set(stateKeys);
  if (
    receipt.schemaVersion !== 2
    || receipt.agent !== "gemini"
    || receipt.scope !== scope
    || receipt.root !== root
    || !installedSkills
    || !installedCommands
    || !states
    || !expectedStateKeys
    || new Set(installedSkills).size !== installedSkills.length
    || new Set(installedCommands).size !== installedCommands.length
    || stateKeys.length !== stateKeySet.size
    || stateKeySet.size !== expectedStateKeys.size
    || stateKeys.some((key) => !expectedStateKeys.has(key))
  ) {
    result.warnings.push(`Preserved invalid or legacy retired Gemini CLI receipt at '${path}'.`);
    return result;
  }

  for (const state of states) {
    if (!SKILL_NAME_PATTERN.test(state.name)) {
      result.preserved.push(`${state.kind}:${state.name}`);
      continue;
    }

    const target = targetPath(root, state);
    if (!existsSync(target)) {
      continue;
    }

    if (hashPath(target) !== state.installedHash) {
      result.preserved.push(`${state.kind}:${state.name}`);
      continue;
    }

    rmSync(target, { recursive: true, force: true });
    result.removed.push(`${state.kind}:${state.name}`);
  }

  if (result.preserved.length === 0) {
    rmSync(path, { force: true });
    result.receiptRemoved = true;
  } else {
    result.warnings.push(
      `Preserved ${result.preserved.length} modified or invalid retired Gemini CLI target(s): ${result.preserved.join(", ")}.`,
    );
  }

  if (result.removed.length > 0) {
    result.warnings.push(
      `Removed ${result.removed.length} unchanged receipt-managed target(s) from the retired Gemini CLI adapter so Agy exposes only /mh-* aliases.`,
    );
  }

  return result;
}
