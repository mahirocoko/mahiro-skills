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
  test("keeps task-oriented section order with a table of contents", () => {
    const content = readFileSync(readmePath, "utf8");

    const sections = [
      "## Table of Contents",
      "## Quick start",
      "## Choose your install path",
      "## TUI walkthrough",
      "## CLI examples",
      "## Included skills",
      "## Common workflows",
      "## Runtime prerequisites by workflow",
      "## Repo layout",
      "## Authoring guide",
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

    expect(content).toContain("Mahiro's packaged agent skills and slash commands for OpenCode, Claude Code, Cursor, Gemini, and Codex.");
    expect(content).toContain("## Choose your install path");
    expect(content).toContain("### Quick install via curl");
    expect(content).toContain("curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.19 -- --agent opencode --scope global");
    expect(content).toContain("### Install from a local checkout");
    expect(content).toContain("bun ./src/cli.ts install --agent opencode --scope local");
    expect(content).toContain("It installs from this repository's contents; it is not an npm-published binary package.");
    expect(content).toContain("Local installs preserve the caller working directory as the install target unless `MAHIRO_SKILLS_CWD` is explicitly set.");
    expect(content).toContain("## TUI walkthrough");
    expect(content).toContain("Home → Plan (dry run)");
    expect(content).toContain("## Runtime prerequisites by workflow");
    expect(content).toContain("`skills/llms.txt` — compact skill discovery index for agents and humans");
    expect(content).toContain("`examples/` — runnable or copyable workflow examples for the CLI/TUI surface");
    expect(content).toContain("Cursor/Gemini compatibility matrix: [`docs/cli/cursor-gemini-compatibility-matrix-v0.md`](./docs/cli/cursor-gemini-compatibility-matrix-v0.md)");
    expect(content).toContain("Adapter implementation plan: [`docs/cli/adapter-implementation-plan-v0.md`](./docs/cli/adapter-implementation-plan-v0.md)");
    expect(content).toContain("Release and path conventions: [`docs/authoring/release-and-path-conventions.md`](./docs/authoring/release-and-path-conventions.md)");
    expect(content).toContain("Docs bootstrap and review workflow: [`docs/authoring/mahiro-docs-rules-init-and-style-workflow.md`](./docs/authoring/mahiro-docs-rules-init-and-style-workflow.md)");
    expect(content).toContain("Supported v0 commands: `plan`, `install`, `list`, `doctor`, `tui`, and `guided`.");
    expect(content).toContain("Supported v0 adapters: `opencode`, `claude-code`, `cursor`, `gemini`, and `codex`.");
    expect(content).toContain("bun ./src/cli.ts tui");
    expect(content).toContain("bun ./src/cli.ts");
    expect(content).toContain("bun ./src/cli.ts guided --mode list");
    expect(content).toContain("bun ./src/cli.ts plan project --agent cursor --agent gemini --scope local");
    expect(content).toContain("CLI v0 currently targets `opencode`, `claude-code`, `cursor`, `gemini`, and `codex` for packaged skill and command installs.");
    expect(content).toContain("Gemini extension assets are still copied as packaged subtree content, not modeled as a full extension setup flow.");
    expect(content).toContain("`tui` is the primary interactive entrypoint over the same planner and installer core, with non-interactive fallback when flags are fully provided.");
    expect(content).toContain("`guided` remains as a compatibility alias for the same interactive TUI flow.");
    expect(content).toContain("checkbox-style multiselect");
    expect(content).toContain("**Install preview**");
    expect(content).toContain("Batch plan summary");
    expect(content).toContain("Prefer the source files in this repository and tagged releases over installed copies.");
    expect(content).not.toContain("npm install -g mahiro-skills");
    expect(content).not.toContain("bunx mahiro-skills");
  });

  test("documents the skill index and examples surfaces", () => {
    const repoRoot = join(import.meta.dir, "..");
    const index = readFileSync(join(repoRoot, "skills", "llms.txt"), "utf8");
    const examples = readFileSync(join(repoRoot, "examples", "README.md"), "utf8");

    expect(index).toContain("# mahiro-skills skill index");
    expect(index).toContain("Runtime bundle membership still comes from `../.claude-plugin/marketplace.json`");
    expect(index).toContain("`project` — Clone and track external repos for study or development.");
    expect(index).toContain("**Direct execution bundle**: `direct-cli`, `gemini`, `deep-research`, `watch`");
    expect(examples).toContain("# mahiro-skills examples");
    expect(examples).toContain("[`tui-session.md`](./tui-session.md)");
  });
});
