import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

function readRepoFile(...segments: string[]) {
  return readFileSync(join(import.meta.dir, "..", ...segments), "utf8");
}

describe("recap skill contract", () => {
  test("requires same-day retrospective memory before no-work conclusions", () => {
    const skill = readRepoFile("skills", "recap", "SKILL.md");

    expect(skill).toContain(".agent-state/memory/retrospectives/YYYY-MM/DD/*.md");
    expect(skill).toContain("Only say “no implementation work happened today” when the broader same-day memory layer is empty.");
    expect(skill).toContain("What happened today");
    expect(skill).toContain("What is active now");
  });

  test("documents rich-mode same-day memory lookup paths", () => {
    const richPaths = readRepoFile("skills", "recap", "references", "rich-paths.md");

    expect(richPaths).toContain("$AGENT_STATE_DIR/memory/retrospectives/$TODAY_DIR/*.md");
    expect(richPaths).toContain("$AGENT_STATE_DIR/memory/retrospectives/**/**/*.md");
    expect(richPaths).toContain("$AGENT_STATE_DIR/inbox/handoff/*.md");
    expect(richPaths).toContain("If current session evidence is weak, always inspect same-day retrospective memory");
  });

  test("documents latest retrospective fallback and stale-context wording", () => {
    const skill = readRepoFile("skills", "recap", "SKILL.md");

    expect(skill).toContain("If there is no same-day retrospective, discover the newest retrospective anywhere in the retrospectives tree");
    expect(skill).toContain("latest work was yesterday");
    expect(skill).toContain("latest work was N days ago");
    expect(skill).toContain("last known context");
    expect(skill).toContain("Never flatten older retrospectives into “current activity”.");
  });
});
