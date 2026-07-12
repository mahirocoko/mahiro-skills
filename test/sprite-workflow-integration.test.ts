import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "sprite-workflow");
const scriptsRoot = join(skillRoot, "scripts");
const referencesRoot = join(skillRoot, "references");

describe("sprite-workflow integrated phase contract", () => {
  test("exposes every implemented phase through the canonical skill", () => {
    const skill = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
    for (const script of [
      "prompt-catalog.py",
      "verify-image-cockpit-catalog.py",
      "make-native-review.py",
      "bottom-align-frames.py",
      "compare-action-scale.py",
      "rollup-sprite-batch.py",
      "extract-motion-reference.py",
      "snap-native-grid.py",
      "validate-snap-report.py",
      "assemble-approved-atlas.py",
      "validate-atlas-manifest.py",
    ]) {
      expect(existsSync(join(scriptsRoot, script))).toBe(true);
      expect(skill).toContain(script);
    }
    for (const reference of [
      "pipeline-phases.md",
      "prompt-catalog.md",
      "motion-reference-intake.md",
      "native-grid-snap-contract.md",
      "pixel-snap-provenance.md",
      "atlas-contract.md",
    ]) {
      expect(existsSync(join(referencesRoot, reference))).toBe(true);
      expect(skill).toContain(reference);
    }
  });

  test("keeps safety boundaries explicit across shared contracts", () => {
    const phases = readFileSync(join(referencesRoot, "pipeline-phases.md"), "utf8");
    const contract = readFileSync(join(referencesRoot, "contract.md"), "utf8");
    const provenance = readFileSync(join(referencesRoot, "provenance-policy.md"), "utf8");
    const runner = readFileSync(join(referencesRoot, "runner-contracts.md"), "utf8");
    expect(phases).toContain("Never use whole-clip sampling");
    expect(phases).toContain("Refusal is a valid result");
    expect(contract).toContain("frameCount` is independent");
    expect(contract).toContain("107 exact Image Cockpit examples");
    expect(provenance).toContain("does not become generated-asset provenance");
    expect(runner).toContain("hash-matching `production-approved`");
  });
});
