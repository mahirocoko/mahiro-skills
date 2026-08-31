import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { requireDeepResearchToolLabel } from "../skills/gemini/scripts/deep-research-capability";
import { toolLabelsEqual } from "../skills/gemini/extension/tool-label";
import { buildGeminiTabUrl } from "../skills/gemini/extension/gemini-tab-url";

const repoRoot = resolve(import.meta.dir, "..");

function filesUnder(root: string, suffix = ""): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return filesUnder(path, suffix);
    if (!entry.isFile() || (suffix && !entry.name.endsWith(suffix))) return [];
    return [path];
  });
}

function read(...parts: string[]): string {
  return readFileSync(join(repoRoot, ...parts), "utf8");
}

describe("packaged skill context freshness", () => {
  test("all packaged relative Markdown links resolve", () => {
    const markdownFiles = filesUnder(join(repoRoot, "skills"), ".md");
    const missing: string[] = [];

    for (const file of markdownFiles) {
      const lines = readFileSync(file, "utf8").split("\n");
      for (const [index, line] of lines.entries()) {
        for (const match of line.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)) {
          const raw = match[1]?.trim().split(/\s+/)[0]?.replace(/^<|>$/g, "") ?? "";
          if (!raw || /^(?:https?:|mailto:|data:|#)/.test(raw)) continue;
          if (raw.includes("${") || raw.includes("{{") || raw.includes("<")) continue;
          const target = raw.split("#", 1)[0];
          if (target && !existsSync(resolve(dirname(file), target))) {
            missing.push(`${file}:${index + 1}:${raw}`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });

  test("removed skills and ghost slash routes do not remain active", () => {
    const markdown = filesUnder(join(repoRoot, "skills"), ".md")
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    for (const removed of ["frontend-design", "uncodixify", "building-frontends"]) {
      expect(markdown).not.toContain(removed);
    }
    expect(markdown).not.toMatch(/(?:^|[\s`])\/philosophy(?=[\s`]|$)/m);
    expect(markdown).not.toMatch(/(?:^|[\s`])\/(?:viral|awaken)(?=[\s`]|$)/m);

    for (const file of [
      ["skills", "learn", "SKILL.md"],
      ["skills", "watch", "SKILL.md"],
    ]) {
      expect(read(...file)).not.toMatch(/\/trace\b/);
    }
  });

  test("active bundle contains no redirect-only compatibility trees", () => {
    for (const directory of ["examples", "resources"]) {
      const path = join(repoRoot, "skills", "mahiro-style", directory);
      expect(existsSync(path) ? filesUnder(path) : []).toEqual([]);
    }
    expect(existsSync(join(repoRoot, "skills", "project", "project-manager.md"))).toBe(false);

  });

  test("Gemini docs and research handoff match the bundled runtime", () => {
    const skill = read("skills", "gemini", "SKILL.md");
    const manifest = JSON.parse(read("skills", "gemini", "extension", "manifest.json"));
    const background = read("skills", "gemini", "extension", "background-src.js");
    const research = read("skills", "gemini", "scripts", "deep-research.ts");
    const researchCapability = read("skills", "gemini", "scripts", "deep-research-capability.ts");
    const researchContract = `${research}\n${researchCapability}`;
    const watch = read("skills", "watch", "SKILL.md");
    const watchTranscribe = read("skills", "watch", "scripts", "transcribe.ts");

    expect(manifest.name).toBe("Local Gemini Proxy");
    expect(skill).toContain("bundled **Local Gemini Proxy**");
    expect(skill).not.toContain("v2.8.8");
    expect(skill).not.toContain("laris-co/claude-browser-proxy");
    expect(skill).not.toContain("node --experimental-strip-types");
    expect(researchContract).toContain("refusing ordinary-chat fallback");
    expect(research).toContain('researchRouteState.success !== true || confirmedRoute !== "research"');
    expect(research).toContain('{ accountIndex, mode: "research" }');
    expect(research).not.toContain('url: geminiAppUrl(accountIndex)');
    expect(research).not.toContain("continuing on research-mode tab");
    expect(researchContract).toContain("Deep Research capability probe failed");
    expect(researchContract).toContain("Deep Research tool is not available on this account/tab; refusing ordinary-chat fallback");
    expect(research).toContain("selected.success !== true");
    expect(researchContract).not.toMatch(/deep\\s\*research\|research/);
    expect(background).toContain("new URL(url).searchParams.get('mode')");
    expect(background).toContain("toolLabelsEqual(el.textContent, target)");
    expect(background).not.toContain("label.includes(target)");
    expect(background).not.toContain("/deep\\s+research/i.test(document.body");
    expect(watch).not.toContain("Deep analysis with fact-checking");
    expect(watch).toContain("current `/app/explore?mode=research` route");
    expect(watchTranscribe).toContain('research: "https://gemini.google.com/app/explore?mode=research"');
    expect(watchTranscribe).not.toContain('research: "https://gemini.google.com/app?mode=research"');

    expect(requireDeepResearchToolLabel({
      success: true,
      items: [{ label: "Deep Research", disabled: false }],
    })).toBe("Deep Research");
    expect(() => requireDeepResearchToolLabel({ success: false, error: "offline" }))
      .toThrow("Deep Research capability probe failed: offline");
    expect(() => requireDeepResearchToolLabel({
      success: true,
      items: [{ label: "Research", disabled: false }],
    })).toThrow("Deep Research tool is not available");
    expect(() => requireDeepResearchToolLabel({
      success: true,
      items: [{ label: "Deep Research Preview", disabled: false }],
    })).toThrow("Deep Research tool is not available");
    expect(() => requireDeepResearchToolLabel({
      success: true,
      items: [{ label: "Deep Research", disabled: true }],
    })).toThrow("Deep Research tool is not available");
    expect(toolLabelsEqual("  Deep   Research  ", "deep research")).toBe(true);
    expect(toolLabelsEqual("Deep Research Preview", "deep research")).toBe(false);
    expect(buildGeminiTabUrl(
      "https://gemini.google.com/u/1/app",
      "https://gemini.google.com/u/1/app",
      "research",
    )).toBe("https://gemini.google.com/u/1/app/explore?mode=research");
    expect(buildGeminiTabUrl(
      "https://gemini.google.com/app",
      "https://gemini.google.com/app/saved",
      undefined,
    )).toBe("https://gemini.google.com/app/saved");

    expect(research.indexOf('"list_tools"')).toBeLessThan(research.indexOf('"select_tool"'));
    expect(research.indexOf('"select_tool"')).toBeLessThan(research.indexOf('"chat"'));
  });

  test("direct-cli keeps volatile routing in one owner and gates Pi capabilities", () => {
    const skill = read("skills", "direct-cli", "SKILL.md");
    const readme = read("skills", "direct-cli", "README.md");
    const playbook = read("skills", "direct-cli", "playbook.md");
    const command = read("commands", "direct-cli.md");
    const activeSurfaces = [skill, readme, command].join("\n");
    const allDirectDocs = [activeSurfaces, playbook].join("\n");

    expect(skill).toContain("`playbook.md` is the single owner");
    expect(playbook).toContain("## Curated routing policy");
    expect(playbook).toContain("Cursor ordinary implementation / cleanup model: `composer-2.5`");
    expect(playbook).toContain("Cursor long-horizon agentic model: `cursor-grok-4.6-high`");
    expect(playbook).toContain("Cursor heavy Opus review model: `claude-opus-5-thinking-high`");
    expect(playbook).toContain("Do not offer a Fast-tier Cursor model in the default picker");
    expect(playbook).not.toContain("composer-2.5-fast");
    expect(playbook).not.toContain("claude-opus-4-8-thinking-high");
    expect(activeSurfaces).not.toMatch(/(?:composer-[0-9]|claude-(?:fable|opus|sonnet)-[0-9]|gemini-[0-9]|gpt-[0-9]|kimi-|grok-|glm-)/i);
    expect(activeSurfaces).not.toMatch(/--provider\s+(?!<provider>)\S+\s+--model\s+(?!<model>)\S+/);
    expect(allDirectDocs).not.toMatch(/Current Freshness Notes|Current freshness checkpoints/);
    expect(allDirectDocs).not.toMatch(/2026\.07\.23-e383d2b|agy 1\.1\.6|0\.144\.6|0\.145\.0|Pi `0\.83\.0`|global `pi` was not on `PATH`/);
    expect(skill).toContain("require the current help output to expose every launch flag");
    expect(skill).toContain("PATH presence or the basename `pi` is not enough");
    expect(skill).toContain("lane's cleanup receipt");
    expect(skill).toContain("Never use global `pgrep`, `pkill`");
    expect(playbook).toContain("verify_herdr_pane_receipt");
    expect(playbook).toContain("verify_herdr_agent_receipt");
    expect(playbook).toContain("verify_herdr_generic_process_receipt");
    expect(playbook).toContain("close_herdr_job_tab_if_owned");
    const closeHelper = playbook.match(/close_herdr_job_tab_if_owned\(\) \{[\s\S]*?\n\}/)?.[0];
    expect(closeHelper).toContain("verify_herdr_agent_receipt");
    expect(closeHelper).toContain("verify_herdr_unclaimed_pane_receipt");
    expect(closeHelper).toContain("verify_herdr_generic_process_receipt");
    expect(playbook).toContain('herdr agent get "$expected_agent_target"');
    expect(playbook).toContain(
      'verify_herdr_agent_receipt "$ROOT_PANE" codex "$CODEX_AGENT" "$CODEX_SESSION_ID"',
    );
    expect(playbook).toContain('verify_herdr_unclaimed_pane_receipt "$ROOT_PANE" || exit 1');
    expect(playbook).toContain(
      'verify_herdr_agent_receipt "$PANE_ID" "$AGENT_KIND" "$AGENT_TARGET" "$AGENT_SESSION_ID" || exit 1',
    );
    expect(playbook).toContain('"$PI_PANE" pi "$PI_AGENT" "$PI_SESSION_ID"');
    expect(playbook.match(/herdr tab close \"\$TAB_ID\"/g)).toHaveLength(1);
    expect(read("README.md")).toContain("does not install the `pi` executable");
  });

  test("installed skill commands resolve through their skill roots", () => {
    const auditSkill = read("skills", "auditing-context-contracts", "SKILL.md");
    const goalContract = read("skills", "control-room-goals", "references", "execution-contract.md");

    expect(auditSkill).toContain('bun "$SKILL_DIR/scripts/scan-context-contracts.ts"');
    expect(goalContract).not.toContain('$PWD/.agent-state/model-pilots');
    expect(goalContract).not.toContain('.agent-state/model-pilots');
    expect(goalContract).not.toContain('pilot-record.ts');
  });

  test("all generic command wrappers avoid source-checkout fallback paths", () => {
    const commandFiles = filesUnder(join(repoRoot, "commands"), ".md");
    expect(commandFiles.length).toBe(21);

    for (const file of commandFiles) {
      const command = readFileSync(file, "utf8");
      expect(command).toContain("current agent's configured skills root");
      expect(command).not.toMatch(/`skills\/[a-z0-9-]+\/SKILL\.md`/);
      expect(command).not.toContain("skills/direct-cli/playbook.md");
    }
  });

  test("project script help reports its installed absolute path", () => {
    const scriptNames = [
      "create.ts",
      "history.ts",
      "incubate.ts",
      "learn.ts",
      "offload.ts",
      "resolve-slug.ts",
      "reunion.ts",
      "search.ts",
      "spinoff.ts",
    ];

    for (const scriptName of scriptNames) {
      const scriptPath = join(repoRoot, "skills", "project", "scripts", scriptName);
      const result = Bun.spawnSync(["bun", scriptPath], {
        cwd: repoRoot,
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = `${result.stdout.toString()}${result.stderr.toString()}`;
      expect(output).toContain(`Usage: bun "${scriptPath}"`);
      expect(output).not.toContain("bun skills/project/scripts/");
    }
  });
});
