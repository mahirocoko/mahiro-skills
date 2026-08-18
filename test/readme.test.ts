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

    expect(content).toContain("Mahiro's packaged agent skills for OpenCode, Claude Code, Cursor, Antigravity CLI (Agy), Codex, Letta Code, and Pi, plus target-native command entrypoints where supported.");
    expect(content).toContain("a private Bun CLI/TUI for previewing, installing, uninstalling, listing, and checking agent integrations");
    expect(content).toContain("## Install");
    expect(content).toContain("### Tagged install without keeping a clone");
    expect(content).toContain("curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.95 -- --agent opencode --scope global");
    expect(content).toContain("### Quick local install");
    expect(content).toContain("bun ./src/cli.ts install --agent opencode --scope local");
    expect(content).toContain("### Standard Agent Skills compatibility");
    expect(content).toContain("npx skills add mahirocoko/mahiro-skills --skill recap");
    expect(content).toContain("--agent universal --copy --yes");
    expect(content).toContain("It does not install this repo's adapter-specific slash-command wrappers, receipts, status-aware updates, doctor checks, or managed uninstall flow.");
    expect(content).toContain("It installs from this repository's contents; it is not an npm-published binary package.");
    expect(content).toContain("Local installs preserve the caller working directory as the install target unless `MAHIRO_SKILLS_CWD` is explicitly set.");
    expect(content).toContain("Pi global installs honor `PI_CODING_AGENT_DIR` as the exact agent config root");
    expect(content).toContain("## Runtime prerequisites");
    expect(content).toContain("`skills/llms.txt` — compact skill discovery index for agents and humans");
    expect(content).toContain("`examples/` — runnable or copyable workflow examples for the CLI/TUI surface");
    expect(content).toContain("Adapter compatibility matrix: [`docs/cli/adapter-compatibility-matrix-v0.md`](./docs/cli/adapter-compatibility-matrix-v0.md)");
    expect(content).toContain("Adapter implementation plan: [`docs/cli/adapter-implementation-plan-v0.md`](./docs/cli/adapter-implementation-plan-v0.md)");
    expect(content).toContain("Release and path conventions: [`docs/authoring/release-and-path-conventions.md`](./docs/authoring/release-and-path-conventions.md)");
    expect(content).toContain("Skill pattern adaptation: [`docs/authoring/skill-pattern-adaptation-phase-a.md`](./docs/authoring/skill-pattern-adaptation-phase-a.md)");
    expect(content).toContain("Docs bootstrap and review workflow: [`docs/authoring/mahiro-docs-rules-init-and-style-workflow.md`](./docs/authoring/mahiro-docs-rules-init-and-style-workflow.md)");
    expect(content).toContain("Supported v0 commands: `plan`, `install`, `uninstall`, `list`, `doctor`, `audit`, `manifest`, `search`, `gaps`, `new`, `tui`, and `guided`.");
    expect(content).toContain("Supported v0 adapters: `opencode`, `claude-code`, `cursor`, `agy`, `codex`, `letta-code`, and `pi`.");
    expect(content).toContain("Current workflow highlights:");
    expect(content).toContain("The canonical catalog is default-or-absent");
    expect(content).toContain("Step-first full-screen Skill Manager plus guided compatibility flow");
    expect(content).toContain("Target → Action → Skills → Review → Result");
    expect(content).toContain("No mnemonic action key is required");
    expect(content).toContain("`current`, `outdated`, `modified`, `missing`, and `legacy`");
    expect(content).toContain("bun ./src/cli.ts uninstall --agent all --scope local");
    expect(content).toContain("backend-specific same-prompt fanout");
    expect(content).toContain("`use Pi` / `ใช้ Pi` selects the Pi lane");
    expect(content).toContain("Pi requires an explicit tool allowlist and provider/model preflight");
    expect(content).toContain("Sprite asset pipeline");
    expect(content).toContain("bounds/silhouette jitter gates");
    expect(content).toContain("safe named promotion helpers");
    expect(content).toContain("Game production stack");
    expect(content).toContain("`game-production` | `/game-production`");
    expect(content).toContain("`vfx-workflow` | `/vfx-workflow`");
    expect(content).toContain("bun ./src/cli.ts");
    expect(content).toContain("bun ./src/cli.ts doctor --agent opencode --scope local");
    expect(content).toContain("bun ./src/cli.ts audit --agent-id \"$AGENT_ID\" --start-date 2026-06-01");
    expect(content).toContain("bun ./src/cli.ts manifest --json");
    expect(content).toContain("bun ./src/cli.ts gaps --json");
    expect(content).toContain("bun ./src/cli.ts new my-skill --copy-template --json");
    expect(content).toContain("bun ./src/cli.ts install project --agent letta-code --scope local");
    expect(content).toContain("Letta Code local installs use `.agents/skills/<name>/`; global installs use `~/.letta/skills/<name>/`");
    expect(content).toContain("bun ./src/cli.ts install project --agent pi --scope local");
    expect(content).toContain("bun ./src/cli.ts install project --agent agy --scope local");
    expect(content).toContain("Agy local installs copy transformed, self-contained skills to `.agents/skills/mh-<name>/`");
    expect(content).toContain("removes only unchanged receipt-managed canonical skills and TOML commands");
    expect(content).toContain('PI_CODING_AGENT_DIR="$HOME/.9router-free/pi-pilot/home/.pi/agent"');
    expect(content).toContain("Pi local installs use `.pi/skills/<name>/`; global installs use `${PI_CODING_AGENT_DIR:-~/.pi/agent}/skills/<name>/`");
    expect(content).toContain("including multi-pane fanout or detached Herdr result collection");
    expect(content).toContain("sprite-workflow --agent opencode --scope local");
    expect(content).toContain("CLI v0 targets `opencode`, `claude-code`, `cursor`, `agy`, `codex`, `letta-code`, and `pi` for packaged skill installs. Agy, Letta Code, and Pi do not copy command-wrapper artifacts");
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
    expect(index).toContain("The canonical catalog is default-or-absent");
    expect(index).toContain("`project` — Clone and track external repos for study or development.");
    expect(index).toContain("`sprite-workflow` — CLI-first sprite/Codex handoff workflow");
    expect(index).toContain("`game-production` — Thin production director for complete games.");
    expect(index).toContain("`vfx-workflow` — Production runtime VFX workflow.");
    expect(index).toContain("chroma-key extraction, dicut cleanup");
    expect(index).toContain("motion-jitter reports");
    expect(index).toContain("`cocoindex-rules-init` — Repo-local CocoIndex Code rule bootstrapper with a portable project settings boundary, filename-only preflight, deny/noise policy sync, and explicit Gitleaks strict-scan contract.");
    expect(index).toContain("`mahiro-style` — Mahiro code/review/implementation doctrine and fallback lens; repo-local reality wins before cross-repo taste.");
    expect(index).toContain("`mahiro-docs-rules-init` — Repo-reality-first AGENTS.md and docs-family bootstrapper; layers Mahiro-style only as preferred direction, preserves target-repo mechanics, and adds CocoIndex/`ccc` guidance only when locally proven.");
    expect(index).toContain("`mahiro-guidance-refine` — Session feedback to docs/rules/style guidance proposal workflow with scope classification.");
    expect(index).toContain("`auditing-context-contracts` — Repository context-contract audit");
    expect(index).toContain("keyword absence is not semantic proof");
    expect(index).toContain("**Repo doctrine bundle**: `auditing-context-contracts`, `mahiro-style`, `mahiro-docs-rules-init`, `mahiro-guidance-refine`");
    expect(index).toContain("**CocoIndex bundle**: `cocoindex-rules-init`, `mahiro-guidance-refine`");
    expect(index).toContain("**Direct execution bundle**: `direct-cli`, `gemini`, `watch`");
    expect(index).toContain("**Sprite workflow bundle**: `sprite-workflow`, `asset-designer`, `web-asset-prompts`, `codex-asset-production`, `direct-cli`");
    expect(index).toContain("**Game production bundle**: `game-production`, `vfx-workflow`, `sprite-workflow`, `codex-asset-production`, `asset-designer`");
    expect(index).toContain("bun ./src/cli.ts install game-production vfx-workflow sprite-workflow codex-asset-production asset-designer --agent opencode --scope local");
    expect(examples).toContain("# mahiro-skills examples");
    expect(examples).toContain("[`tui-session.md`](./tui-session.md)");
  });
});
