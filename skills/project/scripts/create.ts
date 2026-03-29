#!/usr/bin/env bun
// create.ts - Create new GitHub repo, init, commit, push
import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { join } from "path";
import { getRoot, getPaths, ghqPath } from "./utils.ts";
