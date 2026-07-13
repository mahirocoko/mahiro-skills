import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
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

function makeTemplateRepo() {
  const repoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-cli-new-"));
  mkdirSync(join(repoRoot, "template"), { recursive: true });
  mkdirSync(join(repoRoot, "skills"), { recursive: true });
  writeFileSync(
    join(repoRoot, "template", "SKILL.md"),
    `---\nname: template\ndescription: Skill template with Bun Shell pattern.\n---\n\n# /template - Skill Template\n`,
  );

  return {
    repoRoot,
    env: {
      ...process.env,
      MAHIRO_SKILLS_REPO_ROOT: repoRoot,
    },
    cleanup() {
      rmSync(repoRoot, { recursive: true, force: true });
    },
  };
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

  test("default all-agent installs include frontend-design", () => {
    const temp = makeTempEnv();

    try {
      const installResult = runCli(["install", "--agent", "all", "--scope", "global"], temp.env);
      expect(installResult.exitCode).toBe(0);

      const listResult = runCli(["list", "--agent", "all", "--scope", "global"], temp.env);

      expect(listResult.exitCode).toBe(0);
      const payload = parseJson(listResult.stdout) as Array<{ agent: string; installedSkills: string[]; installedCommands: string[] }>;
      expect(payload.length).toBe(6);
      expect(payload.every((entry) => entry.installedSkills.includes("frontend-design"))).toBe(true);
      expect(payload.find((entry) => entry.agent === "letta-code")?.installedCommands).not.toContain("frontend-design");
      expect(payload.filter((entry) => entry.agent !== "letta-code").every((entry) => entry.installedCommands.includes("frontend-design"))).toBe(true);
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

  test("prints a repo skill manifest without requiring agent or scope", () => {
    const temp = makeTempEnv();

    try {
      const result = runCli(["manifest", "--json"], temp.env);

      expect(result.exitCode).toBe(0);
      const payload = parseJson(result.stdout) as { type: string; skills: Array<{ name: string }>; commands: string[]; gaps: unknown[] };
      expect(payload.type).toBe("manifest");
      expect(payload.skills.some((entry) => entry.name === "project")).toBe(true);
      expect(payload.commands).toContain("project");
      expect(Array.isArray(payload.gaps)).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("searches the repo skill catalog without requiring agent or scope", () => {
    const temp = makeTempEnv();

    try {
      const result = runCli(["search", "repo", "--json"], temp.env);

      expect(result.exitCode).toBe(0);
      const payload = parseJson(result.stdout) as { type: string; query: string; results: Array<{ name: string }> };
      expect(payload.type).toBe("search");
      expect(payload.query).toBe("repo");
      expect(payload.results.some((entry) => entry.name === "project")).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("prints repo inventory gaps without requiring agent or scope", () => {
    const temp = makeTempEnv();

    try {
      const result = runCli(["gaps", "--json"], temp.env);

      expect(result.exitCode).toBe(0);
      const payload = parseJson(result.stdout) as { type: string; ok: boolean; gaps: Array<{ code: string; item: string; severity: string; detail: string }> };
      expect(payload.type).toBe("gaps");
      expect(payload.ok).toBe(true);
      expect(payload.gaps).toEqual([
        {
          code: "command-missing-default-bundle",
          severity: "warning",
          item: "deep-research",
          detail: "Command 'deep-research' is not listed in the default bundle.",
        },
        {
          code: "command-missing-default-bundle",
          severity: "warning",
          item: "studying-codrops",
          detail: "Command 'studying-codrops' is not listed in the default bundle.",
        },
        {
          code: "skill-missing-default-bundle",
          severity: "warning",
          item: "deep-research",
          detail: "Skill 'deep-research' is not listed in the default bundle.",
        },
        {
          code: "skill-missing-default-bundle",
          severity: "warning",
          item: "studying-codrops",
          detail: "Skill 'studying-codrops' is not listed in the default bundle.",
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("creates a skill from template without requiring agent or scope", () => {
    const temp = makeTemplateRepo();

    try {
      const result = runCli(["new", "sample-skill", "--copy-template", "--json"], temp.env);

      expect(result.exitCode).toBe(0);
      const payload = parseJson(result.stdout) as { type: string; name: string; files: string[]; nextSteps: string[] };
      expect(payload.type).toBe("new-skill");
      expect(payload.name).toBe("sample-skill");
      expect(payload.files).toEqual(["SKILL.md"]);
      expect(payload.nextSteps.some((step) => step.includes("commands/sample-skill.md"))).toBe(true);
      expect(readFileSync(join(temp.repoRoot, "skills", "sample-skill", "SKILL.md"), "utf8")).toContain("name: sample-skill");
    } finally {
      temp.cleanup();
    }
  });

  test("requires --copy-template for new skill scaffolding", () => {
    const temp = makeTemplateRepo();

    try {
      const result = runCli(["new", "sample-skill", "--json"], temp.env);

      expect(result.exitCode).toBe(1);
      expect(new TextDecoder().decode(result.stderr)).toContain("Missing required flag --copy-template");
    } finally {
      temp.cleanup();
    }
  });
});
