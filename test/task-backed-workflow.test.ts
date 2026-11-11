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
    expect(task).toContain("native owner has no refine command");
    expect(task).toContain("Another session with access to the same verified local store");
  });

  test("rejects execution-only Goal creation and task auto-completion", () => {
    const goal = readSkill("control-room-goals");
    expect(goal).not.toContain("Execution starts or user confirms the draft");
    expect(goal).not.toContain("unless work starts");
    expect(goal).toContain(
      "Apply Goal Mode only after\nexplicit Goal approval",
    );
    expect(goal).toContain("never automatically marks a task done");
    expect(goal).toContain("Do not clear or migrate an existing Goal");
  });

  test("handoff retains exact requirements and candidate-bound evidence", () => {
    const task = readSkill("working-tasks");
    expect(task).toContain("human corrections verbatim");
    expect(task).toContain("worker reads the complete task");
    expect(task).toContain("reopen only the");
    expect(task).toContain("A Git HEAD alone does not identify dirty edits");
    expect(task).toContain("pre-existing");
    expect(task).toContain("unbounded");
    expect(task).toContain("independent-QA and human-acceptance gates");
  });

  test("workflow experiments do not weaken constraints or claim efficacy from prompts", () => {
    const task = readSkill("working-tasks");
    expect(task).toContain("For an explicitly agreed learning experiment");
    expect(task).toContain(
      "prompt-only probe is not proof of better real-work outcomes",
    );
    expect(task).toContain("never violate them to construct a control");
    expect(task).toContain("automatic rule promotion to every ordinary task");
  });

  test("recap reads task context without mutating the board", () => {
    const recap = readSkill("recap");
    expect(recap).toContain("show ID");
    expect(recap).toContain("list --archived");
    expect(recap).toContain("current repo/runtime truth");
    expect(recap).toContain("change status during orientation");
    expect(recap).toContain("intentionally skipped task read");
  });

  test("native Tasks contract requires verified store, CAS, and no invented bridge", () => {
    const task = readSkill("working-tasks");
    for (const part of [
      "absolute SQLite `--store`",
      "appHome()",
      "list --archived",
      "show T1",
      "--identity=uuid",
      "update ID --expect REVISION",
      "revision for CAS",
      "read-only source evidence",
      "non-Herdr environment",
      "backup gate",
      "no step mutation",
    ]) expect(task).toContain(part);
    expect(task).not.toContain("tsk --version");
    expect(task).not.toContain("tsk guide");
    expect(readSkill("recap")).toContain("rather than falling back to tsk");
    expect(readSkill("forward")).toContain("do not fall back to tsk");
  });

  test("task creation reuses exact project values rather than duplicate short labels", () => {
    const task = readSkill("working-tasks");
    for (const part of [
      "reuse its exact `project` value",
      "including a stored full path",
      "do not replace it with a basename or a new short label",
      "If the match is missing or ambiguous, ask before creating",
      "new project value only with explicit human agreement",
      "temporary display disambiguators, not project IDs",
      "never merge projects just because their short names match",
      "update only `--project=<exact-existing-value>`",
      "preserve Description, status and all other unrelated fields",
    ]) expect(task).toContain(part);
  });

  test("all task entrypoints refuse a missing store before the helper can create one", () => {
    const task = readSkill("working-tasks");
    expect(task).toContain("`props.store` absolute filename overrides it");
    expect(task).toContain("Before any helper invocation with `--store`");
    expect(task).toContain('test -f "$STORE"');
    expect(task).toContain("already exists as a regular file");
    expect(task).toContain("do not let even `list` or `show` silently create");
    expect(task).toContain("Explicit creation of a new board requires separate human approval");
    for (const name of ["recap", "forward"]) {
      const entrypoint = readSkill(name);
      expect(entrypoint).toContain("`props.store` override");
      expect(entrypoint).toContain("Before any helper invocation with `--store`");
      expect(entrypoint).toContain("exists as a regular file");
      expect(entrypoint).toContain("stop");
    }
  });

  test("handoff preserves the task brief and human acceptance boundary", () => {
    const forward = readSkill("forward");
    expect(forward).toContain("Keep\nthe task authoritative");
    expect(forward).toContain("Do not silently rewrite human decisions");
    expect(forward).toContain("Do not mark done without human acceptance");
    expect(forward).toContain("does not transfer data to another machine");
    expect(forward).toContain(
      "replace the copied Pending and Next Session lists",
    );
  });
});
