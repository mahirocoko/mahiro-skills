import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { createSkillFromTemplate } from "../src/new-skill";

function makeRepoWithTemplate() {
  const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-new-"));
  mkdirSync(join(repoRoot, "template"), { recursive: true });
  mkdirSync(join(repoRoot, "skills"), { recursive: true });
  writeFileSync(
    join(repoRoot, "template", "SKILL.md"),
    `---\nname: template\ndescription: Skill template with Bun Shell pattern. Copy this folder to create new skills.\n---\n\n# /template - Skill Template\n\nUse /template with your-skill-name.\n`,
  );

  return {
    repoRoot,
    cleanup() {
      rmSync(repoRoot, { recursive: true, force: true });
    },
  };
}

describe("new skill scaffold", () => {
  test("copies template and rewrites minimal skill metadata", () => {
    const repo = makeRepoWithTemplate();

    try {
      const result = createSkillFromTemplate("sample-skill", repo.repoRoot);
      const skillFile = join(repo.repoRoot, "skills", "sample-skill", "SKILL.md");

      expect(result).toMatchObject({
        type: "new-skill",
        name: "sample-skill",
        files: ["SKILL.md"],
      });
      expect(result.nextSteps.some((step) => step.includes("marketplace.json"))).toBe(true);
      expect(existsSync(skillFile)).toBe(true);
      expect(readFileSync(skillFile, "utf8")).toContain("name: sample-skill");
      expect(readFileSync(skillFile, "utf8")).toContain("# /sample-skill - Skill Template");
      expect(readFileSync(skillFile, "utf8")).not.toContain("/template");
    } finally {
      repo.cleanup();
    }
  });

  test("refuses invalid names and collisions", () => {
    const repo = makeRepoWithTemplate();

    try {
      expect(() => createSkillFromTemplate("Bad_Name", repo.repoRoot)).toThrow("Invalid skill name");
      createSkillFromTemplate("sample-skill", repo.repoRoot);
      expect(() => createSkillFromTemplate("sample-skill", repo.repoRoot)).toThrow("already exists");
    } finally {
      repo.cleanup();
    }
  });
});
