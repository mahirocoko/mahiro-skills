import {
  deriveSkillManagerInventory,
  executeSkillManagerAgentPlan,
  getSkillManagerAgentPlan,
  getSkillManagerSnapshots,
  type SkillManagerAction,
  type SkillManagerActionExecutor,
  type SkillManagerAgentPlan,
  type SkillManagerInventoryItem,
  type SkillManagerSnapshot,
} from "./skill-manager";
import {
  renderSkillManagerFrame,
  type SkillManagerAcknowledgement,
  type SkillManagerAgentResultRenderState,
  type SkillManagerRenderState,
  type SkillManagerResultRenderState,
  type SkillManagerTargetRenderState,
  type TargetFocus,
  type TuiStep,
} from "./skill-manager-render";
import {
  createTerminal,
  canUseFullScreenTerminal,
  hasSufficientTerminalSize,
  type Terminal,
  type TerminalData,
  type TerminalSize,
} from "./terminal";
import { supportedAgents, type InstallScope, type ScopedAgent } from "./types";

export type AgentSelection = { mode: "all" } | { mode: "custom"; agents: Set<ScopedAgent> };

export interface TuiControllerOptions {
  terminal: Terminal;
  env?: NodeJS.ProcessEnv;
  initialAgents?: readonly ScopedAgent[];
  /** Kept for callers of the first manager prototype; initialAgents takes precedence. */
  initialAgent?: ScopedAgent;
  initialScope?: InstallScope;
  initialItems?: readonly string[];
  executor?: SkillManagerActionExecutor;
}

export interface TuiState {
  step: TuiStep;
  targetSelection: AgentSelection;
  /** Alias kept explicit so the Target selection model is inspectable by callers. */
  selection: AgentSelection;
  selectedAgents: ScopedAgent[];
  scope: InstallScope;
  action: SkillManagerAction;
  targetFocus?: TargetFocus;
  actionIndex: number;
  inventory: SkillManagerInventoryItem[];
  selectedItems: string[];
  selectedIndex: number;
  selectAllFocused: boolean;
  query: string;
  searchMode: boolean;
  inspectDetail: boolean;
  snapshots: SkillManagerSnapshot[];
  snapshot: SkillManagerSnapshot;
  review?: TuiReviewState;
  result?: TuiResultState;
  message?: { kind: "info" | "success" | "error"; text: string };
  busy: boolean;
  exiting: boolean;
}

export interface TuiReviewAcknowledgement extends SkillManagerAcknowledgement {}

export interface TuiReviewState {
  action: SkillManagerAction;
  agents: ScopedAgent[];
  scope: InstallScope;
  items: string[];
  plans: SkillManagerAgentPlan[];
  acknowledgements: TuiReviewAcknowledgement[];
  focusIndex: number;
  scrollOffset: number;
  showDetails: boolean;
  safetyShape: string;
  error?: string;
}

export interface TuiAgentResult extends SkillManagerAgentResultRenderState {
  status: "Completed" | "Completed with skips" | "Failed" | "Not attempted" | "No changes";
}

export interface TuiResultState extends SkillManagerResultRenderState {
  results: TuiAgentResult[];
}

export interface TuiController {
  getState(): TuiState;
  getFilteredItems(): SkillManagerInventoryItem[];
  getSelectedItem(): SkillManagerInventoryItem | undefined;
  render(): void;
  handleInput(data: TerminalData): Promise<void>;
  run(): Promise<void>;
  stop(): void;
}

export interface RunTuiOptions {
  terminal?: Terminal;
  env?: NodeJS.ProcessEnv;
  initialAgents?: readonly ScopedAgent[];
  initialAgent?: ScopedAgent;
  initialScope?: InstallScope;
  initialItems?: readonly string[];
  executor?: SkillManagerActionExecutor;
}

type NamedKey =
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end"
  | "pageup"
  | "pagedown"
  | "enter"
  | "escape"
  | "backspace"
  | "space"
  | "ctrl-c";

type TuiKey =
  | { type: "named"; name: NamedKey }
  | { type: "text"; value: string };

const actions: SkillManagerAction[] = ["install", "update", "uninstall", "inspect"];

const escapeSequences: Readonly<Record<string, NamedKey>> = {
  "\x1b[A": "up",
  "\x1b[B": "down",
  "\x1b[C": "right",
  "\x1b[D": "left",
  "\x1bOA": "up",
  "\x1bOB": "down",
  "\x1bOC": "right",
  "\x1bOD": "left",
  "\x1b[H": "home",
  "\x1b[F": "end",
  "\x1bOH": "home",
  "\x1bOF": "end",
  "\x1b[1~": "home",
  "\x1b[4~": "end",
  "\x1b[5~": "pageup",
  "\x1b[6~": "pagedown",
  "\x1b[1;2A": "up",
  "\x1b[1;2B": "down",
  "\x1b[1;2C": "right",
  "\x1b[1;2D": "left",
};

function decodeText(data: TerminalData): string {
  return typeof data === "string" ? data : new TextDecoder().decode(data);
}

function decodeTuiInputBuffer(text: string, flush: boolean): { keys: TuiKey[]; pending: string } {
  const keys: TuiKey[] = [];
  let index = 0;
  let previousWasEnter = false;
  const sequences = Object.keys(escapeSequences).sort((left, right) => right.length - left.length);

  while (index < text.length) {
    if (text.startsWith("\x03", index)) {
      keys.push({ type: "named", name: "ctrl-c" });
      index += 1;
      previousWasEnter = false;
      continue;
    }

    if (text[index] === "\x1b") {
      let matchedSequence: string | undefined;
      for (const sequence of sequences) {
        if (text.startsWith(sequence, index)) {
          matchedSequence = sequence;
          break;
        }
      }

      if (matchedSequence) {
        keys.push({ type: "named", name: escapeSequences[matchedSequence] });
        index += matchedSequence.length;
        previousWasEnter = false;
        continue;
      }

      const remaining = text.slice(index);
      if (!flush && sequences.some((sequence) => sequence.startsWith(remaining))) {
        return { keys, pending: remaining };
      }

      keys.push({ type: "named", name: "escape" });
      index += 1;
      previousWasEnter = false;
      continue;
    }

    const character = text[index];
    if (character === "\r") {
      keys.push({ type: "named", name: "enter" });
      index += 1;
      previousWasEnter = true;
      continue;
    }

    if (character === "\n") {
      if (!previousWasEnter) {
        keys.push({ type: "named", name: "enter" });
      }
      index += 1;
      previousWasEnter = false;
      continue;
    }

    if (character === "\x7f" || character === "\b") {
      keys.push({ type: "named", name: "backspace" });
      index += 1;
      previousWasEnter = false;
      continue;
    }

    if (character === " ") {
      keys.push({ type: "named", name: "space" });
      index += 1;
      previousWasEnter = false;
      continue;
    }

    const codePoint = text.codePointAt(index);
    if (codePoint === undefined) {
      break;
    }

    const value = String.fromCodePoint(codePoint);
    index += value.length;
    previousWasEnter = false;
    if (codePoint >= 32 && codePoint !== 127) {
      keys.push({ type: "text", value });
    }
  }

  return { keys, pending: "" };
}

class TuiInputDecoder {
  private pending = "";

  push(data: TerminalData): TuiKey[] {
    const result = decodeTuiInputBuffer(this.pending + decodeText(data), false);
    this.pending = result.pending;
    return result.keys;
  }

  flush(): TuiKey[] {
    const result = decodeTuiInputBuffer(this.pending, true);
    this.pending = result.pending;
    return result.keys;
  }

  hasPending(): boolean {
    return this.pending.length > 0;
  }
}

export function decodeTuiInput(data: TerminalData): TuiKey[] {
  const decoder = new TuiInputDecoder();
  return [...decoder.push(data), ...decoder.flush()];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function selectionFromInitial(initialAgents: readonly ScopedAgent[] | undefined, initialAgent: ScopedAgent | undefined): AgentSelection {
  const supplied = unique(initialAgents && initialAgents.length > 0 ? initialAgents : (initialAgent ? [initialAgent] : supportedAgents));
  const normalized = supplied.filter((agent): agent is ScopedAgent => supportedAgents.includes(agent));
  if (normalized.length === supportedAgents.length && supportedAgents.every((agent) => normalized.includes(agent))) {
    return { mode: "all" };
  }
  return { mode: "custom", agents: new Set(normalized) };
}

function orderedAgents(selection: AgentSelection): ScopedAgent[] {
  if (selection.mode === "all") {
    return [...supportedAgents];
  }
  return supportedAgents.filter((agent) => selection.agents.has(agent));
}

function selectionTarget(selection: AgentSelection, scope: InstallScope, focusIndex: number): SkillManagerTargetRenderState {
  const agents = [...supportedAgents];
  const scopeStart = agents.length + 1;
  const focus: TargetFocus = focusIndex === 0
    ? { kind: "all" }
    : focusIndex <= agents.length
      ? { kind: "agent", agent: agents[focusIndex - 1] }
      : { kind: "scope", scope: focusIndex === scopeStart ? "local" : "global" };
  return {
    agents,
    mode: selection.mode,
    selectedAgents: orderedAgents(selection),
    scope,
    focus,
    focusIndex,
  };
}

function selectedResultNames(result: unknown, field: "installed" | "uninstalled"): string[] {
  if (!result || typeof result !== "object") {
    return [];
  }
  const value = (result as Record<string, unknown>)[field];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function skippedResultNames(result: unknown): string[] {
  if (!result || typeof result !== "object") {
    return [];
  }
  const value = (result as Record<string, unknown>).skipped;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => {
    if (entry && typeof entry === "object" && typeof (entry as { item?: unknown }).item === "string") {
      return (entry as { item: string }).item;
    }
    return String(entry);
  });
}

function resultReceiptPath(result: unknown): string | undefined {
  if (!result || typeof result !== "object") {
    return undefined;
  }
  const value = (result as Record<string, unknown>).receiptPath;
  return typeof value === "string" ? value : undefined;
}

function resultStatus(result: unknown): string | undefined {
  if (!result || typeof result !== "object") {
    return undefined;
  }
  const value = (result as Record<string, unknown>).status;
  return typeof value === "string" ? value : undefined;
}

function makeAcknowledgementLabel(id: string, plans: readonly SkillManagerAgentPlan[]): string {
  const [kind, agent, name] = id.split(":");
  if (kind === "overwrite") {
    const paths = plans
      .filter((plan) => plan.agent === agent)
      .flatMap((plan) => [...(plan.installPlan?.skills ?? []), ...(plan.installPlan?.commands ?? [])])
      .filter((target) => target.collision)
      .map((target) => target.target);
    return `Allow overwrite for ${agent}: ${paths.join(", ")}`;
  }
  if (kind === "modified") {
    return `Acknowledge modified target replacement: ${agent}/${name}`;
  }
  if (kind === "legacy") {
    return `Acknowledge legacy receipt replacement: ${agent}/${name}`;
  }
  if (kind === "remove-modified") {
    return `Acknowledge removal of modified target: ${agent}/${name}`;
  }
  return `Acknowledge removal of legacy target: ${agent}/${name}`;
}

function safetyShape(plans: readonly SkillManagerAgentPlan[], action: SkillManagerAction, agents: readonly ScopedAgent[], scope: InstallScope, items: readonly string[]): string {
  return JSON.stringify({
    action,
    agents,
    scope,
    items,
    plans: plans.map((plan) => ({
      agent: plan.agent,
      root: plan.root,
      active: plan.active,
      blocked: plan.blocked,
      acknowledgementIds: [...plan.acknowledgementIds].sort(),
      skipped: plan.skipped.map((entry) => ({ item: entry.item, kind: entry.kind, reason: entry.reason })),
      install: [...(plan.installPlan?.skills ?? []), ...(plan.installPlan?.commands ?? [])].map((target) => ({
        name: target.name,
        kind: target.kind,
        source: target.source,
        target: target.target,
        collision: target.collision,
      })),
      remove: plan.uninstallTargets,
    })),
  });
}

class SkillManagerTuiController implements TuiController {
  private readonly terminal: Terminal;
  private readonly env: NodeJS.ProcessEnv;
  private readonly executor: SkillManagerActionExecutor;
  private targetSelection: AgentSelection;
  private scope: InstallScope;
  private step: TuiStep = "target";
  private targetFocusIndex = 0;
  private actionIndex = 0;
  private snapshot: SkillManagerSnapshot;
  private snapshots: SkillManagerSnapshot[];
  private inventory: SkillManagerInventoryItem[] = [];
  private selectedItems = new Set<string>();
  private selectedIndex = 0;
  private selectAllFocused = false;
  private query = "";
  private searchMode = false;
  private inspectDetail = false;
  private review: TuiReviewState | undefined;
  private result: TuiResultState | undefined;
  private message: TuiState["message"];
  private busy = false;
  private exiting = false;
  private unsubscribe: (() => void) | undefined;
  private unsubscribeResize: (() => void) | undefined;
  private runPromise: Promise<void> | undefined;
  private resolveRun: (() => void) | undefined;
  private rejectRun: ((error: unknown) => void) | undefined;
  private inputQueue = Promise.resolve();
  private readonly inputDecoder = new TuiInputDecoder();
  private escapeFlushTimer: ReturnType<typeof setTimeout> | undefined;
  private finished = false;
  private readonly initialItems: readonly string[];
  private initialItemsApplied = false;

  constructor(options: TuiControllerOptions) {
    this.terminal = options.terminal;
    this.env = options.env ?? process.env;
    this.executor = options.executor ?? {};
    this.targetSelection = selectionFromInitial(options.initialAgents, options.initialAgent);
    this.scope = options.initialScope ?? "global";
    this.initialItems = options.initialItems ?? [];
    this.snapshots = getSkillManagerSnapshots(orderedAgents(this.targetSelection), this.scope, this.env);
    this.snapshot = this.snapshots[0] ?? getSkillManagerSnapshots([supportedAgents[0]], this.scope, this.env)[0];
    this.refreshInventory();
  }

  getState(): TuiState {
    const selection: AgentSelection = this.targetSelection.mode === "all"
      ? { mode: "all" }
      : { mode: "custom", agents: new Set(this.targetSelection.agents) };
    return {
      step: this.step,
      targetSelection: selection,
      selection: selection.mode === "all" ? { mode: "all" } : { mode: "custom", agents: new Set(selection.agents) },
      selectedAgents: orderedAgents(selection),
      scope: this.scope,
      action: actions[this.actionIndex],
      targetFocus: selectionTarget(this.targetSelection, this.scope, this.targetFocusIndex).focus,
      actionIndex: this.actionIndex,
      inventory: [...this.inventory],
      selectedItems: [...this.selectedItems],
      selectedIndex: this.selectedIndex,
      selectAllFocused: this.selectAllFocused,
      query: this.query,
      searchMode: this.searchMode,
      inspectDetail: this.inspectDetail,
      snapshots: [...this.snapshots],
      snapshot: this.snapshot,
      review: this.review ? {
        ...this.review,
        agents: [...this.review.agents],
        items: [...this.review.items],
        plans: [...this.review.plans],
        acknowledgements: this.review.acknowledgements.map((entry) => ({ ...entry })),
      } : undefined,
      result: this.result ? {
        ...this.result,
        results: this.result.results.map((entry) => ({ ...entry })),
      } : undefined,
      message: this.message ? { ...this.message } : undefined,
      busy: this.busy,
      exiting: this.exiting,
    };
  }

  getFilteredItems(): SkillManagerInventoryItem[] {
    const normalized = this.query.trim().toLowerCase();
    if (!normalized) {
      return [...this.inventory];
    }
    return this.inventory.filter((item) => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(normalized));
  }

  getSelectedItem(): SkillManagerInventoryItem | undefined {
    if (this.selectAllFocused) {
      return undefined;
    }
    return this.getFilteredItems()[this.selectedIndex];
  }

  render(): void {
    const target = selectionTarget(this.targetSelection, this.scope, this.targetFocusIndex);
    const state: SkillManagerRenderState = {
      step: this.step,
      target,
      action: {
        action: actions[this.actionIndex],
        selectedIndex: this.actionIndex,
      },
      skills: {
        action: actions[this.actionIndex],
        items: this.inventory,
        selectedIndex: this.selectedIndex,
        selectAllFocused: this.selectAllFocused,
        selectedNames: [...this.selectedItems],
        query: this.query,
        searchMode: this.searchMode,
        inspectDetail: this.inspectDetail,
      },
      review: this.review ? {
        action: this.review.action,
        agents: this.review.agents,
        scope: this.review.scope,
        items: this.review.items,
        plans: this.review.plans,
        acknowledgements: this.review.acknowledgements,
        focusIndex: this.review.focusIndex,
        scrollOffset: this.review.scrollOffset,
        showDetails: this.review.showDetails,
        error: this.review.error,
      } : undefined,
      result: this.result ? {
        action: this.result.action,
        aggregateStatus: this.result.aggregateStatus,
        results: this.result.results,
        scrollOffset: this.result.scrollOffset,
      } : undefined,
      snapshot: this.snapshot,
      selectedIndex: this.selectedIndex,
      query: this.query,
      message: this.message,
      busy: this.busy,
      tooSmall: !hasSufficientTerminalSize(this.terminal.getSize()),
    };
    this.terminal.write("\x1b[2J\x1b[H");
    this.terminal.write(renderSkillManagerFrame(state, this.terminal.getSize(), { color: this.terminal.colorEnabled }));
  }

  async handleInput(data: TerminalData): Promise<void> {
    if (this.escapeFlushTimer) {
      clearTimeout(this.escapeFlushTimer);
      this.escapeFlushTimer = undefined;
    }

    await this.handleKeys(this.inputDecoder.push(data));
    if (this.inputDecoder.hasPending() && !this.exiting) {
      this.escapeFlushTimer = setTimeout(() => {
        this.escapeFlushTimer = undefined;
        this.inputQueue = this.inputQueue
          .then(() => this.handleKeys(this.inputDecoder.flush()))
          .catch((error: unknown) => this.finish(error));
      }, 30);
    }
  }

  private async handleKeys(keys: TuiKey[]): Promise<void> {
    for (const key of keys) {
      await this.handleKey(key);
      if (this.exiting) {
        break;
      }
    }
  }

  run(): Promise<void> {
    if (this.runPromise) {
      return this.runPromise;
    }

    if (this.finished) {
      return Promise.resolve();
    }

    this.runPromise = new Promise<void>((resolve, reject) => {
      this.resolveRun = resolve;
      this.rejectRun = reject;

      try {
        this.terminal.enterAlternateScreen();
        this.unsubscribe = this.terminal.onData((data) => {
          this.inputQueue = this.inputQueue
            .then(() => this.handleInput(data))
            .catch((error: unknown) => {
              this.message = { kind: "error", text: errorMessage(error) };
              try {
                this.render();
              } catch (renderError) {
                this.finish(renderError);
              }
            });
        });
        this.unsubscribeResize = this.terminal.onResize(() => {
          try {
            this.render();
          } catch (error) {
            this.finish(error);
          }
        });
        this.render();
      } catch (error) {
        this.finish(error);
      }
    });

    return this.runPromise;
  }

  stop(): void {
    this.exiting = true;
    this.finish();
  }

  private finish(error?: unknown): void {
    if (this.finished) {
      return;
    }
    this.finished = true;

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    if (this.unsubscribeResize) {
      this.unsubscribeResize();
      this.unsubscribeResize = undefined;
    }
    if (this.escapeFlushTimer) {
      clearTimeout(this.escapeFlushTimer);
      this.escapeFlushTimer = undefined;
    }

    let cleanupError: unknown;
    try {
      this.terminal.close();
    } catch (closeError) {
      cleanupError = closeError;
    }

    if (this.resolveRun || this.rejectRun) {
      const reject = this.rejectRun;
      const resolve = this.resolveRun;
      this.resolveRun = undefined;
      this.rejectRun = undefined;
      if (error ?? cleanupError) {
        reject?.(error ?? cleanupError);
      } else {
        resolve?.();
      }
    }
  }

  private isTooSmall(): boolean {
    return !hasSufficientTerminalSize(this.terminal.getSize());
  }

  private async handleKey(key: TuiKey): Promise<void> {
    if (key.type === "named" && key.name === "ctrl-c") {
      this.stop();
      return;
    }

    if (this.exiting) {
      return;
    }

    if (this.isTooSmall()) {
      return;
    }

    if (this.searchMode) {
      await this.handleSearchKey(key);
      return;
    }

    switch (this.step) {
      case "target":
        await this.handleTargetKey(key);
        return;
      case "action":
        await this.handleActionKey(key);
        return;
      case "skills":
        await this.handleSkillsKey(key);
        return;
      case "review":
        await this.handleReviewKey(key);
        return;
      case "result":
        await this.handleResultKey(key);
        return;
    }
  }

  private async handleTargetKey(key: TuiKey): Promise<void> {
    if (key.type !== "named") {
      return;
    }
    switch (key.name) {
      case "up":
      case "pageup":
        this.moveTargetFocus(key.name === "pageup" ? -3 : -1);
        return;
      case "down":
      case "pagedown":
        this.moveTargetFocus(key.name === "pagedown" ? 3 : 1);
        return;
      case "home":
        this.targetFocusIndex = 0;
        this.render();
        return;
      case "end":
        this.targetFocusIndex = supportedAgents.length + 2;
        this.render();
        return;
      case "space":
        this.toggleTargetFocus();
        return;
      case "enter":
        if (orderedAgents(this.targetSelection).length === 0) {
          this.message = { kind: "error", text: "Select at least one agent before continuing." };
          this.render();
          return;
        }
        this.step = "action";
        this.actionIndex = 0;
        this.message = undefined;
        this.render();
        return;
      case "escape":
        this.stop();
        return;
      default:
        return;
    }
  }

  private moveTargetFocus(delta: number): void {
    const max = supportedAgents.length + 2;
    this.targetFocusIndex = Math.max(0, Math.min(max, this.targetFocusIndex + delta));
    this.message = undefined;
    this.render();
  }

  private toggleTargetFocus(): void {
    const scopeStart = supportedAgents.length + 1;
    if (this.targetFocusIndex === 0) {
      this.targetSelection = { mode: "all" };
      this.reloadSnapshots();
      this.message = { kind: "info", text: `Selected all ${supportedAgents.length} agents.` };
      this.render();
      return;
    }

    if (this.targetFocusIndex <= supportedAgents.length) {
      const agent = supportedAgents[this.targetFocusIndex - 1];
      const next = this.targetSelection.mode === "all" ? new Set<ScopedAgent>([agent]) : new Set(this.targetSelection.agents);
      if (this.targetSelection.mode === "custom" && next.has(agent)) {
        next.delete(agent);
      } else if (this.targetSelection.mode === "all") {
        // Selecting an individual while All is active switches to exactly that agent.
        this.targetSelection = { mode: "custom", agents: next };
        this.reloadSnapshots();
        this.message = { kind: "info", text: `Selected ${agent}; All agents is no longer active.` };
        this.render();
        return;
      } else {
        next.add(agent);
      }
      this.targetSelection = { mode: "custom", agents: next };
      this.reloadSnapshots();
      this.message = next.size === 0
        ? { kind: "error", text: "No agents selected. Choose an agent or All agents before Next." }
        : { kind: "info", text: `${next.size} agent${next.size === 1 ? "" : "s"} selected.` };
      this.render();
      return;
    }

    const scope = this.targetFocusIndex === scopeStart ? "local" : "global";
    this.scope = scope;
    this.reloadSnapshots();
    this.message = { kind: "info", text: `Scope set to ${scope}.` };
    this.render();
  }

  private async handleActionKey(key: TuiKey): Promise<void> {
    if (key.type !== "named") {
      return;
    }
    switch (key.name) {
      case "up":
      case "pageup":
        this.actionIndex = Math.max(0, this.actionIndex - (key.name === "pageup" ? 2 : 1));
        this.message = undefined;
        this.render();
        return;
      case "down":
      case "pagedown":
        this.actionIndex = Math.min(actions.length - 1, this.actionIndex + (key.name === "pagedown" ? 2 : 1));
        this.message = undefined;
        this.render();
        return;
      case "home":
        this.actionIndex = 0;
        this.render();
        return;
      case "end":
        this.actionIndex = actions.length - 1;
        this.render();
        return;
      case "enter":
        this.enterSkills();
        return;
      case "escape":
        this.step = "target";
        this.message = undefined;
        this.render();
        return;
      default:
        return;
    }
  }

  private enterSkills(): void {
    this.step = "skills";
    this.inspectDetail = actions[this.actionIndex] === "inspect";
    this.selectedIndex = 0;
    this.selectAllFocused = true;
    this.query = "";
    this.searchMode = false;
    this.message = undefined;
    this.reloadSnapshots();
    const selectableNames = new Set(this.inventory.filter((item) => item.selectable).map((item) => item.name));
    this.selectedItems = new Set([...this.selectedItems].filter((name) => selectableNames.has(name)));
    if (!this.initialItemsApplied) {
      this.initialItemsApplied = true;
      for (const name of this.initialItems) {
        const item = this.inventory.find((entry) => entry.name === name && entry.selectable);
        if (item) {
          this.selectedItems.add(item.name);
        }
      }
    }
    this.render();
  }

  private filteredInventory(): SkillManagerInventoryItem[] {
    return this.getFilteredItems();
  }

  private async handleSkillsKey(key: TuiKey): Promise<void> {
    if (key.type === "text" && key.value === "/") {
      this.searchMode = true;
      this.message = undefined;
      this.render();
      return;
    }

    if (key.type !== "named") {
      return;
    }
    switch (key.name) {
      case "up":
      case "pageup":
        this.moveSkillFocus(key.name === "pageup" ? -3 : -1);
        return;
      case "down":
      case "pagedown":
        this.moveSkillFocus(key.name === "pagedown" ? 3 : 1);
        return;
      case "home":
        this.selectedIndex = 0;
        this.selectAllFocused = true;
        this.render();
        return;
      case "end":
        this.selectAllFocused = false;
        this.selectedIndex = Math.max(0, this.filteredInventory().length - 1);
        this.render();
        return;
      case "space":
        this.toggleSkill();
        return;
      case "enter":
        if (actions[this.actionIndex] === "inspect") {
          const selected = this.getSelectedItem();
          if (selected) {
            this.selectedItems.add(selected.name);
            this.inspectDetail = true;
            this.message = { kind: "info", text: `Inspecting ${selected.name}; no files will be changed.` };
          }
          this.render();
          return;
        }
        this.enterReview();
        return;
      case "escape":
        if (this.query) {
          this.query = "";
          this.selectedIndex = 0;
          this.message = { kind: "info", text: "Search cleared." };
          this.render();
          return;
        }
        if (this.inspectDetail) {
          this.inspectDetail = false;
          this.selectedItems.clear();
          this.message = undefined;
          this.render();
          return;
        }
        this.step = "action";
        this.message = undefined;
        this.render();
        return;
      case "backspace":
        if (this.query) {
          this.query = this.query.slice(0, -1);
          this.selectedIndex = 0;
          this.render();
        }
        return;
      default:
        return;
    }
  }

  private async handleSearchKey(key: TuiKey): Promise<void> {
    if (key.type === "named") {
      switch (key.name) {
        case "escape":
          this.searchMode = false;
          if (this.query) {
            this.query = "";
            this.selectedIndex = 0;
            this.message = { kind: "info", text: "Search cleared." };
          }
          this.render();
          return;
        case "ctrl-c":
          this.stop();
          return;
        case "enter":
          this.searchMode = false;
          this.message = { kind: "info", text: this.query ? `Search applied: ${this.query}` : "Showing all skills." };
          this.render();
          return;
        case "backspace":
          this.query = this.query.slice(0, -1);
          this.selectedIndex = 0;
          this.render();
          return;
        case "up":
          this.moveSkillFocus(-1);
          return;
        case "down":
          this.moveSkillFocus(1);
          return;
        default:
          return;
      }
    }

    this.query += key.value;
    this.selectedIndex = 0;
    this.message = undefined;
    this.render();
  }

  private moveSkillFocus(delta: number): void {
    const items = this.filteredInventory();
    if (items.length === 0) {
      this.selectedIndex = 0;
      this.selectAllFocused = true;
      this.render();
      return;
    }
    if (this.selectAllFocused) {
      if (delta > 0) {
        this.selectAllFocused = false;
        this.selectedIndex = 0;
      }
      this.message = undefined;
      this.render();
      return;
    }
    if (this.selectedIndex === 0 && delta < 0) {
      this.selectAllFocused = true;
      this.message = undefined;
      this.render();
      return;
    }
    this.selectedIndex = Math.max(0, Math.min(items.length - 1, this.selectedIndex + delta));
    this.message = undefined;
    this.render();
  }

  private toggleSkill(): void {
    if (this.selectAllFocused) {
      const selectable = this.filteredInventory().filter((item) => item.selectable);
      const allSelected = selectable.length > 0 && selectable.every((item) => this.selectedItems.has(item.name));
      for (const item of selectable) {
        if (allSelected) {
          this.selectedItems.delete(item.name);
        } else {
          this.selectedItems.add(item.name);
        }
      }
      this.message = {
        kind: "info",
        text: allSelected ? `Cleared ${selectable.length} visible eligible skills.` : `Selected all ${selectable.length} visible eligible skills.`,
      };
      this.render();
      return;
    }
    const selected = this.getSelectedItem();
    if (!selected) {
      this.message = { kind: "info", text: "No skill is selected." };
      this.render();
      return;
    }
    if (!selected.selectable) {
      this.message = { kind: "info", text: `${selected.name} is disabled: ${selected.disabledReason ?? "not applicable"}` };
      this.render();
      return;
    }
    if (this.selectedItems.has(selected.name)) {
      this.selectedItems.delete(selected.name);
      this.message = { kind: "info", text: `Unselected ${selected.name}.` };
    } else {
      this.selectedItems.add(selected.name);
      this.message = { kind: "info", text: `Selected ${selected.name}.` };
    }
    this.render();
  }

  private enterReview(): void {
    const names = [...this.selectedItems];
    if (names.length === 0) {
      this.message = { kind: "error", text: "Select at least one enabled skill before Review." };
      this.render();
      return;
    }
    this.review = this.buildReview(names);
    this.step = "review";
    this.message = undefined;
    this.render();
  }

  private buildReview(names: readonly string[]): TuiReviewState {
    const action = actions[this.actionIndex];
    const agents = orderedAgents(this.targetSelection);
    const plans = this.snapshots.map((snapshot) => getSkillManagerAgentPlan(action, snapshot, names, this.env));
    const ids = unique(plans.flatMap((plan) => plan.acknowledgementIds));
    const acknowledgements = ids.map((id) => ({ id, label: makeAcknowledgementLabel(id, plans), checked: false }));
    return {
      action,
      agents,
      scope: this.scope,
      items: [...names],
      plans,
      acknowledgements,
      focusIndex: 0,
      scrollOffset: 0,
      showDetails: false,
      safetyShape: safetyShape(plans, action, agents, this.scope, names),
    };
  }

  private async handleReviewKey(key: TuiKey): Promise<void> {
    if (!this.review) {
      this.step = "skills";
      this.render();
      return;
    }
    if (key.type === "text" && key.value.toLowerCase() === "d") {
      this.review.showDetails = !this.review.showDetails;
      this.review.scrollOffset = 0;
      this.message = {
        kind: "info",
        text: this.review.showDetails ? "Showing exact paths and per-agent details." : "Showing compact review summary.",
      };
      this.render();
      return;
    }
    if (key.type !== "named") {
      return;
    }
    switch (key.name) {
      case "up":
      case "pageup":
        this.moveReviewFocus(key.name === "pageup" ? -3 : -1);
        return;
      case "down":
      case "pagedown":
        this.moveReviewFocus(key.name === "pagedown" ? 3 : 1);
        return;
      case "home":
        this.review.scrollOffset = 0;
        this.review.focusIndex = 0;
        this.render();
        return;
      case "end":
        this.review.scrollOffset = Number.MAX_SAFE_INTEGER;
        this.render();
        return;
      case "space":
        this.toggleAcknowledgement();
        return;
      case "enter":
        await this.runReviewedAction();
        return;
      case "escape":
        this.step = "skills";
        this.review = undefined;
        this.message = { kind: "info", text: "Review cancelled; no files were changed." };
        this.render();
        return;
      default:
        return;
    }
  }

  private moveReviewFocus(delta: number): void {
    if (!this.review) {
      return;
    }
    this.review.scrollOffset = Math.max(0, this.review.scrollOffset + delta);
    this.render();
  }

  private toggleAcknowledgement(): void {
    if (!this.review || this.review.acknowledgements.length === 0) {
      this.message = { kind: "info", text: "No acknowledgement is required for this plan." };
      this.render();
      return;
    }
    const allChecked = this.review.acknowledgements.every((entry) => entry.checked);
    for (const acknowledgement of this.review.acknowledgements) {
      acknowledgement.checked = !allChecked;
    }
    this.review.error = undefined;
    this.message = {
      kind: "info",
      text: allChecked ? "Cleared all required acknowledgements." : `Confirmed all ${this.review.acknowledgements.length} required acknowledgements.`,
    };
    this.render();
  }

  private async runReviewedAction(): Promise<void> {
    if (!this.review) {
      return;
    }
    if (this.review.plans.some((plan) => plan.blocked)) {
      this.review.error = "One or more selected agents are blocked by an unreadable receipt or plan error.";
      this.render();
      return;
    }
    const missing = this.review.acknowledgements.filter((entry) => !entry.checked);
    if (missing.length > 0) {
      this.review.error = "Check every required acknowledgement before running.";
      this.render();
      return;
    }

    try {
      this.snapshots = getSkillManagerSnapshots(this.review.agents, this.review.scope, this.env);
      this.snapshot = this.snapshots[0] ?? this.snapshot;
    } catch (error) {
      this.review.error = `Unable to re-plan immediately before execution: ${errorMessage(error)}`;
      this.render();
      return;
    }

    const current = this.buildReview(this.review.items);
    if (current.safetyShape !== this.review.safetyShape) {
      current.error = "The plan changed immediately before execution. Review the new safety shape; no files were changed.";
      this.review = current;
      this.render();
      return;
    }

    const approvedAcks = this.review.acknowledgements.map((entry) => ({ ...entry }));
    this.review = { ...current, acknowledgements: approvedAcks, showDetails: this.review.showDetails };
    this.busy = true;
    this.message = undefined;
    this.render();

    const results: TuiAgentResult[] = [];
    let failed = false;
    for (const plan of current.plans) {
      if (failed) {
        results.push({ agent: plan.agent, status: "Not attempted" });
        continue;
      }
      try {
        const rawResult = await executeSkillManagerAgentPlan(plan, this.hasOverwriteAcknowledgement(plan), this.env, this.executor);
        const installed = selectedResultNames(rawResult, "installed");
        const uninstalled = selectedResultNames(rawResult, "uninstalled");
        const skipped = unique([...plan.skipped.map((entry) => entry.item), ...skippedResultNames(rawResult)]);
        const changed = installed.length > 0 || uninstalled.length > 0;
        const status: TuiAgentResult["status"] = changed
          ? skipped.length > 0 ? "Completed with skips" : "Completed"
          : skipped.length > 0 ? "Completed with skips" : "No changes";
        let receiptEvidence: string | undefined;
        try {
          const receipt = getSkillManagerSnapshots([plan.agent], plan.scope, this.env)[0]?.receipt;
          receiptEvidence = receipt
            ? `${receipt.installedSkills.length} skills, ${receipt.installedCommands.length} commands recorded`
            : "receipt removed or not present";
        } catch (error) {
          receiptEvidence = `unreadable after action: ${errorMessage(error)}`;
        }
        results.push({
          agent: plan.agent,
          status,
          installed,
          uninstalled,
          skipped,
          receiptPath: resultReceiptPath(rawResult),
          receiptEvidence,
        });
      } catch (error) {
        failed = true;
        results.push({ agent: plan.agent, status: "Failed", error: errorMessage(error) });
      }
    }

    const aggregateStatus = this.aggregateResultStatus(results);
    this.result = {
      action: current.action,
      aggregateStatus,
      results,
      scrollOffset: 0,
    };
    this.step = "result";
    this.busy = false;
    this.render();
  }

  private hasOverwriteAcknowledgement(plan: SkillManagerAgentPlan): boolean {
    if (!this.review) {
      return false;
    }
    const id = `overwrite:${plan.agent}`;
    return this.review.acknowledgements.find((entry) => entry.id === id)?.checked ?? false;
  }

  private aggregateResultStatus(results: readonly TuiAgentResult[]): TuiResultState["aggregateStatus"] {
    const failed = results.some((result) => result.status === "Failed");
    const notAttempted = results.some((result) => result.status === "Not attempted");
    const completed = results.some((result) => ["Completed", "Completed with skips"].includes(result.status));
    if (failed && completed) {
      return "Partially completed";
    }
    if (failed || notAttempted) {
      return "Failed";
    }
    if (results.length > 0 && results.every((result) => result.status === "No changes")) {
      return "No changes";
    }
    if (results.some((result) => result.status === "Completed with skips")) {
      return "Completed with skips";
    }
    return "Completed";
  }

  private async handleResultKey(key: TuiKey): Promise<void> {
    const result = this.result;
    if (!result || key.type !== "named") {
      return;
    }
    switch (key.name) {
      case "up":
      case "pageup":
        result.scrollOffset = Math.max(0, (result.scrollOffset ?? 0) + (key.name === "pageup" ? -3 : -1));
        this.render();
        return;
      case "down":
      case "pagedown":
        result.scrollOffset = (result.scrollOffset ?? 0) + (key.name === "pagedown" ? 3 : 1);
        this.render();
        return;
      case "home":
        result.scrollOffset = 0;
        this.render();
        return;
      case "end":
        result.scrollOffset = (result.scrollOffset ?? 0) + 1000;
        this.render();
        return;
      case "enter":
        this.step = "action";
        this.result = undefined;
        this.review = undefined;
        this.selectedItems.clear();
        this.message = { kind: "info", text: "Returned to Action." };
        this.render();
        return;
      case "escape":
        this.step = "target";
        this.result = undefined;
        this.review = undefined;
        this.selectedItems.clear();
        this.message = { kind: "info", text: "Returned to Target." };
        this.render();
        return;
      default:
        return;
    }
  }

  private reloadSnapshots(): void {
    const agents = orderedAgents(this.targetSelection);
    if (agents.length === 0) {
      this.snapshots = [];
      this.inventory = [];
      return;
    }
    try {
      this.snapshots = getSkillManagerSnapshots(agents, this.scope, this.env);
      this.snapshot = this.snapshots[0];
      this.refreshInventory();
      const availableNames = new Set(this.inventory.map((item) => item.name));
      this.selectedItems = new Set([...this.selectedItems].filter((name) => availableNames.has(name)));
      this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.filteredInventory().length - 1));
    } catch (error) {
      this.message = { kind: "error", text: `Unable to load selected targets: ${errorMessage(error)}` };
    }
  }

  private refreshInventory(): void {
    this.inventory = deriveSkillManagerInventory(actions[this.actionIndex], this.snapshots);
  }
}

export function createTuiController(options: TuiControllerOptions): TuiController {
  return new SkillManagerTuiController(options);
}

export async function runTui(options: RunTuiOptions = {}): Promise<void> {
  const terminal = options.terminal ?? createTerminal();
  const size: TerminalSize = terminal.getSize();
  if (!canUseFullScreenTerminal(terminal, options.env)) {
    throw new Error(`Full-screen TUI requires an interactive non-dumb terminal at least 72x18; terminal is ${size.columns}x${size.rows}.`);
  }

  const controller = createTuiController({
    terminal,
    env: options.env,
    initialAgents: options.initialAgents,
    initialAgent: options.initialAgent,
    initialScope: options.initialScope,
    initialItems: options.initialItems,
    executor: options.executor,
  });
  await controller.run();
}

export const runSkillManagerTui = runTui;
