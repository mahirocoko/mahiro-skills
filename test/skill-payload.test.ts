import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashPath, hashSkillPayload } from "../src/content-hash";
import { install } from "../src/install";
import { createPlan } from "../src/plan";
import { getSkillManagerSnapshot } from "../src/skill-manager";
import type { InstallReceipt } from "../src/types";
import { makeTempEnv } from "./helpers";

const makePayloadFixture = () => {
  const temp = makeTempEnv();
  const repo = join(temp.root, "source-repo");
  const source = join(repo, "skills", "sample");
  mkdirSync(join(source, "nested", "__pycache__", "deep"), { recursive: true });
  mkdirSync(join(repo, "skills", "keep"), { recursive: true });
  mkdirSync(join(repo, "commands"), { recursive: true });
  for (const name of ["sample", "keep"]) {
    writeFileSync(join(repo, "skills", name, "SKILL.md"), `---\nname: ${name}\ndescription: Synthetic fixture.\n---\n# ${name}\n`);
    writeFileSync(join(repo, "commands", `${name}.md`), "---\ndescription: Synthetic command.\n---\n# Command\n");
  }
  writeFileSync(join(source, "run.sh"), "#!/bin/sh\nprintf fixture\n");
  chmodSync(join(source, "run.sh"), 0o755);
  writeFileSync(join(source, "nested", "normal.py"), "# source stays\n");
  writeFileSync(join(source, "__pycache__.md"), "normal documentation\n");
  writeFileSync(join(source, "__pycache__"), "ordinary non-directory artifact\n");
  writeFileSync(join(source, "nested", "__pycache__", "deep", "hidden.txt"), "excluded cache subtree\n");
  writeFileSync(join(source, "root.pyc"), "synthetic bytecode-shaped payload\n");
  writeFileSync(join(source, "nested", "other.pyo"), "synthetic cache\n");
  writeFileSync(join(source, "nested", "upper.PYC"), "synthetic cache\n");
  return { ...temp, source, env: { ...temp.env, MAHIRO_SKILLS_REPO_ROOT: repo } };
};

describe("skill payload copy and fingerprint policy (isolated roots only)", () => {
  test("filters nested Python bytes while preserving normal executable/description payload and collision behavior", () => {
    const temp = makePayloadFixture();
    try {
      const plan = createPlan("opencode", "local", ["sample"], temp.env);
      expect(plan.skills[0]?.collision).toBe(false);
      const result = install("opencode", "local", ["sample"], false, temp.env);
      const target = plan.skills[0]!.target;
      expect(existsSync(join(target, "root.pyc"))).toBe(false);
      expect(existsSync(join(target, "nested", "other.pyo"))).toBe(false);
      expect(existsSync(join(target, "nested", "upper.PYC"))).toBe(false);
      expect(existsSync(join(target, "nested", "__pycache__"))).toBe(false);
      expect(readFileSync(join(target, "run.sh"), "utf8")).toBe(readFileSync(join(temp.source, "run.sh"), "utf8"));
      expect(statSync(join(target, "run.sh")).mode & 0o777).toBe(0o755);
      expect(existsSync(join(target, "nested", "normal.py"))).toBe(true);
      expect(existsSync(join(target, "__pycache__.md"))).toBe(true);
      expect(readFileSync(join(target, "__pycache__"), "utf8")).toBe("ordinary non-directory artifact\n");
      expect(readFileSync(join(target, "SKILL.md"), "utf8")).toContain("description: Mahiro Skill | Synthetic fixture.");
      expect(readFileSync(plan.commands[0]!.target, "utf8")).toContain("description: Mahiro Skill | Synthetic command.");
      const receipt = JSON.parse(readFileSync(result.receiptPath!, "utf8")) as InstallReceipt;
      const sourceHash = hashSkillPayload(temp.source);
      const installedHash = hashPath(target);
      const commandHash = hashPath(plan.commands[0]!.source);
      if (!sourceHash || !installedHash || !commandHash) throw new Error("Expected existing fixture fingerprints.");
      expect(receipt.targetStates?.find((state) => state.kind === "skill")?.sourceHash).toBe(sourceHash);
      expect(hashSkillPayload(temp.source)).not.toBe(hashPath(temp.source));
      expect(receipt.targetStates?.find((state) => state.kind === "skill")?.installedHash).toBe(installedHash);
      expect(receipt.targetStates?.find((state) => state.kind === "command")?.sourceHash).toBe(commandHash);
      expect(createPlan("opencode", "local", ["sample"], temp.env).skills[0]?.collision).toBe(true);
      expect(() => install("opencode", "local", ["sample"], false, temp.env)).toThrow("Collision");
      expect(getSkillManagerSnapshot("opencode", "local", temp.env).skills.find((skill) => skill.name === "sample")?.status).toBe("current");
    } finally { temp.cleanup(); }
  });

  test("cache-only source changes stay current, selective overwrite merges receipt and installed drift stays visible", () => {
    const temp = makePayloadFixture();
    try {
      install("letta-code", "global", ["keep"], false, temp.env);
      const result = install("letta-code", "global", ["sample"], false, temp.env);
      const before = JSON.parse(readFileSync(result.receiptPath!, "utf8")) as InstallReceipt;
      const root = join(temp.env.MAHIRO_SKILLS_HOME!, ".letta", "skills");
      const keepHash = hashPath(join(root, "keep"));
      const sourceHash = hashSkillPayload(temp.source);
      writeFileSync(join(temp.source, "nested", "more.pyc"), "new synthetic ignored bytes\n");
      expect(hashSkillPayload(temp.source)).toBe(sourceHash);
      expect(getSkillManagerSnapshot("letta-code", "global", temp.env).skills.find((skill) => skill.name === "sample")?.status).toBe("current");
      writeFileSync(join(root, "sample", "old.pyo"), "unexpected installed bytes\n");
      expect(getSkillManagerSnapshot("letta-code", "global", temp.env).skills.find((skill) => skill.name === "sample")?.status).toBe("modified");
      const afterResult = install("letta-code", "global", ["sample"], true, temp.env);
      const after = JSON.parse(readFileSync(afterResult.receiptPath!, "utf8")) as InstallReceipt;
      expect(after.installedSkills).toEqual(["keep", "sample"]);
      expect(after.targetStates?.find((state) => state.name === "keep")).toEqual(before.targetStates?.find((state) => state.name === "keep"));
      expect(hashPath(join(root, "keep"))).toBe(keepHash);
      expect(existsSync(join(root, "sample", "old.pyo"))).toBe(false);
      expect(existsSync(join(root, "sample", "nested", "more.pyc"))).toBe(false);
      expect(getSkillManagerSnapshot("letta-code", "global", temp.env).skills.find((skill) => skill.name === "sample")?.status).toBe("current");
      writeFileSync(join(temp.source, "nested", "normal.py"), "# real source change\n");
      expect(getSkillManagerSnapshot("letta-code", "global", temp.env).skills.find((skill) => skill.name === "sample")?.status).toBe("outdated");
    } finally { temp.cleanup(); }
  });

  test("Agy alias transforms and executable assets survive the same payload filter", () => {
    const temp = makePayloadFixture();
    try {
      install("agy", "local", ["sample"], false, temp.env);
      const target = createPlan("agy", "local", ["sample"], temp.env).skills[0]!.target;
      const skill = readFileSync(join(target, "SKILL.md"), "utf8");
      expect(skill).toContain("name: mh-sample");
      expect(skill).toContain("disable-model-invocation: true");
      expect(skill).toContain("description: Mahiro Skill | Synthetic fixture.");
      expect(statSync(join(target, "run.sh")).mode & 0o777).toBe(0o755);
      expect(existsSync(join(target, "root.pyc"))).toBe(false);
      expect(existsSync(join(target, "nested", "__pycache__"))).toBe(false);
      expect(getSkillManagerSnapshot("agy", "local", temp.env).skills.find((skill) => skill.name === "sample")?.status).toBe("current");
    } finally { temp.cleanup(); }
  });
});
