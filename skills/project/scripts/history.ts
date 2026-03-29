#!/usr/bin/env bun
// history.ts - Git timeline analysis
import { $ } from "bun";
import { existsSync } from "fs";
import { basename } from "path";
import { resolveSlug } from "./resolve-slug.ts";
