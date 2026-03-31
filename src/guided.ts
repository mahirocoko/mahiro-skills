import { install } from "./install";
import { listInstalledSummaries } from "./list";
import { createPlan } from "./plan";
import { createPromptIO, type PromptIO } from "./prompt";
import { getRepoInventory } from "./repo";
import type { CliOptions, InstalledSummary, InstallPlan, InstallResult, InstallScope, RepoInventory, ScopedAgent } from "./types";

const guidedModes = ["install", "plan", "list"] as const;
const guidedAgents = ["opencode", "claude-code", "cursor", "gemini"] as const;
const guidedScopes = ["local", "global"] as const;

type GuidedMode = (typeof guidedModes)[number];

interface SelectableItem {
  label: string;
  value: string;
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

async function promptChoice<T extends string>(io: PromptIO, label: string, options: readonly T[]): Promise<T> {
  io.write(`${label}:\n`);

  options.forEach((option, index) => {
    io.write(`  ${index + 1}. ${option}\n`);
  });

  while (true) {
    const answer = await io.ask(`Choose ${label.toLowerCase()} [1-${options.length}]: `);
    const index = Number(answer);
    if (Number.isInteger(index) && index >= 1 && index <= options.length) {
      return options[index - 1] as T;
    }
    io.write(`Invalid ${label.toLowerCase()} choice.\n`);
  }
}

async function promptConfirm(io: PromptIO, question: string): Promise<boolean> {
  const answer = (await io.ask(`${question} [y/N]: `)).toLowerCase();
  return answer === "y" || answer === "yes";
}

function parseSelectionIndexes(answer: string, max: number): number[] {
  const parts = answer
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const indexes = parts.map((part) => Number(part));
  if (indexes.length === 0 || indexes.some((index) => !Number.isInteger(index) || index < 1 || index > max)) {
    throw new Error("Invalid selection.");
  }

  return [...new Set(indexes)];
}

async function promptItems(io: PromptIO, inventory: RepoInventory): Promise<string[]> {
  const defaultBundleLabel = inventory.defaultBundle?.name ?? "fallback-all";
  const selectionMode = await promptChoice(io, "Items", [
    `default bundle (${defaultBundleLabel})`,
    "select individual items",
  ] as const);

  if (selectionMode.startsWith("default bundle")) {
    return [];
  }

  const selectableItems = getSelectableItems(inventory);
  io.write("Available items:\n");
  selectableItems.forEach((item, index) => {
    io.write(`  ${index + 1}. ${item.label}\n`);
  });

  while (true) {
    try {
      const answer = await io.ask("Choose items by number (comma-separated): ");
      const indexes = parseSelectionIndexes(answer, selectableItems.length);
      return indexes.map((index) => selectableItems[index - 1].value);
    } catch {
      io.write("Invalid item selection.\n");
    }
  }
}

function writePlanSummary(io: PromptIO, mode: GuidedMode, plan: InstallPlan): void {
  io.write("\nGuided summary\n");
  io.write(`- mode: ${mode}\n`);
  io.write(`- agent: ${plan.agent}\n`);
  io.write(`- scope: ${plan.scope}\n`);
  io.write(`- requested: ${plan.requested.length > 0 ? plan.requested.join(", ") : "default bundle"}\n`);
  io.write(`- skills: ${plan.skills.length}\n`);
  io.write(`- commands: ${plan.commands.length}\n`);

  if (plan.skipped.length > 0) {
    io.write(`- skipped: ${plan.skipped.length}\n`);
  }

  if (plan.warnings.length > 0) {
    io.write(`- warnings: ${plan.warnings.join(" | ")}\n`);
  }

  if (plan.skills.some((entry) => entry.collision) || plan.commands.some((entry) => entry.collision)) {
    io.write("- collisions: detected\n");
  }

  io.write("\n");
}

function writeListSummary(io: PromptIO, summaries: InstalledSummary[]): void {
  io.write("\nInstalled items\n");

  if (summaries.length === 0) {
    io.write("- nothing installed yet\n\n");
    return;
  }

  for (const summary of summaries) {
    io.write(`- ${summary.agent} (${summary.scope}): ${summary.installed.join(", ")}\n`);
  }

  io.write("\n");
}

function assertRequiredGuidedOptions(options: CliOptions): asserts options is CliOptions & { mode: GuidedMode } {
  if (!options.mode) {
    throw new Error("Guided mode requires --mode when stdin is not interactive.");
  }

  if (options.mode !== "list" && (!options.agent || !options.scope)) {
    throw new Error("Guided mode requires --agent and --scope for plan/install when stdin is not interactive.");
  }
}

export async function runGuided(options: CliOptions, env = process.env, io = createPromptIO()): Promise<InstallPlan | InstallResult | InstalledSummary[]> {
  try {
    if (!io.isInteractive) {
      assertRequiredGuidedOptions(options);
      if (options.mode === "list") {
        return listInstalledSummaries(env);
      }

      if (!options.agent || !options.scope) {
        throw new Error("Guided mode requires --agent and --scope for plan/install when stdin is not interactive.");
      }

      return options.mode === "plan"
        ? createPlan(options.agent, options.scope, options.items, env)
        : install(options.agent, options.scope, options.items, options.overwrite, env);
    }

    const mode = options.mode ?? (await promptChoice(io, "Mode", guidedModes));

    if (mode === "list") {
      const summaries = listInstalledSummaries(env);
      writeListSummary(io, summaries);
      return summaries;
    }

    const agent = options.agent ?? (await promptChoice(io, "Agent", guidedAgents));
    const scope = options.scope ?? (await promptChoice(io, "Scope", guidedScopes));
    const items = options.items.length > 0 ? options.items : await promptItems(io, getRepoInventory(env.MAHIRO_SKILLS_REPO_ROOT));

    const plan = createPlan(agent, scope, items, env);
    writePlanSummary(io, mode, plan);

    if (mode === "plan") {
      return plan;
    }

    let overwrite = options.overwrite;
    const hasCollisions = plan.skills.some((entry) => entry.collision) || plan.commands.some((entry) => entry.collision);

    if (hasCollisions && !overwrite) {
      overwrite = await promptConfirm(io, "Collisions detected. Overwrite existing targets?");
      if (!overwrite) {
        throw new Error("Guided install cancelled because collisions were not approved for overwrite.");
      }
    }

    if (!options.yes) {
      const shouldProceed = await promptConfirm(io, "Proceed with install?");
      if (!shouldProceed) {
        throw new Error("Guided install cancelled.");
      }
    }

    return install(agent, scope, items, overwrite, env);
  } finally {
    io.close();
  }
}
