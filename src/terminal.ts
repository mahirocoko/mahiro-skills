import type { Readable, Writable } from "stream";

export interface TerminalSize {
  columns: number;
  rows: number;
}

export type TerminalData = string | Uint8Array;
export type TerminalDataHandler = (data: TerminalData) => void;
export type TerminalResizeHandler = (size: TerminalSize) => void;

export interface TerminalInput extends Readable {
  isTTY?: boolean;
  isRaw?: boolean;
  setRawMode?: (mode: boolean) => unknown;
}

export interface TerminalOutput extends Writable {
  isTTY?: boolean;
  columns?: number;
  rows?: number;
}

export interface CreateTerminalOptions {
  env?: NodeJS.ProcessEnv;
  size?: Partial<TerminalSize>;
  color?: boolean;
}

export interface Terminal {
  readonly input: TerminalInput;
  readonly output: TerminalOutput;
  readonly isInteractive: boolean;
  readonly colorEnabled: boolean;
  getSize(): TerminalSize;
  write(message: string): void;
  onData(handler: TerminalDataHandler): () => void;
  onResize(handler: TerminalResizeHandler): () => void;
  setRawMode(enabled: boolean): void;
  enterAlternateScreen(): void;
  leaveAlternateScreen(): void;
  hideCursor(): void;
  showCursor(): void;
  close(): void;
}

export const MIN_TUI_COLUMNS = 72;
export const MIN_TUI_ROWS = 18;

export function isTerminalInteractive(input: Pick<TerminalInput, "isTTY">, output: Pick<TerminalOutput, "isTTY">): boolean {
  return Boolean(input.isTTY && output.isTTY);
}

export function hasSufficientTerminalSize(size: TerminalSize, minimum: TerminalSize = {
  columns: MIN_TUI_COLUMNS,
  rows: MIN_TUI_ROWS,
}): boolean {
  return size.columns >= minimum.columns && size.rows >= minimum.rows;
}

export function canUseFullScreenTerminal(terminal: Pick<Terminal, "isInteractive" | "getSize">, env = process.env): boolean {
  return terminal.isInteractive && env.TERM !== "dumb" && hasSufficientTerminalSize(terminal.getSize());
}

function terminalColorEnabled(output: TerminalOutput, env: NodeJS.ProcessEnv, explicitColor: boolean | undefined): boolean {
  if (explicitColor !== undefined) {
    return explicitColor;
  }

  if (output.isTTY === false || env.NO_COLOR !== undefined || env.TERM === "dumb") {
    return false;
  }

  return true;
}

function positiveSize(value: number | undefined, fallback: number): number {
  return value && value > 0 ? Math.floor(value) : fallback;
}

export function createTerminal(
  input = process.stdin as TerminalInput,
  output = process.stdout as TerminalOutput,
  options: CreateTerminalOptions = {},
): Terminal {
  const env = options.env ?? process.env;
  const isInteractive = isTerminalInteractive(input, output);
  const colorEnabled = terminalColorEnabled(output, env, options.color);
  let alternateScreen = false;
  let cursorHidden = false;
  let rawModeChanged = false;
  let previousRawMode = false;
  let inputWasFlowing = false;
  let inputResumed = false;
  let closed = false;

  const getSize = (): TerminalSize => ({
    columns: positiveSize(options.size?.columns ?? output.columns, 80),
    rows: positiveSize(options.size?.rows ?? output.rows, 24),
  });

  const write = (message: string): void => {
    output.write(message);
  };

  const setRawMode = (enabled: boolean): void => {
    if (typeof input.setRawMode === "function") {
      input.setRawMode(enabled);
    }
  };

  const hideCursor = (): void => {
    if (cursorHidden) {
      return;
    }

    write("\x1b[?25l");
    cursorHidden = true;
  };

  const showCursor = (): void => {
    if (!cursorHidden) {
      return;
    }

    write("\x1b[?25h");
    cursorHidden = false;
  };

  const enterAlternateScreen = (): void => {
    if (closed || alternateScreen) {
      return;
    }

    previousRawMode = input.isRaw === true;
    inputWasFlowing = input.readableFlowing === true;
    if (typeof input.setRawMode === "function") {
      rawModeChanged = true;
      input.setRawMode(true);
      if (typeof input.resume === "function") {
        input.resume();
        inputResumed = true;
      }
    }

    alternateScreen = true;
    write("\x1b[?1049h\x1b[2J\x1b[H");
    hideCursor();
  };

  const leaveAlternateScreen = (): void => {
    if (!alternateScreen && !cursorHidden && !rawModeChanged) {
      return;
    }

    let firstError: unknown;

    try {
      showCursor();
    } catch (error) {
      firstError = error;
    } finally {
      try {
        if (alternateScreen) {
          write("\x1b[?1049l");
        }
      } catch (error) {
        firstError ??= error;
      } finally {
        try {
          if (rawModeChanged) {
            setRawMode(previousRawMode);
          }
        } catch (error) {
          firstError ??= error;
        } finally {
          try {
            if (inputResumed && !inputWasFlowing && typeof input.pause === "function") {
              input.pause();
            }
          } catch (error) {
            firstError ??= error;
          } finally {
            alternateScreen = false;
            cursorHidden = false;
            rawModeChanged = false;
            inputWasFlowing = false;
            inputResumed = false;
          }
        }
      }
    }

    if (firstError !== undefined) {
      throw firstError;
    }
  };

  const onData = (handler: TerminalDataHandler): (() => void) => {
    const listener = (data: string | Uint8Array): void => {
      handler(data);
    };

    input.on("data", listener as (...args: unknown[]) => void);
    return () => {
      if (typeof input.off === "function") {
        input.off("data", listener as (...args: unknown[]) => void);
        return;
      }

      input.removeListener("data", listener as (...args: unknown[]) => void);
    };
  };

  const onResize = (handler: TerminalResizeHandler): (() => void) => {
    const listener = (): void => {
      handler(getSize());
    };

    output.on("resize", listener);
    return () => {
      if (typeof output.off === "function") {
        output.off("resize", listener);
        return;
      }

      output.removeListener("resize", listener);
    };
  };

  const close = (): void => {
    if (closed) {
      return;
    }

    closed = true;
    leaveAlternateScreen();
  };

  return {
    input,
    output,
    isInteractive,
    colorEnabled,
    getSize,
    write,
    onData,
    onResize,
    setRawMode,
    enterAlternateScreen,
    leaveAlternateScreen,
    hideCursor,
    showCursor,
    close,
  };
}
