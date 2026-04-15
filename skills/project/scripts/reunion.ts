#!/usr/bin/env bun
import { $ } from "bun";
import { appendFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import {
  findTrackedProject,
  getPaths,
  getTrackedIncubateProjects,
  getTrackedLearnProjects,
  now,
  today,
} from "./utils.ts";

const args = process.argv.slice(2);
const input = args.find((arg) => !arg.startsWith("--"));
const keep = args.includes("--keep");

if (!input) {
  console.log("Usage: bun skills/project/scripts/reunion.ts [slug|all] [--keep]");
  process.exit(1);
}

const paths = getPaths();
mkdirSync(paths.logDir, { recursive: true });

function walkMarkdownFiles(root: string): string[] {
  if (!existsSync(root)) return [];

  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) files.push(fullPath);
  }

  return files;
}

function collectProjects() {
  return [
    ...getTrackedLearnProjects(paths.learnDir),
    ...getTrackedIncubateProjects(paths.incubateDir),
  ];
}

async function reunionSingle(slug: string) {
  const project = findTrackedProject(collectProjects(), slug);
  if (!project?.target) {
    console.log(`Not loaded: ${slug}. Use /project learn ${slug} or /project incubate ${slug}.`);
    return;
  }

  console.log(`Reunion: ${project.slug}`);
  console.log(`  Path: ${project.target}`);

  await $`ghq get -u github.com/${project.slug}`.quiet().catch(() => {});

  const manifestPath = join(paths.logDir, `index-${today()}-${project.slug.replace("/", "_")}.json`);
  const scanRoots = [
    join(project.target, ".agent-state", "memory"),
    join(project.target, "learnings"),
    join(project.target, "retrospectives"),
    join(project.target, "docs"),
  ];

  const files = scanRoots.flatMap((root) => walkMarkdownFiles(root));

  await Bun.write(
    manifestPath,
    JSON.stringify(
      {
        project: project.slug,
        source: `https://github.com/${project.slug}`,
        local_path: project.target,
        scanned: `${today()} ${now()}`,
        files,
      },
      null,
      2,
    ),
  );

  appendFileSync(join(paths.logDir, `reunion-${today()}.log`), `- ${project.slug}: reunion at ${now()}\n`);
  console.log(`  Manifest: ${manifestPath}`);

  if (!keep) {
    const pathToRemove = project.mode === "learn" ? project.originPath : project.path;
    if (pathToRemove) {
      unlinkSync(pathToRemove);
      console.log("  Offloaded (use --keep to retain)");
    }
  }
}

if (input === "all") {
  const seen = new Set<string>();
  for (const project of collectProjects()) {
    if (seen.has(project.slug)) continue;
    seen.add(project.slug);
    await reunionSingle(project.slug);
    console.log("---");
  }
} else {
  await reunionSingle(input);
}
