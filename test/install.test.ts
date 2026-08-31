import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, mkdirSync, statSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { hashPath } from "../src/content-hash";
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
        schemaVersion: number;
        agent: string;
        scope: string;
        root: string;
        sourceRepoPath: string;
        installedSkills: string[];
        installedCommands: string[];
        targetStates: { name: string; kind: string; sourceHash: string; installedHash: string }[];
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
      expect(receipt.schemaVersion).toBe(2);
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode"));
      expect(receipt.sourceRepoPath.length).toBeGreaterThan(0);
      expect(result.installed).toEqual(["project"]);
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual(["project"]);
      expect(receipt.targetStates).toHaveLength(2);
      expect(receipt.targetStates.map(({ name, kind }) => ({ name, kind }))).toEqual([
        { name: "project", kind: "skill" },
        { name: "project", kind: "command" },
      ]);
      expect(receipt.targetStates.every(({ sourceHash, installedHash }) => sourceHash.length === 64 && installedHash.length === 64)).toBe(true);
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
      expect(result.installed).toEqual(["asset-designer", "auditing-context-contracts", "cocoindex-rules-init", "codex-asset-production", "control-room-goals", "direct-cli", "fable", "forward", "gemini", "learn", "mac-calendar-booking", "mahiro-docs-rules-init", "mahiro-guidance-refine", "mahiro-style", "motion-design", "project", "recap", "rrr", "studying-codrops", "web-asset-prompts", "watch"]);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "auditing-context-contracts", "scripts", "scan-context-contracts.ts"))).toBe(true);
      expect(receipt.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
    } finally {
      temp.cleanup();
    }
  });

  test("preserves the receipt description when updating explicit installed items", () => {
    const temp = makeTempEnv();
    try {
      const initial = install("opencode", "local", [], false, temp.env);
      const initialReceipt = JSON.parse(readFileSync(initial.receiptPath!, "utf8"));
      expect(initialReceipt.description).toContain("Packaged local skills");

      const updated = install("opencode", "local", initialReceipt.installedSkills, true, temp.env);
      const updatedReceipt = JSON.parse(readFileSync(updated.receiptPath!, "utf8"));
      expect(updatedReceipt.description).toBe(initialReceipt.description);
    } finally {
      temp.cleanup();
    }
  });

  test("merges incremental installs into the existing receipt", () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["project"], false, temp.env);
      const result = install("opencode", "local", ["recap"], false, temp.env);
      const receipt = JSON.parse(readFileSync(result.receiptPath!, "utf8")) as {
        installedSkills: string[];
        installedCommands: string[];
        targetStates: { name: string; kind: string }[];
      };

      expect(result.installed).toEqual(["recap"]);
      expect(receipt.installedSkills).toEqual(["project", "recap"]);
      expect(receipt.installedCommands).toEqual(["project", "recap"]);
      expect(receipt.targetStates.map(({ name, kind }) => `${kind}:${name}`)).toEqual([
        "skill:project",
        "command:project",
        "skill:recap",
        "command:recap",
      ]);
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

  test("installs Agy skills as self-contained namespaced slash aliases", () => {
    const temp = makeTempEnv();
    try {
      const result = install("agy", "local", ["learn", "direct-cli"], false, temp.env);
      const root = join(temp.env.MAHIRO_SKILLS_CWD!, ".agents");
      const learnPath = join(root, "skills", "mh-learn", "SKILL.md");
      const directCliPath = join(root, "skills", "mh-direct-cli", "SKILL.md");
      const receiptPath = join(root, ".mahiro-skills", "receipts", "local-agy.json");
      const learn = readFileSync(learnPath, "utf8");
      const directCli = readFileSync(directCliPath, "utf8");
      const sourceLearn = readFileSync(join(import.meta.dir, "..", "skills", "learn", "SKILL.md"), "utf8");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.installed).toEqual(["learn", "direct-cli"]);
      expect(learn).toContain("name: mh-learn");
      expect(learn).toContain("disable-model-invocation: true");
      expect(learn).not.toContain("disable-slash-command:");
      expect(sourceLearn).toContain("name: learn");
      expect(sourceLearn).toContain("disable-slash-command: true");
      expect(directCli).toContain("name: mh-direct-cli");
      expect(directCli).toContain("disable-model-invocation: true");
      expect(existsSync(join(root, "skills", "mh-direct-cli", "playbook.md"))).toBe(true);
      expect(existsSync(join(root, "skills", "learn"))).toBe(false);
      expect(existsSync(join(root, "commands"))).toBe(false);
      expect(receipt.agent).toBe("agy");
      expect(receipt.installedSkills).toEqual(["learn", "direct-cli"]);
      expect(receipt.installedCommands).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("removes only unchanged receipt-managed targets from the retired Gemini adapter during Agy install", () => {
    const temp = makeTempEnv();
    try {
      const legacyRoot = join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini");
      const skillTarget = join(legacyRoot, "skills", "learn");
      const commandTarget = join(legacyRoot, "commands", "mh-learn.toml");
      const unrelatedTarget = join(legacyRoot, "skills", "cloudflare");
      const legacyReceiptPath = join(legacyRoot, ".mahiro-skills", "receipts", "global-gemini.json");
      mkdirSync(skillTarget, { recursive: true });
      mkdirSync(unrelatedTarget, { recursive: true });
      mkdirSync(dirname(commandTarget), { recursive: true });
      mkdirSync(dirname(legacyReceiptPath), { recursive: true });
      writeFileSync(join(skillTarget, "SKILL.md"), "legacy learn\n");
      writeFileSync(commandTarget, "legacy command\n");
      writeFileSync(join(unrelatedTarget, "SKILL.md"), "unrelated\n");
      writeFileSync(legacyReceiptPath, JSON.stringify({
        schemaVersion: 2,
        agent: "gemini",
        scope: "global",
        root: legacyRoot,
        installedSkills: ["learn"],
        installedCommands: ["learn"],
        targetStates: [
          {
            name: "learn",
            kind: "skill",
            sourceHash: "0".repeat(64),
            installedHash: hashPath(skillTarget),
          },
          {
            name: "learn",
            kind: "command",
            sourceHash: "0".repeat(64),
            installedHash: hashPath(commandTarget),
          },
        ],
      }));

      const result = install("agy", "global", ["learn"], false, temp.env);

      expect(existsSync(skillTarget)).toBe(false);
      expect(existsSync(commandTarget)).toBe(false);
      expect(existsSync(unrelatedTarget)).toBe(true);
      expect(existsSync(legacyReceiptPath)).toBe(false);
      expect(existsSync(join(legacyRoot, "config", "skills", "mh-learn", "SKILL.md"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("Removed 2 unchanged receipt-managed target(s)"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("preserves modified retired Gemini targets during Agy install", () => {
    const temp = makeTempEnv();
    try {
      const legacyRoot = join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini");
      const skillTarget = join(legacyRoot, "skills", "learn");
      const legacyReceiptPath = join(legacyRoot, ".mahiro-skills", "receipts", "global-gemini.json");
      mkdirSync(skillTarget, { recursive: true });
      mkdirSync(dirname(legacyReceiptPath), { recursive: true });
      writeFileSync(join(skillTarget, "SKILL.md"), "modified learn\n");
      writeFileSync(legacyReceiptPath, JSON.stringify({
        schemaVersion: 2,
        agent: "gemini",
        scope: "global",
        root: legacyRoot,
        installedSkills: ["learn"],
        installedCommands: [],
        targetStates: [{
          name: "learn",
          kind: "skill",
          sourceHash: "0".repeat(64),
          installedHash: "f".repeat(64),
        }],
      }));

      const result = install("agy", "global", ["learn"], false, temp.env);

      expect(existsSync(skillTarget)).toBe(true);
      expect(existsSync(legacyReceiptPath)).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("Preserved 1 modified or invalid"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("preserves invalid or legacy retired Gemini receipts during Agy install", () => {
    const temp = makeTempEnv();
    try {
      const legacyRoot = join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini");
      const skillTarget = join(legacyRoot, "skills", "learn");
      const legacyReceiptPath = join(legacyRoot, ".mahiro-skills", "receipts", "global-gemini.json");
      mkdirSync(skillTarget, { recursive: true });
      mkdirSync(dirname(legacyReceiptPath), { recursive: true });
      writeFileSync(join(skillTarget, "SKILL.md"), "legacy learn\n");
      writeFileSync(legacyReceiptPath, JSON.stringify({
        schemaVersion: 1,
        agent: "gemini",
        scope: "global",
        root: legacyRoot,
        installedSkills: ["learn"],
        installedCommands: [],
      }));

      const result = install("agy", "global", ["learn"], false, temp.env);

      expect(existsSync(skillTarget)).toBe(true);
      expect(existsSync(legacyReceiptPath)).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("Preserved invalid or legacy"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("installs one skill for Letta Code without command output", () => {
    const temp = makeTempEnv();
    try {
      const result = install("letta-code", "local", ["project"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", ".mahiro-skills", "receipts", "local-letta-code.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "commands", "project.md"))).toBe(false);
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("letta-code");
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents"));
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual([]);
      expect(result.description).toBeUndefined();
    } finally {
      temp.cleanup();
    }
  });

  test("installs one skill for Pi without command output", () => {
    const temp = makeTempEnv();
    try {
      const isolatedRoot = join(temp.root, "pi-isolated", ".pi", "agent");
      const env = { ...temp.env, PI_CODING_AGENT_DIR: isolatedRoot };
      const result = install("pi", "global", ["project"], false, env);
      const receiptPath = join(isolatedRoot, ".mahiro-skills", "receipts", "global-pi.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(isolatedRoot, "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(isolatedRoot, "commands", "project.md"))).toBe(false);
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("pi");
      expect(receipt.scope).toBe("global");
      expect(receipt.root).toBe(isolatedRoot);
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("installs one skill and markdown command for codex", () => {
    const temp = makeTempEnv();
    try {
      const result = install("codex", "local", ["project"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", ".mahiro-skills", "receipts", "local-codex.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", "commands", "project.md"))).toBe(true);
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("codex");
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".codex"));
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual(["project"]);
    } finally {
      temp.cleanup();
    }
  });

  test("copies direct-cli skill, current playbook, and paired command", () => {
    const temp = makeTempEnv();
    try {
      const sourceSkillPath = join(import.meta.dir, "..", "skills", "direct-cli", "SKILL.md");
      const sourceCommandPath = join(import.meta.dir, "..", "commands", "direct-cli.md");
      const result = install("opencode", "local", ["direct-cli"], false, temp.env);
      const installedSkillPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "SKILL.md");
      const installedPlaybookPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "playbook.md");
      const installedSelectorPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "scripts", "select-backend.sh");
      const installedFanoutPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "scripts", "prompt-fanout.py");
      const installedJobsPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "scripts", "herdr-jobs.py");
      const installedCommandPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "direct-cli.md");

      expect(result.status).toBe("installed");
      expect(existsSync(installedPlaybookPath)).toBe(true);
      expect(existsSync(installedSelectorPath)).toBe(true);
      expect(statSync(installedSelectorPath).mode & 0o111).not.toBe(0);
      expect(existsSync(installedFanoutPath)).toBe(true);
      expect(statSync(installedFanoutPath).mode & 0o111).not.toBe(0);
      expect(existsSync(installedJobsPath)).toBe(true);
      expect(statSync(installedJobsPath).mode & 0o111).not.toBe(0);
      expect(readFileSync(sourceSkillPath, "utf8")).toContain("description: Direct executor playbook for using Cursor CLI, Antigravity CLI, Codex CLI, and Pi through Herdr-managed panes with a tmux fallback");
      expect(readFileSync(sourceSkillPath, "utf8")).not.toContain("description: Mahiro Skill |");
      expect(readFileSync(sourceCommandPath, "utf8")).toContain("description: Direct executor playbook for using Cursor CLI, Antigravity CLI, Codex CLI, and Pi through Herdr-managed panes with a tmux fallback");
      expect(readFileSync(sourceCommandPath, "utf8")).not.toContain("description: Mahiro Skill |");
      expect(readFileSync(installedSkillPath, "utf8")).toContain("description: Mahiro Skill | Direct executor playbook for using Cursor CLI, Antigravity CLI, Codex CLI, and Pi through Herdr-managed panes with a tmux fallback");
      expect(readFileSync(installedCommandPath, "utf8")).toContain("description: Mahiro Skill | Direct executor playbook for using Cursor CLI, Antigravity CLI, Codex CLI, and Pi through Herdr-managed panes with a tmux fallback");
      expect(readFileSync(installedPlaybookPath, "utf8")).not.toContain("## Gemini CLI direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).toContain("## Cursor CLI direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).toContain("## Antigravity CLI direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).toContain("## Codex CLI direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).toContain("## Pi direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).toContain("**fresh backend container, narrow scope, pane-first truth**");
      expect(result.installed).toEqual(["direct-cli"]);
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
