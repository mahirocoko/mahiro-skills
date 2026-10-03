import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import ts from "typescript";

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
    expect(standard).toContain("`rrr` — retrospective modes, optional gated non-canonical reference learnings, and derived pulse metrics");
    expect(standard).not.toContain("`rrr` — retrospective modes, durable notes");
  });

  test("updates the skill template with reusable contract sections", () => {
    const template = readRepoFile("template", "SKILL.md.template");

    expect(template).toContain("Trigger-Focused Frontmatter");
    expect(template).toContain("Operating Posture");
    expect(template).toContain("Scope and Handoffs");
    expect(template).toContain("Decision Sequence");
    expect(template).toContain("## Example");
    expect(template).toContain("Stop Gates");
    expect(template).toContain("Output Contract");
    expect(template).toContain("Validation / Self-check");
    expect(template).toContain("References and Resources");
    expect(template).toContain("human-readable-skill-writing.md");
  });

  test("documents the human-readable Phase B reader contract", () => {
    const guide = readRepoFile("docs", "authoring", "human-readable-skill-writing.md");
    const phaseA = readRepoFile("docs", "authoring", "skill-pattern-adaptation-phase-a.md");

    expect(guide).toContain("## The Two Readers");
    expect(guide).toContain("## State the Operating Posture");
    expect(guide).toContain("## Teach the Decision Sequence");
    expect(guide).toContain("## Explain the Why Where It Changes Behavior");
    expect(guide).toContain("## Use Examples as Teaching Tools");
    expect(guide).toContain("## Human Readability Review");
    expect(guide).toContain("## Make Shared Understanding Testable");
    expect(guide).toContain("## Separate Evidence From Authority");
    expect(guide).toContain("Intent");
    expect(guide).toContain("Trigger");
    expect(guide).toContain("Action");
    expect(guide).toContain("Boundary");
    expect(guide).toContain("Rationale");
    expect(guide).toContain("`Merge`, `Replace`, `Create`, or `No-op`");
    expect(guide).toContain("“No durable lesson” is a successful result");
    expect(guide).toContain("Do not rewrite the catalog for heading uniformity");
    expect(phaseA).toContain("Human-Readable Skill Writing — Phase B");
  });

  test("Phase B pilots teach their operating model without changing ownership", () => {
    const motion = readRepoFile("skills", "motion-design", "SKILL.md");
    const learn = readRepoFile("skills", "learn", "SKILL.md");

    for (const skill of [motion, learn]) {
      expect(skill).toContain("## Operating Posture");
    }

    expect(motion).toContain("### Example: choose the job before the curve");
    expect(motion).toContain("## Ownership Boundaries");
    expect(motion).toContain("## Bounded Workflow");
    expect(motion).toContain("## Motion Brief / Output Contract");
    expect(learn).toContain("## Scope and Handoffs");
    expect(learn).toContain("## Decision Sequence");
    expect(learn).toContain("## Output Contract");
    expect(learn).toContain("/project incubate");
    expect(learn).toContain("### 3. Review the documents and update `repo.md`");
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

  test("rrr keeps retrospectives historical and makes durable learning optional", () => {
    const rrr = readRepoFile("skills", "rrr", "SKILL.md");
    const deep = readRepoFile("skills", "rrr", "DEEP.md");
    const command = readRepoFile("commands", "rrr.md");
    const readme = readRepoFile("README.md");
    const index = readRepoFile("skills", "llms.txt");
    const fable = readRepoFile("skills", "fable", "SKILL.md");

    for (const contract of [rrr, deep]) {
      expect(contract).toContain("retrospective-only; no durable lesson promoted");
      expect(contract).toContain("reference learning captured; guidance promotion not performed");
      expect(contract).toContain("artifact: reference-learning");
      expect(contract).toContain("authority: non-canonical");
      expect(contract).toContain("status: candidate");
      expect(contract).toContain("Intent");
      expect(contract).toContain("Trigger");
      expect(contract).toContain("Action");
      expect(contract).toContain("Boundary");
      expect(contract).toContain("Rationale");
    }

    expect(rrr).toContain("## Artifact Authority and Learning Promotion");
    expect(rrr).toContain("A valid run may end as `retrospective-only; no durable lesson promoted`");
    expect(rrr).toContain("RRR never turns its own learning note into approved guidance.");
    expect(rrr).toContain("Reference learning: OPTIONAL");
    expect(rrr).not.toContain("A durable lesson note under");
    expect(rrr).not.toContain("Durable local learning note: REQUIRED");
    expect(deep).toContain("incident-only details that must not be promoted");
    expect(rrr).toContain("optionally capture a gated non-canonical reference learning");
    expect(command).toContain("optionally capture a gated non-canonical reference learning");
    expect(readme).toContain("optional gated non-canonical reference learning when a transferable decision exists");
    expect(index).toContain("Session retrospective with an optional gated non-canonical reference learning");
    expect(fable).toContain("`rrr` owns retrospectives and optional gated non-canonical reference learnings");
  });

  test("mahiro-guidance-refine preserves feedback as approved guidance proposals", () => {
    const skill = readRepoFile("skills", "mahiro-guidance-refine", "SKILL.md");

    expect(skill).toContain("## Use When");
    expect(skill).toContain("## Evidence Taxonomy");
    expect(skill).toContain("## Durable vs Transient");
    expect(skill).toContain("## Artifact Authority Model");
    expect(skill).toContain("## Promotion Gates");
    expect(skill).toContain("## Proposal Workflow");
    expect(skill).toContain("## Approval Gate");
    expect(skill).toContain("## Integration With Related Skills");
    expect(skill).toContain("## Scope Classifier");
    expect(skill).toContain("No silent durable edits.");
    expect(skill).toContain("Do not promote a single correction into global doctrine unless the user explicitly asks for global behavior.");
    expect(skill).toContain("Use the scope classifier to avoid turning a repo-specific mechanism into global doctrine.");
    expect(skill).toContain("Evidence that a mistake happened is not, by itself, evidence that the mistake deserves permanent context.");
    expect(skill).toContain("Intent");
    expect(skill).toContain("Trigger");
    expect(skill).toContain("Action");
    expect(skill).toContain("Boundary");
    expect(skill).toContain("Rationale");
    expect(skill).toContain("`Merge`, `Replace`, `Create`, or `No-op`");
    expect(skill).toContain("Do not preserve absent concepts merely to say they should be avoided.");
    expect(skill).toContain("“No durable lesson” is a valid and often preferable result.");
    expect(skill).toContain("one case where the contract applies and one adjacent case where it does not");
    expect(skill).toContain("**Owner decision**: Merge | Replace | Create | No-op");
    expect(skill).toContain("**Current owner**: ... | none");
    expect(skill).toContain("**Behavior checks**:");
    expect(skill).toContain("`rrr`** owns retrospectives and optional gated non-canonical reference learnings");
    expect(skill).not.toContain("`rrr`** owns retrospective and durable lesson notes");
  });

  test("guidance workflow shares one promotion and authority model", () => {
    const workflow = readRepoFile("docs", "authoring", "mahiro-docs-rules-init-and-style-workflow.md");

    expect(workflow).toContain("## Shared Artifact and Authority Model");
    expect(workflow).toContain("A retrospective records history and is non-authoritative.");
    expect(workflow).toContain("A reference learning preserves candidate evidence and remains non-canonical.");
    expect(workflow).toContain("Approved durable guidance is the canonical behavioral contract");
    expect(workflow).toContain("`Intent`, `Trigger`, `Action`, `Boundary`, and `Rationale`");
    expect(workflow).toContain("one applies and one does-not-apply case");
    expect(workflow).toContain("`Merge`, `Replace`, `Create`, or `No-op`");
    expect(workflow).toContain("allowing a truthful no-guidance outcome");
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

  test("React fallback examples declare typed arrow components before public exports", () => {
    const examples = [
      { path: ["skills", "mahiro-style", "foundations", "code-style.md"], name: "UserCard" },
      { path: ["skills", "mahiro-style", "patterns", "components.md"], name: "StatusBadge" },
      { path: ["skills", "mahiro-style", "patterns", "components.md"], name: "ApprovalStatusCell" },
      { path: ["skills", "mahiro-style", "patterns", "components.md"], name: "DashboardMetricCard" },
      { path: ["skills", "mahiro-style", "patterns", "components.md"], name: "OrderSummarySection" },
      { path: ["skills", "mahiro-docs-rules-init", "templates", "patterns", "component-conventions.md"], name: "ProfileCard" },
      { path: ["skills", "mahiro-docs-rules-init", "templates", "code-style", "typescript.md"], name: "Button" },
    ];

    // Parse the teaching snippets, not merely the surrounding prose. These checks
    // establish source shape only, not runtime behavior or generated-doc quality.
    for (const example of examples) {
      const document = readRepoFile(...example.path).split("## Anti-Examples")[0];
      const blocks = [...document.matchAll(/```tsx\n([\s\S]*?)\n```/g)].map((match) => match[1]);
      const block = blocks.find((code) => code.includes(`const ${example.name} =`));
      expect(block).toBeDefined();
      if (!block) throw new Error(`Missing teaching example: ${example.name}`);

      const source = ts.createSourceFile("example.tsx", block, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const statement = source.statements.find((node): node is ts.VariableStatement =>
        ts.isVariableStatement(node) && node.declarationList.declarations.some((declaration) =>
          ts.isIdentifier(declaration.name) && declaration.name.text === example.name));
      expect(statement).toBeDefined();
      if (!statement) throw new Error(`Missing component declaration: ${example.name}`);
      expect(statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false).toBe(false);

      const declaration = statement.declarationList.declarations.find((node) =>
        ts.isIdentifier(node.name) && node.name.text === example.name);
      const initializer = declaration?.initializer;
      expect(initializer && ts.isArrowFunction(initializer)).toBe(true);
      if (!initializer || !ts.isArrowFunction(initializer)) throw new Error(`Expected arrow: ${example.name}`);
      const propsType = initializer.parameters[0]?.type;
      expect(propsType && ts.isTypeReferenceNode(propsType)).toBe(true);
      if (!propsType || !ts.isTypeReferenceNode(propsType)) throw new Error(`Missing props contract: ${example.name}`);
      const propsName = propsType.typeName.getText(source);
      expect(propsName).toMatch(/^I[A-Z].*Props$/);
      expect(source.statements.some((node) => ts.isInterfaceDeclaration(node) && node.name.text === propsName)).toBe(true);

      const publicExport = source.statements.find((node): node is ts.ExportDeclaration =>
        ts.isExportDeclaration(node) && !!node.exportClause && ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.some((element) => element.name.text === example.name));
      expect(publicExport).toBeDefined();
      expect(publicExport?.getStart(source) ?? -1).toBeGreaterThan(statement.end);
    }

    const components = readRepoFile("skills", "mahiro-style", "patterns", "components.md").split("## Anti-Examples")[0];
    expect(components).not.toMatch(/(?:bg-white|border-zinc-\d+|text-zinc-\d+|shadow-sm)/);
    const componentTemplate = readRepoFile("skills", "mahiro-docs-rules-init", "templates", "patterns", "component-conventions.md");
    const profileBlock = [...componentTemplate.matchAll(/```tsx\n([\s\S]*?)\n```/g)]
      .find((match) => match[1].includes("const ProfileCard ="))?.[1];
    expect(profileBlock).not.toContain("// _Memo");
    expect(profileBlock).not.toContain("useMemo");
  });

  test("fallback guidance preserves local winners and avoids automatic architecture", () => {
    const codeStyle = readRepoFile("skills", "mahiro-style", "foundations", "code-style.md");
    const componentTemplate = readRepoFile("skills", "mahiro-docs-rules-init", "templates", "patterns", "component-conventions.md");
    const typescriptTemplate = readRepoFile("skills", "mahiro-docs-rules-init", "templates", "code-style", "typescript.md");

    expect(codeStyle).toContain("When the repo is silent, prefer arrow functions");
    expect(codeStyle).toContain("`I` prefixes for app-owned interfaces");
    expect(codeStyle).toContain("leave type aliases unprefixed");
    expect(codeStyle).toContain("Utilities, constants, and hooks may use inline exports");
    expect(codeStyle).toContain("Framework-required syntax, generated code, and established local function conventions win first");
    expect(codeStyle).toContain("then rerun the relevant checks");
    expect(codeStyle).toContain("If no formatter is available, report that limitation");
    expect(componentTemplate).toContain("If the repo has established non-`I` or inline-export conventions, preserve them instead");
    expect(componentTemplate).toContain("Label that as preferred direction, not observed reality");
    expect(componentTemplate).toContain("do not force a new section or service layer");
    expect(typescriptTemplate).toContain("Preserve established inline exports, framework requirements, and generated code");
    expect(typescriptTemplate).toContain("Barrels are not a mandatory baseline");
    expect(typescriptTemplate).toContain("do not export every local type automatically");
    expect(componentTemplate).not.toContain("export const ProfileCard =");
    expect(typescriptTemplate).not.toContain("export const Button =");
  });

  test("frontend ownership and evidence gates do not grant redesign authority", () => {
    const sharedUi = readRepoFile("skills", "mahiro-style", "patterns", "shared-ui-boundaries.md");
    const review = readRepoFile("skills", "mahiro-style", "foundations", "review-checklist.md");

    expect(sharedUi).toContain("nearest accepted usage");
    expect(sharedUi).toContain("app-level CSS and theme overrides");
    expect(sharedUi).toContain("map a semantic class to its current rule");
    expect(sharedUi).toContain("An import or class name alone does not prove");
    expect(sharedUi).toContain("inspect the primitive for an injected chevron");
    expect(sharedUi).toContain("not a universal geometry mandate");
    expect(sharedUi).toContain("Do not create a token, variant, or primitive layer");

    for (const gate of ["Ownership", "Propagation", "Rendered correctness", "Human acceptance"]) {
      expect(review).toContain(`| ${gate} |`);
    }
    expect(review).toContain("Source tests do not prove runtime integration");
    expect(review).toContain("Computed styles do not prove visual coherence");
    expect(review).toContain("no lower gate substitutes for human acceptance");
    expect(review).toContain("not a whole-product PASS");
    expect(review).toContain("writer's self-check is not independent acceptance evidence");
    expect(review).toContain("`A → B → A` on one mounted consumer");
    expect(review).toContain("a closed screenshot does not establish the open state");
    expect(review).toContain("a build PASS alone cannot establish it");
    expect(review).toContain("after load and after interactions");
    expect(review).toContain("A named paint correction preserves geometry and content");
    expect(review).toContain("a content-only request does not authorize redesign");
    expect(review).toContain("must not disable controls");
    expect(review).toContain("a naming-only change with no runtime or visual effect");
  });

  test("docs-init carries frontend owners through inputs, generation, templates and checks", () => {
    const resource = (name: string) => readRepoFile("skills", "mahiro-docs-rules-init", "resources", name);
    const input = resource("input-manifest.md");
    const generation = resource("generation-rules.md");
    const checklist = resource("checklist.md");
    const styling = readRepoFile("skills", "mahiro-docs-rules-init", "templates", "styling.md");
    const agents = readRepoFile("skills", "mahiro-docs-rules-init", "templates", "AGENTS.md");

    expect(input).toContain("primitive source and public import surface");
    expect(input).toContain("browser/server runtime boundaries");
    expect(input).toContain("what was not executed during this init pass");
    expect(generation).toContain("Separate canonical source from generated/registry output");
    expect(generation).toContain("AGENTS links to those owners instead of duplicating");
    expect(styling).toContain("name the source path, a real consumer");
    expect(styling).toContain("Map documented semantic classes to real current rules");
    expect(agents).toContain("Include this subsection only when the repo proves a mixed browser/server runtime");
    expect(agents).toContain("Change canonical source rather than hand-editing generated output");
    expect(agents).toContain("paint-only correction does not reopen geometry or content");
    expect(checklist).toContain("source/generator and avoid recommending hand-edits");
    expect(checklist).toContain("component and TypeScript examples agree");

    // Explicit no-design-system and not-executed cases across the propagation chain.
    expect(input).toContain("For a static page without tokens, variants, or generated outputs, omit those layers");
    expect(generation).toContain("A small static page without a design system should not acquire");
    expect(styling).toContain("do not generate a fictional token or primitive system");
    expect(checklist).toContain("small static repo remain small");
    expect(generation).toContain("A command's existence is not an executed verification result");
    expect(styling).toContain("Distinguish an available command from a check executed");
    expect(agents).toContain("checks actually executed");
    expect(checklist).toContain("available commands distinguished from executed checks");
    expect(generation).toContain("Do not run dev servers or browsers for this initializer");
    expect(styling).toContain("Do not run a dev server or browser");
    expect(checklist).toContain("avoid dev/browser execution and invented QA commands");
  });

  test("mahiro-docs-rules-init teaches bounded source search without invented tooling", () => {
    const skill = readRepoFile("skills", "mahiro-docs-rules-init", "SKILL.md");
    const generationRules = readRepoFile("skills", "mahiro-docs-rules-init", "resources", "generation-rules.md");
    const agentsTemplate = readRepoFile("skills", "mahiro-docs-rules-init", "templates", "AGENTS.md");
    const readme = readRepoFile("skills", "mahiro-docs-rules-init", "README.md");
    const executionFlow = readRepoFile("skills", "mahiro-docs-rules-init", "resources", "execution-flow.md");
    const checklist = readRepoFile("skills", "mahiro-docs-rules-init", "resources", "checklist.md");
    const inputManifest = readRepoFile("skills", "mahiro-docs-rules-init", "resources", "input-manifest.md");
    const authoringWorkflow = readRepoFile("docs", "authoring", "mahiro-docs-rules-init-and-style-workflow.md");

    expect(skill).toContain("Do not import mechanics from another Mahiro repo as current fact.");
    expect(skill).toContain("Use local repo search only: start with filenames");
    expect(skill).toContain("without opening suspected secret contents");
    expect(generationRules).toContain("Never transplant mechanics from another Mahiro repo into `Current Reality`");
    expect(generationRules).toContain("Do not invent an index or external search service");
    expect(agentsTemplate).toContain("## Codebase Search");
    expect(agentsTemplate).toContain("An exact-string search establishes only literal coverage");
    expect(agentsTemplate).toContain("Do not copy package manager, i18n, primitive, service, state, or test-command conventions from another Mahiro repo");
    expect(authoringWorkflow).toContain("only search commands proven to work in the target repo");
    for (const contract of [skill, readme, generationRules, executionFlow, checklist, inputManifest]) {
      expect(contract).not.toContain("ccc search");
      expect(contract).not.toContain("cocoindex-rules-init");
    }
  });

  test("direct-cli documents multi-pane fanout and write policy", () => {
    const skill = readRepoFile("skills", "direct-cli", "SKILL.md");
    const playbook = readRepoFile("skills", "direct-cli", "playbook.md");
    const readme = readRepoFile("skills", "direct-cli", "README.md");
    const selector = readRepoFile("skills", "direct-cli", "scripts", "select-backend.sh");
    const jobs = readRepoFile("skills", "direct-cli", "scripts", "herdr-jobs.py");
    const command = readRepoFile("commands", "direct-cli.md");
    const rootReadme = readRepoFile("README.md");

    expect(skill).toContain("## Multi-pane Job Sessions");
    expect(skill).toContain("## Backend Selection");
    expect(skill).toContain("`--backend auto|orca|herdr|tmux`");
    expect(skill).toContain("`ORCA_TERMINAL_HANDLE`");
    expect(skill).toContain("`ORCA_WORKTREE_ID`");
    expect(skill).toContain("`ORCA_TAB_ID`");
    expect(skill).toContain("`ORCA_PANE_KEY`");
    expect(skill).toContain("`orca status --json`");
    expect(skill).toContain("`orca terminal show`");
    expect(skill).toContain("`orca worktree show`");
    expect(skill).toContain("Never require their IDs to match");
    expect(skill).toContain("`HERDR_ENV=1`");
    expect(skill).toContain("`HERDR_PANE_ID`");
    expect(skill).toContain("`herdr status --json`");
    expect(skill).toContain("Never silently change backends after creating a tab, pane, or tmux session");
    expect(skill).toContain("Never run `herdr integration install` without explicit user approval");
    expect(skill).toContain("Do not hard-code a Herdr protocol number");
    expect(skill).toContain("default to `--no-focus`");
    expect(skill).toContain("Treat `--focus` as an explicit opt-in");
    expect(playbook).toContain('TAB_FOCUS_FLAG="--no-focus"');
    expect(playbook).toContain('  "$TAB_FOCUS_FLAG")"');
    expect(playbook).toContain("The caller and target are separate receipts");
    expect(playbook).toContain('[ "$ORCA_JOB_WORKTREE" = "$ORCA_TARGET_WORKTREE" ]');
    expect(skill).toContain("`herdr agent start`");
    expect(skill).toContain("`herdr agent prompt`");
    expect(skill).toContain("same-prompt fanout");
    expect(skill).toContain("scripts/prompt-fanout.py");
    expect(skill).toContain("do not call `agent wait` against the old idle state");
    expect(skill).toContain("## Callback-Primary Herdr Jobs");
    expect(skill).toContain("scripts/herdr-jobs.py");
    expect(skill).toContain("`auto` selects callback only after");
    expect(skill).toContain("Callback mode launches a lightweight detached lifecycle guard");
    expect(skill).toContain("not the full result-capture watcher or a controller Monitor");
    expect(skill).toContain("one-shot silence deadline remains armed until parent acknowledgement");
    expect(skill).toContain("Do not arm a controller `Monitor` when `herdr-jobs.py start` reports `mode=callback`");
    expect(skill).toContain("must observe real `working` activity");
    expect(skill).toContain("continuously confirm a stable `idle`/`done` state");
    expect(skill).toContain("at most one metadata-only parent wake per job");
    expect(skill).toContain("Accepted transport suppresses an immediate duplicate guard wake but never finalizes the job");
    expect(skill).toContain("one atomic single-line metadata-only `pane.run`");
    expect(skill).toContain("accepted delivery is not receipt or proof");
    expect(skill).toContain("report_ready");
    expect(skill).toContain("reject `--backend orca --detach`");
    expect(skill).toContain("`--backend tmux --detach`");
    expect(skill).toContain("does not inject a new message into the current Letta conversation");
    expect(skill).toContain("herdr-jobs.py\" receive \"$JOB_ID\"");
    expect(skill).toContain("herdr-jobs.py\" retry \"$JOB_ID\"");
    expect(skill).toContain("herdr-jobs.py\" audit \"$JOB_ID\"");
    expect(skill).toContain("audit \"$JOB_ID\" --include-bodies");
    expect(skill).toContain("Idempotency keys are scoped to the exact sender");
    expect(skill).toContain("then run `recover`");
    expect(skill).toContain("from the exact parent only");
    expect(skill).toContain("first requires a fully dispatched `running` job");
    expect(skill).toContain("durable guard evidence that every target was observed `working`");
    expect(skill).toContain("exits with `recovery=deferred`");
    expect(skill).toContain("already has a final callback record");
    expect(skill).toContain("Do not launch `letta -p`");
    expect(skill).toContain("never prompt, body, result, or failure-summary text");
    expect(skill).toContain("not reconciled as failed merely because they have no full watcher");
    expect(skill).toContain("tmux load-buffer");
    expect(skill).toContain("one writer per file/asset contract");
    expect(skill).toContain("Multi-pane output collection is receipt-bound");
    expect(skill).toContain("This does not restrict multi-pane execution");
    expect(skill).toContain("globally newest file");
    expect(skill).toContain("exact provider-returned output identity");
    expect(skill).not.toContain("$CODEX_HOME/generated-images");
    expect(skill).toContain("Antigravity newline caveat");
    expect(skill).toContain("--prompt-interactive");
    expect(skill).toContain("`playbook.md` is the single owner of the curated role-to-model list");
    expect(skill).toContain("`codex debug models`");
    expect(skill).toContain("pass native `agy --effort <level>` only after the selected model is known to support it");
    expect(skill).toContain("silent default-model fallback");
    expect(skill).toContain("model_reasoning_effort");
    expect(skill).toContain("Codex itself does not expose a `--effort` flag");
    expect(skill).toContain("Never infer `ultra`");
    expect(skill).toContain("Cursor uses `--yolo --approve-mcps --trust`");
    expect(skill).toContain("Antigravity uses `--dangerously-skip-permissions`");
    expect(skill).toContain("Codex uses `--dangerously-bypass-approvals-and-sandbox`");
    expect(skill).toContain("Treat those autonomy flags as approval policy, not expanded scope");
    expect(command).toContain("Cursor `--yolo --approve-mcps --trust`");
    expect(command).toContain("Antigravity `--dangerously-skip-permissions`");
    expect(command).toContain("Codex `--dangerously-bypass-approvals-and-sandbox`");
    expect(command).not.toContain("Do not use `--dangerously-bypass-approvals-and-sandbox` by default");
    expect(skill).not.toContain("Current Freshness Notes");
    expect(skill).not.toContain("2026.07.23-e383d2b");
    expect(skill).not.toContain("`kimi-k3-high`");
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
    expect(jobs).toContain("CALLBACK_SCHEMA");
    expect(jobs).toContain("MAX_MESSAGE_BYTES = 8 * 1024");
    expect(jobs).toContain("MAX_MESSAGES = 200");
    expect(jobs).toContain("capture_callback_context");
    expect(jobs).toContain("launch_callback_guard");
    expect(jobs).toContain("command_callback_guard");
    expect(jobs).toContain("claim_callback_guard_wake");
    expect(jobs).toContain("revalidated_target_state");
    expect(jobs).toContain("lifecycle-ended-without-final-callback");
    expect(jobs).toContain("revalidate_current_participant");
    expect(jobs).toContain("command_recover");
    expect(jobs).toContain("reconcile_job");
    expect(jobs).toContain('"wait"');
    expect(jobs).toContain('"job_dir": str(job_dir)');
    expect(playbook).toContain("### Same-conversation live return");
    expect(playbook).toContain("Callback wakes and `receive` remain the durable worker/parent path");
    expect(rootReadme).toContain("callback-primary routing");
    expect(rootReadme).toContain("explicit receive/retry/audit");
    expect(rootReadme).not.toContain("Detached Phase 1 jobs");
    expect(command).toContain("herdr-jobs.py wait <job-id> --json");
    expect(command).toContain("explicit `--mode callback`");
    expect(command).toContain("must not also receive a controller Monitor");
    expect(command).toContain("bounded background `Monitor`");
    expect(skill).toContain("a turn interruption is not cancellation");
    expect(skill).toContain("use `TaskStop` for explicit closeout");
    expect(playbook).toContain("never arm a duplicate merely because the parent turn was interrupted");
    expect(playbook).toContain("confirm it stopped");
    expect(command).toContain("do not re-arm it after an interrupted turn");
    expect(command).toContain("close it explicitly with `TaskStop`");
    expect(command).not.toContain("and start the packaged durable watcher");
    expect(command).toContain("do not emulate return by launching a second `letta -p` turn");
    expect(playbook).toContain("One job maps to one `direct-<job-slug>` tab");
    expect(playbook).toContain('herdr agent start "$CODEX_AGENT"');
    expect(playbook).toContain('herdr agent wait "$CODEX_AGENT"');
    expect(skill).toContain("use a bounded background `Monitor` instead of foreground `herdr agent wait`");
    expect(skill).toContain("lifecycle evidence is not execution proof");
    expect(playbook).toContain("Do not hold Main in a foreground task-completion wait");
    expect(playbook).toContain("A transient `done`/`idle` observation is only a wake signal");
    expect(playbook).toContain('CODEX_AGENT="d${PANE_HASH}c"');
    expect(playbook).toContain("requested.isdisjoint(active)");
    expect(playbook).toContain("agent_name_taken");
    expect(playbook).toContain("wait_for_herdr_shell");
    expect(playbook).toContain("DIRECT_CLI_SHELL_READY_");
    expect(playbook).toContain("herdr pane process-info --pane");
    expect(playbook).toContain("agent_pane_busy");
    expect(playbook).toContain("Running inside Orca or Herdr with `--backend tmux` intentionally creates a nested multiplexer");
    expect(playbook).toContain("byte-identical input at the Herdr CLI argument boundary");
    expect(playbook).toContain("A naive `agent prompt` followed immediately by `agent wait` is unsafe");
    expect(playbook).toContain("### Callback-primary detached Herdr jobs");
    expect(playbook).toContain("--mode callback");
    expect(playbook).toContain("Do not add a controller Monitor for a job whose start result says `mode=callback`");
    expect(playbook).toContain("then run `recover \"$JOB_ID\"`");
    expect(playbook).toContain("Accepted `agent.prompt`/`pane.run` delivery is not receipt or proof");
    expect(playbook).toContain("transport acceptance alone never finalizes");
    expect(playbook).toContain("ledger is capped at 200");
    expect(playbook).toContain("controller's background Monitor");
    expect(playbook).toContain("list --json");
    expect(playbook).toContain("collect \"$JOB_ID\"");
    expect(playbook).toContain("Role fanout");
    expect(playbook).toContain("Same-prompt fanout");
    expect(playbook).toContain("Send byte-identical prompt content to every pane.");
    expect(playbook).toContain("Main agent owns final merge/synthesis into the real worktree.");
    expect(playbook).toContain("Treat multi-pane output collection as receipt-bound");
    expect(playbook).toContain("Never discover a lane's result by scanning a shared output root for the newest file");
    expect(playbook).toContain("does not restrict multi-pane execution");
    expect(playbook).toContain("do not infer a provider directory name or session/call layout");
    expect(playbook).not.toContain("$CODEX_HOME/generated-images");
    expect(readme).toContain("Multi-pane output collection is receipt-bound rather than recency-based");
    expect(playbook).toContain("Antigravity multiline prompt caveat");
    expect(playbook).toContain("agy --model claude-opus-4-6-thinking --dangerously-skip-permissions");
    expect(playbook).toContain("`claude-sonnet-4-6`");
    expect(playbook).toContain("`gemini-3.8-flash-high`");
    expect(playbook).toContain("`gemini-3.8-flash-medium`");
    expect(playbook).toContain("`gemini-3.8-flash-low` fallback");
    expect(playbook).not.toContain("gemini-3.7-flash");
    expect(playbook).toContain("`codex debug models`");
    expect(playbook).toContain("Cursor Fable 5.1 reasoning model");
    expect(playbook).toContain("## Curated routing policy");
    expect(playbook).toContain("single owner of direct-cli's role-to-model choices");
    expect(playbook).toContain("agent --model \"claude-fable-5-1-thinking-high\" --yolo --approve-mcps --trust");
    expect(playbook).toContain("agent --model \"claude-fable-5-1-thinking-xhigh\" --yolo --approve-mcps --trust");
    expect(playbook).toContain("agent --model 'grok-4.7[context=500k,effort=high,fast=false]' --yolo --approve-mcps --trust");
    expect(playbook).toContain("agent --model \"claude-sonnet-5-5-high\" --yolo --approve-mcps --trust");
    expect(playbook).not.toContain("claude-sonnet-5-thinking-high");
    expect(playbook).toContain("agent --model \"claude-opus-5-5-high\" --yolo --approve-mcps --trust");
    expect(playbook).not.toContain("agent --model \"claude-opus-5-thinking-high\"");
    expect(playbook).not.toContain("cursor-grok-4.6-high");
    expect(playbook).toContain('herdr agent start "$CURSOR_AGENT" --kind cursor');
    expect(playbook).toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(playbook).not.toContain("Do not use `--dangerously-bypass-approvals-and-sandbox` by default");
    expect(playbook).toContain('codex --model "gpt-6-astra" -c model_reasoning_effort=high');
    expect(playbook).toContain('codex --model "gpt-6.1-sol" -c model_reasoning_effort=high');
    expect(playbook).toContain('codex --model "gpt-6.1-sol" -c model_reasoning_effort=max');
    expect(playbook).not.toContain('codex --model "gpt-6-sol" -c model_reasoning_effort=high');
    expect(playbook).not.toContain('codex --model "gpt-6.1-sol" -c model_reasoning_effort=medium');
    expect(playbook).toContain('codex --model "gpt-6-luna" -c model_reasoning_effort=medium');
    expect(playbook).not.toContain('codex --model "gpt-5.6-luna"');
    expect(playbook).toContain('codex --model "gpt-6-astra" -c model_reasoning_effort=ultra');
    expect(playbook).not.toContain('codex --model "gpt-5.6-sol"');
    expect(playbook).not.toContain("`gpt-5.6-terra`");
    expect(playbook).not.toContain("`gpt-5.5`");
    expect(playbook).toContain("Keep the current proven source-art route");
    expect(playbook).toContain("Verify supported effort levels from the current Codex catalog");
    expect(playbook).not.toContain("gpt-5.3-codex-spark");
    expect(playbook).not.toContain("Current freshness checkpoints");
    expect(playbook).not.toContain("`kimi-k3-high`");
    expect(playbook).not.toContain("gpt-5.3-codex-high");
    expect(playbook).not.toContain("gpt-5.3-codex-high-fast");
    expect(playbook).not.toContain("Gemini CLI");
    expect(playbook).not.toContain("gemini-task");
    expect(playbook).not.toContain("gemini --help");

    expect(readme).toContain("same-prompt fanout");
    expect(readme).toContain("callback-primary");
    expect(readme).toContain("Accepted delivery is never receipt/proof");
    expect(readme).toContain("recover");
    expect(readme).toContain("persists positive `working` evidence");
    expect(readme).toContain("bounded synchronous output capture");
    expect(readme).toContain("defers terminalization while work is active, state changed, or a final callback already exists");
    expect(readme).toContain("`--backend auto`");
    expect(readme).toContain("`--backend orca`");
    expect(readme).toContain("`--backend herdr`");
    expect(readme).toContain("`--backend tmux`");
    expect(readme).toContain("binary presence alone is not enough");
    expect(readme).toContain("checks byte identity at the boundary");
    expect(readme).toContain("Agy specifically");
    expect(readme).toContain("The curated role-to-model mapping has one owner: `playbook.md`");
    expect(readme).not.toContain("`kimi-k3-high`");
    expect(readme).not.toContain("Gemini CLI");
    expect(readme).not.toContain("/direct-cli gemini");

    for (const wrapper of [command]) {
      expect(wrapper).toContain("`--backend auto|orca|herdr|tmux`");
      expect(wrapper).toContain("`--workspace ID`");
      expect(wrapper).toContain("`--detach`");
      expect(wrapper).toContain("Reject Orca and tmux detach");
      expect(wrapper).toContain("never silently switch after creating state");
      expect(wrapper).toContain("current curated role/model choices");
      expect(wrapper).toContain("live CLI catalog");
      expect(wrapper).not.toContain("`kimi-k3-high`");
      expect(wrapper).toContain("reject any fallback warning or visible model mismatch");
      expect(wrapper).toContain("continuously stable `idle`/`done` window");
      expect(wrapper).toContain("not authorization for blind fallback capture");
      expect(wrapper).not.toContain("Antigravity `Claude Opus 4.6 (Thinking)`");
    }

    expect(rootReadme).toContain("callback-primary routing");
    expect(rootReadme).toContain("exact parent-pane receipt capture");
    expect(rootReadme).toContain("stable termination");
    expect(rootReadme).toContain("exact-parent synchronous recovery after completed dispatch");
    expect(rootReadme).toContain("defers terminalization while work or callback evidence remains active");
    expect(rootReadme).toContain("one atomic metadata-only `pane.run`");
    expect(rootReadme).toContain("there is no tmux fallback");
    expect(rootReadme).toContain("foreground-verified stable `--model` slugs");
    expect(rootReadme).toContain("auto-selected Orca/Herdr/tmux backends");
    expect(rootReadme).toContain("Auto uses Orca only from an exact live caller-terminal receipt plus a tracked current path");
    expect(rootReadme).toContain("then Herdr only from a healthy compatible managed pane");
    expect(rootReadme).toContain("reject fallback warnings/model mismatches");
    expect(rootReadme).toContain("does not install the `pi` executable");
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
    expect(skill).toContain("exact provider-returned path plus available session/result identity");
    expect(skill).toContain("Never discover concurrent outputs by global newest-file or modification-time search");
    expect(skill).toContain("request that structured control **and** state genuine transparent/no-background pixels");
    expect(skill).toContain("Treat a provider or tool claim such as `transparent: true` as request/receipt evidence");
    expect(skill).toContain("actual raster mode and alpha extrema/corners");
    expect(skill).toContain("source-ready-normalization-required");
    expect(skill).toContain("bounded Cursor/Agy/Codex lanes");
    expect(skill).not.toContain("bounded Codex/Gemini/Agy lanes");
  });

  test("asset workflow routes semantic dicut to Agy first with explicit Codex fallback", () => {
    const assetDesigner = readRepoFile("skills", "asset-designer", "SKILL.md");
    const webAssetPrompts = readRepoFile("skills", "web-asset-prompts", "SKILL.md");
    const codexAssetProduction = readRepoFile("skills", "codex-asset-production", "SKILL.md");
    const directCli = readRepoFile("skills", "direct-cli", "SKILL.md");
    const directCliReadme = readRepoFile("skills", "direct-cli", "README.md");
    const directCliPlaybook = readRepoFile("skills", "direct-cli", "playbook.md");
    const rootReadme = readRepoFile("README.md");
    const index = readRepoFile("skills", "llms.txt");
    const assetCommand = readRepoFile("commands", "asset-designer.md");
    const codexCommand = readRepoFile("commands", "codex-asset-production.md");

    expect(assetDesigner).toContain("Agy/Gemini as the first semantic-dicut candidate writer");
    expect(assetDesigner).toContain("remains the explicit dicut fallback and same-input A/B lane");
    expect(assetDesigner).toContain("Never switch executors silently");
    expect(assetDesigner).toContain("white fur or low-contrast details can be deleted or hardened");

    for (const contract of [webAssetPrompts, codexAssetProduction, directCli, directCliReadme, rootReadme, index, assetCommand, codexCommand]) {
      expect(contract).toContain("Agy/Gemini");
      expect(contract).toContain("Codex");
    }

    expect(codexAssetProduction).toContain("Route final dicut through Agy first and retain Codex fallback");
    expect(codexAssetProduction).toContain("Never switch executors silently");
    expect(codexAssetProduction).not.toContain("Make Codex own final dicut and edge QA");
    expect(codexAssetProduction).not.toContain("Codex owns image generation plus asset-designer-style cutout/cleanup");

    expect(directCliPlaybook).toContain("`agy-dicut`");
    expect(directCliPlaybook).toContain("`codex-dicut-fallback`");
    expect(directCliPlaybook).not.toContain("| 2 | `codex-dicut`");
    expect(directCliPlaybook).not.toContain("source/dicut/QA role fanout");
    expect(directCli).toContain("use `asset-designer` as the front-door workflow");
    expect(directCliReadme).toContain("use `/asset-designer` as the front door");
  });

  test("codex asset production keeps bounded VFX asset roles under repo-local gameplay authority", () => {
    const skill = readRepoFile("skills", "codex-asset-production", "SKILL.md");

    for (const role of ["vfx-source", "vfx-dicut", "vfx-atlas", "vfx-runtime-composition", "vfx-accessibility-review"]) {
      expect(skill).toContain(role);
    }
    expect(skill).toContain("the target repo's gameplay/VFX owner");
    expect(skill).toContain("not runtime architecture or product acceptance");
    expect(skill).toContain("never claims canonical runtime assembly or promotion");
  });

  test("goal skill describes Goal Mode without old cockpit references", () => {
    const skill = readRepoFile("skills", "control-room-goals", "SKILL.md");
    const command = readRepoFile("commands", "control-room-goals.md");
    const index = readRepoFile("skills", "llms.txt");

    expect(skill).toContain("# Goal Mode");
    expect(skill).toContain("Use Goal Mode as lightweight management of one human-owned living mission");
    expect(skill).toContain("Proposed Goal Mode:");
    expect(skill).toContain("the agent owns applying the goal");
    expect(skill).toContain("Do not ask Mahiro to\nrun a slash command");
    expect(skill).toContain("mh_get_goal");
    expect(skill).toContain("mh_create_goal");
    expect(skill).toContain("mh_update_goal");
    expect(skill).toContain("action `revise_mission`");
    expect(skill).toContain("action `move_goal`");
    expect(skill).toContain("bounded rules and mutable");
    expect(skill).toContain('"owner": "human"');
    expect(skill).toContain("replace: true");
    expect(skill).toContain("expected_revision");
    expect(skill).toContain("Add evidence before `claim_criterion`");
    expect(skill).toContain("Mahiro verifies it through `/mh-goal verify");
    expect(skill).toContain("the agent should call that tool itself after approval");
    expect(skill).toContain("Goal Mode owns mission truth");
    expect(skill).toContain("Execution Run is optional coordination for complex external lanes");
    expect(skill).toContain("Do not require it\n  for simple edits");
    expect(skill).toContain("`letta:agent=<agent-id>;conversation=<conversation-id>`");
    expect(skill).toContain("`default` is not globally unique");
    expect(skill).toContain("not readiness, execution, or result proof");
    expect(skill).toContain("A handed-off `code_evidence_intake` is caller metadata, not proof");
    expect(skill).toContain("Code Evidence owns fresh repository/check attribution");
    expect(skill).toContain("neither an\n  executor report nor a Code Evidence intake may auto-claim criteria");
    expect(skill).toContain("A long-running task stays active until its evidence");
    expect(skill).toContain("[execution-contract.md](references/execution-contract.md)");
    expect(skill).toContain("planning → executing → verifying → done");
    expect(skill).toContain("one current subagent-routing owner");
    expect(skill).toContain("does not claim that a\nskill can intercept a provider turn");
    expect(skill).not.toContain("token");
    expect(skill).toContain("preferred owner when they are exposed");
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
    expect(index).toContain("Goal Mode objective/DoD/next-action drafting and agent-owned application workflow");
    expect(index).toContain("optional Execution Run and explicit Code Evidence attachment boundaries");
    expect(index).not.toContain("legacy skill name");
  });
});
