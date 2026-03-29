#!/usr/bin/env bun

import { $ } from "bun";
import { mkdtempSync, existsSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const url = process.argv[2];
const requestedLang = process.argv[3] || "auto";

if (!url) {
  console.error("Usage: bun get-cc.ts <youtube-url> [lang|auto]");
  process.exit(1);
}

type YtDlpMeta = {
  id?: string;
  language?: string;
  subtitles?: Record<string, unknown>;
  automatic_captions?: Record<string, unknown>;
};

const uniq = (items: string[]) => [...new Set(items.filter(Boolean))];

const withPrimaryVariant = (lang: string) => {
  const lower = lang.toLowerCase();
  const primary = lower.split("-")[0];
  return primary === lower ? [lower] : [lower, primary];
};

const listSrtFiles = (dir: string, videoId: string) =>
  readdirSync(dir)
    .filter((file) => file.endsWith(".srt") && file.startsWith(`${videoId}.`))
    .map((file) => join(dir, file));

const detectLanguageOrder = (meta: YtDlpMeta, langArg: string) => {
  if (langArg !== "auto") {
    return uniq(withPrimaryVariant(langArg));
  }

  const ordered: string[] = [];

  const subtitleLangs = Object.keys(meta.subtitles || {});
  const autoCaptionLangs = Object.keys(meta.automatic_captions || {});

  if (meta.language) ordered.push(...withPrimaryVariant(meta.language));
  ordered.push(...subtitleLangs.flatMap(withPrimaryVariant));
  ordered.push(...autoCaptionLangs.flatMap(withPrimaryVariant));

  ordered.push("en", "th");

  return uniq(ordered);
};

// Create temp dir
const tempDir = mkdtempSync(join(tmpdir(), "cc-"));
const outTemplate = join(tempDir, "%(id)s");

try {
  const meta = (await $`yt-dlp --dump-json --no-download ${url}`.json()) as YtDlpMeta;
  const videoId = meta.id || (await $`yt-dlp --get-id ${url}`.text()).trim();
  const languageOrder = detectLanguageOrder(meta, requestedLang);

  for (const lang of languageOrder) {
    for (const file of readdirSync(tempDir).filter((name) => name.endsWith(".srt"))) {
      rmSync(join(tempDir, file), { force: true });
    }

    try {
      await $`yt-dlp --write-subs --write-auto-sub --sub-lang ${lang} --sub-format srt --skip-download -o ${outTemplate} ${url}`.quiet();
    } catch {
      continue;
    }

    const exactFile = join(tempDir, `${videoId}.${lang}.srt`);
    if (existsSync(exactFile)) {
      console.log(await Bun.file(exactFile).text());
      process.exit(0);
    }

    const srtFiles = listSrtFiles(tempDir, videoId);
    if (srtFiles.length > 0) {
      console.log(await Bun.file(srtFiles[0]).text());
      process.exit(0);
    }
  }

  console.log("NO_CAPTIONS_AVAILABLE");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
