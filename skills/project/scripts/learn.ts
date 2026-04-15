#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { join } from "path";
import {
  findGhqRepo,
  getPaths,
  ghqRepoPath,
  parseRepo,
  repoInfoFromPath,
  updateOriginsFile,
  updateSlugsFile,
} from "./utils.ts";

const input = process.argv[2];

if (!input) {
  console.log("Usage: bun skills/project/scripts/learn.ts <owner/repo|url|repo>");
  process.exit(1);
}

let repoInfo = input.startsWith("http") || input.includes("/")
  ? parseRepo(input)
  : null;

if (!repoInfo) {
  const ghqMatch = findGhqRepo(input);
  repoInfo = ghqMatch ? repoInfoFromPath(ghqMatch) : null;
}

if (!repoInfo) {
  console.error(`Not found: ${input}. Use owner/repo format or clone it first.`);
  process.exit(1);
}

const paths = getPaths();
const localPath = ghqRepoPath(repoInfo.owner, repoInfo.name);
const repoDir = join(paths.learnDir, repoInfo.owner, repoInfo.name);
const originPath = join(repoDir, "origin");

console.log(`Learning: ${repoInfo.slug}`);

await $`ghq get -u github.com/${repoInfo.slug}`.quiet();

mkdirSync(repoDir, { recursive: true });
if (existsSync(originPath)) unlinkSync(originPath);
symlinkSync(localPath, originPath);

updateSlugsFile(paths.slugsFile, repoInfo.slug, localPath);
updateOriginsFile(paths.learnOriginsFile, repoInfo.slug);

console.log(`Ready: ${originPath} → ${localPath}`);
