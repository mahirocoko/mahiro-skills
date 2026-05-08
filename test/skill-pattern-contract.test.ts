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
    expect(skill).toContain("No silent durable edits.");
    expect(skill).toContain("Do not promote a single correction into global doctrine unless the user explicitly asks for global behavior.");
  });
});
