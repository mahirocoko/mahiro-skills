#!/usr/bin/env bun
// learn.ts - Clone repo for read-only study
import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { dirname, join } from "path";
import { getRoot, getPaths, parseRepo, ghqPath, updateSlugsFile } from "./utils.ts";
