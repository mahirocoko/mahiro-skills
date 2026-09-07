import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "creating-character-ip");
const read = (...parts: string[]) => readFileSync(join(repoRoot, ...parts), "utf8");

function readFrontmatter(source: string): Record<string, string> {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  expect(match).not.toBeNull();

  return Object.fromEntries(
    (match?.[1] ?? "").split("\n").map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
  );
}

describe("creating-character-ip skill", () => {
  test("ships one self-contained Explore and Adapt contract", () => {
    const skill = read("skills", "creating-character-ip", "SKILL.md");
    const command = read("commands", "creating-character-ip.md");

    expect(skill).toContain("## Operating Posture");
    expect(skill).toContain("## Scope and Handoffs");
    expect(skill).toContain("## Route Decision");
    expect(skill).toContain("**Explore**");
    expect(skill).toContain("**Adapt**");
    expect(skill).toContain("This skill is self-contained");
    expect(skill).toContain("does not invoke, install, or require another IP");
    expect(skill).toContain("human visual lock");
    expect(skill).toContain("same original reference");
    expect(skill).toContain("requested and observed composition were reported separately");
    expect(skill).toContain("do not pre-round app-icon artwork");
    expect(skill).toContain("Do not default to any one placement");
    expect(skill).toContain("do not turn corner\nplacement into another mandatory template");
    expect(skill).toContain("mirror-only\nshort-circuit");
    expect(skill).toContain("Label the result a deterministic derivative, never a generated\ncandidate");
    expect(skill).toContain("Never spend a generation call merely to reverse mirror-safe pixels");
    expect(skill).toContain("## Example");
    expect(skill).toContain("## Stop Gates");
    expect(skill).toContain("## Output Contract");
    expect(skill).toContain("## Validation / Self-check");

    expect(command).toContain('skill: "creating-character-ip"');
    expect(command).toContain("Use Explore only when no character has human approval");
    expect(command).toContain("never replace the source pixels");
  });

  test("keeps metadata concise and progressive-disclosure references valid", () => {
    const skill = read("skills", "creating-character-ip", "SKILL.md");
    const frontmatter = readFrontmatter(skill);
    const referenceLinks = [...skill.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map((match) => match[1]);

    expect(frontmatter.name).toBe("creating-character-ip");
    expect(frontmatter.description.length).toBeGreaterThan(150);
    expect(frontmatter.description.length).toBeLessThanOrEqual(1024);
    expect(frontmatter.description).not.toContain("Mahiro Skill |");
    expect(frontmatter.description).toContain("Use when");
    expect(frontmatter.description).toContain("Do not use");
    expect(skill.split("\n").length).toBeLessThanOrEqual(500);
    expect(new Set(referenceLinks)).toEqual(new Set([
      "references/adapt-route.md",
      "references/explore-route.md",
      "references/provenance-and-evidence.md",
    ]));

    for (const reference of referenceLinks) {
      expect(existsSync(join(skillRoot, reference))).toBe(true);
    }
  });

  test("preserves upstream MIT provenance without a runtime dependency", () => {
    const skill = read("skills", "creating-character-ip", "SKILL.md");
    const license = read("skills", "creating-character-ip", "LICENSE");
    const provenance = read("skills", "creating-character-ip", "references", "provenance-and-evidence.md");

    expect(license).toContain("MIT License");
    expect(license).toContain("Copyright (c) 2026 s1dashu");
    expect(provenance).toContain("https://github.com/s1dashu/ip-as-logo-skill");
    expect(provenance).toContain("acb834c717bcd0a487c49732d08397ba280d690b");
    expect(provenance).toContain("This package does not\ninvoke, install, or depend on the upstream skill at runtime");
    expect(provenance).toContain("It is not a full\nrepository copy");
    expect(provenance).toContain("Mahiro selected **C1 lower-left**");
    expect(provenance).toContain("Mahiro's human verdict was **PASS**");
    expect(provenance).toContain("does not establish that left-side generation is\n  universally better");
    expect(provenance).not.toContain("- paired lower-left/lower-right composition draws");
    expect(skill).not.toContain("Use `ip-as-logo`");
    expect(existsSync(join(skillRoot, "README.md"))).toBe(false);
  });

  test("keeps creation and adaptation behavior explicit", () => {
    const explore = read("skills", "creating-character-ip", "references", "explore-route.md");
    const adapt = read("skills", "creating-character-ip", "references", "adapt-route.md");

    expect(explore).toContain("six independent candidates");
    expect(explore).toContain("two per\ndirection");
    expect(explore).toContain("Assign composition from each direction's subject");
    expect(explore).toContain("Do not make mirrored lower corners");
    expect(explore).toContain("Centered,\nside-cropped, high/low, corner-emergent, symmetrical, and strongly asymmetric");
    expect(explore).toContain("4–7");
    expect(explore).toContain("no image reference");
    expect(explore).not.toContain("with lower-left and lower-right emergence paired");

    expect(adapt).toContain("When an image model is still required, the source pixels must reach it directly");
    expect(adapt).toContain("May change in this batch");
    expect(adapt).toContain("## Short-circuit pure mirror requests");
    expect(adapt).toContain("provider call count of zero");
    expect(adapt).toContain("deterministic\nderivative, not a generated candidate");
    expect(adapt).toContain("repositioning while identity orientation stays\nfixed");
    expect(adapt).toContain("same original selected source");
    expect(adapt).toContain("Never use a\ngenerated adaptation as the next candidate's reference");
    expect(adapt).toContain("Corner studies are one composition option, not the default Adapt grammar");
    expect(adapt).toContain("Generate four corners only when the user explicitly requests");
    expect(adapt).not.toContain("| Composition | lower-left / lower-right emergence |");
    expect(adapt).toContain("Keep the raw square unrounded");
    expect(adapt).toContain("requested and observed state separately");
  });

  test("is discoverable through the complete default bundle", () => {
    const marketplace = JSON.parse(read(".claude-plugin", "marketplace.json")) as {
      bundles: Array<{ skills: string[]; commands: string[] }>;
    };
    const defaultBundle = marketplace.bundles[0];
    const readme = read("README.md");
    const index = read("skills", "llms.txt");

    expect(defaultBundle.skills).toContain("creating-character-ip");
    expect(defaultBundle.commands).toContain("creating-character-ip");
    expect(readme).toContain("`creating-character-ip` | `/creating-character-ip`");
    expect(readme).toContain("Character/IP creation and adaptation");
    expect(index).toContain("`creating-character-ip` — Self-contained character/IP creation");
    expect(index).toContain("**Character IP bundle**: `creating-character-ip`");
  });
});
