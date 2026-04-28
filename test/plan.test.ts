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
      expect(plan.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
      expect(plan.skills.length).toBe(12);
      expect(plan.commands.length).toBe(12);
      expect(plan.skills.some((entry) => entry.name === "direct-cli")).toBe(true);
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

  test("resolves default bundle for cursor local", () => {
    const temp = makeTempEnv();
    try {
      const plan = createPlan("cursor", "local", [], temp.env);
      expect(plan.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor"));
      expect(plan.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
      expect(plan.skills.length).toBe(12);
      expect(plan.commands.length).toBe(12);
      expect(plan.skills.some((entry) => entry.name === "direct-cli")).toBe(true);
      expect(plan.skills.some((entry) => entry.name === "project")).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("installs paired command for same-named skill on cursor", () => {
    const temp = makeTempEnv();
    try {
      const plan = createPlan("cursor", "global", ["project", "recap"], temp.env);
      expect(plan.root).toBe(join(temp.env.MAHIRO_SKILLS_HOME!, ".cursor"));
      expect(plan.skills.map((entry) => entry.name)).toEqual(["project", "recap"]);
      expect(plan.commands.map((entry) => entry.name)).toEqual(["project", "recap"]);
      expect(plan.commands.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_HOME!, ".cursor", "commands", "project.md"),
        join(temp.env.MAHIRO_SKILLS_HOME!, ".cursor", "commands", "recap.md"),
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("resolves default bundle for gemini local", () => {
    const temp = makeTempEnv();
    try {
      const plan = createPlan("gemini", "local", [], temp.env);
      expect(plan.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini"));
      expect(plan.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
      expect(plan.skills.length).toBe(12);
      expect(plan.commands.length).toBe(12);
      expect(plan.skills.some((entry) => entry.name === "direct-cli")).toBe(true);
      expect(plan.skills.some((entry) => entry.name === "gemini")).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("installs paired command for same-named skill on gemini", () => {
    const temp = makeTempEnv();
    try {
      const plan = createPlan("gemini", "global", ["gemini", "watch"], temp.env);
      const repoRoot = join(import.meta.dir, "..");
      expect(plan.root).toBe(join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini"));
      expect(plan.skills.map((entry) => entry.name)).toEqual(["gemini", "watch"]);
      expect(plan.commands.map((entry) => entry.name)).toEqual(["gemini", "watch"]);
      expect(plan.commands.map((entry) => entry.source)).toEqual([
        join(repoRoot, "commands-gemini", "mh-gemini.toml"),
        join(repoRoot, "commands-gemini", "mh-watch.toml"),
      ]);
      expect(plan.commands.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini", "commands", "mh-gemini.toml"),
        join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini", "commands", "mh-watch.toml"),
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("installs paired gemini command for direct-cli", () => {
    const temp = makeTempEnv();
    try {
      const plan = createPlan("gemini", "local", ["direct-cli"], temp.env);
      const repoRoot = join(import.meta.dir, "..");
      expect(plan.skills.map((entry) => entry.name)).toEqual(["direct-cli"]);
      expect(plan.commands.map((entry) => entry.name)).toEqual(["direct-cli"]);
      expect(plan.commands.map((entry) => entry.source)).toEqual([join(repoRoot, "commands-gemini", "mh-direct-cli.toml")]);
      expect(plan.commands.map((entry) => entry.target)).toEqual([join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "commands", "mh-direct-cli.toml")]);
    } finally {
      temp.cleanup();
    }
  });

  test("resolves codex roots and markdown command compatibility output", () => {
    const temp = makeTempEnv();
    try {
      const localPlan = createPlan("codex", "local", ["project"], temp.env);
      const globalPlan = createPlan("codex", "global", ["recap"], temp.env);

      expect(localPlan.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".codex"));
      expect(localPlan.skills.map((entry) => entry.name)).toEqual(["project"]);
      expect(localPlan.commands.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", "commands", "project.md"),
      ]);
      expect(globalPlan.root).toBe(join(temp.env.MAHIRO_SKILLS_HOME!, ".codex"));
      expect(globalPlan.commands.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_HOME!, ".codex", "commands", "recap.md"),
      ]);
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
