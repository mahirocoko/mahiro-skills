import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const skillPath = join(repoRoot, "skills", "control-room-goals", "SKILL.md");
const contractPath = join(repoRoot, "skills", "control-room-goals", "references", "execution-contract.md");
const retiredPilotPath = join(repoRoot, "skills", "control-room-goals", "scripts", "pilot-record.ts");

describe("control-room-goals execution contract", () => {
  test("documents bounded state, completion, and handoff semantics", () => {
    const skill = readFileSync(skillPath, "utf8");
    const contract = readFileSync(contractPath, "utf8");

    expect(skill).toContain("[execution-contract.md](references/execution-contract.md)");
    expect(skill).toContain("planning → executing → verifying → done");
    expect(skill).toContain("does not claim that a\nskill can intercept a provider turn");
    expect(contract).toContain("`turn complete`, a tool result, a subagent report");
    expect(contract).toContain("A final report is valid only from `done`, `needs_human`, or `blocked`");
    expect(contract).toContain("A worker report is evidence input, not automatic proof or Goal completion");
  });

  test("keeps one explicit Letta subagent routing owner", () => {
    const contract = readFileSync(contractPath, "utf8");

    expect(contract).toContain("## Local subagent routing policy");
    expect(contract).toContain("Letta `Agent` routing surface, not direct CLI model slugs");
    expect(contract).toContain("gpt-5.6-luna-plus-pro-max");
    expect(contract).toContain("gpt-5.6-terra-plus-pro-medium");
    expect(contract).toContain("gpt-5.6-terra-plus-pro-high");
    expect(contract).toContain("gpt-5.6-sol-plus-pro-high");
    expect(contract).toContain("openai-codex/gpt-5.3-codex-spark");
    expect(contract).toContain("replace superseded entries here");
  });

  test("removes the completed Luna pilot machinery from the active bundle", () => {
    const skill = readFileSync(skillPath, "utf8");
    const contract = readFileSync(contractPath, "utf8");

    expect(existsSync(retiredPilotPath)).toBe(false);
    expect(skill).not.toContain("pilot record");
    expect(contract).not.toContain("## Luna Max pilot record");
    expect(contract).not.toContain("pilot-record.ts");
    expect(contract).not.toContain(".agent-state/model-pilots");
  });

  test("keeps human verification on the structured Goal owner", () => {
    const skill = readFileSync(skillPath, "utf8");
    const contract = readFileSync(contractPath, "utf8");

    expect(skill).toContain("Never claim or verify a human-owned\ncriterion");
    expect(skill).toContain("Add evidence before `claim_criterion`");
    expect(contract).toContain("Required human-owned criteria are verified by Mahiro, not self-verified");
  });
});
