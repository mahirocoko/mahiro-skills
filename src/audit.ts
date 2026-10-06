import { closeSync, constants, fstatSync, lstatSync, openSync, readSync } from "fs";
import { basename, isAbsolute, resolve } from "path";

import { getSkillCatalog } from "./repo";
import type { SkillUsageAuditOptions, SkillUsageAuditResult, SkillUsageAuditSkill } from "./types";

interface TranscriptMessage {
  content?: unknown;
  metadata?: {
    agent_id?: unknown;
    conversation_id?: unknown;
    created_at?: unknown;
  };
  timestamp?: unknown;
}

interface SkillUsageEvent {
  skill: string;
  timestamp?: string;
  agentId?: string;
  conversationId?: string;
}

export const MAX_AUDIT_FILES = 100;
export const MAX_AUDIT_BYTES = 10 * 1024 * 1024;
export const AUDIT_USAGE = `audit is transcript usage analysis, NOT installer status.
Usage: audit --allow-transcript-read --transcript-file <absolute messages.jsonl|transcript.jsonl> [--transcript-file <another-file>] [--agent-id <id>] [--start-date <ISO>] [--end-date <ISO>] [--json]
Select exact regular files only: at most ${MAX_AUDIT_FILES} files / ${MAX_AUDIT_BYTES} total bytes. No directory recursion or implicit HOME scope.
For receipt-backed installer status use: list --agent <adapter> --scope <local|global>
For an exact install preview use: plan <skill...> --agent <adapter> --scope <local|global>`;

/** Pure intent/scope validation must precede even transcript metadata IO. */
export function validateUsageAuditScope(options: SkillUsageAuditOptions): string[] {
  const allowed = new Set(["allowTranscriptRead", "transcriptFiles", "agentId", "startDate", "endDate"]);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) throw new Error(`Unsupported usage-audit option '${key}'.\n${AUDIT_USAGE}`);
  }
  if (options.allowTranscriptRead !== true) {
    throw new Error(`Transcript reads require explicit --allow-transcript-read consent.\n${AUDIT_USAGE}`);
  }
  const files = options.transcriptFiles;
  if (!Array.isArray(files) || !files.length || files.length > MAX_AUDIT_FILES) {
    throw new Error(`Select 1..${MAX_AUDIT_FILES} exact --transcript-file paths.\n${AUDIT_USAGE}`);
  }
  for (const file of files) {
    if (typeof file !== "string" || !isAbsolute(file) || !["messages.jsonl", "transcript.jsonl"].includes(basename(file))) {
      throw new Error("--transcript-file must name an absolute messages.jsonl or transcript.jsonl file, not a directory or unrelated file.");
    }
  }
  const normalized = files.map((file) => resolve(file));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("Duplicate --transcript-file paths are not allowed.");
  }
  return normalized;
}

/** Audit flags have their own parser so installer selectors cannot be ignored. */
export function parseUsageAuditArgs(args: string[]): SkillUsageAuditOptions {
  const options: SkillUsageAuditOptions = { transcriptFiles: [] };
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === "--allow-transcript-read") {
      options.allowTranscriptRead = true;
      continue;
    }
    if (token === "--json") continue;
    if (["--transcript-file", "--agent-id", "--start-date", "--end-date"].includes(token)) {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
      if (token === "--transcript-file") options.transcriptFiles!.push(value);
      if (token === "--agent-id") options.agentId = value;
      if (token === "--start-date") options.startDate = value;
      if (token === "--end-date") options.endDate = value;
      continue;
    }
    throw new Error(`Unsupported audit argument '${token}'. Installer flags and --data-dir are not transcript scope.\n${AUDIT_USAGE}`);
  }
  validateUsageAuditScope(options);
  return options;
}

function readBoundedTranscripts(files: string[]): { file: string; text: string; bytes: number }[] {
  // Preflight ALL selected file metadata before reading any content. Never enumerate directories.
  const selected = files.map((file) => {
    const stats = lstatSync(file);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error(`Transcript must be a regular non-symlink file: ${file}`);
    }
    return { file, stats };
  });
  if (selected.reduce((bytes, { stats }) => bytes + stats.size, 0) > MAX_AUDIT_BYTES) {
    throw new Error(`Selected transcripts exceed the ${MAX_AUDIT_BYTES}-byte audit limit; select fewer/smaller files.`);
  }
  return selected.map(({ file, stats }) => {
    const fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
      const before = fstatSync(fd);
      if (!before.isFile() || before.dev !== stats.dev || before.ino !== stats.ino || before.size !== stats.size) {
        throw new Error(`Transcript changed after scope preflight: ${file}`);
      }
      const buffer = Buffer.alloc(before.size);
      let offset = 0;
      while (offset < buffer.length) {
        const bytes = readSync(fd, buffer, offset, buffer.length - offset, offset);
        if (bytes === 0) throw new Error(`Transcript truncated during read: ${file}`);
        offset += bytes;
      }
      const after = fstatSync(fd);
      if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
        throw new Error(`Transcript changed during bounded read: ${file}`);
      }
      return { file, text: buffer.toString("utf8"), bytes: offset };
    } finally {
      closeSync(fd);
    }
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asTimestamp(value: unknown): string | undefined {
  const date = value instanceof Date ? value : new Date(typeof value === "number" || typeof value === "string" ? value : "");
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseSkillName(value: unknown, warnings: string[], source: string): string | undefined {
  const argumentsObject = asRecord(value);
  const skill = asText(argumentsObject?.skill)?.trim();
  if (!skill) {
    warnings.push(`Ignored Skill call without a non-empty skill name in ${source}.`);
    return undefined;
  }

  return skill;
}

function parseArgsText(value: unknown, warnings: string[], source: string): string | undefined {
  if (typeof value !== "string") {
    warnings.push(`Ignored Skill call without arguments in ${source}.`);
    return undefined;
  }

  try {
    return parseSkillName(JSON.parse(value), warnings, source);
  } catch {
    warnings.push(`Ignored Skill call with malformed argsText in ${source}.`);
    return undefined;
  }
}

function extractEvents(record: Record<string, unknown>, warnings: string[], source: string): SkillUsageEvent[] {
  const wrappedMessage = asRecord(record.message);
  const message = wrappedMessage ?? record;
  const metadata = asRecord(message.metadata) ?? asRecord(record.metadata);
  const timestamp = asTimestamp(record.timestamp) ?? asTimestamp(message.timestamp) ?? asTimestamp(metadata?.created_at);
  const agentId = asText(metadata?.agent_id);
  const conversationId = asText(metadata?.conversation_id);
  const events: SkillUsageEvent[] = [];

  const content = Array.isArray(message.content) ? message.content : [];
  for (const item of content) {
    const toolCall = asRecord(item);
    if (toolCall?.type !== "toolCall" || toolCall.name !== "Skill") {
      continue;
    }

    const skill = parseSkillName(toolCall.arguments, warnings, source);
    if (skill) {
      events.push({ skill, timestamp, agentId, conversationId });
    }
  }

  if (record.kind === "tool_call" && record.name === "Skill") {
    const skill = parseArgsText(record.argsText, warnings, source);
    if (skill) {
      events.push({ skill, timestamp, agentId, conversationId });
    }
  }

  return events;
}

function parseBoundary(value: string | undefined, flag: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid ${flag} value '${value}'. Use an ISO date.`);
  }

  return timestamp;
}

function isWithinRange(event: SkillUsageEvent, start: number | undefined, end: number | undefined): boolean {
  if (start === undefined && end === undefined) {
    return true;
  }
  if (!event.timestamp) {
    return false;
  }

  const timestamp = new Date(event.timestamp).getTime();
  return (start === undefined || timestamp >= start) && (end === undefined || timestamp <= end);
}

function buildSkill(name: string, events: SkillUsageEvent[], inCurrentCatalog: boolean): SkillUsageAuditSkill {
  const timestamps = events.flatMap((event) => event.timestamp ? [event.timestamp] : []).sort();
  return {
    name,
    inCurrentCatalog,
    invocations: events.length,
    conversations: new Set(events.flatMap((event) => event.conversationId ? [event.conversationId] : [])).size,
    firstUsedAt: timestamps[0],
    lastUsedAt: timestamps.at(-1),
  };
}

export function auditSkillUsage(options: SkillUsageAuditOptions = {}): SkillUsageAuditResult {
  const files = validateUsageAuditScope(options);
  const start = parseBoundary(options.startDate, "--start-date");
  const end = parseBoundary(options.endDate, "--end-date");
  if (start !== undefined && end !== undefined && start > end) {
    throw new Error("--start-date must be before --end-date.");
  }

  const warnings: string[] = [];
  const events: SkillUsageEvent[] = [];
  let linesRead = 0;
  let malformedLines = 0;
  const transcripts = readBoundedTranscripts(files);

  for (const { file, text } of transcripts) {
    const source = file;
    for (const line of text.split("\n")) {
      if (!line.trim()) {
        continue;
      }
      linesRead += 1;
      try {
        const record = asRecord(JSON.parse(line));
        if (!record) {
          malformedLines += 1;
          warnings.push(`Ignored non-object JSONL record in ${source}.`);
          continue;
        }
        events.push(...extractEvents(record, warnings, source));
      } catch {
        malformedLines += 1;
        warnings.push(`Ignored malformed JSONL record in ${source}.`);
      }
    }
  }

  const filteredEvents = events.filter((event) =>
    (!options.agentId || event.agentId === options.agentId) && isWithinRange(event, start, end),
  );
  const eventsBySkill = new Map<string, SkillUsageEvent[]>();
  for (const event of filteredEvents) {
    eventsBySkill.set(event.skill, [...(eventsBySkill.get(event.skill) ?? []), event]);
  }

  const catalog = getSkillCatalog();
  const catalogNames = new Set(catalog.map((skill) => skill.name));
  const observedSkills = [...eventsBySkill.entries()]
    .map(([name, skillEvents]) => buildSkill(name, skillEvents, catalogNames.has(name)))
    .sort((left, right) => right.invocations - left.invocations || left.name.localeCompare(right.name));
  const catalogSkills = catalog
    .map((skill) => buildSkill(skill.name, eventsBySkill.get(skill.name) ?? [], true))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    type: "skill-usage-audit",
    source: {
      transcriptFiles: files,
      maxFiles: MAX_AUDIT_FILES,
      maxBytes: MAX_AUDIT_BYTES,
      bytesRead: transcripts.reduce((bytes, transcript) => bytes + transcript.bytes, 0),
      transcriptFilesScanned: files.length,
      linesRead,
      malformedLines,
      startDate: options.startDate,
      endDate: options.endDate,
      agentId: options.agentId,
    },
    totalInvocations: filteredEvents.length,
    observedSkills,
    catalogSkills,
    unobservedCatalogSkills: catalogSkills.filter((skill) => skill.invocations === 0).map((skill) => skill.name),
    outsideCurrentCatalogSkills: observedSkills.filter((skill) => !skill.inCurrentCatalog).map((skill) => skill.name),
    warnings,
  };
}
