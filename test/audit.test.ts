import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { auditSkillUsage } from "../src/audit";

function makeTranscriptRoot() {
  const root = mkdtempSync(join(tmpdir(), "mahiro-skills-audit-"));
  const conversation = join(root, "conversations", "sample-conversation");
  mkdirSync(conversation, { recursive: true });

  return {
    root,
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

      const result = auditSkillUsage({ dataDir: temp.root });

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

  test("supports legacy tool-call records and filters without reading message prose", () => {
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
            content: [{ type: "text", text: "I will use /frontend-design later." }],
          },
        },
      ]);

      const result = auditSkillUsage({
        dataDir: temp.root,
        agentId: "agent-a",
        startDate: "2026-07-04T00:00:00.000Z",
        endDate: "2026-07-04T23:59:59.999Z",
      });

      expect(result.totalInvocations).toBe(1);
      expect(result.observedSkills[0]?.name).toBe("rrr");
      expect(result.warnings).toEqual(["Ignored Skill call with malformed argsText in conversations/sample-conversation/messages.jsonl."]);
    } finally {
      temp.cleanup();
    }
  });

  test("rejects inverted date filters", () => {
    expect(() => auditSkillUsage({
      dataDir: "/does/not/matter",
      startDate: "2026-07-02T00:00:00.000Z",
      endDate: "2026-07-01T00:00:00.000Z",
    })).toThrow("--start-date must be before --end-date.");
  });
});
