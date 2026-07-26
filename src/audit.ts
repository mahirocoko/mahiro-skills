import { existsSync, readdirSync, readFileSync } from "fs";
import { homedir } from "os";
import { basename, join, relative } from "path";

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

function resolveDataRoot(options: SkillUsageAuditOptions): string {
  if (options.dataDir) {
    return options.dataDir;
  }

  const home = process.env.MAHIRO_SKILLS_HOME || homedir();
  return join(home, ".letta", "lc-local-backend");
}

function findTranscriptFiles(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(target);
      } else if (entry.isFile() && (entry.name === "messages.jsonl" || entry.name === "transcript.jsonl")) {
        files.push(target);
      }
    }
  };

  const roots = basename(path) === "conversations" || basename(path) === "transcripts"
    ? [path]
    : [join(path, "conversations"), join(path, "transcripts")].filter(existsSync);

  for (const root of roots) {
    visit(root);
  }

  return files.sort();
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
  const dataRoot = resolveDataRoot(options);
  const start = parseBoundary(options.startDate, "--start-date");
  const end = parseBoundary(options.endDate, "--end-date");
  if (start !== undefined && end !== undefined && start > end) {
    throw new Error("--start-date must be before --end-date.");
  }

  const warnings: string[] = [];
  const events: SkillUsageEvent[] = [];
  let linesRead = 0;
  let malformedLines = 0;
  const files = findTranscriptFiles(dataRoot);

  for (const file of files) {
    const source = relative(dataRoot, file);
    for (const line of readFileSync(file, "utf8").split("\n")) {
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
      dataRoot,
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
