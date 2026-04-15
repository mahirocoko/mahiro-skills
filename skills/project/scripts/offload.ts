#!/usr/bin/env bun
import { appendFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import {
  findTrackedProject,
  getPaths,
  getTrackedIncubateProjects,
  getTrackedLearnProjects,
  now,
  today,
} from "./utils.ts";

const input = process.argv[2];

if (!input) {
  console.log("Usage: bun skills/project/scripts/offload.ts [slug|all]");
  process.exit(1);
}

const paths = getPaths();
mkdirSync(paths.logDir, { recursive: true });
const logFile = join(paths.logDir, `offload-${today()}.log`);

function offloadProject(projectPath: string) {
  unlinkSync(projectPath);
}

function collectProjects() {
  return [
    ...getTrackedLearnProjects(paths.learnDir),
    ...getTrackedIncubateProjects(paths.incubateDir),
  ];
}

if (input === "all") {
  const projects = collectProjects();
  appendFileSync(logFile, `# Offload ${today()} ${now()}\n`);

  for (const project of projects) {
    const pathToRemove = project.mode === "learn" ? project.originPath : project.path;
    if (!pathToRemove) continue;

    console.log(`Offloading ${project.mode}: ${project.slug}`);
    appendFileSync(logFile, `\n## ${project.slug}\n- Type: ${project.mode}\n- Path: ${project.target ?? project.path}\n`);
    offloadProject(pathToRemove);
  }

  console.log(`Offloaded ${projects.length} projects → ${logFile}`);
  process.exit(0);
}

const project = findTrackedProject(collectProjects(), input);
if (!project) {
  console.log(`Not found: ${input}`);
  process.exit(1);
}

const pathToRemove = project.mode === "learn" ? project.originPath : project.path;
if (!pathToRemove) {
  console.log(`No removable link for: ${project.slug}`);
  process.exit(1);
}

appendFileSync(logFile, `\n## ${project.slug}\n- Type: ${project.mode}\n- Path: ${project.target ?? project.path}\n`);
offloadProject(pathToRemove);
console.log(`Offloaded ${project.mode}: ${project.slug} → ${logFile}`);
