import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "frontend-design");

function read(...segments: string[]) {
  return readFileSync(join(repoRoot, ...segments), "utf8");
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
    expect(skill).toContain("## Stop Gates");
    expect(skill).toContain("## Output Contract");
    expect(skill).toContain("## Validation / Self-check");
    expect(command).toContain('skill: "frontend-design"');
    expect(command).toContain("Do not auto-load for native model-taste baselines");
    expect(geminiCommand).toContain('skill: \\\"frontend-design\\\"');
    expect(geminiCommand).toContain("Do not auto-load for native model-taste baselines");
  });

  test("ships progressive-disclosure brief and reference contracts", () => {
    expect(existsSync(join(skillRoot, "references", "brief-workflow.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "reference-contracts.md"))).toBe(true);

    const brief = read("skills", "frontend-design", "references", "brief-workflow.md");
    const references = read("skills", "frontend-design", "references", "reference-contracts.md");

    expect(brief).toContain("### Preserve");
    expect(brief).toContain("Current reality:");
    expect(brief).toContain("Keep | Does it improve hierarchy");
    expect(brief).toContain("Do not call the brief validated merely because the code builds");
    expect(references).toContain("## 1. Reference-Set Manifest");
    expect(references).toContain("Generated-Reference Analysis");
    expect(references).toContain("Fidelity Comparison");
    expect(references).toContain("Requested deliverables: N");
  });

  test("keeps strong taste priors out and stays outside the default bundle", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const brief = read("skills", "frontend-design", "references", "brief-workflow.md");
    const references = read("skills", "frontend-design", "references", "reference-contracts.md");
    const doctrine = [skill, brief, references].join("\n");
    const marketplace = JSON.parse(read(".claude-plugin", "marketplace.json"));
    const defaultBundle = marketplace.bundles[0];
    const optionalBundle = marketplace.bundles.find((bundle: { name: string }) => bundle.name === "mahiro-frontend-design");

    expect(skill).toContain("high-level asset requirements/roles");
    expect(skill).toContain("Filenames, ratios, production strategy, manifests, cleanup, QA, and promotion remain owned by `asset-designer`");
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
    expect(defaultBundle.skills).not.toContain("frontend-design");
    expect(defaultBundle.commands).not.toContain("frontend-design");
    expect(optionalBundle.skills).toEqual(["frontend-design"]);
    expect(optionalBundle.commands).toEqual(["frontend-design"]);
  });

  test("keeps uncodixify aligned to the brief and reference contract", () => {
    const uncodixify = read("skills", "uncodixify", "SKILL.md");

    expect(uncodixify).toContain("brief-defined section or screen order");
    expect(uncodixify).toContain("inherit brief-defined structure and reference decisions first");
    expect(uncodixify).not.toContain("prompt-composed section order");
    expect(uncodixify).not.toContain("inherit composed prompt sections first");
  });
});
