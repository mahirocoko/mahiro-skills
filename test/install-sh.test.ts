import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { makeTempEnv } from "./helpers";

const decoder = new TextDecoder();

function decode(output: Uint8Array): string {
  return decoder.decode(output).trim();
}

const extraCleanupPaths: string[] = [];

afterEach(() => {
  while (extraCleanupPaths.length > 0) {
    const path = extraCleanupPaths.pop();
    if (path) {
      rmSync(path, { recursive: true, force: true });
    }
  }
});

describe("install.sh", () => {
  test("help text shows the current patch release example", () => {
    const repoRoot = join(import.meta.dir, "..");
    const installScript = join(repoRoot, "install.sh");

    const result = Bun.spawnSync(["bash", installScript, "--help"], {
      cwd: repoRoot,
      env: process.env,
    });

    expect(result.exitCode).toBe(0);
expect(decode(result.stdout)).toContain("v0.1.23");
  });

  test("installs one skill and paired command from a provided repo root", () => {
    const temp = makeTempEnv();

    try {
      const repoRoot = join(import.meta.dir, "..");
      const installScript = join(repoRoot, "install.sh");

      const result = Bun.spawnSync(["bash", installScript, "project", "--agent", "opencode", "--scope", "local"], {
        cwd: repoRoot,
        env: {
          ...temp.env,
          MAHIRO_SKILLS_REPO_ROOT: repoRoot,
        },
      });

      expect(result.exitCode).toBe(0);
      expect(decode(result.stdout)).toContain('"status": "installed"');
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", ".mahiro-skills", "receipts", "local-opencode.json"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("uses the caller working directory for local installs when MAHIRO_SKILLS_CWD is unset", () => {
    const temp = makeTempEnv();

    try {
      const repoRoot = join(import.meta.dir, "..");
      const installScript = join(repoRoot, "install.sh");
      const { MAHIRO_SKILLS_CWD: _cwd, ...envWithoutCwd } = temp.env;

      const result = Bun.spawnSync(["bash", installScript, "project", "--agent", "opencode", "--scope", "local"], {
        cwd: temp.env.MAHIRO_SKILLS_CWD,
        env: {
          ...envWithoutCwd,
          MAHIRO_SKILLS_REPO_ROOT: repoRoot,
        },
      });

      expect(result.exitCode).toBe(0);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(repoRoot, ".opencode", "skills", "project", "SKILL.md"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("fails clearly when the repo root layout is incomplete", () => {
    const temp = makeTempEnv();
    const invalidRepoRoot = mkdtempSync(join(tmpdir(), "mahiro-skills-invalid-"));
    extraCleanupPaths.push(invalidRepoRoot);

    try {
      writeFileSync(join(invalidRepoRoot, "package.json"), '{"name":"mahiro-skills"}');
      mkdirSync(join(invalidRepoRoot, "src"), { recursive: true });
      writeFileSync(join(invalidRepoRoot, "src", "cli.ts"), "");
      mkdirSync(join(invalidRepoRoot, "skills"), { recursive: true });

      const repoRoot = join(import.meta.dir, "..");
      const installScript = join(repoRoot, "install.sh");

      const result = Bun.spawnSync(["bash", installScript, "project", "--agent", "opencode", "--scope", "local"], {
        cwd: repoRoot,
        env: {
          ...temp.env,
          MAHIRO_SKILLS_REPO_ROOT: invalidRepoRoot,
        },
      });

      expect(result.exitCode).toBe(1);
      expect(decode(result.stderr)).toContain("Invalid repo root");
      expect(decode(result.stderr)).toContain("missing commands/");
    } finally {
      temp.cleanup();
    }
  });

  test("installs one skill and paired command for cursor from a provided repo root", () => {
    const temp = makeTempEnv();

    try {
      const repoRoot = join(import.meta.dir, "..");
      const installScript = join(repoRoot, "install.sh");

      const result = Bun.spawnSync(["bash", installScript, "project", "--agent", "cursor", "--scope", "local"], {
        cwd: repoRoot,
        env: {
          ...temp.env,
          MAHIRO_SKILLS_REPO_ROOT: repoRoot,
        },
      });

      expect(result.exitCode).toBe(0);
      expect(decode(result.stdout)).toContain('"status": "installed"');
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", "commands", "project.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", ".mahiro-skills", "receipts", "local-cursor.json"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("installs gemini from a provided repo root into the gemini local root", () => {
    const temp = makeTempEnv();

    try {
      const repoRoot = join(import.meta.dir, "..");
      const installScript = join(repoRoot, "install.sh");

      const result = Bun.spawnSync(["bash", installScript, "gemini", "--agent", "gemini", "--scope", "local"], {
        cwd: repoRoot,
        env: {
          ...temp.env,
          MAHIRO_SKILLS_REPO_ROOT: repoRoot,
        },
      });

      expect(result.exitCode).toBe(0);
      expect(decode(result.stdout)).toContain('"status": "installed"');
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "skills", "gemini", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "skills", "gemini", "extension", "manifest.json"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "commands", "mh-gemini.toml"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", ".mahiro-skills", "receipts", "local-gemini.json"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });
});
