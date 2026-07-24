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
    const selector = readRepoFile("skills", "direct-cli", "scripts", "select-backend.sh");
    const jobs = readRepoFile("skills", "direct-cli", "scripts", "herdr-jobs.py");
    const command = readRepoFile("commands", "direct-cli.md");
    const geminiCommand = readRepoFile("commands-gemini", "mh-direct-cli.toml");
    const rootReadme = readRepoFile("README.md");

    expect(skill).toContain("## Multi-pane Job Sessions");
    expect(skill).toContain("## Backend Selection");
    expect(skill).toContain("`--backend auto|herdr|tmux`");
    expect(skill).toContain("`HERDR_ENV=1`");
    expect(skill).toContain("`HERDR_PANE_ID`");
    expect(skill).toContain("`herdr status --json`");
    expect(skill).toContain("Never silently change backends after creating a tab, pane, or tmux session");
    expect(skill).toContain("Never run `herdr integration install` without explicit user approval");
    expect(skill).toContain("Do not hard-code a Herdr protocol number");
    expect(skill).toContain("`herdr agent start`");
    expect(skill).toContain("`herdr agent prompt`");
    expect(skill).toContain("same-prompt fanout");
    expect(skill).toContain("scripts/prompt-fanout.py");
    expect(skill).toContain("do not call `agent wait` against the old idle state");
    expect(skill).toContain("## Detached Herdr Jobs");
    expect(skill).toContain("scripts/herdr-jobs.py");
    expect(skill).toContain("reject `--backend tmux --detach`");
    expect(skill).toContain("does not inject a new message into the current Letta conversation");
    expect(skill).toContain("never prompt, result, or failure-summary text");
    expect(skill).toContain("reconcile a missing or mismatched watcher process");
    expect(skill).toContain("tmux load-buffer");
    expect(skill).toContain("one writer per file/asset contract");
    expect(skill).toContain("Sandbox verification");
    expect(skill).toContain("Antigravity newline caveat");
    expect(skill).toContain("--prompt-interactive");
    expect(skill).toContain("claude-fable-5-thinking-high");
    expect(skill).toContain("Use exact model IDs, not display shorthand");
    expect(skill).toContain("`gpt-5.6-sol` high");
    expect(skill).toContain("`gpt-5.6-terra` medium");
    expect(skill).toContain("`gpt-5.6-luna` medium");
    expect(skill).toContain("`gpt-5.6-sol` ultra");
    expect(skill).toContain("`claude-sonnet-5-thinking-high`");
    expect(skill).toContain("`claude-fable-5-thinking-xhigh`");
    expect(skill).toContain("`claude-opus-4-6-thinking` for heavy review/reasoning");
    expect(skill).toContain("`claude-sonnet-4-6`");
    expect(skill).toContain("`gemini-3.6-flash-high`");
    expect(skill).toContain("`gemini-3.6-flash-medium`");
    expect(skill).toContain("`gemini-3.5-flash-medium` as ordered automatic fallbacks");
    expect(skill).toContain("`gpt-5.3-codex-spark` high");
    expect(skill).toContain("`codex debug models`");
    expect(skill).toContain("pass native `agy --effort <level>` only after the selected model is known to support it");
    expect(skill).toContain("silently falls back to the default model");
    expect(skill).toContain("model_reasoning_effort");
    expect(skill).toContain("Codex itself does not expose a `--effort` flag");
    expect(skill).toContain("Never infer `ultra`");
    expect(skill).toContain("2026.07.20-8cc9c0b");
    expect(skill).toContain("Antigravity is `agy 1.1.6`");
    expect(skill).toContain("explicit `gemini-3.5-flash-high`");
    expect(skill).toContain("Codex CLI and npm stable updated from `0.144.6` to `0.145.0`");
    expect(skill).toContain("272,000-token context");
    expect(skill).not.toContain("gpt-5.3-codex-high");
    expect(skill).not.toContain("gpt-5.3-codex-high-fast");
    expect(skill).not.toContain("Gemini CLI");
    expect(skill).not.toContain("/direct-cli gemini");
    expect(skill).not.toContain("gemini --help");

    expect(playbook).toContain("## Multi-pane job sessions");
    expect(playbook).toContain("## Backend contract");
    expect(playbook).toContain("scripts/select-backend.sh");
    expect(selector).toContain('herdr pane get "$HERDR_PANE_ID"');
    expect(selector).toContain("no usable backend");
    expect(jobs).toContain('f"Job finished with status: {status}"');
    expect(jobs).not.toContain('f"{status}: {summary}"');
    expect(jobs).toContain("reconcile_job");
    expect(playbook).toContain("One job maps to one `direct-<job-slug>` tab");
    expect(playbook).toContain('herdr agent start "$CODEX_AGENT"');
    expect(playbook).toContain('herdr agent wait "$CODEX_AGENT"');
    expect(playbook).toContain('CODEX_AGENT="d${PANE_HASH}c"');
    expect(playbook).toContain("requested.isdisjoint(active)");
    expect(playbook).toContain("agent_name_taken");
    expect(playbook).toContain("wait_for_herdr_shell");
    expect(playbook).toContain("DIRECT_CLI_SHELL_READY_");
    expect(playbook).toContain("herdr pane process-info --pane");
    expect(playbook).toContain("agent_pane_busy");
    expect(playbook).toContain("Running inside Herdr with `--backend tmux` intentionally creates a nested multiplexer");
    expect(playbook).toContain("byte-identical input at the Herdr CLI argument boundary");
    expect(playbook).toContain("A naive `agent prompt` followed immediately by `agent wait` is unsafe");
    expect(playbook).toContain("### Detached Herdr jobs");
    expect(playbook).toContain("list --json");
    expect(playbook).toContain("collect \"$JOB_ID\"");
    expect(playbook).toContain("Role fanout");
    expect(playbook).toContain("Same-prompt fanout");
    expect(playbook).toContain("Send byte-identical prompt content to every pane.");
    expect(playbook).toContain("Main agent owns final merge/synthesis into the real worktree.");
    expect(playbook).toContain("Antigravity multiline prompt caveat");
    expect(playbook).toContain("agy --model claude-opus-4-6-thinking --dangerously-skip-permissions");
    expect(playbook).toContain("`claude-sonnet-4-6`");
    expect(playbook).toContain("`gemini-3.6-flash-high`");
    expect(playbook).toContain("`gemini-3.6-flash-medium`");
    expect(playbook).toContain("`gemini-3.5-flash-medium` remain ordered automatic fallbacks");
    expect(playbook).toContain("catalog-listed `gemini-3.1-pro-high` previously reported it was no longer available");
    expect(playbook).toContain("`codex debug models`");
    expect(playbook).toContain("Cursor Fable 5 reasoning model");
    expect(playbook).toContain("agent --model \"claude-fable-5-thinking-high\" --yolo --approve-mcps");
    expect(playbook).toContain('codex --model "gpt-5.6-sol" -c model_reasoning_effort=high');
    expect(playbook).toContain('codex --model "gpt-5.6-sol" -c model_reasoning_effort=ultra');
    expect(playbook).toContain("Luna exposes low through max and must not be launched with ultra");
    expect(playbook).toContain("`gpt-5.3-codex-spark` + `high`");
    expect(playbook).toContain("Codex CLI: local and npm stable updated from `0.144.6` to `0.145.0`");
    expect(playbook).not.toContain("gpt-5.3-codex-high");
    expect(playbook).not.toContain("gpt-5.3-codex-high-fast");
    expect(playbook).not.toContain("Gemini CLI");
    expect(playbook).not.toContain("gemini-task");
    expect(playbook).not.toContain("gemini --help");

    expect(readme).toContain("same-prompt fanout");
    expect(readme).toContain("`--backend auto`");
    expect(readme).toContain("`--backend herdr`");
    expect(readme).toContain("`--backend tmux`");
    expect(readme).toContain("binary presence alone is not enough");
    expect(readme).toContain("matching SHA-256 hashes across three pane captures");
    expect(readme).toContain("Agy specifically");
    expect(readme).toContain("Cursor Fable 5 reasoning uses `claude-fable-5-thinking-high`");
    expect(readme).toContain("`claude-fable-5-thinking-xhigh` for heavier review");
    expect(readme).toContain("`claude-sonnet-5-thinking-high` stays opt-in");
    expect(readme).toContain("`claude-opus-4-6-thinking` for heavy review");
    expect(readme).toContain("`claude-sonnet-4-6` for balanced work");
    expect(readme).toContain("`codex debug models`");
    expect(readme).toContain("`gpt-5.6-sol` with high reasoning");
    expect(readme).toContain("`gpt-5.6-sol` ultra");
    expect(readme).toContain("`gpt-5.3-codex-spark` high");
    expect(readme).not.toContain("Gemini CLI");
    expect(readme).not.toContain("/direct-cli gemini");

    for (const wrapper of [command, geminiCommand]) {
      expect(wrapper).toContain("`--backend auto|herdr|tmux`");
      expect(wrapper).toContain("`--workspace ID`");
      expect(wrapper).toContain("`--detach`");
      expect(wrapper).toContain("Reject tmux detach");
      expect(wrapper).toContain("never silently switch after creating state");
      expect(wrapper).toContain("`claude-opus-4-6-thinking`");
      expect(wrapper).toContain("`claude-sonnet-4-6`");
      expect(wrapper).toContain("`gemini-3.6-flash-high`");
      expect(wrapper).toContain("`gemini-3.6-flash-medium`");
      expect(wrapper).toContain("`gemini-3.5-flash-medium` fallback");
      expect(wrapper).toContain("`claude-sonnet-5-thinking-high`");
      expect(wrapper).toContain("`claude-fable-5-thinking-xhigh`");
      expect(wrapper).toContain("`gpt-5.3-codex-spark` high");
      expect(wrapper).toContain("`codex debug models`");
      expect(wrapper).toContain("reject any fallback warning or visible model mismatch");
      expect(wrapper).not.toContain("Antigravity `Claude Opus 4.6 (Thinking)`");
    }

    expect(rootReadme).toContain("foreground-verified stable `--model` slugs");
    expect(rootReadme).toContain("auto-selected Herdr/tmux backends");
    expect(rootReadme).toContain("Auto uses Herdr only from a healthy compatible managed pane");
    expect(rootReadme).toContain("reject fallback warnings/model mismatches");
    expect(rootReadme).not.toContain("For Agy, prefer exact `--model` labels");
  });

  test("codex asset production delegates model policy without nested ultra fanout", () => {
    const skill = readRepoFile("skills", "codex-asset-production", "SKILL.md");

    expect(skill).toContain("Resolve each Codex lane's current model/effort through `direct-cli`");
    expect(skill).toContain("do not invent effort-suffixed slugs");
    expect(skill).toContain("Treat Codex `ultra` as a job-level automatic-delegation choice");
    expect(skill).toContain("Do not combine several manual Codex panes with ultra in every pane");
    expect(skill).toContain("Propagate the owning workflow's source requirement unchanged");
    expect(skill).toContain("hash-bound provider receipt");
    expect(skill).toContain("do not let later dicut, manifest, or mechanical QA upgrade it");
    expect(skill).toContain("source-ready-normalization-required");
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
    expect(skill).toContain("the agent owns applying the goal");
    expect(skill).toContain("Do not ask Mahiro to\nrun a slash command");
    expect(skill).toContain("mh_get_goal");
    expect(skill).toContain("mh_create_goal");
    expect(skill).toContain("mh_update_goal");
    expect(skill).toContain('"owner": "human"');
    expect(skill).toContain("replace: true");
    expect(skill).toContain("expected_revision");
    expect(skill).toContain("Add evidence before `claim_criterion`");
    expect(skill).toContain("Mahiro verifies it through `/mh-goal verify");
    expect(skill).toContain("the agent should call that tool itself after approval");
    expect(skill).toContain("Goal Mode owns objective truth");
    expect(skill).toContain("Execution Run is optional coordination for complex external lanes");
    expect(skill).toContain("Do not require it\n  for simple edits");
    expect(skill).toContain("A handed-off `code_evidence_intake` is caller metadata, not proof");
    expect(skill).toContain("Code Evidence owns fresh repository/check attribution");
    expect(skill).toContain("neither an\n  executor report nor a Code Evidence intake may auto-claim criteria");
    expect(skill).toContain("Official Goal Mode is not installed by default");
    expect(skill).toContain("Do not reinstall the official package merely to satisfy this skill");
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
    expect(command).toContain("Drafts, applies, or refines Goal Mode objectives");
    expect(geminiCommand).toContain("Drafts, applies, or refines Goal Mode objectives");
    expect(index).toContain("Goal Mode objective/DoD/next-action drafting and agent-owned application workflow");
    expect(index).toContain("optional Execution Run and explicit Code Evidence attachment boundaries");
    expect(index).not.toContain("legacy skill name");
  });
});
