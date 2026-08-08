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
const scriptsRoot = join(repoRoot, "skills", "cocoindex-rules-init", "scripts");
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
  writeFileSync(join(root, "config", "data.json"), '{"name":"safe"}\n', "utf8");
  writeFileSync(join(root, "config", "data.yaml"), "name: safe\n", "utf8");
  writeFileSync(join(root, "config", "data.toml"), "name = 'safe'\n", "utf8");
  writeFileSync(join(root, "config", "data.xml"), "<name>safe</name>\n", "utf8");
  writeFileSync(join(root, "docs", "readme.txt"), "safe text\n", "utf8");
  writeFileSync(join(root, ".claude", "settings.local.json"), '{"local":true}\n', "utf8");
  writeFileSync(join(root, ".letta", "state.json"), '{"local":true}\n', "utf8");
  writeFileSync(join(root, ".agent-state", "session.txt"), "local state\n", "utf8");
  writeFileSync(join(root, ".github", "workflow.yml"), "name: safe\n", "utf8");
  writeFileSync(join(root, "keys", "id.key"), "safe fixture key path\n", "utf8");
  writeFileSync(join(root, "credentials.json"), '{"name":"safe fixture"}\n', "utf8");
  run(["git", "-C", root, "init", "--quiet"]);
  run(["git", "-C", root, "add", "-f", "--", ".claude/settings.local.json", ".letta/state.json", ".agent-state/session.txt", ".github/workflow.yml"]);
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
  test("keeps structured data eligible and routes dotenv examples conservatively", () => {
    withProject((root) => {
      const sync = run(["python3", syncScript, "--project-root", root]);
      expect(sync.exitCode).toBe(0);
      const preflight = run(["python3", preflightScript, "--project-root", root]);
      expect(preflight.exitCode).toBe(0);
      const result = parseJson(preflight.stdout);
      expect(result.mode).toBe("filename-only");
      expect(result.equivalent_to_strict).toBe(false);
      expect(result.scope_kind).toBe("git-candidate-regular-files-before-settings-excludes");
      expect(result.classification_counts).toMatchObject({
        "content-scan": expect.any(Number),
        "content-scan-env-example": 1,
      });
      expect(result.env_example_content_scan_paths).toEqual([".env.example"]);
      expect(result.derived_sensitive_paths).toEqual(
        expect.arrayContaining([
          ".env.sample",
          ".env.template",
          ".claude/settings.local.json",
          ".letta/state.json",
          "credentials.json",
          "keys/id.key",
        ]),
      );
      expect(result.derived_sensitive_paths).not.toContain("docs/token-guide.md");
      expect(result.derived_sensitive_paths).not.toContain(".github/workflow.yml");
      expect(result.derived_sensitive_paths).not.toContain(".agent-state/session.txt");

      const settings = readFileSync(join(root, ".cocoindex_code", "settings.yml"), "utf8");
      const excludeSection = settings.split("include_patterns:", 1)[0];
      for (const broadPattern of ["**/*.json", "**/*.yaml", "**/*.yml", "**/*.toml", "**/*.xml", "**/*.txt", "**/.*", "**/*.env.*"]) {
        expect(excludeSection).not.toContain(broadPattern);
      }
      expect(settings).toContain('include_patterns:\n- "**/*.json"');
      expect(settings).toContain('- "**/.letta/**"');
      expect(settings).toContain('- "**/.claude/settings.local.json"');
      expect(settings).toContain('- "**/.agent-state"');
      expect(settings).toContain("custom_option: keep");
      expect(readFileSync(join(repoRoot, "skills", "cocoindex-rules-init", "resources", "portable-credential-deny-baseline.txt"), "utf8")).not.toContain("**/*.json");
    });
  });

  test("pins the current Gitleaks config and metadata-only template", () => {
    const config = readFileSync(join(repoRoot, "skills", "cocoindex-rules-init", "resources", "gitleaks-config.toml"), "utf8");
    const template = readFileSync(join(repoRoot, "skills", "cocoindex-rules-init", "resources", "gitleaks-metadata-report.tmpl"), "utf8");
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
      expect(statSync(settingsPath).mode & 0o777).toBe(0o640);
      expect(existsSync(join(root, ".cocoindex_code", ".settings.yml."))).toBe(false);
      writeFileSync(settingsPath, firstText.replace('**/.env"', '**/.env-changed"'), "utf8");
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
      expect(symlinkPreflight.exitCode).toBe(0);
      expect(parseJson(symlinkPreflight.stdout).derived_sensitive_paths).not.toContain("unsafe-link.md");
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
          ".agent-state/session.txt",
          ".letta/state.json",
          ".env.sample",
          ".env.template",
          ".claude/settings.local.json",
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
        expect(stagedFiles).toContain("config/data.json");
        expect(stagedFiles).toContain("config/data.yaml");
        expect(stagedFiles).toContain("config/data.toml");
        expect(stagedFiles).toContain("config/data.xml");
        expect(stagedFiles).toContain("docs/readme.txt");
        expect(stagedFiles).not.toContain("docs/keep-me");
        expect(stagedFiles).not.toContain(".agent-state/session.txt");
        expect(stagedFiles).not.toContain(".letta/state.json");
        expect(stagedFiles).not.toContain(".env.sample");
        expect(stagedFiles).not.toContain(".env.template");
        expect(stagedFiles).not.toContain(".claude/settings.local.json");
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
});
