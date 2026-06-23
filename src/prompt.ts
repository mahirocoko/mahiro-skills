import { ConfirmPrompt, isCancel, MultiSelectPrompt, SelectPrompt } from "@clack/core";
import { cancel as clackCancel, note as clackNote, outro as clackOutro } from "@clack/prompts";
import type { Option as ClackOption } from "@clack/prompts";
import type { Readable, Writable } from "stream";


interface TtyLike {
  isTTY?: boolean;
}

export interface PromptIO {
  isInteractive: boolean;
  write(message: string): void;
  note(message: string, title?: string): void;
  cancel(message: string): void;
  outro(message: string): void;
  select<T extends string>(label: string, options: readonly PromptOption<T>[]): Promise<T>;
  multiselect<T extends string>(label: string, options: readonly PromptOption<T>[]): Promise<T[]>;
  confirm(question: string): Promise<boolean>;
  close(): void;
}

export interface PromptOption<T extends string> {
  label: string;
  value: T;
  hint?: string;
}

export class PromptCancelError extends Error {
  constructor(message = "Guided TUI cancelled.") {
    super(message);
    this.name = "PromptCancelError";
  }
}

export function isPromptCancelError(error: unknown): error is PromptCancelError {
  return error instanceof PromptCancelError;
}

function toClackOption<T extends string>(option: PromptOption<T>): ClackOption<T> {
  if (option.hint) {
    return {
      value: option.value,
      label: option.label,
      hint: option.hint,
    } as ClackOption<T>;
  }

  return {
    value: option.value,
    label: option.label,
  } as ClackOption<T>;
}

function unwrapPromptValue<T>(value: T | symbol, cancelMessage: string, onCancel: () => void): T {
  if (isCancel(value)) {
    onCancel();
    throw new PromptCancelError(cancelMessage);
  }

  return value;
}

const ansi = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  strike: "\x1b[9m",
};

function color(code: string, value: string): string {
  return `${code}${value}${ansi.reset}`;
}

function dim(value: string): string {
  return color(ansi.dim, value);
}

function gray(value: string): string {
  return color(ansi.gray, value);
}

function cyan(value: string): string {
  return color(ansi.cyan, value);
}

function green(value: string): string {
  return color(ansi.green, value);
}

function yellow(value: string): string {
  return color(ansi.yellow, value);
}

function red(value: string): string {
  return color(ansi.red, value);
}

function strike(value: string): string {
  return color(ansi.strike, value);
}

const line = "│";
const endLine = "└";
const activeIcon = "●";
const inactiveIcon = "○";
const checkedIcon = "◼";
const uncheckedIcon = "◻";

function stateIcon(state: string): string {
  switch (state) {
    case "cancel":
      return red("■");
    case "error":
      return yellow("▲");
    case "submit":
      return green("◇");
    default:
      return cyan("◆");
  }
}

function promptHeader(state: string, message: string): string {
  return `${gray(line)}\n${stateIcon(state)}  ${message}\n`;
}

function footer(message: string): string {
  return `${cyan(endLine)}  ${dim(message)}\n`;
}

function visibleOptions<T>(options: readonly T[], cursor: number, maxItems?: number): { item: T; index: number; clipped: "start" | "end" | null }[] {
  const terminalRows = process.stdout.rows || 24;
  const windowSize = Math.max(5, Math.min(maxItems ?? terminalRows - 7, options.length));

  if (options.length <= windowSize) {
    return options.map((item, index) => ({ item, index, clipped: null }));
  }

  let start = Math.max(0, cursor - Math.floor(windowSize / 2));
  start = Math.min(start, options.length - windowSize);
  const rows = options.slice(start, start + windowSize).map((item, offset) => ({ item, index: start + offset, clipped: null as "start" | "end" | null }));

  if (start > 0 && rows[0]) {
    rows[0].clipped = "start";
  }

  if (start + windowSize < options.length && rows[rows.length - 1]) {
    rows[rows.length - 1].clipped = "end";
  }

  return rows;
}

function optionLabel<T extends string>(option: PromptOption<T>): string {
  return option.label || option.value;
}

function renderSelectOption<T extends string>(option: PromptOption<T>, state: "active" | "inactive" | "selected" | "cancelled"): string {
  const label = optionLabel(option);

  if (state === "selected") {
    return dim(label);
  }

  if (state === "cancelled") {
    return strike(dim(label));
  }

  if (state === "active") {
    return `${green(activeIcon)} ${label}${option.hint ? ` ${dim(`(${option.hint})`)}` : ""}`;
  }

  return `${dim(inactiveIcon)} ${dim(label)}`;
}

function renderMultiOption<T extends string>(option: PromptOption<T>, state: "active" | "inactive" | "selected" | "active-selected" | "submitted" | "cancelled"): string {
  const label = optionLabel(option);

  if (state === "submitted") {
    return dim(label);
  }

  if (state === "cancelled") {
    return strike(dim(label));
  }

  if (state === "active-selected") {
    return `${green(checkedIcon)} ${label}${option.hint ? ` ${dim(`(${option.hint})`)}` : ""}`;
  }

  if (state === "selected") {
    return `${green(checkedIcon)} ${dim(label)}${option.hint ? ` ${dim(`(${option.hint})`)}` : ""}`;
  }

  if (state === "active") {
    return `${cyan(uncheckedIcon)} ${label}${option.hint ? ` ${dim(`(${option.hint})`)}` : ""}`;
  }

  return `${dim(uncheckedIcon)} ${dim(label)}`;
}

async function selectWithFooter<T extends string>(label: string, options: readonly PromptOption<T>[], input: Readable, output: Writable): Promise<T | symbol> {
  return new SelectPrompt<PromptOption<T>>({
    input,
    output,
    options: options.map(toClackOption) as PromptOption<T>[],
    render() {
      const header = promptHeader(this.state, label);

      switch (this.state) {
        case "submit":
          return `${header}${gray(line)}  ${renderSelectOption(this.options[this.cursor], "selected")}`;
        case "cancel":
          return `${header}${gray(line)}  ${renderSelectOption(this.options[this.cursor], "cancelled")}\n${gray(line)}`;
        default:
          return `${header}${cyan(line)}  ${visibleOptions(this.options, this.cursor).map(({ item, index, clipped }) => {
            if (clipped) {
              return dim("...");
            }

            return renderSelectOption(item, index === this.cursor ? "active" : "inactive");
          }).join(`\n${cyan(line)}  `)}\n${footer("↑/↓ move · Enter select · Esc/Ctrl+C cancel")}`;
      }
    },
  }).prompt() as Promise<T | symbol>;
}

async function multiselectWithFooter<T extends string>(label: string, options: readonly PromptOption<T>[], input: Readable, output: Writable): Promise<T[] | symbol> {
  return new MultiSelectPrompt<PromptOption<T>>({
    input,
    output,
    options: options.map(toClackOption) as PromptOption<T>[],
    required: true,
    validate(value) {
      if (value.length === 0) {
        return "Please select at least one option.";
      }
    },
    render() {
      const header = promptHeader(this.state, label);
      const isSelected = (option: PromptOption<T>) => this.value.includes(option.value);

      switch (this.state) {
        case "submit": {
          const selected = this.options.filter(isSelected).map((option) => renderMultiOption(option, "submitted")).join(dim(", ")) || dim("none");
          return `${header}${gray(line)}  ${selected}`;
        }
        case "cancel": {
          const selected = this.options.filter(isSelected).map((option) => renderMultiOption(option, "cancelled")).join(dim(", "));
          return `${header}${gray(line)}  ${selected ? `${selected}\n${gray(line)}` : ""}`;
        }
        case "error":
          return `${header}${yellow(line)}  ${visibleOptions(this.options, this.cursor).map(({ item, index, clipped }) => {
            if (clipped) {
              return dim("...");
            }

            const selected = isSelected(item);
            const active = index === this.cursor;
            return renderMultiOption(item, active && selected ? "active-selected" : selected ? "selected" : active ? "active" : "inactive");
          }).join(`\n${yellow(line)}  `)}\n${yellow(endLine)}  ${yellow(this.error)}\n`;
        default:
          return `${header}${cyan(line)}  ${visibleOptions(this.options, this.cursor).map(({ item, index, clipped }) => {
            if (clipped) {
              return dim("...");
            }

            const selected = isSelected(item);
            const active = index === this.cursor;
            return renderMultiOption(item, active && selected ? "active-selected" : selected ? "selected" : active ? "active" : "inactive");
          }).join(`\n${cyan(line)}  `)}\n${footer("↑/↓ move · Space toggle · Enter submit · Esc/Ctrl+C cancel")}`;
      }
    },
  }).prompt() as Promise<T[] | symbol>;
}

async function confirmWithFooter(question: string, input: Readable, output: Writable): Promise<boolean | symbol> {
  return new ConfirmPrompt({
    input,
    output,
    active: "Yes",
    inactive: "No",
    render() {
      const header = promptHeader(this.state, question);
      const yes = this.value ? `${green(activeIcon)} Yes` : `${dim(inactiveIcon)} ${dim("Yes")}`;
      const no = this.value ? `${dim(inactiveIcon)} ${dim("No")}` : `${green(activeIcon)} No`;

      switch (this.state) {
        case "submit":
          return `${header}${gray(line)}  ${dim(this.value ? "Yes" : "No")}`;
        case "cancel":
          return `${header}${gray(line)}  ${strike(dim(this.value ? "Yes" : "No"))}\n${gray(line)}`;
        default:
          return `${header}${cyan(line)}  ${yes} ${dim("/")} ${no}\n${footer("←/→ switch · Enter confirm · Esc/Ctrl+C cancel")}`;
      }
    },
  }).prompt() as Promise<boolean | symbol>;
}

export function createPromptIO(input = process.stdin as Readable, output = process.stdout as Writable): PromptIO {
  const inputTty = input as Readable & TtyLike;
  const outputTty = output as Writable & TtyLike;
  const isInteractive = Boolean(inputTty.isTTY && outputTty.isTTY);

  return {
    isInteractive,
    write(message: string) {
      output.write(message);
    },
    note(message: string, title?: string) {
      if (isInteractive) {
        clackNote(message, title);
        return;
      }

      output.write(title ? `${title}\n${message}\n` : `${message}\n`);
    },
    cancel(message: string) {
      if (isInteractive) {
        clackCancel(message);
        return;
      }

      output.write(`${message}\n`);
    },
    outro(message: string) {
      if (isInteractive) {
        clackOutro(message);
        return;
      }

      output.write(`${message}\n`);
    },
    async select<T extends string>(label: string, options: readonly PromptOption<T>[]) {
      if (!isInteractive) {
        throw new Error("Interactive prompt unavailable.");
      }

      return unwrapPromptValue(
        await selectWithFooter(label, options, input, output),
        "Guided TUI cancelled.",
        () => clackCancel("Guided TUI cancelled."),
      );
    },
    async multiselect<T extends string>(label: string, options: readonly PromptOption<T>[]) {
      if (!isInteractive) {
        throw new Error("Interactive prompt unavailable.");
      }

      return unwrapPromptValue(
        await multiselectWithFooter(label, options, input, output),
        "Guided TUI cancelled.",
        () => clackCancel("Guided TUI cancelled."),
      );
    },
    async confirm(question: string) {
      if (!isInteractive) {
        throw new Error("Interactive prompt unavailable.");
      }

      return unwrapPromptValue(await confirmWithFooter(question, input, output), "Guided TUI cancelled.", () => clackCancel("Guided TUI cancelled."));
    },
    close() {
      return;
    },
  };
}
