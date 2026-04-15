import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

function readRepoFile(...segments: string[]) {
  return readFileSync(join(import.meta.dir, "..", ...segments), "utf8");
}

describe("learn and project skill contracts", () => {
  test("learn skill uses repo-root-first .agent-state paths", () => {
    const skill = readRepoFile("skills", "learn", "SKILL.md");

    expect(skill).toContain('REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"');
    expect(skill).toContain('AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"');
    expect(skill).toContain(".agent-state/learn/$OWNER/$REPO/[TODAY]/[TIME]_*.md");
    expect(skill).toContain(".agent-state/learn/**/origin");
    expect(skill).not.toContain("ψ/learn/");
  });

  test("project skill documents split learn/incubate layouts under .agent-state", () => {
    const skill = readRepoFile("skills", "project", "SKILL.md");

    expect(skill).toContain('LEARN_DIR="$AGENT_STATE_DIR/learn"');
    expect(skill).toContain('INCUBATE_DIR="$AGENT_STATE_DIR/incubate"');
    expect(skill).toContain("$LEARN_DIR/<owner>/<repo>/origin");
    expect(skill).toContain("$INCUBATE_DIR/<owner>/<repo>");
    expect(skill).not.toContain("ψ/incubate");
  });

  test("project helpers resolve repo root and local state explicitly", () => {
    const utils = readRepoFile("skills", "project", "scripts", "utils.ts");
    const learnScript = readRepoFile("skills", "project", "scripts", "learn.ts");

    expect(utils).toContain('["git", "rev-parse", "--show-toplevel"]');
    expect(utils).toContain('["ghq", "root"]');
    expect(utils).toContain("learnOriginsFile");
    expect(learnScript).toContain('const originPath = join(repoDir, "origin")');
  });
});
