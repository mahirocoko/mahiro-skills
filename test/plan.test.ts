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
      expect(plan.skills.length).toBe(21);
      expect(plan.commands.length).toBe(21);
      expect(plan.skills.some((entry) => entry.name === "auditing-context-contracts")).toBe(true);
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
      expect(plan.skills.length).toBe(21);
      expect(plan.commands.length).toBe(21);
      expect(plan.skills.some((entry) => entry.name === "auditing-context-contracts")).toBe(true);
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

  test("resolves Agy roots as namespaced slash-only skill output", () => {
    const temp = makeTempEnv();
    try {
      const localPlan = createPlan("agy", "local", ["learn"], temp.env);
      const globalPlan = createPlan("agy", "global", ["direct-cli"], temp.env);
      const defaultPlan = createPlan("agy", "global", [], temp.env);

      expect(localPlan.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents"));
      expect(localPlan.skills.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "mh-learn"),
      ]);
      expect(localPlan.commands).toEqual([]);
      expect(globalPlan.root).toBe(join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini", "config"));
      expect(globalPlan.skills.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini", "config", "skills", "mh-direct-cli"),
      ]);
      expect(globalPlan.commands).toEqual([]);
      expect(defaultPlan.description).toBe("Mahiro Skill | Packaged local skills from the current mahiro-skills bundle; 'agy' installs only namespaced /mh-* Agent Skill aliases and does not copy command wrappers.");
      expect(defaultPlan.skills.every((entry) => entry.target.includes(`${join("skills", "mh-")}`))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("resolves Letta Code roots as skills-only Agent Skills output", () => {
    const temp = makeTempEnv();
    try {
      const localPlan = createPlan("letta-code", "local", ["project"], temp.env);
      const globalPlan = createPlan("letta-code", "global", ["recap"], temp.env);

      expect(localPlan.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents"));
      expect(localPlan.skills.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "project"),
      ]);
      expect(localPlan.commands).toEqual([]);
      expect(globalPlan.root).toBe(join(temp.env.MAHIRO_SKILLS_HOME!, ".letta"));
      expect(globalPlan.skills.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_HOME!, ".letta", "skills", "recap"),
      ]);
      expect(globalPlan.commands).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("resolves Pi roots as skills-only Agent Skills output", () => {
    const temp = makeTempEnv();
    try {
      const localPlan = createPlan("pi", "local", ["project"], temp.env);
      const globalPlan = createPlan("pi", "global", ["recap"], temp.env);
      const defaultGlobalPlan = createPlan("pi", "global", [], temp.env);
      const isolatedRoot = join(temp.root, "pi-isolated", ".pi", "agent");
      const isolatedPlan = createPlan("pi", "global", ["mahiro-style"], {
        ...temp.env,
        PI_CODING_AGENT_DIR: isolatedRoot,
      });
      const isolatedPlanWithoutHome = createPlan("pi", "global", ["project"], {
        ...temp.env,
        HOME: "",
        MAHIRO_SKILLS_HOME: "",
        PI_CODING_AGENT_DIR: isolatedRoot,
      });
      const localPlanWithGlobalOverride = createPlan("pi", "local", ["project"], {
        ...temp.env,
        PI_CODING_AGENT_DIR: isolatedRoot,
      });
      const tildePlan = createPlan("pi", "global", ["project"], {
        ...temp.env,
        PI_CODING_AGENT_DIR: "~/.pi-custom/agent",
      });

      expect(localPlan.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".pi"));
      expect(localPlan.skills.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_CWD!, ".pi", "skills", "project"),
      ]);
      expect(localPlan.commands).toEqual([]);
      expect(globalPlan.root).toBe(join(temp.env.MAHIRO_SKILLS_HOME!, ".pi", "agent"));
      expect(globalPlan.skills.map((entry) => entry.target)).toEqual([
        join(temp.env.MAHIRO_SKILLS_HOME!, ".pi", "agent", "skills", "recap"),
      ]);
      expect(globalPlan.commands).toEqual([]);
      expect(defaultGlobalPlan.description).toBe("Mahiro Skill | Packaged local skills from the current mahiro-skills bundle; 'pi' installs Agent Skills only and does not copy command wrappers.");
      expect(isolatedPlan.root).toBe(isolatedRoot);
      expect(isolatedPlan.skills[0]?.target).toBe(join(isolatedRoot, "skills", "mahiro-style"));
      expect(isolatedPlan.commands).toEqual([]);
      expect(isolatedPlanWithoutHome.root).toBe(isolatedRoot);
      expect(localPlanWithGlobalOverride.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".pi"));
      expect(tildePlan.root).toBe(join(temp.env.MAHIRO_SKILLS_HOME!, ".pi-custom", "agent"));
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

  test("keeps removed game workflow skills outside the install catalog", () => {
    const temp = makeTempEnv();
    try {
      for (const name of ["sprite-workflow", "vfx-workflow", "game-production"]) {
        expect(() => createPlan("opencode", "local", [name], temp.env)).toThrow(`Unknown install item '${name}'.`);
      }
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
