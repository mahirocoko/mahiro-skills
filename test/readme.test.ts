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
  test("keeps lean task-oriented section order with contents", () => {
    const content = readFileSync(readmePath, "utf8");

    const sections = [
      "## Contents",
      "## Install",
      "## Use",
      "## Skills",
      "## Bundles",
      "## Runtime prerequisites",
      "## Repo map",
      "## Maintainer notes",
      "## Source of truth",
    ];

    const indices = sections.map((section) => indexOfOrThrow(content, section));

    for (let index = 1; index < indices.length; index += 1) {
      expect(indices[index]).toBeGreaterThan(indices[index - 1]);
    }
  });

  test("documents install and usage truthfully without public-page noise", () => {
    const content = readFileSync(readmePath, "utf8");

    expect(content).toContain("Mahiro's packaged agent skills for OpenCode, Claude Code, Cursor, Gemini, Codex, and Letta Code, plus slash-command wrappers where the target agent supports them.");
    expect(content).toContain("## Install");
    expect(content).toContain("### Tagged install without keeping a clone");
    expect(content).toContain("curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.35 -- --agent opencode --scope global");
    expect(content).toContain("### Quick local install");
    expect(content).toContain("bun ./src/cli.ts install --agent opencode --scope local");
    expect(content).toContain("It installs from this repository's contents; it is not an npm-published binary package.");
    expect(content).toContain("Local installs preserve the caller working directory as the install target unless `MAHIRO_SKILLS_CWD` is explicitly set.");
    expect(content).toContain("## Runtime prerequisites");
    expect(content).toContain("`skills/llms.txt` — compact skill discovery index for agents and humans");
    expect(content).toContain("`examples/` — runnable or copyable workflow examples for the CLI/TUI surface");
    expect(content).toContain("Cursor/Gemini compatibility matrix: [`docs/cli/cursor-gemini-compatibility-matrix-v0.md`](./docs/cli/cursor-gemini-compatibility-matrix-v0.md)");
    expect(content).toContain("Adapter implementation plan: [`docs/cli/adapter-implementation-plan-v0.md`](./docs/cli/adapter-implementation-plan-v0.md)");
    expect(content).toContain("Release and path conventions: [`docs/authoring/release-and-path-conventions.md`](./docs/authoring/release-and-path-conventions.md)");
    expect(content).toContain("Skill pattern adaptation: [`docs/authoring/skill-pattern-adaptation-phase-a.md`](./docs/authoring/skill-pattern-adaptation-phase-a.md)");
    expect(content).toContain("Docs bootstrap and review workflow: [`docs/authoring/mahiro-docs-rules-init-and-style-workflow.md`](./docs/authoring/mahiro-docs-rules-init-and-style-workflow.md)");
    expect(content).toContain("Supported v0 commands: `plan`, `install`, `list`, `doctor`, `tui`, and `guided`.");
    expect(content).toContain("Supported v0 adapters: `opencode`, `claude-code`, `cursor`, `gemini`, `codex`, and `letta-code`.");
    expect(content).toContain("bun ./src/cli.ts");
    expect(content).toContain("bun ./src/cli.ts doctor --agent opencode --scope local");
    expect(content).toContain("bun ./src/cli.ts install project --agent letta-code --scope local");
    expect(content).toContain("Letta Code local installs use `.agents/skills/<name>/`; global installs use `~/.letta/skills/<name>/`");
    expect(content).toContain("CLI v0 currently targets `opencode`, `claude-code`, `cursor`, `gemini`, `codex`, and `letta-code` for packaged skill installs; Letta Code is skills-only in v0 because its documented Agent Skills surface does not define a command-wrapper directory.");
    expect(content).toContain("Gemini extension assets are still copied as packaged subtree content, not modeled as a full extension setup flow.");
    expect(content).toContain("Prefer the source files in this repository and tagged releases over installed copies.");
    expect(content).not.toContain("Home → Plan (dry run)");
    expect(content).not.toContain("checkbox-style multiselect");
    expect(content).not.toContain("Batch plan summary");
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
    expect(index).toContain("`cocoindex-rules-init` — Repo-local CocoIndex Code rule bootstrapper.");
    expect(index).toContain("`mahiro-style` — Mahiro code/review/implementation doctrine and fallback lens.");
    expect(index).toContain("`mahiro-docs-rules-init` — Repo-reality-first AGENTS.md and docs-family bootstrapper; layers Mahiro-style only as preferred direction or fallback.");
    expect(index).toContain("`mahiro-guidance-refine` — Session feedback to docs/rules/style guidance proposal workflow.");
    expect(index).toContain("**Repo doctrine bundle**: `mahiro-style`, `mahiro-docs-rules-init`, `mahiro-guidance-refine`, `philosophy`");
    expect(index).toContain("**CocoIndex bundle**: `cocoindex-rules-init`, `mahiro-guidance-refine`");
    expect(index).toContain("**Direct execution bundle**: `direct-cli`, `gemini`, `deep-research`, `watch`");
    expect(examples).toContain("# mahiro-skills examples");
    expect(examples).toContain("[`tui-session.md`](./tui-session.md)");
  });
});
