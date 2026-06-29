import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, relative } from "path";

import { getRepoRoot } from "./repo";
import type { NewSkillResult } from "./types";

const SKILL_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function validateSkillName(name: string): void {
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid skill name '${name}'. Use kebab-case lowercase letters and numbers.`);
  }
}

function listFiles(root: string): string[] {
  const files: string[] = [];

  function walk(path: string): void {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) {
        walk(child);
        continue;
      }

      if (entry.isFile()) {
        files.push(relative(root, child));
      }
    }
  }

  walk(root);
  return files.sort();
}

function rewriteSkillTemplate(skillFilePath: string, name: string): void {
  const content = readFileSync(skillFilePath, "utf8");
  const nextContent = content
    .replace(/^name: .*$/m, `name: ${name}`)
    .replace(
      /^description: .*$/m,
      `description: TODO: Describe when to use the ${name} skill.`,
    )
    .replace(/^# \/template - Skill Template$/m, `# /${name} - Skill Template`)
    .replaceAll("/template", `/${name}`)
    .replaceAll("your-skill-name", name)
    .replaceAll("your-skill", name);

  writeFileSync(skillFilePath, nextContent, "utf8");
}

export function createSkillFromTemplate(name: string, repoRoot = getRepoRoot()): NewSkillResult {
  validateSkillName(name);

  const templatePath = join(repoRoot, "template");
  const targetPath = join(repoRoot, "skills", name);
  if (!existsSync(templatePath)) {
    throw new Error("Template directory is missing.");
  }
  if (existsSync(targetPath)) {
    throw new Error(`Skill '${name}' already exists.`);
  }

  cpSync(templatePath, targetPath, { recursive: true, errorOnExist: true });

  const skillFilePath = join(targetPath, "SKILL.md");
  if (existsSync(skillFilePath)) {
    rewriteSkillTemplate(skillFilePath, name);
  }

  return {
    type: "new-skill",
    name,
    repoRoot,
    skillPath: targetPath,
    files: listFiles(targetPath),
    nextSteps: [
      `Edit skills/${name}/SKILL.md description, scope, workflow, and validation gates.`,
      `Add paired command wrappers if this skill should be slash-invokable: commands/${name}.md and commands-gemini/mh-${name}.toml.`,
      "Update .claude-plugin/marketplace.json, skills/llms.txt, README.md, and tests in the same feature pass when the skill becomes part of the packaged bundle.",
      "Run bun ./src/cli.ts gaps --json before committing authoring changes.",
    ],
  };
}
