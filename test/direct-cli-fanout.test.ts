import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { findStandalonePython } from "./helpers/python";

const helper = join(import.meta.dir, "..", "skills", "direct-cli", "scripts", "prompt-fanout.py");
const tempDirs: string[] = [];

function makeHarness() {
  const root = mkdtempSync(join(tmpdir(), "direct-cli-fanout-"));
  const binDir = join(root, "bin");
  const stateDir = join(root, "state");
  mkdirSync(binDir);
  mkdirSync(stateDir);
  tempDirs.push(root);

  const herdr = join(binDir, "herdr");
  writeFileSync(
    herdr,
    `#!/bin/sh
set -u
state_file="$FAKE_STATE_DIR/$3.state"
case "$1:$2" in
  agent:get)
    read status sequence < "$state_file"
    printf '{"result":{"agent":{"agent_status":"%s","state_change_seq":%s}}}\\n' "$status" "$sequence"
    ;;
  agent:prompt)
    printf '%s' "$4" > "$FAKE_STATE_DIR/$3.prompt"
    if [ "\${FAKE_STALL:-false}" != "true" ]; then
      printf 'working 2\\n' > "$state_file"
    fi
    printf '{"result":{"type":"agent_prompted"}}\\n'
    ;;
  agent:wait)
    printf 'done 3\\n' > "$state_file"
    printf '{"result":{"type":"agent_info"}}\\n'
    ;;
  *)
    exit 2
    ;;
esac
`,
  );
  chmodSync(herdr, 0o755);

  return { binDir, root, stateDir };
}

function runHelper(
  harness: ReturnType<typeof makeHarness>,
  promptFile: string,
  targets: string[],
  env: Record<string, string> = {},
) {
  const result = Bun.spawnSync({
    cmd: [findStandalonePython(), helper, "--prompt-file", promptFile, "--activity-timeout", "0.5", ...targets],
    env: {
      FAKE_STATE_DIR: harness.stateDir,
      PATH: harness.binDir,
      ...env,
    },
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    stderr: result.stderr.toString(),
    stdout: result.stdout.toString(),
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { force: true, recursive: true });
  }
});

describe("direct-cli Herdr prompt fanout", () => {
  test("submits identical prompt text and waits only after activity transitions", () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "review.prompt.txt");
    const prompt = "- review the full diff\n- do not edit\n";
    writeFileSync(promptFile, prompt);
    writeFileSync(join(harness.stateDir, "agent-a.state"), "idle 1\n");
    writeFileSync(join(harness.stateDir, "agent-b.state"), "idle 1\n");

    const result = runHelper(harness, promptFile, ["agent-a", "agent-b"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("target=agent-a status=settled");
    expect(result.stdout).toContain("target=agent-b status=settled");
    expect(readFileSync(join(harness.stateDir, "agent-a.prompt"), "utf8")).toBe(prompt);
    expect(readFileSync(join(harness.stateDir, "agent-b.prompt"), "utf8")).toBe(prompt);
    expect(readFileSync(join(harness.stateDir, "agent-a.state"), "utf8")).toBe("done 3\n");
    expect(readFileSync(join(harness.stateDir, "agent-b.state"), "utf8")).toBe("done 3\n");
  });

  test("fails with an actionable message when a prompt never starts", () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "review.prompt.txt");
    writeFileSync(promptFile, "review only\n");
    writeFileSync(join(harness.stateDir, "agent-a.state"), "idle 1\n");

    const result = runHelper(harness, promptFile, ["agent-a"], {
      FAKE_STALL: "true",
    });

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain("no activity transition observed");
    expect(result.stderr).toContain("submit one Enter only if the prompt is visibly unsent");
    expect(readFileSync(join(harness.stateDir, "agent-a.state"), "utf8")).toBe("idle 1\n");
  });
});
