import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { install } from "../src/install";
import { makeTempEnv } from "./helpers";

describe("install", () => {
  test("copies scripted skill, paired command, and receipt", () => {
    const temp = makeTempEnv();
    try {
      const sourceSkillPath = join(import.meta.dir, "..", "skills", "project", "SKILL.md");
      const sourceCommandPath = join(import.meta.dir, "..", "commands", "project.md");
      const result = install("opencode", "local", ["project"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", ".mahiro-skills", "receipts", "local-opencode.json");
      const installedSkillPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "SKILL.md");
      const installedCommandPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        sourceRepoPath: string;
        installedSkills: string[];
        installedCommands: string[];
        installedAt: string;
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "scripts", "utils.ts"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md"))).toBe(true);
      expect(readFileSync(sourceSkillPath, "utf8")).toContain("description: Clone and track external repos for study or development.");
      expect(readFileSync(sourceSkillPath, "utf8")).not.toContain("description: Mahiro Skill |");
      expect(readFileSync(sourceCommandPath, "utf8")).toContain("description: Clone and track external repos for study or development with ghq plus .agent-state-backed tracking.");
      expect(readFileSync(sourceCommandPath, "utf8")).not.toContain("description: Mahiro Skill |");
      expect(readFileSync(installedSkillPath, "utf8")).toContain("description: Mahiro Skill | Clone and track external repos for study or development.");
      expect(readFileSync(installedCommandPath, "utf8")).toContain("description: Mahiro Skill | Clone and track external repos for study or development with ghq plus .agent-state-backed tracking.");
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("opencode");
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode"));
      expect(receipt.sourceRepoPath.length).toBeGreaterThan(0);
      expect(result.installed).toEqual(["project"]);
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual(["project"]);
      expect(receipt.installedAt.length).toBeGreaterThan(0);
    } finally {
      temp.cleanup();
    }
  });

  test("surfaces bundle description when installing the default bundle", () => {
    const temp = makeTempEnv();
    try {
      const result = install("opencode", "local", [], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", ".mahiro-skills", "receipts", "local-opencode.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        description?: string;
      };

      expect(result.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
      expect(result.installed).toEqual(["deep-research", "forward", "gemini", "learn", "mahiro-docs-rules-init", "mahiro-style", "philosophy", "project", "recap", "rrr", "watch"]);
      expect(receipt.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
    } finally {
      temp.cleanup();
    }
  });

  test("preserves opaque gemini subtree", () => {
    const temp = makeTempEnv();
    try {
      install("claude-code", "local", ["gemini"], false, temp.env);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", "skills", "gemini", "extension", "manifest.json"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("installs one skill and paired command for cursor", () => {
    const temp = makeTempEnv();
    try {
      const result = install("cursor", "local", ["project"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", ".mahiro-skills", "receipts", "local-cursor.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", "commands", "project.md"))).toBe(true);
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("cursor");
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor"));
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual(["project"]);
    } finally {
      temp.cleanup();
    }
  });

  test("installs gemini under the gemini root and preserves extension subtree", () => {
    const temp = makeTempEnv();
    try {
      const result = install("gemini", "local", ["gemini"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", ".mahiro-skills", "receipts", "local-gemini.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "skills", "gemini", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "skills", "gemini", "extension", "manifest.json"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "commands", "mh-gemini.toml"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "commands", "gemini.md"))).toBe(false);
      expect(readFileSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "commands", "mh-gemini.toml"), "utf8")).toContain(
        'description = "Mahiro Skill | Control Gemini via MQTT WebSocket. Use when Gemini tab automation or message sending is needed."',
      );
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("gemini");
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini"));
      expect(receipt.installedSkills).toEqual(["gemini"]);
      expect(receipt.installedCommands).toEqual(["gemini"]);
    } finally {
      temp.cleanup();
    }
  });

  test("fails on collisions without overwrite", () => {
    const temp = makeTempEnv();
    try {
      const target = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project");
      const commandsTarget = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md");
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", ".mahiro-skills", "receipts", "local-opencode.json");
      mkdirSync(target, { recursive: true });
      writeFileSync(join(target, "placeholder.txt"), "collision");

      expect(() => install("opencode", "local", ["project"], false, temp.env)).toThrow("Collision detected");
      expect(existsSync(join(target, "placeholder.txt"))).toBe(true);
      expect(existsSync(join(target, "scripts", "utils.ts"))).toBe(false);
      expect(existsSync(commandsTarget)).toBe(false);
      expect(existsSync(receiptPath)).toBe(false);
      expect(readdirSync(dirname(target))).toEqual(["project"]);
    } finally {
      temp.cleanup();
    }
  });

  test("overwrites collided target when overwrite is true", () => {
    const temp = makeTempEnv();
    try {
      const target = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project");
      const commandTarget = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md");
      mkdirSync(target, { recursive: true });
      writeFileSync(join(target, "placeholder.txt"), "collision");
      mkdirSync(dirname(commandTarget), { recursive: true });
      writeFileSync(commandTarget, "---\ndescription: stale\n---\n");

      const result = install("opencode", "local", ["project"], true, temp.env);

      expect(result.status).toBe("installed");
      expect(existsSync(join(target, "placeholder.txt"))).toBe(false);
      expect(existsSync(join(target, "scripts", "utils.ts"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md"))).toBe(true);
      expect(readFileSync(join(target, "SKILL.md"), "utf8")).toContain("description: Mahiro Skill | Clone and track external repos for study or development.");
      expect(readFileSync(commandTarget, "utf8")).toContain("description: Mahiro Skill | Clone and track external repos for study or development with ghq plus .agent-state-backed tracking.");
    } finally {
      temp.cleanup();
    }
  });
});
