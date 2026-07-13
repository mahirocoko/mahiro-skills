import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { delimiter, join } from "path";

import { makeTempEnv } from "./helpers";

const decoder = new TextDecoder();

function decode(output: Uint8Array): string {
  return decoder.decode(output).trim();
}

const extraCleanupPaths: string[] = [];

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
}

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
    expect(decode(result.stdout)).toContain("v0.1.57");
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

  test("bootstraps dependencies for installer-owned temp clones and removes the clone", () => {
    const temp = makeTempEnv();
    const fakeBin = mkdtempSync(join(tmpdir(), "mahiro-skills-fake-bin-"));
    const cloneTmp = mkdtempSync(join(tmpdir(), "mahiro-skills-clone-parent-"));
    extraCleanupPaths.push(fakeBin, cloneTmp);

    try {
      const repoRoot = join(import.meta.dir, "..");
      const installScript = join(repoRoot, "install.sh");
      const logPath = join(temp.root, "commands.log");

      writeExecutable(
        join(fakeBin, "git"),
        `#!/usr/bin/env bash
set -euo pipefail
log_path="$MAHIRO_TEST_LOG"
dest="${'$'}{@: -1}"
printf 'git:%s\n' "$dest" >> "$log_path"
mkdir -p "$dest/src" "$dest/skills" "$dest/commands" "$dest/commands-gemini"
printf '{"name":"mahiro-skills"}\n' > "$dest/package.json"
printf '// fake cli\n' > "$dest/src/cli.ts"
printf '# fake lock\n' > "$dest/bun.lock"
`,
      );

      writeExecutable(
        join(fakeBin, "bun"),
        `#!/usr/bin/env bash
set -euo pipefail
log_path="$MAHIRO_TEST_LOG"
printf 'bun:%s\n' "$*" >> "$log_path"
if [ "${'$'}1" = "install" ]; then
  [ "${'$'}2" = "--frozen-lockfile" ]
  [ "${'$'}3" = "--production" ]
  touch .deps-installed
  exit 0
fi
if [ "${'$'}1" = "./src/cli.ts" ]; then
  [ -f .deps-installed ] || exit 42
  printf '{"status":"installed"}\n'
  exit 0
fi
exit 1
`,
      );

      const result = Bun.spawnSync(["bash", installScript, "--version", "v-test", "--repo", "https://example.invalid/repo.git", "--", "project", "--agent", "opencode", "--scope", "local"], {
        cwd: temp.env.MAHIRO_SKILLS_CWD,
        env: {
          ...temp.env,
          MAHIRO_TEST_LOG: logPath,
          PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ""}`,
          TMPDIR: cloneTmp,
        },
      });

      expect(result.exitCode).toBe(0);
      expect(decode(result.stdout)).toContain('"status":"installed"');

      const log = readFileSync(logPath, "utf8").trim().split("\n");
      expect(log).toHaveLength(3);
      expect(log[0]).toStartWith("git:");
      expect(log[1]).toBe("bun:install --frozen-lockfile --production");
      expect(log[2]).toBe("bun:./src/cli.ts install project --agent opencode --scope local");

      const clonedRepoPath = log[0].slice("git:".length);
      expect(existsSync(clonedRepoPath)).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("does not bootstrap dependencies for a provided repo root", () => {
    const temp = makeTempEnv();
    const fakeBin = mkdtempSync(join(tmpdir(), "mahiro-skills-fake-bin-"));
    extraCleanupPaths.push(fakeBin);

    try {
      const repoRoot = join(import.meta.dir, "..");
      const installScript = join(repoRoot, "install.sh");
      const logPath = join(temp.root, "commands.log");

      writeExecutable(
        join(fakeBin, "bun"),
        `#!/usr/bin/env bash
set -euo pipefail
printf 'bun:%s\n' "$*" >> "$MAHIRO_TEST_LOG"
if [ "${'$'}1" = "install" ]; then
  exit 42
fi
if [ "${'$'}1" = "./src/cli.ts" ]; then
  printf '{"status":"installed"}\n'
  exit 0
fi
exit 1
`,
      );

      const result = Bun.spawnSync(["bash", installScript, "project", "--agent", "opencode", "--scope", "local"], {
        cwd: repoRoot,
        env: {
          ...temp.env,
          MAHIRO_SKILLS_REPO_ROOT: repoRoot,
          MAHIRO_TEST_LOG: logPath,
          PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ""}`,
        },
      });

      expect(result.exitCode).toBe(0);
      expect(readFileSync(logPath, "utf8").trim()).toBe("bun:./src/cli.ts install project --agent opencode --scope local");
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

  test("installs one skill for Letta Code from a provided repo root", () => {
    const temp = makeTempEnv();

    try {
      const repoRoot = join(import.meta.dir, "..");
      const installScript = join(repoRoot, "install.sh");

      const result = Bun.spawnSync(["bash", installScript, "project", "--agent", "letta-code", "--scope", "local"], {
        cwd: repoRoot,
        env: {
          ...temp.env,
          MAHIRO_SKILLS_REPO_ROOT: repoRoot,
        },
      });

      expect(result.exitCode).toBe(0);
      expect(decode(result.stdout)).toContain('"status": "installed"');
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "commands", "project.md"))).toBe(false);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", ".mahiro-skills", "receipts", "local-letta-code.json"))).toBe(true);
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
