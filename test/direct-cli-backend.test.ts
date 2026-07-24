import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { findStandalonePython } from "./helpers/python";

const selector = join(import.meta.dir, "..", "skills", "direct-cli", "scripts", "select-backend.sh");
const tempDirs: string[] = [];

function makeBinDir(options: { herdr?: boolean; tmux?: boolean } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "direct-cli-backend-"));
  tempDirs.push(dir);

  const bash = Bun.which("bash");
  const python = findStandalonePython();
  if (!bash) {
    throw new Error("direct-cli backend tests require bash and python3");
  }
  symlinkSync(bash, join(dir, "bash"));
  symlinkSync(python, join(dir, "python3"));

  if (options.herdr) {
    const herdr = join(dir, "herdr");
    writeFileSync(
      herdr,
      `#!/bin/sh
if [ "$1" = "status" ] && [ "$2" = "--json" ]; then
  if [ "\${FAKE_HERDR_HANG:-false}" = "true" ]; then
    /bin/sleep 1
  fi
  printf '{"server":{"running":%s,"compatible":%s}}\\n' "\${FAKE_HERDR_RUNNING:-true}" "\${FAKE_HERDR_COMPATIBLE:-true}"
  exit 0
fi
if [ "$1" = "pane" ] && [ "$2" = "get" ]; then
  [ "\${FAKE_HERDR_PANE_VALID:-true}" = "true" ] || exit 1
  if [ "\${FAKE_HERDR_PANE_NULL:-false}" = "true" ]; then
    printf '{"result":{"pane":{"pane_id":null}}}\\n'
    exit 0
  fi
  printf '{"result":{"pane":{"pane_id":"%s"}}}\\n' "\${FAKE_HERDR_RESOLVED_PANE:-$3}"
  exit 0
fi
exit 2
`,
    );
    chmodSync(herdr, 0o755);
  }

  if (options.tmux) {
    const tmux = join(dir, "tmux");
    writeFileSync(tmux, "#!/bin/sh\nexit 0\n");
    chmodSync(tmux, 0o755);
  }

  return dir;
}

function runSelector(
  binDir: string,
  args: string[] = [],
  env: Record<string, string> = {},
) {
  const result = Bun.spawnSync({
    cmd: [selector, ...args],
    env: {
      PATH: binDir,
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

describe("direct-cli backend selector", () => {
  test("auto selects a validated live compatible Herdr pane", () => {
    const binDir = makeBinDir({ herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=herdr");
    expect(result.stdout).toContain("reason=validated live compatible Herdr pane");
  });

  test("auto rejects forged or stale Herdr pane markers and uses tmux", () => {
    const binDir = makeBinDir({ herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      FAKE_HERDR_PANE_VALID: "false",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "not-a-live-pane",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=tmux");
    expect(result.stdout).toContain("reason=Herdr preflight failed; tmux is available");
  });

  test("auto accepts a launch-time pane id retained as a live move alias", () => {
    const binDir = makeBinDir({ herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      FAKE_HERDR_RESOLVED_PANE: "w2:p9",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=herdr");
  });

  test("auto rejects a null resolved pane id and uses tmux", () => {
    const binDir = makeBinDir({ herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      FAKE_HERDR_PANE_NULL: "true",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=tmux");
  });

  test("auto bounds a hung Herdr preflight and uses tmux", () => {
    const binDir = makeBinDir({ herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      DIRECT_CLI_HERDR_TIMEOUT_SECONDS: "0.1",
      FAKE_HERDR_HANG: "true",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=tmux");
  });

  test("auto fails before mutation when neither backend is usable", () => {
    const result = runSelector(makeBinDir());

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no usable backend");
    expect(result.stdout).toBe("");
  });

  test("explicit Herdr rejects an incompatible server without tmux fallback", () => {
    const binDir = makeBinDir({ herdr: true, tmux: true });
    const result = runSelector(binDir, ["--backend", "herdr"], {
      FAKE_HERDR_COMPATIBLE: "false",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Herdr backend unavailable");
    expect(result.stdout).toBe("");
  });

  test("explicit tmux requires tmux and accepts equals syntax", () => {
    const missing = runSelector(makeBinDir(), ["--backend=tmux"]);
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain("tmux backend unavailable");

    const available = runSelector(makeBinDir({ tmux: true }), ["--backend=tmux"]);
    expect(available.exitCode).toBe(0);
    expect(available.stdout).toContain("backend=tmux");
    expect(available.stdout).toContain("reason=explicit tmux request passed binary preflight");
  });

  test("invalid backend input is a usage error", () => {
    const result = runSelector(makeBinDir({ tmux: true }), ["--backend", "screen"]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("expected --backend auto|herdr|tmux");
  });
});
