import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dir, "..");
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

describe("game-production skill", () => {
  test("ships a thin whole-game production director and paired wrappers", () => {
    const skill = read("skills", "game-production", "SKILL.md");
    const command = read("commands", "game-production.md");
    const gemini = read("commands-gemini", "mh-game-production.toml");

    expect(skill).toContain("name: game-production");
    expect(skill).toContain("Prototype-ready");
    expect(skill).toContain("Vertical-slice-ready");
    expect(skill).toContain("Production-ready");
    expect(skill).toContain("Release-ready");
    expect(skill).toContain("Build the whole-game inventory");
    expect(skill).toContain("Use explicit promotion states");
    expect(skill).toContain("## Stop gates");
    expect(skill).toContain("## Output contract");
    expect(skill).toContain("## Validation / self-check");
    expect(skill).not.toContain("Evarune");
    expect(command).toContain('skill: "game-production"');
    expect(gemini).toContain('skill: \\\"game-production\\\"');
  });

  test("keeps detailed production gates behind direct references", () => {
    const skill = read("skills", "game-production", "SKILL.md");
    for (const file of ["production-phases.md", "performance-qa.md", "release-readiness.md", "repo-adapter-boundaries.md"]) {
      expect(existsSync(join(root, "skills", "game-production", "references", file))).toBe(true);
      expect(skill).toContain(`references/${file}`);
    }
  });
});
