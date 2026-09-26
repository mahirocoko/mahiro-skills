import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createHash } from "crypto";

const repoRoot = join(import.meta.dir, "..");
const scriptsRoot = join(repoRoot, "skills", "ccc", "scripts");
const syncScript = join(scriptsRoot, "sync-project-excludes.py");
const preflightScript = join(scriptsRoot, "preflight.py");
const strictScript = join(scriptsRoot, "strict-gitleaks-scan.py");

const decoder = new TextDecoder();

type ProcessResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function run(command: string[], env?: Record<string, string>): ProcessResult {
  const result = Bun.spawnSync({
    cmd: command,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: decoder.decode(result.stdout),
    stderr: decoder.decode(result.stderr),
  };
}

function makeProject() {
  const root = mkdtempSync(join(tmpdir(), "mahiro-ccc-v2-"));
  mkdirSync(join(root, ".cocoindex_code"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "keys"), { recursive: true });
  mkdirSync(join(root, ".claude"), { recursive: true });
  mkdirSync(join(root, ".letta"), { recursive: true });
  mkdirSync(join(root, ".agent-state"), { recursive: true });
  mkdirSync(join(root, ".github"), { recursive: true });
  mkdirSync(join(root, ".config", "gcloud"), { recursive: true });
  mkdirSync(join(root, ".config", "gh"), { recursive: true });
  mkdirSync(join(root, ".config", "aws"), { recursive: true });
  mkdirSync(join(root, "credentials"), { recursive: true });
  mkdirSync(join(root, "secrets"), { recursive: true });
  mkdirSync(join(root, "private-keys"), { recursive: true });
  writeFileSync(join(root, ".gitignore"), ".cocoindex_code/\n", "utf8");
  writeFileSync(
    join(root, ".cocoindex_code", "settings.yml"),
    [
      "custom_option: keep",
      "exclude_patterns:",
      '- "**/*.json"',
      '- "**/keep-me"',
      "include_patterns:",
      '- "**/*.json"',
      '- "**/*.txt"',
      "",
    ].join("\n"),
    "utf8",
  );
  chmodSync(join(root, ".cocoindex_code", "settings.yml"), 0o640);
  writeFileSync(join(root, "docs", "token-guide.md"), "ordinary documentation about a token word\n", "utf8");
  writeFileSync(join(root, "docs", "keep-me"), "excluded by an unrelated project pattern\n", "utf8");
  const safeExample = ["PUBLIC", "_", "EXAMPLE", "_", "VALUE"].join("");
  writeFileSync(join(root, ".env.example"), `${safeExample}=safe\n`, "utf8");
  writeFileSync(join(root, ".env.sample"), "PUBLIC_SAMPLE=safe\n", "utf8");
  writeFileSync(join(root, ".env.template"), "PUBLIC_TEMPLATE=safe\n", "utf8");
  writeFileSync(join(root, ".env"), "REAL_ENV=safe fixture\n", "utf8");
  writeFileSync(join(root, ".env.local"), "LOCAL_ONLY=safe fixture\n", "utf8");
  writeFileSync(join(root, ".env.development"), "DEVELOPMENT_ONLY=safe fixture\n", "utf8");
  writeFileSync(join(root, ".env.production"), "PRODUCTION_ONLY=safe fixture\n", "utf8");
  writeFileSync(join(root, ".env.test"), "TEST_ONLY=safe fixture\n", "utf8");
  writeFileSync(join(root, ".env.staging"), "STAGING_ONLY=safe fixture\n", "utf8");
  writeFileSync(join(root, ".envrc"), "ENVRC_ONLY=safe fixture\n", "utf8");
  writeFileSync(join(root, "config", "data.json"), '{"name":"safe"}\n', "utf8");
  writeFileSync(join(root, "config", "data.yaml"), "name: safe\n", "utf8");
  writeFileSync(join(root, "config", "data.toml"), "name = 'safe'\n", "utf8");
  writeFileSync(join(root, "config", "data.xml"), "<name>safe</name>\n", "utf8");
  writeFileSync(join(root, "docs", "readme.txt"), "safe text\n", "utf8");
  writeFileSync(join(root, ".claude", "settings.local.json"), '{"local":true}\n', "utf8");
  writeFileSync(join(root, ".letta", "state.json"), '{"local":true}\n', "utf8");
  writeFileSync(join(root, ".letta", "settings.local.json"), '{"local":true}\n', "utf8");
  writeFileSync(join(root, ".agent-state", "session.txt"), "local state\n", "utf8");
  writeFileSync(join(root, ".github", "workflow.yml"), "name: safe\n", "utf8");
  writeFileSync(join(root, ".config", "gcloud", "config.json"), '{"local":true}\n', "utf8");
  writeFileSync(join(root, ".config", "gh", "hosts.yml"), "github: safe fixture\n", "utf8");
  writeFileSync(join(root, ".config", "aws", "config"), "aws safe fixture\n", "utf8");
  writeFileSync(join(root, "credentials", "local.txt"), "credential safe fixture\n", "utf8");
  writeFileSync(join(root, "secrets", "local.txt"), "secret safe fixture\n", "utf8");
  writeFileSync(join(root, "private-keys", "local.txt"), "key safe fixture\n", "utf8");
  writeFileSync(join(root, "keys", "id.key"), "safe fixture key path\n", "utf8");
  writeFileSync(join(root, "credentials.json"), '{"name":"safe fixture"}\n', "utf8");
  run(["git", "-C", root, "init", "--quiet"]);
  run(["git", "-C", root, "add", "-f", "--", ".claude/settings.local.json", ".letta/state.json", ".letta/settings.local.json", ".agent-state/session.txt", ".github/workflow.yml"]);
  return root;
}

function writeFakeScanner(root: string) {
  const scanner = join(root, "fake-gitleaks.py");
  writeFileSync(
    scanner,
    [
      "#!/usr/bin/env python3",
      "import json",
      "import os",
      "import stat",
      "import sys",
      "from pathlib import Path",
      "",
      "if len(sys.argv) > 1 and sys.argv[1] == 'version':",
      "    print('gitleaks version 8.30.1')",
      "    raise SystemExit(0)",
      "report = Path(sys.argv[sys.argv.index('--report-path') + 1])",
      "target = Path(sys.argv[-1])",
      "capture_path = os.environ.get('FAKE_GITLEAKS_CAPTURE')",
      "reappear_path = os.environ.get('FAKE_GITLEAKS_REAPPEAR_PATH')",
      "if reappear_path:",
      "    Path(reappear_path).write_text('reappeared during scan\\n', encoding='utf-8')",
      "if capture_path:",
      "    source = target / 'docs' / 'token-guide.md'",
      "    staged_files = sorted(path.relative_to(target).as_posix() for path in target.rglob('*') if path.is_file())",
      "    capture = {'argv': sys.argv, 'root_mode': stat.S_IMODE(target.stat().st_mode), 'env_example': (target / '.env.example').exists(), 'files': staged_files}",
      "    if source.exists():",
      "        source_info = source.stat()",
      "        capture.update({'source_mode': stat.S_IMODE(source_info.st_mode), 'source_nlink': source_info.st_nlink})",
      "    Path(capture_path).write_text(json.dumps(capture), encoding='utf-8')",
      "mode = os.environ.get('FAKE_GITLEAKS_MODE', 'clean')",
      "finding = {'path': 'docs/token-guide.md', 'line': 1, 'rule_id': 'fixture-rule'}",
      "if mode in ('finding', 'finding-runtime-1', 'mismatched-clean'):",
      "    payload = [finding]",
      "elif mode == 'leak':",
      "    payload = [{'path': 'docs/token-guide.md', 'line': 1, 'rule_id': 'fixture-rule', 'secret': 'DO_NOT_EMIT'}]",
      "elif mode == 'malformed':",
      "    report.write_text('not-json', encoding='utf-8')",
      "    raise SystemExit(0)",
      "else:",
      "    payload = []",
      "report.write_text(json.dumps(payload), encoding='utf-8')",
      "if mode == 'error':",
      "    raise SystemExit(2)",
      "if mode == 'finding-runtime-1':",
      "    raise SystemExit(1)",
      "if mode == 'mismatched-clean':",
      "    raise SystemExit(0)",
      "if mode == 'mismatched-findings':",
      "    raise SystemExit(3)",
      "raise SystemExit(3 if mode == 'finding' else 0)",
      "",
    ].join("\n"),
    "utf8",
  );
  chmodSync(scanner, 0o755);
  return scanner;
}

function writeFailingCheckIgnore(realGit: string) {
  const binRoot = mkdtempSync(join(tmpdir(), "mahiro-ccc-git-failure-"));
  const fakeGit = join(binRoot, "git");
  writeFileSync(
    fakeGit,
    [
      "#!/bin/sh",
      "for arg in \"$@\"; do",
      "  if [ \"$arg\" = check-ignore ]; then exit 42; fi",
      "done",
      `exec ${JSON.stringify(realGit)} \"$@\"`,
      "",
    ].join("\n"),
    "utf8",
  );
  chmodSync(fakeGit, 0o755);
  return binRoot;
}

function writeContradictoryCheckIgnore(realGit: string) {
  const binRoot = mkdtempSync(join(tmpdir(), "mahiro-ccc-git-contradiction-"));
  const fakeGit = join(binRoot, "git");
  writeFileSync(
    fakeGit,
    [
      "#!/usr/bin/env python3",
      "import os",
      "import sys",
      "",
      "if 'check-ignore' in sys.argv:",
      "    names = [name for name in sys.stdin.buffer.read().split(b'\\0') if name]",
      "    fields = []",
      "    for name in names:",
      "        fields.extend((b'/tmp/forged-excludes', b'1', b'**/forged', name))",
      "    sys.stdout.buffer.write(b'\\0'.join(fields) + b'\\0')",
      "    raise SystemExit(1)",
      `os.execv(${JSON.stringify(realGit)}, [${JSON.stringify(realGit)}, *sys.argv[1:]])`,
      "",
    ].join("\n"),
    "utf8",
  );
  chmodSync(fakeGit, 0o755);
  return binRoot;
}

function parseJson(stdout: string) {
  return JSON.parse(stdout.trim()) as Record<string, unknown>;
}

function metadataFingerprint(path: string, ruleId: string, line: number) {
  return createHash("sha256").update(`${path}\0${ruleId}\0${line}`, "utf8").digest("hex");
}

function withProject(callback: (root: string) => void) {
  const root = makeProject();
  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("CocoIndex security V2 package", () => {
  test("keeps durable state and structured data eligible while routing dotenv templates through strict scan", () => {
    withProject((root) => {
      const sync = run(["python3", syncScript, "--project-root", root]);
      expect(sync.exitCode).toBe(0);
      const sourceReadTraps = [
        ".env.example",
        ".env.sample",
        ".env.template",
        ".agent-state/session.txt",
        ".letta/state.json",
        "config/data.json",
      ];
      for (const relativePath of sourceReadTraps) {
        chmodSync(join(root, relativePath), 0o000);
      }
      let preflight: ProcessResult;
      try {
        preflight = run(["python3", preflightScript, "--project-root", root]);
      } finally {
        for (const relativePath of sourceReadTraps) {
          chmodSync(join(root, relativePath), 0o640);
        }
      }
      expect(preflight.exitCode).toBe(0);
      const result = parseJson(preflight.stdout);
      expect(result.mode).toBe("filename-only");
      expect(result.equivalent_to_strict).toBe(false);
      expect(result.scope_kind).toBe("git-candidate-regular-files-before-settings-excludes");
      expect(result.classification_counts).toMatchObject({
        "content-scan": expect.any(Number),
        "content-scan-dotenv-template": 3,
      });
      expect(result.dotenv_template_content_scan_paths).toEqual([".env.example", ".env.sample", ".env.template"]);
      expect(result.derived_sensitive_paths).toEqual(
        expect.arrayContaining([
          ".env",
          ".env.local",
          ".env.development",
          ".env.production",
          ".env.test",
          ".env.staging",
          ".envrc",
          ".claude/settings.local.json",
          ".letta/settings.local.json",
          ".config/gcloud/config.json",
          ".config/gh/hosts.yml",
          ".config/aws/config",
          "credentials/local.txt",
          "secrets/local.txt",
          "private-keys/local.txt",
          "credentials.json",
          "keys/id.key",
        ]),
      );
      expect(result.derived_sensitive_paths).not.toContain(".env.sample");
      expect(result.derived_sensitive_paths).not.toContain(".env.template");
      expect(result.derived_sensitive_paths).not.toContain(".letta/state.json");
      expect(result.derived_sensitive_paths).not.toContain("docs/token-guide.md");
      expect(result.derived_sensitive_paths).not.toContain(".github/workflow.yml");
      expect(result.derived_sensitive_paths).not.toContain(".agent-state/session.txt");

      const settings = readFileSync(join(root, ".cocoindex_code", "settings.yml"), "utf8");
      const excludeSection = settings.split("include_patterns:", 1)[0];
      const includeSection = settings.split("include_patterns:", 2)[1];
      for (const broadPattern of ["**/*.json", "**/*.yaml", "**/*.yml", "**/*.toml", "**/*.xml", "**/*.txt", "**/.*", "**/*.env.*"]) {
        expect(excludeSection).not.toContain(broadPattern);
      }
      expect(includeSection).toContain('- "**/*.json"');
      expect(settings).toContain('- "**/.letta/settings.local.json"');
      expect(settings).toContain('- "**/.claude/settings.local.json"');
      expect(settings).not.toContain('- "**/.letta/**"');
      expect(settings).not.toContain('- "**/.agent-state"');
      expect(excludeSection).not.toContain('- "**/.env.sample"');
      expect(excludeSection).not.toContain('- "**/.env.template"');
      expect(settings).toContain('# BEGIN MAHIRO CCC V2 MANAGED INCLUDES');
      expect(settings).toContain('- "**/.env.example"');
      expect(settings).toContain('- "**/.env.sample"');
      expect(settings).toContain('- "**/.env.template"');
      expect(settings).toContain("custom_option: keep");
      expect(readFileSync(join(repoRoot, "skills", "ccc", "resources", "portable-credential-deny-baseline.txt"), "utf8")).not.toContain("**/*.json");
    });
  });

  test("pins the current Gitleaks config and metadata-only template", () => {
    expect(existsSync(join(repoRoot, "skills", "cocoindex-rules-init", "scripts"))).toBe(false);
    expect(existsSync(join(repoRoot, "skills", "cocoindex-rules-init", "resources"))).toBe(false);
    const config = readFileSync(join(repoRoot, "skills", "ccc", "resources", "gitleaks-config.toml"), "utf8");
    const template = readFileSync(join(repoRoot, "skills", "ccc", "resources", "gitleaks-metadata-report.tmpl"), "utf8");
    expect(config).toContain('minVersion = "v8.30.1"');
    expect(config).toContain("useDefault = true");
    expect(config).toContain("[[allowlists]]");
    expect(config).not.toContain("[allowlist]");
    for (const duplicateRule of ["mahiro-private-key", "mahiro-aws-access-key-id", "mahiro-github-token", "mahiro-slack-token"]) {
      expect(config).not.toContain(duplicateRule);
    }
    expect(template).not.toContain("Fingerprint");
    expect(template).toContain("$finding.File");
    expect(template).toContain("$finding.StartLine");
    expect(template).toContain("$finding.RuleID");
  });

  test("local policy can add denies but cannot allow or weaken the baseline", () => {
    withProject((root) => {
      const policyPath = join(root, "local-deny-policy.txt");
      writeFileSync(policyPath, "**/custom-private/**\n", "utf8");
      expect(run(["python3", syncScript, "--project-root", root, "--local-policy", policyPath]).exitCode).toBe(0);
      expect(readFileSync(join(root, ".cocoindex_code", "settings.yml"), "utf8")).toContain('"**/custom-private/**"');
      writeFileSync(policyPath, "!**/custom-private/**\n", "utf8");
      expect(run(["python3", syncScript, "--project-root", root, "--local-policy", policyPath]).exitCode).toBe(2);
    });
  });

  test("sync is atomic, idempotent, preserves unrelated settings, and supports check", () => {
    withProject((root) => {
      const settingsPath = join(root, ".cocoindex_code", "settings.yml");
      const first = run(["python3", syncScript, "--project-root", root]);
      expect(first.exitCode).toBe(0);
      const firstText = readFileSync(settingsPath, "utf8");
      const second = run(["python3", syncScript, "--project-root", root]);
      expect(second.exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toBe(firstText);
      const check = run(["python3", syncScript, "--project-root", root, "--check"]);
      expect(check.exitCode).toBe(0);
      expect((readFileSync(settingsPath, "utf8").match(/BEGIN MAHIRO CCC V2 MANAGED EXCLUDES/g) ?? []).length).toBe(1);
      expect((readFileSync(settingsPath, "utf8").match(/END MAHIRO CCC V2 MANAGED EXCLUDES/g) ?? []).length).toBe(1);
      expect((readFileSync(settingsPath, "utf8").match(/BEGIN MAHIRO CCC V2 MANAGED INCLUDES/g) ?? []).length).toBe(1);
      expect((readFileSync(settingsPath, "utf8").match(/END MAHIRO CCC V2 MANAGED INCLUDES/g) ?? []).length).toBe(1);
      expect(statSync(settingsPath).mode & 0o777).toBe(0o640);
      expect(existsSync(join(root, ".cocoindex_code", ".settings.yml."))).toBe(false);

      writeFileSync(
        settingsPath,
        [
          "include_patterns:",
          '  - "**/*.py"',
          "exclude_patterns:",
          '  - "**/.git"',
          "",
        ].join("\n"),
        "utf8",
      );
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      const includeFirstText = readFileSync(settingsPath, "utf8");
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(0);
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toBe(includeFirstText);

      const driftBase = readFileSync(settingsPath, "utf8");
      writeFileSync(settingsPath, driftBase.replace('**/.env"', '**/.env-changed"'), "utf8");
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(1);
    });
  });

  test("fails closed for malformed, symlinked, and unsafe inputs", () => {
    withProject((root) => {
      const unsafeCandidate = join(root, "unsafe-link.md");
      symlinkSync(join(root, "docs", "token-guide.md"), unsafeCandidate);
      const trackedLink = join(root, "tracked-link.md");
      symlinkSync(join(root, "docs", "token-guide.md"), trackedLink);
      expect(run(["git", "-C", root, "add", "--", "tracked-link.md"]).exitCode).toBe(0);
      const symlinkPreflight = run(["python3", preflightScript, "--project-root", root]);
      expect(symlinkPreflight.exitCode).toBe(2);
      expect(symlinkPreflight.stderr).toContain("symlinked project candidate is not accepted");
      rmSync(unsafeCandidate, { force: true });
      rmSync(trackedLink, { force: true });
      expect(run(["git", "-C", root, "update-index", "--force-remove", "tracked-link.md"]).exitCode).toBe(0);

      const intermediateLink = join(root, "linked-source");
      symlinkSync(join(root, "docs"), intermediateLink);
      const blob = run(["git", "-C", root, "hash-object", "-w", join(root, "docs", "token-guide.md")]).stdout.trim();
      expect(run(["git", "-C", root, "update-index", "--add", "--cacheinfo", `100644,${blob},linked-source/ghost.md`]).exitCode).toBe(0);
      expect(run(["python3", preflightScript, "--project-root", root]).exitCode).toBe(2);
      rmSync(intermediateLink, { force: true });
      expect(run(["git", "-C", root, "update-index", "--force-remove", "linked-source/ghost.md"]).exitCode).toBe(0);

      const localPolicyTarget = join(root, "local-policy-target.txt");
      const localPolicy = join(root, "local-policy.txt");
      writeFileSync(localPolicyTarget, "**/local-only/**\n", "utf8");
      symlinkSync(localPolicyTarget, localPolicy);
      expect(run(["python3", preflightScript, "--project-root", root, "--local-policy", localPolicy]).exitCode).toBe(2);
      rmSync(localPolicy, { force: true });

      const outputDir = join(root, ".cocoindex_code", "ccc-security");
      mkdirSync(outputDir, { recursive: true });
      const outputTarget = join(root, "safe-report-target.json");
      writeFileSync(outputTarget, "{}\n", "utf8");
      const reportPath = join(outputDir, "report.json");
      symlinkSync(outputTarget, reportPath);
      const outputScanner = writeFakeScanner(root);
      expect(run(["python3", strictScript, "scan", "--project-root", root, "--gitleaks", outputScanner, "--report", ".cocoindex_code/ccc-security/report.json", "--receipt", ".cocoindex_code/ccc-security/receipt.json"]).exitCode).toBe(2);
      rmSync(reportPath, { force: true });
      const receiptTarget = join(root, "safe-receipt-target.json");
      writeFileSync(receiptTarget, "{}\n", "utf8");
      const receiptPath = join(outputDir, "receipt.json");
      symlinkSync(receiptTarget, receiptPath);
      expect(run(["python3", strictScript, "scan", "--project-root", root, "--gitleaks", outputScanner, "--report", ".cocoindex_code/ccc-security/report.json", "--receipt", ".cocoindex_code/ccc-security/receipt.json"]).exitCode).toBe(2);
      rmSync(receiptPath, { force: true });

      const settingsPath = join(root, ".cocoindex_code", "settings.yml");
      writeFileSync(settingsPath, "exclude_patterns: [\n", "utf8");
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);
      writeFileSync(settingsPath, 'exclude_patterns:\n- "**/.git"\ninclude_patterns: [\n', "utf8");
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);

      rmSync(settingsPath, { force: true });
      const target = join(root, ".cocoindex_code", "settings-target.yml");
      writeFileSync(target, "exclude_patterns:\n", "utf8");
      symlinkSync(target, settingsPath);
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);
    });
  });

  test("strict mode binds the scanner, snapshot, exit contract, and receipt invalidation", () => {
    withProject((root) => {
      const report = ".cocoindex_code/ccc-security/report.json";
      const receipt = ".cocoindex_code/ccc-security/receipt.json";
      const captureRoot = mkdtempSync(join(tmpdir(), "mahiro-ccc-capture-"));
      try {
        expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);

        const scanner = writeFakeScanner(root);
        const scannerSha256 = createHash("sha256").update(readFileSync(scanner)).digest("hex");
        const capturePath = join(captureRoot, "scan.json");
        const invoke = (action: "scan" | "check", env?: Record<string, string>, extra: string[] = []) =>
          run(
            [
              "python3",
              strictScript,
              action,
              "--project-root",
              root,
              "--gitleaks",
              scanner,
              "--expected-binary-sha256",
              scannerSha256,
              "--report",
              report,
              "--receipt",
              receipt,
              ...extra,
            ],
            env,
          );

        const excludedReadTrapPaths = [
          ".env",
          ".env.local",
          ".env.development",
          ".env.production",
          ".env.test",
          ".env.staging",
          ".envrc",
          ".letta/settings.local.json",
          ".claude/settings.local.json",
          ".config/gcloud/config.json",
          ".config/gh/hosts.yml",
          ".config/aws/config",
          "credentials/local.txt",
          "secrets/local.txt",
          "private-keys/local.txt",
          "credentials.json",
          "keys/id.key",
          "docs/keep-me",
        ];
        for (const relativePath of excludedReadTrapPaths) {
          chmodSync(join(root, relativePath), 0o000);
        }
        let clean: ProcessResult;
        try {
          clean = invoke("scan", { FAKE_GITLEAKS_MODE: "clean", FAKE_GITLEAKS_CAPTURE: capturePath });
        } finally {
          for (const relativePath of excludedReadTrapPaths) {
            chmodSync(join(root, relativePath), 0o640);
          }
        }
        expect(clean.exitCode).toBe(0);
        const capture = parseJson(readFileSync(capturePath, "utf8"));
        const argv = capture.argv as string[];
        expect(argv).not.toContain("--source");
        expect(argv.at(-1)).toContain("mahiro-ccc-gitleaks-");
        expect(capture.env_example).toBe(true);
        expect(capture.root_mode).toBe(0o700);
        expect(capture.source_mode).toBe(0o600);
        expect(capture.source_nlink).toBe(1);
        const stagedFiles = capture.files as string[];
        expect(stagedFiles).toContain(".env.example");
        expect(stagedFiles).toContain(".env.sample");
        expect(stagedFiles).toContain(".env.template");
        expect(stagedFiles).toContain(".agent-state/session.txt");
        expect(stagedFiles).toContain(".letta/state.json");
        expect(stagedFiles).toContain("config/data.json");
        expect(stagedFiles).toContain("config/data.yaml");
        expect(stagedFiles).toContain("config/data.toml");
        expect(stagedFiles).toContain("config/data.xml");
        expect(stagedFiles).toContain("docs/readme.txt");
        expect(stagedFiles).not.toContain("docs/keep-me");
        expect(stagedFiles).not.toContain(".env");
        expect(stagedFiles).not.toContain(".env.local");
        expect(stagedFiles).not.toContain(".env.development");
        expect(stagedFiles).not.toContain(".env.production");
        expect(stagedFiles).not.toContain(".env.test");
        expect(stagedFiles).not.toContain(".env.staging");
        expect(stagedFiles).not.toContain(".envrc");
        expect(stagedFiles).not.toContain(".letta/settings.local.json");
        expect(stagedFiles).not.toContain(".claude/settings.local.json");
        expect(stagedFiles).not.toContain(".config/gcloud/config.json");
        expect(stagedFiles).not.toContain(".config/gh/hosts.yml");
        expect(stagedFiles).not.toContain(".config/aws/config");
        expect(stagedFiles).not.toContain("credentials/local.txt");
        expect(stagedFiles).not.toContain("secrets/local.txt");
        expect(stagedFiles).not.toContain("private-keys/local.txt");
        expect(stagedFiles).not.toContain("credentials.json");
        expect(stagedFiles).not.toContain("keys/id.key");
        expect(stagedFiles).not.toContain(".cocoindex_code/settings.yml");
        const cleanReceipt = JSON.parse(readFileSync(join(root, receipt), "utf8")) as Record<string, any>;
        expect(cleanReceipt.scanner.binary_sha256).toBe(scannerSha256);
        expect(invoke("check").exitCode).toBe(0);

        const scannerError = invoke("scan", { FAKE_GITLEAKS_MODE: "error" });
        expect(scannerError.exitCode).toBe(2);
        expect(existsSync(join(root, receipt))).toBe(false);
        expect(invoke("check").exitCode).toBe(4);
        expect(scannerError.stdout).not.toContain("DO_NOT_EMIT");
        expect(scannerError.stderr).not.toContain("DO_NOT_EMIT");

        const mismatchedClean = invoke("scan", { FAKE_GITLEAKS_MODE: "mismatched-clean" });
        expect(mismatchedClean.exitCode).toBe(2);
        const mismatchedFindings = invoke("scan", { FAKE_GITLEAKS_MODE: "mismatched-findings" });
        expect(mismatchedFindings.exitCode).toBe(2);
        const runtimeFinding = invoke("scan", { FAKE_GITLEAKS_MODE: "finding-runtime-1" });
        expect(runtimeFinding.exitCode).toBe(2);
        expect(invoke("scan", { FAKE_GITLEAKS_MODE: "clean" }).exitCode).toBe(0);

        writeFileSync(join(root, "docs", "token-guide.md"), "ordinary documentation changed safely\n", "utf8");
        expect(invoke("check").exitCode).toBe(4);

        const finding = invoke("scan", { FAKE_GITLEAKS_MODE: "finding" });
        expect(finding.exitCode).toBe(3);
        const findingReport = JSON.parse(readFileSync(join(root, report), "utf8")) as Record<string, unknown>;
        expect(findingReport.findings).toEqual([
          {
            path: "docs/token-guide.md",
            line: 1,
            rule_id: "fixture-rule",
            fingerprint: metadataFingerprint("docs/token-guide.md", "fixture-rule", 1),
          },
        ]);
        expect(invoke("check").exitCode).toBe(3);
        expect(readFileSync(join(root, report), "utf8")).not.toContain("DO_NOT_EMIT");

        const wrongExpected = invoke("scan", { FAKE_GITLEAKS_MODE: "clean" }, ["--expected-binary-sha256", "0".repeat(64)]);
        expect(wrongExpected.exitCode).toBe(2);
        expect(invoke("check").exitCode).toBe(4);
      } finally {
        rmSync(captureRoot, { recursive: true, force: true });
      }
    });
  });

  test("strict scope excludes CCC runtime outputs while binding settings", () => {
    withProject((root) => {
      const report = ".cocoindex_code/ccc-security/report.json";
      const receipt = ".cocoindex_code/ccc-security/receipt.json";
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      const scanner = writeFakeScanner(root);
      const scannerSha256 = createHash("sha256").update(readFileSync(scanner)).digest("hex");
      const baseline = parseJson(run(["python3", preflightScript, "--project-root", root]).stdout);
      const runtimeOutput = join(root, ".cocoindex_code", "ccc-security", "old-report.json");
      mkdirSync(join(root, ".cocoindex_code", "ccc-security"), { recursive: true });
      writeFileSync(runtimeOutput, '{"status":"old"}\n', "utf8");
      expect(run(["git", "-C", root, "add", "-f", ".cocoindex_code/ccc-security/old-report.json"]).exitCode).toBe(0);
      const captureRoot = mkdtempSync(join(tmpdir(), "mahiro-ccc-runtime-capture-"));
      const capturePath = join(captureRoot, "scan.json");
      const clean = run(
        ["python3", strictScript, "scan", "--project-root", root, "--gitleaks", scanner, "--expected-binary-sha256", scannerSha256, "--report", report, "--receipt", receipt],
        { FAKE_GITLEAKS_MODE: "clean", FAKE_GITLEAKS_CAPTURE: capturePath },
      );
      expect(clean.exitCode).toBe(0);
      const capture = parseJson(readFileSync(capturePath, "utf8"));
      expect(capture.files as string[]).not.toContain(".cocoindex_code/ccc-security/old-report.json");
      expect(capture.files as string[]).not.toContain(".cocoindex_code/settings.yml");
      rmSync(captureRoot, { recursive: true, force: true });
      const strictReceipt = JSON.parse(readFileSync(join(root, receipt), "utf8")) as Record<string, any>;
      expect(strictReceipt.scope.file_count).toBeLessThan(baseline.candidate_count as number);
      expect(strictReceipt.scope.scope_kind).toBe("post-settings/index-candidate-regular-files");
      expect(strictReceipt.scope.candidate_source).toBe("tracked-and-untracked-nonignored-regular-files");
      expect(strictReceipt.scope.settings_excludes_applied).toBe(true);
      expect(strictReceipt.settings_sha256).toBe(strictReceipt.scanner.settings_sha256);
      expect(strictReceipt.scanner.binary_sha256).toMatch(/^[0-9a-f]{64}$/);

      const settingsPath = join(root, ".cocoindex_code", "settings.yml");
      writeFileSync(settingsPath, readFileSync(settingsPath, "utf8").replace("custom_option: keep", "custom_option: changed"), "utf8");
      expect(run(["python3", strictScript, "check", "--project-root", root, "--gitleaks", scanner, "--expected-binary-sha256", scannerSha256, "--report", report, "--receipt", receipt]).exitCode).toBe(4);
    });
  });

  test("strict matching fails closed for unsupported settings syntax and Git failures", () => {
    withProject((root) => {
      const report = ".cocoindex_code/ccc-security/report.json";
      const receipt = ".cocoindex_code/ccc-security/receipt.json";
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      const scanner = writeFakeScanner(root);
      const scannerSha256 = createHash("sha256").update(readFileSync(scanner)).digest("hex");
      const settingsPath = join(root, ".cocoindex_code", "settings.yml");
      const synchronizedSettings = readFileSync(settingsPath, "utf8");
      writeFileSync(settingsPath, synchronizedSettings.replace("exclude_patterns:\n", 'exclude_patterns: ["**/unsupported"]\n'), "utf8");
      const malformed = run([
        "python3",
        strictScript,
        "scan",
        "--project-root",
        root,
        "--gitleaks",
        scanner,
        "--expected-binary-sha256",
        scannerSha256,
        "--report",
        report,
        "--receipt",
        receipt,
      ]);
      expect(malformed.exitCode).toBe(2);
      writeFileSync(settingsPath, synchronizedSettings, "utf8");

      const realGit = run(["/bin/sh", "-c", "command -v git"]).stdout.trim();
      expect(realGit.length).toBeGreaterThan(0);
      const failingGitRoot = writeFailingCheckIgnore(realGit);
      try {
        const gitFailure = run(
          [
            "python3",
            strictScript,
            "scan",
            "--project-root",
            root,
            "--gitleaks",
            scanner,
            "--expected-binary-sha256",
            scannerSha256,
            "--report",
            report,
            "--receipt",
            receipt,
          ],
          { PATH: `${failingGitRoot}:${process.env.PATH ?? ""}` },
        );
        expect(gitFailure.exitCode).toBe(2);
      } finally {
        rmSync(failingGitRoot, { recursive: true, force: true });
      }

      const contradictoryGitRoot = writeContradictoryCheckIgnore(realGit);
      try {
        const contradictoryStatus = run(
          [
            "python3",
            strictScript,
            "scan",
            "--project-root",
            root,
            "--gitleaks",
            scanner,
            "--expected-binary-sha256",
            scannerSha256,
            "--report",
            report,
            "--receipt",
            receipt,
          ],
          { PATH: `${contradictoryGitRoot}:${process.env.PATH ?? ""}` },
        );
        expect(contradictoryStatus.exitCode).toBe(2);
        expect(contradictoryStatus.stderr).toContain("status contradicted its match output");
      } finally {
        rmSync(contradictoryGitRoot, { recursive: true, force: true });
      }
    });
  });

  test("strict matching accepts Git's no-path-ignored exit with complete non-matching output", () => {
    const root = mkdtempSync(join(tmpdir(), "mahiro-ccc-no-excludes-"));
    try {
      mkdirSync(join(root, ".cocoindex_code"), { recursive: true });
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, ".gitignore"), ".cocoindex_code/\n", "utf8");
      writeFileSync(join(root, ".cocoindex_code", "settings.yml"), "exclude_patterns:\n", "utf8");
      writeFileSync(join(root, "docs", "readme.md"), "safe documentation\n", "utf8");
      expect(run(["git", "-C", root, "init", "--quiet"]).exitCode).toBe(0);
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);

      const scanner = writeFakeScanner(root);
      const scannerSha256 = createHash("sha256").update(readFileSync(scanner)).digest("hex");
      const result = run([
        "python3",
        strictScript,
        "scan",
        "--project-root",
        root,
        "--gitleaks",
        scanner,
        "--expected-binary-sha256",
        scannerSha256,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("strict Gitleaks scan completed");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("tracked worktree deletions are not treated as readable source candidates", () => {
    withProject((root) => {
      const deletedPath = join(root, "docs", "deleted-source.md");
      writeFileSync(deletedPath, "tracked before deletion\n", "utf8");
      expect(run(["git", "-C", root, "add", "--", "docs/deleted-source.md"]).exitCode).toBe(0);
      rmSync(deletedPath);

      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(run(["python3", preflightScript, "--project-root", root, "--check-settings"]).exitCode).toBe(0);

      const scanner = writeFakeScanner(root);
      const scannerSha256 = createHash("sha256").update(readFileSync(scanner)).digest("hex");
      const captureRoot = mkdtempSync(join(tmpdir(), "mahiro-ccc-deleted-capture-"));
      try {
        const capturePath = join(captureRoot, "scan.json");
        const result = run(
          [
            "python3",
            strictScript,
            "scan",
            "--project-root",
            root,
            "--gitleaks",
            scanner,
            "--expected-binary-sha256",
            scannerSha256,
          ],
          { FAKE_GITLEAKS_CAPTURE: capturePath },
        );
        expect(result.exitCode).toBe(0);
        const capture = parseJson(readFileSync(capturePath, "utf8"));
        expect(capture.files as string[]).not.toContain("docs/deleted-source.md");
      } finally {
        rmSync(captureRoot, { recursive: true, force: true });
      }
    });
  });

  test("strict scan rejects a tracked deletion that reappears while scanning", () => {
    withProject((root) => {
      const deletedPath = join(root, "docs", "reappearing-source.md");
      writeFileSync(deletedPath, "tracked before deletion\n", "utf8");
      expect(run(["git", "-C", root, "add", "--", "docs/reappearing-source.md"]).exitCode).toBe(0);
      rmSync(deletedPath);
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);

      const scanner = writeFakeScanner(root);
      const scannerSha256 = createHash("sha256").update(readFileSync(scanner)).digest("hex");
      const result = run(
        [
          "python3",
          strictScript,
          "scan",
          "--project-root",
          root,
          "--gitleaks",
          scanner,
          "--expected-binary-sha256",
          scannerSha256,
        ],
        { FAKE_GITLEAKS_REAPPEAR_PATH: deletedPath },
      );

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("source scope changed during strict scan");
      expect(existsSync(join(root, ".cocoindex_code", "ccc-security", "strict-receipt.json"))).toBe(false);
    });
  });

  test("strict metadata validation rejects raw fields and filename-only never downgrades", () => {
    withProject((root) => {
      const scanner = writeFakeScanner(root);
      const scannerSha256 = createHash("sha256").update(readFileSync(scanner)).digest("hex");
      const report = ".cocoindex_code/ccc-security/report.json";
      const receipt = ".cocoindex_code/ccc-security/receipt.json";
      expect(run(["python3", strictScript, "scan", "--project-root", root, "--gitleaks", scanner, "--report", report, "--receipt", receipt]).exitCode).toBe(2);
      const leak = run(["python3", strictScript, "scan", "--project-root", root, "--gitleaks", scanner, "--expected-binary-sha256", scannerSha256, "--report", report, "--receipt", receipt], { FAKE_GITLEAKS_MODE: "leak" });
      expect(leak.exitCode).toBe(2);
      expect(leak.stdout).not.toContain("DO_NOT_EMIT");
      expect(leak.stderr).not.toContain("DO_NOT_EMIT");

      const filenameOnly = run(["python3", strictScript, "filename-only", "--project-root", root, "--report", report, "--receipt", receipt]);
      expect(filenameOnly.exitCode).toBe(0);
      const preflightReport = JSON.parse(readFileSync(join(root, report), "utf8")) as Record<string, unknown>;
      expect(preflightReport.mode).toBe("filename-only");
      expect(preflightReport.equivalent_to_strict).toBe(false);
      expect(preflightReport.status).toBe("non-equivalent");

      const strictMissing = run(["python3", strictScript, "scan", "--project-root", root, "--gitleaks", join(root, "missing-gitleaks"), "--report", report, "--receipt", receipt]);
      expect(strictMissing.exitCode).toBe(2);
      const blockedReport = readFileSync(join(root, report), "utf8");
      expect(blockedReport).toContain('"mode": "strict"');
      expect(blockedReport).not.toContain("DO_NOT_EMIT");
    });
  });

  test("fails closed on candidate symlinks across Git and non-Git fallback paths with non-secret errors", () => {
    withProject((root) => {
      // 1. Untracked file symlink in Git
      const fileSymlink = join(root, "untracked-symlink.txt");
      symlinkSync(join(root, "docs", "token-guide.md"), fileSymlink);
      const untrackedPreflight = run(["python3", preflightScript, "--project-root", root]);
      expect(untrackedPreflight.exitCode).toBe(2);
      expect(untrackedPreflight.stderr).toContain("symlinked project candidate is not accepted");
      expect(untrackedPreflight.stderr).not.toContain("token-guide");
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);
      expect(run(["python3", strictScript, "filename-only", "--project-root", root]).exitCode).toBe(2);
      expect(run(["python3", strictScript, "check", "--project-root", root]).exitCode).toBe(2);
      rmSync(fileSymlink, { force: true });

      // 2. Tracked file symlink in Git
      const trackedSymlink = join(root, "tracked-symlink.txt");
      symlinkSync(join(root, "docs", "token-guide.md"), trackedSymlink);
      expect(run(["git", "-C", root, "add", "--", "tracked-symlink.txt"]).exitCode).toBe(0);
      const trackedPreflight = run(["python3", preflightScript, "--project-root", root]);
      expect(trackedPreflight.exitCode).toBe(2);
      expect(trackedPreflight.stderr).toContain("symlinked project candidate is not accepted");
      rmSync(trackedSymlink, { force: true });
      expect(run(["git", "-C", root, "update-index", "--force-remove", "tracked-symlink.txt"]).exitCode).toBe(0);

      // 3. Untracked directory symlink in Git
      const dirSymlink = join(root, "dir-symlink");
      symlinkSync(join(root, "docs"), dirSymlink);
      const dirPreflight = run(["python3", preflightScript, "--project-root", root]);
      expect(dirPreflight.exitCode).toBe(2);
      expect(dirPreflight.stderr).toContain("symlinked project candidate is not accepted");
      rmSync(dirSymlink, { force: true });

      // 4. Tracked directory symlink in Git
      const trackedDirSymlink = join(root, "tracked-dir-symlink");
      symlinkSync(join(root, "docs"), trackedDirSymlink);
      expect(run(["git", "-C", root, "add", "--", "tracked-dir-symlink"]).exitCode).toBe(0);
      const trackedDirPreflight = run(["python3", preflightScript, "--project-root", root]);
      expect(trackedDirPreflight.exitCode).toBe(2);
      expect(trackedDirPreflight.stderr).toContain("symlinked project candidate is not accepted");
      rmSync(trackedDirSymlink, { force: true });
      expect(run(["git", "-C", root, "update-index", "--force-remove", "tracked-dir-symlink"]).exitCode).toBe(0);

      // 5. Non-Git fallback path
      const nonGitRoot = mkdtempSync(join(tmpdir(), "mahiro-ccc-nongit-"));
      try {
        mkdirSync(join(nonGitRoot, "docs"), { recursive: true });
        writeFileSync(join(nonGitRoot, "docs", "readme.txt"), "regular content\n", "utf8");

        // Clean non-git preflight succeeds
        expect(run(["python3", preflightScript, "--project-root", nonGitRoot]).exitCode).toBe(0);

        // Fallback file symlink fails closed
        const fallbackFileLink = join(nonGitRoot, "docs", "link.txt");
        symlinkSync(join(nonGitRoot, "docs", "readme.txt"), fallbackFileLink);
        const fallbackFileRes = run(["python3", preflightScript, "--project-root", nonGitRoot]);
        expect(fallbackFileRes.exitCode).toBe(2);
        expect(fallbackFileRes.stderr).toContain("symlinked project candidate is not accepted");
        rmSync(fallbackFileLink, { force: true });

        // Fallback directory symlink fails closed
        const fallbackDirLink = join(nonGitRoot, "docs-link");
        symlinkSync(join(nonGitRoot, "docs"), fallbackDirLink);
        const fallbackDirRes = run(["python3", preflightScript, "--project-root", nonGitRoot]);
        expect(fallbackDirRes.exitCode).toBe(2);
        expect(fallbackDirRes.stderr).toContain("symlinked project candidate is not accepted");
        rmSync(fallbackDirLink, { force: true });

        // Clean again passes
        expect(run(["python3", preflightScript, "--project-root", nonGitRoot]).exitCode).toBe(0);
      } finally {
        rmSync(nonGitRoot, { recursive: true, force: true });
      }
    });
  });

  test("hardened profile rejects non-empty chunkers while preserving empty chunkers and unrelated keys", () => {
    withProject((root) => {
      const settingsPath = join(root, ".cocoindex_code", "settings.yml");
      const baseSettings = readFileSync(settingsPath, "utf8");

      // 1. Rejects non-empty chunkers list
      writeFileSync(
        settingsPath,
        [
          "chunkers:",
          '  - ext: ".py"',
          '    module: "arbitrary.evil:chunker"',
          baseSettings,
        ].join("\n"),
        "utf8",
      );
      const rejectList = run(["python3", syncScript, "--project-root", root]);
      expect(rejectList.exitCode).toBe(2);
      expect(rejectList.stderr).toContain("chunkers must be omitted");

      // 2. Rejects inline list chunkers
      writeFileSync(
        settingsPath,
        ["chunkers: ['evil:chunker']", baseSettings].join("\n"),
        "utf8",
      );
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);

      // 3. Rejects scalar chunkers
      writeFileSync(
        settingsPath,
        ["chunkers: evil.module", baseSettings].join("\n"),
        "utf8",
      );
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);

      // 4. Rejects mapping chunkers
      writeFileSync(
        settingsPath,
        ["chunkers:", "  py: evil.module", baseSettings].join("\n"),
        "utf8",
      );
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);

      // 5. Rejects duplicate chunkers key
      writeFileSync(
        settingsPath,
        ["chunkers: []", "chunkers: []", baseSettings].join("\n"),
        "utf8",
      );
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);

      // YAML strings and nested scalar tokens are not empty chunker collections upstream.
      for (const unsupported of [
        ["chunkers: None"],
        ["chunkers: null"],
        ["chunkers: ~"],
        ["chunkers:", "  # no custom chunkers"],
        ["chunkers:", "  []"],
        ["chunkers:", "  null"],
      ]) {
        writeFileSync(settingsPath, [...unsupported, baseSettings].join("\n"), "utf8");
        expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);
      }

      // 6. Preserves empty chunkers: [] and unrelated keys
      writeFileSync(
        settingsPath,
        ["chunkers: []", "custom_option: keep_unrelated", "exclude_patterns:", '- "**/.git"'].join("\n"),
        "utf8",
      );
      const syncEmptyList = run(["python3", syncScript, "--project-root", root]);
      expect(syncEmptyList.exitCode).toBe(0);
      const syncedText = readFileSync(settingsPath, "utf8");
      expect(syncedText).toContain("chunkers: []");
      expect(syncedText).toContain("custom_option: keep_unrelated");
      // Idempotence check
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toBe(syncedText);

      // 7. Preserves empty chunkers: {}
      writeFileSync(
        settingsPath,
        ["chunkers: {}", "custom_option: keep_unrelated", "exclude_patterns:", '- "**/.git"'].join("\n"),
        "utf8",
      );
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toContain("chunkers: {}");

      // 8. Preserves explicit empty string forms accepted by upstream.
      writeFileSync(
        settingsPath,
        ["chunkers: ''", "custom_option: keep_unrelated", "exclude_patterns:", '- "**/.git"'].join("\n"),
        "utf8",
      );
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toContain("chunkers: ''");

      writeFileSync(
        settingsPath,
        ['chunkers: ""', "custom_option: keep_unrelated", "exclude_patterns:", '- "**/.git"'].join("\n"),
        "utf8",
      );
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toContain('chunkers: ""');
    });
  });

  test("enforces finite 5 MiB max_file_size cap and preserves stricter positive values", () => {
    withProject((root) => {
      const settingsPath = join(root, ".cocoindex_code", "settings.yml");

      // 1. Absent max_file_size: check detects drift, sync creates 5 MiB cap, check passes
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(1);
      const syncFirst = run(["python3", syncScript, "--project-root", root]);
      expect(syncFirst.exitCode).toBe(0);
      const syncedText = readFileSync(settingsPath, "utf8");
      expect(syncedText).toContain("max_file_size: 5242880");
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(0);
      // Idempotence
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toBe(syncedText);

      // 2. Larger value (10 MiB / 10485760): check detects drift, sync lowers to 5 MiB
      writeFileSync(settingsPath, syncedText.replace("max_file_size: 5242880", "max_file_size: 10485760"), "utf8");
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(1);
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toContain("max_file_size: 5242880");
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(0);

      // Larger value with unit suffix (10MB)
      writeFileSync(settingsPath, syncedText.replace("max_file_size: 5242880", "max_file_size: 10MB"), "utf8");
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(1);
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toContain("max_file_size: 5242880");

      // Lowering an oversized cap preserves its inline comment.
      writeFileSync(settingsPath, syncedText.replace("max_file_size: 5242880", "max_file_size: 10MB # preserve me"), "utf8");
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toContain("max_file_size: 5242880 # preserve me");

      // 3. Stricter positive value (1 MiB / 1048576) is preserved, not raised
      writeFileSync(settingsPath, syncedText.replace("max_file_size: 5242880", "max_file_size: 1048576"), "utf8");
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(0);
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toContain("max_file_size: 1048576");
      expect(readFileSync(settingsPath, "utf8")).not.toContain("max_file_size: 5242880");

      // Stricter value with suffix (1MB) is preserved
      writeFileSync(settingsPath, syncedText.replace("max_file_size: 5242880", "max_file_size: 1MB"), "utf8");
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(0);
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      expect(readFileSync(settingsPath, "utf8")).toContain("max_file_size: 1MB");
    });
  }, 20000);

  test("rejects malformed max_file_size and binds cap into scanner receipt freshness", () => {
    withProject((root) => {
      const settingsPath = join(root, ".cocoindex_code", "settings.yml");
      const syncFirst = run(["python3", syncScript, "--project-root", root]);
      expect(syncFirst.exitCode).toBe(0);
      const syncedText = readFileSync(settingsPath, "utf8");

      // 4. Malformed and non-positive values fail closed
      for (const malformedVal of ["0", "-1", "-100", "true", "false", "invalid", '""']) {
        writeFileSync(settingsPath, syncedText.replace("max_file_size: 5242880", `max_file_size: ${malformedVal}`), "utf8");
        expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);
        expect(run(["python3", preflightScript, "--project-root", root]).exitCode).toBe(2);
      }

      // Duplicate max_file_size fails closed
      writeFileSync(settingsPath, `max_file_size: 5242880\n${syncedText}`, "utf8");
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);

      // Match the installed upstream parser exactly: IEC spellings are unsupported.
      writeFileSync(settingsPath, syncedText.replace("max_file_size: 5242880", "max_file_size: 1MiB"), "utf8");
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(2);

      // 5. Freshness and receipt binding: modifying max_file_size invalidates receipt
      writeFileSync(settingsPath, syncedText, "utf8"); // Restore clean synced 5 MiB settings
      const scanner = writeFakeScanner(root);
      const scannerSha256 = createHash("sha256").update(readFileSync(scanner)).digest("hex");
      const report = ".cocoindex_code/ccc-security/report.json";
      const receipt = ".cocoindex_code/ccc-security/receipt.json";
      const scanRes = run([
        "python3",
        strictScript,
        "scan",
        "--project-root",
        root,
        "--gitleaks",
        scanner,
        "--expected-binary-sha256",
        scannerSha256,
        "--report",
        report,
        "--receipt",
        receipt,
      ]);
      expect(scanRes.exitCode).toBe(0);
      expect(run(["python3", strictScript, "check", "--project-root", root, "--gitleaks", scanner, "--expected-binary-sha256", scannerSha256, "--report", report, "--receipt", receipt]).exitCode).toBe(0);

      // Changing max_file_size to stricter 1048576 in settings makes receipt stale (exit 4)
      writeFileSync(settingsPath, syncedText.replace("max_file_size: 5242880", "max_file_size: 1048576"), "utf8");
      expect(run(["python3", strictScript, "check", "--project-root", root, "--gitleaks", scanner, "--expected-binary-sha256", scannerSha256, "--report", report, "--receipt", receipt]).exitCode).toBe(4);
    });
  }, 20000);

  test("strict scope applies a stricter project max_file_size before reading or staging", () => {
    withProject((root) => {
      const settingsPath = join(root, ".cocoindex_code", "settings.yml");
      expect(run(["python3", syncScript, "--project-root", root]).exitCode).toBe(0);
      const settings = readFileSync(settingsPath, "utf8").replace(
        "max_file_size: 5242880",
        "max_file_size: 1048576",
      );
      writeFileSync(settingsPath, settings, "utf8");
      expect(run(["python3", syncScript, "--project-root", root, "--check"]).exitCode).toBe(0);

      const boundaryPath = join(root, "boundary.py");
      const oversizedPath = join(root, "oversized.py");
      writeFileSync(boundaryPath, Buffer.alloc(1024 * 1024, 97));
      writeFileSync(oversizedPath, Buffer.alloc(1024 * 1024 + 1, 98));
      chmodSync(oversizedPath, 0o000);

      const scanner = writeFakeScanner(root);
      const scannerSha256 = createHash("sha256").update(readFileSync(scanner)).digest("hex");
      const captureRoot = mkdtempSync(join(tmpdir(), "mahiro-ccc-size-capture-"));
      const capturePath = join(captureRoot, "scan.json");
      const report = ".cocoindex_code/ccc-security/report.json";
      const receipt = ".cocoindex_code/ccc-security/receipt.json";
      try {
        const result = run(
          [
            "python3",
            strictScript,
            "scan",
            "--project-root",
            root,
            "--gitleaks",
            scanner,
            "--expected-binary-sha256",
            scannerSha256,
            "--report",
            report,
            "--receipt",
            receipt,
          ],
          { FAKE_GITLEAKS_MODE: "clean", FAKE_GITLEAKS_CAPTURE: capturePath },
        );
        expect(result.exitCode).toBe(0);
        const capture = parseJson(readFileSync(capturePath, "utf8"));
        expect(capture.files as string[]).toContain("boundary.py");
        expect(capture.files as string[]).not.toContain("oversized.py");
        const strictReceipt = parseJson(readFileSync(join(root, receipt), "utf8"));
        expect(strictReceipt.max_file_size).toBe(1048576);
        expect((strictReceipt.policy as Record<string, unknown>).max_file_size).toBe(1048576);
      } finally {
        chmodSync(oversizedPath, 0o640);
        rmSync(captureRoot, { recursive: true, force: true });
      }
    });
  }, 20000);

  test("strict snapshot copy rechecks the effective size cap", () => {
    const probe = run([
      "python3",
      "-c",
      String.raw`
import ast
import importlib.util
import inspect
import sys
import tempfile
from pathlib import Path

script = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(script.parent))
spec = importlib.util.spec_from_file_location("mahiro_strict_probe", script)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

strict_tree = ast.parse(inspect.getsource(module._strict_scan))
strict_manifest_calls = [
    node
    for node in ast.walk(strict_tree)
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "source_manifest"
]
assert len(strict_manifest_calls) == 1
assert all(any(keyword.arg == "max_bytes" for keyword in call.keywords) for call in strict_manifest_calls)
assert any(
    isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "_source_metadata"
    for node in ast.walk(strict_tree)
)

metadata_tree = ast.parse(inspect.getsource(module._source_metadata))
metadata_manifest_calls = [
    node
    for node in ast.walk(metadata_tree)
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "source_manifest"
]
assert len(metadata_manifest_calls) == 1
assert all(any(keyword.arg == "max_bytes" for keyword in call.keywords) for call in metadata_manifest_calls)

limit = 1024
with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    source = root / "source.py"
    accepted = root / "accepted.py"
    blocked = root / "blocked.py"
    source.write_bytes(b"a" * limit)
    module._copy_snapshot(source, accepted, limit)
    assert accepted.stat().st_size == limit
    source.write_bytes(b"b" * (limit + 1))
    try:
        module._copy_snapshot(source, blocked, limit)
    except module.ScannerError:
        pass
    else:
        raise AssertionError("oversized source reached strict snapshot")
    assert not blocked.exists()
`,
      strictScript,
    ]);
    expect(probe.exitCode).toBe(0);
  });
});
