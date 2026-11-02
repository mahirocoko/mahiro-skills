import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getInventoryGaps, getSkillCatalog, parseSkillFrontmatter } from "../src/repo";

const root = join(import.meta.dir, "..");
const skillRoot = join(root, "skills", "mahiro-unslop");
const read = (file: string) => readFileSync(join(skillRoot, file), "utf8");
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const listFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? listFiles(path) : [relative(skillRoot, path)];
  });

describe("mahiro-unslop draft", () => {
  test("routes all four lanes without claiming ordinary implementation", () => {
    const skill = read("SKILL.md");
    const metadata = parseSkillFrontmatter(skill);
    expect(metadata.name).toBe("mahiro-unslop");
    expect(metadata.description!.length).toBeLessThanOrEqual(1024);
    for (const trigger of ["unslop", "anti-slop", "generic AI output", "ordinary implementation"]) {
      expect(metadata.description).toContain(trigger);
    }
    const links = [...skill.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map((match) => match[1]);
    expect(links).toHaveLength(5);
    for (const link of links) expect(existsSync(join(skillRoot, link))).toBe(true);
    expect(skill).toContain("Current user instructions and repository contracts override");
    expect(skill).toContain("Rendered/runtime evidence is required");
    expect(skill).toContain("Audit-only means no edits");
    expect(skill).toContain("No-change remains a complete result");
    expect(skill.split("\n").length).toBeLessThan(150);
  });

  test("ports the pinned heydamir UI workflow and runtime materials near-verbatim", () => {
    const ui = read("references/ui-design.md");
    const operativeBody = ui.slice(ui.indexOf("# Unslop\n"));
    expect(sha256(operativeBody)).toBe("2d2ebf68e4fc51fca149a0adeeec5020782aa81aff4b7d7b27948cdb588ba3a8");
    expect(ui).toMatch(/shared\s+`mahiro-unslop` wrapper must not soften them into\s+optional probes/);
    expect(ui).toContain("## What good looks like");
    expect(ui).toContain("## Checklist");
    expect(ui).toContain("No emoji left in the interface");
    expect(ui).toContain("No exclamation marks");
    expect(ui).toContain("application shell as the product surface—not a");
    expect(ui).toContain("Internal\ncards remain valid");
    expect(ui).toContain("inventory it as brand, semantic status");
    expect(ui).toContain("hierarchy beyond numeric contrast");
    expect(ui).toContain("remove redundant marks instead of adding decorative emphasis");
    const passes = [...ui.matchAll(/^## \d\. (.+)$/gm)].map((match) => match[1]);
    expect(passes).toEqual(["Spacing", "Color", "Icons", "Copy", "Type", "Layout", "Details", "Visuals", "Motion"]);

    const pinnedFiles: Record<string, string> = {
      "references/signs.md": "6250d3c222c2aaa4ef4f31557d99d249e5be86d8720cd1157df14798caf1c8c4",
      "references/tokens.md": "988b754612b3e2d42d87b1bbaca0b4a61f3e07a2b2eef782d3614e8fdb6db5b0",
      "references/visuals.md": "7247da579d2d95ace1e051b867c757bd1e05aa02f3ab8dea0ead4cd4bf14d7d7",
      "references/effects.md": "ded4f679e22843a8f68860e6cda0396fa8b8fa27202400e08337143b485c86a4",
      "references/refs.md": "12a70ce17d574914ea69eb0809e5a9605de044df1b66619159c6d0b38d6b8353",
      "references/refs/story-dashboard-frames.webp": "cfbf837e40b7626d5a5789dbce54f5c197aab303aa350d13a042048310717137",
      "references/refs/beacon-engraving.webp": "44e7680e9c944f03c8fe45df999bdf74077a106925a8189eebf89e751e306e5b",
      "references/refs/meadow-3d.webp": "84f526b68021a06fc6d32f162406fab6cc8074da1ef76d2ae4530e1b58219b14",
      "references/refs/unslop-hero-after.webp": "92b2d796c5b6116a2039f5ca2b0f3edf700c92b41846b11b9501a4e32f72af6e",
      "references/refs/unslop-dashboard-after.webp": "48067794f86b43dab20515b3810f245d67bff05d10bfa83c0f5885bee93cea52",
      "scripts/story.mjs": "17d3a6ab6564efc5aa7632a36f340c130aa512fde73d229d79474f1b4c09d0e1",
      "scripts/snapshot.mjs": "fb2c6169b9ac8d1360a3e7fd0c9b8c34a3487df5e2128a7947c19dbcd99e2001",
    };
    for (const [file, expectedHash] of Object.entries(pinnedFiles)) {
      expect(sha256(readFileSync(join(skillRoot, file)))).toBe(expectedHash);
    }
  });

  test("protects exact prose no-op and behavior-sensitive interface contracts", () => {
    const prose = read("references/prose.md");
    const copy = read("references/interface-copy.md");
    expect(prose).toContain("Copy every other sentence byte-for-byte");
    expect(prose).toContain("With no findings, return the source exactly");
    expect(prose).toContain("Punctuation, cadence, vocabulary and structure alone");
    expect(prose).toContain("No upstream scanners, scoring system or preset is required");
    expect(prose).toContain("Preserve force-bearing");
    expect(copy).toContain("Inventory before polishing");
    expect(copy).toContain("adding undo, confirmation or typed-name guards");
    expect(copy).toContain("is a behavior change");
    expect(copy).toContain("Preserve keys,");
    expect(copy).toContain("Not verified");
  });

  test("keeps code taste with its owner and executable lint explicitly optional", () => {
    const code = read("references/code.md");
    expect(code).toContain("repo rules, dependency versions");
    expect(code).toContain("mahiro-style/SKILL.md");
    expect(code).toContain("only when explicitly requested and repo-compatible");
    expect(code).toContain("Do not install packages, mutate config");
    expect(code).toContain("No external linter is required");
  });

  test("is cataloged, bundled and wrapped without installation side effects", () => {
    const entry = getSkillCatalog(root).find((item) => item.name === "mahiro-unslop");
    expect(entry?.hasMarkdownCommand).toBe(true);
    expect(entry?.inDefaultBundle).toBe(true);
    expect(getInventoryGaps(root)).toEqual([]);
    const manifest = JSON.parse(readFileSync(join(root, ".claude-plugin/marketplace.json"), "utf8"));
    expect(manifest.bundles[0].commands).toContain("mahiro-unslop");
    for (const file of ["README.md", "skills/llms.txt"]) {
      expect(readFileSync(join(root, file), "utf8")).toContain("`mahiro-unslop`");
    }
    const command = readFileSync(join(root, "commands/mahiro-unslop.md"), "utf8");
    expect(command).toContain('skill: "mahiro-unslop"');
    expect(command).toContain("current agent's configured skills root");
  });

  test("ships discreet provenance, notices and no private experiment paths", () => {
    const provenance = read("references/provenance.md");
    for (const source of ["heydamir/unslop", "cursor/plugins", "theclaymethod/unslop", "jakubkrehel/skills"]) {
      expect(provenance).toContain(source);
    }
    expect(read("THIRD-PARTY-NOTICES")).toContain("Copyright (c) 2026 Lauren Tan");
    expect(read("THIRD-PARTY-NOTICES")).toContain("Copyright (c) 2026 Jakub Krehel");
    expect(provenance).toContain("CC BY 4.0");
    const textFiles = listFiles(skillRoot).filter((file) => /\.(?:md|mjs|yaml)$/.test(file));
    for (const file of textFiles) {
      expect(read(file)).not.toMatch(/\/tmp\/|\/Users\/|taste-research|experiment logs/);
    }
    expect(existsSync(join(skillRoot, "scripts", "snapshot.mjs"))).toBe(true);
    expect(existsSync(join(skillRoot, "scripts", "story.mjs"))).toBe(true);
  });
});
