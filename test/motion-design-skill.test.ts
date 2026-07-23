import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "motion-design");

const read = (...segments: string[]) => readFileSync(join(repoRoot, ...segments), "utf8");

const readFrontmatter = (source: string) => {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  expect(match).not.toBeNull();

  return Object.fromEntries(
    (match?.[1] ?? "").split("\n").map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
  );
};

describe("motion-design skill", () => {
  test("ships an explicit product-motion contract with paired wrappers", () => {
    const skill = read("skills", "motion-design", "SKILL.md");
    const command = read("commands", "motion-design.md");
    const geminiCommand = read("commands-gemini", "mh-motion-design.toml");

    expect(skill).toContain("## Explicit Trigger Policy");
    expect(skill).toContain("Do not auto-load it for:");
    expect(skill).toContain("ordinary frontend implementation or bug fixing");
    expect(skill).toContain("tiny incidental hover, focus, or color transitions");
    expect(skill).toContain("## Ownership Boundaries");
    expect(skill).toContain("`frontend-design` owns brand, product, visual, layout, and composition direction");
    expect(skill).toContain("`studying-codrops` owns Codrops evidence");
    expect(skill).toContain("`vfx-workflow` owns game/runtime VFX");
    expect(skill).toContain("## Bounded Workflow");
    expect(skill).toContain("## Motion Brief / Output Contract");
    expect(skill).toContain("## Stop Gates");
    expect(skill).toContain("## Validation / Self-check");
    expect(skill).toContain("This is a motion-design recommendation, not verified implementation behavior.");

    expect(command).toContain('skill: "motion-design"');
    expect(command).toContain("Do not auto-route ordinary frontend implementation or game VFX here");
    expect(geminiCommand).toContain('skill: \\\"motion-design\\\"');
    expect(geminiCommand).toContain(".gemini/skills/motion-design/SKILL.md");
    expect(geminiCommand).toContain("~/.gemini/skills/motion-design/SKILL.md");
  });

  test("keeps metadata and progressive-disclosure references valid", () => {
    const skill = read("skills", "motion-design", "SKILL.md");
    const frontmatter = readFrontmatter(skill);
    const referenceLinks = [...skill.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map((match) => match[1]);

    expect(frontmatter.name).toBe("motion-design");
    expect(frontmatter.description.length).toBeGreaterThan(100);
    expect(frontmatter.description.length).toBeLessThanOrEqual(1024);
    expect(frontmatter.description).not.toContain("Mahiro Skill |");
    expect(frontmatter.description).toContain("Use only when");
    expect(frontmatter.description).toContain("Do not auto-load");
    expect(skill.split("\n").length).toBeLessThanOrEqual(500);
    expect(referenceLinks.length).toBeGreaterThanOrEqual(7);

    for (const reference of referenceLinks) {
      expect(existsSync(join(skillRoot, reference))).toBe(true);
    }
  });

  test("preserves upstream MIT provenance without copying repository docs", () => {
    const license = read("skills", "motion-design", "LICENSE");
    const provenance = read("skills", "motion-design", "references", "upstream-provenance.md");

    expect(license).toContain("MIT License");
    expect(license).toContain("Copyright (c) 2025 LottieFiles");
    expect(license).toContain("The above copyright notice and this permission notice shall be included");
    expect(provenance).toContain("https://github.com/LottieFiles/motion-design-skill");
    expect(provenance).toContain("f9a8a041b85185ee4881b3471d3415e939aac772");
    expect(provenance).toContain("This is not a full repository copy");
    expect(provenance).toContain("Mahiro-local changes");
    expect(existsSync(join(skillRoot, "README.md"))).toBe(false);
    expect(existsSync(join(skillRoot, ".gitignore"))).toBe(false);
  });

  test("is discoverable and included in the default bundle with explicit-trigger guards", () => {
    const llms = read("skills", "llms.txt");
    const readme = read("README.md");
    const marketplace = JSON.parse(read(".claude-plugin", "marketplace.json")) as {
      bundles: Array<{ skills: string[]; commands: string[] }>;
    };
    const defaultBundle = marketplace.bundles[0];
    const llmsEntry = llms.split("\n").find((line) => line.startsWith("- `motion-design`")) ?? "";
    const readmeEntry = readme.split("\n").find((line) => line.startsWith("| `motion-design`")) ?? "";

    expect(llmsEntry).toContain("Explicit UI/product motion-system");
    expect(llmsEntry).toContain("Do not auto-load");
    expect(readmeEntry).toContain("motion brief");
    expect(readmeEntry).toContain("not ordinary frontend work or game VFX");
    expect(defaultBundle.skills).toContain("motion-design");
    expect(defaultBundle.commands).toContain("motion-design");
  });
});
