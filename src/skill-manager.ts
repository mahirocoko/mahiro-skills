import { join } from "path";

import { hashPath } from "./content-hash";
import { resolveCommandArtifact, supportsCommands } from "./adapters";
import { install } from "./install";
import { listInstalled } from "./list";
import { createPlan } from "./plan";
import { getSkillCatalog } from "./repo";
import { uninstall } from "./uninstall";
import type {
  InstallPlan,
  InstallReceipt,
  InstallReceiptTargetState,
  InstallResult,
  InstallScope,
  InstallUnitKind,
  ScopedAgent,
  SkillCatalogEntry,
  SkippedItem,
  UninstallResult,
} from "./types";

export type SkillInstallStatus = "not-installed" | "current" | "outdated" | "modified" | "missing" | "legacy";
export type SkillManagerAction = "install" | "update" | "uninstall" | "inspect";
export type SkillManagerAgentState = SkillInstallStatus | "unknown" | "receipt-only";

export interface SkillManagerItem extends SkillCatalogEntry {
  status: SkillInstallStatus;
  installedKinds: InstallUnitKind[];
  plan: InstallPlan;
}

export interface SkillManagerSnapshot {
  agent: ScopedAgent;
  scope: InstallScope;
  root: string;
  receipt: InstallReceipt | null;
  receiptError?: string;
  skills: SkillManagerItem[];
}

export interface SkillManagerAgentInventory {
  agent: ScopedAgent;
  scope: InstallScope;
  state: SkillManagerAgentState;
  receiptRecorded: boolean;
  installedKinds: InstallUnitKind[];
  commandSupport: "full" | "skills-only";
  blocked?: string;
}

export interface SkillManagerInventoryItem {
  name: string;
  description?: string;
  source?: SkillCatalogEntry;
  sourceCatalog: boolean;
  receiptOnly: boolean;
  agents: SkillManagerAgentInventory[];
  coverage: {
    installed: number;
    selected: number;
  };
  counts: Partial<Record<SkillManagerAgentState, number>>;
  selectable: boolean;
  disabledReason?: string;
  requiresAcknowledgement: boolean;
}

export interface SkillManagerUninstallTarget {
  name: string;
  kind: InstallUnitKind;
  target: string;
}

export interface SkillManagerAgentPlan {
  action: SkillManagerAction;
  agent: ScopedAgent;
  scope: InstallScope;
  root: string;
  requested: string[];
  active: string[];
  skipped: SkippedItem[];
  warnings: string[];
  blocked?: string;
  installPlan?: InstallPlan;
  uninstallTargets: SkillManagerUninstallTarget[];
  acknowledgementIds: string[];
}

export interface SkillManagerExecutionRequest {
  action: Exclude<SkillManagerAction, "inspect">;
  agent: ScopedAgent;
  scope: InstallScope;
  items: string[];
  overwrite: boolean;
  env: NodeJS.ProcessEnv;
}

export interface SkillManagerActionExecutor {
  install?: (request: SkillManagerExecutionRequest) => unknown | Promise<unknown>;
  update?: (request: SkillManagerExecutionRequest) => unknown | Promise<unknown>;
  uninstall?: (request: SkillManagerExecutionRequest) => unknown | Promise<unknown>;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function receiptFor(agent: ScopedAgent, scope: InstallScope, env: NodeJS.ProcessEnv): { receipt: InstallReceipt | null; error?: string } {
  try {
    const receipt = listInstalled(agent, scope, env);
    if (receipt && (
      receipt.agent !== agent
      || receipt.scope !== scope
      || !Array.isArray(receipt.installedSkills)
      || !Array.isArray(receipt.installedCommands)
      || !receipt.installedSkills.every((name) => typeof name === "string")
      || !receipt.installedCommands.every((name) => typeof name === "string")
      || (receipt.schemaVersion !== undefined && receipt.schemaVersion !== 2)
      || (receipt.targetStates !== undefined && !Array.isArray(receipt.targetStates))
      || (receipt.schemaVersion === 2 && !Array.isArray(receipt.targetStates))
      || (Array.isArray(receipt.targetStates) && !receipt.targetStates.every((state) => (
        state
        && typeof state === "object"
        && typeof state.name === "string"
        && (state.kind === "skill" || state.kind === "command")
        && typeof state.sourceHash === "string"
        && /^[a-f0-9]{64}$/.test(state.sourceHash)
        && typeof state.installedHash === "string"
        && /^[a-f0-9]{64}$/.test(state.installedHash)
      )))
    )) {
      return { receipt: null, error: "Invalid install receipt schema." };
    }
    return { receipt };
  } catch (error) {
    return {
      receipt: null,
      error: errorMessage(error),
    };
  }
}

function targetStateFor(states: InstallReceiptTargetState[], name: string, kind: InstallUnitKind): InstallReceiptTargetState | undefined {
  return states.find((state) => state.name === name && state.kind === kind);
}

function installedKinds(receipt: InstallReceipt | null, name: string): InstallUnitKind[] {
  if (!receipt) {
    return [];
  }

  const kinds: InstallUnitKind[] = [];
  if (receipt.installedSkills.includes(name)) {
    kinds.push("skill");
  }
  if (receipt.installedCommands.includes(name)) {
    kinds.push("command");
  }
  return kinds;
}

function receiptHasName(receipt: InstallReceipt | null, name: string): boolean {
  return installedKinds(receipt, name).length > 0;
}

function resolveStatus(receipt: InstallReceipt | null, name: string, plan: InstallPlan): SkillInstallStatus {
  const kinds = installedKinds(receipt, name);
  if (!receipt || kinds.length === 0) {
    return "not-installed";
  }

  if (receipt.schemaVersion !== 2 || !receipt.targetStates) {
    return "legacy";
  }

  const planTargets = [...plan.skills, ...plan.commands].filter((target) => kinds.includes(target.kind));
  const states = planTargets.map((target) => ({ target, receipt: targetStateFor(receipt.targetStates!, name, target.kind) }));

  if (states.length !== kinds.length || states.some((state) => !state.receipt)) {
    return "legacy";
  }

  if (states.some(({ target }) => hashPath(target.target) === null)) {
    return "missing";
  }

  if (states.some(({ target, receipt: state }) => hashPath(target.target) !== state!.installedHash)) {
    return "modified";
  }

  if (states.some(({ target, receipt: state }) => hashPath(target.source) !== state!.sourceHash)) {
    return "outdated";
  }

  return "current";
}

export function getSkillManagerSnapshot(agent: ScopedAgent, scope: InstallScope, env = process.env): SkillManagerSnapshot {
  const receiptResult = receiptFor(agent, scope, env);
  const catalog = getSkillCatalog(env.MAHIRO_SKILLS_REPO_ROOT);
  const skills = catalog.map((entry) => {
    const plan = createPlan(agent, scope, [entry.name], env);
    return {
      ...entry,
      status: resolveStatus(receiptResult.receipt, entry.name, plan),
      installedKinds: installedKinds(receiptResult.receipt, entry.name),
      plan,
    };
  });

  return {
    agent,
    scope,
    root: skills[0]?.plan.root ?? createPlan(agent, scope, [], env).root,
    receipt: receiptResult.receipt,
    receiptError: receiptResult.error,
    skills,
  };
}

export function getSkillManagerSnapshots(
  agents: readonly ScopedAgent[],
  scope: InstallScope,
  env = process.env,
): SkillManagerSnapshot[] {
  return unique([...agents]).map((agent) => getSkillManagerSnapshot(agent, scope, env));
}

function requireReadableReceipt(agent: ScopedAgent, scope: InstallScope, env: NodeJS.ProcessEnv): InstallReceipt | null {
  const result = receiptFor(agent, scope, env);
  if (result.error) {
    throw new Error(`Unable to read ${agent} (${scope}) receipt: ${result.error}`);
  }
  return result.receipt;
}

export function getSkillManagerInstallPlan(agent: ScopedAgent, scope: InstallScope, names: string[], env = process.env): InstallPlan {
  requireReadableReceipt(agent, scope, env);
  return createPlan(agent, scope, unique(names), env);
}

export function installSkillManagerItems(agent: ScopedAgent, scope: InstallScope, names: string[], overwrite: boolean, env = process.env): InstallResult {
  const plan = getSkillManagerInstallPlan(agent, scope, names, env);
  return install(agent, scope, plan.requested, overwrite, env);
}

export function updateSkillManagerItems(
  agent: ScopedAgent,
  scope: InstallScope,
  names: string[],
  overwrite: boolean,
  env = process.env,
): InstallResult {
  const plan = getSkillManagerInstallPlan(agent, scope, names, env);
  return install(agent, scope, plan.requested, overwrite, env);
}

export function uninstallSkillManagerItems(agent: ScopedAgent, scope: InstallScope, names: string[], env = process.env): UninstallResult {
  requireReadableReceipt(agent, scope, env);
  return uninstall(agent, scope, unique(names), env);
}

export function updateSkillManagerReceipt(agent: ScopedAgent, scope: InstallScope, env = process.env): InstallResult | null {
  const receipt = requireReadableReceipt(agent, scope, env);
  if (!receipt) {
    return null;
  }

  const items = unique([...receipt.installedSkills, ...receipt.installedCommands]);
  if (items.length === 0) {
    return null;
  }

  return install(agent, scope, items, true, env);
}

function sourceItemFor(snapshot: SkillManagerSnapshot, name: string): SkillManagerItem | undefined {
  return snapshot.skills.find((item) => item.name === name);
}

function namesForInventory(action: SkillManagerAction, snapshots: readonly SkillManagerSnapshot[]): string[] {
  const names = new Set<string>();

  for (const snapshot of snapshots) {
    if (action !== "uninstall") {
      for (const item of snapshot.skills) {
        names.add(item.name);
      }
    }

    if (action === "uninstall" || action === "inspect") {
      for (const name of snapshot.receipt?.installedSkills ?? []) {
        names.add(name);
      }
      for (const name of snapshot.receipt?.installedCommands ?? []) {
        names.add(name);
      }
    }
  }

  return [...names].sort();
}

function stateFor(snapshot: SkillManagerSnapshot, name: string): SkillManagerAgentInventory {
  const kinds = installedKinds(snapshot.receipt, name);
  const source = sourceItemFor(snapshot, name);
  const recorded = kinds.length > 0;

  if (snapshot.receiptError) {
    return {
      agent: snapshot.agent,
      scope: snapshot.scope,
      state: "unknown",
      receiptRecorded: false,
      installedKinds: [],
      commandSupport: source?.plan.commands.length || supportsCommands(snapshot.agent) ? "full" : "skills-only",
      blocked: snapshot.receiptError,
    };
  }

  return {
    agent: snapshot.agent,
    scope: snapshot.scope,
    state: source ? (recorded ? source.status : "not-installed") : "receipt-only",
    receiptRecorded: recorded,
    installedKinds: kinds,
    commandSupport: source?.plan.commands.length || supportsCommands(snapshot.agent) ? "full" : "skills-only",
  };
}

function countStates(states: readonly SkillManagerAgentInventory[]): Partial<Record<SkillManagerAgentState, number>> {
  const counts: Partial<Record<SkillManagerAgentState, number>> = {};
  for (const state of states) {
    counts[state.state] = (counts[state.state] ?? 0) + 1;
  }
  return counts;
}

function inventorySelectability(
  action: SkillManagerAction,
  sourceCatalog: boolean,
  receiptOnly: boolean,
  states: readonly SkillManagerAgentInventory[],
): { selectable: boolean; disabledReason?: string; requiresAcknowledgement: boolean } {
  const readableStates = states.filter((state) => state.state !== "unknown");
  const hasAbsent = readableStates.some((state) => state.state === "not-installed");
  const hasUpdateCandidate = readableStates.some((state) => ["outdated", "missing", "modified", "legacy"].includes(state.state));
  const hasRecorded = states.some((state) => state.receiptRecorded);
  const requiresAcknowledgement = action === "update"
    ? states.some((state) => state.state === "modified" || state.state === "legacy")
    : action === "uninstall"
      ? states.some((state) => state.receiptRecorded && (state.state === "modified" || state.state === "legacy"))
      : false;

  if (action === "inspect") {
    return { selectable: true, requiresAcknowledgement: false };
  }

  if (action === "install") {
    if (!sourceCatalog || !hasAbsent) {
      return {
        selectable: false,
        disabledReason: receiptOnly
          ? "Receipt-only item; inspect or uninstall it."
          : states.some((state) => state.state === "unknown")
            ? "Receipt unreadable for a selected agent; writes are blocked."
            : "Installed everywhere; use Update.",
        requiresAcknowledgement: false,
      };
    }

    return { selectable: true, requiresAcknowledgement: false };
  }

  if (action === "update") {
    if (!sourceCatalog || !hasUpdateCandidate) {
      return {
        selectable: false,
        disabledReason: receiptOnly ? "Receipt-only item is not in the current catalog." : "Current or not installed; no update needed.",
        requiresAcknowledgement: false,
      };
    }

    return { selectable: true, requiresAcknowledgement };
  }

  if (!hasRecorded) {
    return {
      selectable: false,
      disabledReason: "Not recorded in any selected receipt.",
      requiresAcknowledgement: false,
    };
  }

  return { selectable: true, requiresAcknowledgement };
}

export function deriveSkillManagerInventory(
  action: SkillManagerAction,
  snapshots: readonly SkillManagerSnapshot[],
): SkillManagerInventoryItem[] {
  const names = namesForInventory(action, snapshots);

  return names.map((name) => {
    const source = snapshots.map((snapshot) => sourceItemFor(snapshot, name)).find((item): item is SkillManagerItem => item !== undefined);
    const states = snapshots.map((snapshot) => stateFor(snapshot, name));
    const sourceCatalog = source !== undefined;
    const receiptOnly = !sourceCatalog;
    const selectability = inventorySelectability(action, sourceCatalog, receiptOnly, states);

    return {
      name,
      description: source?.description,
      source,
      sourceCatalog,
      receiptOnly,
      agents: states,
      coverage: {
        installed: states.filter((state) => state.receiptRecorded).length,
        selected: states.length,
      },
      counts: countStates(states),
      ...selectability,
    };
  });
}

function skipItem(name: string, reason: string): SkippedItem {
  return { item: name, kind: "item", reason };
}

function uninstallTargetsFor(snapshot: SkillManagerSnapshot, name: string): SkillManagerUninstallTarget[] {
  const receipt = snapshot.receipt;
  if (!receipt) {
    return [];
  }

  const targets: SkillManagerUninstallTarget[] = [];
  if (receipt.installedSkills.includes(name)) {
    targets.push({ name, kind: "skill", target: join(snapshot.root, "skills", name) });
  }
  if (receipt.installedCommands.includes(name)) {
    targets.push({ name, kind: "command", target: join(snapshot.root, resolveCommandArtifact(snapshot.agent, name).targetRelativePath) });
  }
  return targets;
}

function stateForPlan(snapshot: SkillManagerSnapshot, name: string): SkillManagerAgentInventory {
  return stateFor(snapshot, name);
}

export function getSkillManagerAgentPlan(
  action: SkillManagerAction,
  snapshot: SkillManagerSnapshot,
  names: readonly string[],
  env = process.env,
): SkillManagerAgentPlan {
  const requested = unique([...names]);
  const active: string[] = [];
  const skipped: SkippedItem[] = [];
  const warnings: string[] = [];
  const uninstallTargets: SkillManagerUninstallTarget[] = [];
  const acknowledgementIds: string[] = [];

  if (snapshot.receiptError) {
    return {
      action,
      agent: snapshot.agent,
      scope: snapshot.scope,
      root: snapshot.root,
      requested,
      active,
      skipped,
      warnings,
      blocked: `Unable to read ${snapshot.agent} (${snapshot.scope}) receipt: ${snapshot.receiptError}`,
      uninstallTargets,
      acknowledgementIds,
    };
  }

  for (const name of requested) {
    const source = sourceItemFor(snapshot, name);
    const state = stateForPlan(snapshot, name);
    const recorded = state.receiptRecorded;

    if (action === "inspect") {
      skipped.push(skipItem(name, "Inspect is read-only."));
      continue;
    }

    if (action === "install") {
      if (!source) {
        skipped.push(skipItem(name, "Item is not in the current source catalog."));
      } else if (recorded) {
        skipped.push(skipItem(name, "Already receipt-installed; choose Update to replace it."));
      } else {
        active.push(name);
      }
      continue;
    }

    if (action === "update") {
      if (!source) {
        skipped.push(skipItem(name, "Item is not in the current source catalog."));
      } else if (!recorded) {
        skipped.push(skipItem(name, "Not installed for this agent."));
      } else if (["current", "not-installed"].includes(state.state)) {
        skipped.push(skipItem(name, "Current or not installed; no update needed."));
      } else {
        active.push(name);
        if (state.state === "modified") {
          acknowledgementIds.push(`modified:${snapshot.agent}:${name}`);
        }
        if (state.state === "legacy") {
          acknowledgementIds.push(`legacy:${snapshot.agent}:${name}`);
        }
      }
      continue;
    }

    if (!recorded) {
      skipped.push(skipItem(name, "Not recorded in this agent's install receipt."));
      continue;
    }

    active.push(name);
    uninstallTargets.push(...uninstallTargetsFor(snapshot, name));
    if (state.state === "modified") {
      acknowledgementIds.push(`remove-modified:${snapshot.agent}:${name}`);
    }
    if (state.state === "legacy") {
      acknowledgementIds.push(`remove-legacy:${snapshot.agent}:${name}`);
    }
  }

  let installPlan: InstallPlan | undefined;
  if ((action === "install" || action === "update") && active.length > 0) {
    try {
      installPlan = getSkillManagerInstallPlan(snapshot.agent, snapshot.scope, active, env);
      warnings.push(...installPlan.warnings);
      if (installPlan.skills.some((target) => target.collision) || installPlan.commands.some((target) => target.collision)) {
        acknowledgementIds.push(`overwrite:${snapshot.agent}`);
      }
    } catch (error) {
      return {
        action,
        agent: snapshot.agent,
        scope: snapshot.scope,
        root: snapshot.root,
        requested,
        active,
        skipped,
        warnings,
        blocked: errorMessage(error),
        installPlan,
        uninstallTargets,
        acknowledgementIds,
      };
    }
  }

  return {
    action,
    agent: snapshot.agent,
    scope: snapshot.scope,
    root: snapshot.root,
    requested,
    active,
    skipped,
    warnings,
    installPlan,
    uninstallTargets,
    acknowledgementIds,
  };
}

export async function executeSkillManagerAgentPlan(
  plan: SkillManagerAgentPlan,
  overwrite: boolean,
  env = process.env,
  executor: SkillManagerActionExecutor = {},
): Promise<unknown> {
  if (plan.blocked) {
    throw new Error(plan.blocked);
  }

  if (plan.action === "inspect" || plan.active.length === 0) {
    return null;
  }

  const request: SkillManagerExecutionRequest = {
    action: plan.action,
    agent: plan.agent,
    scope: plan.scope,
    items: [...plan.active],
    overwrite,
    env,
  };

  const injected = executor[plan.action];
  if (injected) {
    return injected(request);
  }

  if (plan.action === "install") {
    return installSkillManagerItems(plan.agent, plan.scope, plan.active, overwrite, env);
  }

  if (plan.action === "update") {
    return updateSkillManagerItems(plan.agent, plan.scope, plan.active, overwrite, env);
  }

  return uninstallSkillManagerItems(plan.agent, plan.scope, plan.active, env);
}
