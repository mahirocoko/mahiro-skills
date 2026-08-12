import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const SKILLS_CLI_VERSION = "1.5.22";
const repoRoot = join(import.meta.dir, "..");
const skillsRoot = join(repoRoot, "skills");

function packagedSkillNames(): string[] {
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

function runSkills(args: string[], cwd: string, home: string): string {
  const npxPath = Bun.which("npx");
  if (!npxPath) {
    throw new Error("npx is required for the external skills CLI compatibility smoke.");
  }
  const result = Bun.spawnSync(
    [npxPath, "-y", `skills@${SKILLS_CLI_VERSION}`, ...args],
    {
      cwd,
      env: {
        ...process.env,
        HOME: home,
        NO_COLOR: "1",
        XDG_CACHE_HOME: join(home, ".cache"),
        XDG_CONFIG_HOME: join(home, ".config"),
        npm_config_cache: join(home, ".npm"),
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const stdout = result.stdout.toString();
  const stderr = result.stderr.toString();
  if (result.exitCode !== 0) {
    throw new Error(`skills CLI failed (${result.exitCode})\n${stdout}\n${stderr}`);
  }

  return `${stdout}\n${stderr}`;
}

const skillNames = packagedSkillNames();
const tempRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-compat-"));
const projectRoot = join(tempRoot, "project");
const homeRoot = join(tempRoot, "home");
mkdirSync(projectRoot, { recursive: true });
mkdirSync(homeRoot, { recursive: true });

try {
  const listOutput = runSkills(["add", repoRoot, "--list"], tempRoot, homeRoot);
  if (!listOutput.includes(`Found ${skillNames.length} skills`)) {
    throw new Error(`Expected skills CLI to find ${skillNames.length} packaged skills.\n${listOutput}`);
  }
  for (const skillName of skillNames) {
    const escapedName = skillName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`\\n[^\\n]*\\b${escapedName}\\s*\\n`).test(listOutput)) {
      throw new Error(`Expected external discovery to include ${skillName}.\n${listOutput}`);
    }
  }
  if (/\n[^\n]*\btemplate\s*\n/.test(listOutput)) {
    throw new Error(`Authoring template leaked into external skill discovery.\n${listOutput}`);
  }

  const installOutput = runSkills(
    ["add", repoRoot, "--skill", "recap", "--agent", "universal", "--copy", "--yes"],
    projectRoot,
    homeRoot,
  );
  const installedRoot = join(projectRoot, ".agents", "skills", "recap");
  for (const path of [
    join(installedRoot, "SKILL.md"),
    join(installedRoot, "recap.ts"),
    join(installedRoot, "references", "rich-paths.md"),
  ]) {
    if (!existsSync(path)) {
      throw new Error(`Expected isolated compatibility install to create ${path}.\n${installOutput}`);
    }
  }

  console.log(
    `skills@${SKILLS_CLI_VERSION} compatibility smoke passed: discovered ${skillNames.length} packaged skills and copied recap into an isolated project.`,
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
