import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "fs";
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
    if [ "\${FAKE_CALLBACK:-false}" = "true" ]; then
      printf '{"result":{"agent":{"agent_status":"%s","state_change_seq":%s,"pane_id":"pane-%s","agent_session":{"value":"agent-session-%s"}}}}\\n' "$status" "$sequence" "$3" "$3"
    else
      printf '{"result":{"agent":{"agent_status":"%s","state_change_seq":%s}}}\\n' "$status" "$sequence"
    fi
    ;;
  pane:get)
    if [ "\${FAKE_CALLBACK:-false}" != "true" ]; then
      exit 2
    fi
    pane_name="$3"
    pane_agent="letta"
    if [ "$pane_name" != "parent-pane" ]; then
      pane_agent="\${pane_name#pane-}"
    fi
    tokens=',"tokens":{"letta_pid":"123","letta_started_at":"456","letta_scope":"scope-1","letta_version":"0.30.31"}'
    if [ "\${FAKE_NO_LETTA_TOKENS:-false}" = "true" ]; then
      tokens=""
    fi
    printf '{"result":{"pane":{"pane_id":"%s","workspace_id":"workspace-1","tab_id":"tab-1","cwd":"%s","terminal":"terminal-1","agent":"%s","agent_session":{"value":"agent-session-%s"},"herdr_session":"herdr-session-1","herdr_socket":"socket-1"%s}}}\\n' "$pane_name" "$FAKE_CWD" "$pane_agent" "$pane_agent" "$tokens"
    ;;
  pane:run)
    if [ "\${FAKE_WAKE_FAIL:-false}" = "true" ]; then
      exit 9
    fi
    printf '%s' "$4" > "$FAKE_AGENT_STATE_DIR/$3.wake"
    printf '{"result":{"type":"ok"}}\\n'
    ;;
  agent:prompt)
    if [ "\${FAKE_PROMPT_HANG:-false}" = "true" ]; then
      /bin/sleep 1
    fi
    case "$4" in
      *"[direct-cli callback wake]"*)
        if [ "\${FAKE_WAKE_FAIL:-false}" = "true" ]; then
          exit 9
        fi
        printf '%s' "$4" > "$FAKE_AGENT_STATE_DIR/$3.wake"
        ;;
      *)
        printf '%s' "$4" > "$FAKE_AGENT_STATE_DIR/$3.prompt"
        if [ "\${FAKE_AUTO_FINALIZE_JOB:-}" != "" ] && [ "$3" = "agent-a" ]; then
          auto_body="$FAKE_AGENT_STATE_DIR/auto-finalize.body"
          printf 'finished during dispatch\n' > "$auto_body"
          send_output="$(HERDR_PANE_ID="pane-$3" "$FAKE_PYTHON" "$FAKE_HELPER" send "$FAKE_AUTO_FINALIZE_JOB" --state-dir "$FAKE_JOB_STATE_DIR" --to parent --kind report_ready --body-file "$auto_body" --idempotency-key final)"
          message_id="$(printf '%s' "$send_output" | "$FAKE_PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["message"])')"
          HERDR_PANE_ID="parent-pane" "$FAKE_PYTHON" "$FAKE_HELPER" receive "$FAKE_AUTO_FINALIZE_JOB" --state-dir "$FAKE_JOB_STATE_DIR" --message-id "$message_id" >/dev/null
        fi
        ;;
    esac
    if [ "\${FAKE_PROMPT_FAIL:-false}" = "true" ]; then
      exit 9
    fi
    if [ "\${FAKE_STALL:-false}" != "true" ]; then
      printf 'working 2\\n' > "$state_file"
    fi
    printf '{"result":{"type":"agent_prompted"}}\\n'
    ;;
  agent:wait)
    /bin/sleep "\${FAKE_WAIT_SECONDS:-0.1}"
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
      FAKE_CWD: harness.root,
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

function callbackStart(
  harness: ReturnType<typeof makeHarness>,
  jobId: string,
  targets: string[] = ["agent-a", "agent-b"],
  prompt = "Callback task.\n",
  mode = "callback",
) {
  const promptFile = join(harness.root, `${jobId}.prompt.txt`);
  writeFileSync(promptFile, prompt);
  for (const target of targets) {
    writeFileSync(join(harness.agentStateDir, `${target}.state`), "idle 1\n");
  }
  return runHelper(
    harness,
    [
      "start",
      "--job-id",
      jobId,
      "--prompt-file",
      promptFile,
      "--cwd",
      harness.root,
      "--state-dir",
      harness.jobStateDir,
      "--mode",
      mode,
      "--callback-timeout",
      "0",
      "--no-notify",
      ...targets,
    ],
    { FAKE_CALLBACK: "true", HERDR_PANE_ID: "parent-pane" },
  );
}

function callbackEnv(paneId: string, extra: Record<string, string> = {}) {
  return { FAKE_CALLBACK: "true", HERDR_PANE_ID: paneId, ...extra };
}

function processExists(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
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

    const wait = runHelper(harness, [
      "wait",
      "review-job",
      "--state-dir",
      harness.jobStateDir,
      "--json",
    ]);
    expect(wait.exitCode).toBe(0);
    expect(JSON.parse(wait.stdout)).toEqual({
      job: "review-job",
      status: "done",
      job_dir: realpathSync(jobDir),
    });

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

    const waited = runHelper(harness, [
      "wait",
      "stalled-job",
      "--state-dir",
      harness.jobStateDir,
      "--json",
    ]);
    expect(waited.exitCode).toBe(0);
    expect(JSON.parse(waited.stdout)).toEqual({
      job: "stalled-job",
      status: "attention",
      job_dir: realpathSync(join(harness.jobStateDir, "stalled-job")),
    });
  }, 10_000);

  test("wait blocks for terminal state and bounds an optional caller timeout", async () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "review.prompt.txt");
    writeFileSync(promptFile, "Review only.\n");
    writeFileSync(join(harness.agentStateDir, "agent-a.state"), "idle 1\n");

    const start = runHelper(
      harness,
      [
        "start",
        "--job-id",
        "wait-job",
        "--prompt-file",
        promptFile,
        "--cwd",
        harness.root,
        "--state-dir",
        harness.jobStateDir,
        "--no-notify",
        "agent-a",
      ],
      { FAKE_WAIT_SECONDS: "0.5" },
    );
    expect(start.exitCode).toBe(0);

    const timeoutStartedAt = performance.now();
    const timedOut = runHelper(harness, [
      "wait",
      "wait-job",
      "--state-dir",
      harness.jobStateDir,
      "--timeout",
      "0.05",
      "--poll-interval",
      "60",
    ]);
    const timeoutElapsedMs = performance.now() - timeoutStartedAt;
    expect(timedOut.exitCode).toBe(2);
    expect(timedOut.stderr).toContain("timed out waiting for job wait-job");
    expect(timeoutElapsedMs).toBeLessThan(1000);

    const waited = runHelper(harness, [
      "wait",
      "wait-job",
      "--state-dir",
      harness.jobStateDir,
      "--timeout",
      "5",
      "--poll-interval",
      "0.05",
    ]);
    expect(waited.exitCode).toBe(0);
    expect(waited.stdout).toContain("job=wait-job\tstatus=done\tjob_dir=");
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

    const waited = runHelper(harness, [
      "wait",
      "killed-job",
      "--state-dir",
      harness.jobStateDir,
      "--json",
    ]);
    expect(waited.exitCode).toBe(0);
    expect(JSON.parse(waited.stdout)).toEqual({
      job: "killed-job",
      status: "error",
      job_dir: realpathSync(join(harness.jobStateDir, "killed-job")),
    });
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

  test("auto uses callback only with exact parent receipt and byte-identical footer fanout", () => {
    const harness = makeHarness();
    const start = callbackStart(harness, "callback-auto", ["agent-a", "agent-b"], "same task bytes\n", "auto");

    expect(start.exitCode).toBe(0);
    expect(start.stdout).toContain("mode=callback");
    const jobDir = join(harness.jobStateDir, "callback-auto");
    const payload = JSON.parse(readFileSync(join(jobDir, "job.json"), "utf8"));
    expect(payload.schema).toBe("direct-cli.herdr-job.v2");
    expect(payload.routing).toBe("callback");
    expect(payload.parentReceipt.paneId).toBe("parent-pane");
    expect(payload.parentReceipt.workspaceId).toBe("workspace-1");
    expect(payload.parentReceipt.tabId).toBe("tab-1");
    expect(payload.parentReceipt.terminal).toBe("terminal-1");
    expect(payload.parentReceipt.herdrSession).toBe("herdr-session-1");
    expect(payload.parentReceipt.herdrSocket).toBe("socket-1");
    expect(payload.parentReceipt.lettaTokens).toEqual({
      letta_pid: "123",
      letta_scope: "scope-1",
      letta_started_at: "456",
      letta_version: "0.30.31",
    });
    expect(payload).not.toHaveProperty("watcherPid");
    const promptA = readFileSync(join(harness.agentStateDir, "agent-a.prompt"), "utf8");
    const promptB = readFileSync(join(harness.agentStateDir, "agent-b.prompt"), "utf8");
    expect(promptA).toBe(promptB);
    expect(promptA).toContain("[Direct-CLI callback contract]");
    expect(promptA).toContain(helper);
    expect(promptA).toContain("send callback-auto");
    expect(promptA).not.toContain("send <job>");
    expect(payload.taskSha256).not.toBe(payload.dispatchSha256);
    expect(readFileSync(join(jobDir, "prompt.txt"), "utf8")).toBe("same task bytes\n");
  });

  test("a report acknowledged during dispatch cannot be overwritten back to running", () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "dispatch-race.prompt.txt");
    writeFileSync(promptFile, "Finalize from inside fake dispatch.\n");
    writeFileSync(join(harness.agentStateDir, "agent-a.state"), "idle 1\n");
    const start = runHelper(
      harness,
      [
        "start", "--job-id", "callback-dispatch-race", "--prompt-file", promptFile,
        "--cwd", harness.root, "--state-dir", harness.jobStateDir, "--mode", "callback",
        "--callback-timeout", "10", "--no-notify", "agent-a",
      ],
      callbackEnv("parent-pane", {
        FAKE_AUTO_FINALIZE_JOB: "callback-dispatch-race",
        FAKE_HELPER: helper,
        FAKE_JOB_STATE_DIR: harness.jobStateDir,
        FAKE_PYTHON: findStandalonePython(),
      }),
    );
    expect(start.exitCode).toBe(0);
    expect(start.stdout).toContain("status=done");
    const payload = JSON.parse(readFileSync(join(harness.jobStateDir, "callback-dispatch-race", "job.json"), "utf8"));
    expect(payload.status).toBe("done");
    expect(payload.summary).toBe("all target reports acknowledged");
    expect(payload).not.toHaveProperty("callbackDeadlinePid");
    expect(payload).not.toHaveProperty("watcherPid");
  });

  test("callback messages enforce pane ACL, secrecy, idempotency, audit, and receive ack", () => {
    const harness = makeHarness();
    const start = callbackStart(harness, "callback-messages");
    expect(start.exitCode).toBe(0);
    const bodyFile = join(harness.root, "parent.body");
    writeFileSync(bodyFile, "SECRET-BODY\n");

    const sent = runHelper(
      harness,
      ["send", "callback-messages", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "progress", "--body-file", bodyFile, "--idempotency-key", "progress-1"],
      callbackEnv("pane-agent-a"),
    );
    expect(sent.exitCode).toBe(0);
    const message = JSON.parse(sent.stdout);
    const messagePath = join(harness.jobStateDir, "callback-messages", "messages", message.message, "message.json");
    expect(statSync(messagePath).mode & 0o777).toBe(0o600);
    expect(readFileSync(join(harness.agentStateDir, "parent-pane.wake"), "utf8")).not.toContain("SECRET-BODY");
    expect(readFileSync(join(harness.agentStateDir, "parent-pane.wake"), "utf8")).toContain(`message=${message.message}`);
    expect(readFileSync(join(harness.agentStateDir, "parent-pane.wake"), "utf8")).toContain("receive=");

    const duplicate = runHelper(
      harness,
      ["send", "callback-messages", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "progress", "--body-file", bodyFile, "--idempotency-key", "progress-1"],
      callbackEnv("pane-agent-a"),
    );
    expect(duplicate.exitCode).toBe(0);
    expect(JSON.parse(duplicate.stdout).message).toBe(message.message);

    const mismatchFile = join(harness.root, "mismatch.body");
    writeFileSync(mismatchFile, "DIFFERENT\n");
    const mismatch = runHelper(
      harness,
      ["send", "callback-messages", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "progress", "--body-file", mismatchFile, "--idempotency-key", "progress-1"],
      callbackEnv("pane-agent-a"),
    );
    expect(mismatch.exitCode).toBe(1);
    expect(mismatch.stderr).toContain("idempotency key");

    const peerBody = join(harness.root, "peer.body");
    writeFileSync(peerBody, "peer reply\n");
    const peerMessage = runHelper(
      harness,
      ["send", "callback-messages", "--state-dir", harness.jobStateDir, "--to", "agent-b", "--kind", "reply", "--body-file", peerBody, "--idempotency-key", "reply-1"],
      callbackEnv("pane-agent-a"),
    );
    expect(peerMessage.exitCode).toBe(0);

    const outsider = runHelper(
      harness,
      ["send", "callback-messages", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "progress", "--body-file", bodyFile, "--idempotency-key", "outsider-1"],
      callbackEnv("pane-outsider"),
    );
    expect(outsider.exitCode).toBe(1);
    const stale = runHelper(
      harness,
      ["send", "callback-messages", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "progress", "--body-file", bodyFile, "--idempotency-key", "stale-1"],
      callbackEnv("pane-agent-a-stale"),
    );
    expect(stale.exitCode).toBe(1);

    const parentAudit = runHelper(harness, ["audit", "callback-messages", "--state-dir", harness.jobStateDir, "--include-bodies"], callbackEnv("parent-pane"));
    expect(parentAudit.exitCode).toBe(0);
    const auditedMessages = JSON.parse(parentAudit.stdout);
    expect(auditedMessages).toHaveLength(2);
    expect(auditedMessages.map((item: { body: string }) => item.body).sort()).toEqual(["SECRET-BODY\n", "peer reply\n"].sort());
    const peerAudit = runHelper(harness, ["audit", "callback-messages", "--state-dir", harness.jobStateDir], callbackEnv("pane-agent-b"));
    expect(peerAudit.exitCode).toBe(0);
    expect(JSON.parse(peerAudit.stdout)).toHaveLength(1);
    const peerBodyAudit = runHelper(harness, ["audit", "callback-messages", "--state-dir", harness.jobStateDir, "--include-bodies"], callbackEnv("pane-agent-b"));
    expect(peerBodyAudit.exitCode).toBe(1);
    expect(peerBodyAudit.stderr).toContain("only the exact parent");

    const received = runHelper(harness, ["receive", "callback-messages", "--message-id", message.message, "--state-dir", harness.jobStateDir], callbackEnv("parent-pane"));
    expect(received.exitCode).toBe(0);
    expect(received.stdout).toBe("SECRET-BODY\n");
    const acked = JSON.parse(readFileSync(messagePath, "utf8"));
    expect(acked.ack.by).toBe("parent");
  });

  test("callback delivery failures are durable and explicit retry repairs them", () => {
    const harness = makeHarness();
    expect(callbackStart(harness, "callback-retry", ["agent-a"]).exitCode).toBe(0);
    const bodyFile = join(harness.root, "retry.body");
    writeFileSync(bodyFile, "retry body\n");
    const failed = runHelper(
      harness,
      ["send", "callback-retry", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "blocked", "--body-file", bodyFile, "--idempotency-key", "retry-1"],
      callbackEnv("pane-agent-a", { FAKE_WAKE_FAIL: "true" }),
    );
    expect(failed.exitCode).toBe(1);
    const failedMessage = JSON.parse(failed.stdout);
    const recordPath = join(harness.jobStateDir, "callback-retry", "messages", failedMessage.message, "message.json");
    expect(JSON.parse(readFileSync(recordPath, "utf8")).delivery.status).toBe("failed");

    const jobPath = join(harness.jobStateDir, "callback-retry", "job.json");
    const staleJob = JSON.parse(readFileSync(jobPath, "utf8"));
    staleJob.targets[0].receipt.terminal = "stale-terminal";
    writeFileSync(jobPath, JSON.stringify(staleJob, null, 2) + "\n");
    const staleParentRetry = runHelper(
      harness,
      ["retry", "callback-retry", "--message-id", failedMessage.message, "--state-dir", harness.jobStateDir],
      callbackEnv("parent-pane"),
    );
    expect(staleParentRetry.exitCode).toBe(1);
    expect(staleParentRetry.stderr).toContain("stale or mismatched Herdr receipt");
    staleJob.targets[0].receipt.terminal = "terminal-1";
    writeFileSync(jobPath, JSON.stringify(staleJob, null, 2) + "\n");

    const retried = runHelper(
      harness,
      ["retry", "callback-retry", "--message-id", failedMessage.message, "--state-dir", harness.jobStateDir],
      callbackEnv("pane-agent-a"),
    );
    expect(retried.exitCode).toBe(0);
    const retryPayload = JSON.parse(retried.stdout);
    expect(retryPayload.message).toBe(failedMessage.message);
    expect(JSON.parse(readFileSync(recordPath, "utf8")).delivery.retryCount).toBe(1);
    expect(readFileSync(join(harness.agentStateDir, "parent-pane.wake"), "utf8")).not.toContain("retry body");
  });

  test("all target reports finalize callback jobs and preserve failure status", () => {
    const harness = makeHarness();
    expect(callbackStart(harness, "callback-ready").exitCode).toBe(0);
    const readyA = join(harness.root, "ready-a.body");
    const readyB = join(harness.root, "ready-b.body");
    writeFileSync(readyA, "A ready\n");
    writeFileSync(readyB, "B ready\n");
    const readyMessages: string[] = [];
    for (const [target, body] of [["agent-a", readyA], ["agent-b", readyB]] as const) {
      const result = runHelper(
        harness,
        ["send", "callback-ready", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "report_ready", "--body-file", body, "--idempotency-key", "final"],
        callbackEnv(`pane-${target}`),
      );
      expect(result.exitCode).toBe(0);
      readyMessages.push(JSON.parse(result.stdout).message);
    }
    expect(JSON.parse(readFileSync(join(harness.jobStateDir, "callback-ready", "job.json"), "utf8")).status).toBe("running");
    for (const messageId of readyMessages) {
      expect(runHelper(harness, ["receive", "callback-ready", "--state-dir", harness.jobStateDir, "--message-id", messageId], callbackEnv("parent-pane")).exitCode).toBe(0);
    }
    const readyPayload = JSON.parse(readFileSync(join(harness.jobStateDir, "callback-ready", "job.json"), "utf8"));
    expect(readyPayload.status).toBe("done");
    expect(readFileSync(join(harness.jobStateDir, "callback-ready", "results", "agent-a.txt"), "utf8")).toBe("A ready\n");

    expect(callbackStart(harness, "callback-failed").exitCode).toBe(0);
    const failedBody = join(harness.root, "failed.body");
    writeFileSync(failedBody, "A failed\n");
    const okayBody = join(harness.root, "okay.body");
    writeFileSync(okayBody, "B ready\n");
    const failedA = runHelper(harness, ["send", "callback-failed", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "report_failed", "--body-file", failedBody, "--idempotency-key", "failed-a"], callbackEnv("pane-agent-a"));
    const okayB = runHelper(harness, ["send", "callback-failed", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "report_ready", "--body-file", okayBody, "--idempotency-key", "okay-b"], callbackEnv("pane-agent-b"));
    expect(failedA.exitCode).toBe(0);
    expect(okayB.exitCode).toBe(0);
    for (const messageId of [JSON.parse(failedA.stdout).message, JSON.parse(okayB.stdout).message]) {
      expect(runHelper(harness, ["receive", "callback-failed", "--state-dir", harness.jobStateDir, "--message-id", messageId], callbackEnv("parent-pane")).exitCode).toBe(0);
    }
    expect(JSON.parse(readFileSync(join(harness.jobStateDir, "callback-failed", "job.json"), "utf8")).status).toBe("error");
  });

  test("callback silence uses one deadline wake without starting the watcher", async () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "deadline.prompt.txt");
    writeFileSync(promptFile, "Wait for the deadline.\n");
    writeFileSync(join(harness.agentStateDir, "agent-a.state"), "idle 1\n");
    const start = runHelper(
      harness,
      [
        "start", "--job-id", "callback-deadline", "--prompt-file", promptFile,
        "--cwd", harness.root, "--state-dir", harness.jobStateDir, "--mode", "callback",
        "--callback-timeout", "0.1", "--no-notify", "agent-a",
      ],
      callbackEnv("parent-pane"),
    );
    expect(start.exitCode).toBe(0);
    const jobJson = join(harness.jobStateDir, "callback-deadline", "job.json");
    const deadline = Date.now() + 3000;
    let payload = JSON.parse(readFileSync(jobJson, "utf8"));
    while (!payload.callbackDeadlineWake && Date.now() < deadline) {
      await Bun.sleep(25);
      payload = JSON.parse(readFileSync(jobJson, "utf8"));
    }
    expect(payload.status).toBe("running");
    expect(payload.callbackDeadlineWake).toBe("accepted");
    expect(payload).not.toHaveProperty("watcherPid");
    expect(readFileSync(join(harness.agentStateDir, "parent-pane.wake"), "utf8")).toContain("reason=silence-deadline");
  });

  test("terminal callback completion stops its exact sleeping deadline process", async () => {
    const harness = makeHarness();
    const promptFile = join(harness.root, "deadline-stop.prompt.txt");
    const bodyFile = join(harness.root, "deadline-stop.body.txt");
    writeFileSync(promptFile, "Complete before the deadline.\n");
    writeFileSync(bodyFile, "finished\n");
    writeFileSync(join(harness.agentStateDir, "agent-a.state"), "idle 1\n");
    const start = runHelper(
      harness,
      [
        "start", "--job-id", "callback-deadline-stop", "--prompt-file", promptFile,
        "--cwd", harness.root, "--state-dir", harness.jobStateDir, "--mode", "callback",
        "--callback-timeout", "10", "--no-notify", "agent-a",
      ],
      callbackEnv("parent-pane"),
    );
    expect(start.exitCode).toBe(0);
    const jobPath = join(harness.jobStateDir, "callback-deadline-stop", "job.json");
    const deadlinePid = JSON.parse(readFileSync(jobPath, "utf8")).callbackDeadlinePid as number;
    expect(processExists(deadlinePid)).toBe(true);
    const sent = runHelper(
      harness,
      ["send", "callback-deadline-stop", "--state-dir", harness.jobStateDir, "--to", "parent", "--kind", "report_ready", "--body-file", bodyFile, "--idempotency-key", "final"],
      callbackEnv("pane-agent-a"),
    );
    expect(sent.exitCode).toBe(0);
    const messageId = JSON.parse(sent.stdout).message;
    expect(runHelper(harness, ["receive", "callback-deadline-stop", "--state-dir", harness.jobStateDir, "--message-id", messageId], callbackEnv("parent-pane")).exitCode).toBe(0);
    const deadline = Date.now() + 3000;
    while (processExists(deadlinePid) && Date.now() < deadline) {
      await Bun.sleep(25);
    }
    expect(JSON.parse(readFileSync(jobPath, "utf8")).status).toBe("done");
    expect(processExists(deadlinePid)).toBe(false);
  });

  test("callback jobs stay running without a watcher until explicit recover", async () => {
    const harness = makeHarness();
    expect(callbackStart(harness, "callback-recover", ["agent-a"]).exitCode).toBe(0);
    const before = runHelper(harness, ["list", "--state-dir", harness.jobStateDir]);
    expect(before.stdout).toContain("callback-recover\trunning");
    const recovered = runHelper(harness, ["recover", "callback-recover", "--state-dir", harness.jobStateDir]);
    expect(recovered.exitCode).toBe(0);
    const payload = await waitForStatus(join(harness.jobStateDir, "callback-recover", "job.json"), "done");
    expect(payload.watcherFallback).toBe(true);
    expect(typeof payload.watcherPid).toBe("number");
  }, 10_000);
});
