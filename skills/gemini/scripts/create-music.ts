#!/usr/bin/env bun
import { spawn } from 'bun';

const useToolScript = new URL('./use-tool.ts', import.meta.url).pathname;

const prompt = process.argv.slice(2).join(' ').trim();
if (!prompt) {
  console.error('Usage: bun "$SKILL_DIR/scripts/create-music.ts" "music prompt"');
  process.exit(1);
}

const proc = spawn([
  'bun',
  useToolScript,
  'create music',
  prompt
], { stdio: ['inherit', 'inherit', 'inherit'] });

await proc.exited;
process.exit(proc.exitCode ?? 0);
