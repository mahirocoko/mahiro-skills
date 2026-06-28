import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "fs";
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
    } finally {
      temp.cleanup();
    }
  });

  test("removes all receipt-recorded items and deletes empty receipt", () => {
    const temp = makeTempEnv();

    try {
      install("gemini", "local", ["gemini"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", ".mahiro-skills", "receipts", "local-gemini.json");

      const result = uninstall("gemini", "local", [], temp.env);

      expect(result.status).toBe("uninstalled");
      expect(result.uninstalled).toEqual(["gemini"]);
      expect(result.receiptRemoved).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "skills", "gemini"))).toBe(false);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "commands", "mh-gemini.toml"))).toBe(false);
      expect(existsSync(receiptPath)).toBe(false);
      expect(listInstalled("gemini", "local", temp.env)).toBeNull();
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
});
