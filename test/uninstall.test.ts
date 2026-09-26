import { describe, expect, test } from "bun:test";
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { join } from "path";

import { install } from "../src/install";
import { listInstalled } from "../src/list";
import { uninstall } from "../src/uninstall";
import { makeTempEnv } from "./helpers";

describe("uninstall", () => {
  test("removes selected installed skill and paired command while updating receipt", () => {
    const temp = makeTempEnv();

    try {
      install("opencode", "local", ["project", "recap"], false, temp.env);

      const result = uninstall("opencode", "local", ["project"], temp.env);
      const receipt = listInstalled("opencode", "local", temp.env);

      expect(result.status).toBe("uninstalled");
      expect(result.uninstalled).toEqual(["project"]);
      expect(result.receiptRemoved).toBe(false);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project"))).toBe(false);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md"))).toBe(false);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "recap"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "recap.md"))).toBe(true);
      expect(receipt?.installedSkills).toEqual(["recap"]);
      expect(receipt?.installedCommands).toEqual(["recap"]);
      expect(receipt?.targetStates?.map(({ name, kind }) => ({ name, kind }))).toEqual([
        { name: "recap", kind: "skill" },
        { name: "recap", kind: "command" },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("removes all Agy receipt-recorded aliases and deletes empty receipt", () => {
    const temp = makeTempEnv();

    try {
      install("agy", "local", ["gemini"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", ".mahiro-skills", "receipts", "local-agy.json");

      const result = uninstall("agy", "local", [], temp.env);

      expect(result.status).toBe("uninstalled");
      expect(result.uninstalled).toEqual(["gemini"]);
      expect(result.receiptRemoved).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "mh-gemini"))).toBe(false);
      expect(existsSync(receiptPath)).toBe(false);
      expect(listInstalled("agy", "local", temp.env)).toBeNull();
    } finally {
      temp.cleanup();
    }
  });

  test("only removes receipt-recorded items and reports unknown requests as skipped", () => {
    const temp = makeTempEnv();

    try {
      install("letta-code", "local", ["project"], false, temp.env);

      const result = uninstall("letta-code", "local", ["project", "recap"], temp.env);

      expect(result.status).toBe("partially-uninstalled");
      expect(result.uninstalled).toEqual(["project"]);
      expect(result.skipped).toEqual([
        {
          item: "recap",
          kind: "item",
          reason: "Item 'recap' is not recorded in the letta-code (local) install receipt.",
        },
      ]);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "project"))).toBe(false);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "recap"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("removes Pi skills without guessing command targets", () => {
    const temp = makeTempEnv();

    try {
      install("pi", "local", ["project", "recap"], false, temp.env);

      const result = uninstall("pi", "local", ["project"], temp.env);
      const receipt = listInstalled("pi", "local", temp.env);

      expect(result.status).toBe("uninstalled");
      expect(result.uninstalled).toEqual(["project"]);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".pi", "skills", "project"))).toBe(false);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".pi", "skills", "recap"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".pi", "commands", "project.md"))).toBe(false);
      expect(receipt?.installedSkills).toEqual(["recap"]);
      expect(receipt?.installedCommands).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("removes Agy namespaced skill targets through canonical receipt names", () => {
    const temp = makeTempEnv();

    try {
      install("agy", "local", ["project", "recap"], false, temp.env);

      const result = uninstall("agy", "local", ["project"], temp.env);
      const receipt = listInstalled("agy", "local", temp.env);
      const root = join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills");

      expect(result.status).toBe("uninstalled");
      expect(result.uninstalled).toEqual(["project"]);
      expect(existsSync(join(root, "mh-project"))).toBe(false);
      expect(existsSync(join(root, "mh-recap"))).toBe(true);
      expect(receipt?.installedSkills).toEqual(["recap"]);
      expect(receipt?.installedCommands).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("skips safely when no receipt exists", () => {
    const temp = makeTempEnv();

    try {
      const result = uninstall("cursor", "local", [], temp.env);

      expect(result.status).toBe("skipped");
      expect(result.uninstalled).toEqual([]);
      expect(result.targets).toEqual([]);
      expect(result.receiptRemoved).toBe(false);
      expect(result.skipped[0]?.reason).toBe("No install receipt found for cursor (local).");
    } finally {
      temp.cleanup();
    }
  });

  test("preserves receipt install timestamp on partial uninstall", () => {
    const temp = makeTempEnv();

    try {
      install("codex", "local", ["project", "recap"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", ".mahiro-skills", "receipts", "local-codex.json");
      const before = JSON.parse(readFileSync(receiptPath, "utf8")) as { installedAt: string };

      uninstall("codex", "local", ["project"], temp.env);
      const after = JSON.parse(readFileSync(receiptPath, "utf8")) as { installedAt: string };

      expect(after.installedAt).toBe(before.installedAt);
    } finally {
      temp.cleanup();
    }
  });

  test("blocks uninstall of ccc while rules-init remains and removes both together", () => {
    const temp = makeTempEnv();

    try {
      install("opencode", "local", ["cocoindex-rules-init"], false, temp.env);
      const root = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode");
      const receiptPath = join(root, ".mahiro-skills", "receipts", "local-opencode.json");
      const before = readFileSync(receiptPath, "utf8");

      const blocked = uninstall("opencode", "local", ["ccc"], temp.env);
      expect(blocked.status).toBe("skipped");
      expect(blocked.uninstalled).toEqual([]);
      expect(blocked.receiptRemoved).toBe(false);
      expect(blocked.skipped.map((item) => item.reason).join("\n")).toContain("Cannot uninstall 'ccc' while receipt-managed 'cocoindex-rules-init' remains installed");
      expect(readFileSync(receiptPath, "utf8")).toBe(before);
      expect(existsSync(join(root, "skills", "ccc"))).toBe(true);
      expect(existsSync(join(root, "skills", "cocoindex-rules-init"))).toBe(true);
      expect(existsSync(join(root, "commands", "ccc.md"))).toBe(true);
      expect(existsSync(join(root, "commands", "cocoindex-rules-init.md"))).toBe(true);

      const removedRules = uninstall("opencode", "local", ["cocoindex-rules-init"], temp.env);
      expect(removedRules.uninstalled).toEqual(["cocoindex-rules-init"]);
      expect(listInstalled("opencode", "local", temp.env)?.installedSkills).toEqual(["ccc"]);
      expect(existsSync(join(root, "skills", "ccc"))).toBe(true);
      expect(existsSync(join(root, "skills", "cocoindex-rules-init"))).toBe(false);

      install("opencode", "local", ["cocoindex-rules-init"], true, temp.env);
      const removedBoth = uninstall("opencode", "local", ["ccc", "cocoindex-rules-init"], temp.env);
      expect(removedBoth.status).toBe("uninstalled");
      expect(removedBoth.uninstalled).toEqual(["ccc", "cocoindex-rules-init"]);
      expect(listInstalled("opencode", "local", temp.env)).toBeNull();

      install("opencode", "local", ["cocoindex-rules-init"], false, temp.env);
      const removedAll = uninstall("opencode", "local", [], temp.env);
      expect(removedAll.uninstalled).toEqual(["ccc", "cocoindex-rules-init"]);
      expect(listInstalled("opencode", "local", temp.env)).toBeNull();
      expect(existsSync(join(root, "skills", "ccc"))).toBe(false);
      expect(existsSync(join(root, "skills", "cocoindex-rules-init"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("unlinks a skill symlink without mutating the legacy target", () => {
    const temp = makeTempEnv();

    try {
      install("letta-code", "global", ["ccc"], false, temp.env);
      const installed = join(temp.env.MAHIRO_SKILLS_HOME!, ".letta", "skills", "ccc");
      const legacy = join(temp.env.MAHIRO_SKILLS_HOME!, ".agents", "skills", "ccc");
      const marker = join(legacy, "LEGACY.txt");
      rmSync(installed, { recursive: true, force: true });
      mkdirSync(legacy, { recursive: true });
      writeFileSync(marker, "legacy-target\n");
      symlinkSync(legacy, installed);

      const result = uninstall("letta-code", "global", ["ccc"], temp.env);

      expect(result.uninstalled).toEqual(["ccc"]);
      expect(existsSync(installed)).toBe(false);
      expect(lstatSync(legacy).isDirectory()).toBe(true);
      expect(readFileSync(marker, "utf8")).toBe("legacy-target\n");
    } finally {
      temp.cleanup();
    }
  });
});
