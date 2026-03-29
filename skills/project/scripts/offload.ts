#!/usr/bin/env bun
// offload.ts - Remove symlinks, keep ghq + slugs
import { mkdirSync, unlinkSync, appendFileSync } from "fs";
import { join } from "path";
import { getRoot, getPaths, getSymlinks, matchesSlug, today, now } from "./utils.ts";
