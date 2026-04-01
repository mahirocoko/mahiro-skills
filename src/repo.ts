import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

import type { RepoBundle, RepoInventory } from "./types";

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
