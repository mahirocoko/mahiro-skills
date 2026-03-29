#!/usr/bin/env bun
// incubate.ts - Clone or create repo for active work
import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { dirname, join } from "path";
import { getRoot, getPaths, parseRepo, ghqPath, updateSlugsFile } from "./utils.ts";
