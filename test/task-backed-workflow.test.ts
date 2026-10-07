import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSkill = (name: string) =>
  readFileSync(join(import.meta.dir, "..", "skills", name, "SKILL.md"), "utf8");

describe("task-backed workflow ownership", () => {
  test("portable task owner preserves permissions and runtime evidence", () => {
    const task = readSkill("working-tasks");
    expect(task).toContain("not permission to do everything its notes mention");
    expect(task).toContain("Set `done` only after explicit human acceptance");
    expect(task).toContain("actual viewer behavior");
    expect(task).toContain("do not install, use another store");
    expect(task).toContain("not a redefinition of refine");
    expect(task).toContain("Another session on the same store");
  });

  test("rejects execution-only Goal creation and task auto-completion", () => {
    const goal = readSkill("control-room-goals");
    expect(goal).not.toContain("Execution starts or user confirms the draft");
    expect(goal).not.toContain("unless work starts");
    expect(goal).toContain("Apply Goal Mode only after\nexplicit Goal approval");
    expect(goal).toContain("never automatically marks a task done");
    expect(goal).toContain("Do not clear or migrate an existing Goal");
  });

  test("recap reads task context without mutating the board", () => {
    const recap = readSkill("recap");
    expect(recap).toContain("read the selected tsk task as JSON first");
    expect(recap).toContain("current repo/runtime truth");
    expect(recap).toContain("change status during orientation");
    expect(recap).toContain("intentionally skipped task read");
  });

  test("handoff preserves the task brief and human acceptance boundary", () => {
    const forward = readSkill("forward");
    expect(forward).toContain("Keep\nthe task authoritative");
    expect(forward).toContain("Do not silently rewrite human decisions");
    expect(forward).toContain("Do not mark done without human acceptance");
    expect(forward).toContain("does not transfer data to another machine");
    expect(forward).toContain("replace the copied Pending and Next Session lists");
  });
});
