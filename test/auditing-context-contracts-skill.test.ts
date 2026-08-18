import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const script = join(root, "skills", "auditing-context-contracts", "scripts", "scan-context-contracts.ts");
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

function runScanner(args: string[]) {
  return Bun.spawnSync(["bun", script, ...args], { cwd: root });
}

function decode(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

describe("auditing-context-contracts skill", () => {
  test("ships the bounded audit contract and command wrapper", () => {
    const skill = read("skills", "auditing-context-contracts", "SKILL.md");
    const command = read("commands", "auditing-context-contracts.md");

    expect(skill).toContain("name: auditing-context-contracts");
    expect(skill).toContain("## Trigger gate");
    expect(skill).toContain("## Phase workflow");
    expect(skill).toContain("Executable/current truth");
    expect(skill).toContain("Historical/superseded");
    expect(skill).toContain("Source/static");
    expect(skill).toContain("Rendered/human");
    expect(skill).toContain("Direct");
    expect(skill).toContain("Human-only");
    expect(skill).toContain("does not turn keyword search into a");
    expect(skill).toContain("semantic oracle");
    expect(skill).toContain("never edits files");
    expect(skill).toContain("Hard ceilings bound total globs");
    expect(skill).toContain("literal retired terms only");
    expect(skill).toContain("## Output contract");
    expect(skill).toContain("## Validation / self-check");
    expect(existsSync(script)).toBe(true);
    expect(command).toContain('skill: "auditing-context-contracts"');
  });

  test("is discoverable in the complete default bundle", () => {
    const marketplace = JSON.parse(read(".claude-plugin", "marketplace.json"));
    const bundle = marketplace.bundles[0];
    const readme = read("README.md");
    const index = read("skills", "llms.txt");

    expect(bundle.skills).toContain("auditing-context-contracts");
    expect(bundle.commands).toContain("auditing-context-contracts");
    expect(readme).toContain("`auditing-context-contracts` | `/auditing-context-contracts`");
    expect(index).toContain("`auditing-context-contracts` — Repository context-contract audit");
  });

  test("scanner reports stable exact findings and never mutates fixtures", () => {
    const fixture = mkdtempSync(join(tmpdir(), "context-contract-scan-"));
    try {
      mkdirSync(join(fixture, "docs", "history"), { recursive: true });
      const activePath = join(fixture, "docs", "current.md");
      const historicalPath = join(fixture, "docs", "history", "migration.md");
      writeFileSync(activePath, "# Current\nUse old-route here.\n");
      writeFileSync(historicalPath, "# Migration\nPrior evidence only.\n");
      const beforeActive = readFileSync(activePath, "utf8");
      const beforeHistorical = readFileSync(historicalPath, "utf8");
      const args = [
        "--root",
        fixture,
        "--active-path",
        "docs/current.md",
        "--retired",
        "old-route",
        "--historical-path",
        "docs/history/**/*.md",
        "--historical-marker",
        "Status: superseded",
        "--historical-marker",
        "Current owner:",
      ];

      const first = runScanner(args);
      const second = runScanner(args);
      expect(first.exitCode).toBe(1);
      expect(second.exitCode).toBe(1);
      expect(decode(first.stdout)).toBe(decode(second.stdout));

      const payload = JSON.parse(decode(first.stdout));
      expect(payload.matches).toEqual([
        {
          path: "docs/current.md",
          line: 2,
          column: 5,
          pattern: "old-route",
          patternKind: "literal",
          scope: "active",
        },
      ]);
      expect(payload.historicalWarnings).toEqual([
        { path: "docs/history/migration.md", kind: "missing-required-marker", marker: "Current owner:" },
        { path: "docs/history/migration.md", kind: "missing-required-marker", marker: "Status: superseded" },
      ]);
      expect(payload.summary).toMatchObject({ matches: 1, historicalWarnings: 2, skippedFiles: 0, findings: 3 });
      expect(readFileSync(activePath, "utf8")).toBe(beforeActive);
      expect(readFileSync(historicalPath, "utf8")).toBe(beforeHistorical);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("scanner exits cleanly for declared no-match scope and fails closed for invalid scope", () => {
    const fixture = mkdtempSync(join(tmpdir(), "context-contract-clean-"));
    try {
      mkdirSync(join(fixture, "docs"), { recursive: true });
      writeFileSync(join(fixture, "docs", "current.md"), "# Current\nOnly the new route.\n");
      writeFileSync(join(fixture, "docs", "other.md"), "# Other\nStill current.\n");

      const clean = runScanner([
        "--root",
        fixture,
        "--active-path",
        "docs/**/*.md",
        "--retired",
        "old-package",
      ]);
      expect(clean.exitCode).toBe(0);
      expect(JSON.parse(decode(clean.stdout)).summary.findings).toBe(0);

      const invalid = runScanner([
        "--root",
        fixture,
        "--active-path",
        "missing/**/*.md",
        "--retired",
        "old-route",
      ]);
      expect(invalid.exitCode).toBe(2);
      expect(decode(invalid.stderr)).toContain("active path globs resolved to no files");

      const overLimitArgs = [
        "--root",
        fixture,
        "--active-path",
        "docs/**/*.md",
      ];
      for (let index = 0; index < 65; index += 1) overLimitArgs.push("--retired", "duplicate-retired");
      const overLimit = runScanner(overLimitArgs);
      expect(overLimit.exitCode).toBe(2);
      expect(decode(overLimit.stderr)).toContain("retired literals exceed hard limit 64");

      const globLimitArgs = ["--root", fixture, "--retired", "old-route"];
      for (let index = 0; index < 65; index += 1) globLimitArgs.push("--active-path", "docs/**/*.md");
      const globLimit = runScanner(globLimitArgs);
      expect(globLimit.exitCode).toBe(2);
      expect(decode(globLimit.stderr)).toContain("declared globs exceed hard limit 64");

      const markerLimitArgs = ["--root", fixture, "--active-path", "docs/**/*.md", "--retired", "old-route"];
      for (let index = 0; index < 33; index += 1) markerLimitArgs.push("--historical-marker", "duplicate-marker");
      const markerLimit = runScanner(markerLimitArgs);
      expect(markerLimit.exitCode).toBe(2);
      expect(decode(markerLimit.stderr)).toContain("historical markers exceed hard limit 32");

      const fileLimit = runScanner([
        "--root",
        fixture,
        "--active-path",
        "docs/**/*.md",
        "--retired",
        "old-route",
        "--max-files",
        "1",
      ]);
      expect(fileLimit.exitCode).toBe(2);
      expect(decode(fileLimit.stderr)).toContain("expanded files exceed effective limit 1");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("scanner bounds reads and reports skipped unsafe or non-text files", () => {
    const fixture = mkdtempSync(join(tmpdir(), "context-contract-skips-"));
    try {
      mkdirSync(join(fixture, "docs"), { recursive: true });
      writeFileSync(join(fixture, "docs", "current.md"), "new\n");
      writeFileSync(join(fixture, "docs", "binary.md"), Buffer.from([0, 1, 2]));
      writeFileSync(join(fixture, "docs", "invalid.md"), Buffer.from([0xff, 0xfe]));
      writeFileSync(join(fixture, "docs", "large.md"), "x".repeat(21));
      symlinkSync(join(fixture, "docs", "current.md"), join(fixture, "docs", "linked.md"));

      const result = runScanner([
        "--root",
        fixture,
        "--active-path",
        "docs/*",
        "--retired",
        "old-route",
        "--max-bytes",
        "20",
      ]);

      expect(result.exitCode).toBe(1);
      const payload = JSON.parse(decode(result.stdout));
      expect(payload.limits).toMatchObject({
        maxPatterns: 64,
        maxFiles: 5000,
        maxFileBytes: 20,
        maxTotalBytes: 64000000,
        maxFindings: 10000,
      });
      expect(payload.skippedFiles).toEqual([
        { path: "docs/binary.md", reason: "binary" },
        { path: "docs/invalid.md", reason: "invalid-utf8" },
        { path: "docs/large.md", reason: "oversized" },
        { path: "docs/linked.md", reason: "symlink" },
      ]);
      expect(payload.summary).toMatchObject({ skippedFiles: 4, findings: 4, findingsTruncated: false });

      const raisedLimit = runScanner([
        "--root",
        fixture,
        "--active-path",
        "docs/current.md",
        "--retired",
        "old-route",
        "--max-bytes",
        "2000001",
      ]);
      expect(raisedLimit.exitCode).toBe(2);
      expect(decode(raisedLimit.stderr)).toContain("--max-bytes must be between 1 and 2000000");

      const aggregateLimit = runScanner([
        "--root",
        fixture,
        "--active-path",
        "docs/binary.md",
        "--active-path",
        "docs/current.md",
        "--retired",
        "old-route",
        "--max-total-bytes",
        "6",
      ]);
      expect(aggregateLimit.exitCode).toBe(2);
      expect(decode(aggregateLimit.stderr)).toContain("aggregate readable bytes exceed effective limit 6");

      writeFileSync(join(fixture, "docs", "a-invalid.md"), Buffer.from([0xff, 0xfe]));
      writeFileSync(join(fixture, "docs", "z-text.md"), "text");
      const invalidUtf8AggregateLimit = runScanner([
        "--root",
        fixture,
        "--active-path",
        "docs/a-invalid.md",
        "--active-path",
        "docs/z-text.md",
        "--retired",
        "old-route",
        "--max-total-bytes",
        "5",
      ]);
      expect(invalidUtf8AggregateLimit.exitCode).toBe(2);
      expect(decode(invalidUtf8AggregateLimit.stderr)).toContain("aggregate readable bytes exceed effective limit 5");

      writeFileSync(join(fixture, "docs", "matches.md"), "old-route old-route old-route old-route\n");
      const findingLimit = runScanner([
        "--root",
        fixture,
        "--active-path",
        "docs/binary.md",
        "--active-path",
        "docs/matches.md",
        "--retired",
        "old-route",
        "--max-findings",
        "3",
      ]);
      expect(findingLimit.exitCode).toBe(1);
      const findingPayload = JSON.parse(decode(findingLimit.stdout));
      expect(findingPayload.skippedFiles).toHaveLength(1);
      expect(findingPayload.matches).toHaveLength(2);
      expect(findingPayload.summary).toMatchObject({ findings: 3, findingsTruncated: true });
      expect(findingPayload.limitWarning).toEqual({ kind: "findings-truncated", limit: 3 });

      mkdirSync(join(fixture, "history"), { recursive: true });
      writeFileSync(join(fixture, "docs", "one-match.md"), "old-route\n");
      writeFileSync(join(fixture, "history", "migration.md"), "prior state\n");
      const mixedFindingLimit = runScanner([
        "--root",
        fixture,
        "--active-path",
        "docs/binary.md",
        "--active-path",
        "docs/one-match.md",
        "--historical-path",
        "history/*.md",
        "--historical-marker",
        "Status: superseded",
        "--historical-marker",
        "Current owner:",
        "--retired",
        "old-route",
        "--max-findings",
        "3",
      ]);
      expect(mixedFindingLimit.exitCode).toBe(1);
      const mixedPayload = JSON.parse(decode(mixedFindingLimit.stdout));
      expect(mixedPayload.skippedFiles).toHaveLength(1);
      expect(mixedPayload.matches).toHaveLength(1);
      expect(mixedPayload.historicalWarnings).toHaveLength(1);
      expect(mixedPayload.summary).toMatchObject({ findings: 3, findingsTruncated: true });
      expect(mixedPayload.limitWarning).toEqual({ kind: "findings-truncated", limit: 3 });

      const outsideScope = runScanner([
        "--root",
        fixture,
        "--active-path",
        "../external.md",
        "--retired",
        "old-route",
      ]);
      expect(outsideScope.exitCode).toBe(2);
      expect(decode(outsideScope.stderr)).toContain("must stay relative to --root");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
