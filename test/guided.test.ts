import { describe, expect, test } from "bun:test";

import { runGuided } from "../src/guided";
import { getRepoInventory } from "../src/repo";
import type { CliOptions, InstalledSummary, InstallPlan, InstallResult } from "../src/types";
import { makeTempEnv } from "./helpers";

function expectInstallPlan(result: InstallPlan | InstallResult | InstalledSummary[]): InstallPlan {
  expect(Array.isArray(result)).toBe(false);
  expect("requested" in result).toBe(true);
  return result as InstallPlan;
}

function expectInstallResult(result: InstallPlan | InstallResult | InstalledSummary[]): InstallResult {
  expect(Array.isArray(result)).toBe(false);
  expect("status" in result).toBe(true);
  return result as InstallResult;
}

function expectInstalledSummaries(result: InstallPlan | InstallResult | InstalledSummary[]): InstalledSummary[] {
  expect(Array.isArray(result)).toBe(true);
  return result as InstalledSummary[];
}

function makeOptions(overrides: Partial<CliOptions> = {}): CliOptions {
  return {
    command: "guided",
    items: [],
    overwrite: false,
    yes: false,
    ...overrides,
  };
}

function makePromptIo(answers: string[], isInteractive = true) {
  const writes: string[] = [];

  return {
    writes,
    io: {
      isInteractive,
      write(message: string) {
        writes.push(message);
      },
      async ask(question: string) {
        writes.push(question);
        return answers.shift() ?? "";
      },
      close() {},
    },
  };
}

function makeItemSelectionAnswer(...items: string[]): string {
  const inventory = getRepoInventory();
  const selectable = [
    ...inventory.skills,
    ...inventory.commands.filter((command) => !inventory.skills.includes(command)),
  ];

  return items
    .map((item) => {
      const index = selectable.indexOf(item);
      expect(index).toBeGreaterThanOrEqual(0);
      return String(index + 1);
    })
    .join(", ");
}

describe("guided", () => {
  test("runs interactive plan flow with prompted agent and numbered item selection", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["2", "3", "1", "2", makeItemSelectionAnswer("project", "recap")]);

    try {
      const result = expectInstallPlan(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result.agent).toBe("cursor");
      expect(result.scope).toBe("local");
      expect(result.requested).toEqual(["project", "recap"]);
      expect(result.skills.length).toBeGreaterThan(0);
    } finally {
      temp.cleanup();
    }
  });

  test("uses default bundle selection without typed item names", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["2", "1", "1", "1"]);

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
    const prompt = makePromptIo(["1", "4", "1", "2", makeItemSelectionAnswer("gemini"), "y"]);

    try {
      const result = expectInstallResult(await runGuided(makeOptions(), temp.env, prompt.io));

      expect(result.status).toBe("installed");
      expect(result.agent).toBe("gemini");
      expect(result.installed).toEqual(["gemini"]);
    } finally {
      temp.cleanup();
    }
  });

  test("skips final confirmation when --yes is provided", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo(["1", "1", "1", "2", makeItemSelectionAnswer("project")]);

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
    const firstPrompt = makePromptIo(["1", "3", "1", "2", makeItemSelectionAnswer("project"), "y"]);
    const secondPrompt = makePromptIo(["1", "3", "1", "2", makeItemSelectionAnswer("project"), "y", "y"]);

    try {
      await runGuided(makeOptions(), temp.env, firstPrompt.io);
      const result = expectInstallResult(await runGuided(makeOptions(), temp.env, secondPrompt.io));

      expect(result.status).toBe("installed");
      expect(secondPrompt.writes.some((entry) => entry.includes("Collisions detected. Overwrite existing targets?"))).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("shows installed summaries in guided list mode without prompting for agent or scope", async () => {
    const temp = makeTempEnv();
    const listPrompt = makePromptIo(["3"]);

    try {
      await runGuided(makeOptions({ mode: "install", agent: "cursor", scope: "local", items: ["project"], yes: true }), temp.env, makePromptIo([], false).io);

      const result = expectInstalledSummaries(await runGuided(makeOptions(), temp.env, listPrompt.io));

      expect(result).toEqual([
        {
          agent: "cursor",
          scope: "local",
          installed: ["project"],
        },
      ]);
      expect(listPrompt.writes.some((entry) => entry.includes("Agent"))).toBe(false);
      expect(listPrompt.writes.some((entry) => entry.includes("Scope"))).toBe(false);
    } finally {
      temp.cleanup();
    }
  });

  test("falls back to direct execution in non-interactive plan mode when inputs are complete", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], false);

    try {
      const result = expectInstallPlan(await runGuided(makeOptions({ mode: "plan", agent: "opencode", scope: "local" }), temp.env, prompt.io));

      expect(result.agent).toBe("opencode");
      expect(result.scope).toBe("local");
      expect(result.requested).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("runs non-interactive guided list mode with mode only", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], false);

    try {
      await runGuided(makeOptions({ mode: "install", agent: "gemini", scope: "local", items: ["gemini"], yes: true }), temp.env, makePromptIo([], false).io);
      const result = expectInstalledSummaries(await runGuided(makeOptions({ mode: "list" }), temp.env, prompt.io));

      expect(result).toEqual([
        {
          agent: "gemini",
          scope: "local",
          installed: ["gemini"],
        },
      ]);
    } finally {
      temp.cleanup();
    }
  });

  test("fails in non-interactive mode when mode is missing", async () => {
    const temp = makeTempEnv();
    const prompt = makePromptIo([], false);

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
    const prompt = makePromptIo([], false);

    try {
      await expect(runGuided(makeOptions({ mode: "install" }), temp.env, prompt.io)).rejects.toThrow(
        "Guided mode requires --agent and --scope for plan/install when stdin is not interactive.",
      );
    } finally {
      temp.cleanup();
    }
  });
});
