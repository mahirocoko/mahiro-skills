import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "frontend-design");

function read(...segments: string[]) {
  return readFileSync(join(repoRoot, ...segments), "utf8");
}

function readFrontmatter(source: string) {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  expect(match).not.toBeNull();

  return Object.fromEntries(
    (match?.[1] ?? "").split("\n").map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
  );
}

describe("frontend-design skill", () => {
  test("ships a lean explicit planning contract and paired wrappers", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const command = read("commands", "frontend-design.md");
    const geminiCommand = read("commands-gemini", "mh-frontend-design.toml");

    expect(skill).toContain("name: frontend-design");
    expect(skill).toContain("Do not auto-load it for every frontend implementation task");
    expect(skill).toContain("For native model-taste experiments");
    expect(skill).toContain("## Evidence Priority");
    expect(skill).toContain("## Effort Ladder");
    expect(skill).toContain("Bounded task");
    expect(skill).toContain("Whole-composition or high-risk work");
    expect(skill).toContain("## Stop Gates");
    expect(skill).toContain("## Output Contract");
    expect(skill).toContain("## Validation / Self-check");
    expect(command).toContain('skill: "frontend-design"');
    expect(command).toContain("brand-relative frontend design brief");
    expect(command).toContain("Do not auto-load for native model-taste baselines");
    expect(geminiCommand).toContain('skill: \\\"frontend-design\\\"');
    expect(geminiCommand).toContain("brand-relative frontend design brief");
    expect(geminiCommand).toContain("Do not auto-load for native model-taste baselines");
  });

  test("keeps metadata, progressive disclosure, and references structurally valid", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const frontmatter = readFrontmatter(skill);
    const referenceLinks = [...skill.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map((match) => match[1]);

    expect(frontmatter.name).toBe("frontend-design");
    expect(frontmatter.description.length).toBeGreaterThan(80);
    expect(frontmatter.description.length).toBeLessThanOrEqual(1024);
    expect(frontmatter.description).not.toContain("Mahiro Skill |");
    expect(skill.split("\n").length).toBeLessThanOrEqual(500);
    expect(referenceLinks.length).toBeGreaterThanOrEqual(3);

    for (const reference of referenceLinks) {
      expect(existsSync(join(skillRoot, reference))).toBe(true);
    }
  });

  test("discovers only decision-scoped large frontend-reference corpus work", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const frontmatter = readFrontmatter(skill);
    const llms = read("skills", "llms.txt");
    const readme = read("README.md");
    const command = read("commands", "frontend-design.md");
    const geminiCommand = read("commands-gemini", "mh-frontend-design.toml");
    const deepResearchSkill = read("skills", "deep-research", "SKILL.md");
    const deepResearch = readFrontmatter(deepResearchSkill);
    const deepResearchCommand = read("commands", "deep-research.md");
    const deepResearchGeminiCommand = read("commands-gemini", "mh-deep-research.toml");
    const marketplace = JSON.parse(read(".claude-plugin", "marketplace.json")) as {
      bundles: Array<{ skills: string[]; commands: string[] }>;
    };
    const defaultBundle = marketplace.bundles[0];
    const llmsEntry = llms.split("\n").find((line) => line.startsWith("- `frontend-design`")) ?? "";
    const deepResearchLlmsEntry = llms.split("\n").find((line) => line.startsWith("- `deep-research`")) ?? "";
    const readmeEntry = readme.split("\n").find((line) => line.startsWith("| `frontend-design`")) ?? "";
    const deepResearchReadmeEntry = readme.split("\n").find((line) => line.startsWith("| `deep-research`")) ?? "";

    expect(frontmatter.description).toContain("large frontend-reference corpus review");
    expect(frontmatter.description).toContain("named frontend design decision");
    expect(frontmatter.description).toContain("generic deep research");
    expect(skill).toContain("judge corpus adequacy for a named frontend design decision");
    expect(skill).toContain("to `deep-research` instead");
    expect(llmsEntry).toContain("large frontend-reference corpus review");
    expect(llmsEntry).toContain("named frontend design decision");
    expect(readmeEntry).toContain("large frontend-reference corpus review");
    expect(readmeEntry).toContain("not generic deep research");
    expect(command).toContain("large frontend-reference corpus review");
    expect(command).toContain("named frontend design decision");
    expect(command).toContain("deep-research for generic source-backed research");
    expect(geminiCommand).toContain("large frontend-reference corpus review");
    expect(geminiCommand).toContain("named frontend design decision");
    expect(geminiCommand).toContain("deep-research for generic source-backed research");
    expect(deepResearch.description).toContain("comprehensive analysis or source-backed research");
    expect(deepResearch.description).toContain("named frontend design decision");
    expect(deepResearch.description).toContain("to frontend-design instead");
    expect(deepResearch.alias).toBe("/gemini research");
    expect(deepResearchSkill).toContain("when the request combines all three");
    expect(deepResearchLlmsEntry).toContain("to `frontend-design` instead");
    expect(deepResearchReadmeEntry).toContain("Use `frontend-design`");
    expect(deepResearchCommand).toContain("named frontend design decision to frontend-design");
    expect(deepResearchGeminiCommand).toContain("named frontend design decision to frontend-design");
    expect(defaultBundle.skills).not.toContain("deep-research");
    expect(defaultBundle.commands).not.toContain("deep-research");
  });

  test("ships progressive-disclosure brief and reference contracts", () => {
    expect(existsSync(join(skillRoot, "references", "brief-workflow.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "reference-contracts.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "brand-taste.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "mahiro-mac-product-profile.md"))).toBe(true);

    const brief = read("skills", "frontend-design", "references", "brief-workflow.md");
    const references = read("skills", "frontend-design", "references", "reference-contracts.md");
    const brandTaste = read("skills", "frontend-design", "references", "brand-taste.md");

    expect(brief).toContain("### Preserve");
    expect(brief).toContain("Current reality:");
    expect(brief).toContain("Keep | Does it improve hierarchy");
    expect(brief).toContain("include signature fields only when visual identity or brand differentiation is material");
    expect(brief).toContain("Include proof fields and proof position only when product proof is material");
    expect(brief).toContain("Signature carrier (when material):");
    expect(brief).toContain("Primary proof carrier / source / evidence status (when product proof is material):");
    expect(brief).toContain("Proof-validity check");
    expect(brief).toContain("First meaningful proof position");
    expect(brief).toContain("proof-role parity");
    expect(brief).toContain("initial, fallback, and settled states listed as separate required cases");
    expect(brief).toContain("recorded visual plus DOM/geometry judgment unless structured tooling is explicitly added");
    expect(brief).toContain("Do not call the brief validated merely because the code builds");
    expect(references).toContain("## 1. Reference-Set Manifest");
    expect(references).toContain("Generated-Reference Analysis");
    expect(references).toContain("Fidelity Comparison");
    expect(references).toContain("Brand-Relative Pairwise Comparison");
    expect(references).toContain("Anonymous Composition Exploration");
    expect(references).toContain("For a live external reference");
    expect(references).toContain("requested/canonical URL, resolved URL, redirect chain, and network transport result");
    expect(references).toContain("access context separately");
    expect(references).toContain("First-paint resilience");
    expect(references).toContain("Critical overlap / occlusion / z-order");
    expect(references).toContain("Requested deliverables: N");
    expect(brandTaste).toContain("## 1. Evidence and Brand Read");
    expect(brandTaste).toContain("## 2. Taste Thesis");
    expect(brandTaste).toContain("## 4. Reference Fit");
  });

  test("ships positive brand-relative taste without creating a house style", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const brief = read("skills", "frontend-design", "references", "brief-workflow.md");
    const references = read("skills", "frontend-design", "references", "reference-contracts.md");
    const brandTaste = read("skills", "frontend-design", "references", "brand-taste.md");
    const doctrine = [skill, brief, references, brandTaste].join("\n");

    expect(skill).toContain("Brand Read, Taste Thesis, and Reference Fit reasoning");
    expect(skill).toContain("repo-proven reality, approved direction, reference-derived hypothesis, recommended direction, and unknown");
    expect(skill).toContain("would not become a different brand merely through a token swap");
    expect(brandTaste).toContain("when / prefer / because / evidence");
    expect(brandTaste).toContain("Token-swap branding");
    expect(brandTaste).toContain("Do not aggregate taste into a numeric score");
    expect(brandTaste).toContain("Cross-brand contamination");
    expect(brandTaste).toContain("A signature expression must shape the main composition");
    expect(brandTaste).toContain("Product or proof media must remain meaningfully inspectable");
    expect(brandTaste).toContain("If two unrelated brands retain substantially the same expressive anatomy");
    expect(skill).toContain("Brand-specific typographic voice, hero cadence, proof framing, and CTA closure");
    expect(doctrine).not.toContain("universal tasteful palette");
    expect(doctrine).not.toContain("all finance brands");
    expect(doctrine).not.toContain("all wellness brands");
  });

  test("applies the Mahiro Mac product profile only as a scoped Web and App fallback", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const brandTaste = read("skills", "frontend-design", "references", "brand-taste.md");
    const profile = read(
      "skills",
      "frontend-design",
      "references",
      "mahiro-mac-product-profile.md",
    );

    expect(skill).toContain("references/mahiro-mac-product-profile.md");
    expect(skill).toContain("confirmed as a Mahiro personal project");
    expect(skill).toContain("strong positive prior for both presentation and working-surface jobs");
    expect(skill).toContain("across Web and App runtimes");
    expect(skill).toContain("repo-local docs/trusted project memory");
    expect(skill).toContain("a repository namespace, package author, remote owner, or local path alone is insufficient");
    expect(skill).toContain("Do not activate it for client/team/third-party/uncertain ownership");
    expect(skill).toContain("merely because a product runs on or targets macOS");
    expect(skill).toContain("during a native model-taste baseline");
    expect(profile).toContain("owner-approved **strong positive prior**");
    expect(profile).toContain("confirmed Mahiro personal project");
    expect(profile).toContain("## 3. Presentation-Surface Profile");
    expect(profile).toContain("## 4. Working-Surface Profile");
    expect(profile).toContain("A repository namespace, package author, remote owner, or local path alone is not proof");
    expect(profile).toContain("merely because a product runs on or targets macOS");
    expect(profile).toContain("browser-based editor, dashboard, configuration surface");
    expect(profile).toContain("regardless of whether the runtime is native, desktop-web, or browser-based");
    expect(profile).toContain("client, employer, team, third-party, or uncertain-ownership work");
    expect(profile).toContain("Explicit user/product requirements, repo evidence");
    expect(profile).toContain("product-derived signature relationship");
    expect(profile).toContain("Object → transformation → result");
    expect(profile).toContain("List → workspace → inspector");
    expect(profile).toContain("Name the generic composition rejected");
    expect(profile).toContain("selection and state meaning without relying on color alone");
    expect(profile).toContain("text zoom and scaling against compact geometry");
    expect(profile).toContain("Thai as a first-class content shape");
    expect(profile).toContain("mandated fonts, palettes, radii, section counts, frameworks");
    expect(brandTaste).toContain("Owner-Approved Fallback Profiles");
    expect(brandTaste).toContain("approved direction");
    expect(brandTaste).toContain("not repo-proven reality or a universal taste claim");
  });

  test("ships conditional whole-composition and durable QA contracts", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const brief = read("skills", "frontend-design", "references", "brief-workflow.md");
    const references = read("skills", "frontend-design", "references", "reference-contracts.md");
    const doctrine = [skill, brief, references].join("\n");

    expect(skill).toContain("Baseline audit");
    expect(skill).toContain("Select a composition strategy separately from the work mode");
    expect(skill).toContain("Whole-composition reset");
    expect(skill).toContain("only within the approved IA and content inventory");
    expect(skill).toContain("require explicit approval of those changed contracts");
    expect(skill).toContain("return only material sections");
    expect(skill).toContain("Run `uncodixify` only after the first rendered composition exists");
    expect(brief).toContain("`Overhaul` describes how much visual language changes");
    expect(brief).toContain("Claim or demonstration | Source path/evidence");
    expect(brief).toContain("Section | User question | Verified product fact | Proof artifact");
    expect(brief).toContain("accept the section map as one product story");
    expect(brief).toContain("which existing anatomy survives and which is replaced");
    expect(brief).toContain("after copy and visual polish");
    expect(brief).toContain("reconcile routed asset manifests or delivery notes with runtime files");
    expect(brief).toContain("Do not use this workflow to expand a small component fix");
    expect(references).toContain("## 6. Rendered QA Evidence Contract");
    expect(references).toContain("CSS viewport and DPR");
    expect(references).toContain("Capture readiness: fonts / critical media / lazy content");
    expect(references).toContain("section-anchor captures");
    expect(references).toContain("Wait for the declared ready condition before capture");
    expect(references).toContain("mark the image incomplete");
    expect(references).toContain("### QA Closure Loop");
    expect(references).toContain("clean recorded state");
    expect(references).toContain("recapture or re-measure the same state");
    expect(references).toContain("keep unresolved rows open");
    expect(references).toContain("intermediate/tablet width");
    expect(references).toContain("delivery manifests, cleanup, QA");
    expect(references).toContain("do not duplicate an asset inventory");
    expect(doctrine).not.toContain("KumoWisp");
    expect(doctrine).not.toContain("Dock.cool");
    expect(doctrine).not.toContain("GPT-5.6 Sol");
    expect(doctrine).not.toContain("Mahiro explicitly");
    expect(doctrine).not.toContain("high-conversion surfaces");
    expect(doctrine).not.toContain("omit or mark the rest `not applicable`");
  });

  test("keeps universal taste priors out while shipping through the default bundle", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const brief = read("skills", "frontend-design", "references", "brief-workflow.md");
    const references = read("skills", "frontend-design", "references", "reference-contracts.md");
    const brandTaste = read("skills", "frontend-design", "references", "brand-taste.md");
    const doctrine = [skill, brief, references, brandTaste].join("\n");
    const marketplace = JSON.parse(read(".claude-plugin", "marketplace.json"));
    const defaultBundle = marketplace.bundles[0];

    expect(skill).toContain("high-level asset requirements/roles");
    expect(skill).toContain("`asset-designer` owns filenames, ratios/formats, source strategy, asset planning, delivery manifests, cleanup, QA");
    expect(references).toContain("Use `unknown`, `not established`, or `not applicable`");
    expect(doctrine).not.toContain("DESIGN_VARIANCE: 8");
    expect(doctrine).not.toContain("MOTION_INTENSITY: 6");
    expect(doctrine).not.toContain("one separate horizontal image");
    expect(doctrine).not.toContain("one image per section, always");
    expect(doctrine).not.toContain("mandatory GSAP");
    expect(doctrine).not.toContain("mandatory AIDA");
    expect(doctrine).not.toContain("Python randomization");
    expect(doctrine).not.toContain("Inter is banned");
    expect(doctrine).not.toContain("Fraunces");
    expect(defaultBundle.skills).toContain("frontend-design");
    expect(defaultBundle.commands).toContain("frontend-design");
  });

  test("routes asset production to the contract the asset skill actually provides", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const references = read("skills", "frontend-design", "references", "reference-contracts.md");
    const assetDesigner = read("skills", "asset-designer", "SKILL.md");

    expect(assetDesigner).toContain("source strategy");
    expect(assetDesigner).toContain("delivery manifest");
    expect(assetDesigner).toContain("QA");
    expect(skill).toContain("downstream production routing");
    expect(references).toContain("downstream production routing");
    expect(skill).not.toContain("hashes, conversion commands");
    expect(references).not.toContain("hashes, conversion commands");
  });

  test("supports sealed multi-variant composition proofs without forcing a winner", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const references = read("skills", "frontend-design", "references", "reference-contracts.md");

    expect(skill).toContain("multi-variant composition exploration");
    expect(references).toContain("### Shared Evidence Packet");
    expect(references).toContain("Pairwise ambiguity uses two directions");
    expect(references).toContain("Every option must pass the same packet");
    expect(references).toContain("seal the option mapping outside the review surface");
    expect(references).toContain("immutable preliminary critic verdict");
    expect(references).toContain("If the human selects `Neither`, promote no option or principle");
    expect(references).toContain("when / prefer / because / evidence");
  });

  test("keeps uncodixify aligned to the brief and reference contract", () => {
    const uncodixify = read("skills", "uncodixify", "SKILL.md");

    expect(uncodixify).toContain("brief-defined section or screen order");
    expect(uncodixify).toContain("inherit brief-defined structure and reference decisions first");
    expect(uncodixify).not.toContain("prompt-composed section order");
    expect(uncodixify).not.toContain("inherit composed prompt sections first");
  });
});
