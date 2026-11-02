import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { findStandalonePython } from "./helpers/python";

const selector = join(
  import.meta.dir,
  "..",
  "skills",
  "direct-cli",
  "scripts",
  "select-backend.sh",
);
const tempDirs: string[] = [];

function makeBinDir(
  options: { hc?: boolean; herdrCore?: boolean; orca?: boolean; herdr?: boolean; tmux?: boolean } = {},
) {
  const dir = mkdtempSync(join(tmpdir(), "direct-cli-backend-"));
  tempDirs.push(dir);

  const bash = Bun.which("bash");
  const python = findStandalonePython();
  if (!bash) {
    throw new Error("direct-cli backend tests require bash and python3");
  }
  symlinkSync(bash, join(dir, "bash"));
  symlinkSync(python, join(dir, "python3"));

  for (const executable of ["hc", "herdr-core"]) {
    if (!(executable === "hc" ? options.hc : options.herdrCore)) continue;
    const path = join(dir, executable);
    writeFileSync(path, `#!/bin/sh
if [ "$1" = "server" ] && [ "$2" = "status" ] && [ "$3" = "--json" ]; then
  [ "\${FAKE_HC_HANG:-false}" != "true" ] || /bin/sleep 1
  [ "\${FAKE_HC_STATUS_FAIL:-false}" != "true" ] || exit 1
  if [ -n "\${FAKE_HC_STATUS:-}" ]; then
    printf '%s\\n' "$FAKE_HC_STATUS"
  else
    printf '%s\\n' '{"core":{"id":"core-test"},"holder":{"current":true,"instance":"holder-test","pid":42},"holders":[{"current":true,"instance":"holder-test","pid":42}]}'
  fi
  exit 0
fi
if [ "$1" = "get" ] && [ "$3" = "--json" ]; then
  [ "\${FAKE_HC_GET_HANG:-false}" != "true" ] || /bin/sleep 1
  if [ -n "\${FAKE_HC_TERMINAL:-}" ]; then
    printf '%s\\n' "$FAKE_HC_TERMINAL"
  else
    printf '%s\\n' '{"address":"t-caller","state":"live","finished_ms":null,"rm":false,"cwd":"/caller-not-target"}'
  fi
  exit 0
fi
exit 2
`);
    chmodSync(path, 0o755);
  }

  if (options.orca) {
    const orca = join(dir, "orca");
    writeFileSync(
      orca,
      `#!/bin/sh
if [ "$1" = "status" ] && [ "$2" = "--json" ]; then
  if [ "\${FAKE_ORCA_HANG:-false}" = "true" ]; then
    /bin/sleep 1
  fi
  printf '{"result":{"runtime":{"state":"%s","reachable":%s,"connectionState":"%s"}}}\n' "\${FAKE_ORCA_STATE:-ready}" "\${FAKE_ORCA_REACHABLE:-true}" "\${FAKE_ORCA_CONNECTION:-connected}"
  exit 0
fi
if [ "$1" = "terminal" ] && [ "$2" = "show" ]; then
  [ "\${FAKE_ORCA_TERMINAL_VALID:-true}" = "true" ] || exit 1
  pane_key="\${ORCA_PANE_KEY:-tab_current:leaf_current}"
  printf '{"result":{"terminal":{"handle":"%s","worktreeId":"%s","tabId":"%s","leafId":"%s","connected":%s,"writable":%s,"orphaned":%s}}}\n' "\${FAKE_ORCA_RESOLVED_HANDLE:-$4}" "\${FAKE_ORCA_RESOLVED_WORKTREE:-$ORCA_WORKTREE_ID}" "\${FAKE_ORCA_RESOLVED_TAB:-$ORCA_TAB_ID}" "\${FAKE_ORCA_RESOLVED_LEAF:-\${pane_key#*:}}" "\${FAKE_ORCA_CONNECTED:-true}" "\${FAKE_ORCA_WRITABLE:-true}" "\${FAKE_ORCA_ORPHANED:-false}"
  exit 0
fi
if [ "$1" = "worktree" ] && [ "$2" = "show" ]; then
  [ "\${FAKE_ORCA_TARGET_VALID:-true}" = "true" ] || exit 1
  printf '{"result":{"worktree":{"id":"%s","path":"%s","isArchived":%s}}}\n' "\${FAKE_ORCA_TARGET_ID:-repo-target::$PWD}" "\${FAKE_ORCA_TARGET_PATH:-$PWD}" "\${FAKE_ORCA_TARGET_ARCHIVED:-false}"
  exit 0
fi
exit 2
`,
    );
    chmodSync(orca, 0o755);
  }

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
  const hcCaller = { HC_TERMINAL_ID: "t-caller" };
  const coexistence = {
    ...hcCaller,
    HERDR_ENV: "1", HERDR_PANE_ID: "w1:p2",
    ORCA_TERMINAL_HANDLE: "term_current", ORCA_WORKTREE_ID: "repo::/caller",
    ORCA_TAB_ID: "tab_current", ORCA_PANE_KEY: "tab_current:leaf_current",
  };

  test("healthy HC wins coexistence and prefers canonical executable", () => {
    const result = runSelector(makeBinDir({ hc: true, herdrCore: true, herdr: true, orca: true, tmux: true }), [], coexistence);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.split("\n")).toHaveLength(3);
    expect(result.stdout).toStartWith("backend=hc\nreason=");
    expect(result.stdout.trim()).toEndWith("/hc");
  });

  test("compatibility executable and explicit alias normalize to hc", () => {
    for (const args of [[], ["--backend", "hc"], ["--backend=herdr-core"]]) {
      const result = runSelector(makeBinDir({ herdrCore: true }), args, hcCaller);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toStartWith("backend=hc\n");
      expect(result.stdout.trim()).toEndWith("/herdr-core");
    }
  });

  test("binary-only HC is insufficient and legacy Herdr stays next", () => {
    const result = runSelector(makeBinDir({ hc: true, herdr: true, orca: true, tmux: true }), [], { ...coexistence, HC_TERMINAL_ID: "" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toStartWith("backend=herdr\n");
    expect(runSelector(makeBinDir({ hc: true, tmux: true })).stdout).toStartWith("backend=tmux\n");
  });

  test("a live current HC caller remains valid when it is configured for removal after exit", () => {
    const result = runSelector(makeBinDir({ hc: true, tmux: true }), [], {
      ...hcCaller,
      FAKE_HC_TERMINAL: '{"address":"t-caller","state":"live","finished_ms":null,"rm":true,"cwd":"/caller-not-target"}',
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toStartWith("backend=hc\n");
  });

  for (const [condition, failedEnv] of [
    ["finished", { FAKE_HC_TERMINAL: '{"address":"t-caller","state":"finished","finished_ms":1,"rm":false}' }],
    ["mismatched address", { FAKE_HC_TERMINAL: '{"address":"t-other","state":"live","finished_ms":null,"rm":false}' }],
    ["stale holder", { FAKE_HC_STATUS: '{"core":{"id":"core-test"},"holder":{"current":false,"instance":"holder-test","pid":42},"holders":[]}' }],
    ["mismatched holder", { FAKE_HC_STATUS: '{"core":{"id":"core-test"},"holder":{"current":true,"instance":"holder-test","pid":42},"holders":[{"current":true,"instance":"other","pid":42}]}' }],
    ["boolean holder-list PID", { FAKE_HC_STATUS: '{"core":{"id":"core-test"},"holder":{"current":true,"instance":"holder-test","pid":1},"holders":[{"current":true,"instance":"holder-test","pid":true}]}' }],
    ["float holder-list PID", { FAKE_HC_STATUS: '{"core":{"id":"core-test"},"holder":{"current":true,"instance":"holder-test","pid":42},"holders":[{"current":true,"instance":"holder-test","pid":42.0}]}' }],
    ["missing core", { FAKE_HC_STATUS: '{"holder":{"current":true,"instance":"holder-test","pid":42},"holders":[]}' }],
    ["malformed status", { FAKE_HC_STATUS: "not-json" }],
    ["malformed get", { FAKE_HC_TERMINAL: "null" }],
    ["status timeout", { FAKE_HC_HANG: "true", DIRECT_CLI_HC_TIMEOUT_SECONDS: "0.1" }],
    ["get timeout", { FAKE_HC_GET_HANG: "true", DIRECT_CLI_HC_TIMEOUT_SECONDS: "0.1" }],
    ["invalid timeout", { DIRECT_CLI_HC_TIMEOUT_SECONDS: "nan" }],
  ] as const) {
    test(`HC rejects ${condition}; auto falls back, explicit fails closed`, () => {
      const bin = makeBinDir({ hc: true, herdrCore: true, herdr: true, orca: true, tmux: true });
      const env = { ...coexistence, ...failedEnv };
      expect(runSelector(bin, [], env).stdout).toStartWith("backend=herdr\n");
      for (const backend of ["hc", "herdr-core"]) {
        const result = runSelector(bin, ["--backend", backend], env);
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("HC backend unavailable");
      }
    });
  }

  test("failed HC falls through legacy, Orca, then tmux in order", () => {
    const bin = makeBinDir({ hc: true, herdr: true, orca: true, tmux: true });
    const env = { ...coexistence, FAKE_HC_STATUS_FAIL: "true", FAKE_HERDR_COMPATIBLE: "false" };
    expect(runSelector(bin, [], env).stdout).toStartWith("backend=orca\n");
    expect(runSelector(bin, [], { ...env, FAKE_ORCA_TERMINAL_VALID: "false" }).stdout).toStartWith("backend=tmux\n");
    const missing = runSelector(makeBinDir({ tmux: true }), ["--backend", "hc"], hcCaller);
    expect(missing.exitCode).toBe(1);
    expect(missing.stdout).toBe("");
  });

  test("auto prefers healthy Herdr when both backend identities are valid", () => {
    const binDir = makeBinDir({ orca: true, herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      FAKE_ORCA_TARGET_ID: "repo-target::/tracked-current-cwd",
      ORCA_TERMINAL_HANDLE: "term_current",
      ORCA_WORKTREE_ID: "repo-caller::/caller-worktree",
      ORCA_TAB_ID: "tab_current",
      ORCA_PANE_KEY: "tab_current:leaf_current",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=herdr");
    expect(result.stdout).toContain(
      "reason=validated live compatible Herdr pane",
    );
  });

  test("auto retains verified Orca fallback when the Herdr server is incompatible", () => {
    const binDir = makeBinDir({ orca: true, herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      FAKE_HERDR_COMPATIBLE: "false",
      ORCA_TERMINAL_HANDLE: "term_current",
      ORCA_WORKTREE_ID: "repo-caller::/caller-worktree",
      ORCA_TAB_ID: "tab_current",
      ORCA_PANE_KEY: "tab_current:leaf_current",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=orca");
    expect(result.stdout).toContain(
      "reason=validated live Orca caller identity and separately tracked current target",
    );
  });

  test("auto rejects stale Orca identity after Herdr fails and falls through to tmux", () => {
    const binDir = makeBinDir({ orca: true, herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      FAKE_ORCA_RESOLVED_WORKTREE: "repo::/other",
      FAKE_HERDR_COMPATIBLE: "false",
      ORCA_TERMINAL_HANDLE: "term_current",
      ORCA_WORKTREE_ID: "repo::/worktree",
      ORCA_TAB_ID: "tab_current",
      ORCA_PANE_KEY: "tab_current:leaf_current",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=tmux");
  });

  test("auto rejects an untracked Orca target after Herdr fails", () => {
    const binDir = makeBinDir({ orca: true, herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      FAKE_ORCA_TARGET_PATH: "/tmp/not-the-current-worktree",
      FAKE_HERDR_COMPATIBLE: "false",
      ORCA_TERMINAL_HANDLE: "term_current",
      ORCA_WORKTREE_ID: "repo::/caller-worktree",
      ORCA_TAB_ID: "tab_current",
      ORCA_PANE_KEY: "tab_current:leaf_current",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=tmux");
  });

  for (const [condition, failedEnv] of [
    ["disconnected", { FAKE_ORCA_CONNECTED: "false" }],
    ["read-only", { FAKE_ORCA_WRITABLE: "false" }],
    ["orphaned", { FAKE_ORCA_ORPHANED: "true" }],
    ["unreachable", { FAKE_ORCA_REACHABLE: "false" }],
    ["archived-target", { FAKE_ORCA_TARGET_ARCHIVED: "true" }],
  ] as const) {
    test(`auto rejects a ${condition} Orca route`, () => {
      const binDir = makeBinDir({ orca: true, herdr: true, tmux: true });
      const result = runSelector(binDir, [], {
        ...failedEnv,
        FAKE_HERDR_COMPATIBLE: "false",
        ORCA_TERMINAL_HANDLE: "term_current",
        ORCA_WORKTREE_ID: "repo::/worktree",
        ORCA_TAB_ID: "tab_current",
        ORCA_PANE_KEY: "tab_current:leaf_current",
        HERDR_ENV: "1",
        HERDR_PANE_ID: "w1:p2",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("backend=tmux");
    });
  }

  test("auto does not select Orca from binary presence alone", () => {
    const binDir = makeBinDir({ orca: true, tmux: true });
    const result = runSelector(binDir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=tmux");
    expect(result.stdout).not.toContain("backend=orca");
  });

  test("auto rejects forged Orca markers and uses tmux when Herdr is unavailable", () => {
    const binDir = makeBinDir({ orca: true, tmux: true });
    const result = runSelector(binDir, [], {
      FAKE_ORCA_TERMINAL_VALID: "false",
      ORCA_TERMINAL_HANDLE: "term_stale",
      ORCA_WORKTREE_ID: "repo::/worktree",
      ORCA_TAB_ID: "tab_current",
      ORCA_PANE_KEY: "tab_current:leaf_current",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=tmux");
    expect(result.stdout).toContain(
      "reason=HC, Herdr, and Orca preflights failed; tmux is available",
    );
  });

  test("auto bounds a hung Orca fallback after Herdr fails", () => {
    const binDir = makeBinDir({ orca: true, herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      DIRECT_CLI_ORCA_TIMEOUT_SECONDS: "0.1",
      FAKE_ORCA_HANG: "true",
      FAKE_HERDR_COMPATIBLE: "false",
      ORCA_TERMINAL_HANDLE: "term_current",
      ORCA_WORKTREE_ID: "repo::/worktree",
      ORCA_TAB_ID: "tab_current",
      ORCA_PANE_KEY: "tab_current:leaf_current",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=tmux");
  });

  test("auto selects a validated live compatible Herdr pane", () => {
    const binDir = makeBinDir({ herdr: true, tmux: true });
    const result = runSelector(binDir, [], {
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("backend=herdr");
    expect(result.stdout).toContain(
      "reason=validated live compatible Herdr pane",
    );
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
    expect(result.stdout).toContain(
      "reason=HC, Herdr, and Orca preflights failed; tmux is available",
    );
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

  test("explicit Orca rejects a mismatched current terminal without fallback", () => {
    const binDir = makeBinDir({ orca: true, herdr: true, tmux: true });
    const result = runSelector(binDir, ["--backend", "orca"], {
      FAKE_ORCA_RESOLVED_HANDLE: "term_other",
      ORCA_TERMINAL_HANDLE: "term_current",
      ORCA_WORKTREE_ID: "repo::/worktree",
      ORCA_TAB_ID: "tab_current",
      ORCA_PANE_KEY: "tab_current:leaf_current",
      HERDR_ENV: "1",
      HERDR_PANE_ID: "w1:p2",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Orca backend unavailable");
    expect(result.stdout).toBe("");
  });

  test("explicit tmux requires tmux and accepts equals syntax", () => {
    const missing = runSelector(makeBinDir(), ["--backend=tmux"]);
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain("tmux backend unavailable");

    const available = runSelector(makeBinDir({ tmux: true }), [
      "--backend=tmux",
    ]);
    expect(available.exitCode).toBe(0);
    expect(available.stdout).toContain("backend=tmux");
    expect(available.stdout).toContain(
      "reason=explicit tmux request passed binary preflight",
    );
  });

  test("invalid backend input is a usage error", () => {
    const result = runSelector(makeBinDir({ tmux: true }), [
      "--backend",
      "screen",
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("expected --backend auto|hc|herdr-core|orca|herdr|tmux");
  });
});
