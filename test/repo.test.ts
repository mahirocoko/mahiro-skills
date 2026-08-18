import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { getInventoryGaps, getRepoInventory, getRepoManifest, searchSkillCatalog } from "../src/repo";

function writeSkill(repoRoot: string, name: string, description = `${name} skill`): void {
  mkdirSync(join(repoRoot, "skills", name), { recursive: true });
  writeFileSync(
    join(repoRoot, "skills", name, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`,
  );
}

function writeMarketplace(repoRoot: string, skills: string[], commands = skills): void {
  mkdirSync(join(repoRoot, ".claude-plugin"), { recursive: true });
  writeFileSync(
    join(repoRoot, ".claude-plugin", "marketplace.json"),
    JSON.stringify(
      {
        bundles: [
          {
            name: "default",
            description: "Default bundle",
            skills,
            commands,
          },
        ],
      },
      null,
      2,
    ),
  );
}

describe("repo inventory", () => {
  test("keeps the canonical catalog default-or-absent", () => {
    const repoRoot = join(import.meta.dir, "..");
    const manifest = getRepoManifest(repoRoot);
    const removed = ["deep-research", "frontend-design", "philosophy", "uncodixify"];

    expect(manifest.gaps).toEqual([]);
    expect(manifest.skills.every((skill) => skill.inDefaultBundle)).toBe(true);

    for (const name of removed) {
      expect(existsSync(join(repoRoot, "skills", name))).toBe(false);
      expect(existsSync(join(repoRoot, "commands", `${name}.md`))).toBe(false);
      expect(manifest.commands).not.toContain(name);
    }
  });

  test("builds command inventory only from canonical markdown wrappers", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-repo-"));

    mkdirSync(join(repoRoot, "skills", "project"), { recursive: true });
    mkdirSync(join(repoRoot, "skills", "watch"), { recursive: true });
    mkdirSync(join(repoRoot, "skills", "mahiro-style"), { recursive: true });
    mkdirSync(join(repoRoot, "commands"), { recursive: true });

    writeFileSync(join(repoRoot, "commands", "project.md"), "# project\n");
    writeFileSync(join(repoRoot, "commands", "watch.md"), "# watch\n");

    const inventory = getRepoInventory(repoRoot);

    expect(inventory.commands).toEqual(["project", "watch"]);
  });

  test("builds a skill manifest from skills, commands, and bundle membership", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-repo-"));

    writeSkill(repoRoot, "project", "Track and manage repos");
    mkdirSync(join(repoRoot, "commands"), { recursive: true });
    writeFileSync(join(repoRoot, "commands", "project.md"), "# project\n");
    writeMarketplace(repoRoot, ["project"]);

    const manifest = getRepoManifest(repoRoot);

    expect(manifest.type).toBe("manifest");
    expect(manifest.skills).toHaveLength(1);
    expect(manifest.skills[0]).toMatchObject({
      name: "project",
      description: "Track and manage repos",
      frontmatterName: "project",
      hasSkillFile: true,
      hasMarkdownCommand: true,
      inDefaultBundle: true,
    });
    expect(manifest.gaps).toEqual([]);
  });

  test("reports authoring inventory gaps", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-repo-"));

    mkdirSync(join(repoRoot, "skills", "broken"), { recursive: true });
    writeSkill(repoRoot, "present");
    mkdirSync(join(repoRoot, "commands"), { recursive: true });
    writeFileSync(join(repoRoot, "commands", "ghost.md"), "# ghost\n");
    writeMarketplace(repoRoot, ["missing"], ["missing-command"]);

    const gapCodes = getInventoryGaps(repoRoot).map((gap) => gap.code);

    expect(gapCodes).toContain("missing-skill-file");
    expect(gapCodes).toContain("command-without-skill");
    expect(gapCodes).toContain("bundle-skill-missing");
    expect(gapCodes).toContain("bundle-command-missing");
    expect(gapCodes).toContain("skill-missing-default-bundle");
  });

  test("searches skill names and descriptions", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-repo-"));

    writeSkill(repoRoot, "project", "Track and manage external repositories");
    writeSkill(repoRoot, "recap", "Create session orientation summaries");
    mkdirSync(join(repoRoot, "commands"), { recursive: true });
    writeMarketplace(repoRoot, ["project", "recap"], ["project", "recap"]);

    const result = searchSkillCatalog("repo", repoRoot);

    expect(result.type).toBe("search");
    expect(result.results.map((entry) => entry.name)).toEqual(["project"]);
    expect(result.results[0].matched).toContain("description");
  });
});
