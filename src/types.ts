export const supportedAgents = ["opencode", "claude-code", "cursor", "gemini", "codex"] as const;

export type SupportedAgent = (typeof supportedAgents)[number];

export type ScopedAgent = SupportedAgent;

export type InstallScope = "global" | "local";

export type PlanStatus = "installed" | "partially-installed" | "skipped" | "unsupported";

export type InstallUnitKind = "skill" | "command";

export interface RepoBundle {
  name: string;
  description?: string;
  skills: string[];
  commands: string[];
}

export interface RepoInventory {
  repoRoot: string;
  skills: string[];
  commands: string[];
  bundles: RepoBundle[];
  defaultBundle?: RepoBundle;
}

export interface InstallTarget {
  name: string;
  kind: InstallUnitKind;
  source: string;
  target: string;
  action: "copy";
  collision: boolean;
}

export interface SkippedItem {
  item: string;
  kind: InstallUnitKind | "bundle" | "item";
  reason: string;
}

export interface InstallPlan {
  agent: ScopedAgent;
  scope: InstallScope;
  root: string;
  requested: string[];
  description?: string;
  skills: InstallTarget[];
  commands: InstallTarget[];
  skipped: SkippedItem[];
  warnings: string[];
}

export interface InstallReceipt {
  agent: ScopedAgent;
  scope: InstallScope;
  root: string;
  description?: string;
  sourceRepoPath: string;
  installedSkills: string[];
  installedCommands: string[];
  installedAt: string;
}

export interface InstalledSummary {
  agent: ScopedAgent;
  scope: InstallScope;
  installedSkills: string[];
  installedCommands: string[];
  installed: string[];
}

export interface InstallResult {
  status: PlanStatus;
  agent: ScopedAgent;
  scope: InstallScope;
  root: string;
  description?: string;
  installed: string[];
  skipped: SkippedItem[];
  warnings: string[];
  receiptPath?: string;
}

export interface DoctorCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface DoctorResult {
  agent: ScopedAgent;
  scope: InstallScope;
  root: string;
  checks: DoctorCheck[];
}

export interface CliOptions {
  command: "plan" | "install" | "list" | "doctor" | "guided" | "tui";
  items: string[];
  /** From repeated `--agent` and/or comma-separated values; empty when omitted (interactive TUI). */
  agents: ScopedAgent[];
  scope?: InstallScope;
  overwrite: boolean;
  mode?: "plan" | "install" | "list";
  yes: boolean;
}
