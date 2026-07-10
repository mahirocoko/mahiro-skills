import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

function readRepoFile(...segments: string[]) {
  return readFileSync(join(import.meta.dir, "..", ...segments), "utf8");
}

describe("skill pattern adaptation phase a", () => {
  test("documents the shared Mahiro skill-writing standard", () => {
    const standard = readRepoFile("docs", "authoring", "skill-pattern-adaptation-phase-a.md");

    expect(standard).toContain("trigger-aware descriptions");
    expect(standard).toContain("phase gates");
    expect(standard).toContain("stop gates");
    expect(standard).toContain("output contracts");
    expect(standard).toContain("adversarial or self-check pass");
    expect(standard).toContain("Do not copy whole external skills as the default move");
  });

  test("updates the skill template with reusable contract sections", () => {
    const template = readRepoFile("template", "SKILL.md");

    expect(template).toContain("Trigger-Focused Frontmatter");
    expect(template).toContain("Scope and Boundaries");
    expect(template).toContain("Phase Workflow");
    expect(template).toContain("Stop Gates");
    expect(template).toContain("Output Contract");
    expect(template).toContain("Validation / Self-check");
  });

  test("pilot orientation skills expose gates and output contracts", () => {
    const recap = readRepoFile("skills", "recap", "SKILL.md");
    const rrr = readRepoFile("skills", "rrr", "SKILL.md");
    const forward = readRepoFile("skills", "forward", "SKILL.md");

    expect(recap).toContain("## Stop Gates");
    expect(recap).toContain("## Evidence Self-check");

    expect(rrr).toContain("## Mode Gates");
    expect(rrr).toContain("## Output Contract");

    expect(forward).toContain("## Approval Gates");
    expect(forward).toContain("## Verification / Self-check");
  });

  test("forward commit/push gates avoid ignored local-state commits", () => {
    const forward = readRepoFile("skills", "forward", "SKILL.md");

    expect(forward).toContain("asks before any commit or push");
    expect(forward).toContain("Do not force-add ignored `.agent-state` files.");
    expect(forward).toContain("/forward --only` creates the handoff only. Do not commit, push, or enter planning flow.");
    expect(forward).toContain("if the handoff lives under ignored `.agent-state`, do not force-add it");
  });

  test("rrr labels missing pulse evidence instead of dropping it silently", () => {
    const rrr = readRepoFile("skills", "rrr", "SKILL.md");

    expect(rrr).toContain("label the missing source");
    expect(rrr).toContain("mention the missing pulse source in the final response");
    expect(rrr).not.toContain("skip silently and continue the retrospective");
  });

  test("mahiro-guidance-refine preserves feedback as approved guidance proposals", () => {
    const skill = readRepoFile("skills", "mahiro-guidance-refine", "SKILL.md");

    expect(skill).toContain("## Use When");
    expect(skill).toContain("## Evidence Taxonomy");
    expect(skill).toContain("## Durable vs Transient");
    expect(skill).toContain("## Proposal Workflow");
    expect(skill).toContain("## Approval Gate");
    expect(skill).toContain("## Integration With Related Skills");
    expect(skill).toContain("## Scope Classifier");
    expect(skill).toContain("No silent durable edits.");
    expect(skill).toContain("Do not promote a single correction into global doctrine unless the user explicitly asks for global behavior.");
    expect(skill).toContain("Use the scope classifier to avoid turning a repo-specific mechanism into global doctrine.");
  });

  test("mahiro-style blocks cross-repo convention transplant", () => {
    const overview = readRepoFile("skills", "mahiro-style", "foundations", "overview.md");
    const bestPractices = readRepoFile("skills", "mahiro-style", "patterns", "best-practices.md");
    const sharedUi = readRepoFile("skills", "mahiro-style", "patterns", "shared-ui-boundaries.md");
    const constantsI18n = readRepoFile("skills", "mahiro-style", "patterns", "constants-i18n.md");

    expect(overview).toContain("Never transplant a convention from one Mahiro repo into another");
    expect(bestPractices).toContain("Do not copy file placement, state boundaries, primitive APIs, i18n posture, or test commands from another Mahiro repo");
    expect(sharedUi).toContain("Let reusable primitives own their shell contract");
    expect(constantsI18n).toContain("Preserve the repo's source-locale reality before changing copy");
  });

  test("mahiro-docs-rules-init reinforces repo-local search and cross-repo guards", () => {
    const skill = readRepoFile("skills", "mahiro-docs-rules-init", "SKILL.md");
    const generationRules = readRepoFile("skills", "mahiro-docs-rules-init", "resources", "generation-rules.md");
    const agentsTemplate = readRepoFile("skills", "mahiro-docs-rules-init", "templates", "AGENTS.md");

    expect(skill).toContain("Do not import mechanics from another Mahiro repo as current fact.");
    expect(skill).toContain("Prefer `ccc search` / `ccc search --refresh` when CocoIndex is available");
    expect(generationRules).toContain("Never transplant mechanics from another Mahiro repo into `Current Reality`");
    expect(generationRules).toContain("If the target repo has CocoIndex/`ccc` guidance or `.cocoindex_code/`");
    expect(agentsTemplate).toContain("## Codebase Search");
    expect(agentsTemplate).toContain("Do not copy package manager, i18n, primitive, service, state, or test-command conventions from another Mahiro repo");
  });

  test("direct-cli documents multi-pane fanout and write policy", () => {
    const skill = readRepoFile("skills", "direct-cli", "SKILL.md");
    const playbook = readRepoFile("skills", "direct-cli", "playbook.md");
    const readme = readRepoFile("skills", "direct-cli", "README.md");

    expect(skill).toContain("## Multi-pane Job Sessions");
    expect(skill).toContain("same-prompt fanout");
    expect(skill).toContain("tmux load-buffer");
    expect(skill).toContain("one writer per file/asset contract");
    expect(skill).toContain("Sandbox verification");
    expect(skill).toContain("Antigravity newline caveat");
    expect(skill).toContain("--prompt-interactive");
    expect(skill).toContain("claude-fable-5-thinking-high");
    expect(skill).toContain("Use the exact model ID, not the display shorthand");
    expect(skill).toContain("`gpt-5.6-sol` high");
    expect(skill).toContain("`gpt-5.6-terra` medium");
    expect(skill).toContain("`gpt-5.6-luna` medium");
    expect(skill).toContain("`gpt-5.6-sol` ultra");
    expect(skill).toContain("model_reasoning_effort");
    expect(skill).toContain("Codex itself does not expose a `--effort` flag");
    expect(skill).toContain("Never infer `ultra`");
    expect(skill).not.toContain("gpt-5.3-codex-high");
    expect(skill).not.toContain("gpt-5.3-codex-high-fast");
    expect(skill).not.toContain("Gemini CLI");
    expect(skill).not.toContain("/direct-cli gemini");
    expect(skill).not.toContain("gemini --help");

    expect(playbook).toContain("## Multi-pane job sessions");
    expect(playbook).toContain("Role fanout");
    expect(playbook).toContain("Same-prompt fanout");
    expect(playbook).toContain("Send byte-identical prompt content to every pane.");
    expect(playbook).toContain("Main agent owns final merge/synthesis into the real worktree.");
    expect(playbook).toContain("Antigravity multiline prompt caveat");
    expect(playbook).toContain("agy --model \"Claude Opus 4.6 (Thinking)\"");
    expect(playbook).toContain("Cursor Fable 5 reasoning model");
    expect(playbook).toContain("agent --model \"claude-fable-5-thinking-high\" --yolo --approve-mcps");
    expect(playbook).toContain('codex --model "gpt-5.6-sol" -c model_reasoning_effort=high');
    expect(playbook).toContain('codex --model "gpt-5.6-sol" -c model_reasoning_effort=ultra');
    expect(playbook).toContain("Luna exposes low through max and must not be launched with ultra");
    expect(playbook).not.toContain("gpt-5.3-codex-high");
    expect(playbook).not.toContain("gpt-5.3-codex-high-fast");
    expect(playbook).not.toContain("Gemini CLI");
    expect(playbook).not.toContain("gemini-task");
    expect(playbook).not.toContain("gemini --help");

    expect(readme).toContain("same-prompt fanout");
    expect(readme).toContain("matching SHA-256 hashes across three pane captures");
    expect(readme).toContain("Agy specifically");
    expect(readme).toContain("Cursor Fable 5 reasoning uses `claude-fable-5-thinking-high`");
    expect(readme).toContain("`gpt-5.6-sol` with high reasoning");
    expect(readme).toContain("`gpt-5.6-sol` ultra");
    expect(readme).not.toContain("Gemini CLI");
    expect(readme).not.toContain("/direct-cli gemini");
  });

  test("codex asset production delegates model policy without nested ultra fanout", () => {
    const skill = readRepoFile("skills", "codex-asset-production", "SKILL.md");

    expect(skill).toContain("Resolve each Codex lane's current model/effort through `direct-cli`");
    expect(skill).toContain("do not invent effort-suffixed slugs");
    expect(skill).toContain("Treat Codex `ultra` as a job-level automatic-delegation choice");
    expect(skill).toContain("Do not combine several manual Codex panes with ultra in every pane");
  });

  test("uncodixify preserves native model taste before evidence-triggered audit", () => {
    const skill = readRepoFile("skills", "uncodixify", "SKILL.md");
    const command = readRepoFile("commands", "uncodixify.md");
    const geminiCommand = readRepoFile("commands-gemini", "mh-uncodixify.toml");
    const index = readRepoFile("skills", "llms.txt");

    expect(skill).toContain("Do not auto-load this skill for every frontend generation task");
    expect(skill).toContain("For native model-taste evaluation, including GPT-5.6 Sol experiments");
    expect(skill).toContain("Audit mode (default for review/drift triggers)");
    expect(skill).toContain("Enforce mode");
    expect(skill).toContain("do not apply `uncodixify` before the first rendered pass");
    expect(command).toContain("Do not apply before the first rendered pass");
    expect(geminiCommand).toContain("Do not apply before the first rendered pass");
    expect(index).toContain("Skip before the first rendered pass when evaluating native model taste");
  });

  test("goal skill describes Goal Mode without old cockpit references", () => {
    const skill = readRepoFile("skills", "control-room-goals", "SKILL.md");
    const command = readRepoFile("commands", "control-room-goals.md");
    const geminiCommand = readRepoFile("commands-gemini", "mh-control-room-goals.toml");
    const index = readRepoFile("skills", "llms.txt");

    expect(skill).toContain("# Goal Mode");
    expect(skill).toContain("Use Goal Mode as lightweight conversation-scoped objective management");
    expect(skill).toContain("Proposed Goal Mode:");
    expect(skill).toContain("/goal Build and verify");
    expect(skill).toContain("/goal status");
    expect(skill).toContain("/goal pause` / `/goal resume");
    expect(skill).toContain("/goal complete");
    expect(skill).toContain("/goal clear");
    expect(skill).toContain("CreateGoal");
    expect(skill).toContain("UpdateGoal");
    expect(skill).toContain("mark complete or blocked only");
    expect(skill).not.toContain("Control Room");
    expect(skill).not.toContain("legacy");
    expect(skill).not.toContain("/cr");
    expect(skill).not.toContain("control_room_");
    expect(command).toContain("Goal Mode objectives");
    expect(geminiCommand).toContain("Goal Mode objectives");
    expect(index).toContain("Goal Mode objective/DoD/next-action drafting workflow");
    expect(index).not.toContain("legacy skill name");
  });
});
