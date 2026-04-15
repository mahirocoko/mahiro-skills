#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync, mkdirSync, symlinkSync, unlinkSync } from "fs";
import { join } from "path";
import { getPaths, ghqRepoPath, parseRepo, updateSlugsFile } from "./utils.ts";

const args = process.argv.slice(2);
const name = args.find((arg) => !arg.startsWith("--"));

if (!name) {
  console.log("Usage: bun skills/project/scripts/create.ts <name> [--org org] [--public]");
  process.exit(1);
}

const orgFlag = args.indexOf("--org");
const org = orgFlag !== -1 ? args[orgFlag + 1] : "mahirocoko";
const isPublic = args.includes("--public");
const repoInfo = parseRepo(name, org);

const paths = getPaths();
const localPath = ghqRepoPath(repoInfo.owner, repoInfo.name);
const linkPath = join(paths.incubateDir, repoInfo.owner, repoInfo.name);
const visibility = isPublic ? "public" : "private";

console.log(`Creating: ${repoInfo.slug} (${visibility})`);

await $`gh repo create ${repoInfo.slug} --${visibility} --clone=false`.quiet().catch(() => {
  console.log("  Repo may already exist, continuing...");
});

await $`ghq get -u github.com/${repoInfo.slug}`.quiet().catch(() => {});

if (!existsSync(join(localPath, ".git"))) {
  mkdirSync(localPath, { recursive: true });
  await $`git -C ${localPath} init`.quiet();
  await $`git -C ${localPath} remote add origin git@github.com:${repoInfo.slug}.git`.quiet().catch(() => {});
}

if (!existsSync(join(localPath, "README.md"))) {
  await Bun.write(join(localPath, "README.md"), `# ${repoInfo.name}\n\nCreated by mahiro-skills.\n`);
}

const hasCommits = await $`git -C ${localPath} log --oneline -1`.quiet().then(() => true).catch(() => false);
if (!hasCommits) {
  await $`git -C ${localPath} add -A`.quiet();
  await $`git -C ${localPath} commit -m "Initial commit"`.quiet().catch(() => {});
}

await $`git -C ${localPath} push -u origin main`.quiet().catch(() =>
  $`git -C ${localPath} push -u origin master`.quiet().catch(() =>
    $`git -C ${localPath} branch -M main && git -C ${localPath} push -u origin main`.quiet()
  )
);

mkdirSync(join(paths.incubateDir, repoInfo.owner), { recursive: true });
if (existsSync(linkPath)) unlinkSync(linkPath);
symlinkSync(localPath, linkPath);
updateSlugsFile(paths.slugsFile, repoInfo.slug, localPath);

console.log(`\nCreated: ${repoInfo.slug} (${visibility})`);
console.log(`  GitHub: https://github.com/${repoInfo.slug}`);
console.log(`  Local: ${localPath}`);
