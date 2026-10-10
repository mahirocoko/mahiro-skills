import { describe, expect, spyOn, test } from "bun:test";
import * as fs from "fs";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { hashPath } from "../src/content-hash";
import { install, InstallFailure, installReviewIdentity } from "../src/install";
import { createPlan } from "../src/plan";
import { makeTempEnv } from "./helpers";

function makeSafetyFixture() {
  const temp = makeTempEnv();
  const source = join(temp.root, "source");
  const env = { ...temp.env, HOME: temp.env.MAHIRO_SKILLS_HOME, MAHIRO_SKILLS_REPO_ROOT: source };
  for (const name of ["alpha", "beta", "gamma"]) {
    mkdirSync(join(source, "skills", name), { recursive: true });
    writeFileSync(join(source, "skills", name, "SKILL.md"), `---\nname: ${name}\ndescription: Fixture ${name}\n---\nVersion one\n`);
  }
  const initial = install("agy", "local", ["alpha", "beta", "gamma"], false, env);
  for (const name of ["alpha", "beta", "gamma"]) {
    const path = join(source, "skills", name, "SKILL.md");
    writeFileSync(path, readFileSync(path, "utf8").replace("one", "two"));
  }
  return { ...temp, env, source, initial };
}

describe("install", () => {
  test("failed restoration retains a dangling link and records its missing destination", () => {
    const temp = makeSafetyFixture();
    const beta = createPlan("agy", "local", ["beta"], temp.env).skills[0]!.target;
    const referent = join(temp.root, "absent-referent");
    fs.rmSync(beta, { recursive: true });
    symlinkSync(referent, beta);
    expect(hashPath(beta)).not.toBeNull();
    const original = fs.renameSync;
    const rename = spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(to) === beta && (String(from).endsWith("/payload") || String(from).endsWith("/previous"))) {
        throw new Error("injected dangling-link replacement/restoration failure");
      }
      return original(from, to);
    });
    try {
      let failure: unknown;
      try { install("agy", "local", ["alpha", "beta"], true, temp.env); } catch (error) { failure = error; }
      expect(failure).toBeInstanceOf(InstallFailure);
      const evidence = (failure as InstallFailure).evidence.targets.find((target) => target.name === "beta")!;
      expect(evidence.status).toBe("changed");
      expect(evidence.recoveryPath).toBeDefined();
      const backup = join(evidence.recoveryPath!, "previous");
      expect(lstatSync(backup).isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync(backup)).toBe(referent);
      const receipt = JSON.parse(readFileSync(temp.initial.receiptPath!, "utf8"));
      expect(receipt.targetStates.some((state: { name: string }) => state.name === "beta")).toBe(false);
    } finally {
      rename.mockRestore();
      temp.cleanup();
    }
  });

  test("review still binds exact receipt bytes when its file is a symlink", () => {
    const temp = makeSafetyFixture();
    try {
      const path = temp.initial.receiptPath!;
      const referent = join(temp.root, "receipt-referent.json");
      fs.renameSync(path, referent);
      symlinkSync(referent, path);
      const plan = createPlan("agy", "local", ["alpha"], temp.env);
      const identity = installReviewIdentity(plan);
      const before = hashPath(plan.skills[0]!.target);
      const receipt = JSON.parse(readFileSync(referent, "utf8"));
      receipt.installedAt = "changed-after-review";
      writeFileSync(referent, JSON.stringify(receipt));
      expect(() => install("agy", "local", ["alpha"], true, temp.env, identity)).toThrow("content changed after review");
      expect(hashPath(plan.skills[0]!.target)).toBe(before);
      expect(lstatSync(path).isSymbolicLink()).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("review fingerprints the symlink itself without reading its referent", () => {
    const temp = makeSafetyFixture();
    const plan = createPlan("agy", "local", ["alpha"], temp.env);
    const target = plan.skills[0]!.target;
    const referent = join(temp.root, "outside-review-scope");
    mkdirSync(referent);
    const externalFile = join(referent, "do-not-read.txt");
    writeFileSync(externalFile, "synthetic unrelated bytes");
    fs.rmSync(target, { recursive: true });
    symlinkSync(referent, target);
    const read = spyOn(fs, "readFileSync");
    try {
      const identity = installReviewIdentity(plan);
      writeFileSync(externalFile, "different unrelated bytes");
      expect(installReviewIdentity(plan)).toBe(identity);
      expect(read.mock.calls.some(([path]) => String(path).startsWith(`${referent}/`))).toBe(false);
      fs.unlinkSync(target);
      symlinkSync(`${referent}-retargeted`, target);
      expect(installReviewIdentity(plan)).not.toBe(identity);
    } finally {
      read.mockRestore();
      temp.cleanup();
    }
  });
  test("reports receipt synchronization failure without hiding completed targets", () => {
    const temp = makeSafetyFixture();
    const receiptBefore = readFileSync(temp.initial.receiptPath!, "utf8");
    const originalRename = fs.renameSync;
    const rename = spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(to) === temp.initial.receiptPath) throw new Error("injected receipt rename failure");
      return originalRename(from, to);
    });
    try {
      let failure: unknown;
      try { install("agy", "local", ["alpha", "beta"], true, temp.env); } catch (error) { failure = error; }
      const evidence = (failure as InstallFailure).evidence;
      expect(evidence.targets.map((target) => target.status)).toEqual(["changed", "changed"]);
      expect(evidence.receiptSync).toBe("failed");
      expect(evidence.receiptError).toContain("receipt rename failure");
      expect(readFileSync(temp.initial.receiptPath!, "utf8")).toBe(receiptBefore);
    } finally { rename.mockRestore(); temp.cleanup(); }
  });

  test("retains recovery bytes and removes a stale baseline when target restoration fails", () => {
    const temp = makeSafetyFixture();
    const beta = join(temp.initial.root, "skills", "mh-beta");
    const originalRename = fs.renameSync;
    const rename = spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(to) === beta && (String(from).endsWith("/payload") || String(from).endsWith("/previous"))) throw new Error("injected replacement and restore failure");
      return originalRename(from, to);
    });
    try {
      let failure: unknown;
      try { install("agy", "local", ["alpha", "beta", "gamma"], true, temp.env); } catch (error) { failure = error; }
      const evidence = (failure as InstallFailure).evidence;
      expect(evidence.targets.map((target) => target.status)).toEqual(["changed", "changed", "not-attempted"]);
      expect(evidence.receiptSync).toBe("synced");
      expect(readFileSync(join(evidence.targets[1]!.recoveryPath!, "previous", "SKILL.md"), "utf8")).toContain("Version one");
      const receipt = JSON.parse(readFileSync(temp.initial.receiptPath!, "utf8"));
      expect(receipt.targetStates.some((state: { name: string }) => state.name === "beta")).toBe(false);
      expect(existsSync(beta)).toBe(false);
    } finally { rename.mockRestore(); temp.cleanup(); }
  });
  test("validates the second payload before any selected target or receipt replacement", () => {
    const temp = makeSafetyFixture();
    try {
      const before = hashPath(temp.initial.root);
      writeFileSync(join(temp.source, "skills", "beta", "SKILL.md"), "malformed Agy payload");
      let failure: unknown;
      try { install("agy", "local", ["alpha", "beta", "gamma"], true, temp.env); } catch (error) { failure = error; }
      expect(failure).toBeInstanceOf(InstallFailure);
      expect((failure as InstallFailure).evidence.targets.map((target) => target.status)).toEqual(["not-attempted", "not-attempted", "not-attempted"]);
      expect((failure as InstallFailure).evidence.receiptSync).toBe("not-needed");
      expect(hashPath(temp.initial.root)).toBe(before);
    } finally { temp.cleanup(); }
  });

  test("reports prior progress, restores a failed replacement, and syncs only completed receipt states", () => {
    const temp = makeSafetyFixture();
    const originalRename = fs.renameSync;
    const beta = join(temp.initial.root, "skills", "mh-beta");
    const betaBefore = hashPath(beta);
    const rename = spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(from).endsWith("/payload") && String(to) === beta) throw new Error("injected second replacement failure");
      return originalRename(from, to);
    });
    try {
      let failure: unknown;
      try { install("agy", "local", ["alpha", "beta", "gamma"], true, temp.env); } catch (error) { failure = error; }
      expect(failure).toBeInstanceOf(InstallFailure);
      const evidence = (failure as InstallFailure).evidence;
      expect(evidence.targets.map((target) => target.status)).toEqual(["changed", "unchanged", "not-attempted"]);
      expect(evidence.receiptSync).toBe("synced");
      expect(hashPath(beta)).toBe(betaBefore);
      expect(readFileSync(join(temp.initial.root, "skills", "mh-alpha", "SKILL.md"), "utf8")).toContain("Version two");
      const receipt = JSON.parse(readFileSync(temp.initial.receiptPath!, "utf8"));
      for (const state of receipt.targetStates) {
        expect(state.installedHash).toBe(hashPath(join(temp.initial.root, "skills", `mh-${state.name}`)));
      }
      expect(readdirSync(join(temp.initial.root, "skills")).some((name) => name.startsWith(".mahiro-stage-"))).toBe(false);
    } finally { rename.mockRestore(); temp.cleanup(); }
  });

  test("refuses source drift during staging before the first replacement", () => {
    const temp = makeSafetyFixture();
    const before = hashPath(temp.initial.root);
    const plan = createPlan("agy", "local", ["alpha"], temp.env);
    const identity = installReviewIdentity(plan);
    const source = join(temp.source, "skills", "alpha", "SKILL.md");
    const originalCopy = fs.cpSync;
    const copy = spyOn(fs, "cpSync").mockImplementation((from, to, options) => {
      originalCopy(from, to, options);
      writeFileSync(source, readFileSync(source, "utf8").replace("two", "three"));
    });
    try {
      expect(() => install("agy", "local", ["alpha"], true, temp.env, identity)).toThrow("changed during staging");
      expect(hashPath(temp.initial.root)).toBe(before);
    } finally { copy.mockRestore(); temp.cleanup(); }
  });

  test("rechecks reviewed source and receipt at the installer boundary", () => {
    const temp = makeSafetyFixture();
    try {
      const identity = installReviewIdentity(createPlan("agy", "local", ["alpha"], temp.env));
      const before = hashPath(temp.initial.root);
      const source = join(temp.source, "skills", "alpha", "SKILL.md");
      writeFileSync(source, readFileSync(source, "utf8").replace("two", "three"));
      expect(() => install("agy", "local", ["alpha"], true, temp.env, identity)).toThrow("changed after review");
      expect(hashPath(temp.initial.root)).toBe(before);
    } finally { temp.cleanup(); }
  });

  test("copies scripted skill, paired command, and receipt", () => {
    const temp = makeTempEnv();
    try {
      const sourceSkillPath = join(import.meta.dir, "..", "skills", "project", "SKILL.md");
      const sourceCommandPath = join(import.meta.dir, "..", "commands", "project.md");
      const result = install("opencode", "local", ["project"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", ".mahiro-skills", "receipts", "local-opencode.json");
      const installedSkillPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "SKILL.md");
      const installedCommandPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        schemaVersion: number;
        agent: string;
        scope: string;
        root: string;
        sourceRepoPath: string;
        installedSkills: string[];
        installedCommands: string[];
        targetStates: { name: string; kind: string; sourceHash: string; installedHash: string }[];
        installedAt: string;
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "scripts", "utils.ts"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md"))).toBe(true);
      expect(readFileSync(sourceSkillPath, "utf8")).toContain("description: Clone and track external repos for study or development.");
      expect(readFileSync(sourceSkillPath, "utf8")).not.toContain("description: Mahiro Skill |");
      expect(readFileSync(sourceCommandPath, "utf8")).toContain("description: Clone and track external repos for study or development with ghq plus .agent-state-backed tracking.");
      expect(readFileSync(sourceCommandPath, "utf8")).not.toContain("description: Mahiro Skill |");
      expect(readFileSync(installedSkillPath, "utf8")).toContain("description: Mahiro Skill | Clone and track external repos for study or development.");
      expect(readFileSync(installedCommandPath, "utf8")).toContain("description: Mahiro Skill | Clone and track external repos for study or development with ghq plus .agent-state-backed tracking.");
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("opencode");
      expect(receipt.schemaVersion).toBe(2);
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode"));
      expect(receipt.sourceRepoPath.length).toBeGreaterThan(0);
      expect(result.installed).toEqual(["project"]);
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual(["project"]);
      expect(receipt.targetStates).toHaveLength(2);
      expect(receipt.targetStates.map(({ name, kind }) => ({ name, kind }))).toEqual([
        { name: "project", kind: "skill" },
        { name: "project", kind: "command" },
      ]);
      expect(receipt.targetStates.every(({ sourceHash, installedHash }) => sourceHash.length === 64 && installedHash.length === 64)).toBe(true);
      expect(receipt.installedAt.length).toBeGreaterThan(0);
    } finally {
      temp.cleanup();
    }
  });

  test("surfaces bundle description when installing the default bundle", () => {
    const temp = makeTempEnv();
    try {
      const result = install("opencode", "local", [], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", ".mahiro-skills", "receipts", "local-opencode.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        description?: string;
      };

      expect(result.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
      expect(result.installed).toEqual(["asset-designer", "auditing-context-contracts", "codex-asset-production", "control-room-goals", "creating-character-ip", "direct-cli", "fable", "forward", "gemini", "herdr-cli", "learn", "mac-calendar-booking", "mahiro-docs-rules-init", "mahiro-guidance-refine", "mahiro-style", "motion-design", "project", "recap", "review-comment", "rrr", "skill-doctor", "studying-codrops", "web-asset-prompts", "watch", "working-tasks"]);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "auditing-context-contracts", "scripts", "scan-context-contracts.ts"))).toBe(true);
      expect(receipt.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
    } finally {
      temp.cleanup();
    }
  });

  test("preserves the receipt description when updating explicit installed items", () => {
    const temp = makeTempEnv();
    try {
      const initial = install("opencode", "local", [], false, temp.env);
      const initialReceipt = JSON.parse(readFileSync(initial.receiptPath!, "utf8"));
      expect(initialReceipt.description).toContain("Packaged local skills");

      const updated = install("opencode", "local", initialReceipt.installedSkills, true, temp.env);
      const updatedReceipt = JSON.parse(readFileSync(updated.receiptPath!, "utf8"));
      expect(updatedReceipt.description).toBe(initialReceipt.description);
    } finally {
      temp.cleanup();
    }
  });

  test("merges incremental installs into the existing receipt", () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["project"], false, temp.env);
      const result = install("opencode", "local", ["recap"], false, temp.env);
      const receipt = JSON.parse(readFileSync(result.receiptPath!, "utf8")) as {
        installedSkills: string[];
        installedCommands: string[];
        targetStates: { name: string; kind: string }[];
      };

      expect(result.installed).toEqual(["recap"]);
      expect(receipt.installedSkills).toEqual(["project", "recap"]);
      expect(receipt.installedCommands).toEqual(["project", "recap"]);
      expect(receipt.targetStates.map(({ name, kind }) => `${kind}:${name}`)).toEqual([
        "skill:project",
        "command:project",
        "skill:recap",
        "command:recap",
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("preserves opaque gemini subtree", () => {
    const temp = makeTempEnv();
    try {
      install("claude-code", "local", ["gemini"], false, temp.env);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".claude", "skills", "gemini", "extension", "manifest.json"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("installs one skill and paired command for cursor", () => {
    const temp = makeTempEnv();
    try {
      const result = install("cursor", "local", ["project"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", ".mahiro-skills", "receipts", "local-cursor.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor", "commands", "project.md"))).toBe(true);
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("cursor");
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".cursor"));
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual(["project"]);
    } finally {
      temp.cleanup();
    }
  });

  test("installs Agy skills as self-contained namespaced slash aliases", () => {
    const temp = makeTempEnv();
    try {
      const result = install("agy", "local", ["learn", "direct-cli"], false, temp.env);
      const root = join(temp.env.MAHIRO_SKILLS_CWD!, ".agents");
      const learnPath = join(root, "skills", "mh-learn", "SKILL.md");
      const directCliPath = join(root, "skills", "mh-direct-cli", "SKILL.md");
      const receiptPath = join(root, ".mahiro-skills", "receipts", "local-agy.json");
      const learn = readFileSync(learnPath, "utf8");
      const directCli = readFileSync(directCliPath, "utf8");
      const sourceLearn = readFileSync(join(import.meta.dir, "..", "skills", "learn", "SKILL.md"), "utf8");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.installed).toEqual(["learn", "direct-cli"]);
      expect(learn).toContain("name: mh-learn");
      expect(learn).toContain("disable-model-invocation: true");
      expect(learn).not.toContain("disable-slash-command:");
      expect(sourceLearn).toContain("name: learn");
      expect(sourceLearn).toContain("disable-slash-command: true");
      expect(directCli).toContain("name: mh-direct-cli");
      expect(directCli).toContain("disable-model-invocation: true");
      expect(existsSync(join(root, "skills", "mh-direct-cli", "playbook.md"))).toBe(true);
      expect(existsSync(join(root, "skills", "learn"))).toBe(false);
      expect(existsSync(join(root, "commands"))).toBe(false);
      expect(receipt.agent).toBe("agy");
      expect(receipt.installedSkills).toEqual(["learn", "direct-cli"]);
      expect(receipt.installedCommands).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("removes only unchanged receipt-managed targets from the retired Gemini adapter during Agy install", () => {
    const temp = makeTempEnv();
    try {
      const legacyRoot = join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini");
      const skillTarget = join(legacyRoot, "skills", "learn");
      const commandTarget = join(legacyRoot, "commands", "mh-learn.toml");
      const unrelatedTarget = join(legacyRoot, "skills", "cloudflare");
      const legacyReceiptPath = join(legacyRoot, ".mahiro-skills", "receipts", "global-gemini.json");
      mkdirSync(skillTarget, { recursive: true });
      mkdirSync(unrelatedTarget, { recursive: true });
      mkdirSync(dirname(commandTarget), { recursive: true });
      mkdirSync(dirname(legacyReceiptPath), { recursive: true });
      writeFileSync(join(skillTarget, "SKILL.md"), "legacy learn\n");
      writeFileSync(commandTarget, "legacy command\n");
      writeFileSync(join(unrelatedTarget, "SKILL.md"), "unrelated\n");
      writeFileSync(legacyReceiptPath, JSON.stringify({
        schemaVersion: 2,
        agent: "gemini",
        scope: "global",
        root: legacyRoot,
        installedSkills: ["learn"],
        installedCommands: ["learn"],
        targetStates: [
          {
            name: "learn",
            kind: "skill",
            sourceHash: "0".repeat(64),
            installedHash: hashPath(skillTarget),
          },
          {
            name: "learn",
            kind: "command",
            sourceHash: "0".repeat(64),
            installedHash: hashPath(commandTarget),
          },
        ],
      }));

      const result = install("agy", "global", ["learn"], false, temp.env);

      expect(existsSync(skillTarget)).toBe(false);
      expect(existsSync(commandTarget)).toBe(false);
      expect(existsSync(unrelatedTarget)).toBe(true);
      expect(existsSync(legacyReceiptPath)).toBe(false);
      expect(existsSync(join(legacyRoot, "config", "skills", "mh-learn", "SKILL.md"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("Removed 2 unchanged receipt-managed target(s)"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("preserves modified retired Gemini targets during Agy install", () => {
    const temp = makeTempEnv();
    try {
      const legacyRoot = join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini");
      const skillTarget = join(legacyRoot, "skills", "learn");
      const legacyReceiptPath = join(legacyRoot, ".mahiro-skills", "receipts", "global-gemini.json");
      mkdirSync(skillTarget, { recursive: true });
      mkdirSync(dirname(legacyReceiptPath), { recursive: true });
      writeFileSync(join(skillTarget, "SKILL.md"), "modified learn\n");
      writeFileSync(legacyReceiptPath, JSON.stringify({
        schemaVersion: 2,
        agent: "gemini",
        scope: "global",
        root: legacyRoot,
        installedSkills: ["learn"],
        installedCommands: [],
        targetStates: [{
          name: "learn",
          kind: "skill",
          sourceHash: "0".repeat(64),
          installedHash: "f".repeat(64),
        }],
      }));

      const result = install("agy", "global", ["learn"], false, temp.env);

      expect(existsSync(skillTarget)).toBe(true);
      expect(existsSync(legacyReceiptPath)).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("Preserved 1 modified or invalid"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("preserves invalid or legacy retired Gemini receipts during Agy install", () => {
    const temp = makeTempEnv();
    try {
      const legacyRoot = join(temp.env.MAHIRO_SKILLS_HOME!, ".gemini");
      const skillTarget = join(legacyRoot, "skills", "learn");
      const legacyReceiptPath = join(legacyRoot, ".mahiro-skills", "receipts", "global-gemini.json");
      mkdirSync(skillTarget, { recursive: true });
      mkdirSync(dirname(legacyReceiptPath), { recursive: true });
      writeFileSync(join(skillTarget, "SKILL.md"), "legacy learn\n");
      writeFileSync(legacyReceiptPath, JSON.stringify({
        schemaVersion: 1,
        agent: "gemini",
        scope: "global",
        root: legacyRoot,
        installedSkills: ["learn"],
        installedCommands: [],
      }));

      const result = install("agy", "global", ["learn"], false, temp.env);

      expect(existsSync(skillTarget)).toBe(true);
      expect(existsSync(legacyReceiptPath)).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("Preserved invalid or legacy"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("installs one skill for Letta Code without command output", () => {
    const temp = makeTempEnv();
    try {
      const result = install("letta-code", "local", ["project"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", ".mahiro-skills", "receipts", "local-letta-code.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "commands", "project.md"))).toBe(false);
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("letta-code");
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents"));
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual([]);
      expect(result.description).toBeUndefined();
    } finally {
      temp.cleanup();
    }
  });

  test("installs Agy-first dicut routing for Letta Code", () => {
    const temp = makeTempEnv();
    try {
      const result = install(
        "letta-code",
        "local",
        ["web-asset-prompts", "asset-designer", "codex-asset-production", "direct-cli"],
        false,
        temp.env,
      );
      const skillsRoot = join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills");
      const assetDesigner = readFileSync(join(skillsRoot, "asset-designer", "SKILL.md"), "utf8");
      const codexAssetProduction = readFileSync(join(skillsRoot, "codex-asset-production", "SKILL.md"), "utf8");
      const webAssetPrompts = readFileSync(join(skillsRoot, "web-asset-prompts", "SKILL.md"), "utf8");
      const directCli = readFileSync(join(skillsRoot, "direct-cli", "SKILL.md"), "utf8");
      const directCliPlaybook = readFileSync(join(skillsRoot, "direct-cli", "playbook.md"), "utf8");

      expect(result.installed).toEqual(["web-asset-prompts", "asset-designer", "codex-asset-production", "direct-cli"]);
      expect(assetDesigner).toContain("description: Mahiro Skill | Directs website image assets and Agy/Gemini-first dicut work with an explicit Codex fallback");
      expect(assetDesigner).toContain("Agy/Gemini as the first semantic-dicut candidate writer");
      expect(assetDesigner).toContain("remains the explicit dicut fallback and same-input A/B lane");
      expect(codexAssetProduction).toContain("Route final dicut through Agy first and retain Codex fallback");
      expect(webAssetPrompts).toContain("routes Agy/Gemini first and keeps Codex as an explicit fallback/A-B lane");
      expect(directCli).toContain("use `asset-designer` as the front-door workflow");
      expect(directCliPlaybook).toContain("`agy-dicut`");
      expect(directCliPlaybook).toContain("`codex-dicut-fallback`");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "commands", "asset-designer.md"))).toBe(false);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "commands", "codex-asset-production.md"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("installs one skill for Pi without command output", () => {
    const temp = makeTempEnv();
    try {
      const isolatedRoot = join(temp.root, "pi-isolated", ".pi", "agent");
      const env = { ...temp.env, PI_CODING_AGENT_DIR: isolatedRoot };
      const result = install("pi", "global", ["project"], false, env);
      const receiptPath = join(isolatedRoot, ".mahiro-skills", "receipts", "global-pi.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(isolatedRoot, "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(isolatedRoot, "commands", "project.md"))).toBe(false);
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("pi");
      expect(receipt.scope).toBe("global");
      expect(receipt.root).toBe(isolatedRoot);
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("installs one skill and markdown command for codex", () => {
    const temp = makeTempEnv();
    try {
      const result = install("codex", "local", ["project"], false, temp.env);
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", ".mahiro-skills", "receipts", "local-codex.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        agent: string;
        scope: string;
        root: string;
        installedSkills: string[];
        installedCommands: string[];
      };

      expect(result.status).toBe("installed");
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", "skills", "project", "SKILL.md"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".codex", "commands", "project.md"))).toBe(true);
      expect(existsSync(receiptPath)).toBe(true);
      expect(receipt.agent).toBe("codex");
      expect(receipt.scope).toBe("local");
      expect(receipt.root).toBe(join(temp.env.MAHIRO_SKILLS_CWD!, ".codex"));
      expect(receipt.installedSkills).toEqual(["project"]);
      expect(receipt.installedCommands).toEqual(["project"]);
    } finally {
      temp.cleanup();
    }
  });

  test("copies direct-cli skill, current playbook, and paired command", () => {
    const temp = makeTempEnv();
    try {
      const sourceSkillPath = join(import.meta.dir, "..", "skills", "direct-cli", "SKILL.md");
      const sourceCommandPath = join(import.meta.dir, "..", "commands", "direct-cli.md");
      const result = install("opencode", "local", ["direct-cli"], false, temp.env);
      const installedSkillPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "SKILL.md");
      const installedPlaybookPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "playbook.md");
      const installedSelectorPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "scripts", "select-backend.sh");
      const installedFanoutPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "scripts", "prompt-fanout.py");
      const installedJobsPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "direct-cli", "scripts", "herdr-jobs.py");
      const installedCommandPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "direct-cli.md");

      expect(result.status).toBe("installed");
      expect(existsSync(installedPlaybookPath)).toBe(true);
      expect(existsSync(installedSelectorPath)).toBe(true);
      expect(statSync(installedSelectorPath).mode & 0o111).not.toBe(0);
      expect(existsSync(installedFanoutPath)).toBe(true);
      expect(statSync(installedFanoutPath).mode & 0o111).not.toBe(0);
      expect(existsSync(installedJobsPath)).toBe(true);
      expect(statSync(installedJobsPath).mode & 0o111).not.toBe(0);
      expect(readFileSync(sourceSkillPath, "utf8")).toContain("description: Direct executor playbook for using Cursor CLI, Antigravity CLI, and Codex CLI through verified Orca or Herdr managed terminals with a tmux fallback");
      expect(readFileSync(sourceSkillPath, "utf8")).not.toContain("description: Mahiro Skill |");
      expect(readFileSync(sourceCommandPath, "utf8")).toContain("description: Direct executor playbook for using Cursor CLI, Antigravity CLI, and Codex CLI through verified Orca or Herdr managed terminals with a tmux fallback");
      expect(readFileSync(sourceCommandPath, "utf8")).not.toContain("description: Mahiro Skill |");
      expect(readFileSync(installedSkillPath, "utf8")).toContain("description: Mahiro Skill | Direct executor playbook for using Cursor CLI, Antigravity CLI, and Codex CLI through verified Orca or Herdr managed terminals with a tmux fallback");
      expect(readFileSync(installedCommandPath, "utf8")).toContain("description: Mahiro Skill | Direct executor playbook for using Cursor CLI, Antigravity CLI, and Codex CLI through verified Orca or Herdr managed terminals with a tmux fallback");
      expect(readFileSync(installedPlaybookPath, "utf8")).not.toContain("## Gemini CLI direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).toContain("## Cursor CLI direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).toContain("## Antigravity CLI direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).toContain("## Codex CLI direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).not.toContain("## Pi direct playbook");
      expect(readFileSync(installedPlaybookPath, "utf8")).toContain("**fresh backend container, narrow scope, pane-first truth**");
      expect(result.installed).toEqual(["direct-cli"]);
    } finally {
      temp.cleanup();
    }
  });

  test("fails on collisions without overwrite", () => {
    const temp = makeTempEnv();
    try {
      const target = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project");
      const commandsTarget = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md");
      const receiptPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", ".mahiro-skills", "receipts", "local-opencode.json");
      mkdirSync(target, { recursive: true });
      writeFileSync(join(target, "placeholder.txt"), "collision");

      expect(() => install("opencode", "local", ["project"], false, temp.env)).toThrow("Collision detected");
      expect(existsSync(join(target, "placeholder.txt"))).toBe(true);
      expect(existsSync(join(target, "scripts", "utils.ts"))).toBe(false);
      expect(existsSync(commandsTarget)).toBe(false);
      expect(existsSync(receiptPath)).toBe(false);
      expect(readdirSync(dirname(target))).toEqual(["project"]);
    } finally {
      temp.cleanup();
    }
  });

  test("overwrites collided target when overwrite is true", () => {
    const temp = makeTempEnv();
    try {
      const target = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project");
      const commandTarget = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md");
      mkdirSync(target, { recursive: true });
      writeFileSync(join(target, "placeholder.txt"), "collision");
      mkdirSync(dirname(commandTarget), { recursive: true });
      writeFileSync(commandTarget, "---\ndescription: stale\n---\n");

      const result = install("opencode", "local", ["project"], true, temp.env);

      expect(result.status).toBe("installed");
      expect(existsSync(join(target, "placeholder.txt"))).toBe(false);
      expect(existsSync(join(target, "scripts", "utils.ts"))).toBe(true);
      expect(existsSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "commands", "project.md"))).toBe(true);
      expect(readFileSync(join(target, "SKILL.md"), "utf8")).toContain("description: Mahiro Skill | Clone and track external repos for study or development.");
      expect(readFileSync(commandTarget, "utf8")).toContain("description: Mahiro Skill | Clone and track external repos for study or development with ghq plus .agent-state-backed tracking.");
    } finally {
      temp.cleanup();
    }
  });

  test("replaces a legacy symlink at the resolved adapter root without mutating its target", () => {
    const temp = makeTempEnv();
    try {
      const legacy = join(temp.env.MAHIRO_SKILLS_HOME!, ".agents", "skills", "project");
      const marker = join(legacy, "LEGACY.txt");
      mkdirSync(legacy, { recursive: true });
      writeFileSync(marker, "legacy-target\n");
      const lettaSkill = join(temp.env.MAHIRO_SKILLS_HOME!, ".letta", "skills", "project");
      mkdirSync(join(temp.env.MAHIRO_SKILLS_HOME!, ".letta", "skills"), { recursive: true });
      symlinkSync(legacy, lettaSkill);

      const result = install("letta-code", "global", ["project"], false, temp.env);

      expect(result.status).toBe("installed");
      expect(lstatSync(lettaSkill).isSymbolicLink()).toBe(false);
      expect(lstatSync(lettaSkill).isDirectory()).toBe(true);
      expect(existsSync(join(lettaSkill, "SKILL.md"))).toBe(true);
      expect(readFileSync(marker, "utf8")).toBe("legacy-target\n");
      expect(existsSync(join(legacy, "SKILL.md"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("replaces a legacy letta symlink on overwrite without mutating the old target", () => {
    const temp = makeTempEnv();
    try {
      const legacy = join(temp.env.MAHIRO_SKILLS_HOME!, "legacy-project-target");
      const marker = join(legacy, "LEGACY.txt");
      mkdirSync(legacy, { recursive: true });
      writeFileSync(marker, "legacy-target\n");
      const lettaRoot = join(temp.env.MAHIRO_SKILLS_HOME!, ".letta");
      const lettaSkill = join(lettaRoot, "skills", "project");
      const pairedSkill = join(lettaRoot, "skills", "learn");
      mkdirSync(join(lettaRoot, "skills"), { recursive: true });
      symlinkSync(legacy, lettaSkill);

      const result = install("letta-code", "global", ["project", "learn"], true, temp.env);
      const receiptPath = join(lettaRoot, ".mahiro-skills", "receipts", "global-letta-code.json");
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
        installedSkills: string[];
        targetStates: { name: string; kind: string; sourceHash: string; installedHash: string }[];
      };
      const states = Object.fromEntries(receipt.targetStates.map((state) => [`${state.kind}:${state.name}`, state]));

      expect(result.status).toBe("installed");
      expect(result.installed).toEqual(["project", "learn"]);
      expect(lstatSync(lettaSkill).isSymbolicLink()).toBe(false);
      expect(lstatSync(lettaSkill).isDirectory()).toBe(true);
      expect(existsSync(join(lettaSkill, "SKILL.md"))).toBe(true);
      expect(lstatSync(pairedSkill).isDirectory()).toBe(true);
      expect(lstatSync(legacy).isDirectory()).toBe(true);
      expect(readFileSync(marker, "utf8")).toBe("legacy-target\n");
      expect(existsSync(join(legacy, "SKILL.md"))).toBe(false);
      const projectHash = hashPath(lettaSkill);
      const pairedHash = hashPath(pairedSkill);
      if (!projectHash || !pairedHash) {
        throw new Error("installed skill hash was missing");
      }
      expect(receipt.installedSkills).toEqual(["project", "learn"]);
      expect(states["skill:project"]?.installedHash).toBe(projectHash);
      expect(states["skill:learn"]?.installedHash).toBe(pairedHash);
      expect(states["skill:project"]?.sourceHash).toHaveLength(64);
      expect(states["skill:learn"]?.sourceHash).toHaveLength(64);
    } finally {
      temp.cleanup();
    }
  });

  test("keeps Agy skill naming adapter-specific", () => {
    const temp = makeTempEnv();
    try {
      const result = install("agy", "local", ["project"], false, temp.env);
      const root = join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills");

      expect(result.installed).toEqual(["project"]);
      expect(lstatSync(join(root, "mh-project")).isDirectory()).toBe(true);
      expect(existsSync(join(root, "project"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });
});
