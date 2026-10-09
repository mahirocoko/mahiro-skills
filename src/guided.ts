import { hashPath } from "./content-hash";
import { install, installReviewIdentity } from "./install";
import { getSkillManagerSnapshot } from "./skill-manager";
import { uninstall } from "./uninstall";
import {
  agentPickOptions,
  backValue,
  homeActionOptions,
  itemPickOptions,
  scopePickOptions,
  uninstallItemPickOptions,
  writeBatchInstallSummary,
  writeBatchPlanSummary,
  writeBatchUninstallSummary,
  writeHomeIntro,
  writeInstallReview,
  writeListSummary,
  writePlanSummary,
  type AgentPickMode,
  type GuidedMode,
  type HomeAction,
  type UninstallItemPickMode,
} from "./guided-view";
import { listInstalled, listInstalledSummaries } from "./list";
import { createPlan } from "./plan";
import { createPromptIO, type PromptIO } from "./prompt";
import { getRepoInventory } from "./repo";
import { supportedAgents } from "./types";
import type {
  CliOptions,
  InstallPlan,
  InstallReceipt,
  InstallResult,
  InstalledSummary,
  InstallScope,
  InstallTarget,
  RepoInventory,
  ScopedAgent,
  UninstallResult,
} from "./types";

const guidedAgents = supportedAgents;

export type GuidedOutcome =
  | InstallPlan
  | InstallPlan[]
  | InstallResult
  | InstallResult[]
  | UninstallResult
  | UninstallResult[]
  | InstalledSummary[];

interface SelectableItem {
  label: string;
  value: string;
}

function sortNames(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function getSelectableItems(inventory: RepoInventory): SelectableItem[] {
  const commandOnly = inventory.commands.filter((command) => !inventory.skills.includes(command));

  return [
    ...inventory.skills.map((skill) => ({
      label: `skill: ${skill}`,
      value: skill,
    })),
    ...commandOnly.map((command) => ({
      label: `command: ${command}`,
      value: command,
    })),
  ];
}

async function promptScope(io: PromptIO, allowBack: boolean): Promise<InstallScope | null> {
  const scope = await io.select("Scope", scopePickOptions(allowBack));

  return scope === backValue ? null : scope;
}

async function promptAgents(io: PromptIO, allowBack: boolean): Promise<ScopedAgent[] | null> {
  const mode = await io.select<AgentPickMode>("Agents", agentPickOptions(guidedAgents, allowBack));

  if (mode === backValue) {
    return null;
  }

  if (mode === "all") {
    return [...guidedAgents];
  }

  return io.multiselect(
    "Toggle agents",
    guidedAgents.map((agent) => ({
      label: agent,
      value: agent,
    })),
  );
}

async function promptConfirm(io: PromptIO, question: string): Promise<boolean> {
  return io.confirm(question);
}

async function promptItems(io: PromptIO, inventory: RepoInventory, allowBack: boolean): Promise<string[] | null> {
  const defaultBundleLabel = inventory.defaultBundle?.name ?? "fallback-all";
  const selectionMode = await io.select(
    "Items",
    itemPickOptions(defaultBundleLabel, allowBack),
  );

  if (selectionMode === backValue) {
    return null;
  }

  if (selectionMode === "default-bundle") {
    return [];
  }

  const selectableItems = getSelectableItems(inventory);
  return io.multiselect(
    "Choose items",
    selectableItems.map((item) => ({
      label: item.label,
      value: item.value,
    })),
  );
}

function installedItemsFor(agent: ScopedAgent, scope: InstallScope, env: NodeJS.ProcessEnv): string[] {
  const receipt = listInstalled(agent, scope, env);
  if (!receipt) {
    return [];
  }

  return sortNames([...receipt.installedSkills, ...receipt.installedCommands]);
}

async function promptUninstallItems(io: PromptIO, env: NodeJS.ProcessEnv, agents: ScopedAgent[], scope: InstallScope, allowBack: boolean): Promise<string[] | null> {
  const installedItems = sortNames(agents.flatMap((agent) => installedItemsFor(agent, scope, env)));

  if (installedItems.length === 0) {
    io.note("No install receipts or installed items found for the selected agents and scope.", "Uninstall");
    return [];
  }

  const selectionMode = await io.select<UninstallItemPickMode>("Uninstall items", uninstallItemPickOptions(allowBack));

  if (selectionMode === backValue) {
    return null;
  }

  if (selectionMode === "all-installed") {
    return [];
  }

  return io.multiselect(
    "Choose installed items",
    installedItems.map((item) => ({
      label: item,
      value: item,
    })),
  );
}

function filterSummariesByAgents(summaries: InstalledSummary[], agents: ScopedAgent[]): InstalledSummary[] {
  if (agents.length === 0) {
    return summaries;
  }

  const agentSet = new Set(agents);
  return summaries.filter((summary) => agentSet.has(summary.agent));
}

function receiptToSummary(receipt: InstallReceipt): InstalledSummary {
  return {
    agent: receipt.agent,
    scope: receipt.scope,
    installedSkills: sortNames(receipt.installedSkills),
    installedCommands: sortNames(receipt.installedCommands),
    installed: sortNames([...receipt.installedSkills, ...receipt.installedCommands]),
  };
}

function formatCountedInstalledSection(label: string, values: string[]): string[] {
  const heading = `${label} (${values.length})`;

  if (values.length === 0) {
    return [heading, "- none"];
  }

  return [heading, ...values.map((value) => `- ${value}`)];
}

function formatReceiptTargets(plan: InstallPlan): string {
  const blocks: string[] = [];

  const formatTargets = (heading: string, targets: InstallTarget[]): void => {
    if (targets.length === 0) {
      return;
    }

    const lines = [`${heading} (${targets.length})`];
    for (const target of targets) {
      const collision = target.collision ? " [collision]" : "";
      lines.push(`- ${target.name}${collision}`, `  from: ${target.source}`, `  to:   ${target.target}`);
    }

    blocks.push(lines.join("\n"));
  };

  formatTargets("Skills", plan.skills);
  formatTargets("Commands", plan.commands);

  return blocks.length > 0 ? blocks.join("\n\n") : "- none";
}

async function runUpdateView(io: PromptIO, env: NodeJS.ProcessEnv, options: CliOptions, allowBack: boolean): Promise<InstallResult[] | null> {
  const summaries = filterSummariesByAgents(listInstalledSummaries(env), options.agents)
    .filter((summary) => options.scope === undefined || summary.scope === options.scope);
  if (summaries.length === 0) {
    io.note(options.agents.length > 0 || options.scope !== undefined || options.items.length > 0
      ? "No install receipts match the explicit update selection; skipping update."
      : "No install receipts found; skipping update.", "Update installed");
    return [];
  }

  const updates: { summary: InstalledSummary; items: string[]; identity: string }[] = [];
  const protectedTargets: string[] = [];

  for (const summary of summaries) {
    // Resolve explicit selectors through the existing planner (including packaged
    // dependencies), then restrict update roots to names recorded in this receipt.
    const selectionPlan = options.items.length > 0 ? createPlan(summary.agent, summary.scope, options.items, env) : null;
    const selectedNames = selectionPlan
      ? new Set([...selectionPlan.skills, ...selectionPlan.commands].map((target) => target.name))
      : null;
    const items = sortNames(summary.installed.filter((name) => selectedNames === null || selectedNames.has(name)));
    if (items.length === 0) {
      io.note(`No recorded items match the update selection for ${summary.agent} (${summary.scope}); skipping update.`, "Update installed");
      continue;
    }

    const plan = createPlan(summary.agent, summary.scope, items, env);
    const snapshot = getSkillManagerSnapshot(summary.agent, summary.scope, env);
    if (snapshot.receiptError) {
      throw new Error(`Unable to read ${summary.agent} (${summary.scope}) receipt: ${snapshot.receiptError}`);
    }

    // Use the manager's receipt validation and installed-hash baseline. Check
    // every planned kind: aggregate skill status can hide a modified command
    // behind a missing sibling, and command-only items are not in its catalog.
    for (const target of [...plan.skills, ...plan.commands]) {
      const installedHash = hashPath(target.target);
      if (installedHash === null) {
        continue;
      }
      const state = snapshot.receipt?.schemaVersion === 2
        ? snapshot.receipt.targetStates?.find((entry) => entry.name === target.name && entry.kind === target.kind)
        : undefined;
      if (!state || installedHash !== state.installedHash) {
        protectedTargets.push(`${summary.agent} (${summary.scope}) ${target.kind}: ${target.name} [${state ? "modified" : "unverified/legacy"}]\n  ${target.target}`);
      }
    }
    updates.push({ summary, items, identity: installReviewIdentity(plan) });
    writePlanSummary(io, "update", plan);
    writeInstallReview(io, plan);
  }

  if (updates.length === 0) {
    return [];
  }

  if (protectedTargets.length > 0) {
    io.note(protectedTargets.join("\n"), "Modified or unverified update targets");
    if (!options.overwrite) {
      if (!io.isInteractive) {
        throw new Error("Update blocked: modified or unverified targets require explicit --overwrite; --yes does not authorize replacement.");
      }
      const approved = await promptConfirm(io, "Overwrite the listed modified or unverified targets?");
      if (!approved) {
        if (allowBack) {
          io.note("Update cancelled (modified targets not approved).", "Home");
          return null;
        }
        throw new Error("Guided update cancelled because modified targets were not approved for overwrite.");
      }
    }
  }

  if (!options.yes) {
    const shouldProceed = await promptConfirm(io, "Proceed with update?");
    if (!shouldProceed) {
      if (allowBack) {
        io.note("Update cancelled.", "Home");
        return null;
      }

      throw new Error("Guided update cancelled.");
    }
  }

  // Check the whole reviewed selection before the first agent mutates. Each
  // installer also checks at its own staging/execution boundary.
  for (const { summary, items, identity } of updates) {
    if (installReviewIdentity(createPlan(summary.agent, summary.scope, items, env)) !== identity) {
      throw new Error("Update content changed after review; review again before execution.");
    }
  }
  const results: InstallResult[] = [];
  for (const [index, { summary, items, identity }] of updates.entries()) {
    try {
      results.push(install(summary.agent, summary.scope, items, true, env, identity));
    } catch (error) {
      const progress = {
        completed: results,
        failed: { agent: summary.agent, scope: summary.scope, error },
        notAttempted: updates.slice(index + 1).map(({ summary: next }) => ({ agent: next.agent, scope: next.scope })),
      };
      throw Object.assign(new Error(`${error instanceof Error ? error.message : String(error)}\nUpdate batch progress: ${JSON.stringify({ completed: results, notAttempted: progress.notAttempted })}`), { progress, cause: error });
    }
  }

  if (results.length > 0) {
    writeBatchInstallSummary(io, results);
  }

  return results;
}

function receiptDetailBody(io: PromptIO, env: NodeJS.ProcessEnv, agent: ScopedAgent, scope: InstallScope): InstalledSummary | null {
  const receipt = listInstalled(agent, scope, env);

  if (!receipt) {
    io.note(`No install receipt found for ${agent} (${scope}).`, "Receipt detail");
    return null;
  }

  const lines = [
    "Summary",
    `- agent: ${receipt.agent}`,
    `- scope: ${receipt.scope}`,
    `- installed at: ${receipt.installedAt}`,
    "",
    "Paths",
    `- root: ${receipt.root}`,
    `- source repo: ${receipt.sourceRepoPath}`,
    "",
    "Installed items",
    ...formatCountedInstalledSection("Skills", sortNames(receipt.installedSkills)),
    "",
    ...formatCountedInstalledSection("Commands", sortNames(receipt.installedCommands)),
  ];

  const reconstructed = sortNames([...new Set([...receipt.installedSkills, ...receipt.installedCommands])]);

  if (reconstructed.length > 0) {
    try {
      const plan = createPlan(agent, scope, reconstructed, env);
      lines.push(
        "",
        "Target files",
        formatReceiptTargets(plan),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lines.push("", `Target files: unavailable (${message})`);
    }
  }

  io.note(lines.join("\n"), `Receipt: ${receipt.agent} (${receipt.scope})`);
  return receiptToSummary(receipt);
}

async function runDetailView(io: PromptIO, env: NodeJS.ProcessEnv, options: CliOptions, allowBack: boolean): Promise<InstalledSummary[] | null> {
  const agents = options.agents.length > 0 ? options.agents : await promptAgents(io, allowBack);
  if (agents === null) {
    return null;
  }

  const scope = options.scope ?? (await promptScope(io, allowBack));
  if (scope === null) {
    return null;
  }

  const summaries: InstalledSummary[] = [];

  for (const agent of agents) {
    const summary = receiptDetailBody(io, env, agent, scope);
    if (summary) {
      summaries.push(summary);
    }
  }

  return summaries;
}

async function runSinglePlanOrInstall(
  io: PromptIO,
  env: NodeJS.ProcessEnv,
  options: CliOptions,
  mode: "install" | "plan",
  agent: ScopedAgent,
  scope: InstallScope,
  items: string[],
  softCancelReturnsToHome: boolean,
): Promise<InstallPlan | InstallResult | null> {
  const plan = createPlan(agent, scope, items, env);
  const identity = installReviewIdentity(plan);
  writePlanSummary(io, mode, plan);

  if (mode === "plan") {
    return plan;
  }

  writeInstallReview(io, plan);

  let overwrite = options.overwrite;
  const hasCollisions = plan.skills.some((entry) => entry.collision) || plan.commands.some((entry) => entry.collision);

  if (hasCollisions && !overwrite) {
    overwrite = await promptConfirm(io, "Collisions detected. Overwrite existing targets?");
    if (!overwrite) {
      if (softCancelReturnsToHome) {
        io.note("Install cancelled (overwrite not approved).", "Home");
        return null;
      }

      throw new Error("Guided install cancelled because collisions were not approved for overwrite.");
    }
  }

  if (!options.yes) {
    const shouldProceed = await promptConfirm(io, "Proceed with install?");
    if (!shouldProceed) {
      if (softCancelReturnsToHome) {
        io.note("Install cancelled.", "Home");
        return null;
      }

      throw new Error("Guided install cancelled.");
    }
  }

  return install(agent, scope, items, overwrite, env, identity);
}

function writeUninstallPreview(io: PromptIO, env: NodeJS.ProcessEnv, agent: ScopedAgent, scope: InstallScope, items: string[]): void {
  const receipt = listInstalled(agent, scope, env);
  const plannedItems = items.length > 0 ? sortNames(items) : receipt ? sortNames([...receipt.installedSkills, ...receipt.installedCommands]) : [];

  if (!receipt || plannedItems.length === 0) {
    io.note(`No installed items found for ${agent} (${scope}).`, "Uninstall preview");
    return;
  }

  io.note([
    `agent: ${agent}`,
    `scope: ${scope}`,
    `items: ${plannedItems.join(", ")}`,
  ].join("\n"), "Uninstall preview");
}

async function runSingleUninstall(
  io: PromptIO,
  env: NodeJS.ProcessEnv,
  options: CliOptions,
  agent: ScopedAgent,
  scope: InstallScope,
  items: string[],
  softCancelReturnsToHome: boolean,
): Promise<UninstallResult | null> {
  writeUninstallPreview(io, env, agent, scope, items);

  if (!options.yes) {
    const shouldProceed = await promptConfirm(io, `Proceed with uninstall for ${agent} (${scope})?`);
    if (!shouldProceed) {
      if (softCancelReturnsToHome) {
        io.note("Uninstall cancelled.", "Home");
        return null;
      }

      throw new Error("Guided uninstall cancelled.");
    }
  }

  return uninstall(agent, scope, items, env);
}

function assertRequiredGuidedOptions(options: CliOptions): asserts options is CliOptions & { mode: GuidedMode | "update" } {
  if (!options.mode) {
    throw new Error("Guided mode requires --mode when stdin is not interactive.");
  }

  if (options.mode !== "list" && options.mode !== "update" && (options.agents.length === 0 || !options.scope)) {
    throw new Error("Guided mode requires --agent and --scope for plan/install/uninstall when stdin is not interactive.");
  }
}

async function runInteractiveSegment(
  io: PromptIO,
  env: NodeJS.ProcessEnv,
  options: CliOptions,
  mode: GuidedMode | "detail" | "update",
  softCancelReturnsToHome = false,
): Promise<GuidedOutcome | null> {
  if (mode === "detail") {
    return runDetailView(io, env, options, softCancelReturnsToHome);
  }

  if (mode === "update") {
    return runUpdateView(io, env, options, softCancelReturnsToHome);
  }

  if (mode === "list") {
    const agents = options.agents.length > 0 ? options.agents : await promptAgents(io, softCancelReturnsToHome);
    if (agents === null) {
      return null;
    }

    const allSummaries = listInstalledSummaries(env);
    const summaries = filterSummariesByAgents(allSummaries, agents);

    if (summaries.length === 0) {
      if (allSummaries.length === 0) {
        io.note("No skills or commands installed yet.", "Installed items");
      } else {
        io.note("No install receipts for the selected agents.", "Installed items");
      }

      return [];
    }

    writeListSummary(io, summaries);
    return summaries;
  }

  const agents = options.agents.length > 0 ? options.agents : await promptAgents(io, softCancelReturnsToHome);
  if (agents === null) {
    return null;
  }

  const scope = options.scope ?? (await promptScope(io, softCancelReturnsToHome));
  if (scope === null) {
    return null;
  }

  if (mode === "uninstall") {
    const items = options.items.length > 0 ? options.items : await promptUninstallItems(io, env, agents, scope, softCancelReturnsToHome);
    if (items === null) {
      return null;
    }

    if (agents.length === 1) {
      return runSingleUninstall(io, env, options, agents[0], scope, items, softCancelReturnsToHome);
    }

    for (const agent of agents) {
      writeUninstallPreview(io, env, agent, scope, items);
    }

    if (!options.yes) {
      const shouldProceed = await promptConfirm(io, `Proceed with uninstall for ${agents.length} agents (${scope})?`);
      if (!shouldProceed) {
        if (softCancelReturnsToHome) {
          io.note("Uninstall cancelled.", "Home");
          return null;
        }

        throw new Error("Guided uninstall cancelled.");
      }
    }

    const results = agents.map((agent) => uninstall(agent, scope, items, env));

    writeBatchUninstallSummary(io, results);
    return results;
  }

  const items = options.items.length > 0 ? options.items : await promptItems(io, getRepoInventory(env.MAHIRO_SKILLS_REPO_ROOT), softCancelReturnsToHome);
  if (items === null) {
    return null;
  }

  if (agents.length === 1) {
    return runSinglePlanOrInstall(io, env, options, mode, agents[0], scope, items, softCancelReturnsToHome);
  }

  if (mode === "plan") {
    const plans: InstallPlan[] = [];

    for (const agent of agents) {
      const plan = await runSinglePlanOrInstall(io, env, options, mode, agent, scope, items, softCancelReturnsToHome);
      if (plan === null) {
        return null;
      }

      plans.push(plan as InstallPlan);
    }

    writeBatchPlanSummary(io, plans);
    return plans;
  }

  const plans = agents.map((agent) => createPlan(agent, scope, items, env));
  const identities = plans.map(installReviewIdentity);
  for (const plan of plans) {
    writePlanSummary(io, mode, plan);
    writeInstallReview(io, plan);
  }

  let overwrite = options.overwrite;
  const hasCollisions = plans.some((plan) => plan.skills.some((entry) => entry.collision) || plan.commands.some((entry) => entry.collision));

  if (hasCollisions && !overwrite) {
    overwrite = await promptConfirm(io, `Collisions detected. Overwrite existing targets for ${agents.length} agents?`);
    if (!overwrite) {
      if (softCancelReturnsToHome) {
        io.note("Install cancelled (overwrite not approved).", "Home");
        return null;
      }

      throw new Error("Guided install cancelled because collisions were not approved for overwrite.");
    }
  }

  if (!options.yes) {
    const shouldProceed = await promptConfirm(io, `Proceed with install for ${agents.length} agents (${scope})?`);
    if (!shouldProceed) {
      if (softCancelReturnsToHome) {
        io.note("Install cancelled.", "Home");
        return null;
      }

      throw new Error("Guided install cancelled.");
    }
  }

  for (const [index, agent] of agents.entries()) {
    if (installReviewIdentity(createPlan(agent, scope, items, env)) !== identities[index]) {
      throw new Error("Install content changed after review; review again before execution.");
    }
  }
  const results = agents.map((agent, index) => install(agent, scope, items, overwrite, env, identities[index]));

  writeBatchInstallSummary(io, results);
  return results;
}

async function promptHomeAction(io: PromptIO): Promise<HomeAction> {
  return io.select("Home", homeActionOptions);
}

async function runInteractiveHomeLoop(io: PromptIO, env: NodeJS.ProcessEnv, options: CliOptions): Promise<GuidedOutcome> {
  let lastResult: GuidedOutcome | undefined;
  writeHomeIntro(io);

  for (;;) {
    const action = await promptHomeAction(io);

    if (action === "exit") {
      if (lastResult === undefined) {
        io.outro("Goodbye.");
        return [];
      }

      return lastResult;
    }

    const segment = await runInteractiveSegment(io, env, options, action, true);
    if (segment !== null) {
      lastResult = segment;
    }
  }
}

export async function runGuided(options: CliOptions, env = process.env, io = createPromptIO()): Promise<GuidedOutcome> {
  try {
    if (!io.isInteractive) {
      assertRequiredGuidedOptions(options);
      if (options.mode === "list") {
        return filterSummariesByAgents(listInstalledSummaries(env), options.agents);
      }

      if (options.mode === "update") {
        return runUpdateView(io, env, options, false) as Promise<GuidedOutcome>;
      }

      const scope = options.scope as InstallScope;

      if (options.mode === "plan") {
        if (options.agents.length === 1) {
          return createPlan(options.agents[0], scope, options.items, env);
        }

        return options.agents.map((agent) => createPlan(agent, scope, options.items, env));
      }

      if (options.mode === "uninstall") {
        if (options.agents.length === 1) {
          return uninstall(options.agents[0], scope, options.items, env);
        }

        return options.agents.map((agent) => uninstall(agent, scope, options.items, env));
      }

      if (options.agents.length === 1) {
        return install(options.agents[0], scope, options.items, options.overwrite, env);
      }

      return options.agents.map((agent) => install(agent, scope, options.items, options.overwrite, env));
    }

    if (options.mode !== undefined) {
      const segment = await runInteractiveSegment(io, env, options, options.mode, false);
      if (segment === null) {
        throw new Error("Internal error: guided segment returned null without home-loop soft cancel.");
      }

      return segment;
    }

    return runInteractiveHomeLoop(io, env, options);
  } finally {
    io.close();
  }
}
