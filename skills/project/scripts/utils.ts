// utils.ts - Shared utilities for project scripts
import { Glob } from "bun";
import { existsSync, lstatSync, readlinkSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
