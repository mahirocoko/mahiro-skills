import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getRepoManifest } from "../src/repo";

const root = join(import.meta.dir, "..");
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");
const skill = read("skills", "herdr-cli", "SKILL.md");
const normalized = skill.replace(/\s+/g, " ");

describe("herdr-cli source contract (not live execution proof)", () => {
  test("ships a thin default skill with wrapper and discovery owners", () => {
    const manifest = getRepoManifest(root);
    expect(manifest.gaps).toEqual([]);
    expect(manifest.skills.find((entry) => entry.name === "herdr-cli")?.inDefaultBundle).toBe(true);
    expect(manifest.commands).toContain("herdr-cli");
    expect(read("commands", "herdr-cli.md")).toContain('skill: "herdr-cli"');
    expect(read("README.md")).toContain("| `herdr-cli` | `/herdr-cli` |");
    expect(read("skills", "llms.txt")).toContain("`herdr-cli` — Organize Herdr Spaces/Tabs/Panes");
    expect(readdirSync(join(root, "skills", "herdr-cli"))).toEqual(["SKILL.md"]);
    expect(skill.split("\n").length).toBeLessThan(240);
  });

  test("current generation separates app topology from Core lifecycle", () => {
    for (const contract of [
      "`herdr-app --skill`", "`hc --skill`", "`herdr-app commands`",
      "Never run bare `herdr-app`", "`herdr-app ls`", "`herdr-app status`",
      "`$HC_TERMINAL_ID` is not a pane ID",
      "current-generation operation inside HC does not require legacy `HERDR_ENV`",
      "server status --json", 'get "$HC_TERMINAL_ID" --json', "`state=live`",
      "Use app commands only for visible topology",
      "Use hc for terminal execution, read/wait/send",
      "there is no assumed app `--no-focus` flag",
      "If the human says “this/current Space”",
      "`space` from `herdr-app status`",
      "caller labels or the caller's own pane do not define it",
      "displayed Space name or folder mismatch alone is not evidence",
    ]) expect(normalized.toLowerCase()).toContain(contract.toLowerCase());
    expect(skill).not.toMatch(/herdr-app (?:run|send|wait|read|kill)\b/);
    expect(skill).not.toMatch(/herdr-app do (?:worktree\.|agent\.prompt)/);
  });

  test("legacy fallback is separate, conditional and independently validated", () => {
    const fallback = normalized.split("## Legacy fallback")[1] ?? "";
    for (const contract of [
      "Only when current-generation tools are unavailable", "require `HERDR_ENV=1`",
      "installed `herdr --skill`", "`herdr status --json`", "`herdr pane get`",
      "Never substitute hc commands", "mix receipts",
    ]) expect(fallback).toContain(contract);
  });

  test("executor owner stays optional and full handoff has exact non-forced delivery", () => {
    const direct = read("skills", "direct-cli", "SKILL.md");
    expect(direct).toContain("use `herdr-cli` if available");
    expect(direct).toContain("temporary executor/model/callback ownership");
    expect(direct).toContain("do not assume the sibling skill is installed");
    for (const contract of [
      "lane cleanup to `direct-cli` when available", "If `direct-cli` is unavailable",
      "do not assume it is installed or invent its", "a different Tab does not transfer it",
      "sender releases writing ownership", "non-forced `hc send <address> <brief>` once",
      "Do not use completion-oriented `--wait` by default", "No callback job or supervised Task is created",
      "**submitted**", "**activity observed**", "**receiver acknowledged**", "**accepted outcome**",
      "silence never authorizes duplicate prompts or a replacement writer",
    ]) expect(normalized).toContain(contract);
    expect(skill).not.toMatch(/herdr-jobs\.py|model_reasoning_effort|--dangerously|herdr (?:orchestration|inbox|browser)/);
  });

  test("visible services bind explicit topology and exact Core lifecycle evidence", () => {
    const recipe = normalized.split("#### Visible app and dev-server terminals")[1]?.split("### 4.")[0] ?? "";
    for (const contract of [
      "not a hidden agent background shell", "does not require direct-cli or orchestration",
      "Reuse a matching running service", "clearly named Tab", "split related services into Panes",
      "explicit folder/name/argv", "returned terminal ID", "foreground of that terminal",
      "`&`, `nohup`, `disown`", "hc wait <address> --output <ready-marker>", "`hc read`",
      "never sleep/poll", "Revalidate the exact process owner", "report the blocker",
      "use the `herdr-app status` Space", "Do not create a duplicate Space", "foreground cwd",
    ]) expect(recipe).toContain(contract);
    for (const text of [skill, read("commands", "herdr-cli.md"), read("README.md"), read("skills", "llms.txt")]) {
      expect(text).toContain("app/dev-server startup");
    }
  });

  test("does not confuse HC labels or pending placement with a completed pane move", () => {
    for (const contract of [
      "Changing an existing terminal's HC labels does not prove its app pane moved",
      "confirm actual placement with `herdr-app ls`",
      "Use app-owned park/keep rather than relabeling",
      "If `herdr-app ls` shows it already has a pane",
      "do not park a pane-less child",
      "select the authorized destination by exact ID",
      "immediately re-read `herdr-app status` before keep",
      "Treat placement as focus-changing",
      "treat a `pending` response as admission only",
      "exact HC address/process/cwd afterward",
      "also recheck port and health",
    ]) expect(normalized).toContain(contract);
    const wrapper = read("commands", "herdr-cli.md").replace(/\s+/g, " ");
    expect(wrapper).toContain("HC label changes do not prove pane movement");
    expect(wrapper).toContain("park only an exact terminal that currently has a pane");
    expect(wrapper).toContain("select and revalidate the exact destination Space immediately before keep");
    expect(wrapper).toContain("pending reply is not completion");
    expect(read("README.md")).toContain("HC label change does not prove a new Space or moved pane");
    expect(read("skills", "llms.txt")).toContain("HC label changes do not prove new/moved topology");
  });

  test("worktree creation stays with Git/executor owner, app associates exact existing path", () => {
    const recipe = normalized.split("#### Worktree-backed Spaces")[1]?.split("### 3.")[0] ?? "";
    const accepts = (text: string) => [
      "Require explicit worktree authorization", "Git or the actual executor/worktree owner",
      "exact existing checkout path", "canonical path, branch and repository identity",
      "no proven native Git-worktree create/open API", "Never create another checkout",
      "Rebind returned Space/Tab/Pane IDs", "separate HC terminal address",
      "Opening a Space does not move the current agent process", "Keep one writer per checkout",
      "Cleanup needs separate approval", "not screenshot or visual acceptance",
    ].every((contract) => text.includes(contract));
    expect(accepts(recipe)).toBe(true);
    expect(accepts(recipe.replace("exact existing checkout path", "guessed checkout path"))).toBe(false);
    expect(accepts(recipe.replace("Opening a Space does not move", "Opening a Space moves"))).toBe(false);
    expect(skill).not.toMatch(/`worktree (?:create|open|list)`|EnterWorktree|open_workspace_id/);
    for (const text of [read("commands", "herdr-cli.md"), read("README.md"), read("skills", "llms.txt")]) {
      expect(text).toContain("explicitly authorized Git worktrees");
    }
  });

  test("source evidence is not presentation, acceptance or live launch proof", () => {
    for (const contract of [
      "compare pane cwd and foreground cwd, not sidebar labels", "replaced occupant or moved pane",
      "Space creation does not authorize a Git worktree", "Sharing Herdr does not make one project depend on another",
      "Metadata capability is not rendered support", "Verify actual rendered support with the presentation owner",
      "Lifecycle idle/done never completes work", "Source/fixture checks are not live launch/handoff or human acceptance proof",
    ]) expect(normalized).toContain(contract);
    expect(skill).not.toMatch(/\/Users\/|\b0\.1\.\d+\b|\bw\d+[A-Z]\b/);
  });
});
