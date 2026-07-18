import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dir, "..");
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

describe("vfx-workflow skill", () => {
  test("ships runtime VFX truth and paired wrappers", () => {
    const skill = read("skills", "vfx-workflow", "SKILL.md");
    const command = read("commands", "vfx-workflow.md");
    const gemini = read("commands-gemini", "mh-vfx-workflow.toml");

    expect(skill).toContain("name: vfx-workflow");
    expect(skill).toContain("Telegraph");
    expect(skill).toContain("projectile");
    expect(skill).toContain("barrier");
    expect(skill).toContain("Reduced motion and reduced effects are separate controls");
    expect(skill).toContain("Pressure degradation removes decoration before semantic cues");
    expect(skill).toContain("Gameplay arrival is authoritative");
    expect(skill).toContain("## Stop gates");
    expect(skill).toContain("## Validation / self-check");
    expect(skill).toContain("sprite-workflow");
    expect(skill).toContain("codex-asset-production");
    expect(command).toContain('skill: "vfx-workflow"');
    expect(gemini).toContain('skill: \\\"vfx-workflow\\\"');
  });

  test("ships focused cue rendering and QA references", () => {
    const skill = read("skills", "vfx-workflow", "SKILL.md");
    for (const file of ["runtime-cues.md", "rendering-policy.md", "qa-and-delivery.md"]) {
      expect(existsSync(join(root, "skills", "vfx-workflow", "references", file))).toBe(true);
      expect(skill).toContain(`references/${file}`);
    }
  });

  test("routes bounded Codex VFX production roles without moving gameplay authority", () => {
    const assetProduction = read("skills", "codex-asset-production", "SKILL.md");
    for (const role of ["vfx-source", "vfx-dicut", "vfx-atlas", "vfx-runtime-composition", "vfx-accessibility-review"]) {
      expect(assetProduction).toContain(role);
    }
    expect(assetProduction).toContain("not collision/damage semantics, VFX runtime architecture, canonical validation, or promotion");
    expect(assetProduction).toContain("Route runtime VFX design");
    expect(assetProduction).toContain("never replaces `sprite-workflow` validation, approved-atlas assembly, or promotion");
    expect(read("skills", "vfx-workflow", "SKILL.md")).toContain("canonical atlas assembly, and promotion to `sprite-workflow`");
  });
});
