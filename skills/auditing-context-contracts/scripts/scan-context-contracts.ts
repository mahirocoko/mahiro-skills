#!/usr/bin/env bun

import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

interface ScanOptions {
  root: string;
  activePaths: string[];
  historicalPaths: string[];
  retired: string[];
  historicalMarkers: string[];
  maxBytes: number;
  maxFiles: number;
  maxTotalBytes: number;
  maxFindings: number;
}

interface MatchFinding {
  path: string;
  line: number;
  column: number;
  pattern: string;
  patternKind: "literal";
  scope: "active";
}

interface HistoricalWarning {
  path: string;
  kind: "missing-required-marker";
  marker: string;
}

interface SkippedFile {
  path: string;
  reason: "binary" | "invalid-utf8" | "outside-root" | "oversized" | "symlink";
}

interface ReadResult {
  text?: string;
  bytesRead?: number;
  skipped?: SkippedFile;
  totalBytesExceeded?: boolean;
}

const MAX_GLOBS = 64;
const MAX_PATTERNS = 64;
const MAX_HISTORICAL_MARKERS = 32;
const MAX_FILES = 5_000;
const MAX_FILE_BYTES = 2_000_000;
const MAX_TOTAL_BYTES = 64_000_000;
const MAX_FINDINGS = 10_000;
const MAX_GLOB_LENGTH = 500;
const MAX_VALUE_LENGTH = 1_000;
const MAX_ARGUMENT_TOKENS = 512;

const usage = `Usage:
  bun scan-context-contracts.ts --root <path> \\
    --active-path <glob> [--active-path <glob> ...] \\
    --retired <literal> [--retired <literal> ...]

Optional:
  --historical-path <glob>       Repeatable historical surface glob
  --historical-marker <literal> Repeatable marker required in every historical file
  --max-bytes <positive-int>    Lower the per-file limit (hard maximum: ${MAX_FILE_BYTES})
  --max-files <positive-int>    Lower the unique-file limit (hard maximum: ${MAX_FILES})
  --max-total-bytes <positive-int> Lower the aggregate read limit (hard maximum: ${MAX_TOTAL_BYTES})
  --max-findings <positive-int> Lower the reported-detail limit (hard maximum: ${MAX_FINDINGS})
  --help

Hard limits:
  ${MAX_GLOBS} total globs, ${MAX_PATTERNS} retired literals, ${MAX_HISTORICAL_MARKERS} historical markers,
  ${MAX_FILES} unique files, ${MAX_FILE_BYTES} bytes/file, ${MAX_TOTAL_BYTES} aggregate readable bytes,
  and ${MAX_FINDINGS} reported match/marker findings.

Exit codes: 0 no findings, 1 review findings, 2 invalid input or hard-limit breach.
The scanner is read-only and reports literal locations; it does not prove semantic truth.
`;

function fail(message: string): never {
  console.error(`scan-context-contracts: ${message}`);
  process.exit(2);
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`${flag} requires a value`);
  return value;
}

function validateGlob(pattern: string, flag: string): string {
  if (pattern.length > MAX_GLOB_LENGTH) fail(`${flag} exceeds ${MAX_GLOB_LENGTH} characters`);
  if (isAbsolute(pattern) || pattern.split(/[\\/]/).includes("..")) {
    fail(`${flag} must stay relative to --root: ${pattern}`);
  }
  return pattern;
}

function validateLiteral(value: string, flag: string): string {
  if (!value) fail(`${flag} cannot be empty`);
  if (value.length > MAX_VALUE_LENGTH) fail(`${flag} exceeds ${MAX_VALUE_LENGTH} characters`);
  return value;
}

function parseArgs(args: string[]): ScanOptions {
  if (args.length > MAX_ARGUMENT_TOKENS) fail(`argument tokens exceed hard limit ${MAX_ARGUMENT_TOKENS}`);
  if (args.includes("--help")) {
    console.log(usage);
    process.exit(0);
  }

  let root = "";
  let maxBytes = MAX_FILE_BYTES;
  let maxFiles = MAX_FILES;
  let maxTotalBytes = MAX_TOTAL_BYTES;
  let maxFindings = MAX_FINDINGS;
  const activePaths: string[] = [];
  const historicalPaths: string[] = [];
  const retired: string[] = [];
  const historicalMarkers: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    switch (flag) {
      case "--root":
        root = requireValue(args, index, flag);
        index += 1;
        break;
      case "--active-path":
        activePaths.push(validateGlob(requireValue(args, index, flag), flag));
        if (activePaths.length + historicalPaths.length > MAX_GLOBS) fail(`declared globs exceed hard limit ${MAX_GLOBS}`);
        index += 1;
        break;
      case "--historical-path":
        historicalPaths.push(validateGlob(requireValue(args, index, flag), flag));
        if (activePaths.length + historicalPaths.length > MAX_GLOBS) fail(`declared globs exceed hard limit ${MAX_GLOBS}`);
        index += 1;
        break;
      case "--retired":
        retired.push(validateLiteral(requireValue(args, index, flag), flag));
        if (retired.length > MAX_PATTERNS) fail(`retired literals exceed hard limit ${MAX_PATTERNS}`);
        index += 1;
        break;
      case "--historical-marker":
        historicalMarkers.push(validateLiteral(requireValue(args, index, flag), flag));
        if (historicalMarkers.length > MAX_HISTORICAL_MARKERS) {
          fail(`historical markers exceed hard limit ${MAX_HISTORICAL_MARKERS}`);
        }
        index += 1;
        break;
      case "--max-bytes": {
        const raw = requireValue(args, index, flag);
        maxBytes = Number(raw);
        if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > MAX_FILE_BYTES) {
          fail(`--max-bytes must be between 1 and ${MAX_FILE_BYTES}: ${raw}`);
        }
        index += 1;
        break;
      }
      case "--max-files": {
        const raw = requireValue(args, index, flag);
        maxFiles = Number(raw);
        if (!Number.isSafeInteger(maxFiles) || maxFiles <= 0 || maxFiles > MAX_FILES) {
          fail(`--max-files must be between 1 and ${MAX_FILES}: ${raw}`);
        }
        index += 1;
        break;
      }
      case "--max-total-bytes": {
        const raw = requireValue(args, index, flag);
        maxTotalBytes = Number(raw);
        if (!Number.isSafeInteger(maxTotalBytes) || maxTotalBytes <= 0 || maxTotalBytes > MAX_TOTAL_BYTES) {
          fail(`--max-total-bytes must be between 1 and ${MAX_TOTAL_BYTES}: ${raw}`);
        }
        index += 1;
        break;
      }
      case "--max-findings": {
        const raw = requireValue(args, index, flag);
        maxFindings = Number(raw);
        if (!Number.isSafeInteger(maxFindings) || maxFindings <= 0 || maxFindings > MAX_FINDINGS) {
          fail(`--max-findings must be between 1 and ${MAX_FINDINGS}: ${raw}`);
        }
        index += 1;
        break;
      }
      default:
        fail(`unknown argument: ${flag}`);
    }
  }

  if (!root) fail("--root is required");

  const uniqueActivePaths = [...new Set(activePaths)].sort();
  const uniqueHistoricalPaths = [...new Set(historicalPaths)].sort();
  const uniqueRetired = [...new Set(retired)].sort();
  const uniqueHistoricalMarkers = [...new Set(historicalMarkers)].sort();

  if (uniqueActivePaths.length === 0) fail("at least one --active-path is required");
  if (uniqueRetired.length === 0) fail("at least one --retired is required");
  return {
    root: resolve(root),
    activePaths: uniqueActivePaths,
    historicalPaths: uniqueHistoricalPaths,
    retired: uniqueRetired,
    historicalMarkers: uniqueHistoricalMarkers,
    maxBytes,
    maxFiles,
    maxTotalBytes,
    maxFindings,
  };
}

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

async function expandGlobs(root: string, patterns: string[], allPaths: Set<string>, maxFiles: number): Promise<string[]> {
  const scopedPaths = new Set<string>();
  for (const pattern of patterns) {
    const glob = new Bun.Glob(pattern);
    for await (const match of glob.scan({ cwd: root, dot: true, onlyFiles: false })) {
      const normalized = normalizePath(match);
      const metadata = lstatSync(resolve(root, normalized));
      if (!metadata.isFile() && !metadata.isSymbolicLink()) continue;
      scopedPaths.add(normalized);
      allPaths.add(normalized);
      if (allPaths.size > maxFiles) fail(`expanded files exceed effective limit ${maxFiles}`);
    }
  }
  return [...scopedPaths].sort();
}

function locate(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  return { line, column: index - lastNewline };
}

function readText(
  rootReal: string,
  relativePath: string,
  maxBytes: number,
  remainingTotalBytes: number,
): ReadResult {
  const absolutePath = resolve(rootReal, relativePath);
  const normalized = normalizePath(relativePath);
  const metadata = lstatSync(absolutePath);

  if (metadata.isSymbolicLink()) return { skipped: { path: normalized, reason: "symlink" } };

  const realPath = realpathSync(absolutePath);
  if (realPath !== rootReal && !realPath.startsWith(`${rootReal}${sep}`)) {
    return { skipped: { path: normalized, reason: "outside-root" } };
  }

  const size = statSync(realPath).size;
  if (size > maxBytes) return { skipped: { path: normalized, reason: "oversized" } };
  if (size > remainingTotalBytes) return { totalBytesExceeded: true };

  const buffer = readFileSync(realPath);
  if (buffer.includes(0)) return { bytesRead: size, skipped: { path: normalized, reason: "binary" } };

  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buffer), bytesRead: size };
  } catch {
    return { bytesRead: size, skipped: { path: normalized, reason: "invalid-utf8" } };
  }
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));
  let rootReal: string;
  try {
    rootReal = realpathSync(options.root);
  } catch {
    fail(`--root is not readable: ${options.root}`);
  }
  if (!statSync(rootReal).isDirectory()) fail(`--root is not a directory: ${options.root}`);

  const allPaths = new Set<string>();
  const activeFiles = await expandGlobs(rootReal, options.activePaths, allPaths, options.maxFiles);
  const historicalFiles = await expandGlobs(rootReal, options.historicalPaths, allPaths, options.maxFiles);
  if (activeFiles.length === 0) fail("active path globs resolved to no files");

  let totalBytesRead = 0;
  const textByPath = new Map<string, string>();
  const skippedByPath = new Map<string, SkippedFile>();
  let findingsTruncated = false;
  for (const path of [...allPaths].sort()) {
    let result: ReadResult;
    try {
      result = readText(rootReal, path, options.maxBytes, options.maxTotalBytes - totalBytesRead);
    } catch (error) {
      fail(`cannot inspect ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (result.totalBytesExceeded) fail(`aggregate readable bytes exceed effective limit ${options.maxTotalBytes}`);
    totalBytesRead += result.bytesRead ?? 0;
    if (result.skipped) {
      if (skippedByPath.size < options.maxFindings) skippedByPath.set(path, result.skipped);
      else findingsTruncated = true;
    }
    if (result.text !== undefined) {
      textByPath.set(path, result.text);
    }
  }

  const matches: MatchFinding[] = [];
  matchLoop: for (const path of activeFiles) {
    const text = textByPath.get(path);
    if (text === undefined) continue;
    for (const pattern of options.retired) {
      let offset = 0;
      while (offset <= text.length) {
        const index = text.indexOf(pattern, offset);
        if (index === -1) break;
        if (skippedByPath.size + matches.length >= options.maxFindings) {
          findingsTruncated = true;
          break matchLoop;
        }
        const position = locate(text, index);
        matches.push({
          path,
          line: position.line,
          column: position.column,
          pattern,
          patternKind: "literal",
          scope: "active",
        });
        offset = index + pattern.length;
      }
    }
  }

  matches.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.line - right.line ||
      left.column - right.column ||
      left.pattern.localeCompare(right.pattern),
  );

  const historicalWarnings: HistoricalWarning[] = [];
  historicalLoop: for (const path of historicalFiles) {
    const text = textByPath.get(path);
    if (text === undefined) continue;
    for (const marker of options.historicalMarkers) {
      if (!text.includes(marker)) {
        if (skippedByPath.size + matches.length + historicalWarnings.length >= options.maxFindings) {
          findingsTruncated = true;
          break historicalLoop;
        }
        historicalWarnings.push({ path, kind: "missing-required-marker", marker });
      }
    }
  }
  historicalWarnings.sort((left, right) => left.path.localeCompare(right.path) || left.marker.localeCompare(right.marker));

  const skippedFiles = [...skippedByPath.values()].sort(
    (left, right) => left.path.localeCompare(right.path) || left.reason.localeCompare(right.reason),
  );
  const limitWarning = findingsTruncated ? { kind: "findings-truncated", limit: options.maxFindings } : null;
  const findings = matches.length + historicalWarnings.length + skippedFiles.length;
  const output = {
    schemaVersion: 1,
    root: ".",
    limits: {
      maxGlobs: MAX_GLOBS,
      maxPatterns: MAX_PATTERNS,
      maxHistoricalMarkers: MAX_HISTORICAL_MARKERS,
      maxFiles: options.maxFiles,
      maxFileBytes: options.maxBytes,
      maxTotalBytes: options.maxTotalBytes,
      maxFindings: options.maxFindings,
    },
    activePaths: options.activePaths,
    historicalPaths: options.historicalPaths,
    retiredPatterns: options.retired.map((value) => ({ kind: "literal", value })),
    requiredHistoricalMarkers: options.historicalMarkers,
    matches,
    historicalWarnings,
    skippedFiles,
    limitWarning,
    summary: {
      activeFiles: activeFiles.length,
      historicalFiles: historicalFiles.length,
      uniqueFiles: allPaths.size,
      uniqueFilesRead: textByPath.size,
      totalBytesRead,
      matches: matches.length,
      historicalWarnings: historicalWarnings.length,
      skippedFiles: skippedFiles.length,
      findingsTruncated,
      findings,
    },
  };

  console.log(JSON.stringify(output, null, 2));
  process.exitCode = findings > 0 ? 1 : 0;
}

await main();
