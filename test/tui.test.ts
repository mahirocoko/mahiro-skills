import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { install } from "../src/install";
import { createTuiController } from "../src/tui";
import type { Terminal, TerminalDataHandler, TerminalInput, TerminalOutput, TerminalResizeHandler, TerminalSize } from "../src/terminal";
import { makeTempEnv } from "./helpers";

class FakeTerminal implements Terminal {
  readonly input = {} as TerminalInput;
  readonly output = {} as TerminalOutput;
  readonly isInteractive = true;
  readonly colorEnabled = false;
  readonly writes: string[] = [];
  size: TerminalSize = { columns: 84, rows: 24 };
  entered = 0;
  closed = 0;
  private handler: TerminalDataHandler | undefined;
  private resizeHandler: TerminalResizeHandler | undefined;

  getSize(): TerminalSize {
    return this.size;
  }

  write(message: string): void {
    this.writes.push(message);
  }

  onData(handler: TerminalDataHandler): () => void {
    this.handler = handler;
    return () => {
      this.handler = undefined;
    };
  }

  onResize(handler: TerminalResizeHandler): () => void {
    this.resizeHandler = handler;
    return () => {
      this.resizeHandler = undefined;
    };
  }

  setRawMode(): void {
    return;
  }

  enterAlternateScreen(): void {
    this.entered += 1;
  }

  leaveAlternateScreen(): void {
    return;
  }

  hideCursor(): void {
    return;
  }

  showCursor(): void {
    return;
  }

  close(): void {
    this.closed += 1;
    this.handler = undefined;
    this.resizeHandler = undefined;
  }

  emit(data: string): void {
    this.handler?.(data);
  }

  emitResize(): void {
    this.resizeHandler?.(this.getSize());
  }
}

async function enterAction(controller: ReturnType<typeof createTuiController>, actionIndex = 0): Promise<void> {
  await controller.handleInput("\r");
  for (let index = 0; index < actionIndex; index += 1) {
    await controller.handleInput("\x1b[B");
  }
  await controller.handleInput("\r");
}

async function focusSkill(controller: ReturnType<typeof createTuiController>, name: string): Promise<void> {
  const index = controller.getFilteredItems().findIndex((item) => item.name === name);
  if (index < 0) {
    throw new Error(`Skill ${name} is not in the inventory.`);
  }
  if (controller.getState().selectAllFocused) {
    await controller.handleInput("\x1b[B");
  }
  const current = controller.getState().selectedIndex;
  const delta = index - current;
  const key = delta < 0 ? "\x1b[A" : "\x1b[B";
  for (let step = 0; step < Math.abs(delta); step += 1) {
    await controller.handleInput(key);
  }
}

describe("step-first skill manager TUI", () => {
  test("uses All/custom exclusivity and preserves targets when backing out", async () => {
    const temp = makeTempEnv();
    try {
      const controller = createTuiController({ terminal: new FakeTerminal(), env: temp.env });
      expect(controller.getState().scope).toBe("global");
      expect(controller.getState().targetSelection).toEqual({ mode: "all" });
      await controller.handleInput("\x1b[B");
      await controller.handleInput(" ");
      expect(controller.getState().targetSelection).toEqual({ mode: "custom", agents: new Set(["opencode"]) });

      await controller.handleInput("\x1b[B");
      await controller.handleInput(" ");
      expect(controller.getState().selectedAgents).toEqual(["opencode", "claude-code"]);

      await controller.handleInput("\x1b[A");
      await controller.handleInput(" ");
      expect(controller.getState().selectedAgents).toEqual(["claude-code"]);

      await controller.handleInput("\r");
      expect(controller.getState().step).toBe("action");
      await controller.handleInput("\x1b");
      await Bun.sleep(40);
      expect(controller.getState().step).toBe("target");
      expect(controller.getState().selectedAgents).toEqual(["claude-code"]);
    } finally {
      temp.cleanup();
    }
  });

  test("preserves every CLI-supplied agent in the target step", () => {
    const temp = makeTempEnv();
    try {
      const controller = createTuiController({
        terminal: new FakeTerminal(),
        env: temp.env,
        initialAgents: ["cursor", "agy", "pi"],
        initialScope: "global",
      });
      expect(controller.getState().targetSelection).toEqual({ mode: "custom", agents: new Set(["cursor", "agy", "pi"]) });
      expect(controller.getState().selectedAgents).toEqual(["cursor", "agy", "pi"]);
      expect(controller.getState().scope).toBe("global");
    } finally {
      temp.cleanup();
    }
  });

  test("transitions Target to Action to Skills with action-specific inventories", async () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["project"], false, temp.env);
      const controller = createTuiController({
        terminal: new FakeTerminal(),
        env: temp.env,
        initialAgents: ["opencode", "cursor"],
        initialItems: ["project"],
        initialScope: "local",
      });
      await enterAction(controller);
      expect(controller.getState().step).toBe("skills");
      expect(controller.getState().action).toBe("install");
      expect(controller.getState().selectedItems).toEqual(["project"]);
      const project = controller.getState().inventory.find((item) => item.name === "project");
      expect(project?.coverage).toEqual({ installed: 1, selected: 2 });
      expect(project?.selectable).toBe(true);
      expect(project?.agents.find((agent) => agent.agent === "opencode")?.state).toBe("current");
      expect(project?.agents.find((agent) => agent.agent === "cursor")?.state).toBe("not-installed");

      await controller.handleInput("\x1b");
      await Bun.sleep(40);
      expect(controller.getState().step).toBe("action");
      expect(controller.getState().selectedItems).toEqual(["project"]);
    } finally {
      temp.cleanup();
    }
  });

  test("Select all eligible toggles every visible actionable skill", async () => {
    const temp = makeTempEnv();
    try {
      const controller = createTuiController({ terminal: new FakeTerminal(), env: temp.env, initialScope: "local" });
      await enterAction(controller);
      expect(controller.getState().selectAllFocused).toBe(true);

      await controller.handleInput(" ");
      const eligible = controller.getState().inventory.filter((item) => item.selectable).length;
      expect(controller.getState().selectedItems).toHaveLength(eligible);

      await controller.handleInput(" ");
      expect(controller.getState().selectedItems).toEqual([]);
    } finally {
      temp.cleanup();
    }
  });

  test("selective Update only plans the chosen modified name and requires acknowledgements", async () => {
    const temp = makeTempEnv();
    const calls: string[][] = [];
    try {
      install("opencode", "local", ["project", "recap"], false, temp.env);
      writeFileSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "SKILL.md"), "modified project");
      const controller = createTuiController({
        terminal: new FakeTerminal(),
        env: temp.env,
        initialAgents: ["opencode"],
        initialItems: ["project"],
        initialScope: "local",
        executor: {
          update: ({ items }) => {
            calls.push(items);
            return { status: "installed", installed: items, skipped: [] };
          },
        },
      });
      await enterAction(controller, 1);
      const project = controller.getState().inventory.find((item) => item.name === "project");
      const recap = controller.getState().inventory.find((item) => item.name === "recap");
      expect(project?.selectable).toBe(true);
      expect(project?.requiresAcknowledgement).toBe(true);
      expect(recap?.selectable).toBe(false);
      await controller.handleInput("\r");
      expect(controller.getState().review?.plans[0].active).toEqual(["project"]);
      expect(controller.getState().review?.plans[0].skipped.map((entry) => entry.item)).toEqual([]);

      await controller.handleInput(" ");
      await controller.handleInput("\r");
      expect(calls).toEqual([["project"]]);
      expect(controller.getState().result?.aggregateStatus).toBe("Completed");
    } finally {
      temp.cleanup();
    }
  });

  test("shows Letta Code as a skills-only inspect target without entering Review", async () => {
    const temp = makeTempEnv();
    try {
      install("letta-code", "local", ["project"], false, temp.env);
      const terminal = new FakeTerminal();
      const controller = createTuiController({ terminal, env: temp.env, initialAgents: ["letta-code"], initialScope: "local" });
      await enterAction(controller, 3);
      const project = controller.getState().inventory.find((item) => item.name === "project");
      expect(project?.agents[0].commandSupport).toBe("skills-only");
      await focusSkill(controller, "project");
      await controller.handleInput("\r");
      expect(controller.getState().step).toBe("skills");
      expect(controller.getState().inspectDetail).toBe(true);
      expect(terminal.writes.join("\n")).toContain("skills only");
      expect(readFileSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "project", "SKILL.md"), "utf8")).toContain("name: project");
    } finally {
      temp.cleanup();
    }
  });

  test("shows Pi as a skills-only inspect target without entering Review", async () => {
    const temp = makeTempEnv();
    try {
      install("pi", "local", ["project"], false, temp.env);
      const terminal = new FakeTerminal();
      const controller = createTuiController({ terminal, env: temp.env, initialAgents: ["pi"], initialScope: "local" });
      await enterAction(controller, 3);
      const project = controller.getState().inventory.find((item) => item.name === "project");
      expect(project?.agents[0].commandSupport).toBe("skills-only");
      await focusSkill(controller, "project");
      await controller.handleInput("\r");
      expect(controller.getState().step).toBe("skills");
      expect(controller.getState().inspectDetail).toBe(true);
      expect(terminal.writes.join("\n")).toContain("skills only");
      expect(readFileSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".pi", "skills", "project", "SKILL.md"), "utf8")).toContain("name: project");
    } finally {
      temp.cleanup();
    }
  });

  test("shows Agy as a namespaced slash-skill inspect target", async () => {
    const temp = makeTempEnv();
    try {
      install("agy", "local", ["learn"], false, temp.env);
      const terminal = new FakeTerminal();
      const controller = createTuiController({ terminal, env: temp.env, initialAgents: ["agy"], initialScope: "local" });
      await enterAction(controller, 3);
      const learn = controller.getState().inventory.find((item) => item.name === "learn");
      expect(learn?.agents[0].commandSupport).toBe("skills-only");
      await focusSkill(controller, "learn");
      await controller.handleInput("\r");
      expect(controller.getState().step).toBe("skills");
      expect(controller.getState().inspectDetail).toBe(true);
      expect(terminal.writes.join("\n")).toContain("namespaced /mh-* skills");
      expect(readFileSync(join(temp.env.MAHIRO_SKILLS_CWD!, ".agents", "skills", "mh-learn", "SKILL.md"), "utf8")).toContain("name: mh-learn");
    } finally {
      temp.cleanup();
    }
  });

  test("blocks an unreadable receipt in Review instead of guessing", async () => {
    const temp = makeTempEnv();
    try {
      const installed = install("opencode", "local", ["project"], false, temp.env);
      writeFileSync(installed.receiptPath!, "not json");
      const controller = createTuiController({
        terminal: new FakeTerminal(),
        env: temp.env,
        initialAgents: ["opencode", "cursor"],
        initialItems: ["project"],
        initialScope: "local",
      });
      await enterAction(controller);
      await controller.handleInput("\r");
      expect(controller.getState().step).toBe("review");
      expect(controller.getState().review?.plans.find((plan) => plan.agent === "opencode")?.blocked).toContain("Unable to read");
      await controller.handleInput("\r");
      expect(controller.getState().step).toBe("review");
      expect(controller.getState().review?.error).toContain("blocked");
    } finally {
      temp.cleanup();
    }
  });

  test("renders exact collision paths in Review and requires Space acknowledgement", async () => {
    const temp = makeTempEnv();
    try {
      const collisionPath = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project");
      mkdirSync(collisionPath, { recursive: true });
      writeFileSync(join(collisionPath, "existing.txt"), "keep until approval");
      const terminal = new FakeTerminal();
      const controller = createTuiController({ terminal, env: temp.env, initialAgents: ["opencode"], initialItems: ["project"], initialScope: "local" });
      await enterAction(controller);
      await controller.handleInput("\r");
      expect(controller.getState().step).toBe("review");
      expect(controller.getState().review?.acknowledgements.map((entry) => entry.id)).toContain("overwrite:opencode");
      expect(terminal.writes.at(-1)).not.toContain(collisionPath);
      await controller.handleInput("d");
      await controller.handleInput("\x1b[F");
      expect(terminal.writes.join("\n").replaceAll("\n", "")).toContain(collisionPath);

      await controller.handleInput("\r");
      expect(controller.getState().review?.error).toContain("acknowledgement");
      await controller.handleInput(" ");
      await controller.handleInput("\r");
      expect(controller.getState().step).toBe("result");
    } finally {
      temp.cleanup();
    }
  });

  test("compact Review confirms all agent acknowledgements with one Space", async () => {
    const temp = makeTempEnv();
    try {
      for (const root of [".opencode", ".cursor"]) {
        const collisionPath = join(temp.env.MAHIRO_SKILLS_CWD!, root, "skills", "project");
        mkdirSync(collisionPath, { recursive: true });
        writeFileSync(join(collisionPath, "existing.txt"), "collision");
      }
      const terminal = new FakeTerminal();
      const controller = createTuiController({
        terminal,
        env: temp.env,
        initialAgents: ["opencode", "cursor"],
        initialItems: ["project"],
        initialScope: "local",
      });

      await enterAction(controller);
      await controller.handleInput("\r");
      expect(controller.getState().review?.acknowledgements).toHaveLength(2);
      const compactFrame = terminal.writes.at(-1) ?? "";
      expect(compactFrame).toContain("Confirm all 2 required acknowledgements");
      expect(compactFrame).toContain("D Show exact paths");
      expect(compactFrame).not.toContain("existing.txt");

      await controller.handleInput(" ");
      expect(controller.getState().review?.acknowledgements.every((entry) => entry.checked)).toBe(true);
      expect(terminal.writes.at(-1)).toContain("✓ Ready to run");
      await controller.handleInput("\r");
      expect(controller.getState().step).toBe("result");
    } finally {
      temp.cleanup();
    }
  });

  test("replan stops when a new modified-removal acknowledgement appears", async () => {
    const temp = makeTempEnv();
    try {
      install("opencode", "local", ["project"], false, temp.env);
      const target = join(temp.env.MAHIRO_SKILLS_CWD!, ".opencode", "skills", "project", "SKILL.md");
      const controller = createTuiController({ terminal: new FakeTerminal(), env: temp.env, initialAgents: ["opencode"], initialScope: "local" });

      await enterAction(controller, 2);
      await focusSkill(controller, "project");
      await controller.handleInput(" ");
      await controller.handleInput("\r");
      expect(controller.getState().review?.acknowledgements).toEqual([]);

      writeFileSync(target, "modified after review");
      await controller.handleInput("\r");

      expect(controller.getState().step).toBe("review");
      expect(controller.getState().review?.error).toContain("plan changed");
      expect(controller.getState().review?.acknowledgements[0]?.id).toBe("remove-modified:opencode:project");
      expect(controller.getState().review?.acknowledgements[0]?.checked).toBe(false);
      expect(existsSync(target)).toBe(true);
    } finally {
      temp.cleanup();
    }
  });

  test("runs agents sequentially and marks later agents Not attempted after failure", async () => {
    const temp = makeTempEnv();
    const calls: string[] = [];
    try {
      const controller = createTuiController({
        terminal: new FakeTerminal(),
        env: temp.env,
        initialAgents: ["opencode", "cursor"],
        initialItems: ["project"],
        initialScope: "local",
        executor: {
          install: ({ agent }) => {
            calls.push(agent);
            if (agent === "opencode") {
              throw new Error("injected action failure");
            }
            return { status: "installed", installed: ["project"], skipped: [] };
          },
        },
      });
      await enterAction(controller);
      await controller.handleInput("\r");
      await controller.handleInput("\r");
      expect(calls).toEqual(["opencode"]);
      expect(controller.getState().result?.results.map((entry) => entry.status)).toEqual(["Failed", "Not attempted"]);
      expect(controller.getState().result?.aggregateStatus).toBe("Failed");
    } finally {
      temp.cleanup();
    }
  });

  test("blocks navigation while too small, resumes after resize, and cleans up split input", async () => {
    const temp = makeTempEnv();
    try {
      const terminal = new FakeTerminal();
      const controller = createTuiController({ terminal, env: temp.env, initialAgents: ["opencode"], initialScope: "local" });
      const running = controller.run();
      terminal.size = { columns: 60, rows: 16 };
      terminal.emitResize();
      const pausedWrites = terminal.writes.length;
      await controller.handleInput("\x1b[B");
      expect(terminal.writes).toHaveLength(pausedWrites);
      expect(controller.getState().step).toBe("target");

      terminal.size = { columns: 84, rows: 24 };
      terminal.emitResize();
      await controller.handleInput("\x1b");
      expect(controller.getState().exiting).toBe(false);
      await controller.handleInput("[B");
      expect(controller.getState().targetFocus).toEqual({ kind: "agent", agent: "opencode" });
      await controller.handleInput("\x03");
      await running;
      expect(controller.getState().exiting).toBe(true);
      expect(terminal.closed).toBe(1);
    } finally {
      temp.cleanup();
    }
  });
});
