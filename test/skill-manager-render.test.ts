import { describe, expect, test } from "bun:test";
import { mkdirSync } from "fs";
import { join } from "path";

import {
  deriveSkillManagerInventory,
  getSkillManagerAgentPlan,
  getSkillManagerSnapshots,
} from "../src/skill-manager";
import {
  renderSkillManagerFrame,
  stripAnsi,
} from "../src/skill-manager-render";
import { makeTempEnv } from "./helpers";

describe("step-first skill manager renderer", () => {
  test("renders the shared stepper, target selection, action descriptions, and aggregate skill coverage", () => {
    const temp = makeTempEnv();
    try {
      const snapshots = getSkillManagerSnapshots(["opencode", "cursor"], "local", temp.env);
      const inventory = deriveSkillManagerInventory("install", snapshots);
      const projectIndex = inventory.findIndex((item) => item.name === "project");
      const frame = renderSkillManagerFrame({
        step: "skills",
        target: {
          agents: ["opencode", "claude-code", "cursor", "gemini", "agy", "codex", "letta-code", "pi"],
          mode: "custom",
          selectedAgents: ["opencode", "cursor"],
          scope: "local",
          focus: { kind: "agent", agent: "cursor" },
        },
        action: { action: "install", selectedIndex: 0 },
        skills: {
          action: "install",
          items: inventory,
          selectedIndex: projectIndex,
          selectedNames: ["project"],
        },
      }, { columns: 96, rows: 32 }, { color: false });

      expect(frame).toContain("MAHIRO SKILLS");
      expect(frame).toContain("Bun CLI/TUI");
      expect(frame).toContain("✓ Target  ›  ✓ Action  ›  ▶ Skills  ›  · Review  ›  · Result");
      expect(frame).toContain("Targets: opencode, cursor");
      expect(frame).toContain("project");
      expect(frame).toContain("0/2 installed");
      expect(frame).toContain("↑↓ Move · Space Mark · / Filter · Enter Review");
      expect(frame).not.toContain(" i install");
      expect(frame).not.toContain(" u uninstall");
    } finally {
      temp.cleanup();
    }
  });

  test("renders plain action descriptions and inspect detail without a write confirmation overlay", () => {
    const temp = makeTempEnv();
    try {
      const snapshots = getSkillManagerSnapshots(["letta-code"], "local", temp.env);
      const inventory = deriveSkillManagerInventory("inspect", snapshots);
      const frame = renderSkillManagerFrame({
        step: "action",
        target: {
          agents: ["letta-code"],
          mode: "custom",
          selectedAgents: ["letta-code"],
          scope: "local",
          focus: { kind: "all" },
        },
        action: { action: "inspect", selectedIndex: 3 },
      }, { columns: 80, rows: 24 }, { color: false });
      expect(frame).toContain("Inspect");
      expect(frame).toContain("Browse source and receipt state without changing files.");

      const detail = renderSkillManagerFrame({
        step: "skills",
        target: {
          agents: ["letta-code"],
          mode: "custom",
          selectedAgents: ["letta-code"],
          scope: "local",
          focus: { kind: "all" },
        },
        action: { action: "inspect", selectedIndex: 3 },
        skills: {
          action: "inspect",
          items: inventory,
          selectedIndex: 0,
          selectedNames: [inventory[0].name],
          inspectDetail: true,
        },
      }, { columns: 80, rows: 24 }, { color: false });
      expect(detail).toContain("Inspect is read-only");
      expect(detail).toContain("skills only");
      expect(detail).not.toContain("Confirm");
    } finally {
      temp.cleanup();
    }
  });

  test("hard-wraps exact collision and remove paths without ellipsizing safety content", () => {
    const temp = makeTempEnv();
    try {
      const collisionPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project");
      mkdirSync(collisionPath, { recursive: true });
      const snapshots = getSkillManagerSnapshots(["opencode"], "local", temp.env);
      const plan = getSkillManagerAgentPlan("install", snapshots[0], ["project"], temp.env);
      const frame = renderSkillManagerFrame({
        step: "review",
        target: {
          agents: ["opencode"],
          mode: "custom",
          selectedAgents: ["opencode"],
          scope: "local",
          focus: { kind: "all" },
        },
        review: {
          action: "install",
          agents: ["opencode"],
          scope: "local",
          items: ["project"],
          plans: [plan],
          acknowledgements: [{ id: "overwrite:opencode", label: "Allow overwrite", checked: false }],
          focusIndex: 0,
          scrollOffset: 0,
          showDetails: true,
        },
      }, { columns: 72, rows: 40 }, { color: false });
      expect(frame.replaceAll("\n", "")).toContain(collisionPath);
      expect(frame).toContain("[collision / overwrite]");
      expect(frame).toContain("Allow overwrite");
      expect(frame).not.toContain("...");
      for (const line of frame.split("\n")) {
        expect(Bun.stringWidth(stripAnsi(line))).toBeLessThanOrEqual(72);
      }
    } finally {
      temp.cleanup();
    }
  });

  test("sanitizes ANSI, Thai, and emoji while respecting terminal width", () => {
    const temp = makeTempEnv();
    try {
      const snapshots = getSkillManagerSnapshots(["opencode"], "local", temp.env);
      const inventory = deriveSkillManagerInventory("inspect", snapshots).map((item, index) => index === 0
        ? { ...item, description: "คุโมะวิสป์ ☁️ manager description\x1b]0;unsafe\x07" }
        : item);
      const frame = renderSkillManagerFrame({
        step: "skills",
        target: {
          agents: ["opencode"],
          mode: "custom",
          selectedAgents: ["opencode"],
          scope: "local",
          focus: { kind: "all" },
        },
        skills: {
          action: "inspect",
          items: inventory,
          selectedIndex: 0,
          inspectDetail: true,
        },
      }, { columns: 72, rows: 24 }, { color: false });
      expect(frame).not.toContain("\x1b");
      expect(frame).not.toContain("\x07");
      for (const line of frame.split("\n")) {
        expect(Bun.stringWidth(line)).toBeLessThanOrEqual(72);
      }
    } finally {
      temp.cleanup();
    }
  });

  test("renders a paused state below the minimum size", () => {
    const temp = makeTempEnv();
    try {
      const snapshots = getSkillManagerSnapshots(["opencode"], "local", temp.env);
      const inventory = deriveSkillManagerInventory("install", snapshots);
      const frame = renderSkillManagerFrame({
        step: "skills",
        skills: { action: "install", items: inventory },
      }, { columns: 20, rows: 8 }, { color: false });
      expect(frame).toContain("PAUSED");
      expect(frame).toContain("72x18");
      for (const line of frame.split("\n")) {
        expect(Bun.stringWidth(stripAnsi(line))).toBeLessThanOrEqual(20);
      }
    } finally {
      temp.cleanup();
    }
  });
});
