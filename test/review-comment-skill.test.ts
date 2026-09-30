import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

import { install } from "../src/install";
import { makeTempEnv } from "./helpers";

const root = join(import.meta.dir, "..");

describe("review-comment skill", () => {
  test("has an independent command and safe simulation/posting gates", () => {
    const skill = readFileSync(join(root, "skills", "review-comment", "SKILL.md"), "utf8");
    const command = readFileSync(join(root, "commands", "review-comment.md"), "utf8");
    const catalog = JSON.parse(readFileSync(join(root, ".claude-plugin", "marketplace.json"), "utf8"));

    expect(skill).toContain("name: review-comment");
    expect(skill).toContain("For simulation, return the proposed line-anchored comments without GitHub writes.");
    expect(skill).toContain("Never submit `COMMENT`, `APPROVE`, or `REQUEST_CHANGES` unless Mahiro explicitly asks.");
    expect(skill).toContain("Read the actual caller before claiming an API contract.");
    expect(skill).toContain("**ตรงไหน**");
    expect(skill).toContain("**อะไร**");
    expect(skill).toContain("**แก้ยังไง**");
    expect(skill).toContain("**แนะนำอะไร**");
    expect(skill).toContain("ลองยืนยันรูปแบบที่ต้องรับก่อนนะครับ");
    expect(skill).toContain("Do not make the reader translate your Thai into another Thai sentence");
    expect(skill).toContain("exact old words, exact new words");
    expect(skill).toContain("These are a reader check, not four headings or four mandatory sentences.");
    expect(skill).toContain("agent-posted comments under Mahiro's account");
    expect(skill).toContain("`ครับ`/`นะ` are natural when they fit");
    expect(command).toContain('skill: "review-comment"');
    expect(catalog.bundles[0].skills).toContain("review-comment");
    expect(catalog.bundles[0].commands).toContain("review-comment");
  });

  test("installs a managed global Cursor copy and paired command", () => {
    const temp = makeTempEnv();
    try {
      const result = install("cursor", "global", ["review-comment"], false, temp.env);
      expect(result.installed).toEqual(["review-comment"]);
      const cursorRoot = join(temp.env.MAHIRO_SKILLS_HOME!, ".cursor");
      const installed = readFileSync(join(cursorRoot, "skills", "review-comment", "SKILL.md"), "utf8");
      expect(installed).toContain("Mahiro Skill | Writes actionable GitHub PR review comments");
      expect(readFileSync(join(cursorRoot, "commands", "review-comment.md"), "utf8")).toContain("# /review-comment");
    } finally {
      temp.cleanup();
    }
  });
});
