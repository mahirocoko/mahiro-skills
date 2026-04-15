#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync, symlinkSync, unlinkSync } from "fs";
import { join } from "path";
import {
  findTrackedProject,
  getPaths,
  getTrackedIncubateProjects,
  ghqRepoPath,
  parseRepo,
  updateSlugsFile,
} from "./utils.ts";

const [slug, target] = process.argv.slice(2);

if (!slug || !target) {
  console.log("Usage: bun skills/project/scripts/spinoff.ts <slug> <target-org/repo>");
  process.exit(1);
}

const paths = getPaths();
const sourceProject = findTrackedProject(getTrackedIncubateProjects(paths.incubateDir), slug);

if (!sourceProject?.target) {
  console.error(`Not found in incubate: ${slug}`);
  process.exit(1);
}

const targetRepo = parseRepo(target);
const targetPath = ghqRepoPath(targetRepo.owner, targetRepo.name);
const incubatePath = join(paths.incubateDir, sourceProject.owner, sourceProject.repo);

console.log(`Spinoff: ${sourceProject.slug} → ${targetRepo.slug}`);
console.log(`  Source: ${sourceProject.target}`);
console.log(`  Target: ${targetPath}`);

const repoExists = await $`gh repo view ${targetRepo.slug}`.quiet().then(() => true).catch(() => false);
if (!repoExists) await $`gh repo create ${targetRepo.slug} --private --clone=false`;

await $`ghq get github.com/${targetRepo.slug}`.quiet();

if (existsSync(sourceProject.target)) {
  await $`cp -R ${sourceProject.target}/. ${targetPath}`.quiet().catch(() => {});
}

await $`git -C ${targetPath} add -A`.quiet();
await $`git -C ${targetPath} commit -m "Spinoff from ${sourceProject.slug}"`.quiet().catch(() => {});
await $`git -C ${targetPath} push origin main`.quiet().catch(() =>
  $`git -C ${targetPath} push origin master`.quiet()
);

if (existsSync(incubatePath)) unlinkSync(incubatePath);
symlinkSync(targetPath, incubatePath);
updateSlugsFile(paths.slugsFile, targetRepo.slug, targetPath);

console.log(`\nSpinoff complete: ${sourceProject.slug} → ${targetRepo.slug}`);
console.log(`  GitHub: https://github.com/${targetRepo.slug}`);
