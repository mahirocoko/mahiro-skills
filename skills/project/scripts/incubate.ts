#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { join } from "path";
import { getPaths, ghqRepoPath, parseRepo, updateSlugsFile } from "./utils.ts";

const args = process.argv.slice(2);
const input = args[0];

if (!input) {
  console.log("Usage: bun skills/project/scripts/incubate.ts <owner/repo|name> [--org org]");
  process.exit(1);
}

const orgFlag = args.indexOf("--org");
const defaultOrg = orgFlag !== -1 ? args[orgFlag + 1] : "mahirocoko";
const repoInfo = parseRepo(input, defaultOrg);

const paths = getPaths();
const localPath = ghqRepoPath(repoInfo.owner, repoInfo.name);
const linkPath = join(paths.incubateDir, repoInfo.owner, repoInfo.name);

console.log(`Incubating: ${repoInfo.slug}`);

const repoExists = await $`gh repo view ${repoInfo.slug}`.quiet().then(() => true).catch(() => false);

if (repoExists) {
  await $`ghq get -u github.com/${repoInfo.slug}`.quiet();
} else {
  console.log("  Creating new repo...");
  await $`gh repo create ${repoInfo.slug} --private --clone=false`;
  await $`ghq get github.com/${repoInfo.slug}`.quiet();

  if (!existsSync(join(localPath, "README.md"))) {
    await Bun.write(join(localPath, "README.md"), `# ${repoInfo.name}\n`);
    await $`git -C ${localPath} add README.md`;
    await $`git -C ${localPath} commit -m "Initial commit"`.quiet().catch(() => {});
    await $`git -C ${localPath} push origin main`.quiet().catch(() =>
      $`git -C ${localPath} push origin master`.quiet()
    );
  }
}

mkdirSync(join(paths.incubateDir, repoInfo.owner), { recursive: true });
if (existsSync(linkPath)) unlinkSync(linkPath);
symlinkSync(localPath, linkPath);

updateSlugsFile(paths.slugsFile, repoInfo.slug, localPath);

console.log(`Ready: ${linkPath} → ${localPath}`);
console.log(`GitHub: https://github.com/${repoInfo.slug}`);
