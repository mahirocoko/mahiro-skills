import { createHash } from "node:crypto";
import { constants, closeSync, existsSync, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, readSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

export const MAX_RECORDS = 500;
export const MAX_IMPORT_RECORDS = 2000;
export const CAPTURE_TIMEOUT_MS = 30_000;
export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_EVENT_BYTES = 64 * 1024;
export const rubrics = {
  efficiency: { highly_efficient: 1, mostly_efficient: 0.8, mostly_inefficient: 0.4, highly_inefficient: 0.2 },
  code_quality: { approve: 1, block: 0.2 },
  procedure_compliance: { fully_compliant: 1, mostly_compliant: 0.8, noncompliant: 0.2 },
  verbosity: { proportionate: 1, verbose: 0.2, terse: 0.1 },
} as const;
export type Axis = keyof typeof rubrics;
export type Cause = "missing/wrong_instruction" | "ignored_existing_instruction" | "code_product_infra" | "model_variance" | "insufficient_evidence";
export interface Scope { agent: string; conversation: string; end: string; out: string; approved: boolean }
export interface PiScope { session: string; leaf: string; source: string; end: string; out: string; approved: boolean }
type DatasetScope = Omit<Scope, "approved"> | Omit<PiScope, "approved">;
export interface SourceRecord {
  id: string; date: string; agent_id: string; conversation_id: string; message_type: string;
  message?: unknown; text?: unknown; content?: unknown; tool_call?: unknown; tool_return?: unknown;
  [key: string]: unknown;
}
export interface Event {
  id: string; date: string; kind: "user" | "assistant" | "tool_call" | "tool_request" | "tool_return";
  humanOrigin: "not_established" | "not_applicable"; contextMarkers: string[];
  sourceType: string; sourceHash: string; originalBytes: number; clipped: boolean; omittedContentBlocks: number; data: unknown;
  // A transport return does not establish that the command or tests succeeded.
  outcome: "not_inferred";
}
export interface Omission { id: string; type: string; reason: string; sourceHash: string }
export interface Page { index: number; bytes: number; sha256: string; records: number }
export interface Dataset {
  schema: 1; scope: DatasetScope; source: "letta-cli" | "letta-json-import" | "pi-jsonl-import";
  events: Event[]; omissions: Omission[]; pages: Page[];
  limits: { records: number; captures: 1; bytes: number; eventBytes: number };
  history: { partial: true; recordCapReached: boolean; start: string | null; end: string; stop: string; errors: string[]; details: string; baseline: "unknown" };
}
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const bytes = (text: string) => Buffer.byteLength(text);
function fail(message: string): never { throw new Error(message); }
export function gate(scope: Scope) {
  if (!scope.approved || !scope.agent?.trim() || !scope.conversation?.trim() || !scope.out || !isAbsolute(scope.out)) fail("Explicit approved agent, conversation and absolute output directory required");
  if ([scope.agent, scope.conversation].some(id => ["default", "all", "*"].includes(id))) fail("Explicit IDs required, not default or wildcard scope");
  if (!scope.end || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(scope.end) || !Number.isFinite(Date.parse(scope.end))) fail("Fixed valid ISO end timestamp required");
  freshOutput(scope.out);
}
function parsePage(raw: string, scope: Scope, limit: number): SourceRecord[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) fail("Expected exact Letta JSON array");
  if (parsed.length > limit) fail(`Source exceeds ${limit} records`);
  // Verify every identity, including omitted and after-cutoff records, before normalizing any.
  for (const record of parsed) {
    if (!record || typeof record !== "object" || record.agent_id !== scope.agent || record.conversation_id !== scope.conversation) fail("Foreign or missing record identity");
    if (typeof record.id !== "string" || !record.id || typeof record.date !== "string" || !Number.isFinite(Date.parse(record.date)) || typeof record.message_type !== "string") fail("Invalid record metadata");
  }
  return parsed;
}
function normalize(record: SourceRecord): Event | Omission {
  const raw = JSON.stringify(record);
  const sourceHash = hash(raw);
  const kind = ({ user_message: "user", assistant_message: "assistant", tool_call_message: "tool_call", approval_request_message: "tool_request", tool_return_message: "tool_return" } as const)[record.message_type as "user_message"];
  if (!kind) return { id: record.id, type: record.message_type, reason: "Non-visible, reasoning, system, summary or unsupported event type", sourceHash };
  // Summaries may arrive with a visible role but an explicit summary marker.
  if (record.is_summary === true || record.is_compaction === true || record.message_type.includes("summary")) return { id: record.id, type: record.message_type, reason: "Compaction/summary is not human evidence", sourceHash };
  const data = Object.fromEntries(["message", "text", "content", "tool_call", "tool_return", "tool_calls", "tool_call_id", "status"].filter(key => key in record).map(key => [key, record[key]]));
  let omittedContentBlocks = 0;
  if (Array.isArray(data.content)) {
    data.content = data.content.filter(block => {
      const type = block && typeof block === "object" ? block.type : undefined;
      if (["reasoning", "thinking", "redacted_thinking", "summary", "compaction", "system"].includes(type)) { omittedContentBlocks++; return false; }
      return true;
    });
  }
  const text = JSON.stringify(data);
  const clipped = bytes(text) > MAX_EVENT_BYTES;
  // These literal transport wrappers flag provenance review, not proof of who authored the text.
  const contextMarkers = kind === "user" ? ["system-reminder", "system-alert", "task-notification", "available_skills"].filter(marker => text.includes(`<${marker}>`)) : [];
  return { id: record.id, date: record.date, kind, humanOrigin: kind === "user" ? "not_established" : "not_applicable", contextMarkers, sourceType: record.message_type, sourceHash, originalBytes: bytes(raw), clipped, omittedContentBlocks,
    data: clipped ? { clippedJsonPrefix: Buffer.from(text).subarray(0, MAX_EVENT_BYTES).toString("utf8") } : data, outcome: "not_inferred" };
}
export type FetchCapture = () => Promise<string>;
export async function prepare(scope: Scope, fetch: FetchCapture, source: "letta-cli" | "letta-json-import"): Promise<Dataset> {
  gate(scope); // This is deliberately before fetch or any source read.
  const raw = await fetch(); // Source failures are refusals; never salvage broken JSON.
  if (bytes(raw) > MAX_BYTES) fail("Source exceeds byte budget");
  const limit = source === "letta-cli" ? MAX_RECORDS : MAX_IMPORT_RECORDS;
  const records = parsePage(raw, scope, limit); // All identities verified before normalization.
  const capped = records.length === limit;
  const dataset: Dataset = { schema: 1, scope: { agent: scope.agent, conversation: scope.conversation, end: scope.end, out: scope.out }, source, events: [], omissions: [], pages: [{ index: 0, bytes: bytes(raw), sha256: hash(raw), records: records.length }], limits: { records: limit, captures: 1, bytes: MAX_BYTES, eventBytes: MAX_EVENT_BYTES },
    history: { partial: true, recordCapReached: capped, start: null, end: scope.end, stop: capped ? "record_limit" : source === "letta-cli" ? "native_capture_end" : "import_end", errors: [], details: "One bounded capture only, without cursor pagination. Reaching the record cap means possibly truncated history. Fewer records do not prove full history; earlier compaction, missing records and historical instructions may be unavailable. User wire roles do not establish human authorship.", baseline: "unknown" } };
  let lastDate = -Infinity;
  const seen = new Set<string>();
  let cutoff = false;
  for (const record of records) {
    if (seen.has(record.id)) fail("Repeated record ID in native capture/import; refusing ambiguous evidence");
    seen.add(record.id);
    const date = Date.parse(record.date);
    if (date < lastDate) fail("Source is not ordered ascending");
    lastDate = date;
    if (date > Date.parse(scope.end)) { cutoff = true; dataset.omissions.push({ id: record.id, type: record.message_type, reason: "After fixed collection cutoff", sourceHash: hash(JSON.stringify(record)) }); continue; }
    dataset.history.start ??= record.date;
    const normalized = normalize(record);
    if ("kind" in normalized) dataset.events.push(normalized); else dataset.omissions.push(normalized);
  }
  if (cutoff && !capped) dataset.history.stop = "fixed_end_reached";
  return dataset;
}
// command/timeout injection is for fixture tests only; neither is exposed by the CLI.
export async function collectRaw(scope: Scope, command: string[] = ["letta"], timeoutMs = CAPTURE_TIMEOUT_MS): Promise<string> {
  gate(scope);
  const capture = mkdtempSync(join(resolve(scope.out, ".."), ".skill-doctor-capture-"));
  let stdoutFd: number | undefined;
  let stderrFd: number | undefined;
  let process: ReturnType<typeof Bun.spawn> | undefined;
  let monitor: ReturnType<typeof setInterval> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let refusal: string | undefined;
  try {
    stdoutFd = openSync(join(capture, "stdout.json"), "wx", 0o600);
    stderrFd = openSync(join(capture, "stderr.txt"), "wx", 0o600);
    const args = [...command, "messages", "list", "--agent", scope.agent, "--conversation", scope.conversation, "--order", "asc", "--limit", String(MAX_RECORDS)];
    // Direct regular-file descriptors avoid the native CLI's observed pipe truncation.
    process = Bun.spawn(args, { stdout: stdoutFd, stderr: stderrFd });
    const stop = (reason: string) => { refusal ??= reason; process!.kill(); };
    monitor = setInterval(() => {
      if (fstatSync(stdoutFd!).size > MAX_BYTES || fstatSync(stderrFd!).size > MAX_BYTES) stop("Native capture exceeds byte budget");
    }, 5);
    timer = setTimeout(() => stop("Native capture timed out"), timeoutMs);
    const exit = await process.exited;
    if (refusal) fail(refusal);
    if (fstatSync(stdoutFd).size > MAX_BYTES || fstatSync(stderrFd).size > MAX_BYTES) fail("Native capture exceeds byte budget");
    const stderr = readFileSync(join(capture, "stderr.txt"), "utf8");
    if (exit !== 0) fail(`Letta CLI exit ${exit}: ${stderr}`);
    if (stderr.trim()) fail(`Letta CLI diagnostic (not silently discarded): ${stderr}`);
    return readFileSync(join(capture, "stdout.json"), "utf8");
  } finally {
    if (monitor) clearInterval(monitor);
    if (timer) clearTimeout(timer);
    if (process && process.exitCode === null) { process.kill(); await process.exited; }
    if (stdoutFd !== undefined) closeSync(stdoutFd);
    if (stderrFd !== undefined) closeSync(stderrFd);
    rmSync(capture, { recursive: true, force: true });
  }
}
// Pi import is a raw branch-history projection, never a replay of model context.
export function gatePi(scope: PiScope) {
  if (!scope.approved || !nonempty(scope.session) || !nonempty(scope.leaf) || [scope.session, scope.leaf].some(id => ["default", "all", "*"].includes(id))) fail("Explicit approved Pi session and leaf IDs required");
  if (!scope.source || !isAbsolute(scope.source)) fail("Explicit absolute Pi source required");
  // Reuse output/cutoff safety without manufacturing an agent identity in artifacts.
  gate({ agent: scope.session, conversation: scope.leaf, end: scope.end, out: scope.out, approved: scope.approved });
}
function readPiSource(path: string): string {
  // Refuse redirection, special files and oversized input before allocating a capture.
  let part = path;
  while (part !== resolve(part, "..")) {
    if (lstatSync(part).isSymbolicLink()) fail("Symlink Pi source refused; select its resolved path explicitly");
    part = resolve(part, "..");
  }
  // O_NONBLOCK also prevents a raced-in FIFO from hanging before fstat.
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) fail("Pi source must be a regular file");
    if (stat.size > MAX_BYTES) fail("Pi source exceeds byte budget");
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(fd, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
    }
    if (length > MAX_BYTES) fail("Pi source exceeds byte budget");
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, length));
  } finally { closeSync(fd); }
}
export async function preparePi(scope: PiScope, fetch: FetchCapture = async () => readPiSource(scope.source)): Promise<Dataset> {
  gatePi(scope); // No source stat, read, discovery or output creation before approval.
  const raw = await fetch();
  if (bytes(raw) > MAX_BYTES) fail("Pi source exceeds byte budget");
  const lines = raw.split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.length > MAX_IMPORT_RECORDS + 1) fail("Pi source exceeds record budget");
  const rows = lines.map(line => {
    let value: any;
    try { value = JSON.parse(line); } catch { fail("Malformed Pi JSONL record"); }
    if (!value || typeof value !== "object" || Array.isArray(value)) fail("Invalid Pi record");
    return { value, line };
  });
  const header = rows.shift()?.value;
  const iso = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
  if (!header || header.type !== "session" || header.version !== 3 || header.id !== scope.session || !iso(header.timestamp) || !nonempty(header.cwd) || "parentId" in header) fail("Pi v3 session identity/header mismatch");
  const entries = new Map<string, typeof rows[number]>();
  // Validate the entire capture, including other branches and records after cutoff.
  for (const row of rows) {
    const entry = row.value;
    if (!nonempty(entry.id) || entries.has(entry.id) || !nonempty(entry.type) || entry.type === "session" || !iso(entry.timestamp)) fail("Invalid or duplicate Pi entry metadata");
    if (entry.parentId !== null && (!nonempty(entry.parentId) || !entries.has(entry.parentId))) fail("Pi parent missing, forward or cyclic");
    // Forks preserve historical entry timestamps under a newer session header.
    if (entry.type === "message") {
      const message = entry.message;
      if (!message || !nonempty(message.role) || !Number.isFinite(message.timestamp) || message.timestamp < 0) fail("Invalid Pi message metadata");
      if (["user", "assistant", "toolResult"].includes(message.role)) {
        if (!(typeof message.content === "string" && message.role === "user") && !Array.isArray(message.content)) fail("Invalid Pi message content");
        if (Array.isArray(message.content)) for (const block of message.content) {
          if (!block || !nonempty(block.type)) fail("Invalid Pi content block");
          if (block.type === "text" && typeof block.text !== "string") fail("Invalid Pi text block");
          if (block.type === "toolCall" && (message.role !== "assistant" || !nonempty(block.id) || !nonempty(block.name) || !block.arguments || typeof block.arguments !== "object" || Array.isArray(block.arguments))) fail("Invalid Pi tool call");
        }
        if (message.role === "toolResult" && (!nonempty(message.toolCallId) || !nonempty(message.toolName) || typeof message.isError !== "boolean")) fail("Invalid Pi tool result");
      }
    }
    entries.set(entry.id, row);
  }
  if (!entries.has(scope.leaf)) fail("Explicit Pi leaf not found");
  const selected = new Set<string>();
  let cursor: string | null = scope.leaf;
  while (cursor !== null) { selected.add(cursor); cursor = entries.get(cursor)!.value.parentId; }
  const { approved, ...datasetScope } = scope;
  const capped = rows.length === MAX_IMPORT_RECORDS;
  const dataset: Dataset = { schema: 1, scope: datasetScope, source: "pi-jsonl-import", events: [], omissions: [], pages: [{ index: 0, bytes: bytes(raw), sha256: hash(raw), records: rows.length + 1 }], limits: { records: MAX_IMPORT_RECORDS, captures: 1, bytes: MAX_BYTES, eventBytes: MAX_EVENT_BYTES }, history: { partial: true, recordCapReached: capped, start: null, end: scope.end, stop: capped ? "record_limit" : "import_end", errors: [], details: "Pi v3 raw selected ancestry only, not model-context replay. Header counts in page records, not entry cap. Other branches, system, thinking, summaries, custom/extension messages, context edits and non-message entries omitted. Original pre-compaction messages may remain; edits/compaction are not applied. Images, signatures and tool-result details/nested metadata omitted. No agent identity or human authorship established. Historical instructions and completeness unknown.", baseline: "unknown" } };
  for (const { value: entry, line } of rows) {
    const sourceHash = hash(line);
    const omit = (reason: string) => dataset.omissions.push({ id: entry.id, type: entry.type, reason, sourceHash });
    if (!selected.has(entry.id)) { omit("Outside explicitly selected Pi ancestry"); continue; }
    if (Date.parse(entry.timestamp) > Date.parse(scope.end) || (entry.type === "message" && entry.message.timestamp > Date.parse(scope.end))) { omit("After fixed collection cutoff"); if (!capped) dataset.history.stop = "fixed_end_reached"; continue; }
    const message = entry.message;
    if (entry.type !== "message" || !["user", "assistant", "toolResult"].includes(message.role)) { omit("Non-visible, system, summary or unsupported Pi entry/role"); continue; }
    let omittedContentBlocks = 0;
    const content = typeof message.content === "string" ? message.content : message.content.flatMap((block: any) => {
      if (block.type === "text") return [{ type: "text", text: block.text }];
      if (block.type === "toolCall") return [{ type: "toolCall", id: block.id, name: block.name, arguments: block.arguments, ...(typeof block.namespace === "string" ? { namespace: block.namespace } : {}) }];
      omittedContentBlocks++; return [];
    });
    if (Array.isArray(content) && !content.length) { omit("No visible supported Pi content blocks"); continue; }
    const kind = message.role === "toolResult" ? "tool_return" : message.role as "user" | "assistant";
    const data = { content, ...(kind === "tool_return" ? { tool_call_id: message.toolCallId, tool_name: message.toolName, isError: message.isError } : {}) };
    const text = JSON.stringify(data);
    const clipped = bytes(text) > MAX_EVENT_BYTES;
    dataset.history.start ??= entry.timestamp;
    dataset.events.push({ id: entry.id, date: entry.timestamp, kind, humanOrigin: kind === "user" ? "not_established" : "not_applicable", contextMarkers: kind === "user" ? ["system-reminder", "system-alert", "task-notification", "available_skills"].filter(marker => text.includes(`<${marker}>`)) : [], sourceType: `pi.message.${message.role}`, sourceHash, originalBytes: bytes(line), clipped, omittedContentBlocks, data: clipped ? { clippedJsonPrefix: Buffer.from(text).subarray(0, MAX_EVENT_BYTES).toString("utf8") } : data, outcome: "not_inferred" });
  }
  return dataset;
}
export interface AxisResult { label: string; score: number | null; reason: string; evidence: string[] }
export interface Episode { id: string; failed: boolean; axes: Axis[]; evidence: string[]; positive: string[]; counter: string[]; explanation: string; cause: Cause; confidence: "low" | "medium" | "high" }
export interface Recommendation { episode: string; owner: string; change: string; instructionEvidence: string[]; rationale: string }
export interface Report {
  schema: 1; evaluator: { independent: true; session: string }; limitations: string[];
  axes: Record<Axis, AxisResult>; episodes: Episode[]; recommendations: Recommendation[]; abstention: string;
}
const causes: Cause[] = ["missing/wrong_instruction", "ignored_existing_instruction", "code_product_infra", "model_variance", "insufficient_evidence"];
function nonempty(value: unknown): value is string { return typeof value === "string" && !!value.trim(); }
export function validateReport(input: unknown, dataset: Dataset): Report {
  const report = input as Report;
  if (!report || report.schema !== 1 || report.evaluator?.independent !== true || !nonempty(report.evaluator.session)) fail("Fresh independent evaluator session must be declared");
  if (Object.keys(report).some(key => !["schema", "evaluator", "limitations", "axes", "episodes", "recommendations", "abstention"].includes(key))) fail("Unexpected report field");
  if (!Array.isArray(report.limitations) || !report.limitations.length || !report.limitations.every(nonempty)) fail("Explicit limitations required");
  const ids = new Set(dataset.events.map(event => event.id));
  const citations = (values: unknown, required = false) => {
    if (!Array.isArray(values) || (required && !values.length) || !values.every(id => typeof id === "string" && ids.has(id))) fail("Invalid or omitted-event citation");
  };
  if (!report.axes || Object.keys(report.axes).length !== 4 || !Object.keys(rubrics).every(axis => axis in report.axes)) fail("Exactly four rubric axes required");
  for (const axis of Object.keys(rubrics) as Axis[]) {
    const result = report.axes[axis];
    if (!result || !nonempty(result.reason)) fail("Axis reason required");
    const expected = (rubrics[axis] as Record<string, number>)[result.label];
    if (result.label === "insufficient_evidence") { if (result.score !== null) fail("Insufficient evidence must have null score"); }
    else if (expected === undefined || expected !== result.score) fail(`Rubric label/score mismatch: ${axis}`);
    citations(result.evidence, result.label !== "insufficient_evidence");
  }
  if (!Array.isArray(report.episodes) || !Array.isArray(report.recommendations)) fail("Episodes and recommendations must be arrays");
  const episodeIds = new Set<string>();
  for (const episode of report.episodes) {
    if (!nonempty(episode.id) || episodeIds.has(episode.id) || typeof episode.failed !== "boolean" || !nonempty(episode.explanation) || !causes.includes(episode.cause) || !["low", "medium", "high"].includes(episode.confidence)) fail("Invalid episode attribution");
    episodeIds.add(episode.id);
    if (!Array.isArray(episode.axes) || !episode.axes.length || !episode.axes.every(axis => Object.hasOwn(rubrics, axis))) fail("Invalid episode axes");
    citations(episode.evidence, true); citations(episode.positive); citations(episode.counter);
  }
  for (const axis of Object.keys(rubrics) as Axis[]) {
    const score = report.axes[axis].score;
    if (score !== null && score < 0.5 && !report.episodes.some(episode => episode.failed && episode.axes.includes(axis))) fail("Failing axis requires a cited failed episode");
  }
  for (const recommendation of report.recommendations) {
    const episode = report.episodes.find(item => item.id === recommendation.episode);
    if (!episode?.failed || episode.cause !== "missing/wrong_instruction" || episode.confidence === "low") fail("Recommendation requires supported missing/wrong instruction in a failed episode");
    if (!episode.axes.some(axis => report.axes[axis].score !== null && report.axes[axis].score! < 0.5)) fail("Recommendation needs an applicable failing rubric score");
    if (!nonempty(recommendation.owner) || !nonempty(recommendation.change) || !nonempty(recommendation.rationale)) fail("Recommendation owner, change and instruction rationale required");
    citations(recommendation.instructionEvidence, true);
    if (!recommendation.instructionEvidence.every(id => episode.evidence.includes(id) || episode.counter.includes(id))) fail("Instruction evidence must belong to the cited episode");
  }
  if (!report.recommendations.length && !nonempty(report.abstention)) fail("Explain legitimate abstention");
  return report;
}
export function renderReport(report: Report, dataset: Dataset): string {
  const safe = (value: unknown) => String(value).replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "\\|").replace(/`/g, "\\`");
  const lines = ["# Skill Doctor — visible behavior diagnosis", "", "Candidate diagnosis only; no automatic changes or human approval implied.", "", `Scope: ${"session" in dataset.scope ? `Pi session ${safe(dataset.scope.session)} / leaf ${safe(dataset.scope.leaf)}` : `${safe(dataset.scope.agent)} / ${safe(dataset.scope.conversation)}`}; cutoff ${safe(dataset.scope.end)}`, `History: partial; ${safe(dataset.history.stop)}. Baseline/version: unknown.`, `Source pages: ${dataset.pages.length}; events: ${dataset.events.length}; omissions: ${dataset.omissions.length}; clipped: ${dataset.events.filter(event => event.clipped).length}.`, ...dataset.history.errors.map(error => `Source error: ${safe(error)}`), "", "## Rubric results", "", "| Axis | Label | Raw score | Evidence / reason |", "| --- | --- | --- | --- |"];
  if (dataset.source === "pi-jsonl-import") lines.splice(7, 0, `Pi projection: raw selected ancestry, NOT reconstructed model context. ${safe(dataset.history.details)}`);
  for (const [axis, result] of Object.entries(report.axes)) lines.push(`| ${axis} | ${result.label} | ${result.score ?? "not scored"} | ${safe(result.evidence.join(", "))}: ${safe(result.reason)} |`);
  lines.push("", "Scores describe observed behavior, not causal proof of skill quality. No curved overall grade or substring-derived coverage.", "", "## Episodes");
  for (const episode of report.episodes) lines.push("", `### ${safe(episode.id)} (${episode.failed ? "failed" : "positive/neutral"})`, `${safe(episode.cause)}; confidence ${episode.confidence}. ${safe(episode.explanation)}`, `Evidence: ${safe(episode.evidence.join(", "))}`, `Positive: ${safe(episode.positive.join(", ")) || "none visible"}; counter: ${safe(episode.counter.join(", ")) || "none visible"}`);
  lines.push("", "## Candidate recommendations");
  for (const recommendation of report.recommendations) lines.push(`- ${safe(recommendation.owner)}: ${safe(recommendation.change)} (${safe(recommendation.episode)}; ${safe(recommendation.instructionEvidence.join(", "))}). ${safe(recommendation.rationale)}`);
  if (!report.recommendations.length) lines.push(safe(report.abstention));
  lines.push("", "## Limitations", ...report.limitations.map(item => `- ${safe(item)}`), "");
  return lines.join("\n");
}
function freshOutput(out: string) {
  if (!isAbsolute(out) || lstatSync(out, { throwIfNoEntry: false })) fail("Fresh absolute output directory required; refusing overwrite");
  // No symlink output parent: selected output must not redirect writes elsewhere.
  let parent = resolve(out, "..");
  if (!existsSync(parent) || !lstatSync(parent).isDirectory()) fail("Existing output parent directory required");
  while (parent !== resolve(parent, "..")) { if (lstatSync(parent).isSymbolicLink()) fail("Symlink output parent refused; select its resolved path explicitly"); parent = resolve(parent, ".."); }
}
export function writeArtifacts(out: string, artifacts: Record<string, string>) {
  freshOutput(out);
  if (Object.keys(artifacts).some(name => !["manifest.json", "events.json", "report.json", "report.md"].includes(name))) fail("Unexpected artifact name");
  mkdirSync(out, { recursive: false, mode: 0o700 });
  for (const [name, text] of Object.entries(artifacts)) {
    if (!["manifest.json", "events.json", "report.json", "report.md"].includes(name)) fail("Unexpected artifact name");
    writeFileSync(join(out, name), text, { flag: "wx", mode: 0o600 });
  }
}
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
export async function main(argv: string[]) {
  const [command, ...args] = argv;
  const options: Record<string, string> = {};
  const allowed = new Set(["agent", "conversation", "end", "out", "source", "dataset", "report", "approve-scope", "session", "leaf"]);
  for (let i = 0; i < args.length; i++) {
    const name = args[i]?.replace(/^--/, "");
    if (!args[i]?.startsWith("--") || !allowed.has(name) || name in options) fail("Unknown or duplicate option");
    if (name === "approve-scope") options[name] = "true";
    else { if (!args[i + 1] || args[i + 1].startsWith("--")) fail("Missing option value"); options[name] = args[++i]; }
  }
  const scope: Scope = { agent: options.agent, conversation: options.conversation, end: options.end, out: options.out, approved: options["approve-scope"] === "true" };
  const piScope: PiScope = { session: options.session, leaf: options.leaf, source: options.source, end: options.end, out: options.out, approved: options["approve-scope"] === "true" };
  const pi = command === "import-pi" || (command === "render" && ("session" in options || "leaf" in options));
  if (pi) {
    if ("agent" in options || "conversation" in options) fail("Pi scope has no agent/conversation identity");
    gatePi(piScope);
  } else {
    if ("session" in options || "leaf" in options) fail("Pi IDs require import-pi or Pi render");
    gate(scope);
  }
  if (command === "import-pi") {
    const dataset = await preparePi(piScope);
    const { events, ...manifest } = dataset;
    writeArtifacts(piScope.out, { "manifest.json": json(manifest), "events.json": json(events) });
  } else if (command === "import" || command === "collect") {
    if (command === "import" && (!options.source || !isAbsolute(options.source))) fail("Explicit absolute source required");
    const dataset = await prepare(scope, command === "collect" ? () => collectRaw(scope) : async () => {
      const file = Bun.file(options.source); if (file.size > MAX_BYTES) fail("Import exceeds byte budget"); return file.text();
    }, command === "collect" ? "letta-cli" : "letta-json-import");
    if (!dataset.pages.length) fail(`No usable pages: ${dataset.history.errors.join("; ")}`);
    const { events, ...manifest } = dataset;
    writeArtifacts(scope.out, { "manifest.json": json(manifest), "events.json": json(events) });
  } else if (command === "render") {
    if (!options.dataset || !isAbsolute(options.dataset) || !options.report || !isAbsolute(options.report)) fail("Explicit absolute dataset and report paths required");
    // A selected artifact directory only; no discovery, DB reads or HOME scans.
    const manifest = JSON.parse(readFileSync(join(options.dataset, "manifest.json"), "utf8"));
    if (pi ? manifest.source !== "pi-jsonl-import" || manifest.scope?.session !== piScope.session || manifest.scope?.leaf !== piScope.leaf || manifest.scope?.source !== piScope.source || manifest.scope?.end !== piScope.end : manifest.source === "pi-jsonl-import" || manifest.scope?.agent !== scope.agent || manifest.scope?.conversation !== scope.conversation || manifest.scope?.end !== scope.end) fail("Dataset scope mismatch");
    const dataset: Dataset = { ...manifest, events: JSON.parse(readFileSync(join(options.dataset, "events.json"), "utf8")) };
    const report = validateReport(JSON.parse(readFileSync(options.report, "utf8")), dataset);
    writeArtifacts(scope.out, { "report.json": json(report), "report.md": renderReport(report, dataset) });
  } else fail("Use import, import-pi, collect or render");
}
if (import.meta.main) main(Bun.argv.slice(2)).catch(error => { console.error(String(error)); process.exitCode = 1; });
