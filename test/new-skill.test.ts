import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { createSkillFromTemplate } from "../src/new-skill";

function makeRepoWithTemplate() {
  const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-new-"));
  mkdirSync(join(repoRoot, "template"), { recursive: true });
  mkdirSync(join(repoRoot, "skills"), { recursive: true });
  writeFileSync(
    join(repoRoot, "template", "SKILL.md.template"),
    `---\nname: template\ndescription: Human-readable skill scaffold. Copy this folder to create new skills.\n---\n\n# /template - Skill Template\n\nUse /template with your-skill-name.\n`,
  );

  return {
    repoRoot,
    cleanup() {
      rmSync(repoRoot, { recursive: true, force: true });
    },
  };
}

function makeRepoWithCanonicalTemplate() {
  const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-new-canonical-"));
  mkdirSync(join(repoRoot, "skills"), { recursive: true });
  cpSync(join(import.meta.dir, "..", "template"), join(repoRoot, "template"), { recursive: true });

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
      expect(existsSync(join(repo.repoRoot, "skills", "sample-skill", "SKILL.md.template"))).toBe(false);
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

  test("materializes the canonical human-readable scaffold", () => {
    const repo = makeRepoWithCanonicalTemplate();

    try {
      const result = createSkillFromTemplate("readable-skill", repo.repoRoot);
      const skill = readFileSync(join(repo.repoRoot, "skills", "readable-skill", "SKILL.md"), "utf8");

      expect(skill).toContain("name: readable-skill");
      expect(skill).toContain("description: TODO: Describe what readable-skill does and when to use it.");
      expect(skill).toContain("## Operating Posture");
      expect(skill).toContain("## Scope and Handoffs");
      expect(skill).toContain("## Decision Sequence");
      expect(skill).toContain("## Example");
      expect(skill).toContain("## Validation / Self-check");
      expect(skill).toContain("docs/authoring/human-readable-skill-writing.md");
      expect(result.nextSteps).toContain("Remove authoring placeholders and unused resource folders before packaging.");
    } finally {
      repo.cleanup();
    }
  });
});
