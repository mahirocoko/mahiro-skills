import { describe, expect, test } from "bun:test";
import { readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { doctor } from "../src/doctor";
import { install } from "../src/install";
import { makeTempEnv } from "./helpers";

describe("doctor", () => {
  test("reports receipt and installed paths after install", () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["recap"], false, temp.env);
      const [result] = doctor("opencode", "local", temp.env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode"),
        },
        {
          label: "receipt-readable",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", ".mahiro-skills", "receipts", "local-opencode.json"),
        },
        {
          label: "skill:recap",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "recap"),
        },
        {
          label: "command:recap",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "recap.md"),
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("reports missing receipt before install", () => {
    const temp = makeTempEnv();
    try {
      const [result] = doctor("claude-code", "local", temp.env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".claude"),
        },
        {
          label: "receipt-readable",
          ok: false,
          detail: "Receipt not found",
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("reports missing installed skill path from receipt", () => {
    const temp = makeTempEnv();
    try {
      install("claude-code", "local", ["project"], false, temp.env);
      rmSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", "skills", "project"), { recursive: true, force: true });

      const [result] = doctor("claude-code", "local", temp.env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".claude"),
        },
        {
          label: "receipt-readable",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", ".mahiro-skills", "receipts", "local-claude-code.json"),
        },
        {
          label: "skill:project",
          ok: false,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", "skills", "project"),
        },
        {
          label: "command:project",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", "commands", "project.md"),
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("reports missing installed command path from receipt", () => {
    const temp = makeTempEnv();
    try {
      install("claude-code", "local", ["project"], false, temp.env);
      rmSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", "commands", "project.md"), { force: true });

      const [result] = doctor("claude-code", "local", temp.env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".claude"),
        },
        {
          label: "receipt-readable",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", ".mahiro-skills", "receipts", "local-claude-code.json"),
        },
        {
          label: "skill:project",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", "skills", "project"),
        },
        {
          label: "command:project",
          ok: false,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", "commands", "project.md"),
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("reports receipt and installed paths after cursor install", () => {
    const temp = makeTempEnv();
    try {
      install("cursor", "local", ["recap"], false, temp.env);
      const [result] = doctor("cursor", "local", temp.env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor"),
        },
        {
          label: "receipt-readable",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", ".mahiro-skills", "receipts", "local-cursor.json"),
        },
        {
          label: "skill:recap",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", "skills", "recap"),
        },
        {
          label: "command:recap",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", "commands", "recap.md"),
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("reports the namespaced installed skill path after Agy install", () => {
    const temp = makeTempEnv();
    try {
      install("agy", "local", ["learn"], false, temp.env);
      const [result] = doctor("agy", "local", temp.env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".agents"),
        },
        {
          label: "receipt-readable",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", ".mahiro-skills", "receipts", "local-agy.json"),
        },
        {
          label: "skill:learn",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "mh-learn"),
        },
        {
          label: "skill-alias-name:learn",
          ok: true,
          detail: "Expected Agy alias name mh-learn",
        },
        {
          label: "skill-alias-user-only:learn",
          ok: true,
          detail: "Expected disable-model-invocation: true",
        },
        {
          label: "skill-alias-slash-enabled:learn",
          ok: true,
          detail: "Expected no disable-slash-command field",
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("fails Agy alias contract checks when staged frontmatter drifts", () => {
    const temp = makeTempEnv();
    try {
      install("agy", "local", ["learn"], false, temp.env);
      const skillFile = join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "mh-learn", "SKILL.md");
      const content = readFileSync(skillFile, "utf8")
        .replace("name: mh-learn", "name: learn")
        .replace("disable-model-invocation: true", "disable-model-invocation: false")
        .replace("\n---\n", "\ndisable-slash-command: true\n---\n");
      writeFileSync(skillFile, content);

      const [result] = doctor("agy", "local", temp.env);

      expect(result.checks.find((check) => check.label === "skill-alias-name:learn")?.ok).toBe(false);
      expect(result.checks.find((check) => check.label === "skill-alias-user-only:learn")?.ok).toBe(false);
      expect(result.checks.find((check) => check.label === "skill-alias-slash-enabled:learn")?.ok).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("reports receipt and installed skill path after Letta Code install", () => {
    const temp = makeTempEnv();
    try {
      install("letta-code", "local", ["recap"], false, temp.env);
      const [result] = doctor("letta-code", "local", temp.env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".agents"),
        },
        {
          label: "receipt-readable",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", ".mahiro-skills", "receipts", "local-letta-code.json"),
        },
        {
          label: "skill:recap",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "recap"),
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("reports receipt and installed skill path after Pi install", () => {
    const temp = makeTempEnv();
    try {
      const isolatedRoot = join(temp.root, "pi-isolated", ".pi", "agent");
      const env = { ...temp.env, PI_CODING_AGENT_DIR: isolatedRoot };
      install("pi", "global", ["recap"], false, env);
      const [result] = doctor("pi", "global", env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: isolatedRoot,
        },
        {
          label: "receipt-readable",
          ok: true,
          detail: join(isolatedRoot, ".mahiro-skills", "receipts", "global-pi.json"),
        },
        {
          label: "skill:recap",
          ok: true,
          detail: join(isolatedRoot, "skills", "recap"),
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("reports receipt and installed paths after codex install", () => {
    const temp = makeTempEnv();
    try {
      install("codex", "local", ["recap"], false, temp.env);
      const [result] = doctor("codex", "local", temp.env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".codex"),
        },
        {
          label: "receipt-readable",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", ".mahiro-skills", "receipts", "local-codex.json"),
        },
        {
          label: "skill:recap",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", "skills", "recap"),
        },
        {
          label: "command:recap",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", "commands", "recap.md"),
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });
});
