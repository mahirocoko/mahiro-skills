import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, readdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { homedir } from "os";

const decoder = new TextDecoder();

function run(args: string[], cwd = process.cwd()) {
  const result = Bun.spawnSync(args, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    ok: result.exitCode === 0,
    stdout: decoder.decode(result.stdout).trim(),
    stderr: decoder.decode(result.stderr).trim(),
  };
}

export function expandPath(input: string): string {
  return input.replace(/^~/, homedir());
}

export function getRepoRoot(): string {
  const fromEnv = process.env.REPO_ROOT ?? process.env.ROOT;
  if (fromEnv) return resolve(expandPath(fromEnv));

  const gitRoot = run(["git", "rev-parse", "--show-toplevel"]);
  if (gitRoot.ok && gitRoot.stdout) return gitRoot.stdout;

  return process.cwd();
}

export function getGhqRoot(): string {
  const ghqRoot = run(["ghq", "root"]);
  if (ghqRoot.ok && ghqRoot.stdout) return ghqRoot.stdout;

  return join(homedir(), "ghq");
}

export function getPaths(repoRoot = getRepoRoot()) {
  const agentStateDir = resolve(
    expandPath(process.env.AGENT_STATE_DIR ?? join(repoRoot, ".agent-state")),
  );

  return {
    repoRoot,
    agentStateDir,
    slugsFile: join(agentStateDir, "memory", "slugs.yaml"),
    learnDir: join(agentStateDir, "learn"),
    incubateDir: join(agentStateDir, "incubate"),
    logDir: join(agentStateDir, "memory", "logs"),
    learnOriginsFile: join(agentStateDir, "learn", ".origins"),
  };
}

export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => new Date().toTimeString().slice(0, 5);

export type RepoInfo = {
  owner: string;
  name: string;
  slug: string;
};

export function parseRepo(input: string, defaultOrg = "mahirocoko"): RepoInfo {
  const normalized = input
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^git@github\.com:/, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  if (normalized.includes("/")) {
    const [owner, name] = normalized.split("/");
    return { owner, name, slug: `${owner}/${name}` };
  }

  return {
    owner: defaultOrg,
    name: normalized,
    slug: `${defaultOrg}/${normalized}`,
  };
}

export function repoInfoFromPath(repoPath: string): RepoInfo | null {
  const parts = resolve(repoPath).split("/");
  const githubIndex = parts.lastIndexOf("github.com");
  if (githubIndex === -1 || parts.length < githubIndex + 3) return null;

  const owner = parts[githubIndex + 1];
  const name = parts[githubIndex + 2];

  if (!owner || !name) return null;

  return { owner, name, slug: `${owner}/${name}` };
}

export function ghqRepoPath(owner: string, name: string): string {
  return join(getGhqRoot(), "github.com", owner, name);
}

export function findGhqRepo(input: string): string | null {
  const ghqList = run(["ghq", "list", "-p"]);
  if (!ghqList.ok) return null;

  const match = ghqList.stdout
    .split("\n")
    .find((line) => line.toLowerCase().endsWith(`/${input.toLowerCase()}`));

  return match || null;
}

function resolveLinkTarget(linkPath: string, rawTarget: string): string {
  if (rawTarget.startsWith("/")) return rawTarget;
  return resolve(dirname(linkPath), rawTarget);
}

function safeReadlink(linkPath: string): string | undefined {
  try {
    return resolveLinkTarget(linkPath, readlinkSync(linkPath));
  } catch {
    return undefined;
  }
}

export type TrackedProject = {
  mode: "learn" | "incubate";
  owner: string;
  repo: string;
  slug: string;
  path: string;
  target?: string;
  status: "ok" | "broken";
  originPath?: string;
};

export function getTrackedLearnProjects(baseDir: string): TrackedProject[] {
  if (!existsSync(baseDir)) return [];

  const projects: TrackedProject[] = [];

  for (const ownerEntry of readdirSync(baseDir, { withFileTypes: true })) {
    if (!ownerEntry.isDirectory() || ownerEntry.name.startsWith(".")) continue;

    const ownerDir = join(baseDir, ownerEntry.name);
    for (const repoEntry of readdirSync(ownerDir, { withFileTypes: true })) {
      if (!repoEntry.isDirectory() || repoEntry.name.startsWith(".")) continue;

      const repoDir = join(ownerDir, repoEntry.name);
      const originPath = join(repoDir, "origin");
      if (!existsSync(originPath) && !lstatExists(originPath)) continue;

      const target = safeReadlink(originPath);
      projects.push({
        mode: "learn",
        owner: ownerEntry.name,
        repo: repoEntry.name,
        slug: `${ownerEntry.name}/${repoEntry.name}`,
        path: repoDir,
        target,
        status: target && existsSync(target) ? "ok" : "broken",
        originPath,
      });
    }
  }

  return projects;
}

export function getTrackedIncubateProjects(baseDir: string): TrackedProject[] {
  if (!existsSync(baseDir)) return [];

  const projects: TrackedProject[] = [];

  for (const ownerEntry of readdirSync(baseDir, { withFileTypes: true })) {
    if (!ownerEntry.isDirectory() || ownerEntry.name.startsWith(".")) continue;

    const ownerDir = join(baseDir, ownerEntry.name);
    for (const repoEntry of readdirSync(ownerDir, { withFileTypes: true })) {
      if ((!(repoEntry.isDirectory() || repoEntry.isSymbolicLink())) || repoEntry.name.startsWith(".")) continue;

      const repoPath = join(ownerDir, repoEntry.name);
      const target = repoEntry.isSymbolicLink() ? safeReadlink(repoPath) : repoPath;
      projects.push({
        mode: "incubate",
        owner: ownerEntry.name,
        repo: repoEntry.name,
        slug: `${ownerEntry.name}/${repoEntry.name}`,
        path: repoPath,
        target,
        status: target && existsSync(target) ? "ok" : "broken",
      });
    }
  }

  return projects;
}

export function matchesSlug(project: TrackedProject, input: string): boolean {
  return input.includes("/") ? project.slug === input : project.repo === input;
}

export function findTrackedProject(projects: TrackedProject[], input: string): TrackedProject | undefined {
  return projects.find((project) => matchesSlug(project, input));
}

export function readSimpleSlugMap(slugsFile: string): Map<string, string> {
  const entries = new Map<string, string>();
  if (!existsSync(slugsFile)) return entries;

  const content = readFileSync(slugsFile, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const slug = line.slice(0, separatorIndex).trim();
    const path = line.slice(separatorIndex + 1).trim();
    if (slug && path) entries.set(slug, expandPath(path));
  }

  return entries;
}

export function findInSlugs(slugsFile: string, input: string): string | null {
  const slugs = readSimpleSlugMap(slugsFile);
  if (slugs.has(input)) return slugs.get(input) ?? null;

  if (!input.includes("/")) {
    for (const [slug, path] of slugs.entries()) {
      if (slug.endsWith(`/${input}`)) return path;
    }
  }

  return null;
}

export function updateSlugsFile(slugsFile: string, slug: string, repoPath: string) {
  const entries = readSimpleSlugMap(slugsFile);
  entries.set(slug, repoPath);

  mkdirSync(dirname(slugsFile), { recursive: true });
  const lines = [
    "# Slug Registry",
    "# Auto-generated by project-manager skill",
    "# Format:",
    "#   owner/repo: /absolute/path/to/ghq/clone",
    "",
    ...Array.from(entries.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([entrySlug, entryPath]) => `${entrySlug}: ${entryPath}`),
    "",
  ];

  writeFileSync(slugsFile, lines.join("\n"), "utf8");
}

export function updateOriginsFile(originsFile: string, slug: string) {
  const existing = existsSync(originsFile)
    ? readFileSync(originsFile, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  const next = Array.from(new Set([...existing, slug])).sort();
  mkdirSync(dirname(originsFile), { recursive: true });
  writeFileSync(originsFile, `${next.join("\n")}\n`, "utf8");
}

export function lstatExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}
