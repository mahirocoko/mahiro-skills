#!/usr/bin/env bun
// spinoff.ts - Graduate project to its own repo
import { $ } from "bun";
import { existsSync, readlinkSync, unlinkSync, symlinkSync } from "fs";
import { join } from "path";
import { getRoot, getPaths, ghqPath, parseRepo } from "./utils.ts";
