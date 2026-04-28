import type { PromptIO, PromptOption } from "./prompt";
import type { InstallPlan, InstallResult, InstalledSummary, InstallScope, InstallTarget, ScopedAgent } from "./types";

export type GuidedMode = "install" | "plan" | "list";
export type HomeAction = "install" | "plan" | "list" | "detail" | "exit";
export const backValue = "__back";
export type BackValue = typeof backValue;
export type AgentPickMode = "all" | "pick" | BackValue;
export type ItemPickMode = "default-bundle" | "custom-items" | BackValue;
export type ScopePickMode = InstallScope | BackValue;

export const guidedScopes = ["local", "global"] as const;

export const homeActionOptions = [
  { label: "Install", value: "install", hint: "copy skills/commands into the agent tree" },
  { label: "Plan (dry run)", value: "plan", hint: "preview plan without installing" },
  { label: "List installed", value: "list", hint: "filter by one or more agents" },
  { label: "Receipt detail", value: "detail", hint: "one or more agents, one scope" },
  { label: "Exit", value: "exit", hint: "leave the TUI" },
] satisfies readonly PromptOption<HomeAction>[];

const keyboardHint = "Ctrl+C cancel | choose Back to Home inside a wizard";
const logoLines = [
  "mahiro-skills",
  "packaged agent skills + command wrappers",
  "plan | install | list | doctor | tui",
];

function withBack<T extends string>(options: readonly PromptOption<T>[], allowBack: boolean): readonly PromptOption<T | BackValue>[] {
  if (!allowBack) {
    return options;
  }

  return [
    ...options,
    { label: "← Back to Home", value: backValue, hint: "return without changing anything" },
  ];
}

export function writeHomeIntro(io: PromptIO): void {
  io.note(`${logoLines.join("\n")}\n\n${keyboardHint}`, "mahiro-skills");
}

export function agentPickOptions(agents: readonly ScopedAgent[], allowBack = false): readonly PromptOption<AgentPickMode>[] {
  return withBack([
    { label: `All agents (${agents.join(", ")})`, value: "all", hint: "shortcut for the full v0 adapter set" },
    { label: "Choose specific agents…", value: "pick", hint: "checkbox multiselect" },
  ], allowBack);
}

export function scopePickOptions(allowBack = false): readonly PromptOption<ScopePickMode>[] {
  return withBack([
    { label: "local", value: "local" },
    { label: "global", value: "global" },
  ], allowBack);
}

export function itemPickOptions(defaultBundleLabel: string, allowBack = false): readonly PromptOption<ItemPickMode>[] {
  return withBack([
    {
      label: `default bundle (${defaultBundleLabel})`,
      value: "default-bundle",
    },
    {
      label: "select individual items",
      value: "custom-items",
    },
  ], allowBack);
}

export function formatInstalledSection(label: string, values: string[]): string[] {
  if (values.length === 0) {
    return [label, "- none"];
  }

  return [label, ...values.map((value) => `- ${value}`)];
}

export function formatInstallTargets(plan: InstallPlan): string {
  const blocks: string[] = [];

  const formatTargets = (heading: string, targets: InstallTarget[]): void => {
    if (targets.length === 0) {
      return;
    }

    const lines = [heading];
    for (const entry of targets) {
      const tag = entry.collision ? " [collision]" : "";
      lines.push(`${entry.source} -> ${entry.target}${tag}`);
    }

    blocks.push(lines.join("\n"));
  };

  formatTargets("Skills", plan.skills);
  formatTargets("Commands", plan.commands);

  return blocks.length > 0 ? blocks.join("\n\n") : "No file targets (empty plan).";
}

export function writePlanSummary(io: PromptIO, mode: GuidedMode, plan: InstallPlan): void {
  const lines = [
    `mode: ${mode}`,
    `agent: ${plan.agent}`,
    `scope: ${plan.scope}`,
    `requested: ${plan.requested.length > 0 ? plan.requested.join(", ") : "default bundle"}`,
    `skills: ${plan.skills.length}`,
    `commands: ${plan.commands.length}`,
  ];

  if (plan.skipped.length > 0) {
    lines.push(`skipped: ${plan.skipped.length}`);
  }

  if (plan.warnings.length > 0) {
    lines.push(`warnings: ${plan.warnings.join(" | ")}`);
  }

  if (plan.skills.some((entry) => entry.collision) || plan.commands.some((entry) => entry.collision)) {
    lines.push("collisions: detected");
  }

  io.note(lines.join("\n"), "Install plan");
}

export function writeInstallReview(io: PromptIO, plan: InstallPlan): void {
  io.note(formatInstallTargets(plan), "Install preview");
}

export function writeBatchPlanSummary(io: PromptIO, plans: InstallPlan[]): void {
  const lines = [
    `agents: ${plans.length}`,
    ...plans.map(
      (plan) =>
        `${plan.agent}: ${plan.skills.length} skills, ${plan.commands.length} commands${plan.warnings.length > 0 ? `, ${plan.warnings.length} warning(s)` : ""}`,
    ),
  ];

  io.note(lines.join("\n"), "Batch plan summary");
}

export function writeBatchInstallSummary(io: PromptIO, results: InstallResult[]): void {
  const lines = [
    `agents: ${results.length}`,
    ...results.map((result) => `${result.agent}: ${result.status} (${result.installed.length} installed)`),
  ];

  io.note(lines.join("\n"), "Batch install summary");
}

export function writeListSummary(io: PromptIO, summaries: InstalledSummary[]): void {
  if (summaries.length === 0) {
    io.note("No skills or commands installed yet.", "Installed items");
    return;
  }

  for (const summary of summaries) {
    const body = [
      ...formatInstalledSection("Skills", summary.installedSkills),
      "",
      ...formatInstalledSection("Commands", summary.installedCommands),
    ].join("\n");

    io.note(body, `${summary.agent} (${summary.scope})`);
  }
}
