#!/usr/bin/env bun
import { existsSync } from "fs";
import { basename } from "path";
import { resolveSlug } from "./resolve-slug.ts";

const args = process.argv.slice(2);
const sinceArg = args.find((arg) => arg.startsWith("--since="));
const since = sinceArg?.slice(8) || "6 months ago";
const input = args.find((arg) => !arg.startsWith("--"));

if (!input) {
  console.log("Usage: bun skills/project/scripts/history.ts <slug|path> [--since=6months]");
  process.exit(0);
}

const repoPath = resolveSlug(input);
if (!repoPath || !existsSync(`${repoPath}/.git`)) {
  console.log(`Not a git repo: ${input}`);
  process.exit(1);
}

function runGit(args: string[]): string {
  const result = Bun.spawnSync(["git", "-C", repoPath, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) return "";
  return new TextDecoder().decode(result.stdout).trim();
}

const name = basename(repoPath);

const total = runGit(["rev-list", "--count", "HEAD"]);
const recent = runGit(["rev-list", "--count", `--since=${since}`, "HEAD"]);
const first = runGit(["log", "--reverse", "--format=%ad", "--date=short"]).split("\n")[0] || "";
const last = runGit(["log", "-1", "--format=%ad", "--date=short"]);

console.log(`# ${name}\nPath: ${repoPath}\nSince: ${since}\n`);
console.log(`## Summary\n| Metric | Value |\n|--------|-------|\n| Total | ${total} |\n| Recent | ${recent} |\n| First | ${first} |\n| Last | ${last} |\n`);

console.log("## Recent Commits\n```");
console.log(runGit(["log", "--oneline", `--since=${since}`, "-15"]) || "(none)");
console.log("```\n");

const files = runGit(["log", "--name-only", "--pretty=", `--since=${since}`])
  .split("\n")
  .filter(Boolean);
const counts: Record<string, number> = {};
for (const file of files) {
  counts[file] = (counts[file] || 0) + 1;
}

console.log("## Top Changed Files\n```");
for (const [file, count] of Object.entries(counts).sort((left, right) => right[1] - left[1]).slice(0, 10)) {
  console.log(`  ${count} ${file}`);
}
console.log("```");
