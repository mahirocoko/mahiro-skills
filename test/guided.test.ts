import { describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import * as fs from "fs";
import { spyOn } from "bun:test";
import { listInstalledSummaries } from "../src/list";
import { join } from "path";

import { hashPath } from "../src/content-hash";
import { install } from "../src/install";
import { createPlan } from "../src/plan";

import { runGuided } from "../src/guided";
import type { PromptOption } from "../src/prompt";
import type { CliOptions, InstalledSummary, InstallPlan, InstallResult, UninstallResult } from "../src/types";
import type { GuidedOutcome } from "../src/guided";
import { makeTempEnv } from "./helpers";

const ansiPattern = /\x1B\[[0-?]*[ -/]*[@-~]/g;

function stripAnsi(value: string): string {
  return value.replace(ansiPattern, "");
}

function expectInstallPlan(result: GuidedOutcome): InstallPlan {
  expect(Array.isArray(result)).toBe(false);
  expect("requested" in result).toBe(true);
  return result as InstallPlan;
}

function expectInstallPlans(result: GuidedOutcome): InstallPlan[] {
  expect(Array.isArray(result)).toBe(true);
  return result as InstallPlan[];
}

function expectInstallResult(result: GuidedOutcome): InstallResult {
  expect(Array.isArray(result)).toBe(false);
  expect("status" in result).toBe(true);
  return result as InstallResult;
}

function expectUninstallResult(result: GuidedOutcome): UninstallResult {
  expect(Array.isArray(result)).toBe(false);
  expect("receiptRemoved" in result).toBe(true);
  return result as UninstallResult;
}

function expectInstalledSummaries(result: GuidedOutcome): InstalledSummary[] {
  expect(Array.isArray(result)).toBe(true);
  return result as InstalledSummary[];
}

function makeOptions(overrides: Partial<CliOptions> = {}): CliOptions {
  return {
    command: "tui",
    items: [],
    agents: [],
    overwrite: false,
    copyTemplate: false,
    yes: false,
    ...overrides,
  };
}

function makePromptIo(
  selections: string[] = [],
  multiSelections: string[][] = [],
  confirmations: boolean[] = [],
  isInteractive = true,
) {
  const writes: string[] = [];

  return {
    writes,
    io: {
      isInteractive,
      write(message: string) {
        writes.push(message);
      },
      note(message: string, title?: string) {
        writes.push(title ? `[note:${title}] ${message}` : `[note] ${message}`);
      },
      cancel(message: string) {
        writes.push(`[cancel] ${message}`);
      },
      outro(message: string) {
        writes.push(`[outro] ${message}`);
      },
      async select<T extends string>(label: string, options: readonly PromptOption<T>[]) {
        writes.push(label);
        const answer = selections.shift();
        expect(answer).toBeDefined();
        expect(options.some((option) => option.value === answer)).toBe(true);
        return answer as T;
      },
      async multiselect<T extends string>(label: string, options: readonly PromptOption<T>[]) {
        writes.push(label);
        const answer = multiSelections.shift() ?? [];
        expect(answer.length).toBeGreaterThan(0);
        expect(answer.every((value) => options.some((option) => option.value === value))).toBe(true);
        return answer as T[];
      },
      async confirm(question: string) {
        writes.push(question);
        return confirmations.shift() ?? false;
      },
      close() {},
    },
  };
}

function makeUpdateFixture() {
  const temp = makeTempEnv();
  const source = join(temp.root, "source");
  mkdirSync(join(source, "commands"), { recursive: true });
  for (const name of ["alpha", "beta"]) {
    mkdirSync(join(source, "skills", name), { recursive: true });
    writeFileSync(join(source, "skills", name, "SKILL.md"), `---\nname: ${name}\ndescription: Fixture ${name}\n---\nVersion one\n`);
    writeFileSync(join(source, "commands", `${name}.md`), `Command ${name} version one\n`);
  }
  writeFileSync(join(source, "commands", "command-only.md"), "Command-only version one\n");
  const env = { ...temp.env, HOME: temp.env.MAHIRO_SKILLS_HOME, MAHIRO_SKILLS_REPO_ROOT: source };
  const receipts = [
    install("cursor", "global", ["alpha", "beta", "command-only"], false, env),
    install("letta-code", "global", ["alpha", "beta"], false, env),
    install("letta-code", "local", ["alpha", "beta"], false, env),
  ];
  for (const name of ["alpha", "beta"]) {
    writeFileSync(join(source, "skills", name, "SKILL.md"), `---\nname: ${name}\ndescription: Fixture ${name}\n---\nVersion two\n`);
    writeFileSync(join(source, "commands", `${name}.md`), `Command ${name} version two\n`);
  }
  writeFileSync(join(source, "commands", "command-only.md"), "Command-only version two\n");
  return {
    ...temp,
    env,
    receipts,
    hashes() {
      return [hashPath(env.MAHIRO_SKILLS_HOME), hashPath(env.MAHIRO_SKILLS_CWD)];
    },
  };
}

describe("guided", () => {
  test("exposes completed and not-attempted agents after a real later replacement failure", async () => {
    const temp = makeUpdateFixture();
    const summaries = listInstalledSummaries(temp.env);
    const second = summaries[1]!;
    const secondTarget = createPlan(second.agent, second.scope, ["alpha"], temp.env).skills[0]!.target;
    const last = summaries[2]!;
    const lastRoot = createPlan(last.agent, last.scope, ["alpha"], temp.env).root;
    const lastBefore = hashPath(lastRoot);
    const originalRename = fs.renameSync;
    const rename = spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(from).endsWith("/payload") && String(to) === secondTarget) throw new Error("later agent failure");
      return originalRename(from, to);
    });
    try {
      let failure: any;
      try { await runGuided(makeOptions({ mode: "update", yes: true }), temp.env, makePromptIo([], [], [], false).io); } catch (error) { failure = error; }
      expect(failure.progress.completed).toHaveLength(1);
      expect(failure.progress.completed[0].agent).toBe(summaries[0]!.agent);
      expect(failure.progress.failed.error.evidence.targets[0].status).toBe("unchanged");
      expect(failure.progress.notAttempted).toEqual([{ agent: last.agent, scope: last.scope }]);
      expect(hashPath(lastRoot)).toBe(lastBefore);
      const first = summaries[0]!;
      const firstTarget = createPlan(first.agent, first.scope, ["alpha"], temp.env).skills[0]!.target;
      expect(readFileSync(join(firstTarget, "SKILL.md"), "utf8")).toContain("Version two");
    } finally { rename.mockRestore(); temp.cleanup(); }
  });
  for (const drift of ["source", "modified-target", "receipt"] as const) {
    test(`refuses guided update approval after ${drift} bytes drift`, async () => {
      const temp = makeUpdateFixture();
      try {
        const plan = createPlan("letta-code", "local", ["alpha"], temp.env);
        const target = plan.skills[0]!.target;
        if (drift === "modified-target") writeFileSync(join(target, "SKILL.md"), "first user edit");
        const before = temp.hashes();
        const prompt = makePromptIo();
        prompt.io.confirm = async () => {
          if (drift === "source") {
            const source = join(temp.env.MAHIRO_SKILLS_REPO_ROOT, "skills", "alpha", "SKILL.md");
            writeFileSync(source, readFileSync(source, "utf8").replace("Version two", "Version three"));
          } else if (drift === "modified-target") {
            writeFileSync(join(target, "SKILL.md"), "second user edit");
          } else {
            const receipt = temp.receipts[2]!.receiptPath!;
            writeFileSync(receipt, `${readFileSync(receipt, "utf8")}\n`);
          }
          return true;
        };
        await expect(runGuided(makeOptions({ mode: "update", agents: ["letta-code"], scope: "local", items: ["alpha"], overwrite: true }), temp.env, prompt.io)).rejects.toThrow("changed after review");
        if (drift === "source") expect(temp.hashes()).toEqual(before);
        if (drift === "modified-target") expect(readFileSync(join(target, "SKILL.md"), "utf8")).toBe("second user edit");
        if (drift === "receipt") expect(readFileSync(join(target, "SKILL.md"), "utf8")).toContain("Version one");
      } finally { temp.cleanup(); }
    });
  }

  test("runs interactive install flow and confirms install", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["agy"], ["gemini"]], [true]);

    try {
      const result = expectInstallResult(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result.status).toBe("installed");
      expect(result.agent).toBe("agy");
      expect(result.installed).toEqual(["gemini"]);
      expect(prompt.writes.some((entry) => entry.includes("[note:Install preview]"))).toBe(true);
      expect(prompt.writes.some((entry) => entry.includes(" -> "))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("skips final confirmation when --yes is provided", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["opencode"], ["project"]]);

    try {
      const result = expectInstallResult(await runGuided(makeOptions({ yes: true }), temp.env, prompt.io));

      expect(result.status).toBe("installed");
      expect(prompt.writes.some((entry) => entry.includes("Proceed with install?"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("prompts for overwrite when collisions exist", async () => {
    const temp = makeTempEnv();
    const firstPrompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["cursor"], ["project"]], [true]);
    const secondPrompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["cursor"], ["project"]], [true, true]);

    try {
      await runGuided(makeOptions(), temp.env, firstPrompt.io);
      const result = expectInstallResult(await runGuided(makeOptions(), temp.env, secondPrompt.io));

      expect(result.status).toBe("installed");
      expect(secondPrompt.writes.some((entry) => entry.includes("Collisions detected. Overwrite existing targets?"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("runs interactive uninstall flow for a selected installed item", async () => {
    const temp = makeTempEnv();
    await runGuided(makeOptions({ mode: "install", agents: ["cursor"], scope: "local", items: ["project", "recap"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
    const prompt = makePromptIo(["uninstall", "pick", "local", "custom-items", "exit"], [["cursor"], ["project"]], [true]);

    try {
      const result = expectUninstallResult(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result.status).toBe("uninstalled");
      expect(result.agent).toBe("cursor");
      expect(result.uninstalled).toEqual(["project"]);
      expect(result.receiptRemoved).toBe(false);
      expect(prompt.writes).toContain("Uninstall items");
      expect(prompt.writes).toContain("Choose installed items");
      expect(prompt.writes).toContain("Proceed with uninstall for cursor (local)?");
      expect(prompt.writes.some((entry) => entry.includes("[note:Uninstall preview]"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("runs interactive uninstall for all installed items across all selected agents", async () => {
    const temp = makeTempEnv();
    await runGuided(makeOptions({ mode: "install", agents: ["cursor"], scope: "local", items: ["project"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
    await runGuided(makeOptions({ mode: "install", agents: ["agy"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
    const prompt = makePromptIo(["uninstall", "all", "local", "all-installed", "exit"], [], [true]);

    try {
      const result = await runGuided(makeOptions(), temp.env, prompt.io) as UninstallResult[];

      expect(result).toHaveLength(7);
      expect(result.find((entry) => entry.agent === "cursor")?.uninstalled).toEqual(["project"]);
      expect(result.find((entry) => entry.agent === "agy")?.uninstalled).toEqual(["gemini"]);
      expect(result.find((entry) => entry.agent === "cursor")?.receiptRemoved).toBe(true);
      expect(result.find((entry) => entry.agent === "agy")?.receiptRemoved).toBe(true);
      expect(prompt.writes.filter((entry) => entry.startsWith("Proceed with uninstall"))).toEqual(["Proceed with uninstall for 7 agents (local)?"]);
      expect(prompt.writes.some((entry) => entry.includes("[note:Batch uninstall summary]"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("shows installed summaries in guided list mode after agent multiselect", async () => {
    const temp = makeTempEnv();
    const listPrompt = makePromptIo(["list", "pick", "exit"], [["cursor"]]);

    try {
      await runGuided(makeOptions({ mode: "install", agents: ["cursor"], scope: "local", items: ["project"], yes: true }), temp.env, makePromptIo([], [], [], false).io);

      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, listPrompt.io));

      expect(result).toEqual([
        {
          agent: "cursor",
          scope: "local",
          installedSkills: ["project"],
          installedCommands: ["project"],
          installed: ["project"],
        },
      ]);
      expect(listPrompt.writes.some((entry) => entry.includes("Home"))).toBe(true);
      expect(listPrompt.writes.some((entry) => entry.includes("Toggle agents"))).toBe(true);
      expect(listPrompt.writes.some((entry) => entry.includes("Scope"))).toBe(false);
      expect(listPrompt.writes.some((entry) => entry.includes("[note:cursor (local)]"))).toBe(true);
      expect(listPrompt.writes.some((entry) => entry.includes("Skills\n- project"))).toBe(true);
      expect(listPrompt.writes.some((entry) => entry.includes("Commands\n- project"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("shows receipt detail for a chosen agent and scope", async () => {
    const temp = makeTempEnv();
    await runGuided(makeOptions({ mode: "install", agents: ["agy"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);

    const detailPrompt = makePromptIo(["detail", "pick", "local", "exit"], [["agy"]]);

    try {
      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, detailPrompt.io));

      expect(result).toEqual([
        {
          agent: "agy",
          scope: "local",
          installedSkills: ["gemini"],
          installedCommands: [],
          installed: ["gemini"],
        },
      ]);
      expect(detailPrompt.writes.some((entry) => entry.includes("[note:Receipt: agy (local)]"))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes("Summary\n- agent: agy"))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes("Paths\n- root:"))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes("- source repo:"))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes("Installed items\nSkills (1)"))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes("Target files\nSkills (1)"))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes("  from: "))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes("  to:   "))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("updates all installed receipt items without prompting for agent scope items or overwrite", async () => {
    const temp = makeTempEnv();
    await runGuided(makeOptions({ mode: "install", agents: ["cursor"], scope: "local", items: ["project"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
    await runGuided(makeOptions({ mode: "install", agents: ["agy"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);

    const updatePrompt = makePromptIo(["update", "exit"], [], [true]);

    try {
      const result = await runGuided(makeOptions(), temp.env, updatePrompt.io);
      const updates = result as InstallResult[];

      expect(updates).toHaveLength(2);
      expect(updates.map((update) => update.agent).sort()).toEqual(["agy", "cursor"]);
      expect(updates.find((update) => update.agent === "cursor")?.installed).toEqual(["project"]);
      expect(updates.find((update) => update.agent === "agy")?.installed).toEqual(["gemini"]);
      expect(updatePrompt.writes.some((entry) => entry.includes("[note:Install plan] mode: update"))).toBe(true);
      expect(updatePrompt.writes.filter((entry) => entry.includes("[note:Install preview]"))).toHaveLength(2);
      expect(updatePrompt.writes.filter((entry) => entry === "Proceed with update?")).toHaveLength(1);
      expect(updatePrompt.writes).not.toContain("Agents");
      expect(updatePrompt.writes).not.toContain("Scope");
      expect(updatePrompt.writes).not.toContain("Items");
      expect(updatePrompt.writes).not.toContain("Toggle agents");
      expect(updatePrompt.writes).not.toContain("Choose items");
      expect(updatePrompt.writes.some((entry) => entry.includes("Collisions detected. Overwrite existing targets?"))).toBe(false);
      expect(updatePrompt.writes.some((entry) => entry.includes("[note:Batch install summary]"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("skips update when no install receipts exist without prompting for agent scope or items", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["update", "exit"]);

    try {
      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result).toEqual([]);
      expect(prompt.writes.some((entry) => entry.includes("[note:Update installed] No install receipts found; skipping update."))).toBe(true);
      expect(prompt.writes.some((entry) => entry.includes("Install preview"))).toBe(false);
      expect(prompt.writes).not.toContain("Proceed with update?");
      expect(prompt.writes).not.toContain("Agents");
      expect(prompt.writes).not.toContain("Scope");
      expect(prompt.writes).not.toContain("Items");
    } finally {
      temp.cleanup();
    }
  });

  test("skips update confirmation when --yes is provided", async () => {
    const temp = makeTempEnv();
    await runGuided(makeOptions({ mode: "install", agents: ["cursor"], scope: "local", items: ["project"], yes: true }), temp.env, makePromptIo([], [], [], false).io);

    const prompt = makePromptIo(["update", "exit"]);

    try {
      const result = await runGuided(makeOptions({ yes: true }), temp.env, prompt.io);
      const updates = result as InstallResult[];

      expect(updates).toHaveLength(1);
      expect(updates[0]?.agent).toBe("cursor");
      expect(prompt.writes).not.toContain("Proceed with update?");
      expect(prompt.writes).not.toContain("Agents");
      expect(prompt.writes).not.toContain("Scope");
      expect(prompt.writes).not.toContain("Items");
    } finally {
      temp.cleanup();
    }
  });

  test("home loop returns to Home when final install is declined", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["agy"], ["gemini"]], [false]);

    try {
      await runGuided(makeOptions(), temp.env, prompt.io);

      const homeLabels = prompt.writes.filter((entry) => entry === "Home");
      expect(homeLabels.length).toBeGreaterThanOrEqual(2);
      expect(prompt.writes.some((entry) => entry.includes("[note:Home] Install cancelled."))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("runs multi-agent install with one batch confirmation", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["cursor", "agy"], ["project"]], [true]);

    try {
      const result = await runGuided(makeOptions(), temp.env, prompt.io);
      const installs = result as InstallResult[];

      expect(installs).toHaveLength(2);
      expect(installs.map((installResult) => installResult.agent)).toEqual(["cursor", "agy"]);
      expect(prompt.writes.filter((entry) => entry.startsWith("Proceed with install"))).toEqual(["Proceed with install for 2 agents (local)?"]);
      expect(prompt.writes.some((entry) => entry.includes("[note:Batch install summary]"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("home loop returns to Home when multi-agent install is declined before writes", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["cursor", "agy"], ["project"]], [false]);

    try {
      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result).toEqual([]);
      expect(prompt.writes.filter((entry) => entry.startsWith("Proceed with install"))).toEqual(["Proceed with install for 2 agents (local)?"]);
      expect(prompt.writes.some((entry) => entry.includes("[note:Home] Install cancelled."))).toBe(true);
      expect(prompt.writes.some((entry) => entry.includes("[note:Batch install summary]"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("home loop returns to Home when overwrite is declined after a collision", async () => {
    const temp = makeTempEnv();
    await runGuided(makeOptions({ mode: "install", agents: ["cursor"], scope: "local", items: ["project"], yes: true }), temp.env, makePromptIo([], [], [], false).io);

    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["cursor"], ["project"]], [false]);

    try {
      await runGuided(makeOptions(), temp.env, prompt.io);

      expect(prompt.writes.some((entry) => entry.includes("Collisions detected. Overwrite existing targets?"))).toBe(true);
      expect(prompt.writes.some((entry) => entry.includes("[note:Home] Install cancelled (overwrite not approved)."))).toBe(true);
      const homeLabels = prompt.writes.filter((entry) => entry === "Home");
      expect(homeLabels.length).toBeGreaterThanOrEqual(2);
    } finally {
      temp.cleanup();
    }
  });

  test("explicit interactive --mode install still throws when final install is declined", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], [], [false]);

    try {
      await expect(
        runGuided(makeOptions({ mode: "install", agents: ["agy"], scope: "local", items: ["gemini"] }), temp.env, prompt.io),
      ).rejects.toThrow("Guided install cancelled.");
    } finally {
      temp.cleanup();
    }
  });

  test("interactive explicit --mode list skips home menu", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], [], [], true);

    try {
      await runGuided(makeOptions({ mode: "install", agents: ["cursor"], scope: "local", items: ["project"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
      await expectInstalledSummaries(await runGuided(makeOptions({ mode: "list", agents: ["cursor"] }), temp.env, prompt.io));

      expect(prompt.writes.some((entry) => entry.includes("Home"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("falls back to direct execution in non-interactive plan mode when inputs are complete", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], [], [], false);

    try {
      const result = expectInstallPlan(await runGuided(makeOptions({ mode: "plan", agents: ["opencode"], scope: "local" }), temp.env, prompt.io));

      expect(result.agent).toBe("opencode");
      expect(result.scope).toBe("local");
      expect(result.requested).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("uses outro for empty home exit", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["exit"]);

    try {
      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result).toEqual([]);
      expect(prompt.writes.some((entry) => {
        const plainEntry = stripAnsi(entry);
        return plainEntry.includes("███╗   ███╗") && plainEntry.includes("          ███████╗██╗  ██╗");
      })).toBe(true);
      expect(prompt.writes.some((entry) => entry.includes("\\u2588"))).toBe(false);
      expect(prompt.writes).toContain("[outro] Goodbye.");
    } finally {
      temp.cleanup();
    }
  });

  test("returns to Home from the agent picker Back option", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "__back", "exit"]);

    try {
      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result).toEqual([]);
      expect(prompt.writes.filter((entry) => entry === "Home")).toHaveLength(2);
      expect(prompt.writes).toContain("Agents");
      expect(prompt.writes.some((entry) => entry.includes("Install preview"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("returns to Home from nested wizard Back options", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "pick", "__back", "install", "pick", "local", "__back", "exit"], [["cursor"], ["cursor"]]);

    try {
      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result).toEqual([]);
      expect(prompt.writes.filter((entry) => entry === "Home")).toHaveLength(3);
      expect(prompt.writes.filter((entry) => entry === "Scope")).toHaveLength(2);
      expect(prompt.writes).toContain("Items");
      expect(prompt.writes.some((entry) => entry.includes("[note:Install preview]"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });


  test("runs non-interactive guided update mode", async () => {
    const temp = makeTempEnv();
    try {
      await runGuided(makeOptions({ mode: "install", agents: ["cursor"], scope: "local", items: ["project"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
      const prompt = makePromptIo([], [], [], false);
      const result = await runGuided(makeOptions({ mode: "update", yes: true }), temp.env, prompt.io);
      const updates = result as InstallResult[];
      expect(updates).toHaveLength(1);
      expect(updates[0]?.agent).toBe("cursor");
      expect(updates[0]?.installed).toEqual(["project"]);
      expect(prompt.writes.some((entry) => entry.includes("[note:Install plan] mode: update"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("explicit update agent scope and items preserve unrelated targets and receipts", async () => {
    const fixture = makeUpdateFixture();
    try {
      const untouched = [
        fixture.receipts[0]!.root,
        fixture.receipts[2]!.root,
        ...createPlan("letta-code", "global", ["beta"], fixture.env).skills.map((target) => target.target),
      ];
      const before = untouched.map((path) => hashPath(path));
      const receiptBefore = JSON.parse(readFileSync(fixture.receipts[1]!.receiptPath!, "utf8"));
      const results = await runGuided(makeOptions({ mode: "update", agents: ["letta-code"], scope: "global", items: ["alpha"], yes: true }), fixture.env, makePromptIo([], [], [], false).io) as InstallResult[];
      expect(results).toHaveLength(1);
      expect(results[0]!.installed).toEqual(["alpha"]);
      expect(untouched.map((path) => hashPath(path))).toEqual(before);
      const receiptAfter = JSON.parse(readFileSync(fixture.receipts[1]!.receiptPath!, "utf8"));
      expect(receiptAfter.targetStates.filter((state: { name: string }) => state.name === "beta"))
        .toEqual(receiptBefore.targetStates.filter((state: { name: string }) => state.name === "beta"));
      expect(hashPath(createPlan("letta-code", "global", ["alpha"], fixture.env).skills[0]!.target))
        .not.toBe(receiptBefore.targetStates.find((state: { name: string }) => state.name === "alpha").installedHash);
    } finally {
      fixture.cleanup();
    }
  });

  test("omitted update selectors intentionally update all receipt roots", async () => {
    const fixture = makeUpdateFixture();
    try {
      const results = await runGuided(makeOptions({ mode: "update", yes: true }), fixture.env, makePromptIo([], [], [], false).io) as InstallResult[];
      expect(results).toHaveLength(3);
      for (const receipt of fixture.receipts) {
        const current = JSON.parse(readFileSync(receipt.receiptPath!, "utf8"));
        const plan = createPlan(receipt.agent, receipt.scope, receipt.installed, fixture.env);
        for (const target of [...plan.skills, ...plan.commands]) {
          expect(hashPath(target.target)).toBe(current.targetStates.find((state: { name: string; kind: string }) => state.name === target.name && state.kind === target.kind).installedHash);
          expect(readFileSync(target.kind === "skill" ? join(target.target, "SKILL.md") : target.target, "utf8")).toContain("two");
        }
      }
    } finally {
      fixture.cleanup();
    }
  });

  test("unknown and no-matching explicit update selections never mutate", async () => {
    const fixture = makeUpdateFixture();
    try {
      const before = fixture.hashes();
      for (const selectors of [{ agents: ["agy"] as const }, { agents: ["cursor"] as const, scope: "local" as const }, { agents: ["letta-code"] as const, items: ["command-only"] }]) {
        const results = await runGuided(makeOptions({ mode: "update", yes: true, ...selectors, agents: [...selectors.agents] }), fixture.env, makePromptIo([], [], [], false).io);
        expect(results).toEqual([]);
        expect(fixture.hashes()).toEqual(before);
      }
      await expect(runGuided(makeOptions({ mode: "update", items: ["unknown"], yes: true }), fixture.env, makePromptIo([], [], [], false).io)).rejects.toThrow("Unknown install item");
      expect(fixture.hashes()).toEqual(before);
    } finally {
      fixture.cleanup();
    }
  });

  test("receipt-only missing source fails before writes to any selected root", async () => {
    const fixture = makeUpdateFixture();
    try {
      const receipt = JSON.parse(readFileSync(fixture.receipts[2]!.receiptPath!, "utf8"));
      receipt.installedSkills.push("retired-item");
      writeFileSync(fixture.receipts[2]!.receiptPath!, JSON.stringify(receipt));
      const before = fixture.hashes();
      await expect(runGuided(makeOptions({ mode: "update", yes: true }), fixture.env, makePromptIo([], [], [], false).io))
        .rejects.toThrow("Unknown install item 'retired-item'");
      expect(fixture.hashes()).toEqual(before);
      // A selected source-backed item can still update without touching the orphan.
      const results = await runGuided(makeOptions({ mode: "update", agents: ["letta-code"], scope: "local", items: ["alpha"], yes: true }), fixture.env, makePromptIo([], [], [], false).io) as InstallResult[];
      expect(results[0]!.installed).toEqual(["alpha"]);
      expect(JSON.parse(readFileSync(fixture.receipts[2]!.receiptPath!, "utf8")).installedSkills).toContain("retired-item");
    } finally {
      fixture.cleanup();
    }
  });

  test("--yes blocks modified skills commands command-only and legacy targets before any batch writes", async () => {
    for (const variant of ["skill", "command", "command-only", "legacy", "missing-sibling"]) {
      const fixture = makeUpdateFixture();
      try {
        const plan = createPlan("cursor", "global", [variant === "command-only" ? "command-only" : "alpha"], fixture.env);
        if (variant === "legacy") {
          const receipt = JSON.parse(readFileSync(fixture.receipts[0]!.receiptPath!, "utf8"));
          delete receipt.schemaVersion;
          delete receipt.targetStates;
          writeFileSync(fixture.receipts[0]!.receiptPath!, JSON.stringify(receipt));
        } else {
          const target = variant === "skill" ? join(plan.skills[0]!.target, "SKILL.md") : plan.commands[0]!.target;
          writeFileSync(target, "Unique user edit\n");
          if (variant === "missing-sibling") {
            rmSync(plan.skills[0]!.target, { recursive: true });
          }
        }
        const before = fixture.hashes();
        const prompt = makePromptIo([], [], [], false);
        await expect(runGuided(makeOptions({ mode: "update", yes: true }), fixture.env, prompt.io)).rejects.toThrow("require explicit --overwrite");
        expect(fixture.hashes()).toEqual(before);
        expect(prompt.writes.some((entry) => entry.includes(variant === "legacy" ? "unverified/legacy" : "modified"))).toBe(true);
        expect(prompt.writes.some((entry) => entry.startsWith("Overwrite the listed"))).toBe(false);
        const results = await runGuided(makeOptions({ mode: "update", agents: ["cursor"], scope: "global", overwrite: true, yes: true }), fixture.env, makePromptIo([], [], [], false).io) as InstallResult[];
        expect(results).toHaveLength(1);
        expect(results[0]!.installed).toEqual(["alpha", "beta", "command-only"]);
        expect(readFileSync(plan.commands[0]!.target, "utf8")).toContain("version two");
      } finally {
        fixture.cleanup();
      }
    }
  });

  test("interactive modified decline is a whole-batch no-op even with --yes", async () => {
    const fixture = makeUpdateFixture();
    try {
      const target = createPlan("letta-code", "global", ["alpha"], fixture.env).skills[0]!.target;
      writeFileSync(join(target, "SKILL.md"), "Unique user edit\n");
      const before = fixture.hashes();
      const prompt = makePromptIo(["update", "exit"], [], [false]);
      expect(await runGuided(makeOptions({ yes: true }), fixture.env, prompt.io)).toEqual([]);
      expect(fixture.hashes()).toEqual(before);
      expect(prompt.writes.some((entry) => entry.includes(target) && entry.includes("modified"))).toBe(true);
      expect(prompt.writes).toContain("Overwrite the listed modified or unverified targets?");
      expect(prompt.writes).not.toContain("Proceed with update?");
    } finally {
      fixture.cleanup();
    }
  });

  test("modified approval remains separate from final update confirmation", async () => {
    const fixture = makeUpdateFixture();
    try {
      const target = createPlan("cursor", "global", ["alpha"], fixture.env).commands[0]!.target;
      writeFileSync(target, "Unique user edit\n");
      const before = fixture.hashes();
      const declining = makePromptIo([], [], [true, false]);
      await expect(runGuided(makeOptions({ mode: "update" }), fixture.env, declining.io)).rejects.toThrow("Guided update cancelled.");
      expect(fixture.hashes()).toEqual(before);
      const approved = makePromptIo([], [], [true, true]);
      const results = await runGuided(makeOptions({ mode: "update" }), fixture.env, approved.io) as InstallResult[];
      expect(results).toHaveLength(3);
      expect(readFileSync(target, "utf8")).toContain("version two");
      expect(approved.writes.filter((entry) => entry === "Overwrite the listed modified or unverified targets?" || entry === "Proceed with update?"))
        .toEqual(["Overwrite the listed modified or unverified targets?", "Proceed with update?"]);
    } finally {
      fixture.cleanup();
    }
  });

  test("explicit --overwrite authorizes only selected modified update targets", async () => {
    const fixture = makeUpdateFixture();
    try {
      const target = createPlan("letta-code", "global", ["alpha"], fixture.env).skills[0]!.target;
      const unrelated = createPlan("cursor", "global", ["beta"], fixture.env).commands[0]!.target;
      writeFileSync(join(target, "SKILL.md"), "Selected edit\n");
      writeFileSync(unrelated, "Unselected edit\n");
      const untouched = [fixture.receipts[0]!.root, fixture.receipts[2]!.root];
      const before = untouched.map((path) => hashPath(path));
      const results = await runGuided(makeOptions({ mode: "update", agents: ["letta-code"], scope: "global", items: ["alpha"], overwrite: true, yes: true }), fixture.env, makePromptIo([], [], [], false).io) as InstallResult[];
      expect(results).toHaveLength(1);
      expect(readFileSync(join(target, "SKILL.md"), "utf8")).toContain("Version two");
      expect(untouched.map((path) => hashPath(path))).toEqual(before);
    } finally {
      fixture.cleanup();
    }
  });

  test("runs non-interactive guided list mode with mode only", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], [], [], false);

    try {
      await runGuided(makeOptions({ mode: "install", agents: ["agy"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
      const result = expectInstalledSummaries(await runGuided(makeOptions({ mode: "list" }), temp.env, prompt.io));

      expect(result).toEqual([
        {
          agent: "agy",
          scope: "local",
          installedSkills: ["gemini"],
          installedCommands: [],
          installed: ["gemini"],
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("filters non-interactive guided list mode when agents are provided", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], [], [], false);

    try {
      await runGuided(makeOptions({ mode: "install", agents: ["cursor"], scope: "local", items: ["project"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
      await runGuided(makeOptions({ mode: "install", agents: ["agy"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);

      const result = expectInstalledSummaries(await runGuided(makeOptions({ mode: "list", agents: ["cursor"] }), temp.env, prompt.io));

      expect(result).toEqual([
        {
          agent: "cursor",
          scope: "local",
          installedSkills: ["project"],
          installedCommands: ["project"],
          installed: ["project"],
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("fails in non-interactive mode when mode is missing", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], [], [], false);

    try {
      await expect(runGuided(makeOptions(), temp.env, prompt.io)).rejects.toThrow(
        "Guided mode requires --mode when stdin is not interactive.",
      );
    } finally {
      temp.cleanup();
    }
  });

  test("fails in non-interactive plan/install mode when agent and scope are missing", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], [], [], false);

    try {
      await expect(runGuided(makeOptions({ mode: "install" }), temp.env, prompt.io)).rejects.toThrow(
        "Guided mode requires --agent and --scope for plan/install/uninstall when stdin is not interactive.",
      );
    } finally {
      temp.cleanup();
    }
  });
});
