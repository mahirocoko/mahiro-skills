import { describe, expect, test } from "bun:test";

import { install } from "../src/install";
import { listInstalled } from "../src/list";
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

      expect(receipt?.description).toBe("Mahiro Skill | Packaged local skills plus slash-command wrappers from the current OpenCode install.");
    } finally {
      temp.cleanup();
    }
  });
});
