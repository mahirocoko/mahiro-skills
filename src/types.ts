export const supportedAgents = ["opencode", "claude-code", "cursor", "gemini", "codex", "letta-code"] as const;

export type SupportedAgent = (typeof supportedAgents)[number];

export type ScopedAgent = SupportedAgent;

export type InstallScope = "global" | "local";

export type PlanStatus = "installed" | "partially-installed" | "skipped" | "unsupported";

export type UninstallStatus = "uninstalled" | "partially-uninstalled" | "skipped";

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

export interface SkillCatalogEntry {
  name: string;
  description?: string;
  skillPath: string;
  skillFilePath?: string;
  frontmatterName?: string;
  frontmatterDescription?: string;
  hasSkillFile: boolean;
  hasMarkdownCommand: boolean;
  markdownCommandPath?: string;
  hasGeminiCommand: boolean;
  geminiCommandPath?: string;
  inDefaultBundle: boolean;
}

export type InventoryGapSeverity = "error" | "warning";

export interface InventoryGap {
  code:
    | "missing-skill-file"
    | "frontmatter-name-mismatch"
    | "command-without-skill"
    | "gemini-command-without-skill"
    | "bundle-skill-missing"
    | "bundle-command-missing"
    | "skill-missing-default-bundle"
    | "command-missing-default-bundle";
  severity: InventoryGapSeverity;
  item: string;
  detail: string;
}

export interface RepoManifestResult {
  type: "manifest";
  repoRoot: string;
  skills: SkillCatalogEntry[];
  commands: string[];
  bundles: RepoBundle[];
  defaultBundle?: RepoBundle;
  gaps: InventoryGap[];
}

export interface SkillSearchResult {
  name: string;
  description?: string;
  score: number;
  matched: string[];
  hasMarkdownCommand: boolean;
  hasGeminiCommand: boolean;
  inDefaultBundle: boolean;
}

export interface RepoSearchResult {
  type: "search";
  repoRoot: string;
  query: string;
  results: SkillSearchResult[];
}

export interface RepoGapsResult {
  type: "gaps";
  repoRoot: string;
  ok: boolean;
  gaps: InventoryGap[];
}

export interface NewSkillResult {
  type: "new-skill";
  name: string;
  repoRoot: string;
  skillPath: string;
  files: string[];
  nextSteps: string[];
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

export interface UninstalledTarget {
  item: string;
  kind: InstallUnitKind;
  target: string;
  removed: boolean;
}

export interface UninstallResult {
  status: UninstallStatus;
  agent: ScopedAgent;
  scope: InstallScope;
  root: string;
  uninstalled: string[];
  targets: UninstalledTarget[];
  skipped: SkippedItem[];
  receiptPath?: string;
  receiptRemoved: boolean;
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
  command: "plan" | "install" | "uninstall" | "list" | "doctor" | "guided" | "tui" | "manifest" | "search" | "gaps" | "new";
  items: string[];
  /** From repeated `--agent` and/or comma-separated values; empty when omitted (interactive TUI). */
  agents: ScopedAgent[];
  scope?: InstallScope;
  overwrite: boolean;
  copyTemplate: boolean;
  mode?: "plan" | "install" | "uninstall" | "list";
  yes: boolean;
}
