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
});
