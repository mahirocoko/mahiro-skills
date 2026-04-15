#!/usr/bin/env bun
import { $ } from "bun";
import { getGhqRoot } from "./utils.ts";

const args = process.argv.slice(2);
const query = args[0];
const remote = args.includes("--remote");

if (!query) {
  console.log("Usage: bun skills/project/scripts/search.ts <query> [--remote]");
  process.exit(1);
}

if (query === "--list-orgs") {
  console.log("Organizations:");
  const orgs = (await $`gh api user/orgs --jq '.[].login'`.text()).trim().split("\n").filter(Boolean);
  for (const org of orgs) {
    const count = await $`gh repo list ${org} --limit 1000 --json name --jq 'length'`.text().catch(() => "?");
    console.log(`  ${org} (${count.trim()} repos)`);
  }
  process.exit(0);
}

console.log(`Searching local ghq: ${query}\n`);

const local = (await $`ghq list`.text().catch(() => ""))
  .split("\n")
  .filter((line) => line.toLowerCase().includes(query.toLowerCase()));

if (local.length) {
  console.log(`Found ${local.length} local:`);
  const ghqRoot = getGhqRoot();
  for (const repo of local) {
    console.log(`  ${ghqRoot}/${repo}`);
  }

  if (!remote) process.exit(0);
}

console.log("\nSearching GitHub...\n");

const user = (await $`gh api user --jq '.login'`.text()).trim();
console.log(`Personal (${user}):`);
const personal = await $`gh repo list ${user} --limit 100 --json name --jq '.[].name'`.text().catch(() => "");
for (const name of personal.split("\n").filter((entry) => entry.toLowerCase().includes(query.toLowerCase()))) {
  console.log(`  ${name}`);
}

const orgs = (await $`gh api user/orgs --jq '.[].login'`.text()).trim().split("\n").filter(Boolean);
for (const org of orgs) {
  const repos = await $`gh repo list ${org} --limit 100 --json name --jq '.[].name'`.text().catch(() => "");
  const matches = repos.split("\n").filter((name) => name.toLowerCase().includes(query.toLowerCase()));
  if (!matches.length) continue;

  console.log(`\n${org}:`);
  for (const name of matches) {
    console.log(`  ${org}/${name}`);
  }
}

console.log("\nTo clone: /project learn owner/repo");
