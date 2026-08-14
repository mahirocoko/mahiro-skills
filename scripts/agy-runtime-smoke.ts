import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface IAgySkill {
  name: string;
  path: string;
  builtin: boolean;
  model_invocable: boolean;
}

interface IAgySkillsResponse {
  command?: {
    name?: string;
    data?: {
      skills?: IAgySkill[];
    };
  };
}

const repoRoot = join(import.meta.dir, "..");
const smokeRoot = join(homedir(), ".gemini", "config");
const skillRoot = join(smokeRoot, "skills", "mh-learn");
const receiptPath = join(smokeRoot, ".mahiro-skills", "receipts", "global-agy.json");

const run = (command: string[], cwd: string, env = process.env) => {
  const result = Bun.spawnSync(command, { cwd, env });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);

  if (result.exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed with exit ${result.exitCode}: ${stderr || stdout}`);
  }

  return stdout;
};

const installedSkills = existsSync(receiptPath)
  ? (JSON.parse(readFileSync(receiptPath, "utf8")) as { installedSkills?: string[] }).installedSkills ?? []
  : [];
const receiptIncludesLearn = installedSkills.includes("learn");

if (existsSync(skillRoot) !== receiptIncludesLearn) {
  throw new Error("Agy runtime smoke found an unmanaged or incomplete global mh-learn installation; inspect it before continuing.");
}

const createdForSmoke = !existsSync(skillRoot);

try {
  if (createdForSmoke) {
    run(["bun", join(repoRoot, "src", "cli.ts"), "install", "learn", "--agent", "agy", "--scope", "global"], repoRoot);
  }

  const response = JSON.parse(run(["agy", "-p", "/skills", "--output-format", "json"], repoRoot)) as IAgySkillsResponse;
  const discovered = response.command?.data?.skills ?? [];
  const expectedSkills = createdForSmoke ? ["learn"] : installedSkills;

  for (const canonicalName of expectedSkills) {
    const aliasName = `mh-${canonicalName}`;
    const expectedPath = join(smokeRoot, "skills", aliasName, "SKILL.md");
    const skill = discovered.find((entry) => entry.name === aliasName);

    if (!skill) {
      throw new Error(`Agy did not discover the receipt-managed ${aliasName} skill alias.`);
    }

    if (skill.path !== expectedPath) {
      throw new Error(`Agy discovered ${aliasName} at '${skill.path}', expected '${expectedPath}'.`);
    }

    if (skill.builtin || skill.model_invocable) {
      throw new Error(`Agy ${aliasName} must be a user slash alias with model invocation disabled.`);
    }
  }

  console.log(`Agy runtime smoke passed: discovered ${expectedSkills.length} receipt-managed /mh-* alias(es) under ${join(smokeRoot, "skills")}`);
} finally {
  if (createdForSmoke) {
    run(["bun", join(repoRoot, "src", "cli.ts"), "uninstall", "learn", "--agent", "agy", "--scope", "global"], repoRoot);
  }
}
