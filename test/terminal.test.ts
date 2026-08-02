import { describe, expect, test } from "bun:test";
import { PassThrough, Writable } from "stream";

import { canUseFullScreenTerminal, createTerminal, hasSufficientTerminalSize, type TerminalInput, type TerminalOutput } from "../src/terminal";

function makeOutput(chunks: string[]) {
  const output = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  }) as Writable & TerminalOutput;
  output.isTTY = true;
  output.columns = 80;
  output.rows = 24;
  return output;
}

describe("terminal lifecycle", () => {
  test("enters and leaves the alternate screen while restoring raw mode", () => {
    const chunks: string[] = [];
    const input = new PassThrough() as PassThrough & TerminalInput;
    const rawModes: boolean[] = [];
    input.isTTY = true;
    input.isRaw = false;
    input.setRawMode = (enabled) => {
      rawModes.push(enabled);
      input.isRaw = enabled;
    };
    const terminal = createTerminal(input, makeOutput(chunks), { color: false });

    terminal.enterAlternateScreen();
    terminal.enterAlternateScreen();
    terminal.close();
    terminal.close();

    const output = chunks.join("");
    expect(output).toContain("\x1b[?1049h");
    expect(output).toContain("\x1b[?25l");
    expect(output).toContain("\x1b[?25h");
    expect(output).toContain("\x1b[?1049l");
    expect(rawModes).toEqual([true, false]);
    expect(input.isRaw).toBe(false);
    expect(input.isPaused()).toBe(true);
  });

  test("restores an already-raw input and exposes dimensions and size gate", () => {
    const input = new PassThrough() as PassThrough & TerminalInput;
    const rawModes: boolean[] = [];
    input.isTTY = true;
    input.isRaw = true;
    input.setRawMode = (enabled) => {
      rawModes.push(enabled);
      input.isRaw = enabled;
    };
    const terminal = createTerminal(input, makeOutput([]));

    expect(terminal.getSize()).toEqual({ columns: 80, rows: 24 });
    expect(hasSufficientTerminalSize({ columns: 72, rows: 18 })).toBe(true);
    expect(hasSufficientTerminalSize({ columns: 71, rows: 18 })).toBe(false);
    expect(hasSufficientTerminalSize({ columns: 72, rows: 17 })).toBe(false);
    expect(canUseFullScreenTerminal(terminal, { TERM: "xterm-256color" })).toBe(true);
    expect(canUseFullScreenTerminal(terminal, { TERM: "dumb" })).toBe(false);

    terminal.enterAlternateScreen();
    terminal.close();
    expect(rawModes).toEqual([true, true]);
    expect(input.isRaw).toBe(true);
    expect(input.isPaused()).toBe(true);
  });

  test("subscribes and unsubscribes resize handlers", () => {
    const input = new PassThrough() as PassThrough & TerminalInput;
    input.isTTY = true;
    const output = makeOutput([]);
    const terminal = createTerminal(input, output, { color: false });
    const sizes: { columns: number; rows: number }[] = [];
    const unsubscribe = terminal.onResize((size) => sizes.push(size));

    output.columns = 96;
    output.rows = 32;
    output.emit("resize");
    unsubscribe();
    output.columns = 120;
    output.emit("resize");

    expect(sizes).toEqual([{ columns: 96, rows: 32 }]);
  });
});
