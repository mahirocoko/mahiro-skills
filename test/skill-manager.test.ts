import { describe, expect, test } from "bun:test";
import { readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { install } from "../src/install";
import {
  deriveSkillManagerInventory,
  getSkillManagerAgentPlan,
  getSkillManagerSnapshot,
  installSkillManagerItems,
  uninstallSkillManagerItems,
  updateSkillManagerReceipt,
} from "../src/skill-manager";
import type { InstallReceipt } from "../src/types";
import { makeTempEnv } from "./helpers";

function projectStatus(env: NodeJS.ProcessEnv) {
  return getSkillManagerSnapshot("opencode", "local", env).skills.find((skill) => skill.name === "project")?.status;
}

describe("skill manager", () => {
  test("reports current, outdated, modified, missing, and legacy receipt states truthfully", () => {
    const temp = makeTempEnv();
    try {
      const installed = install("opencode", "local", ["project"], false, temp.env);
      const receiptPath = installed.receiptPath!;
      const originalReceipt = JSON.parse(readFileSync(receiptPath, "utf8")) as InstallReceipt;

      expect(projectStatus(temp.env)).toBe("current");

      writeFileSync(receiptPath, JSON.stringify({
        ...originalReceipt,
        targetStates: originalReceipt.targetStates?.map((state) => ({ ...state, sourceHash: "0".repeat(64) })),
      }, null, 2));
      expect(projectStatus(temp.env)).toBe("outdated");

      writeFileSync(receiptPath, JSON.stringify(originalReceipt, null, 2));
      writeFileSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "SKILL.md"), "locally modified");
      expect(projectStatus(temp.env)).toBe("modified");

      rmSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project"), { recursive: true, force: true });
      expect(projectStatus(temp.env)).toBe("missing");

      writeFileSync(receiptPath, JSON.stringify({
        ...originalReceipt,
        schemaVersion: undefined,
        targetStates: undefined,
      }, null, 2));
      expect(projectStatus(temp.env)).toBe("legacy");
    } finally {
      temp.cleanup();
    }
  });

  test("preserves existing receipt items when installing another skill", () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["project"], false, temp.env);
      installSkillManagerItems("opencode", "local", ["recap"], false, temp.env);

      const snapshot = getSkillManagerSnapshot("opencode", "local", temp.env);
      expect(snapshot.receipt?.installedSkills).toEqual(["project", "recap"]);
      expect(snapshot.skills.find((skill) => skill.name === "project")?.status).toBe("current");
      expect(snapshot.skills.find((skill) => skill.name === "recap")?.status).toBe("current");
    } finally {
      temp.cleanup();
    }
  });

  test("does not overwrite modified receipt targets while adding a new skill", () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["project"], false, temp.env);
      const projectPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "SKILL.md");
      writeFileSync(projectPath, "local project edit");

      installSkillManagerItems("opencode", "local", ["recap"], false, temp.env);

      expect(readFileSync(projectPath, "utf8")).toBe("local project edit");
      const snapshot = getSkillManagerSnapshot("opencode", "local", temp.env);
      expect(snapshot.receipt?.installedSkills).toEqual(["project", "recap"]);
      expect(snapshot.skills.find((skill) => skill.name === "project")?.status).toBe("modified");
      expect(snapshot.skills.find((skill) => skill.name === "recap")?.status).toBe("current");
    } finally {
      temp.cleanup();
    }
  });

  test("updates and uninstalls only through receipt-backed core operations", () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["project", "recap"], false, temp.env);
      expect(updateSkillManagerReceipt("opencode", "local", temp.env)?.status).toBe("installed");

      const result = uninstallSkillManagerItems("opencode", "local", ["project"], temp.env);
      expect(result.uninstalled).toEqual(["project"]);
      expect(getSkillManagerSnapshot("opencode", "local", temp.env).receipt?.installedSkills).toEqual(["recap"]);
    } finally {
      temp.cleanup();
    }
  });

  test("derives mixed action inventories and updates only selected applicable names", () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["project", "recap"], false, temp.env);
      const projectPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "SKILL.md");
      writeFileSync(projectPath, "locally modified project");

      const snapshot = getSkillManagerSnapshot("opencode", "local", temp.env);
      const updateInventory = deriveSkillManagerInventory("update", [snapshot]);
      const project = updateInventory.find((item) => item.name === "project");
      const recap = updateInventory.find((item) => item.name === "recap");
      expect(project?.selectable).toBe(true);
      expect(project?.requiresAcknowledgement).toBe(true);
      expect(recap?.selectable).toBe(false);
      expect(recap?.disabledReason).toContain("no update");

      const plan = getSkillManagerAgentPlan("update", snapshot, ["project", "recap"], temp.env);
      expect(plan.active).toEqual(["project"]);
      expect(plan.skipped.map((entry) => entry.item)).toEqual(["recap"]);
      expect(plan.acknowledgementIds).toContain("modified:opencode:project");
    } finally {
      temp.cleanup();
    }
  });

  test("surfaces receipt-only uninstall names and receipt-driven removal targets", () => {
    const temp = makeTempEnv();
    try {
      const installed = install("opencode", "local", ["project"], false, temp.env);
      const receipt = JSON.parse(readFileSync(installed.receiptPath!, "utf8")) as InstallReceipt;
      writeFileSync(installed.receiptPath!, JSON.stringify({
        ...receipt,
        installedSkills: [...receipt.installedSkills, "retired-skill"],
        targetStates: [...(receipt.targetStates ?? [])],
      }, null, 2));

      const snapshot = getSkillManagerSnapshot("opencode", "local", temp.env);
      const inventory = deriveSkillManagerInventory("uninstall", [snapshot]);
      const retired = inventory.find((item) => item.name === "retired-skill");
      expect(retired?.receiptOnly).toBe(true);
      expect(retired?.selectable).toBe(true);

      const plan = getSkillManagerAgentPlan("uninstall", snapshot, ["retired-skill"], temp.env);
      expect(plan.active).toEqual(["retired-skill"]);
      expect(plan.uninstallTargets[0].target).toBe(join(snapshot.root, "skills", "retired-skill"));
    } finally {
      temp.cleanup();
    }
  });

  test("surfaces malformed receipts without crashing catalog browsing", () => {
    const temp = makeTempEnv();
    try {
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", ".mahiro-skills", "receipts", "local-opencode.json");
      install("opencode", "local", ["project"], false, temp.env);
      writeFileSync(receiptPath, "not json");

      const snapshot = getSkillManagerSnapshot("opencode", "local", temp.env);
      expect(snapshot.receipt).toBeNull();
      expect(snapshot.receiptError).toContain("JSON");
      expect(snapshot.skills.length).toBeGreaterThan(0);
      expect(() => installSkillManagerItems("opencode", "local", ["recap"], false, temp.env)).toThrow("Unable to read");
    } finally {
      temp.cleanup();
    }
  });

  test("rejects malformed v2 target state shapes without crashing browsing", () => {
    const temp = makeTempEnv();
    try {
      const installed = install("opencode", "local", ["project"], false, temp.env);
      const receipt = JSON.parse(readFileSync(installed.receiptPath!, "utf8"));
      writeFileSync(installed.receiptPath!, JSON.stringify({ ...receipt, targetStates: {} }, null, 2));

      const snapshot = getSkillManagerSnapshot("opencode", "local", temp.env);
      expect(snapshot.receipt).toBeNull();
      expect(snapshot.receiptError).toBe("Invalid install receipt schema.");
      expect(snapshot.skills.length).toBeGreaterThan(0);
    } finally {
      temp.cleanup();
    }
  });

  test("rejects malformed v2 target state entries and hashes", () => {
    const temp = makeTempEnv();
    try {
      const installed = install("opencode", "local", ["project"], false, temp.env);
      const receipt = JSON.parse(readFileSync(installed.receiptPath!, "utf8"));

      writeFileSync(installed.receiptPath!, JSON.stringify({
        ...receipt,
        targetStates: [{ ...receipt.targetStates[0], sourceHash: "not-a-sha256" }],
      }, null, 2));
      expect(getSkillManagerSnapshot("opencode", "local", temp.env).receiptError).toBe("Invalid install receipt schema.");

      writeFileSync(installed.receiptPath!, JSON.stringify({
        ...receipt,
        targetStates: [{ ...receipt.targetStates[0], kind: "plugin" }],
      }, null, 2));
      expect(getSkillManagerSnapshot("opencode", "local", temp.env).receiptError).toBe("Invalid install receipt schema.");
    } finally {
      temp.cleanup();
    }
  });
});
