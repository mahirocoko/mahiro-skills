import { describe, expect, test } from "bun:test";

import { doctor } from "../src/doctor";
import { install } from "../src/install";
import { listInstalled } from "../src/list";
import { makeTempEnv } from "./helpers";

describe("doctor", () => {
  test("reports receipt and installed paths after install", () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["recap"], false, temp.env);
      const [result] = doctor("opencode", "local", temp.env);
      expect(result.checks.every((check) => check.ok)).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("list returns installed receipt after install", () => {
    const temp = makeTempEnv();
    try {
      install("claude-code", "local", ["project"], false, temp.env);
      const receipt = listInstalled("claude-code", "local", temp.env);
      expect(receipt?.installedSkills).toEqual(["project"]);
      expect(receipt?.installedCommands).toEqual(["project"]);
    } finally {
      temp.cleanup();
    }
  });
});
