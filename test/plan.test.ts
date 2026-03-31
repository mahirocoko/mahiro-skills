import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { createPlan } from "../src/plan";
import { makeTempEnv } from "./helpers";

describe("plan", () => {
  test("resolves default bundle for opencode local", () => {
    const temp = makeTempEnv();
    try {
      const plan = createPlan("opencode", "local", [], temp.env);
      expect(plan.root.endsWith(".opencode")).toBe(true);
      expect(plan.description).toBe("Mahiro Skill | Packaged local skills plus slash-command wrappers from the current OpenCode install.");
      expect(plan.skills.length).toBe(11);
      expect(plan.commands.length).toBe(11);
      expect(plan.skills.some((entry) => entry.name === "project")).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("installs paired command for same-named skill on claude-code", () => {
    const temp = makeTempEnv();
    try {
      const plan = createPlan("claude-code", "global", ["project", "recap"], temp.env);
      expect(plan.root.endsWith(".claude")).toBe(true);
      expect(plan.skills.map((entry) => entry.name)).toEqual(["project", "recap"]);
      expect(plan.commands.map((entry) => entry.name)).toEqual(["project", "recap"]);
    } finally {
      temp.cleanup();
    }
  });

  test("fails planning for unknown items", () => {
    const temp = makeTempEnv();
    try {
      expect(() => createPlan("opencode", "local", ["does-not-exist"], temp.env)).toThrow("Unknown install item");
    } finally {
      temp.cleanup();
    }
  });

  test("skips explicit template request as non-installable", () => {
    const temp = makeTempEnv();
    try {
      const plan = createPlan("opencode", "local", ["template"], temp.env);
      expect(plan.skills).toEqual([]);
      expect(plan.commands).toEqual([]);
      expect(plan.skipped).toEqual([
        {
          item: "template",
          kind: "item",
          reason: "'template' is an authoring scaffold and is not installable in v0.",
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("falls back when marketplace manifest is unreadable", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-repo-"));
    const skillsDir = join(repoRoot, "skills");
    const commandsDir = join(repoRoot, "commands");
    const manifestDir = join(repoRoot, ".claude-plugin");

    mkdirSync(join(skillsDir, "alpha"), { recursive: true });
    mkdirSync(join(skillsDir, "beta"), { recursive: true });
    mkdirSync(commandsDir, { recursive: true });
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(join(commandsDir, "alpha.md"), "# alpha\n");
    writeFileSync(join(commandsDir, "beta.md"), "# beta\n");
    writeFileSync(join(manifestDir, "marketplace.json"), "{ invalid json");

    const temp = makeTempEnv();
    try {
      const plan = createPlan("opencode", "local", [], {
        ...temp.env,
        MAHIRO_SKILLS_REPO_ROOT: repoRoot,
      });
      expect(plan.skills.map((entry) => entry.name)).toEqual(["alpha", "beta"]);
      expect(plan.commands.map((entry) => entry.name)).toEqual(["alpha", "beta"]);
      expect(plan.warnings).toContain("Bundle metadata missing; fell back to all packaged skills and supported commands.");
    } finally {
      temp.cleanup();
    }
  });
});
