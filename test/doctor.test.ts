import { describe, expect, test } from "bun:test";
import { rmSync } from "fs";
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

  test("reports receipt and installed paths after gemini install", () => {
    const temp = makeTempEnv();
    try {
      install("gemini", "local", ["gemini"], false, temp.env);
      const [result] = doctor("gemini", "local", temp.env);
      expect(result.checks).toEqual([
        {
          label: "root-resolved",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini"),
        },
        {
          label: "receipt-readable",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", ".mahiro-skills", "receipts", "local-gemini.json"),
        },
        {
          label: "skill:gemini",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "skills", "gemini"),
        },
        {
          label: "command:gemini",
          ok: true,
          detail: join(temp.env.MAHIRO_SKILLS_CWD!, ".gemini", "commands", "mh-gemini.toml"),
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
