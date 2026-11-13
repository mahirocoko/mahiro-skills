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
  test("versioned install examples match the package release version", () => {
    const { version } = JSON.parse(read("package.json"));
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    for (const file of ["README.md", "install.sh"]) {
      const tags = [...read(file).matchAll(/--version\s+(v\d+\.\d+\.\d+)/g)]
        .map((match) => match[1]);
      expect(tags.length).toBeGreaterThan(0);
      expect([...new Set(tags)]).toEqual([`v${version}`]);
    }
  });

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

  test("direct-cli keeps volatile routing in one owner", () => {
    const skill = read("skills", "direct-cli", "SKILL.md");
    const readme = read("skills", "direct-cli", "README.md");
    const playbook = read("skills", "direct-cli", "playbook.md");
    const command = read("commands", "direct-cli.md");
    const activeSurfaces = [skill, readme, command].join("\n");
    const allDirectDocs = [activeSurfaces, playbook].join("\n");

    expect(skill).toContain("`playbook.md` is the single owner");
    expect(playbook).toContain("## Curated routing policy");
    expect(playbook).toContain("Cursor ordinary implementation / cleanup model: `composer-2.5`");
    expect(playbook).toContain("Cursor long-horizon agentic model: Grok 4.7 with `context=500k`, `effort=high`, and non-Fast by default");
    expect(playbook).toContain("stop on mismatch rather than falling back to 256K");
    expect(playbook).toContain("Cursor balanced Anthropic reasoning model: `claude-sonnet-5-5-high`");
    expect(playbook).toContain("Cursor Fable 5.1 reasoning model: `claude-fable-5-1-thinking-high`");
    expect(playbook).toContain("Cursor heavy Opus review model: `claude-opus-5-5-high`");
    expect(playbook).toContain("Codex balanced everyday model/effort: `gpt-6.1-sol` + `high`");
    expect(playbook).toContain("Codex deep/value escalation model/effort: `gpt-6.1-sol` + `max`");
    expect(playbook).toContain("Codex fast/cost-efficient model/effort: `gpt-6-luna` + `medium`");
    expect(playbook).not.toContain("Cursor heavy Opus review model: `claude-opus-5-thinking-high`");
    expect(playbook).not.toContain("Codex balanced everyday model/effort: `gpt-6-astra` + `medium`");
    expect(playbook).not.toContain("Codex balanced everyday model/effort: `gpt-6-sol` + `high`");
    expect(playbook).not.toContain("Codex balanced everyday model/effort: `gpt-6.1-sol` + `medium`");
    expect(playbook).not.toContain("claude-sonnet-5-thinking-high");
    expect(skill).toContain("Do not infer direct CLI model availability, effort semantics, or defaults");
    expect(playbook).not.toContain("Codex fast/cost-efficient model/effort: `gpt-5.6-luna` + `medium`");
    expect(playbook).not.toContain("Codex fallback model/effort: `gpt-5.6-sol` + `high`");
    expect(playbook).toContain("Do not offer a Fast-tier Cursor model in the default picker");
    expect(playbook).not.toContain("composer-2.5-fast");
    expect(playbook).not.toContain("cursor-grok-4.6-high");
    expect(playbook).not.toContain("claude-opus-4-8-thinking-high");
    expect(activeSurfaces).not.toMatch(/(?:composer-[0-9]|claude-(?:fable|opus|sonnet)-[0-9]|gemini-[0-9]|gpt-[0-9]|kimi-|grok-|glm-)/i);
    expect(activeSurfaces).not.toMatch(/--provider\s+(?!<provider>)\S+\s+--model\s+(?!<model>)\S+/);
    expect(allDirectDocs).not.toMatch(/Current Freshness Notes|Current freshness checkpoints/);
    expect(allDirectDocs).not.toMatch(/2026\.07\.23-e383d2b|agy 1\.1\.6|0\.144\.6|0\.145\.0|Pi `0\.83\.0`|global `pi` was not on `PATH`/);
    expect(skill).toContain("lane's cleanup receipt");
    for (const surface of [skill, readme, playbook, command]) {
      expect(surface).toContain("first_message.sent");
      expect(surface).toContain("--no-daemon");
      expect(surface).toContain("HC_TERMINAL_ID");
      expect(surface).toContain("herdr-core");
    }
    expect(skill).toContain("`hc` is canonical");
    expect(readme).not.toContain("Auto mode first requires Orca");
    expect(readme).toContain("Next legacy Herdr");
    expect(playbook).toContain("### Herdr lane lifecycle (legacy backend only)");
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
    expect(playbook.match(/herdr tab close \"\$TAB_ID\"/g)).toHaveLength(1);
    expect(read("README.md")).toContain("does not install the `pi` executable");
  });

  test("direct-cli gates first prompts on initialization rather than startup idle", () => {
    const playbook = read("skills", "direct-cli", "playbook.md");
    for (const surface of [
      read("skills", "direct-cli", "SKILL.md"),
      read("skills", "direct-cli", "README.md"),
      read("commands", "direct-cli.md"),
    ]) {
      expect(surface).toContain("First-prompt admission");
      expect(surface).toContain("startup idle/banner alone");
      expect(surface).toContain("stop without sending");
      expect(surface).toContain("ambiguous send");
      expect(surface).toContain("broken credentials");
    }
    const admission = playbook.split("## First-prompt admission")[1]?.split("## Backend contract")[0];
    expect(admission).toContain("requested model/effort and parent");
    expect(admission).toContain("Do not invent a universal ready event");
    expect(admission).toContain("60 seconds is a budget, not a required delay or proof");
    expect(admission).toContain("not an agent-readiness predicate");
    expect(admission).toContain("stop without sending");
    expect(admission).toContain("non-forced delivery");
    expect(admission).toContain("first_message.sent");
    expect(admission).toContain("not a guarantee that every CLI subsystem is initialized");
    expect(admission).toContain("do not use it to bypass this gate");
    expect(admission).toContain("Do not recommend logout, switch accounts, change auth/permissions or replay an ambiguous send");
    expect(admission).toContain("No runtime fix is established by this guidance alone");
    const hc = playbook.split("### HC lane lifecycle")[1]?.split("### Orca lane lifecycle")[0];
    expect(hc).toContain('wait "$LANE_ADDRESS" --timeout 60 --json');
    expect(hc).toContain('read "$LANE_ADDRESS" --lines 0 --json');
    expect(hc).toContain("Stop here unless the admission gate is satisfied");
    expect(hc).toContain('send --if idle "$LANE_ADDRESS" "$TASK" --json');
    const agy = playbook.split("## Antigravity CLI direct playbook")[1]?.split("### Model selection")[0];
    expect(agy).toContain("Complete **First-prompt admission** before running the separate task-delivery command");
    expect(agy).not.toMatch(/capture-pane[^\n]*\ntmux send-keys/);
    for (const block of playbook.matchAll(/```bash\n([\s\S]*?)\n```/g)) {
      // Launch/inspection and first task delivery must not be one runnable block.
      expect(block[1]).not.toMatch(/capture-pane[^\n]*\ntmux send-keys[^\n]*'Continue from/);
      expect(block[1]).not.toMatch(/herdr agent read[^\n]*\nherdr agent prompt/);
      expect(block[1]).not.toContain('--prompt-interactive "$(cat');
    }
    const multiline = playbook.split("### Antigravity multiline prompt caveat")[1]?.split("### Sandbox verification")[0];
    expect(multiline).toContain("otherwise stop without sending the inline task");
    expect(multiline).toContain("Post-launch `pane read` or a matching banner cannot retroactively admit it");
    expect(multiline).toContain("prompt referring to the scoped prompt file");
    expect(playbook).not.toContain("verified interactive initial-prompt exception");
    expect(playbook).toContain("require the multiline section's documented and proven pre-delivery admission");
    expect(playbook).toContain("an observed transition of a startup/loading indicator to normal task input");
  });

  test("direct-cli keeps model choices and selected route defaults explicit", () => {
    const playbook = read("skills", "direct-cli", "playbook.md");
    const policy = playbook.split("### Model selection rule")[1]
      ?.split("## Launch examples")[0] ?? "";
    const preferred = playbook.split("### Preferred roles")[1]
      ?.split("### Model selection rule")[0] ?? "";

    for (const model of ["claude-fable-5-2-high", "claude-fable-5-2-xhigh"]) {
      expect(policy).toContain(`\`${model}\` — opt-in`);
      expect(preferred).not.toContain(model);
    }
    expect(policy).not.toContain("claude-fable-5-2-thinking");
    expect(policy).toContain("do not silently replace an explicit 5.1 request with 5.2");
    expect(policy).toContain("NO ZDR");
    expect(policy).toContain("if the task requires zero data retention, stop");
    for (const family of ["carbon", "hydrogen"]) {
      for (const effort of ["low", "medium", "high"]) {
        expect(policy).toContain(`\`gemini-4-${family}-${effort}\``);
      }
    }
    expect(policy).toContain("`gemini-4-hydrogen-xhigh`");
    expect(policy).not.toContain("gemini-4-carbon-xhigh");
    for (const model of [
      "gemini-pro-orchestrator", "gemini-pro-orchestrator-argon",
      "gpt-oss-120b-medium", "gpt-6.1-terra", "gpt-6-sol",
    ]) {
      expect(policy).toContain(`\`${model}\``);
      expect(preferred).not.toContain(`\`${model}\``);
    }
    const codexExtras = policy.split("- Additional explicit Codex choices are")[1]
      ?.split("\n- If Astra")[0] ?? "";
    expect(codexExtras).toContain("`gpt-6.1-terra` and `gpt-6-sol`");
    expect(codexExtras).toContain("low/medium/high/xhigh/max/ultra");
    expect(codexExtras).toContain("catalog defaults low and medium respectively");
    expect(codexExtras).toContain("When either is requested without effort, ask for a supported model/effort pair");
    expect(policy).toContain("Do not assume orchestration behavior");
    for (const surface of [
      read("skills", "direct-cli", "SKILL.md"),
      read("skills", "direct-cli", "README.md"),
      read("commands", "direct-cli.md"),
    ]) {
      expect(surface).toContain("effort already encoded");
      expect(surface).toContain("When effort is neither encoded nor otherwise specified");
      expect(surface).toContain("If no role default is defined, ask for a supported effort rather than inheriting the catalog default");
    }
    for (const route of [
      "Cursor ordinary implementation / cleanup model: `composer-2.5`",
      "Cursor long-horizon agentic model: Grok 4.7 with `context=500k`, `effort=high`, and non-Fast by default",
      "Cursor balanced Anthropic reasoning model: `claude-sonnet-5-5-high`",
      "Cursor Fable 5.1 reasoning model: `claude-fable-5-1-thinking-high`",
      "Cursor Fable 5.1 extra-high reasoning model: `claude-fable-5-1-thinking-xhigh`",
      "Cursor heavy Opus review model: `claude-opus-5-5-high`",
      "Antigravity primary model for implementation / research / review: `gemini-4-hydrogen-high`",
      "Antigravity bounded easy-work model: `gemini-4-hydrogen-medium`",
      "Antigravity extra-reasoning model: `gemini-4-hydrogen-xhigh`",
      "Antigravity hard-blocker / architecture / difficult-debugging model: `gemini-4-carbon-high`",
      "Antigravity budget model: `gemini-3.8-flash-high`",
      "Codex flagship model/effort: `gpt-6-astra` + `high`",
      "Codex balanced everyday model/effort: `gpt-6.1-sol` + `high`",
      "Codex deep/value escalation model/effort: `gpt-6.1-sol` + `max`",
      "Codex fast/cost-efficient model/effort: `gpt-6-luna` + `medium`",
      "Codex automatic-delegation model/effort: `gpt-6-astra` + `ultra`",
      "Codex fallback model/effort: `gpt-6.1-sol` + `high`",
    ]) {
      expect(preferred).toContain(route);
    }
  });

  test("Agy stays Gemini-first with Anthropic alternatives only on request", () => {
    const playbook = read("skills", "direct-cli", "playbook.md");
    const picker = playbook.split("- If `/direct-cli agy ...` has no explicit model")[1]
      ?.split("- Keep Agy Gemini-first.")[0] ?? "";
    expect(picker).toContain("`gemini-4-hydrogen-high` — recommended primary");
    expect(picker).toContain("`gemini-4-hydrogen-medium` — bounded easy-work");
    expect(picker).toContain("`gemini-4-hydrogen-xhigh` — extra-reasoning");
    expect(picker).toContain("`gemini-4-carbon-high` — hard blockers");
    expect(picker).toContain("`gemini-3.8-flash-high`");
    expect(picker).not.toContain("claude-");
    expect(playbook).toContain("never silently fall back from Gemini to Anthropic");
    expect(playbook).toContain("ask before changing model family");
    expect(playbook).toContain("not evidence that Hydrogen outperforms Carbon");
    expect(playbook).not.toContain("Antigravity heavy review model: `claude-opus-5-5-high`");
    expect(playbook).not.toContain("Antigravity balanced model: `claude-sonnet-5-5-medium`");
    expect(playbook).toContain("tmux send-keys -t agy-task 'agy --model gemini-4-hydrogen-high");
    expect(playbook).toContain("If Mahiro explicitly requests an Anthropic alternative");
    expect(playbook).toContain("Use the curated Gemini-first Agy roles below");
    expect(playbook).toContain("Antigravity with Gemini for critique");
    expect(read("skills", "direct-cli", "SKILL.md")).not.toContain("agy-opus-review");
    for (const file of ["SKILL.md", "README.md"]) {
      expect(read("skills", "direct-cli", file)).toContain("Gemini-first");
    }
  });

  test("Agy benchmark-informed roles preserve deliberate model and effort selection", () => {
    const playbook = read("skills", "direct-cli", "playbook.md");
    const rationale = playbook.split("### Agy routing rationale")[1]
      ?.split("### Model selection rule")[0] ?? "";
    const availability = playbook.split("### Additional availability-only choices")[1]
      ?.split("## Launch examples")[0] ?? "";
    const agyRows = availability.split("\n").filter((line) => line.startsWith("| Agy"));

    expect(rationale).toContain("artificialanalysis.ai/models/gemini-4-hydrogen-high");
    expect(rationale).toContain("artificialanalysis.ai/models/gemini-4-carbon");
    expect(rationale).toContain("AA index-task estimates are not local Agy latency or subscription charges");
    expect(rationale).toContain("differ in harness or benchmark version");
    expect(rationale).toContain("Treat Flash as a budget option, not a measured speed winner");
    expect(rationale).toContain("Keep Argon optional");
    expect(rationale).toContain("do not change native CLI defaults");
    expect(playbook).toContain("do not lower effort for difficult reasoning by default");
    expect(playbook).toContain("not a mandatory sequential ladder or automatic retries");
    expect(playbook).toContain("Honor an explicitly pinned model/effort; never silently lower effort");
    expect(playbook).toContain("after High fails and the user approves lower effort");
    expect(playbook).not.toContain("Antigravity fast model:");
    expect(playbook).not.toContain("— faster scoped lane");
    expect(playbook).not.toContain("Offer `gemini-4-hydrogen-xhigh` only when extra effort is requested");
    expect(agyRows.join("\n")).not.toContain("`gemini-4-carbon-high`");
    expect(agyRows.join("\n")).not.toContain("`gemini-4-hydrogen-xhigh`");
    const agySelectionExample = playbook.split("## Antigravity CLI direct playbook")[1]
      ?.split("### Prompt template")[0] ?? "";
    expect(agySelectionExample).toContain("tmux send-keys -t agy-opus '/model' Enter");
    expect(agySelectionExample).not.toContain("tmux send-keys -t agy-task '/model'");
    expect(agySelectionExample).toContain("Reselect only the originally requested catalog-verified model/effort");
    expect(agySelectionExample).toContain("stop and report rather than choosing another curated role");
    for (const file of ["SKILL.md", "README.md"]) {
      expect(read("skills", "direct-cli", file)).toContain("benchmark-informed task roles");
    }
  });

  test("direct-cli maintenance updates installed executors before refreshing guidance", () => {
    const skill = read("skills", "direct-cli", "SKILL.md");
    const readme = read("skills", "direct-cli", "README.md");
    const playbook = read("skills", "direct-cli", "playbook.md");
    const maintenance = playbook.split("### Explicit CLI maintenance")[1]
      ?.split("### Safe discovery examples")[0] ?? "";

    for (const surface of [skill, readme, maintenance]) {
      expect(surface).toContain("For every human-requested direct-cli skill update");
      expect(surface).toContain("all three installed executor CLIs");
      expect(surface).toContain("before refreshing skill guidance");
      expect(surface).toContain("do not authorize or require explicit updaters");
      expect(surface).toContain("self-updat");
    }
    expect(maintenance).toContain("this document is not standing permission");
    expect(maintenance).toContain("`agent update`, then `agy update`, then `codex update`, serially");
    expect(maintenance).toContain("rather than installing missing CLIs or changing install ownership");
    expect(maintenance).toContain("Never interrupt running user sessions");
    expect(maintenance).toContain("Recheck each binary path/version/help and catalog");
    expect(maintenance).toContain("updater succeeded with unchanged version");
    expect(maintenance).toContain("Report incomplete maintenance explicitly");
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
    expect(commandFiles.length).toBe(26);

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
