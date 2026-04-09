import { confirm as clackConfirm, isCancel, multiselect as clackMultiselect, note as clackNote, select as clackSelect } from "@clack/prompts";
import type { Option as ClackOption } from "@clack/prompts";
import type { Readable, Writable } from "stream";

interface TtyLike {
  isTTY?: boolean;
}

export interface PromptIO {
  isInteractive: boolean;
  write(message: string): void;
  note(message: string, title?: string): void;
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

function unwrapPromptValue<T>(value: T | symbol, cancelMessage: string): T {
  if (isCancel(value)) {
    throw new Error(cancelMessage);
  }

  return value;
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
    async select<T extends string>(label: string, options: readonly PromptOption<T>[]) {
      if (!isInteractive) {
        throw new Error("Interactive prompt unavailable.");
      }

      return unwrapPromptValue(
        await clackSelect({
          message: label,
          options: options.map(toClackOption),
        }),
        "Guided TUI cancelled.",
      );
    },
    async multiselect<T extends string>(label: string, options: readonly PromptOption<T>[]) {
      if (!isInteractive) {
        throw new Error("Interactive prompt unavailable.");
      }

      return unwrapPromptValue(
        await clackMultiselect({
          message: label,
          options: options.map(toClackOption),
          required: true,
        }),
        "Guided TUI cancelled.",
      );
    },
    async confirm(question: string) {
      if (!isInteractive) {
        throw new Error("Interactive prompt unavailable.");
      }

      return unwrapPromptValue(await clackConfirm({ message: question }), "Guided TUI cancelled.");
    },
    close() {
      return;
    },
  };
}
