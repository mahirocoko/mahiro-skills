import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dir, "..");
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

describe("fable skill", () => {
  test("ships a bounded hard-task orchestrator and command wrapper", () => {
    const skill = read("skills", "fable", "SKILL.md");
    const command = read("commands", "fable.md");

    expect(skill).toContain("name: fable");
    expect(skill).toContain("same causal hypothesis or repair direction has been refuted twice");
    expect(skill).toContain("launch a fixed number or type of agents for every task");
    expect(skill).toContain("## Trigger gate");
    expect(skill).toContain("## Phase workflow");
    expect(skill).toContain("## Stop gates");
    expect(skill).toContain("## Output contract");
    expect(skill).toContain("## Validation / self-check");
    expect(skill).toContain("VERIFIED WITH CAVEATS");
    expect(skill).toContain("Cursor's `claude-fable-*` model belongs to `direct-cli`");
    expect(command).toContain('skill: "fable"');
  });

  test("keeps the real reload lesson behind a repo-neutral golden example", () => {
    const skill = read("skills", "fable", "SKILL.md");
    const referencePath = join(root, "skills", "fable", "references", "reload-debugging-golden-example.md");
    const reference = readFileSync(referencePath, "utf8");

    expect(existsSync(referencePath)).toBe(true);
    expect(skill).toContain("references/reload-debugging-golden-example.md");
    expect(reference).toContain("Host/core lane");
    expect(reference).toContain("final-cardinality-only reasoning");
    expect(reference).toContain("macrotask boundaries");
    expect(reference).toContain("several consecutive foreground reloads");
    expect(reference).not.toContain("mahirocoko");
    expect(reference).not.toContain("Agent Halo");
  });

  test("is present in default skill and command bundle inventories", () => {
    const marketplace = JSON.parse(read(".claude-plugin", "marketplace.json"));
    const bundle = marketplace.bundles[0];
    const readme = read("README.md");
    const index = read("skills", "llms.txt");

    expect(bundle.skills).toContain("fable");
    expect(bundle.commands).toContain("fable");
    expect(readme).toContain("`fable` | `/fable`");
    expect(index).toContain("`fable` — Bounded hard-task orchestration mode");
    expect(index).toContain("otherwise require at least two hard-task signals");
    expect(index).toContain("Do not trigger for Cursor Fable model selection alone");
  });
});
