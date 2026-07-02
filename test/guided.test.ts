import { describe, expect, test } from "bun:test";

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

describe("guided", () => {
  test("runs interactive install flow and confirms install", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["gemini"], ["gemini"]], [true]);

    try {
      const result = expectInstallResult(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result.status).toBe("installed");
      expect(result.agent).toBe("gemini");
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
    await runGuided(makeOptions({ mode: "install", agents: ["gemini"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
    const prompt = makePromptIo(["uninstall", "all", "local", "all-installed", "exit"], [], [true]);

    try {
      const result = await runGuided(makeOptions(), temp.env, prompt.io) as UninstallResult[];

      expect(result).toHaveLength(6);
      expect(result.find((entry) => entry.agent === "cursor")?.uninstalled).toEqual(["project"]);
      expect(result.find((entry) => entry.agent === "gemini")?.uninstalled).toEqual(["gemini"]);
      expect(result.find((entry) => entry.agent === "cursor")?.receiptRemoved).toBe(true);
      expect(result.find((entry) => entry.agent === "gemini")?.receiptRemoved).toBe(true);
      expect(prompt.writes.filter((entry) => entry.startsWith("Proceed with uninstall"))).toEqual(["Proceed with uninstall for 6 agents (local)?"]);
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
    await runGuided(makeOptions({ mode: "install", agents: ["gemini"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);

    const detailPrompt = makePromptIo(["detail", "pick", "local", "exit"], [["gemini"]]);

    try {
      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, detailPrompt.io));

      expect(result).toEqual([
        {
          agent: "gemini",
          scope: "local",
          installedSkills: ["gemini"],
          installedCommands: ["gemini"],
          installed: ["gemini"],
        },
      ]);
      expect(detailPrompt.writes.some((entry) => entry.includes("[note:Receipt: gemini (local)]"))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes("Summary\n- agent: gemini"))).toBe(true);
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
    await runGuided(makeOptions({ mode: "install", agents: ["gemini"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);

    const updatePrompt = makePromptIo(["update", "exit"], [], [true]);

    try {
      const result = await runGuided(makeOptions(), temp.env, updatePrompt.io);
      const updates = result as InstallResult[];

      expect(updates).toHaveLength(2);
      expect(updates.map((update) => update.agent).sort()).toEqual(["cursor", "gemini"]);
      expect(updates.find((update) => update.agent === "cursor")?.installed).toEqual(["project"]);
      expect(updates.find((update) => update.agent === "gemini")?.installed).toEqual(["gemini"]);
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
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["gemini"], ["gemini"]], [false]);

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
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["cursor", "gemini"], ["project"]], [true]);

    try {
      const result = await runGuided(makeOptions(), temp.env, prompt.io);
      const installs = result as InstallResult[];

      expect(installs).toHaveLength(2);
      expect(installs.map((installResult) => installResult.agent)).toEqual(["cursor", "gemini"]);
      expect(prompt.writes.filter((entry) => entry.startsWith("Proceed with install"))).toEqual(["Proceed with install for 2 agents (local)?"]);
      expect(prompt.writes.some((entry) => entry.includes("[note:Batch install summary]"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("home loop returns to Home when multi-agent install is declined before writes", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["cursor", "gemini"], ["project"]], [false]);

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
        runGuided(makeOptions({ mode: "install", agents: ["gemini"], scope: "local", items: ["gemini"] }), temp.env, prompt.io),
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

  test("runs non-interactive guided list mode with mode only", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], [], [], false);

    try {
      await runGuided(makeOptions({ mode: "install", agents: ["gemini"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);
      const result = expectInstalledSummaries(await runGuided(makeOptions({ mode: "list" }), temp.env, prompt.io));

      expect(result).toEqual([
        {
          agent: "gemini",
          scope: "local",
          installedSkills: ["gemini"],
          installedCommands: ["gemini"],
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
      await runGuided(makeOptions({ mode: "install", agents: ["gemini"], scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], [], [], false).io);

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
