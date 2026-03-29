#!/usr/bin/env bun
// index.ts - Index manifest files to local knowledge logs
import { $ } from "bun";
import { existsSync, readdirSync } from "fs";
import { join, basename } from "path";
import { getRoot, getPaths, today } from "./utils.ts";
