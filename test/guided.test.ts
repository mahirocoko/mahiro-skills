import { describe, expect, test } from "bun:test";

import { runGuided } from "../src/guided";
import type { PromptOption } from "../src/prompt";
import type { CliOptions, InstalledSummary, InstallPlan, InstallResult } from "../src/types";
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
  test("runs interactive plan for multiple selected agents", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["plan", "pick", "local", "custom-items", "exit"], [["cursor", "gemini"], ["project"]]);

    try {
      const result = expectInstallPlans(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result).toHaveLength(2);
      expect(result.map((plan) => plan.agent).sort()).toEqual(["cursor", "gemini"]);
      expect(result[0].requested).toEqual(["project"]);
      expect(result[1].requested).toEqual(["project"]);
      expect(prompt.writes.some((entry) => entry.includes("[note:Batch plan summary]"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("uses the All agents shortcut for a batch plan", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["plan", "all", "local", "custom-items", "exit"], [["project"]]);

    try {
      const result = expectInstallPlans(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result).toHaveLength(5);
      expect(result.map((plan) => plan.agent)).toEqual(["opencode", "claude-code", "cursor", "gemini", "codex"]);
      expect(prompt.writes.some((entry) => entry.includes("[note:Batch plan summary]"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("runs interactive plan flow with prompted agent and TUI item selection", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["plan", "pick", "local", "custom-items", "exit"], [["cursor"], ["project", "recap"]]);

    try {
      const result = expectInstallPlan(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result.agent).toBe("cursor");
      expect(result.scope).toBe("local");
      expect(result.requested).toEqual(["project", "recap"]);
      expect(result.skills.length).toBeGreaterThan(0);
      expect(prompt.writes.some((entry) => entry === "Home")).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("uses default bundle selection without typed item names", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["plan", "pick", "local", "default-bundle", "exit"], [["opencode"]]);

    try {
      const result = expectInstallPlan(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result.requested).toEqual([]);
      expect(result.description).toBe("Mahiro Skill | Packaged local skills plus agent-native command entrypoints from the current mahiro-skills bundle.");
    } finally {
      temp.cleanup();
    }
  });

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
      expect(detailPrompt.writes.some((entry) => entry.includes("sourceRepoPath:"))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes("Reconstructed install targets"))).toBe(true);
      expect(detailPrompt.writes.some((entry) => entry.includes(" -> "))).toBe(true);
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

  test("keeps completed installs visible when a later batch agent is declined", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["install", "pick", "local", "custom-items", "exit"], [["cursor", "gemini"], ["project"]], [true, false]);

    try {
      const result = await runGuided(makeOptions(), temp.env, prompt.io);
      const installs = result as InstallResult[];

      expect(installs).toHaveLength(1);
      expect(installs[0]?.agent).toBe("cursor");
      expect(prompt.writes.some((entry) => entry.includes("[note:Batch install partial] Batch install stopped after 1 completed agent(s). Earlier installs were kept."))).toBe(true);
      expect(prompt.writes.some((entry) => entry.includes("[note:Batch install summary]"))).toBe(true);
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
        return plainEntry.includes("███╗   ███╗") && plainEntry.includes("          ███████╗██╗  ██╗") && plainEntry.includes("Ctrl+C cancel");
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
    const prompt = makePromptIo(["plan", "pick", "__back", "plan", "pick", "local", "__back", "exit"], [["cursor"], ["cursor"]]);

    try {
      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result).toEqual([]);
      expect(prompt.writes.filter((entry) => entry === "Home")).toHaveLength(3);
      expect(prompt.writes.filter((entry) => entry === "Scope")).toHaveLength(2);
      expect(prompt.writes).toContain("Items");
      expect(prompt.writes.some((entry) => entry.includes("[note:Batch plan summary]"))).toBe(false);
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
        "Guided mode requires --agent and --scope for plan/install when stdin is not interactive.",
      );
    } finally {
      temp.cleanup();
    }
  });
});
