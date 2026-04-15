#!/usr/bin/env bun
import { existsSync, readdirSync } from "fs";
import { basename, join } from "path";
import { getPaths, today } from "./utils.ts";

const args = process.argv.slice(2);
const command = args[0] || "list";
const dryRun = args.includes("--dry-run");
const dateArg = args.find((arg) => /^20\d{2}-\d{2}-\d{2}$/.test(arg) || arg === "today");
const selectedDate = dateArg === "today" || !dateArg ? today() : dateArg;

const paths = getPaths();

function scoreFile(file: string): number {
  if (file.includes("/.agent-state/") && file.endsWith(".md")) return 10;
  if (file.includes("/retrospectives/") && file.endsWith(".md")) return 8;
  if (file.includes("/learnings/") && file.endsWith(".md")) return 6;
  if (file.includes("/docs/") && file.endsWith(".md")) return 4;
  return 0;
}

function listManifestNames() {
  if (!existsSync(paths.logDir)) return [];

  return readdirSync(paths.logDir).filter(
    (entry) => entry.startsWith(`index-${selectedDate}-`) && entry.endsWith(".json"),
  );
}

async function indexManifest(manifestPath: string) {
  const data = JSON.parse(await Bun.file(manifestPath).text()) as {
    project: string;
    source: string;
    files?: string[];
  };

  console.log(`\nIndexing: ${data.project}`);
  console.log(`  Source: ${data.source}`);

  let indexed = 0;
  let skipped = 0;

  for (const file of data.files ?? []) {
    if (!existsSync(file)) {
      console.log(`  Not found: ${basename(file)}`);
      continue;
    }

    if (!scoreFile(file)) {
      skipped += 1;
      continue;
    }

    console.log(`  ${dryRun ? "[DRY] " : ""}${basename(file)}`);
    indexed += 1;
  }

  console.log(`  Indexed: ${indexed}, Skipped: ${skipped}`);
}

async function listManifests() {
  const manifests = listManifestNames();
  console.log(`Manifests for ${selectedDate}:`);

  if (!manifests.length) {
    console.log("  (none)");
    return;
  }

  let total = 0;
  let indexable = 0;

  for (const manifest of manifests) {
    const filePath = join(paths.logDir, manifest);
    const data = JSON.parse(await Bun.file(filePath).text()) as { files?: string[] };
    const files = data.files ?? [];
    const scored = files.filter((file) => scoreFile(file) > 0);
    const slug = manifest
      .replace(`index-${selectedDate}-`, "")
      .replace(".json", "")
      .replace("_", "/");

    console.log(`  ${slug}: ${scored.length}/${files.length} indexable`);
    total += files.length;
    indexable += scored.length;
  }

  console.log(`\nTotal: ${total} files, ${indexable} indexable`);
}

if (command === "list" || command === "--list") {
  await listManifests();
} else if (command === "all") {
  for (const manifest of listManifestNames()) {
    await indexManifest(join(paths.logDir, manifest));
  }
} else {
  const safeSlug = command.replace("/", "_");
  const manifestPath = join(paths.logDir, `index-${selectedDate}-${safeSlug}.json`);

  if (!existsSync(manifestPath)) {
    console.log(`Not found: ${manifestPath}`);
    await listManifests();
    process.exit(1);
  }

  await indexManifest(manifestPath);
}
