import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const readmePath = join(import.meta.dir, "..", "README.md");

function indexOfOrThrow(content: string, needle: string): number {
  const index = content.indexOf(needle);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("README", () => {
  test("keeps install-first section order with a table of contents", () => {
    const content = readFileSync(readmePath, "utf8");

    const sections = [
      "## Table of Contents",
      "## Install",
      "## CLI",
      "## Repo layout",
      "## Authoring guide",
      "## Included skills",
      "## Included commands",
      "## Packaging notes",
      "## Current status",
      "## Source of truth",
    ];

    const indices = sections.map((section) => indexOfOrThrow(content, section));

    for (let index = 1; index < indices.length; index += 1) {
      expect(indices[index]).toBeGreaterThan(indices[index - 1]);
    }
  });

  test("documents curl install and local checkout usage truthfully", () => {
    const content = readFileSync(readmePath, "utf8");

    expect(content).toContain("### Quick install via curl");
expect(content).toContain("curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.6 -- --agent opencode --scope global");
    expect(content).toContain("### Install from a local checkout");
    expect(content).toContain("bun ./src/cli.ts install --agent opencode --scope local");
    expect(content).toContain("This repo ships a private Bun CLI and installs from repo contents.");
    expect(content).toContain("Cursor/Gemini compatibility matrix: [`docs/cli/cursor-gemini-compatibility-matrix-v0.md`](./docs/cli/cursor-gemini-compatibility-matrix-v0.md)");
    expect(content).toContain("Adapter implementation plan: [`docs/cli/adapter-implementation-plan-v0.md`](./docs/cli/adapter-implementation-plan-v0.md)");
    expect(content).toContain("Release and path conventions: [`docs/authoring/release-and-path-conventions.md`](./docs/authoring/release-and-path-conventions.md)");
    expect(content).toContain("### Supported v0 adapters");
    expect(content).toContain("- `guided`");
    expect(content).toContain("- `cursor`");
    expect(content).toContain("- `gemini`");
    expect(content).toContain("bun ./src/cli.ts guided");
    expect(content).toContain("bun ./src/cli.ts guided --mode list");
    expect(content).toContain("CLI v0 currently targets `opencode`, `claude-code`, `cursor`, and `gemini` for packaged skill and command installs.");
    expect(content).toContain("Gemini extension assets are still copied as packaged subtree content, not modeled as a full extension setup flow.");
    expect(content).toContain("`guided` is a thin interactive wrapper over the same planner and installer core, with non-interactive fallback when flags are fully provided.");
    expect(content).toContain("guided item selection now offers a default-bundle shortcut and numbered item picks from repo inventory instead of requiring typed names.");
    expect(content).toContain("guided list mode summarizes install receipts per agent and scope without forcing the human to choose a target first.");
    expect(content).not.toContain("npm install -g mahiro-skills");
    expect(content).not.toContain("bunx mahiro-skills");
  });
});
