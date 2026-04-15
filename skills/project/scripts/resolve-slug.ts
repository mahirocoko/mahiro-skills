#!/usr/bin/env bun
import {
  expandPath,
  findGhqRepo,
  findInSlugs,
  findTrackedProject,
  getPaths,
  getTrackedIncubateProjects,
  getTrackedLearnProjects,
} from "./utils.ts";
import { existsSync } from "fs";

export function resolveSlug(input: string): string | null {
  const directPath = expandPath(input);
  if (existsSync(directPath)) return directPath;

  const paths = getPaths();

  const fromSlugs = findInSlugs(paths.slugsFile, input);
  if (fromSlugs) return fromSlugs;

  const learnProjects = getTrackedLearnProjects(paths.learnDir);
  const incubateProjects = getTrackedIncubateProjects(paths.incubateDir);
  const tracked = findTrackedProject([...learnProjects, ...incubateProjects], input);
  if (tracked?.target) return tracked.target;

  return findGhqRepo(input);
}

if (import.meta.main) {
  const input = process.argv[2];
  if (!input) {
    console.log("Usage: bun skills/project/scripts/resolve-slug.ts <slug>");
    process.exit(1);
  }

  const result = resolveSlug(input);
  if (!result) {
    console.log(`Not found: ${input}`);
    process.exit(1);
  }

  console.log(`Resolved: ${input} → ${result}`);
}
