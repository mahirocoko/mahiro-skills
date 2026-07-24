import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { findStandalonePython } from "./helpers/python";

const helper = join(import.meta.dir, "..", "skills", "direct-cli", "scripts", "herdr-jobs.py");
const tempDirs: string[] = [];

function makeHarness() {
  const root = mkdtempSync(join(tmpdir(), "direct-cli-detach-"));
  const binDir = join(root, "bin");
  const agentStateDir = join(root, "agent-state");
  const jobStateDir = join(root, "jobs");
  mkdirSync(binDir);
  mkdirSync(agentStateDir);
  mkdirSync(jobStateDir);
  chmodSync(jobStateDir, 0o755);
  tempDirs.push(root);

  const herdr = join(binDir, "herdr");
  writeFileSync(
    herdr,
    `#!/bin/sh
set -u
state_file="$FAKE_AGENT_STATE_DIR/$3.state"
case "$1:$2" in
  agent:get)
    read status sequence < "$state_file"
    printf '{"result":{"agent":{"agent_status":"%s","state_change_seq":%s}}}\\n' "$status" "$sequence"
    ;;
  agent:prompt)
    if [ "\${FAKE_PROMPT_HANG:-false}" = "true" ]; then
      /bin/sleep 1
    fi
    if [ "\${FAKE_PROMPT_FAIL:-false}" = "true" ]; then
      exit 9
    fi
    printf '%s' "$4" > "$FAKE_AGENT_STATE_DIR/$3.prompt"
    if [ "\${FAKE_STALL:-false}" != "true" ]; then
      printf 'working 2\\n' > "$state_file"
    fi
    printf '{"result":{"type":"agent_prompted"}}\\n'
    ;;
  agent:wait)
    /bin/sleep 0.1
    printf 'done 3\\n' > "$state_file"
    printf '{"result":{"type":"agent_info"}}\\n'
    ;;
  agent:read)
    printf 'RESULT:%s\\n' "$3"
    ;;
  *)
    exit 2
    ;;
esac
`,
  );
  chmodSync(herdr, 0o755);

  return { agentStateDir, binDir, jobStateDir, root };
}

function runHelper(
  harness: ReturnType<typeof makeHarness>,
  args: string[],
  env: Record<string, string> = {},
) {
  const result = Bun.spawnSync({
    cmd: [findStandalonePython(), helper, ...args],
    env: {
      FAKE_AGENT_STATE_DIR: harness.agentStateDir,
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

async function waitForStatus(jobJson: string, expected: string, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let lastPayload: Record<string, unknown> | null = null;
  while (Date.now() < deadline) {
    try {
      const payload = JSON.parse(readFileSync(jobJson, "utf8"));
      lastPayload = payload;
      if (payload.status === expected) {
        return payload;
      }
      if (["attention", "done", "error"].includes(payload.status)) {
        throw new Error(`job reached ${payload.status}: ${payload.summary ?? ""}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("job reached")) {
        throw error;
      }
      // The detached watcher may be between atomic snapshots.
    }
    await Bun.sleep(25);
  }
  const watcherLog = join(jobJson, "..", "watcher.log");
  let log = "";
  try {
    log = readFileSync(watcherLog, "utf8");
  } catch {
    // Keep timeout diagnostics bounded when the watcher never created its log.
  }
  throw new Error(`timed out waiting for ${expected}; last=${JSON.stringify(lastPayload)}; log=${log}`);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { force: true, recursive: true });
  }
});

describe("direct-cli detached Herdr jobs", () => {
  test("returns after dispatch, captures results, lists, and collects durably", async () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "review.prompt.txt");
    const prompt = "Review this diff without edits.\n";
    writeFileSync(promptFile, prompt);
    writeFileSync(join(harness.agentStateDir, "agent-a.state"), "idle 1\n");
    writeFileSync(join(harness.agentStateDir, "agent-b.state"), "idle 1\n");

    const start = runHelper(harness, [
      "start",
      "--job-id",
      "review-job",
      "--prompt-file",
      promptFile,
      "--cwd",
      harness.root,
      "--tab-id",
      "w1:t1",
      "--state-dir",
      harness.jobStateDir,
      "--activity-timeout",
      "1",
      "--settle-timeout-ms",
      "5000",
      "--no-notify",
      "agent-a",
      "agent-b",
    ]);

    expect(start.exitCode).toBe(0);
    expect(start.stdout).toContain("job=review-job");
    expect(start.stdout).toContain("status=running");

    const jobDir = join(harness.jobStateDir, "review-job");
    const jobJson = join(jobDir, "job.json");
    const payload = await waitForStatus(jobJson, "done");
    expect(payload.schema).toBe("direct-cli.herdr-job.v1");
    expect(payload.tabId).toBe("w1:t1");
    expect(payload.notification).toBe("disabled");
    expect(payload.summary).toBe("captured 2 agent result(s)");
    expect(typeof payload.watcherPid).toBe("number");
    expect(readFileSync(join(jobDir, "prompt.txt"), "utf8")).toBe(prompt);
    expect(readFileSync(join(jobDir, "results", "agent-a.txt"), "utf8")).toBe("RESULT:agent-a\n");
    expect(readFileSync(join(jobDir, "results", "agent-b.txt"), "utf8")).toBe("RESULT:agent-b\n");
    expect(statSync(jobJson).mode & 0o777).toBe(0o600);
    expect(statSync(join(jobDir, "prompt.txt")).mode & 0o777).toBe(0o600);
    expect(statSync(harness.jobStateDir).mode & 0o777).toBe(0o755);

    const list = runHelper(harness, ["list", "--state-dir", harness.jobStateDir]);
    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain("review-job\tdone");

    const collect = runHelper(harness, ["collect", "review-job", "--state-dir", harness.jobStateDir]);
    expect(collect.exitCode).toBe(0);
    expect(collect.stdout).toContain("## agent-a");
    expect(collect.stdout).toContain("RESULT:agent-b");
    expect(typeof JSON.parse(readFileSync(jobJson, "utf8")).collectedAt).toBe("string");

    const duplicate = runHelper(harness, [
      "start",
      "--job-id",
      "review-job",
      "--prompt-file",
      promptFile,
      "--cwd",
      harness.root,
      "--state-dir",
      harness.jobStateDir,
      "--no-notify",
      "agent-a",
    ]);
    expect(duplicate.exitCode).toBe(1);
    expect(duplicate.stderr).toContain("job already exists");

    const rerunWatcher = runHelper(harness, ["_watch", "--job-dir", jobDir]);
    expect(rerunWatcher.exitCode).toBe(2);
    expect(rerunWatcher.stderr).toContain("watcher requires running status, found done");
    expect(JSON.parse(readFileSync(jobJson, "utf8")).status).toBe("done");
  }, 10_000);

  test("records attention when detached prompt activity never starts", async () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "review.prompt.txt");
    writeFileSync(promptFile, "Review only.\n");
    writeFileSync(join(harness.agentStateDir, "agent-a.state"), "idle 1\n");

    const start = runHelper(
      harness,
      [
        "start",
        "--job-id",
        "stalled-job",
        "--prompt-file",
        promptFile,
        "--cwd",
        harness.root,
        "--state-dir",
        harness.jobStateDir,
        "--activity-timeout",
        "0.2",
        "--no-notify",
        "agent-a",
      ],
      { FAKE_STALL: "true" },
    );

    expect(start.exitCode).toBe(0);
    const payload = await waitForStatus(join(harness.jobStateDir, "stalled-job", "job.json"), "attention");
    expect(payload.summary).toContain("no activity transition for agent-a");
    expect(payload.summary).toContain("provider/account warning");
    expect(payload.summary).toContain("submit one Enter only if the prompt is visibly unsent");
  }, 10_000);

  test("reconciles a killed watcher into a collectible durable error", async () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "review.prompt.txt");
    writeFileSync(promptFile, "Review only.\n");
    writeFileSync(join(harness.agentStateDir, "agent-a.state"), "idle 1\n");

    const start = runHelper(
      harness,
      [
        "start",
        "--job-id",
        "killed-job",
        "--prompt-file",
        promptFile,
        "--cwd",
        harness.root,
        "--state-dir",
        harness.jobStateDir,
        "--activity-timeout",
        "30",
        "--no-notify",
        "agent-a",
      ],
      { FAKE_STALL: "true" },
    );
    expect(start.exitCode).toBe(0);

    const jobJson = join(harness.jobStateDir, "killed-job", "job.json");
    const watching = await waitForStatus(jobJson, "watching");
    process.kill(-watching.watcherPid, "SIGKILL");
    await Bun.sleep(100);

    const list = runHelper(harness, ["list", "--state-dir", harness.jobStateDir]);
    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain("killed-job\terror");
    const reconciled = JSON.parse(readFileSync(jobJson, "utf8"));
    expect(reconciled.summary).toContain("detached watcher is not running");

    const collect = runHelper(harness, ["collect", "killed-job", "--state-dir", harness.jobStateDir]);
    expect(collect.exitCode).toBe(0);
    expect(collect.stdout).toContain("status: error");
  }, 10_000);

  test("keeps prompt text out of dispatch failure summaries", () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "secret.prompt.txt");
    const secretPrompt = "SECRET-PROMPT-TEXT must stay private\n";
    writeFileSync(promptFile, secretPrompt);
    writeFileSync(join(harness.agentStateDir, "agent-a.state"), "idle 1\n");

    const start = runHelper(
      harness,
      [
        "start",
        "--job-id",
        "failed-job",
        "--prompt-file",
        promptFile,
        "--cwd",
        harness.root,
        "--state-dir",
        harness.jobStateDir,
        "--no-notify",
        "agent-a",
      ],
      { FAKE_PROMPT_FAIL: "true" },
    );

    expect(start.exitCode).toBe(1);
    const payload = JSON.parse(readFileSync(join(harness.jobStateDir, "failed-job", "job.json"), "utf8"));
    expect(payload.status).toBe("error");
    expect(payload.summary).toContain("prompt dispatch failed for agent-a with exit 9");
    expect(payload.summary).not.toContain("SECRET-PROMPT-TEXT");
    expect(payload.notification).toBe("disabled");
  });

  test("bounds a hung prompt dispatch without exposing prompt text", () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "secret.prompt.txt");
    writeFileSync(promptFile, "SECRET-HUNG-PROMPT\n");
    writeFileSync(join(harness.agentStateDir, "agent-a.state"), "idle 1\n");

    const start = runHelper(
      harness,
      [
        "start",
        "--job-id",
        "hung-job",
        "--prompt-file",
        promptFile,
        "--cwd",
        harness.root,
        "--state-dir",
        harness.jobStateDir,
        "--no-notify",
        "agent-a",
      ],
      {
        DIRECT_CLI_HERDR_CALL_TIMEOUT_SECONDS: "0.5",
        FAKE_PROMPT_HANG: "true",
      },
    );

    expect(start.exitCode).toBe(1);
    const payload = JSON.parse(readFileSync(join(harness.jobStateDir, "hung-job", "job.json"), "utf8"));
    expect(payload.summary).toBe("prompt dispatch timed out for agent-a");
    expect(payload.summary).not.toContain("SECRET-HUNG-PROMPT");
  });
});
