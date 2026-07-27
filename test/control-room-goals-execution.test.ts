import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  LUNA_MAX_MODEL,
  createPilotRecord,
  validatePilotRecord,
  type IWorkflowPilotRecord,
} from "../skills/control-room-goals/scripts/pilot-record";

const repoRoot = join(import.meta.dir, "..");
const skillPath = join(repoRoot, "skills", "control-room-goals", "SKILL.md");
const contractPath = join(repoRoot, "skills", "control-room-goals", "references", "execution-contract.md");
const scriptPath = join(repoRoot, "skills", "control-room-goals", "scripts", "pilot-record.ts");

function createRecord(): IWorkflowPilotRecord {
  return createPilotRecord({
    taskId: "long-task-01",
    objective: "Finish one long implementation task through verification",
    workspace: repoRoot,
    conversationId: "local-conv-test",
    deliverableType: "file",
    deliverableReference: "src/example.ts",
    criteria: ["Focused tests pass"],
    startedAt: "2026-07-27T02:00:00.000Z",
  });
}

describe("control-room-goals execution contract", () => {
  test("documents the bounded state, routing, and installed validator contract", () => {
    const skill = readFileSync(skillPath, "utf8");
    const contract = readFileSync(contractPath, "utf8");

    expect(skill).toContain("[execution-contract.md](references/execution-contract.md)");
    expect(skill).toContain("planning → executing → verifying → done");
    expect(skill).toContain("does not claim that a\nskill can intercept a provider turn");
    expect(contract).toContain("`turn complete`, a tool result, a subagent report");
    expect(contract).toContain(LUNA_MAX_MODEL);
    expect(contract).toContain("gpt-5.6-terra-plus-pro-medium");
    expect(contract).toContain("gpt-5.6-terra-plus-pro-high");
    expect(contract).toContain("gpt-5.6-sol-plus-pro-high");
    expect(contract).toContain("openai-codex/gpt-5.3-codex-spark");
    expect(contract).toContain('SKILL_DIR="/absolute/path/to/installed/control-room-goals"');
    expect(contract).toContain('bun "$SKILL_DIR/scripts/pilot-record.ts" validate');
    expect(contract).toContain("## Not established yet");
  });

  test("creates a valid planning record with an explicit Luna Max route", () => {
    const record = createRecord();
    const result = validatePilotRecord(record);

    expect(result.ok).toBe(true);
    expect(record.state).toBe("planning");
    expect(record.routing.mainModel).toBe(LUNA_MAX_MODEL);
    expect(record.metrics.continuePrompts).toBe(0);
    expect(record.metrics.recordedCostUsd).toBeNull();
  });

  test("requires evidence and finished metrics before a done claim", () => {
    const record = createRecord();
    record.state = "done";
    const result = validatePilotRecord(record);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("done requires finishedAt");
    expect(result.errors).toContain("done requires every required criterion to pass");
    expect(result.errors).toContain("done requires evidence");
    expect(result.errors).toContain("done requires verificationCoverage");
    expect(result.errors).toContain("done requires metrics.dodFirstClaim");
    expect(result.errors).toContain("done requires metrics.elapsedMs");
  });

  test("accepts an evidence-backed done record with explicit subagent routing", () => {
    const record = createRecord();
    record.state = "done";
    record.finishedAt = "2026-07-27T02:15:00.000Z";
    record.routing.subagents.push({
      role: "routine verifier",
      model: "gpt-5.6-terra-plus-pro-medium",
      outcome: "useful",
      elapsedMs: 30_000,
      artifact: "Focused test report",
    });
    record.evidence.push({
      id: "test-01",
      kind: "test",
      reference: "bun test test/example.test.ts",
      summary: "Focused tests passed",
    });
    record.criteria[0].status = "passed";
    record.criteria[0].evidenceRefs = ["test-01"];
    record.verificationCoverage = ["focused unit tests"];
    record.metrics.dodFirstClaim = true;
    record.metrics.elapsedMs = 900_000;

    expect(validatePilotRecord(record)).toEqual({
      ok: true,
      errors: [],
      state: "done",
      requiredCriteria: 1,
      passedRequiredCriteria: 1,
    });
  });

  test("rejects inherited routing and mismatched stopped-agent telemetry", () => {
    const record = createRecord();
    record.routing.subagents.push({
      role: "broad research",
      model: "inherit",
      outcome: "stopped-without-output",
      elapsedMs: 300_000,
      artifact: null,
    });
    const result = validatePilotRecord(record);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("routing.subagents[0].model must be explicit and cannot be inherit");
    expect(result.errors).toContain("metrics.stoppedSubagentsWithoutOutput must match routed subagent outcomes");
  });

  test("rejects self-passed human criteria without Mahiro verification provenance", () => {
    const record = createRecord();
    record.criteria[0].owner = "human";
    record.criteria[0].status = "passed";
    record.criteria[0].evidenceRefs = ["test-01"];
    record.evidence.push({
      id: "test-01",
      kind: "test",
      reference: "bun test",
      summary: "Automated tests passed",
    });
    const result = validatePilotRecord(record);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("criteria[0] human-owned pass requires Mahiro verification provenance and user evidence");
  });

  test("accepts a human criterion only with explicit Mahiro and user evidence", () => {
    const record = createRecord();
    record.criteria[0].owner = "human";
    record.criteria[0].status = "passed";
    record.criteria[0].evidenceRefs = ["user-01"];
    record.criteria[0].verifiedBy = "mahiro";
    record.criteria[0].verifiedAt = "2026-07-27T02:10:00.000Z";
    record.evidence.push({
      id: "user-01",
      kind: "user",
      reference: "local-conv-test:message-42",
      summary: "Mahiro explicitly accepted the criterion",
    });

    expect(validatePilotRecord(record).ok).toBe(true);
  });

  test("rejects evidence kinds outside the declared audit vocabulary", () => {
    const record = createRecord();
    record.evidence.push({
      id: "invalid-01",
      kind: "invented-kind" as "test",
      reference: "nowhere",
      summary: "Invalid evidence category",
    });
    const result = validatePilotRecord(record);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("evidence[0].kind is invalid");
  });

  test("runs the installed-style init and validate commands", () => {
    const root = mkdtempSync(join(tmpdir(), "luna-pilot-"));
    const recordPath = join(root, "pilot.json");
    try {
      const init = Bun.spawnSync([
        "bun",
        scriptPath,
        "init",
        "--output",
        recordPath,
        "--task-id",
        "pilot-cli-01",
        "--objective",
        "Exercise the pilot CLI",
        "--workspace",
        repoRoot,
        "--conversation-id",
        "local-conv-test",
        "--deliverable-type",
        "file",
        "--deliverable-ref",
        "pilot.json",
        "--criterion",
        "The record validates",
      ]);
      expect(init.exitCode).toBe(0);

      const validate = Bun.spawnSync(["bun", scriptPath, "validate", recordPath]);
      expect(validate.exitCode).toBe(0);
      expect(JSON.parse(validate.stdout.toString())).toMatchObject({ ok: true, state: "planning" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
