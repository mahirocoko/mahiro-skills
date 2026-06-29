import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

import type {
  InventoryGap,
  RepoBundle,
  RepoGapsResult,
  RepoInventory,
  RepoManifestResult,
  RepoSearchResult,
  SkillCatalogEntry,
  SkillSearchResult,
} from "./types";

export function getRepoRoot(): string {
  return process.env.MAHIRO_SKILLS_REPO_ROOT || join(import.meta.dir, "..");
}

function readDirNames(path: string): string[] {
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readCommandNames(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name.replace(/\.md$/, ""))
    .sort();
}

function readGeminiCommandFileNames(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".toml"))
    .map((entry) => entry.name.replace(/\.toml$/, ""))
    .sort();
}

function readGeminiCommandFiles(path: string, knownCommandNames: Set<string>): Map<string, string> {
  const commandFiles = new Map<string, string>();
  if (!existsSync(path)) {
    return commandFiles;
  }

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".toml")) {
      continue;
    }

    const rawName = entry.name.replace(/\.toml$/, "");
    const strippedName = rawName.replace(/^mh-/, "");
    const normalizedName = knownCommandNames.has(rawName)
      ? rawName
      : knownCommandNames.has(strippedName)
        ? strippedName
        : strippedName;

    commandFiles.set(normalizedName, join(path, entry.name));
  }

  return commandFiles;
}

function readBundles(repoRoot: string): RepoBundle[] {
  const manifestPath = join(repoRoot, ".claude-plugin", "marketplace.json");
  if (!existsSync(manifestPath)) {
    return [];
  }

  try {
    const content = readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(content) as { bundles?: RepoBundle[] };

    return (parsed.bundles ?? []).map((bundle) => ({
      name: bundle.name,
      description: bundle.description,
      skills: [...bundle.skills],
      commands: [...bundle.commands],
    }));
  } catch {
    return [];
  }
}

export function getRepoInventory(repoRoot = getRepoRoot()): RepoInventory {
  const skills = readDirNames(join(repoRoot, "skills"));
  const markdownCommands = readCommandNames(join(repoRoot, "commands"));
  const bundles = readBundles(repoRoot);
  const knownCommandNames = new Set([...skills, ...markdownCommands, ...bundles.flatMap((bundle) => bundle.commands)]);
  const geminiCommands = readGeminiCommandFileNames(join(repoRoot, "commands-gemini")).map((name) => {
    if (knownCommandNames.has(name)) {
      return name;
    }

    const strippedName = name.replace(/^mh-/, "");
    return knownCommandNames.has(strippedName) ? strippedName : name;
  });
  const commands = [...new Set([...markdownCommands, ...geminiCommands])].sort();
  const defaultBundle = bundles[0] ?? {
    name: "fallback-all",
    description: "Fallback bundle generated from repo contents",
    skills,
    commands,
  };

  return {
    repoRoot,
    skills,
    commands,
    bundles,
    defaultBundle,
  };
}

function parseSkillFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }

  const result: { name?: string; description?: string } = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key === "name") {
      result.name = value;
    }
    if (key === "description") {
      result.description = value;
    }
  }

  return result;
}

export function getSkillCatalog(repoRoot = getRepoRoot()): SkillCatalogEntry[] {
  const inventory = getRepoInventory(repoRoot);
  const markdownCommandNames = new Set(readCommandNames(join(repoRoot, "commands")));
  const knownCommandNames = new Set([
    ...inventory.skills,
    ...markdownCommandNames,
    ...inventory.bundles.flatMap((bundle) => bundle.commands),
  ]);
  const geminiCommandFiles = readGeminiCommandFiles(join(repoRoot, "commands-gemini"), knownCommandNames);
  const defaultBundleSkills = new Set(inventory.defaultBundle?.skills ?? []);

  return inventory.skills.map((skillName) => {
    const skillPath = join(repoRoot, "skills", skillName);
    const skillFilePath = join(skillPath, "SKILL.md");
    const hasSkillFile = existsSync(skillFilePath);
    const frontmatter = hasSkillFile ? parseSkillFrontmatter(readFileSync(skillFilePath, "utf8")) : {};
    const markdownCommandPath = join(repoRoot, "commands", `${skillName}.md`);
    const geminiCommandPath = geminiCommandFiles.get(skillName);

    return {
      name: skillName,
      description: frontmatter.description,
      skillPath,
      skillFilePath: hasSkillFile ? skillFilePath : undefined,
      frontmatterName: frontmatter.name,
      frontmatterDescription: frontmatter.description,
      hasSkillFile,
      hasMarkdownCommand: markdownCommandNames.has(skillName),
      markdownCommandPath: markdownCommandNames.has(skillName) ? markdownCommandPath : undefined,
      hasGeminiCommand: geminiCommandPath !== undefined,
      geminiCommandPath,
      inDefaultBundle: defaultBundleSkills.has(skillName),
    };
  });
}

export function getInventoryGaps(repoRoot = getRepoRoot()): InventoryGap[] {
  const inventory = getRepoInventory(repoRoot);
  const catalog = getSkillCatalog(repoRoot);
  const gaps: InventoryGap[] = [];
  const skillNames = new Set(inventory.skills);
  const markdownCommandNames = new Set(readCommandNames(join(repoRoot, "commands")));
  const knownCommandNames = new Set([
    ...inventory.skills,
    ...markdownCommandNames,
    ...inventory.bundles.flatMap((bundle) => bundle.commands),
  ]);
  const geminiCommandNames = new Set(readGeminiCommandFiles(join(repoRoot, "commands-gemini"), knownCommandNames).keys());
  const commandNames = new Set([...markdownCommandNames, ...geminiCommandNames]);
  const defaultBundleSkillNames = new Set(inventory.defaultBundle?.skills ?? []);
  const defaultBundleCommandNames = new Set(inventory.defaultBundle?.commands ?? []);

  for (const entry of catalog) {
    if (!entry.hasSkillFile) {
      gaps.push({
        code: "missing-skill-file",
        severity: "error",
        item: entry.name,
        detail: `skills/${entry.name}/SKILL.md is missing.`,
      });
    }

    if (entry.frontmatterName && entry.frontmatterName !== entry.name) {
      gaps.push({
        code: "frontmatter-name-mismatch",
        severity: "error",
        item: entry.name,
        detail: `skills/${entry.name}/SKILL.md declares name '${entry.frontmatterName}'.`,
      });
    }

    if (!defaultBundleSkillNames.has(entry.name)) {
      gaps.push({
        code: "skill-missing-default-bundle",
        severity: "warning",
        item: entry.name,
        detail: `Skill '${entry.name}' is not listed in the default bundle.`,
      });
    }

    if (markdownCommandNames.has(entry.name) && !defaultBundleCommandNames.has(entry.name)) {
      gaps.push({
        code: "command-missing-default-bundle",
        severity: "warning",
        item: entry.name,
        detail: `Command '${entry.name}' is not listed in the default bundle.`,
      });
    }
  }

  for (const commandName of markdownCommandNames) {
    if (!skillNames.has(commandName)) {
      gaps.push({
        code: "command-without-skill",
        severity: "warning",
        item: commandName,
        detail: `commands/${commandName}.md has no matching skill directory.`,
      });
    }
  }

  for (const commandName of geminiCommandNames) {
    if (!skillNames.has(commandName)) {
      gaps.push({
        code: "gemini-command-without-skill",
        severity: "warning",
        item: commandName,
        detail: `commands-gemini command '${commandName}' has no matching skill directory.`,
      });
    }
  }

  for (const bundle of inventory.bundles) {
    for (const skillName of bundle.skills) {
      if (!skillNames.has(skillName)) {
        gaps.push({
          code: "bundle-skill-missing",
          severity: "error",
          item: skillName,
          detail: `Bundle '${bundle.name}' references missing skill '${skillName}'.`,
        });
      }
    }

    for (const commandName of bundle.commands) {
      if (!commandNames.has(commandName)) {
        gaps.push({
          code: "bundle-command-missing",
          severity: "error",
          item: commandName,
          detail: `Bundle '${bundle.name}' references missing command '${commandName}'.`,
        });
      }
    }
  }

  return gaps.sort((left, right) => `${left.severity}:${left.code}:${left.item}`.localeCompare(`${right.severity}:${right.code}:${right.item}`));
}

export function getRepoManifest(repoRoot = getRepoRoot()): RepoManifestResult {
  const inventory = getRepoInventory(repoRoot);

  return {
    type: "manifest",
    repoRoot,
    skills: getSkillCatalog(repoRoot),
    commands: inventory.commands,
    bundles: inventory.bundles,
    defaultBundle: inventory.defaultBundle,
    gaps: getInventoryGaps(repoRoot),
  };
}

function scoreCatalogEntry(entry: SkillCatalogEntry, query: string): SkillSearchResult | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  const matched: string[] = [];
  let score = 0;
  const name = entry.name.toLowerCase();
  const description = entry.description?.toLowerCase() ?? "";

  if (name === normalizedQuery) {
    matched.push("name:exact");
    score += 100;
  } else if (name.includes(normalizedQuery)) {
    matched.push("name");
    score += 50;
  }

  if (description.includes(normalizedQuery)) {
    matched.push("description");
    score += 20;
  }

  if (matched.length === 0) {
    return null;
  }

  return {
    name: entry.name,
    description: entry.description,
    score,
    matched,
    hasMarkdownCommand: entry.hasMarkdownCommand,
    hasGeminiCommand: entry.hasGeminiCommand,
    inDefaultBundle: entry.inDefaultBundle,
  };
}

export function searchSkillCatalog(query: string, repoRoot = getRepoRoot()): RepoSearchResult {
  const results = getSkillCatalog(repoRoot)
    .map((entry) => scoreCatalogEntry(entry, query))
    .filter((entry): entry is SkillSearchResult => entry !== null)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));

  return {
    type: "search",
    repoRoot,
    query,
    results,
  };
}

export function getRepoGaps(repoRoot = getRepoRoot()): RepoGapsResult {
  const gaps = getInventoryGaps(repoRoot);

  return {
    type: "gaps",
    repoRoot,
    ok: gaps.every((gap) => gap.severity !== "error"),
    gaps,
  };
}
