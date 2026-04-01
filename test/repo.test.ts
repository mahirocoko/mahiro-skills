import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { getRepoInventory } from "../src/repo";

describe("repo inventory", () => {
  test("includes normalized Gemini command names from namespaced toml files", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-repo-"));

    mkdirSync(join(repoRoot, "skills", "project"), { recursive: true });
    mkdirSync(join(repoRoot, "skills", "watch"), { recursive: true });
    mkdirSync(join(repoRoot, "skills", "mahiro-style"), { recursive: true });
    mkdirSync(join(repoRoot, "commands"), { recursive: true });
    mkdirSync(join(repoRoot, "commands-gemini"), { recursive: true });

    writeFileSync(join(repoRoot, "commands", "project.md"), "# project\n");
    writeFileSync(join(repoRoot, "commands-gemini", "mh-watch.toml"), 'description = "watch"\n');
    writeFileSync(join(repoRoot, "commands-gemini", "mh-mahiro-style.toml"), 'description = "style"\n');

    const inventory = getRepoInventory(repoRoot);

    expect(inventory.commands).toEqual(["mahiro-style", "project", "watch"]);
  });
});
