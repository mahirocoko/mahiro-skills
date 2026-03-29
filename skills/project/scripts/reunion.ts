#!/usr/bin/env bun
// reunion.ts - Scan project, create manifest, optionally offload
import { $ } from "bun";
import { existsSync, mkdirSync, appendFileSync, readdirSync } from "fs";
import { join } from "path";
import { getRoot, getPaths, getSymlinks, matchesSlug, today, now, LinkInfo } from "./utils.ts";
