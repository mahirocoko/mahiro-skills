import { describe, expect, test } from "bun:test";
import { join } from "path";

import { makeTempEnv } from "./helpers";

function runCli(args: string[], env: NodeJS.ProcessEnv) {
  const repoRoot = join(import.meta.dir, "..");
  return Bun.spawnSync(["bun", "./src/cli.ts", ...args], {
    cwd: repoRoot,
    env,
  });
}

function parseJson(stdout: Uint8Array) {
  return JSON.parse(new TextDecoder().decode(stdout));
}

describe("cli", () => {
  test("supports repeated --agent flags for batch plan output", () => {
    const temp = makeTempEnv();

    try {
      const result = runCli(["plan", "project", "--agent", "cursor", "--agent", "gemini", "--scope", "local"], temp.env);

      expect(result.exitCode).toBe(0);
      const payload = parseJson(result.stdout) as Array<{ agent: string; requested: string[] }>;
      expect(Array.isArray(payload)).toBe(true);
      expect(payload.map((entry) => entry.agent)).toEqual(["cursor", "gemini"]);
      expect(payload.every((entry) => entry.requested.includes("project"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("supports comma-separated --agent values for batch list output", () => {
    const temp = makeTempEnv();

    try {
      const installResult = runCli(["install", "project", "--agent", "cursor,gemini", "--scope", "local"], temp.env);
      expect(installResult.exitCode).toBe(0);

      const listResult = runCli(["list", "--agent", "cursor,gemini", "--scope", "local"], temp.env);
      expect(listResult.exitCode).toBe(0);

      const payload = parseJson(listResult.stdout) as Array<{ agent: string; installedSkills: string[] }>;
      expect(Array.isArray(payload)).toBe(true);
      expect(payload.map((entry) => entry.agent)).toEqual(["cursor", "gemini"]);
      expect(payload.every((entry) => entry.installedSkills.includes("project"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("supports uninstall for all agents in one scope", () => {
    const temp = makeTempEnv();

    try {
      const installResult = runCli(["install", "project", "--agent", "cursor,gemini,letta-code", "--scope", "local"], temp.env);
      expect(installResult.exitCode).toBe(0);

      const uninstallResult = runCli(["uninstall", "project", "--agent", "all", "--scope", "local"], temp.env);
      expect(uninstallResult.exitCode).toBe(0);

      const payload = parseJson(uninstallResult.stdout) as Array<{ agent: string; status: string; uninstalled: string[] }>;
      expect(payload).toHaveLength(6);
      expect(payload.map((entry) => entry.agent)).toEqual(["opencode", "claude-code", "cursor", "gemini", "codex", "letta-code"]);
      expect(payload.find((entry) => entry.agent === "cursor")?.uninstalled).toEqual(["project"]);
      expect(payload.find((entry) => entry.agent === "gemini")?.uninstalled).toEqual(["project"]);
      expect(payload.find((entry) => entry.agent === "letta-code")?.uninstalled).toEqual(["project"]);
      expect(payload.find((entry) => entry.agent === "opencode")?.status).toBe("skipped");
    } finally {
      temp.cleanup();
    }
  });

  test("supports Letta Code in the direct CLI surface", () => {
    const temp = makeTempEnv();

    try {
      const result = runCli(["plan", "project", "--agent", "letta-code", "--scope", "local"], temp.env);

      expect(result.exitCode).toBe(0);
      const payload = parseJson(result.stdout) as { agent: string; root: string; skills: Array<{ name: string }>; commands: Array<{ name: string }> };
      expect(payload.agent).toBe("letta-code");
      expect(payload.root.endsWith(".agents")).toBe(true);
      expect(payload.skills.map((entry) => entry.name)).toEqual(["project"]);
      expect(payload.commands).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("supports codex in the direct CLI surface", () => {
    const temp = makeTempEnv();

    try {
      const result = runCli(["plan", "project", "--agent", "codex", "--scope", "local"], temp.env);

      expect(result.exitCode).toBe(0);
      const payload = parseJson(result.stdout) as { agent: string; root: string; skills: Array<{ name: string }>; commands: Array<{ name: string }> };
      expect(payload.agent).toBe("codex");
      expect(payload.root.endsWith(".codex")).toBe(true);
      expect(payload.skills.map((entry) => entry.name)).toEqual(["project"]);
      expect(payload.commands.map((entry) => entry.name)).toEqual(["project"]);
    } finally {
      temp.cleanup();
    }
  });
});
