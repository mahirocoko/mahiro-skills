import { createInterface } from "readline/promises";
import type { Readable, Writable } from "stream";

interface TtyLike {
  isTTY?: boolean;
}

export interface PromptIO {
  isInteractive: boolean;
  write(message: string): void;
  ask(question: string): Promise<string>;
  close(): void;
}

export function createPromptIO(input = process.stdin as Readable, output = process.stdout as Writable): PromptIO {
  const readline = createInterface({ input, output });
  const inputTty = input as Readable & TtyLike;
  const outputTty = output as Writable & TtyLike;

  return {
    isInteractive: Boolean(inputTty.isTTY && outputTty.isTTY),
    write(message: string) {
      output.write(message);
    },
    async ask(question: string) {
      const answer = await readline.question(question);
      return answer.trim();
    },
    close() {
      readline.close();
    },
  };
}
