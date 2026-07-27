#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, isAbsolute, resolve } from "path";

export const PILOT_SCHEMA_VERSION = 1;
export const PILOT_TOOL_VERSION = "1.0.0";
export const LUNA_MAX_MODEL = "gpt-5.6-luna-plus-pro-max";

const STATES = ["planning", "executing", "verifying", "done", "needs_human", "blocked"] as const;
const DELIVERABLE_TYPES = ["chat", "file", "commit", "PR", "runtime-proof", "other"] as const;
const CRITERION_STATUSES = ["pending", "passed", "failed", "blocked"] as const;
const SUBAGENT_OUTCOMES = ["planned", "useful", "partial", "stopped-without-output", "failed"] as const;
const EVIDENCE_KINDS = ["file", "command", "test", "browser", "native", "manual", "user", "other"] as const;

type PilotState = typeof STATES[number];
type DeliverableType = typeof DELIVERABLE_TYPES[number];
type CriterionStatus = typeof CRITERION_STATUSES[number];
type SubagentOutcome = typeof SUBAGENT_OUTCOMES[number];

export interface IPilotCriterion {
  id: string;
  text: string;
  owner: "agent" | "human";
  required: boolean;
  status: CriterionStatus;
  evidenceRefs: string[];
  verifiedBy: "mahiro" | null;
  verifiedAt: string | null;
}

export interface IPilotEvidence {
  id: string;
  kind: "file" | "command" | "test" | "browser" | "native" | "manual" | "user" | "other";
  reference: string;
  summary: string;
}

export interface IPilotSubagent {
  role: string;
  model: string;
  outcome: SubagentOutcome;
  elapsedMs: number | null;
  artifact: string | null;
}

export interface IWorkflowPilotRecord {
  schemaVersion: number;
  toolVersion: string;
  kind: "mahiro-gpt-5.6-luna-pilot";
  taskId: string;
  objective: string;
  workspace: string;
  conversationId: string;
  state: PilotState;
  startedAt: string;
  finishedAt: string | null;
  deliverable: {
    type: DeliverableType;
    reference: string;
  };
  routing: {
    mainModel: string;
    subagents: IPilotSubagent[];
  };
  criteria: IPilotCriterion[];
  evidence: IPilotEvidence[];
  verificationCoverage: string[];
  metrics: {
    continuePrompts: number;
    prematureReports: number;
    toolErrors: number;
    compactions: number;
    stoppedSubagentsWithoutOutput: number;
    defects: number;
    reworkActions: number;
    dodFirstClaim: boolean | null;
    elapsedMs: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    cacheReadTokens: number | null;
    recordedCostUsd: number | null;
  };
  blocker: string | null;
  nextHumanAction: string | null;
  notes: string[];
}

export interface IPilotValidationResult {
  ok: boolean;
  errors: string[];
  state?: PilotState;
  requiredCriteria?: number;
  passedRequiredCriteria?: number;
}

interface ICreatePilotInput {
  taskId: string;
  objective: string;
  workspace: string;
  conversationId: string;
  deliverableType: DeliverableType;
  deliverableReference: string;
  criteria: string[];
  startedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isNonNegativeNumberOrNull(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function uniqueNonEmptyStrings(values: unknown): values is string[] {
  return Array.isArray(values) && values.every(isNonEmptyString) && new Set(values).size === values.length;
}

export function createPilotRecord(input: ICreatePilotInput): IWorkflowPilotRecord {
  const startedAt = input.startedAt ?? new Date().toISOString();
  return {
    schemaVersion: PILOT_SCHEMA_VERSION,
    toolVersion: PILOT_TOOL_VERSION,
    kind: "mahiro-gpt-5.6-luna-pilot",
    taskId: input.taskId,
    objective: input.objective,
    workspace: resolve(input.workspace),
    conversationId: input.conversationId,
    state: "planning",
    startedAt,
    finishedAt: null,
    deliverable: {
      type: input.deliverableType,
      reference: input.deliverableReference,
    },
    routing: {
      mainModel: LUNA_MAX_MODEL,
      subagents: [],
    },
    criteria: input.criteria.map((text, index) => ({
      id: `criterion-${String(index + 1).padStart(2, "0")}`,
      text,
      owner: "agent",
      required: true,
      status: "pending",
      evidenceRefs: [],
      verifiedBy: null,
      verifiedAt: null,
    })),
    evidence: [],
    verificationCoverage: [],
    metrics: {
      continuePrompts: 0,
      prematureReports: 0,
      toolErrors: 0,
      compactions: 0,
      stoppedSubagentsWithoutOutput: 0,
      defects: 0,
      reworkActions: 0,
      dodFirstClaim: null,
      elapsedMs: null,
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      recordedCostUsd: null,
    },
    blocker: null,
    nextHumanAction: null,
    notes: [],
  };
}

export function validatePilotRecord(value: unknown): IPilotValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["record must be a JSON object"] };
  }

  if (value.schemaVersion !== PILOT_SCHEMA_VERSION) errors.push(`schemaVersion must be ${PILOT_SCHEMA_VERSION}`);
  if (value.toolVersion !== PILOT_TOOL_VERSION) errors.push(`toolVersion must be ${PILOT_TOOL_VERSION}`);
  if (value.kind !== "mahiro-gpt-5.6-luna-pilot") errors.push("kind must be mahiro-gpt-5.6-luna-pilot");
  if (!isNonEmptyString(value.taskId) || !/^[a-z0-9][a-z0-9._-]*$/.test(value.taskId)) errors.push("taskId must be a lowercase filesystem-safe token");
  if (!isNonEmptyString(value.objective)) errors.push("objective is required");
  if (!isNonEmptyString(value.workspace) || !isAbsolute(value.workspace)) errors.push("workspace must be an absolute path");
  if (!isNonEmptyString(value.conversationId)) errors.push("conversationId is required");
  if (!STATES.includes(value.state as PilotState)) errors.push(`state must be one of: ${STATES.join(", ")}`);
  if (!isIsoTimestamp(value.startedAt)) errors.push("startedAt must be an ISO timestamp");
  if (value.finishedAt !== null && !isIsoTimestamp(value.finishedAt)) errors.push("finishedAt must be null or an ISO timestamp");

  const deliverable = isRecord(value.deliverable) ? value.deliverable : undefined;
  if (!deliverable) {
    errors.push("deliverable is required");
  } else {
    if (!DELIVERABLE_TYPES.includes(deliverable.type as DeliverableType)) errors.push(`deliverable.type must be one of: ${DELIVERABLE_TYPES.join(", ")}`);
    if (!isNonEmptyString(deliverable.reference)) errors.push("deliverable.reference is required");
  }

  const routing = isRecord(value.routing) ? value.routing : undefined;
  const subagents = routing && Array.isArray(routing.subagents) ? routing.subagents : [];
  if (!routing) {
    errors.push("routing is required");
  } else {
    if (routing.mainModel !== LUNA_MAX_MODEL) errors.push(`routing.mainModel must be ${LUNA_MAX_MODEL} for this pilot`);
    if (!Array.isArray(routing.subagents)) errors.push("routing.subagents must be an array");
  }

  for (const [index, candidate] of subagents.entries()) {
    const prefix = `routing.subagents[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!isNonEmptyString(candidate.role)) errors.push(`${prefix}.role is required`);
    if (!isNonEmptyString(candidate.model) || candidate.model === "inherit") errors.push(`${prefix}.model must be explicit and cannot be inherit`);
    if (!SUBAGENT_OUTCOMES.includes(candidate.outcome as SubagentOutcome)) errors.push(`${prefix}.outcome is invalid`);
    if (!isNonNegativeNumberOrNull(candidate.elapsedMs)) errors.push(`${prefix}.elapsedMs must be non-negative or null`);
    if (candidate.artifact !== null && !isNonEmptyString(candidate.artifact)) errors.push(`${prefix}.artifact must be non-empty or null`);
  }

  const criteria = Array.isArray(value.criteria) ? value.criteria : [];
  if (criteria.length === 0) errors.push("criteria must contain at least one item");
  const criterionIds: string[] = [];
  let requiredCriteria = 0;
  let passedRequiredCriteria = 0;
  for (const [index, candidate] of criteria.entries()) {
    const prefix = `criteria[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!isNonEmptyString(candidate.id)) errors.push(`${prefix}.id is required`);
    else criterionIds.push(candidate.id);
    if (!isNonEmptyString(candidate.text)) errors.push(`${prefix}.text is required`);
    if (candidate.owner !== "agent" && candidate.owner !== "human") errors.push(`${prefix}.owner must be agent or human`);
    if (typeof candidate.required !== "boolean") errors.push(`${prefix}.required must be boolean`);
    if (!CRITERION_STATUSES.includes(candidate.status as CriterionStatus)) errors.push(`${prefix}.status is invalid`);
    if (!uniqueNonEmptyStrings(candidate.evidenceRefs)) errors.push(`${prefix}.evidenceRefs must contain unique non-empty strings`);
    if (candidate.verifiedBy !== null && candidate.verifiedBy !== "mahiro") errors.push(`${prefix}.verifiedBy must be mahiro or null`);
    if (candidate.verifiedAt !== null && !isIsoTimestamp(candidate.verifiedAt)) errors.push(`${prefix}.verifiedAt must be null or an ISO timestamp`);
    if (candidate.owner === "agent" && (candidate.verifiedBy !== null || candidate.verifiedAt !== null)) errors.push(`${prefix} agent-owned criteria cannot carry human verification provenance`);
    if (candidate.required === true) {
      requiredCriteria += 1;
      if (candidate.status === "passed") passedRequiredCriteria += 1;
    }
  }
  if (new Set(criterionIds).size !== criterionIds.length) errors.push("criterion ids must be unique");

  const evidence = Array.isArray(value.evidence) ? value.evidence : [];
  const evidenceIds: string[] = [];
  for (const [index, candidate] of evidence.entries()) {
    const prefix = `evidence[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!isNonEmptyString(candidate.id)) errors.push(`${prefix}.id is required`);
    else evidenceIds.push(candidate.id);
    if (!EVIDENCE_KINDS.includes(candidate.kind as typeof EVIDENCE_KINDS[number])) errors.push(`${prefix}.kind is invalid`);
    if (!isNonEmptyString(candidate.reference)) errors.push(`${prefix}.reference is required`);
    if (!isNonEmptyString(candidate.summary)) errors.push(`${prefix}.summary is required`);
  }
  if (new Set(evidenceIds).size !== evidenceIds.length) errors.push("evidence ids must be unique");

  const evidenceIdSet = new Set(evidenceIds);
  for (const [index, candidate] of criteria.entries()) {
    if (!isRecord(candidate) || !Array.isArray(candidate.evidenceRefs)) continue;
    for (const ref of candidate.evidenceRefs) {
      if (typeof ref === "string" && !evidenceIdSet.has(ref)) errors.push(`criteria[${index}].evidenceRefs references missing evidence: ${ref}`);
    }
    if (candidate.owner === "human" && candidate.status === "passed") {
      const hasUserEvidence = candidate.evidenceRefs.some((ref) => evidence.some((item) => isRecord(item) && item.id === ref && item.kind === "user"));
      if (candidate.verifiedBy !== "mahiro" || !isIsoTimestamp(candidate.verifiedAt) || !hasUserEvidence) {
        errors.push(`criteria[${index}] human-owned pass requires Mahiro verification provenance and user evidence`);
      }
    }
  }

  if (!uniqueNonEmptyStrings(value.verificationCoverage)) errors.push("verificationCoverage must contain unique non-empty strings");
  if (!Array.isArray(value.notes) || !value.notes.every(isNonEmptyString)) errors.push("notes must be an array of non-empty strings");

  const metrics = isRecord(value.metrics) ? value.metrics : undefined;
  const counterNames = ["continuePrompts", "prematureReports", "toolErrors", "compactions", "stoppedSubagentsWithoutOutput", "defects", "reworkActions"];
  if (!metrics) {
    errors.push("metrics is required");
  } else {
    for (const name of counterNames) {
      const count = metrics[name];
      if (!Number.isInteger(count) || (count as number) < 0) errors.push(`metrics.${name} must be a non-negative integer`);
    }
    for (const name of ["elapsedMs", "inputTokens", "outputTokens", "cacheReadTokens", "recordedCostUsd"]) {
      if (!isNonNegativeNumberOrNull(metrics[name])) errors.push(`metrics.${name} must be non-negative or null`);
    }
    if (metrics.dodFirstClaim !== null && typeof metrics.dodFirstClaim !== "boolean") errors.push("metrics.dodFirstClaim must be boolean or null");
    const stopped = subagents.filter((candidate) => isRecord(candidate) && candidate.outcome === "stopped-without-output").length;
    if (metrics.stoppedSubagentsWithoutOutput !== stopped) errors.push("metrics.stoppedSubagentsWithoutOutput must match routed subagent outcomes");
  }

  const state = STATES.includes(value.state as PilotState) ? value.state as PilotState : undefined;
  if (state === "done") {
    if (!isIsoTimestamp(value.finishedAt)) errors.push("done requires finishedAt");
    if (requiredCriteria === 0 || passedRequiredCriteria !== requiredCriteria) errors.push("done requires every required criterion to pass");
    for (const [index, candidate] of criteria.entries()) {
      if (isRecord(candidate) && candidate.required === true && candidate.status === "passed" && (!Array.isArray(candidate.evidenceRefs) || candidate.evidenceRefs.length === 0)) {
        errors.push(`done requires evidenceRefs for required criteria[${index}]`);
      }
    }
    if (evidence.length === 0) errors.push("done requires evidence");
    if (!Array.isArray(value.verificationCoverage) || value.verificationCoverage.length === 0) errors.push("done requires verificationCoverage");
    if (!metrics || typeof metrics.dodFirstClaim !== "boolean") errors.push("done requires metrics.dodFirstClaim");
    if (!metrics || typeof metrics.elapsedMs !== "number") errors.push("done requires metrics.elapsedMs");
    if (value.blocker !== null) errors.push("done cannot keep a blocker");
    if (value.nextHumanAction !== null) errors.push("done cannot keep nextHumanAction");
  }
  if (state === "blocked" && !isNonEmptyString(value.blocker)) errors.push("blocked requires blocker");
  if (state === "needs_human" && !isNonEmptyString(value.nextHumanAction)) errors.push("needs_human requires nextHumanAction");
  if (value.blocker !== null && !isNonEmptyString(value.blocker)) errors.push("blocker must be non-empty or null");
  if (value.nextHumanAction !== null && !isNonEmptyString(value.nextHumanAction)) errors.push("nextHumanAction must be non-empty or null");

  return { ok: errors.length === 0, errors, state, requiredCriteria, passedRequiredCriteria };
}

function parseFlags(tokens: string[]): Map<string, string[]> {
  const flags = new Map<string, string[]>();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    if (token === "--force") {
      flags.set(token, ["true"]);
      continue;
    }
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
    flags.set(token, [...(flags.get(token) ?? []), value]);
    index += 1;
  }
  return flags;
}

function requiredFlag(flags: Map<string, string[]>, name: string): string {
  const value = flags.get(name)?.at(-1);
  if (!isNonEmptyString(value)) throw new Error(`Missing required flag ${name}`);
  return value;
}

function usage(): string {
  return [
    "Usage:",
    "  pilot-record.ts init --output <path> --task-id <id> --objective <text> --workspace <path> --conversation-id <id> --deliverable-type <type> --deliverable-ref <ref> --criterion <text> [--criterion <text>] [--force]",
    "  pilot-record.ts validate <record.json>",
  ].join("\n");
}

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  if (command === "init") {
    const flags = parseFlags(rest);
    const output = resolve(requiredFlag(flags, "--output"));
    if (existsSync(output) && !flags.has("--force")) throw new Error(`Record already exists: ${output}`);
    const deliverableType = requiredFlag(flags, "--deliverable-type") as DeliverableType;
    if (!DELIVERABLE_TYPES.includes(deliverableType)) throw new Error(`Unsupported deliverable type: ${deliverableType}`);
    const criteria = flags.get("--criterion") ?? [];
    if (criteria.length === 0) throw new Error("At least one --criterion is required");
    const record = createPilotRecord({
      taskId: requiredFlag(flags, "--task-id"),
      objective: requiredFlag(flags, "--objective"),
      workspace: requiredFlag(flags, "--workspace"),
      conversationId: requiredFlag(flags, "--conversation-id"),
      deliverableType,
      deliverableReference: requiredFlag(flags, "--deliverable-ref"),
      criteria,
    });
    const validation = validatePilotRecord(record);
    if (!validation.ok) throw new Error(validation.errors.join("\n"));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, output, state: record.state }, null, 2));
    return;
  }

  if (command === "validate") {
    const [recordPath, ...extra] = rest;
    if (!recordPath || extra.length > 0) throw new Error(usage());
    const absolutePath = resolve(recordPath);
    const validation = validatePilotRecord(JSON.parse(readFileSync(absolutePath, "utf8")));
    console.log(JSON.stringify({ ...validation, record: absolutePath }, null, 2));
    if (!validation.ok) process.exitCode = 1;
    return;
  }

  throw new Error(usage());
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
