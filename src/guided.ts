import { install } from "./install";
import {
  agentPickOptions,
  backValue,
  formatInstallTargets,
  formatInstalledSection,
  homeActionOptions,
  itemPickOptions,
  scopePickOptions,
  writeBatchInstallSummary,
  writeBatchPlanSummary,
  writeHomeIntro,
  writeInstallReview,
  writeListSummary,
  writePlanSummary,
  type AgentPickMode,
  type GuidedMode,
  type HomeAction,
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
  RepoInventory,
  ScopedAgent,
} from "./types";

const guidedAgents = supportedAgents;

export type GuidedOutcome =
  | InstallPlan
  | InstallPlan[]
  | InstallResult
  | InstallResult[]
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

  io.note("Use space to toggle agents, then press enter to continue.", "Agent selection");

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
  io.note("Use space to toggle items, then press enter to continue.", "Item selection");

  return io.multiselect(
    "Choose items",
    selectableItems.map((item) => ({
      label: item.label,
      value: item.value,
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

function receiptDetailBody(io: PromptIO, env: NodeJS.ProcessEnv, agent: ScopedAgent, scope: InstallScope): InstalledSummary | null {
  const receipt = listInstalled(agent, scope, env);

  if (!receipt) {
    io.note(`No install receipt found for ${agent} (${scope}).`, "Receipt detail");
    return null;
  }

  const lines = [
    `root: ${receipt.root}`,
    `sourceRepoPath: ${receipt.sourceRepoPath}`,
    `installedAt: ${receipt.installedAt}`,
    "",
    ...formatInstalledSection("Skills", sortNames(receipt.installedSkills)),
    "",
    ...formatInstalledSection("Commands", sortNames(receipt.installedCommands)),
  ];

  const reconstructed = sortNames([...new Set([...receipt.installedSkills, ...receipt.installedCommands])]);

  if (reconstructed.length > 0) {
    try {
      const plan = createPlan(agent, scope, reconstructed, env);
      lines.push(
        "",
        "Reconstructed install targets (from installed names; same planner as install preview):",
        formatInstallTargets(plan),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lines.push("", `Reconstructed install targets: unavailable (${message})`);
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
  mode: GuidedMode,
  agent: ScopedAgent,
  scope: InstallScope,
  items: string[],
  softCancelReturnsToHome: boolean,
): Promise<InstallPlan | InstallResult | null> {
  const plan = createPlan(agent, scope, items, env);
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

  return install(agent, scope, items, overwrite, env);
}

function assertRequiredGuidedOptions(options: CliOptions): asserts options is CliOptions & { mode: GuidedMode } {
  if (!options.mode) {
    throw new Error("Guided mode requires --mode when stdin is not interactive.");
  }

  if (options.mode !== "list" && (options.agents.length === 0 || !options.scope)) {
    throw new Error("Guided mode requires --agent and --scope for plan/install when stdin is not interactive.");
  }
}

async function runInteractiveSegment(
  io: PromptIO,
  env: NodeJS.ProcessEnv,
  options: CliOptions,
  mode: GuidedMode | "detail",
  softCancelReturnsToHome = false,
): Promise<GuidedOutcome | null> {
  if (mode === "detail") {
    return runDetailView(io, env, options, softCancelReturnsToHome);
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

  const results: InstallResult[] = [];

  for (const agent of agents) {
    const result = await runSinglePlanOrInstall(io, env, options, mode, agent, scope, items, softCancelReturnsToHome);
    if (result === null) {
      if (results.length > 0) {
        io.note(
          `Batch install stopped after ${results.length} completed agent(s). Earlier installs were kept.`,
          "Batch install partial",
        );
        writeBatchInstallSummary(io, results);
        return results;
      }

      return null;
    }

    results.push(result as InstallResult);
  }

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

      const scope = options.scope as InstallScope;

      if (options.mode === "plan") {
        if (options.agents.length === 1) {
          return createPlan(options.agents[0], scope, options.items, env);
        }

        return options.agents.map((agent) => createPlan(agent, scope, options.items, env));
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
