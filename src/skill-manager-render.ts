import type {
  SkillManagerAction,
  SkillManagerAgentPlan,
  SkillManagerInventoryItem,
  SkillManagerItem,
  SkillManagerSnapshot,
} from "./skill-manager";
import type { InstallScope, ScopedAgent } from "./types";
import { hasSufficientTerminalSize, type TerminalSize } from "./terminal";

export type { SkillManagerAction } from "./skill-manager";
export type TuiStep = "target" | "action" | "skills" | "review" | "result";
export type TargetFocus =
  | { kind: "all" }
  | { kind: "agent"; agent: ScopedAgent }
  | { kind: "scope"; scope: InstallScope };

export interface SkillManagerMessage {
  kind: "info" | "success" | "error";
  text: string;
}

export interface SkillManagerConfirmation {
  action: Exclude<SkillManagerAction, "inspect">;
  agent: ScopedAgent;
  scope: InstallScope;
  items: string[];
  overwrite?: boolean;
  collisionTargets?: string[];
}

export interface SkillManagerAcknowledgement {
  id: string;
  label: string;
  checked: boolean;
}

export interface SkillManagerTargetRenderState {
  agents: readonly ScopedAgent[];
  mode: "all" | "custom";
  selectedAgents: readonly ScopedAgent[];
  scope: InstallScope;
  focus?: TargetFocus;
  focusIndex?: number;
}

export interface SkillManagerActionRenderState {
  action?: SkillManagerAction;
  selectedIndex?: number;
}

export interface SkillManagerSkillsRenderState {
  action?: SkillManagerAction;
  items: readonly SkillManagerInventoryItem[];
  selectedIndex?: number;
  selectAllFocused?: boolean;
  selectedNames?: readonly string[];
  query?: string;
  searchMode?: boolean;
  inspectDetail?: boolean;
}

export interface SkillManagerReviewRenderState {
  action: SkillManagerAction;
  agents: readonly ScopedAgent[];
  scope: InstallScope;
  items: readonly string[];
  plans: readonly SkillManagerAgentPlan[];
  acknowledgements: readonly SkillManagerAcknowledgement[];
  focusIndex?: number;
  scrollOffset?: number;
  showDetails?: boolean;
  error?: string;
}

export interface SkillManagerAgentResultRenderState {
  agent: ScopedAgent;
  status: string;
  installed?: readonly string[];
  uninstalled?: readonly string[];
  skipped?: readonly string[];
  error?: string;
  receiptPath?: string;
  receiptEvidence?: string;
}

export interface SkillManagerResultRenderState {
  action: SkillManagerAction;
  aggregateStatus: string;
  results: readonly SkillManagerAgentResultRenderState[];
  scrollOffset?: number;
}

export interface SkillManagerRenderState {
  step?: TuiStep;
  target?: SkillManagerTargetRenderState;
  action?: SkillManagerActionRenderState;
  skills?: SkillManagerSkillsRenderState;
  review?: SkillManagerReviewRenderState;
  result?: SkillManagerResultRenderState;
  snapshot?: SkillManagerSnapshot;
  selectedIndex?: number;
  staged?: readonly string[];
  query?: string;
  searchMode?: boolean;
  confirmation?: SkillManagerConfirmation;
  message?: SkillManagerMessage;
  busy?: boolean;
  tooSmall?: boolean;
}

export interface SkillManagerRenderOptions {
  color?: boolean;
}

const ansiCsiPattern = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const ansiOscPattern = /\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
const reset = "\x1b[0m";

const colors = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

export function stripAnsi(value: string): string {
  return value.replace(ansiOscPattern, "").replace(ansiCsiPattern, "");
}

export function visibleWidth(value: string): number {
  return Bun.stringWidth(stripAnsi(value));
}

function paint(value: string, color: string, enabled: boolean): string {
  return enabled ? `${color}${value}${reset}` : value;
}

function sanitize(value: string): string {
  return stripAnsi(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").trim();
}

function graphemes(value: string): string[] {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].map((entry) => entry.segment);
}

function clipPlain(value: string, width: number): string {
  if (width <= 0) {
    return "";
  }

  if (Bun.stringWidth(value) <= width) {
    return value;
  }

  let result = "";
  for (const segment of graphemes(value)) {
    if (Bun.stringWidth(result + segment) > width) {
      break;
    }
    result += segment;
  }
  return result;
}

function fitLine(value: string, width: number): string {
  const safeWidth = Math.max(0, width);
  if (visibleWidth(value) > safeWidth) {
    if (safeWidth <= 1) {
      return clipPlain("…", safeWidth);
    }
    return `${clipPlain(stripAnsi(value), safeWidth - 1)}…`;
  }

  return value;
}

function hardWrapWord(word: string, width: number): string[] {
  if (width <= 0) {
    return [];
  }

  const result: string[] = [];
  let line = "";
  for (const segment of graphemes(word)) {
    if (line && Bun.stringWidth(line + segment) > width) {
      result.push(line);
      line = "";
    }
    line += segment;
  }
  if (line) {
    result.push(line);
  }
  return result;
}

export function wrapText(value: string, width: number, limit = Number.POSITIVE_INFINITY): string[] {
  const safeValue = sanitize(value);
  if (!safeValue || width <= 0 || limit <= 0) {
    return [];
  }

  const lines: string[] = [];
  let current = "";
  const flush = (): boolean => {
    if (current) {
      lines.push(current);
      current = "";
    }
    return lines.length >= limit;
  };

  for (const word of safeValue.split(/(\s+)/).filter((part) => part.length > 0)) {
    if (/^\s+$/.test(word)) {
      if (current && Bun.stringWidth(current + word) <= width) {
        current += word;
      }
      continue;
    }

    if (Bun.stringWidth(word) > width) {
      if (current && flush()) {
        return lines;
      }
      const chunks = hardWrapWord(word, width);
      for (const chunk of chunks.slice(0, -1)) {
        lines.push(chunk);
        if (lines.length >= limit) {
          return lines;
        }
      }
      current = chunks.at(-1) ?? "";
      continue;
    }

    if (!current) {
      current = word;
      continue;
    }

    if (Bun.stringWidth(current + word) <= width) {
      current += word;
      continue;
    }

    if (flush()) {
      return lines;
    }
    current = word;
  }

  if (current && lines.length < limit) {
    lines.push(current);
  }
  return lines;
}

function appendWrapped(lines: string[], value: string, width: number, prefix = ""): void {
  const prefixWidth = visibleWidth(prefix);
  const firstWidth = Math.max(1, width - prefixWidth);
  const wrapped = wrapText(value, firstWidth);
  if (wrapped.length === 0) {
    lines.push(prefix);
    return;
  }
  lines.push(`${prefix}${wrapped[0]}`);
  for (const line of wrapped.slice(1)) {
    lines.push(clipPlain(line, width));
  }
}

function horizontal(width: number): string {
  return "─".repeat(Math.max(0, width));
}

function statusColor(status: string): string {
  if (["current", "Completed", "installed", "ok"].includes(status)) {
    return colors.green;
  }
  if (["outdated", "modified", "legacy", "missing", "Completed with skips", "Partially completed"].includes(status)) {
    return colors.yellow;
  }
  if (["Failed", "blocked", "unknown"].includes(status)) {
    return colors.red;
  }
  return colors.gray;
}

function formatStatus(status: string, color: boolean): string {
  const marker = ["current", "Completed", "installed", "ok"].includes(status)
    ? "✓"
    : ["outdated", "modified", "legacy", "missing", "Completed with skips", "Partially completed"].includes(status)
      ? "!"
      : ["Failed", "blocked", "unknown"].includes(status)
        ? "✕"
        : status === "Not attempted"
          ? "○"
          : status === "No changes"
            ? "–"
            : "+";
  return paint(`${marker} ${status}`, statusColor(status), color);
}

function formatCounts(item: SkillManagerInventoryItem): string {
  const countLabels = [
    ["new", item.counts["not-installed"]],
    ["ok", item.counts.current],
    ["update", item.counts.outdated],
    ["edited", item.counts.modified],
    ["missing", item.counts.missing],
    ["legacy", item.counts.legacy],
    ["unknown", item.counts.unknown],
    ["receipt-only", item.counts["receipt-only"]],
  ] as const;
  const labels = countLabels.filter(([, count]) => count !== undefined && count > 0).map(([label, count]) => `${label} ${count}`);
  return `${item.coverage.installed}/${item.coverage.selected} installed${labels.length > 0 ? ` · ${labels.join(" · ")}` : ""}`;
}

function actionLabel(action: SkillManagerAction): string {
  return action[0].toUpperCase() + action.slice(1);
}

function actionDescription(action: SkillManagerAction): string {
  switch (action) {
    case "install":
      return "Copy source skills to agents where they are not receipt-installed.";
    case "update":
      return "Replace selected outdated, missing, modified, or legacy receipt items.";
    case "uninstall":
      return "Remove only paths recorded in the selected agents' receipts.";
    case "inspect":
      return "Browse source and receipt state without changing files.";
  }
}

function stepper(step: TuiStep, color: boolean): string {
  const steps: TuiStep[] = ["target", "action", "skills", "review", "result"];
  const activeIndex = steps.indexOf(step);
  return steps.map((entry) => {
    const label = entry[0].toUpperCase() + entry.slice(1);
    const index = steps.indexOf(entry);
    if (index < activeIndex) {
      return paint(`✓ ${label}`, colors.green, color);
    }
    if (entry === step) {
      return paint(`▶ ${label}`, `${colors.bold}${colors.cyan}`, color);
    }
    return paint(`· ${label}`, colors.gray, color);
  }).join("  ›  ");
}

function selectedTargetLabel(target: SkillManagerTargetRenderState): string {
  if (target.mode === "all") {
    return `All agents (${target.agents.length})`;
  }
  return target.selectedAgents.length > 0 ? target.selectedAgents.join(", ") : "No agents selected";
}

function brandLine(width: number, color: boolean): string {
  const wordmark = `${paint("MAHIRO SKILLS", `${colors.bold}${colors.yellow}`, color)}`;
  const descriptor = paint("Bun CLI/TUI", colors.gray, color);
  const gap = Math.max(1, width - visibleWidth(wordmark) - visibleWidth(descriptor));
  return `${wordmark}${" ".repeat(gap)}${descriptor}`;
}

function headerLines(state: SkillManagerRenderState, width: number, color: boolean): string[] {
  const step = state.step ?? "skills";
  const target = state.target;
  const summary = target
    ? `Targets: ${selectedTargetLabel(target)} · Scope: ${target.scope}`
    : state.snapshot
      ? `Target: ${state.snapshot.agent} · Scope: ${state.snapshot.scope} · Root: ${sanitize(state.snapshot.root)}`
      : "Targets: not selected";
  const context = step === "skills" && state.skills
    ? `${summary} · Action: ${actionLabel(state.skills.action ?? "install")} · Selected: ${state.skills.selectedNames?.length ?? 0}`
    : step === "review" && state.review
      ? `${summary} · Action: ${actionLabel(state.review.action)} · Selected: ${state.review.items.length}`
      : step === "result" && state.result
        ? `${summary} · Action: ${actionLabel(state.result.action)}`
        : summary;

  const status = state.busy
    ? "Working..."
    : state.message
      ? `${state.message.kind}: ${sanitize(state.message.text)}`
      : state.review?.error
        ? `error: ${sanitize(state.review.error)}`
        : "";

  const lines = [
    brandLine(width, color),
    stepper(step, color),
    context,
  ];
  if (status) {
    lines.push(status);
  }
  lines.push(horizontal(width));
  return lines;
}

function targetLines(state: SkillManagerTargetRenderState, width: number, color: boolean): string[] {
  const lines: string[] = [paint("TARGET", colors.bold, color), "Select one or more agents and one installation scope.", ""];
  const focus = state.focus ?? (state.focusIndex === 0 ? { kind: "all" } : undefined);
  const isFocused = (candidate: TargetFocus): boolean => {
    if (!focus || focus.kind !== candidate.kind) {
      return false;
    }
    return candidate.kind === "all"
      ? true
      : candidate.kind === "agent"
        ? focus.kind === "agent" && focus.agent === candidate.agent
        : focus.kind === "scope" && focus.scope === candidate.scope;
  };
  const allSelected = state.mode === "all";
  lines.push("Agents");
  lines.push(`${isFocused({ kind: "all" }) ? ">" : " "} ${allSelected ? "(*)" : "( )"} All agents (${state.agents.length})`);
  for (const agent of state.agents) {
    const selected = state.mode === "custom" && state.selectedAgents.includes(agent);
    lines.push(`${isFocused({ kind: "agent", agent }) ? ">" : " "} ${selected ? "(*)" : "( )"} ${agent}`);
  }
  lines.push("", "Scope");
  for (const scope of ["local", "global"] as const) {
    lines.push(`${isFocused({ kind: "scope", scope }) ? ">" : " "} ${state.scope === scope ? "(*)" : "( )"} ${scope}`);
  }
  lines.push("", "All agents is exclusive. Selecting an individual switches to Custom.");
  return lines.flatMap((line) => line.length > width ? wrapText(line, width) : [line]);
}

function actionLines(state: SkillManagerActionRenderState, width: number, color: boolean): string[] {
  const actions: SkillManagerAction[] = ["install", "update", "uninstall", "inspect"];
  const lines = [paint("ACTION", colors.bold, color), "Choose what to do for the selected targets.", ""];
  actions.forEach((action, index) => {
    const marker = index === (state.selectedIndex ?? 0) ? ">" : " ";
    lines.push(`${marker} ${actionLabel(action)}`);
    lines.push(...wrapText(actionDescription(action), Math.max(1, width - 4)).map((line) => `    ${line}`));
    if (index !== actions.length - 1) {
      lines.push("");
    }
  });
  return lines;
}

function skillsLines(state: SkillManagerSkillsRenderState, width: number, color: boolean): string[] {
  const query = state.query?.trim().toLowerCase() ?? "";
  const filtered = state.items.filter((item) => !query || `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query));
  const selectedNames = new Set(state.selectedNames ?? []);
  const selectedIndex = filtered.length === 0 ? -1 : Math.max(0, Math.min(state.selectedIndex ?? 0, filtered.length - 1));
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : undefined;
  const lines: string[] = [
    paint(`${actionLabel(state.action ?? (state.inspectDetail ? "inspect" : "install"))} SKILLS`, colors.bold, color),
    state.searchMode ? `Query: ${sanitize(state.query ?? "")} (type, Enter applies, Esc clears)` : "Source and receipt-derived inventory; rows keep per-agent differences visible.",
    "",
  ];

  if (selected) {
    lines.push("DETAIL");
    lines.push(`${paint(selected.name, colors.cyan, color)}${selected.receiptOnly ? " (receipt-only)" : ""}`);
    lines.push(...wrapText(selected.description ?? "No description available.", Math.max(1, width - 2)).slice(0, 2));
    lines.push(`Coverage: ${formatCounts(selected)}`);
    if (!selected.selectable && selected.disabledReason) {
      lines.push(`Disabled: ${selected.disabledReason}`);
    }
    for (const agent of selected.agents) {
      const receipt = agent.receiptRecorded ? "recorded" : "not recorded";
      const blocked = agent.blocked ? ` · blocked: ${sanitize(agent.blocked)}` : "";
      lines.push(`${agent.agent}: ${formatStatus(agent.state, color)} · ${receipt} · ${agent.commandSupport === "skills-only" ? "skills-only commands" : "skills + commands"}${blocked}`);
    }
    if (selected.receiptOnly) {
      lines.push("Receipt-only names have no current source catalog entry.");
    }
    if (state.inspectDetail) {
      lines.push("Inspect is read-only. Enter or Esc returns to the inventory.");
    }
    lines.push("", horizontal(width), "INVENTORY");
  } else {
    lines.push("Choose a row to inspect its per-agent state.", "", "INVENTORY");
  }

  if (filtered.length === 0) {
    lines.push("No matching skills.");
  } else {
    filtered.forEach((item, index) => {
      const marker = index === selectedIndex ? ">" : " ";
      const selection = selectedNames.has(item.name) ? "*" : " ";
      const disabled = item.selectable ? "" : " -";
      lines.push(`${marker} [${selection}] ${item.name}${disabled}  ${formatCounts(item)}`);
    });
  }
  return lines;
}

function padLine(value: string, width: number): string {
  const fitted = fitLine(value, width);
  return `${fitted}${" ".repeat(Math.max(0, width - visibleWidth(fitted)))}`;
}

function skillsPaneLines(state: SkillManagerSkillsRenderState, width: number, slots: number, color: boolean): string[] {
  const query = state.query?.trim().toLowerCase() ?? "";
  const filtered = state.items.filter((item) => !query || `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query));
  const selectedNames = new Set(state.selectedNames ?? []);
  const selectedIndex = filtered.length === 0 ? -1 : Math.max(0, Math.min(state.selectedIndex ?? 0, filtered.length - 1));
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : undefined;
  const dividerWidth = 3;
  const leftWidth = Math.max(31, Math.floor((width - dividerWidth) * 0.45));
  const rightWidth = Math.max(1, width - leftWidth - dividerWidth);
  const listSlots = Math.max(1, slots - 2);
  const itemSlots = Math.max(1, listSlots - 1);
  const maxStart = Math.max(0, filtered.length - itemSlots);
  const start = selectedIndex < 0 ? 0 : Math.max(0, Math.min(maxStart, selectedIndex - Math.floor(listSlots / 2)));
  const rangeStart = filtered.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(filtered.length, start + itemSlots);
  const left = [
    paint(`Skills ${rangeStart}–${rangeEnd}/${filtered.length} · selected ${selectedNames.size}`, colors.bold, color),
    state.searchMode ? `Filter: ${sanitize(state.query ?? "")}` : `${actionLabel(state.action ?? (state.inspectDetail ? "inspect" : "install"))} eligible inventory`,
  ];

  const eligible = filtered.filter((item) => item.selectable);
  const allEligibleSelected = eligible.length > 0 && eligible.every((item) => selectedNames.has(item.name));
  const selectAllRow = `${state.selectAllFocused ? ">" : " "} [${allEligibleSelected ? "x" : " "}] Select all eligible (${eligible.length})`;
  left.push(state.selectAllFocused ? paint(selectAllRow, `${colors.bold}${colors.cyan}`, color) : selectAllRow);

  if (filtered.length === 0) {
    left.push("No matching skills.");
  } else {
    for (const [relativeIndex, item] of filtered.slice(start, start + itemSlots).entries()) {
      const index = start + relativeIndex;
      const marker = !state.selectAllFocused && index === selectedIndex ? ">" : " ";
      const selection = item.selectable ? (selectedNames.has(item.name) ? "x" : " ") : "-";
      const row = `${marker} [${selection}] ${item.name}`;
      left.push(marker === ">" ? paint(row, `${colors.bold}${colors.cyan}`, color) : row);
    }
  }

  const right = [paint("Details", colors.bold, color)];
  if (!selected) {
    right.push("Choose a skill to inspect its per-agent state.");
  } else {
    right.push(`${paint(selected.name, colors.cyan, color)}${selected.receiptOnly ? " (receipt-only)" : ""}`);
    right.push(`Coverage: ${formatCounts(selected)}`);
    right.push(...wrapText(selected.description ?? "No description available.", rightWidth).slice(0, 2));
    if (!selected.selectable && selected.disabledReason) {
      right.push(`Disabled: ${selected.disabledReason}`);
    }
    right.push("");
    for (const agent of selected.agents) {
      const blocked = agent.blocked ? " · blocked" : "";
      if (selected.agents.length === 1) {
        right.push(`${agent.agent}: ${formatStatus(agent.state, color)}${blocked}`);
        right.push(agent.commandSupport === "skills-only" ? "skills-only commands" : "skills + commands");
      } else {
        const command = agent.commandSupport === "skills-only" ? "skills-only" : "skill+cmd";
        right.push(`${agent.agent}: ${formatStatus(agent.state, color)} · ${command}${blocked}`);
      }
    }
    if (state.inspectDetail) {
      right.push("", "Inspect is read-only. Enter or Esc returns.");
    }
  }

  const lines: string[] = [];
  for (let index = 0; index < slots; index += 1) {
    lines.push(`${padLine(left[index] ?? "", leftWidth)} │ ${fitLine(right[index] ?? "", rightWidth)}`);
  }
  return lines;
}

function planTargetLines(lines: string[], label: string, source: string, target: string, collision: boolean, width: number): void {
  lines.push(`${label}${collision ? " [collision / overwrite]" : ""}`);
  appendWrapped(lines, source, width, "  from: ");
  appendWrapped(lines, target, width, "  to:   ");
}

function reviewLines(state: SkillManagerReviewRenderState, width: number, color: boolean): string[] {
  const blocked = state.plans.filter((plan) => plan.blocked).length;
  const unchecked = state.acknowledgements.filter((entry) => !entry.checked).length;
  const readiness = blocked > 0
    ? paint(`✕ Blocked · ${blocked} selected agent${blocked === 1 ? "" : "s"} need attention`, colors.red, color)
    : unchecked > 0
      ? paint(`! ${unchecked} acknowledgement${unchecked === 1 ? "" : "s"} required before Run`, colors.yellow, color)
      : paint("✓ Ready to run", colors.green, color);
  const lines: string[] = [
    paint(`REVIEW ${actionLabel(state.action).toUpperCase()}`, colors.bold, color),
    `${state.items.length} item${state.items.length === 1 ? "" : "s"} · ${state.agents.length} target${state.agents.length === 1 ? "" : "s"} · ${state.scope}`,
    ...wrapText("! Runs sequentially. A failure stops later agents; completed agents are not rolled back.", width),
    readiness,
  ];

  if (state.error) {
    lines.push(paint(`✕ ${sanitize(state.error)}`, colors.red, color));
  }

  lines.push("");
  if (state.acknowledgements.length > 0) {
    const allChecked = state.acknowledgements.every((entry) => entry.checked);
    const counts = {
      overwrite: state.acknowledgements.filter((entry) => entry.id.startsWith("overwrite:")).length,
      modified: state.acknowledgements.filter((entry) => entry.id.startsWith("modified:")).length,
      legacy: state.acknowledgements.filter((entry) => entry.id.startsWith("legacy:")).length,
      removeModified: state.acknowledgements.filter((entry) => entry.id.startsWith("remove-modified:")).length,
      removeLegacy: state.acknowledgements.filter((entry) => entry.id.startsWith("remove-legacy:")).length,
    };
    const confirmationKinds = [
      counts.overwrite > 0 ? `${counts.overwrite} overwrite group${counts.overwrite === 1 ? "" : "s"}` : "",
      counts.modified > 0 ? `${counts.modified} modified replacement${counts.modified === 1 ? "" : "s"}` : "",
      counts.legacy > 0 ? `${counts.legacy} legacy replacement${counts.legacy === 1 ? "" : "s"}` : "",
      counts.removeModified > 0 ? `${counts.removeModified} modified removal${counts.removeModified === 1 ? "" : "s"}` : "",
      counts.removeLegacy > 0 ? `${counts.removeLegacy} legacy removal${counts.removeLegacy === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    lines.push(paint("CONFIRM", colors.bold, color));
    lines.push(`> [${allChecked ? "x" : " "}] Confirm all ${state.acknowledgements.length} required acknowledgement${state.acknowledgements.length === 1 ? "" : "s"}`);
    lines.push(...wrapText(confirmationKinds.join(" · "), width).map((line) => `  ${line}`));
  } else {
    lines.push(paint("✓ No additional confirmation required", colors.green, color));
  }

  lines.push("", paint("PLAN", colors.bold, color));
  for (const plan of state.plans) {
    const targets = [...(plan.installPlan?.skills ?? []), ...(plan.installPlan?.commands ?? [])];
    const collisions = targets.filter((target) => target.collision).length;
    const effects = [
      plan.active.length > 0 ? `${plan.active.length} item${plan.active.length === 1 ? "" : "s"}` : "no changes",
      targets.length > 0 ? `${targets.length} write${targets.length === 1 ? "" : "s"}` : "",
      collisions > 0 ? `${collisions} overwrite${collisions === 1 ? "" : "s"}` : "",
      plan.uninstallTargets.length > 0 ? `${plan.uninstallTargets.length} removal${plan.uninstallTargets.length === 1 ? "" : "s"}` : "",
      plan.skipped.length > 0 ? `${plan.skipped.length} skipped` : "",
    ].filter(Boolean);
    const marker = plan.blocked ? paint("✕", colors.red, color) : paint("✓", colors.green, color);
    lines.push(`${marker} ${plan.agent} · ${effects.join(" · ")}`);
    if (plan.blocked) {
      lines.push(...wrapText(`  ${sanitize(plan.blocked)}`, width));
    }
  }

  if (!state.showDetails) {
    lines.push("", paint("D", colors.cyan, color) + " Show exact paths, skips, and adapter warnings");
    return lines;
  }

  lines.push("", paint("EXACT DETAILS", colors.bold, color), "D Collapse details", "");
  if (state.acknowledgements.length > 0) {
    lines.push(paint("Required acknowledgements", colors.bold, color));
    for (const acknowledgement of state.acknowledgements) {
      appendWrapped(lines, acknowledgement.label, width, `  [${acknowledgement.checked ? "x" : " "}] `);
    }
    lines.push("");
  }

  for (const plan of state.plans) {
    lines.push(`${paint(`Agent ${plan.agent}`, colors.cyan, color)} · root`);
    appendWrapped(lines, plan.root, width, "  ");
    if (plan.blocked) {
      lines.push(`  BLOCKED: ${sanitize(plan.blocked)}`);
    }
    if (plan.action === "install" || plan.action === "update") {
      for (const target of [...(plan.installPlan?.skills ?? []), ...(plan.installPlan?.commands ?? [])]) {
        planTargetLines(lines, `  ${target.kind} ${target.name}`, target.source, target.target, target.collision, width);
      }
    }
    if (plan.action === "uninstall") {
      for (const target of plan.uninstallTargets) {
        appendWrapped(lines, target.target, width, `  remove ${target.kind} ${target.name}: `);
      }
    }
    if (plan.active.length === 0 && !plan.blocked) {
      lines.push("  Actions: none");
    } else if (plan.active.length > 0) {
      lines.push(`  Actions: ${plan.active.join(", ")}`);
    }
    if (plan.skipped.length > 0) {
      lines.push("  Skips:");
      for (const skipped of plan.skipped) {
        lines.push(`  - ${skipped.item}: ${sanitize(skipped.reason)}`);
      }
    }
    for (const warning of plan.warnings) {
      lines.push(`  Warning: ${sanitize(warning)}`);
    }
    lines.push("");
  }
  return lines;
}

function resultLines(state: SkillManagerResultRenderState, width: number, color: boolean): string[] {
  const lines: string[] = [
    paint(`${actionLabel(state.action).toUpperCase()} RESULT`, colors.bold, color),
    formatStatus(state.aggregateStatus, color),
    ...wrapText("Execution was sequential; after a failure, later agents were not attempted.", width),
    "",
  ];

  for (const result of state.results) {
    lines.push(`${paint(result.agent, colors.cyan, color)} · ${formatStatus(result.status, color)}`);
    if (result.installed && result.installed.length > 0) {
      lines.push(`  Installed: ${result.installed.join(", ")}`);
    }
    if (result.uninstalled && result.uninstalled.length > 0) {
      lines.push(`  Removed: ${result.uninstalled.join(", ")}`);
    }
    if (result.skipped && result.skipped.length > 0) {
      lines.push(`  Skipped: ${result.skipped.join(", ")}`);
    }
    if (result.error) {
      lines.push(`  Error: ${sanitize(result.error)}`);
    }
    if (result.receiptPath) {
      appendWrapped(lines, result.receiptPath, width, "  Receipt: ");
    }
    if (result.receiptEvidence) {
      lines.push(`  Receipt evidence: ${sanitize(result.receiptEvidence)}`);
    }
    lines.push("");
  }
  return lines;
}

function footer(step: TuiStep, state: SkillManagerRenderState): string {
  if (state.tooSmall) {
    return "Resize terminal to continue · Ctrl+C exit";
  }
  switch (step) {
    case "target":
      return "↑↓ Move · Space Select · Enter Next · Esc Exit · Ctrl+C Exit";
    case "action":
      return "↑↓ Move · Enter Select · Esc Back · Ctrl+C Exit";
    case "skills":
      return state.skills?.searchMode
        ? "Type Filter · Backspace Edit · Enter Apply · Esc Clear · Ctrl+C Exit"
        : state.skills?.action === "inspect"
          ? "↑↓ Move · Space Mark · / Filter · Enter Detail · Esc Back · Ctrl+C Exit"
          : "↑↓ Move · Space Mark · / Filter · Enter Review · Esc Back · Ctrl+C Exit";
    case "review":
      return "↑↓ Scroll · Space Confirm all · D Details · Enter Run · Esc Back · Ctrl+C Exit";
    case "result":
      return "↑↓ Scroll · Enter Actions · Esc Targets · Ctrl+C Exit";
  }
}

function scrollLines(lines: readonly string[], slots: number, offset: number): string[] {
  const safeSlots = Math.max(1, slots);
  if (lines.length <= safeSlots) {
    return [...lines];
  }
  const maxOffset = Math.max(0, lines.length - safeSlots);
  const start = Math.max(0, Math.min(maxOffset, offset));
  return lines.slice(start, start + safeSlots);
}

function renderNewFrame(state: SkillManagerRenderState, size: TerminalSize, color: boolean): string {
  const width = Math.max(1, Math.floor(size.columns));
  const rows = Math.max(1, Math.floor(size.rows));
  if (!hasSufficientTerminalSize(size)) {
    const paused = [
      paint("MAHIRO TUI PAUSED", colors.yellow, color),
      `Size: ${width}x${rows}`,
      "Required minimum:",
      "72x18",
      "Resize to resume. Navigation and filesystem writes are blocked.",
      "Ctrl+C exits.",
    ];
    return paused.map((line) => fitLine(line, width)).join("\n");
  }

  const step = state.step ?? "skills";
  const header = headerLines(state, width, color);
  const footerLines = [horizontal(width), footer(step, state)];
  const bodySlots = Math.max(1, rows - header.length - footerLines.length);
  let body: string[];

  if (step === "target" && state.target) {
    body = targetLines(state.target, width, color);
  } else if (step === "action" && state.action) {
    body = actionLines(state.action, width, color);
  } else if (step === "skills" && state.skills) {
    body = skillsPaneLines(state.skills, width, bodySlots, color);
  } else if (step === "review" && state.review) {
    body = reviewLines(state.review, width, color);
  } else if (step === "result" && state.result) {
    body = resultLines(state.result, width, color);
  } else {
    body = ["No view state available."];
  }

  const offset = step === "review"
    ? state.review?.scrollOffset ?? 0
    : step === "result"
      ? state.result?.scrollOffset ?? 0
      : 0;
  const renderedBody = scrollLines(body, bodySlots, offset);
  const lines = [...header, ...renderedBody, ...footerLines];
  return lines.slice(0, rows).map((line) => fitLine(line, width)).join("\n");
}

function legacyLines(state: SkillManagerRenderState, size: TerminalSize, color: boolean): string {
  const snapshot = state.snapshot;
  if (!snapshot) {
    return renderNewFrame(state, size, color);
  }
  const width = Math.max(1, Math.floor(size.columns));
  const rows = Math.max(1, Math.floor(size.rows));
  const query = state.query ?? "";
  const filtered = filterSkillManagerItems(snapshot.skills, query);
  const selectedIndex = filtered.length === 0 ? -1 : Math.max(0, Math.min(state.selectedIndex ?? 0, filtered.length - 1));
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : undefined;
  const staged = new Set(state.staged ?? []);
  const lines = [
    `${paint("MAHIRO", colors.cyan, color)} ${paint("SKILL MANAGER", colors.bold, color)}`,
    `Agent: ${snapshot.agent}   Scope: ${snapshot.scope}   Root: ${sanitize(snapshot.root)}`,
    `Search: ${query || "(all skills)"}   Selected: ${selected?.name ?? "none"}   Staged: ${staged.size}`,
    state.busy ? "Working..." : state.message ? `${state.message.kind}: ${state.message.text}` : "",
    horizontal(width),
    paint(`CATALOG (${filtered.length}/${snapshot.skills.length})`, colors.bold, color),
    ...filtered.slice(0, Math.max(1, rows - 9)).map((item, index) => `${index === selectedIndex ? ">" : " "} ${staged.has(item.name) ? "*" : " "} ${item.name} ${formatStatus(item.status, color)}`),
    "",
    "DETAIL",
    selected ? `Status: ${formatStatus(selected.status, color)}` : "Choose a skill from the catalog.",
    horizontal(width),
    state.confirmation ? `Confirm ${actionLabel(state.confirmation.action)} · y confirm · n/Esc cancel` : "↑/↓ move · Space stage · Enter next · Esc back · Ctrl+C exit",
  ];
  return lines.slice(0, rows).map((line) => fitLine(line, width)).join("\n");
}

export function filterSkillManagerItems(items: readonly SkillManagerItem[], query: string): SkillManagerItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...items];
  }

  const terms = normalized.split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function renderSkillManagerFrame(
  state: SkillManagerRenderState,
  size: TerminalSize,
  options: SkillManagerRenderOptions = {},
): string {
  const color = options.color ?? true;
  if (state.step === undefined && state.snapshot) {
    return legacyLines(state, size, color);
  }
  return renderNewFrame(state, size, color);
}

export const renderSkillManager = renderSkillManagerFrame;
