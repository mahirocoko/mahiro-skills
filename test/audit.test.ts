import { describe, expect, spyOn, test } from "bun:test";
import * as fs from "fs";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { auditSkillUsage, MAX_AUDIT_BYTES, MAX_AUDIT_FILES, parseUsageAuditArgs } from "../src/audit";

function makeTranscriptRoot() {
  const root = mkdtempSync(join(tmpdir(), "mahiro-skills-audit-"));
  const conversation = join(root, "conversations", "sample-conversation");
  mkdirSync(conversation, { recursive: true });

  return {
    root,
    file: join(conversation, "messages.jsonl"),
    write(lines: unknown[]) {
      writeFileSync(join(conversation, "messages.jsonl"), `${lines.map((line) => typeof line === "string" ? line : JSON.stringify(line)).join("\n")}\n`);
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

describe("auditSkillUsage", () => {
  test("counts explicit Skill tool calls and compares them with the source catalog", () => {
    const temp = makeTranscriptRoot();
    try {
      temp.write([
        {
          type: "message",
          timestamp: "2026-07-01T12:00:00.000Z",
          message: {
            metadata: { agent_id: "agent-a", conversation_id: "conversation-a" },
            content: [{ type: "toolCall", name: "Skill", arguments: { skill: "recap" } }],
          },
        },
        {
          type: "message",
          timestamp: "2026-07-02T12:00:00.000Z",
          message: {
            metadata: { agent_id: "agent-a", conversation_id: "conversation-a" },
            content: [{ type: "toolCall", name: "Skill", arguments: { skill: "recap" } }],
          },
        },
        {
          type: "message",
          timestamp: "2026-07-03T12:00:00.000Z",
          message: {
            metadata: { agent_id: "agent-b", conversation_id: "conversation-b" },
            content: [{ type: "toolCall", name: "Skill", arguments: { skill: "retired-skill" } }],
          },
        },
      ]);

      const result = auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: [temp.file] });

      expect(result.totalInvocations).toBe(3);
      expect(result.observedSkills).toEqual([
        {
          name: "recap",
          inCurrentCatalog: true,
          invocations: 2,
          conversations: 1,
          firstUsedAt: "2026-07-01T12:00:00.000Z",
          lastUsedAt: "2026-07-02T12:00:00.000Z",
        },
        {
          name: "retired-skill",
          inCurrentCatalog: false,
          invocations: 1,
          conversations: 1,
          firstUsedAt: "2026-07-03T12:00:00.000Z",
          lastUsedAt: "2026-07-03T12:00:00.000Z",
        },
      ]);
      expect(result.outsideCurrentCatalogSkills).toEqual(["retired-skill"]);
      expect(result.catalogSkills.find((skill) => skill.name === "recap")?.invocations).toBe(2);
      expect(result.unobservedCatalogSkills).not.toContain("recap");
    } finally {
      temp.cleanup();
    }
  });

  test("supports legacy tool-call records and filters without returning message prose", () => {
    const temp = makeTranscriptRoot();
    try {
      temp.write([
        {
          kind: "tool_call",
          name: "Skill",
          argsText: JSON.stringify({ skill: "rrr" }),
          timestamp: "2026-07-04T12:00:00.000Z",
          metadata: { agent_id: "agent-a", conversation_id: "conversation-a" },
        },
        {
          kind: "tool_call",
          name: "Skill",
          argsText: "{not-json}",
          timestamp: "2026-07-05T12:00:00.000Z",
          metadata: { agent_id: "agent-a", conversation_id: "conversation-a" },
        },
        {
          type: "message",
          timestamp: "2026-07-06T12:00:00.000Z",
          message: {
            metadata: { agent_id: "agent-a", conversation_id: "conversation-a" },
            content: [{ type: "text", text: "I will use /project later." }],
          },
        },
      ]);

      const result = auditSkillUsage({
        allowTranscriptRead: true,
        transcriptFiles: [temp.file],
        agentId: "agent-a",
        startDate: "2026-07-04T00:00:00.000Z",
        endDate: "2026-07-04T23:59:59.999Z",
      });

      expect(result.totalInvocations).toBe(1);
      expect(result.observedSkills[0]?.name).toBe("rrr");
      expect(result.warnings).toEqual([`Ignored Skill call with malformed argsText in ${temp.file}.`]);
    } finally {
      temp.cleanup();
    }
  });

  test("rejects inverted date filters", () => {
    expect(() => auditSkillUsage({
      allowTranscriptRead: true,
      transcriptFiles: ["/does/not/matter/messages.jsonl"],
      startDate: "2026-07-02T00:00:00.000Z",
      endDate: "2026-07-01T00:00:00.000Z",
    })).toThrow("--start-date must be before --end-date.");
  });

  test("rejects misleading CLI intent and missing/unbounded helper consent before ANY transcript IO", () => {
    const spies = ["lstatSync", "openSync", "readSync", "readFileSync", "readdirSync"].map((name) =>
      spyOn(fs, name as "lstatSync").mockImplementation(() => { throw new Error("unexpected transcript IO"); }),
    );
    try {
      // Calibrate the spy at the actual helper boundary, not merely on fs itself.
      expect(() => auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: ["/synthetic/messages.jsonl"] })).toThrow("unexpected transcript IO");
      expect(spies[0]).toHaveBeenCalledTimes(1);
      for (const spy of spies) spy.mockClear();
      for (const flag of ["--agent", "--agent=letta-code", "--scope", "--overwrite", "--yes", "--data-dir", "typo"]) {
        expect(() => parseUsageAuditArgs(["--allow-transcript-read", "--transcript-file", "/synthetic/messages.jsonl", flag])).toThrow("Unsupported audit argument");
      }
      expect(() => auditSkillUsage()).toThrow("--allow-transcript-read");
      expect(() => auditSkillUsage({ transcriptFiles: ["/synthetic/messages.jsonl"] })).toThrow("--allow-transcript-read");
      expect(() => auditSkillUsage({ allowTranscriptRead: true })).toThrow("exact --transcript-file");
      expect(() => auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: ["/synthetic/messages.jsonl"], dataDir: "/synthetic" } as Parameters<typeof auditSkillUsage>[0])).toThrow("Unsupported usage-audit option");
      expect(() => auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: Array(MAX_AUDIT_FILES + 1).fill("/synthetic/messages.jsonl") })).toThrow("exact --transcript-file");
      expect(() => auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: ["messages.jsonl"] })).toThrow("absolute");
      expect(() => auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: ["/synthetic/.env"] })).toThrow("unrelated file");
      expect(() => auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: ["/synthetic/messages.jsonl", "/synthetic/messages.jsonl"] })).toThrow("Duplicate");
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  test("reads only the positively selected synthetic file, not its sibling", () => {
    const temp = makeTranscriptRoot();
    try {
      temp.write([{ kind: "tool_call", name: "Skill", argsText: '{"skill":"recap"}' }]);
      const sibling = join(temp.root, "conversations", "must-not-read");
      mkdirSync(sibling);
      writeFileSync(join(sibling, "messages.jsonl"), JSON.stringify({ kind: "tool_call", name: "Skill", argsText: '{"skill":"trap-sibling"}' }));
      const result = auditSkillUsage(parseUsageAuditArgs(["--allow-transcript-read", "--transcript-file", temp.file]));
      expect(result.source.transcriptFiles).toEqual([temp.file]);
      expect(result.source.transcriptFilesScanned).toBe(1);
      expect(result.source.bytesRead).toBe(fs.statSync(temp.file).size);
      expect(result.totalInvocations).toBe(1);
      expect(result.observedSkills.map((entry) => entry.name)).toEqual(["recap"]);
      expect(JSON.stringify(result)).not.toContain("trap-sibling");
    } finally { temp.cleanup(); }
  });

  test("preflights all selected byte sizes before any content read; rejects directories/symlinks", () => {
    const temp = makeTranscriptRoot();
    try {
      temp.write([]);
      const extra = join(temp.root, "transcript.jsonl");
      writeFileSync(extra, "");
      truncateSync(extra, MAX_AUDIT_BYTES + 1);
      const read = spyOn(fs, "readSync");
      try {
        expect(() => auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: [temp.file, extra] })).toThrow("byte audit limit");
        expect(read).not.toHaveBeenCalled();
      } finally { read.mockRestore(); }
      fs.unlinkSync(extra);
      symlinkSync(temp.file, extra);
      expect(() => auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: [extra] })).toThrow("non-symlink");
      fs.unlinkSync(extra);
      mkdirSync(extra);
      expect(() => auditSkillUsage({ allowTranscriptRead: true, transcriptFiles: [extra] })).toThrow("regular");
    } finally { temp.cleanup(); }
  });
});
