import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getRepoManifest } from "../src/repo";

const root = join(import.meta.dir, "..");
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");
const skill = read("skills", "herdr-cli", "SKILL.md");

describe("herdr-cli source contract (not live execution proof)", () => {
  test("ships a thin default skill with wrapper and discovery owners", () => {
    const manifest = getRepoManifest(root);
    expect(manifest.gaps).toEqual([]);
    expect(manifest.skills.find((entry) => entry.name === "herdr-cli")?.inDefaultBundle).toBe(true);
    expect(manifest.commands).toContain("herdr-cli");
    expect(read("commands", "herdr-cli.md")).toContain('skill: "herdr-cli"');
    expect(read("README.md")).toContain("| `herdr-cli` | `/herdr-cli` |");
    expect(read("skills", "llms.txt")).toContain("`herdr-cli` — Organize Herdr Spaces/Tabs/Panes");
    expect(readdirSync(join(root, "skills", "herdr-cli"), { withFileTypes: true })
      .filter((entry) => entry.isFile()).map((entry) => entry.name)).toEqual(["SKILL.md"]);
    expect(skill.split("\n").length).toBeLessThan(240);
    expect(skill).not.toContain("TODO");
  });

  test("keeps runtime and executor owners separate", () => {
    expect(skill).toContain("Require `HERDR_ENV=1`");
    expect(skill).toContain("installed `herdr --skill`");
    expect(skill).toContain("callbacks, report recovery and lane cleanup to `direct-cli`");
    expect(skill).toContain("Do not use completion-oriented `--wait` by default");
    expect(skill).toContain("No callback job or supervised Task is created");
    expect(skill).toContain("Do not invent Herdr equivalents of Orca Run/Task/Dispatch");
    expect(skill).not.toMatch(/herdr (?:orchestration|inbox|gate-create|worker-release|browser)/);
    expect(skill).not.toMatch(/herdr-jobs\.py|model_reasoning_effort|--dangerously/);
  });

  test("guards path, occupant, topology and ambiguous submission contracts", () => {
    for (const contract of [
      "compare pane cwd and foreground cwd, not sidebar labels",
      "replaced\noccupant or moved pane invalidates a remembered destination",
      "Space creation does not authorize a Git worktree",
      "explicit project cwd and `--no-focus`",
      "silence never authorizes duplicate prompts or a replacement writer",
      "sender releases writing\nownership and old-controller callbacks do not apply",
      "absence is not failure or exit",
    ]) expect(skill).toContain(contract);
  });

  test("owns visible service placement without delegating ordinary server startup", () => {
    const recipe = skill.split("#### Visible app and dev-server terminals")[1]?.split("### 4.")[0]?.replace(/\s+/g, " ") ?? "";
    for (const contract of [
      "not a hidden agent background shell",
      "does not require direct-cli or orchestration",
      "Reuse a matching running service",
      "clearly named Tab",
      "split related services into Panes",
      "cwd and `--no-focus`",
      "foreground of that terminal",
      "`&`, `nohup`, `disown`",
      "explicit background request are exceptions",
      "successful submission or a live PID alone does not prove the app is ready",
      "Revalidate the exact process owner",
      "Background monitoring/callback metadata is separate",
      "report the blocker",
    ]) expect(recipe).toContain(contract);
    for (const text of [skill, read("commands", "herdr-cli.md"), read("README.md"), read("skills", "llms.txt")]) {
      expect(text).toContain("app/dev-server startup");
    }
  });

  test("does not promote coordination or presentation proxies into acceptance", () => {
    expect(skill).toContain("Sharing Herdr does not make one project depend on another");
    expect(skill).toContain("Reads do not mark seen; focus");
    expect(skill).toContain("Metadata capability is not rendered support");
    expect(skill).toContain("Verify actual rendered support with the presentation\nowner");
    expect(skill).toContain("Lifecycle idle/done never completes\nthe project by itself");
    expect(skill).toContain("only an authorized live\nhandoff can establish actual submission/readiness behavior");
    expect(skill).not.toMatch(/w7[QST]|mahiro-skills|11:21|picker\/menu is pending/);
  });

  test("separates authorized native creation from existing Letta checkout association", () => {
    const recipe = skill.split("#### Worktree-backed Spaces")[1]?.split("### 3.")[0]?.replace(/\s+/g, " ") ?? "";
    const existing = recipe.split("**Letta-created checkout:**")[1]?.split("**Destination binding:**")[0] ?? "";
    expect(recipe).toContain("Require explicit worktree authorization");
    expect(recipe).toContain("native `worktree list`");
    expect(recipe).toContain("match canonical path, branch and repository identity");
    expect(recipe).toContain("only when the approved checkout is absent");
    expect(recipe).toContain("`worktree create` to obtain a linked checkout plus Space");
    expect(existing).toContain("exact path returned by `EnterWorktree`");
    expect(existing).toContain("Letta-specific, not a rule for other executors");
    expect(existing).toContain("missing `open_workspace_id` means no associated open Space, not no checkout");
    expect(existing).toContain("native `worktree open` on the exact existing path and unchanged branch; never `create` again");
    for (const text of [read("commands", "herdr-cli.md"), read("README.md"), read("skills", "llms.txt")]) {
      expect(text).toContain("explicitly authorized Git worktrees");
    }
  });

  test("rejects duplicate-create and stale-owner recipe mutations (source-only counterexamples)", () => {
    const accepts = (source: string) => {
      const recipe = source.split("#### Worktree-backed Spaces")[1]?.split("### 3.")[0]?.replace(/\s+/g, " ") ?? "";
      return [
        "native `worktree open` on the exact existing path and unchanged branch; never `create` again",
        "agent-internal/foreground cwd can change while the native Space stays old",
        "rebind the returned live Space/Tab/Pane IDs",
        "Old `HERDR_WORKSPACE_ID`, caller pane or focus is not destination authority",
        "shared repository key alone is not checkout identity",
        "opening a Space does not move the current Letta conversation or process",
        "its own explicit topology/owner decision",
        "keep one writer per checkout",
        "Preserve `--no-focus`",
        "Cleanup needs separate approval",
        "not screenshot or visual acceptance",
      ].every((contract) => recipe.includes(contract));
    };
    expect(accepts(skill)).toBe(true);
    expect(accepts(skill.replace("native `worktree open`", "native `worktree create`"))).toBe(false);
    expect(accepts(skill.replace("rebind the returned live Space/Tab/Pane IDs", "reuse old caller Space/Tab/Pane IDs"))).toBe(false);
    expect(accepts(skill.replace("opening a Space does not move", "opening a Space automatically moves"))).toBe(false);
    expect(skill).not.toMatch(/\bw\d+[A-Z]\b|proof\/[a-z0-9-]+|\/Users\/|\b(?:[01]\d|2[0-3]):[0-5]\d\b/);
  });
});
