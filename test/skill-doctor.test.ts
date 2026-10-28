import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { MAX_BYTES, MAX_EVENT_BYTES, MAX_IMPORT_RECORDS, MAX_RECORDS, preparePi, type PiScope, collectRaw, main, prepare, renderReport, rubrics, validateReport, writeArtifacts, type Dataset, type Report, type Scope, type SourceRecord } from "../skills/skill-doctor/scripts/doctor";

const directories: string[] = [];
function sandbox() { const path = mkdtempSync(join(realpathSync(tmpdir()), "skill-doctor-test-")); directories.push(path); return path; }
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });
function scope(): Scope { return { agent: "agent-fixture", conversation: "conv-fixture", end: "2026-10-09T13:00:00.000Z", out: join(sandbox(), "new-output"), approved: true }; }
function record(id = "m1", overrides: Partial<SourceRecord> = {}): SourceRecord { return { id, agent_id: "agent-fixture", conversation_id: "conv-fixture", date: "2026-10-09T12:00:00.000Z", message_type: "user_message", text: "Visible fixture, not real history", ...overrides }; }
async function fixture(): Promise<Dataset> { return prepare(scope(), async () => JSON.stringify([record(), record("m2", { message_type: "assistant_message", text: "Done with a visible caveat" })]), "letta-json-import"); }
function report(): Report { return { schema: 1, evaluator: { independent: true, session: "fixture-only-independent-declaration" }, limitations: ["Synthetic partial history; baseline unknown"], axes: {
  efficiency: { label: "mostly_efficient", score: 0.8, reason: "One small correction in this synthetic fixture", evidence: ["m2"] },
  code_quality: { label: "insufficient_evidence", score: null, reason: "No visible code diff", evidence: [] },
  procedure_compliance: { label: "insufficient_evidence", score: null, reason: "Standing instructions unavailable", evidence: [] },
  verbosity: { label: "proportionate", score: 1, reason: "Short visible completion", evidence: ["m2"] },
}, episodes: [{ id: "positive", failed: false, axes: ["verbosity"], evidence: ["m2"], positive: ["m2"], counter: [], explanation: "No counterexample visible in the fixture", cause: "insufficient_evidence", confidence: "low" }], recommendations: [], abstention: "No instruction gap established" }; }
function failingReport(): Report {
  const value = report();
  value.axes.efficiency = { label: "mostly_inefficient", score: 0.4, reason: "Synthetic waste requiring review", evidence: ["m2"] };
  value.episodes.push({ id: "failure", failed: true, axes: ["efficiency"], evidence: ["m1", "m2"], positive: ["m2"], counter: [], explanation: "Fixture diagnosis; no counterevidence visible", cause: "code_product_infra", confidence: "medium" });
  return value;
}

describe("bounded scope and evidence preparation", () => {
  test("scope gate precedes source reads and refuses implicit selection", async () => {
    let reads = 0;
    for (const invalid of [{ agent: "" }, { conversation: "" }, { conversation: "default" }, { approved: false }, { end: "" }, { out: "relative" }]) {
      await expect(prepare({ ...scope(), ...invalid }, async () => { reads++; return "[]"; }, "letta-cli")).rejects.toThrow();
    }
    expect(reads).toBe(0);
    await expect(main(["import", "--source", "/not-read", "--out", join(sandbox(), "new-output")])).rejects.toThrow("Explicit approved");
  });
  test("foreign record anywhere in the page is refused before processing", async () => {
    const selected = scope();
    for (const foreign of [{ agent_id: "foreign" }, { conversation_id: "foreign" }, { agent_id: undefined }, { conversation_id: undefined }]) {
      await expect(prepare(selected, async () => JSON.stringify([record(), record("foreign", { message_type: "system_message", date: "2027-01-01T00:00:00Z", ...foreign })]), "letta-cli")).rejects.toThrow("identity");
      expect(existsSync(selected.out)).toBe(false);
    }
  });
  test("fixed cutoff excludes collector's own future calls without following them", async () => {
    const selected = scope(); let calls = 0;
    const value = await prepare(selected, async () => { calls++; return JSON.stringify([...Array.from({ length: 99 }, (_, i) => record(`past-${i}`)), record("own-call", { date: "2026-10-09T13:00:01Z", message_type: "tool_call_message", tool_call: { command: "collect again" } })]); }, "letta-cli");
    expect(calls).toBe(1); expect(value.history.stop).toBe("fixed_end_reached");
    expect(value.events).toHaveLength(99); expect(value.omissions.at(-1)?.id).toBe("own-call");
  });
  test("hidden summaries/reasoning omitted and counted, tool result retained without outcome inference", async () => {
    const raw = JSON.stringify([record(), record("reason", { message_type: "reasoning_message", text: "secret thought" }), record("system", { message_type: "system_message", text: "summary of prior user" }), record("summary", { is_summary: true }), record("blocks", { message_type: "assistant_message", content: [{ type: "reasoning", text: "hidden" }, { type: "text", text: "visible" }] }), record("tool", { message_type: "tool_return_message", status: "success", tool_call_id: "call-fixture", tool_return: { transport: "success", exit_code: 1, text: "Tests failed" } })]);
    const value = await prepare(scope(), async () => raw, "letta-json-import");
    expect(value.omissions.map(item => item.id)).toEqual(["reason", "system", "summary"]);
    expect(value.events.map(item => item.id)).toEqual(["m1", "blocks", "tool"]);
    expect(value.events[1].omittedContentBlocks).toBe(1);
    expect(JSON.stringify(value.events)).not.toContain("secret thought");
    expect(value.events[2].data).toEqual({ text: "Visible fixture, not real history", status: "success", tool_call_id: "call-fixture", tool_return: { transport: "success", exit_code: 1, text: "Tests failed" } });
    expect(value.events[2].outcome).toBe("not_inferred");
    expect(value.pages[0].sha256).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(value.history.partial).toBe(true); expect(value.history.baseline).toBe("unknown");
  });
  test("one-shot source errors and repeated IDs are hard refusals", async () => {
    let calls = 0;
    await expect(prepare(scope(), async () => { calls++; throw new Error("exit 2: source unavailable"); }, "letta-cli")).rejects.toThrow("exit 2");
    expect(calls).toBe(1);
    await expect(prepare(scope(), async () => JSON.stringify([record(), record()]), "letta-cli")).rejects.toThrow("Repeated record ID");
  });
  test("hard record/byte caps, malformed source, sort order and clipping", async () => {
    let calls = 0;
    const capped = await prepare(scope(), async () => { calls++; return JSON.stringify(Array.from({ length: MAX_RECORDS }, (_, i) => record(`m${i}`))); }, "letta-cli");
    expect(calls).toBe(1); expect(capped.pages).toHaveLength(1); expect(capped.history.stop).toBe("record_limit"); expect(capped.history.recordCapReached).toBe(true); expect(capped.history.partial).toBe(true);
    await expect(prepare(scope(), async () => " ".repeat(MAX_BYTES + 1), "letta-cli")).rejects.toThrow("byte budget");
    await expect(prepare(scope(), async () => JSON.stringify(Array.from({ length: MAX_RECORDS + 1 }, (_, i) => record(`m${i}`))), "letta-cli")).rejects.toThrow("records");
    await expect(prepare(scope(), async () => "not json", "letta-cli")).rejects.toThrow();
    await expect(prepare(scope(), async () => JSON.stringify([record("later", { date: "2026-10-09T12:01:00Z" }), record()]), "letta-cli")).rejects.toThrow("ascending");
    const clipped = await prepare(scope(), async () => JSON.stringify([record("long", { text: "x".repeat(MAX_EVENT_BYTES + 100) })]), "letta-json-import");
    expect(clipped.events[0].clipped).toBe(true); expect(clipped.events[0].originalBytes).toBeGreaterThan(MAX_EVENT_BYTES);
    expect(clipped.events[0].sourceHash).toHaveLength(64);
    expect(clipped.events[0].data).toHaveProperty("clippedJsonPrefix");
  });
  test("exact JSON imports may contain up to 2000 scoped records", async () => {
    const value = await prepare(scope(), async () => JSON.stringify(Array.from({ length: 101 }, (_, i) => record(`m${i}`))), "letta-json-import");
    expect(value.events).toHaveLength(101); expect(value.history.stop).toBe("import_end");
  });
  test("no overwrite before fetching or writing", async () => {
    const selected = scope(); writeArtifacts(selected.out, { "events.json": "[]" });
    let reads = 0;
    await expect(prepare(selected, async () => { reads++; return "[]"; }, "letta-cli")).rejects.toThrow("overwrite");
    expect(reads).toBe(0);
    expect(() => writeArtifacts(selected.out, { "events.json": "changed" })).toThrow("overwrite");
    expect(readFileSync(join(selected.out, "events.json"), "utf8")).toBe("[]");
  });
});

function mockCommand(raw: string, suffix = "") {
  const fixturePath = join(sandbox(), "native-fixture.json"); writeFileSync(fixturePath, raw);
  return ["bun", "-e", `const fs = require("node:fs"); if (!fs.fstatSync(1).isFile() || !fs.fstatSync(2).isFile()) process.exit(91); const args = process.argv; if (args.includes("--after") || !args.includes("${MAX_RECORDS}")) process.exit(92); fs.writeSync(1, fs.readFileSync(${JSON.stringify(fixturePath)})); ${suffix}`];
}

describe("native regular-file adapter (mocked command only)", () => {
  test("captures more than 64KiB once, preserves exact hash, and cleans private raw secrets", async () => {
    const selected = scope(); const parent = resolve(selected.out, "..");
    const raw = JSON.stringify([...Array.from({ length: 263 }, (_, i) => record(`m${i}`, { text: "x".repeat(1000) })), record("secret", { message_type: "system_message", text: "RAW_SECRET_MUST_NOT_SURVIVE" })]);
    expect(Buffer.byteLength(raw)).toBeGreaterThan(64 * 1024);
    const dataset = await prepare(selected, () => collectRaw(selected, mockCommand(raw)), "letta-cli");
    expect(dataset.events).toHaveLength(263); expect(dataset.pages[0].sha256).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(dataset.history.stop).toBe("native_capture_end"); expect(dataset.history.partial).toBe(true);
    expect(JSON.stringify(dataset)).not.toContain("RAW_SECRET_MUST_NOT_SURVIVE");
    expect(readdirSync(parent)).toEqual([]);
  });
  test("malformed, foreign and repeated-record captures refuse without leaving raw files", async () => {
    for (const raw of ["[{broken", JSON.stringify([record(), record("foreign", { agent_id: "other", date: "2027-01-01T00:00:00Z" })]), JSON.stringify([record(), record()])]) {
      const selected = scope();
      await expect(prepare(selected, () => collectRaw(selected, mockCommand(raw)), "letta-cli")).rejects.toThrow();
      expect(readdirSync(resolve(selected.out, ".."))).toEqual([]); expect(existsSync(selected.out)).toBe(false);
    }
  });
  test("native source errors, stderr, timeout and growing byte cap fail and clean captures", async () => {
    for (const command of [mockCommand("[]", "process.exit(3)"), mockCommand("[]", 'require("node:fs").writeSync(2, "diagnostic");'), mockCommand("[]", "setInterval(() => {}, 1000)"), mockCommand("x".repeat(MAX_BYTES + 1))]) {
      const selected = scope();
      await expect(collectRaw(selected, command, 1000)).rejects.toThrow();
      expect(readdirSync(resolve(selected.out, ".."))).toEqual([]);
    }
    // Write slowly enough for the growing-file monitor to terminate the producer before exit.
    const selected = scope();
    const streaming = ["bun", "-e", 'const fs = require("node:fs"); setInterval(() => fs.writeSync(1, "x".repeat(1024 * 1024)), 5);'];
    await expect(collectRaw(selected, streaming, 2000)).rejects.toThrow("byte budget");
    expect(readdirSync(resolve(selected.out, ".."))).toEqual([]);
  });
  test("existing output prevents even invoking the native command", async () => {
    const selected = scope(); writeArtifacts(selected.out, { "events.json": "[]" });
    const sentinel = join(resolve(selected.out, ".."), "invoked");
    await expect(collectRaw(selected, ["bun", "-e", `require("node:fs").writeFileSync(${JSON.stringify(sentinel)}, "bad")`])).rejects.toThrow("overwrite");
    expect(existsSync(sentinel)).toBe(false); expect(readdirSync(resolve(selected.out, ".."))).toEqual(["new-output"]);
  });
});

test("approval requests are citable attempted tools, not execution proof", async () => {
  const dataset = await prepare(scope(), async () => JSON.stringify([record(), record("m2", { message_type: "approval_request_message", tool_call: { name: "Bash", arguments: { command: "test" } } })]), "letta-json-import");
  expect(dataset.events[1].kind).toBe("tool_request"); expect(dataset.events[1].outcome).toBe("not_inferred");
  expect(dataset.events[1].data).toHaveProperty("tool_call"); expect(validateReport(report(), dataset)).toEqual(report());
});

test("user wire roles and automation wrappers never establish human directives", async () => {
  const records = [record(), record("alert", { content: "<system-alert>Earlier conversation summary</system-alert>" }), record("notify", { text: "<task-notification>Background task finished</task-notification>" }), record("skill", { content: [{ type: "text", text: "<system-reminder>Injected skill instructions</system-reminder>" }] }), record("summary", { is_compaction: true, content: "Hidden human-looking summary" })];
  const dataset = await prepare(scope(), async () => JSON.stringify(records), "letta-json-import");
  expect(dataset.events.map(event => event.humanOrigin)).toEqual(Array(4).fill("not_established"));
  expect(dataset.events[1].contextMarkers).toEqual(["system-alert"]); expect(dataset.events[2].contextMarkers).toEqual(["task-notification"]); expect(dataset.events[3].contextMarkers).toEqual(["system-reminder"]);
  expect(dataset.events[1].data).toHaveProperty("content"); expect(dataset.omissions[0].id).toBe("summary");
  expect(JSON.stringify(dataset.events)).not.toContain("Hidden human-looking summary");
});

describe("independent report validation", () => {
  test("legitimate abstention on every axis and normal positive evidence", async () => {
    const data = await fixture();
    expect(validateReport(report(), data)).toEqual(report());
    const empty = report();
    for (const axis of Object.keys(rubrics) as (keyof typeof rubrics)[]) empty.axes[axis] = { label: "insufficient_evidence", score: null, reason: "History unavailable", evidence: [] };
    empty.episodes = [];
    expect(validateReport(empty, data).recommendations).toHaveLength(0);
    const rendered = renderReport(empty, data);
    expect(rendered).toContain("not scored"); expect(rendered).toContain("No instruction gap"); expect(rendered).toContain("History: partial");
  });
  test("bad labels/scores, extra axes, invented citations and missing independence fail", async () => {
    const data = await fixture();
    for (const mutate of [
      (value: Report) => { value.axes.efficiency.score = 0.9; },
      (value: Report) => { value.axes.code_quality.score = 0.5; },
      (value: Report) => { value.axes.verbosity.evidence = ["invented"]; },
      (value: Report) => { value.evaluator.independent = false as true; },
      (value: Report) => { (value.axes as unknown as Record<string, unknown>).extra = {}; },
      (value: Report) => { value.abstention = ""; },
    ]) { const value = report(); mutate(value); expect(() => validateReport(value, data)).toThrow(); }
    const omitted = await prepare(scope(), async () => JSON.stringify([record(), record("summary", { message_type: "system_message" })]), "letta-json-import");
    const value = report(); value.axes.efficiency.evidence = ["summary"];
    expect(() => validateReport(value, omitted)).toThrow("citation");
  });
  test("Markdown escapes citation punctuation rather than deleting native identifiers", async () => {
    const data = await fixture(); const value = report();
    value.axes.efficiency.evidence = ["native|tool`request"];
    value.axes.efficiency.reason = "Literal <script> must not become HTML";
    const rendered = renderReport(value, data);
    expect(rendered).toContain("native\\|tool\\`request");
    expect(rendered).toContain("&lt;script&gt;");
    expect(rendered).not.toContain("nativetoolrequest");
  });
  test("invented instruction improvements rejected; actual supported gap eligible", async () => {
    const data = await fixture(); const value = failingReport();
    expect(validateReport(value, data).recommendations).toEqual([]); // Infra failure can legitimately abstain.
    value.recommendations = [{ episode: "failure", owner: "selected procedure", change: "candidate check", instructionEvidence: ["m1"], rationale: "Fixture instruction gap rationale" }];
    expect(() => validateReport(value, data)).toThrow("missing/wrong");
    value.episodes[1].cause = "ignored_existing_instruction";
    expect(() => validateReport(value, data)).toThrow("missing/wrong");
    value.episodes[1].cause = "missing/wrong_instruction";
    expect(validateReport(value, data).recommendations).toHaveLength(1);
    value.episodes[1].confidence = "low";
    expect(() => validateReport(value, data)).toThrow();
    value.episodes[1].confidence = "medium"; value.recommendations[0].owner = "";
    expect(() => validateReport(value, data)).toThrow("owner");
  });
  test("failing scores need cited failed episodes, no forced cause quota", async () => {
    const data = await fixture(); const value = failingReport();
    expect(validateReport(value, data)).toBe(value);
    value.episodes = []; expect(() => validateReport(value, data)).toThrow("failed episode");
    expect(() => validateReport({ ...report(), improvements: ["unsupported extra recommendation"] }, data)).toThrow("Unexpected");
  });
  test("corrected failed episodes do not force a worse overall grade or authorize proposals", async () => {
    const data = await fixture(); const value = failingReport();
    value.axes.efficiency = { label: "mostly_efficient", score: 0.8, reason: "Intermediate defect corrected before closeout", evidence: ["m2"] };
    expect(validateReport(value, data)).toBe(value);
    value.episodes[1].cause = "missing/wrong_instruction";
    value.recommendations = [{ episode: "failure", owner: "selected procedure", change: "candidate check", instructionEvidence: ["m1"], rationale: "Fixture instruction gap rationale" }];
    expect(() => validateReport(value, data)).toThrow("failing rubric score");
  });
});

test("native CLI import and Markdown/JSON rendering smoke without live history", async () => {
  const selected = scope(); const root = resolve(import.meta.dir, ".."); const script = join(root, "skills/skill-doctor/scripts/doctor.ts");
  const parent = resolve(selected.out, ".."); const source = join(parent, "source.json"); writeFileSync(source, JSON.stringify([record(), record("m2", { message_type: "assistant_message" })]));
  const common = ["--agent", selected.agent, "--conversation", selected.conversation, "--end", selected.end, "--approve-scope"];
  const imported = Bun.spawnSync(["bun", script, "import", ...common, "--source", source, "--out", selected.out]);
  expect(imported.exitCode).toBe(0); expect(existsSync(join(selected.out, "manifest.json"))).toBe(true);
  const authored = join(parent, "authored.json"); writeFileSync(authored, JSON.stringify(report()));
  const rendered = join(parent, "rendered");
  const result = Bun.spawnSync(["bun", script, "render", ...common, "--dataset", selected.out, "--report", authored, "--out", rendered]);
  expect(result.exitCode).toBe(0); expect(JSON.parse(readFileSync(join(rendered, "report.json"), "utf8")).axes.code_quality.score).toBeNull();
  expect(readFileSync(join(rendered, "report.md"), "utf8")).toContain("No instruction gap");
  const refused = Bun.spawnSync(["bun", script, "render", ...common, "--dataset", selected.out, "--report", authored, "--out", rendered]);
  expect(refused.exitCode).not.toBe(0);
});

function piScope(): PiScope { const out = join(sandbox(), "output"); return { session: "fixture-pi-session", leaf: "m2", source: join(resolve(out, ".."), "session.jsonl"), end: "2026-10-09T13:00:00.000Z", out, approved: true }; }
function piEntry(id: string, parentId: string | null, message: Record<string, unknown> = { role: "user", content: "Fixture only" }, extra: Record<string, unknown> = {}) {
  return { type: "message", id, parentId, timestamp: "2026-10-09T12:00:00.000Z", message: { timestamp: Date.parse("2026-10-09T12:00:00.000Z"), ...message }, ...extra };
}
function piRaw(entries: Record<string, unknown>[] = [piEntry("m1", null), piEntry("m2", "m1", { role: "assistant", content: [{ type: "text", text: "Visible response" }] })], header: Record<string, unknown> = {}) {
  return [{ type: "session", version: 3, id: "fixture-pi-session", timestamp: "2026-10-09T11:00:00Z", cwd: "/synthetic", ...header }, ...entries].map(value => JSON.stringify(value)).join("\n") + "\n";
}
describe("explicit bounded Pi JSONL import", () => {
  test("approval, exact IDs, absolute source, cutoff and fresh output gate before source callback", async () => {
    let reads = 0;
    for (const invalid of [{ approved: false }, { session: "" }, { session: "all" }, { leaf: "" }, { leaf: "*" }, { source: "relative" }, { end: "now" }, { out: "relative" }]) {
      await expect(preparePi({ ...piScope(), ...invalid }, async () => { reads++; return piRaw(); })).rejects.toThrow();
    }
    const selected = piScope(); writeArtifacts(selected.out, { "events.json": "[]" });
    await expect(preparePi(selected, async () => { reads++; return piRaw(); })).rejects.toThrow("overwrite");
    expect(reads).toBe(0);
    await expect(main(["import-pi", "--source", "/definitely-not-read", "--session", "fixture-pi-session", "--leaf", "m2", "--end", selected.end, "--out", join(sandbox(), "new")])).rejects.toThrow("approved");
  });
  test("explicit ancestry, multiple roots, hidden blocks, calls/results and exact hashes", async () => {
    const entries = [
      piEntry("system", null, { role: "system", content: "SYSTEM_SECRET", sections: { secret: "SECTION_SECRET" } }),
      piEntry("m1", "system", { role: "user", content: "<system-alert>Visible wrapper</system-alert>" }),
      piEntry("abandoned", "m1", { role: "assistant", content: [{ type: "text", text: "OTHER_BRANCH_SECRET" }] }),
      piEntry("root2", null, { role: "user", content: "OTHER_ROOT_SECRET" }),
      piEntry("compact", "m1", {}, { type: "compaction", summary: "COMPACTION_SECRET" }),
      piEntry("summary", "compact", {}, { type: "branch_summary", summary: "BRANCH_SUMMARY_SECRET" }),
      piEntry("custom", "summary", {}, { type: "custom_message", content: "CUSTOM_SECRET", display: false }),
      piEntry("m2", "custom", { role: "assistant", content: [
        { type: "thinking", thinking: "THINKING_SECRET", thinkingSignature: "SIGNATURE_SECRET" },
        { type: "thinking", redacted: true, thinkingSignature: "REDACTED_SECRET" },
        { type: "text", text: "Visible", textSignature: "TEXT_SIGNATURE_SECRET" },
        { type: "toolCall", id: "call1", name: "bash", arguments: { command: "false" }, thoughtSignature: "THOUGHT_SIGNATURE_SECRET", namespace: "tools" },
      ] }),
      piEntry("result", "m2", { role: "toolResult", toolCallId: "call1", toolName: "bash", isError: false, details: { secret: "DETAILS_SECRET" }, content: [{ type: "text", text: "Tests failed; exit 1" }, { type: "image", data: "IMAGE_SECRET", mimeType: "image/png" }] }),
      piEntry("edit", "result", {}, { type: "context_edit", targetId: "m1", replacement: "EDIT_SECRET" }),
    ];
    const selected = { ...piScope(), leaf: "edit" }; const raw = piRaw(entries);
    const data = await preparePi(selected, async () => raw);
    expect(data.events.map(event => event.id)).toEqual(["m1", "m2", "result"]);
    expect(data.scope).not.toHaveProperty("agent"); expect(data.scope).not.toHaveProperty("conversation");
    expect(data.pages[0].sha256).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(data.events[1].sourceHash).toBe(createHash("sha256").update(JSON.stringify(entries[7])).digest("hex"));
    expect(data.events[1].originalBytes).toBe(Buffer.byteLength(JSON.stringify(entries[7])));
    expect(data.events[1].omittedContentBlocks).toBe(2);
    expect(data.events[1].data).toEqual({ content: [{ type: "text", text: "Visible" }, { type: "toolCall", id: "call1", name: "bash", arguments: { command: "false" }, namespace: "tools" }] });
    expect(data.events[2].data).toEqual({ content: [{ type: "text", text: "Tests failed; exit 1" }], tool_call_id: "call1", tool_name: "bash", isError: false });
    expect(data.events[2].outcome).toBe("not_inferred"); expect(data.events[0].humanOrigin).toBe("not_established");
    expect(data.events[0].contextMarkers).toEqual(["system-alert"]);
    expect(JSON.stringify(data)).not.toContain("SECRET");
    expect(data.omissions).toHaveLength(entries.length - 3);
    expect(data.history.details).toContain("not applied");
    expect(validateReport(report(), data)).toEqual(report());
    expect(renderReport(report(), data)).toContain("Pi session fixture-pi-session / leaf edit");
    expect(renderReport(report(), data)).toContain("NOT reconstructed model context");
    const invalid = report(); invalid.axes.efficiency.evidence = ["abandoned"];
    expect(() => validateReport(invalid, data)).toThrow("citation");
  });
  test("explicit interior leaf is allowed; no implicit latest, nested and entry cutoff are both enforced", async () => {
    const entries = [piEntry("m1", null), piEntry("m2", "m1"), piEntry("entry-future", "m2", undefined, { timestamp: "2026-10-09T14:00:00Z" }), piEntry("nested-future", "m2", { role: "user", content: "FUTURE_SECRET", timestamp: Date.parse("2026-10-09T14:00:00Z") })];
    const data = await preparePi({ ...piScope(), leaf: "nested-future" }, async () => piRaw(entries));
    expect(data.events.map(event => event.id)).toEqual(["m1", "m2"]); expect(data.history.stop).toBe("fixed_end_reached");
    expect(JSON.stringify(data)).not.toContain("FUTURE_SECRET");
    const interior = await preparePi({ ...piScope(), leaf: "m1" }, async () => piRaw(entries)); expect(interior.events).toHaveLength(1);
    const entryCutoff = await preparePi({ ...piScope(), leaf: "entry-future" }, async () => piRaw(entries)); expect(entryCutoff.events).toHaveLength(2);
    const exact = await preparePi(piScope(), async () => piRaw([piEntry("m1", null), piEntry("m2", "m1", { role: "user", content: "at cutoff", timestamp: Date.parse("2026-10-09T13:00:00Z") }, { timestamp: "2026-10-09T13:00:00Z" })])); expect(exact.events).toHaveLength(2);
  });
  test("malformed, duplicate, orphaned, cyclic, foreign headers and invalid hidden/after-cutoff records fail closed", async () => {
    for (const raw of ["", "{broken", piRaw() + "\n", piRaw().slice(0, -3), piRaw([], { id: "foreign" }), piRaw([], { version: 2 }), piRaw([], { timestamp: "bad" }), piRaw([piEntry("m1", null)]), piRaw([piEntry("m1", null), piEntry("m2", "missing")]), piRaw([piEntry("m1", "m2"), piEntry("m2", "m1")]), piRaw([piEntry("m1", null), piEntry("m1", null)]), piRaw([piEntry("m1", null), piEntry("m2", "m1"), piEntry("bad-hidden", "missing", { role: "system", content: "hidden" }, { timestamp: "2027-01-01T00:00:00Z" })]), piRaw([piEntry("m1", null), piEntry("m2", "m1", { role: "assistant", content: [{ type: "toolCall", id: "call", name: "bash", arguments: [] }] })]), piRaw([piEntry("m1", null), piEntry("m2", "m1", { role: "toolResult", content: [], toolCallId: "call" })]), piRaw([piEntry("m1", null), piEntry("m2", "m1", { role: "system", timestamp: "bad" })])]) {
      const selected = piScope(); await expect(preparePi(selected, async () => raw)).rejects.toThrow(); expect(existsSync(selected.out)).toBe(false);
    }
  });
  test("native fork permits copied entries and labels older than their new header or parent", async () => {
    const entries = [piEntry("m1", null), piEntry("m2", "m1"), { type: "label", id: "label1", parentId: "m2", timestamp: "2026-10-08T10:00:00Z", targetId: "m1" }];
    const data = await preparePi(piScope(), async () => piRaw(entries, { timestamp: "2026-10-09T12:30:00Z", parentSession: "/not-read.jsonl" }));
    expect(data.events.map(event => event.id)).toEqual(["m1", "m2"]);
    expect(data.omissions.map(omission => omission.id)).toContain("label1");
  });
  test("byte/entry caps, hidden-only omission, clipping and unsupported blocks", async () => {
    await expect(preparePi(piScope(), async () => " ".repeat(MAX_BYTES + 1))).rejects.toThrow("byte budget");
    const entries = Array.from({ length: MAX_IMPORT_RECORDS }, (_, i) => piEntry(`entry${i}`, i ? `entry${i - 1}` : null));
    const capped = await preparePi({ ...piScope(), leaf: `entry${MAX_IMPORT_RECORDS - 1}` }, async () => piRaw(entries));
    expect(capped.history.recordCapReached).toBe(true); expect(capped.history.stop).toBe("record_limit");
    expect(capped.pages[0].records).toBe(MAX_IMPORT_RECORDS + 1);
    await expect(preparePi(piScope(), async () => piRaw([...entries, piEntry("excess", null)]))).rejects.toThrow("record budget");
    const data = await preparePi(piScope(), async () => piRaw([piEntry("m1", null, { role: "assistant", content: [{ type: "thinking", thinking: "hidden" }, { type: "futureBlock", text: "unknown hidden" }] }), piEntry("m2", "m1", { role: "user", content: "x".repeat(MAX_EVENT_BYTES + 1) })]));
    expect(data.omissions[0].id).toBe("m1"); expect(data.events[0].clipped).toBe(true); expect(data.events[0].data).toHaveProperty("clippedJsonPrefix");
  });
  test("real fixture file CLI import/render preserves privacy and rejects symlinks/invalid UTF8", async () => {
    const selected = piScope(); writeFileSync(selected.source, piRaw());
    const common = ["--session", selected.session, "--leaf", selected.leaf, "--source", selected.source, "--end", selected.end, "--approve-scope"];
    await main(["import-pi", ...common, "--out", selected.out]);
    expect(statSync(selected.out).mode & 0o777).toBe(0o700);
    expect(statSync(join(selected.out, "events.json")).mode & 0o777).toBe(0o600);
    const manifest = JSON.parse(readFileSync(join(selected.out, "manifest.json"), "utf8")); expect(manifest.source).toBe("pi-jsonl-import"); expect(manifest.scope.agent).toBeUndefined();
    const authored = join(resolve(selected.out, ".."), "authored.json"); writeFileSync(authored, JSON.stringify(report()));
    const rendered = join(resolve(selected.out, ".."), "rendered");
    // Render reads only selected artifacts, not the original session again.
    rmSync(selected.source);
    await main(["render", ...common, "--dataset", selected.out, "--report", authored, "--out", rendered]);
    expect(readFileSync(join(rendered, "report.md"), "utf8")).toContain("Pi session");
    await expect(main(["render", ...common.map(value => value === selected.leaf ? "wrong-leaf" : value), "--dataset", selected.out, "--report", authored, "--out", join(sandbox(), "new")])).rejects.toThrow("scope mismatch");
    const linked = piScope(); symlinkSync(authored, linked.source);
    await expect(preparePi(linked)).rejects.toThrow("Symlink");
    const invalid = piScope(); writeFileSync(invalid.source, Buffer.from([0xff])); await expect(preparePi(invalid)).rejects.toThrow();
    expect(existsSync(invalid.out)).toBe(false);
    const oversized = piScope(); writeFileSync(oversized.source, "x".repeat(MAX_BYTES + 1));
    await expect(preparePi(oversized)).rejects.toThrow("byte budget");
    const directory = piScope(); await expect(preparePi({ ...directory, source: resolve(directory.out, "..") })).rejects.toThrow("regular file");
    const fork = piScope(); writeFileSync(fork.source, piRaw(undefined, { parentSession: "/never-read-parent-session.jsonl" }));
    expect((await preparePi(fork)).events).toHaveLength(2);
  });
});

test("all four rubric files and MIT notice preserved byte-for-byte at pinned upstream", () => {
  // Fixed expected digests make this test independent of a local upstream checkout.
  const root = resolve(import.meta.dir, "../skills/skill-doctor");
  const expected = {
    efficiency: "35332dc761e31f0086568bbae529005f98358359a288a86d20bf7e921aae298e",
    "code-quality": "8d53db1c0a708519444dd2a9295f0dd52054cda7ee4fcb7cbcc5b1fa615ac798",
    "procedure-compliance": "9a289670633ecb858ddddda373bcc66474a34c8ae5b9877bdf248f6936f49133",
    verbosity: "4d5abf5eb9fa12a5a0fcb1c0b0aedf416ccfc6fa2cc347f98adfdc2126a755bd",
  };
  for (const [name, digest] of Object.entries(expected)) {
    const text = readFileSync(join(root, "references", `${name}.md`), "utf8");
    expect(createHash("sha256").update(text).digest("hex")).toBe(digest);
  }
  expect(createHash("sha256").update(readFileSync(join(root, "LICENSE"))).digest("hex")).toBe("9a10f320256635c6a2b58f9894b1f453e404142d07a6125ad788a3afbd7a7379");
});
