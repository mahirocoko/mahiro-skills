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
    expect(skill.split("\n").length).toBeLessThan(200);
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

  test("does not promote coordination or presentation proxies into acceptance", () => {
    expect(skill).toContain("Sharing Herdr does not make one project depend on another");
    expect(skill).toContain("Reads do not mark seen; focus");
    expect(skill).toContain("Metadata capability is not rendered support");
    expect(skill).toContain("Verify actual rendered support with the presentation\nowner");
    expect(skill).toContain("Lifecycle idle/done never completes\nthe project by itself");
    expect(skill).toContain("only an authorized live\nhandoff can establish actual submission/readiness behavior");
    expect(skill).not.toMatch(/w7[QST]|mahiro-skills|11:21|picker\/menu is pending/);
  });
});
