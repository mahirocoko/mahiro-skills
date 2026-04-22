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
    expect(content).toContain("curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.16 -- --agent opencode --scope global");
    expect(content).toContain("### Install from a local checkout");
    expect(content).toContain("bun ./src/cli.ts install --agent opencode --scope local");
    expect(content).toContain("This repo ships a private Bun CLI and installs from repo contents.");
    expect(content).toContain("Cursor/Gemini compatibility matrix: [`docs/cli/cursor-gemini-compatibility-matrix-v0.md`](./docs/cli/cursor-gemini-compatibility-matrix-v0.md)");
    expect(content).toContain("Adapter implementation plan: [`docs/cli/adapter-implementation-plan-v0.md`](./docs/cli/adapter-implementation-plan-v0.md)");
    expect(content).toContain("Release and path conventions: [`docs/authoring/release-and-path-conventions.md`](./docs/authoring/release-and-path-conventions.md)");
    expect(content).toContain("Docs bootstrap and review workflow: [`docs/authoring/mahiro-docs-rules-init-and-style-workflow.md`](./docs/authoring/mahiro-docs-rules-init-and-style-workflow.md)");
    expect(content).toContain("### Supported v0 adapters");
    expect(content).toContain("- `tui`");
    expect(content).toContain("- `guided`");
    expect(content).toContain("- `cursor`");
    expect(content).toContain("- `gemini`");
    expect(content).toContain("bun ./src/cli.ts tui");
    expect(content).toContain("bun ./src/cli.ts");
    expect(content).toContain("bun ./src/cli.ts guided --mode list");
    expect(content).toContain("bun ./src/cli.ts plan project --agent cursor --agent gemini --scope local");
    expect(content).toContain("CLI v0 currently targets `opencode`, `claude-code`, `cursor`, and `gemini` for packaged skill and command installs.");
    expect(content).toContain("Gemini extension assets are still copied as packaged subtree content, not modeled as a full extension setup flow.");
    expect(content).toContain("`tui` is the primary interactive entrypoint over the same planner and installer core, with non-interactive fallback when flags are fully provided.");
    expect(content).toContain("`guided` remains as a compatibility alias for the same interactive TUI flow.");
    expect(content).toContain("Interactive TUI without `--mode` opens a home menu (install, plan, list, receipt detail, exit) so you can run multiple actions in one session; explicit `--mode` or non-interactive runs stay single-pass.");
    expect(content).toContain("TUI list mode now renders installed items in grouped agent/scope cards with separate skill and command sections.");
    expect(content).toContain("interactive item selection now uses checkbox-style multiselect with space-to-toggle guidance instead of numbered readline prompts.");
    expect(content).toContain("In the interactive TUI (home menu or without `--agent`), plan, install, list, and receipt detail use checkbox-style **agent multiselect** with an explicit **All agents** shortcut; the direct CLI also accepts repeated `--agent` flags or comma-separated agent values and runs batch plan/install/list sequentially per agent for the same scope and items.");
    expect(content).toContain("guided list mode summarizes install receipts per agent and scope; when agents are chosen interactively, the list is filtered to those agents (use `--agent` on a single-pass run to skip the agent prompt).");
    expect(content).toContain("Receipt detail mode prompts for one or more agents and one scope, then shows each matching install receipt (paths, timestamps, installed skill and command names).");
    expect(content).toContain("checkbox-style **agent multiselect**");
    expect(content).toContain("Install mode shows an install preview after the plan summary with `source -> target` lines and `[collision]` markers before overwrite and confirmation prompts.");
    expect(content).toContain("Multi-agent plan and install runs end with a lightweight batch summary card so the combined result is easier to scan before leaving the TUI.");
    expect(content).not.toContain("npm install -g mahiro-skills");
    expect(content).not.toContain("bunx mahiro-skills");
  });
});
