import { describe, expect, test } from "bun:test";

import { install } from "../src/install";
import { listInstalled, listInstalledSummaries } from "../src/list";
import { makeTempEnv } from "./helpers";

describe("list", () => {
  test("returns null before install", () => {
    const temp = makeTempEnv();
    try {
      expect(listInstalled("opencode", "local", temp.env)).toBeNull();
    } finally {
      temp.cleanup();
    }
  });

  test("returns full receipt after install", () => {
    const temp = makeTempEnv();
    try {
      install("claude-code", "local", ["project"], false, temp.env);

      const receipt = listInstalled("claude-code", "local", temp.env);

      expect(receipt).not.toBeNull();
      expect(receipt?.agent).toBe("claude-code");
      expect(receipt?.scope).toBe("local");
      expect(receipt?.root).toBe(`${temp.env.MAHIRO_SKILLS_CWD}/.claude`);
      expect(receipt?.sourceRepoPath.length).toBeGreaterThan(0);
      expect(receipt?.installedSkills).toEqual(["project"]);
      expect(receipt?.installedCommands).toEqual(["project"]);
      expect(receipt?.schemaVersion).toBe(2);
      expect(receipt?.targetStates).toHaveLength(2);
      expect(receipt?.installedAt.length).toBeGreaterThan(0);
    } finally {
      temp.cleanup();
    }
  });

  test("returns bundle description after default bundle install", () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", [], false, temp.env);

      const receipt = listInstalled("opencode", "local", temp.env);

      expect(receipt?.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
    } finally {
      temp.cleanup();
    }
  });

  test("returns full receipt after cursor install", () => {
    const temp = makeTempEnv();
    try {
      install("cursor", "local", ["project"], false, temp.env);

      const receipt = listInstalled("cursor", "local", temp.env);

      expect(receipt).not.toBeNull();
      expect(receipt?.agent).toBe("cursor");
      expect(receipt?.scope).toBe("local");
      expect(receipt?.root).toBe(`${temp.env.MAHIRO_SKILLS_CWD}/.cursor`);
      expect(receipt?.sourceRepoPath.length).toBeGreaterThan(0);
      expect(receipt?.installedSkills).toEqual(["project"]);
      expect(receipt?.installedCommands).toEqual(["project"]);
      expect(receipt?.installedAt.length).toBeGreaterThan(0);
    } finally {
      temp.cleanup();
    }
  });

  test("returns the canonical receipt after Agy namespaced install", () => {
    const temp = makeTempEnv();
    try {
      install("agy", "global", ["learn"], false, temp.env);

      const receipt = listInstalled("agy", "global", temp.env);

      expect(receipt).not.toBeNull();
      expect(receipt?.agent).toBe("agy");
      expect(receipt?.scope).toBe("global");
      expect(receipt?.root).toBe(`${temp.env.MAHIRO_SKILLS_HOME}/.gemini/config`);
      expect(receipt?.installedSkills).toEqual(["learn"]);
      expect(receipt?.installedCommands).toEqual([]);
      expect(receipt?.targetStates).toHaveLength(1);
    } finally {
      temp.cleanup();
    }
  });

  test("returns full receipt after Letta Code install", () => {
    const temp = makeTempEnv();
    try {
      install("letta-code", "local", ["project"], false, temp.env);

      const receipt = listInstalled("letta-code", "local", temp.env);

      expect(receipt).not.toBeNull();
      expect(receipt?.agent).toBe("letta-code");
      expect(receipt?.scope).toBe("local");
      expect(receipt?.root).toBe(`${temp.env.MAHIRO_SKILLS_CWD}/.agents`);
      expect(receipt?.sourceRepoPath.length).toBeGreaterThan(0);
      expect(receipt?.installedSkills).toEqual(["project"]);
      expect(receipt?.installedCommands).toEqual([]);
      expect(receipt?.installedAt.length).toBeGreaterThan(0);
    } finally {
      temp.cleanup();
    }
  });

  test("returns full receipt after Pi install", () => {
    const temp = makeTempEnv();
    try {
      const isolatedRoot = `${temp.root}/pi-isolated/.pi/agent`;
      const env = { ...temp.env, PI_CODING_AGENT_DIR: isolatedRoot };
      install("pi", "global", ["project"], false, env);

      const receipt = listInstalled("pi", "global", env);

      expect(receipt).not.toBeNull();
      expect(receipt?.agent).toBe("pi");
      expect(receipt?.scope).toBe("global");
      expect(receipt?.root).toBe(isolatedRoot);
      expect(receipt?.sourceRepoPath.length).toBeGreaterThan(0);
      expect(receipt?.installedSkills).toEqual(["project"]);
      expect(receipt?.installedCommands).toEqual([]);
      expect(receipt?.installedAt.length).toBeGreaterThan(0);
    } finally {
      temp.cleanup();
    }
  });

  test("returns full receipt after codex install", () => {
    const temp = makeTempEnv();
    try {
      install("codex", "local", ["project"], false, temp.env);

      const receipt = listInstalled("codex", "local", temp.env);

      expect(receipt).not.toBeNull();
      expect(receipt?.agent).toBe("codex");
      expect(receipt?.scope).toBe("local");
      expect(receipt?.root).toBe(`${temp.env.MAHIRO_SKILLS_CWD}/.codex`);
      expect(receipt?.sourceRepoPath.length).toBeGreaterThan(0);
      expect(receipt?.installedSkills).toEqual(["project"]);
      expect(receipt?.installedCommands).toEqual(["project"]);
      expect(receipt?.installedAt.length).toBeGreaterThan(0);
    } finally {
      temp.cleanup();
    }
  });

  test("returns installed summaries across agent and scope", () => {
    const temp = makeTempEnv();
    try {
      install("cursor", "local", ["project"], false, temp.env);
      install("agy", "global", ["gemini"], false, temp.env);
      install("codex", "local", ["recap"], false, temp.env);
      install("letta-code", "global", ["project"], false, temp.env);
      install("pi", "local", ["mahiro-style"], false, temp.env);

      expect(listInstalledSummaries(temp.env)).toEqual([
        {
          agent: "cursor",
          scope: "local",
          installedSkills: ["project"],
          installedCommands: ["project"],
          installed: ["project"],
        },
        {
          agent: "agy",
          scope: "global",
          installedSkills: ["gemini"],
          installedCommands: [],
          installed: ["gemini"],
        },
        {
          agent: "codex",
          scope: "local",
          installedSkills: ["recap"],
          installedCommands: ["recap"],
          installed: ["recap"],
        },
        {
          agent: "letta-code",
          scope: "global",
          installedSkills: ["project"],
          installedCommands: [],
          installed: ["project"],
        },
        {
          agent: "pi",
          scope: "local",
          installedSkills: ["mahiro-style"],
          installedCommands: [],
          installed: ["mahiro-style"],
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });
});
