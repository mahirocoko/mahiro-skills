import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "sprite-workflow");
const scriptsRoot = join(skillRoot, "scripts");

function runScript(name: string, args: string[], cwd = repoRoot) {
  return spawnSync("python3", [join(scriptsRoot, name), ...args], {
    cwd,
    encoding: "utf8",
  });
}

describe("sprite-workflow skill", () => {
  test("ships required skill resources and command wrappers", () => {
    expect(readFileSync(join(skillRoot, "SKILL.md"), "utf8")).toContain("name: sprite-workflow");
    expect(existsSync(join(skillRoot, "references", "contract.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "provenance-policy.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "subagent-prompts.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "repo-adapters.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "image-cockpit-patterns.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "asset-cleanup.md"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "extract-chroma-sheet.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "make-qa-previews.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "qa-sprite-sheet.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "center-align-frames.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "score-candidates.py"))).toBe(true);
    expect(existsSync(join(repoRoot, "commands", "sprite-workflow.md"))).toBe(true);
    expect(existsSync(join(repoRoot, "commands-gemini", "mh-sprite-workflow.toml"))).toBe(true);
  });

  test("creates jobs, validates manifests, and writes contact sheets", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-workflow-"));
    const root = join(temp, ".agent-state", "sprite-workflow");
    const created = runScript("new-job.py", [
      "--root", root,
      "--target-repo", temp,
      "--job-id", "job-test",
      "--title", "Mori idle",
      "--workflow-mode", "sprite-generate",
      "--prompt", "Generate a smooth idle animation.",
      "--negative-prompt", "text, watermark, cropped feet",
      "--notes", "Keep scale and baseline stable.",
      "--frame-size", "16x16",
      "--states", "idle,work",
      "--motion-preset", "idle-breathing",
      "--directions", "front,side,back",
      "--chroma-key", "green",
      "--tournament-candidates", "3",
      "--source-lane", "codex",
      "--usage", "source-candidate",
    ], temp);
    expect(created.status).toBe(0);
    const payload = JSON.parse(created.stdout) as { jobDir: string; manifest: string };
    expect(existsSync(join(payload.jobDir, "job.json"))).toBe(true);
    const job = JSON.parse(readFileSync(join(payload.jobDir, "job.json"), "utf8"));
    expect(job.workflowMode).toBe("sprite-generate");
    expect(job.prompt).toContain("smooth idle");
    expect(job.negativePrompt).toContain("cropped feet");
    expect(job.jobNotes).toContain("baseline");
    expect(job.spriteContext.action).toBe("idle-breathing");
    expect(job.spriteContext.directions).toEqual(["front", "side", "back"]);
    expect(job.spriteContext.chromaKey).toBe("green");
    expect(job.tournament.candidateCount).toBe(3);
    expect(job.tournament.isolateOutboxes).toBe(true);

    const framesDir = join(payload.jobDir, "outbox", "frames");
    mkdirSync(framesDir, { recursive: true });
    writeFileSync(join(framesDir, "idle-00.png"), "not-a-real-png-but-a-frame-file");
    writeFileSync(payload.manifest, JSON.stringify({
      frameSize: [16, 16],
      states: ["idle", "work"],
      frames: [{ file: "frames/idle-00.png", state: "idle", index: 0, durationMs: 120 }],
      anchors: { default: [8, 15] },
      provenance: { sourceLane: "codex", usage: "source-candidate" },
    }, null, 2));

    const validated = runScript("validate-manifest.py", [payload.manifest, "--json"], temp);
    expect(validated.status).toBe(0);
    expect(JSON.parse(validated.stdout).ok).toBe(true);

    const sheet = runScript("make-contact-sheet.py", [payload.manifest], temp);
    expect(sheet.status).toBe(0);
    const sheetPath = join(payload.jobDir, "outbox", "contact-sheet.html");
    expect(existsSync(sheetPath)).toBe(true);
    expect(readFileSync(sheetPath, "utf8")).toContain("Sprite contact sheet");
  });

  test("keeps promotion gated by provenance and explicit approval", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-promote-"));
    const outbox = join(temp, "job", "outbox");
    mkdirSync(join(outbox, "frames"), { recursive: true });
    writeFileSync(join(outbox, "frames", "idle-00.png"), "frame");
    const manifest = join(outbox, "manifest.json");
    writeFileSync(manifest, JSON.stringify({
      frameSize: [16, 16],
      states: ["idle"],
      frames: [{ file: "frames/idle-00.png", state: "idle", index: 0 }],
      provenance: { sourceLane: "codex", usage: "source-candidate" },
    }, null, 2));

    const blocked = runScript("promote-artifact.py", [manifest, "--target-dir", join(temp, "prod"), "--approve"], temp);
    expect(blocked.status).toBe(1);
    expect(blocked.stderr + blocked.stdout).toContain("not production-approved");

    const dryRun = runScript("promote-artifact.py", [manifest, "--target-dir", join(temp, "prod"), "--allow-source-candidate", "--dry-run"], temp);
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toContain("would copy");
  });

  test("documents Image Cockpit workflow patterns", () => {
    const reference = readFileSync(join(skillRoot, "references", "image-cockpit-patterns.md"), "utf8");
    expect(reference).toContain("Pixel Art Generation");
    expect(reference).toContain("Image Editing");
    expect(reference).toContain("Animation Generation");
    expect(reference).toContain("Effect Animation");
    expect(reference).toContain("Tournament behavior");
    expect(reference).toContain("front-three-quarter");
  });

  test("documents asset cleanup pairing with asset-designer", () => {
    const skill = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
    const cleanup = readFileSync(join(skillRoot, "references", "asset-cleanup.md"), "utf8");
    expect(skill).toContain("Pair with `asset-designer`");
    expect(skill).toContain("true alpha vs chroma-key source");
    expect(cleanup).toContain("sprite-workflow");
    expect(cleanup).toContain("asset-designer");
    expect(cleanup).toContain("preview-light.png");
    expect(cleanup).toContain("preview-dark.png");
    expect(cleanup).toContain("preview-checker.png");
    expect(cleanup).toContain("Promotion requires");
  });


  test("runs chroma extraction, QA previews, and candidate scoring when ImageMagick is available", () => {
    const magick = spawnSync("magick", ["-version"], { encoding: "utf8" });
    if (magick.status !== 0) return;

    const temp = mkdtempSync(join(tmpdir(), "sprite-pipeline-"));
    const raw = join(temp, "raw.png");
    const created = spawnSync("magick", [
      "-size", "80x20", "xc:#ff00ff",
      "-fill", "#111111", "-draw", "rectangle 4,4 10,14",
      "-fill", "#eeeeee", "-draw", "rectangle 8,5 13,12",
      "-fill", "#111111", "-draw", "rectangle 24,5 31,14",
      "-fill", "#eeeeee", "-draw", "rectangle 29,6 34,12",
      "-fill", "#111111", "-draw", "rectangle 44,6 52,14",
      "-fill", "#eeeeee", "-draw", "rectangle 50,7 55,12",
      "-fill", "#111111", "-draw", "rectangle 64,7 72,14",
      "-fill", "#eeeeee", "-draw", "rectangle 70,8 76,12",
      raw,
    ], { encoding: "utf8" });
    expect(created.status).toBe(0);

    const out = join(temp, "out");
    const extracted = runScript("extract-chroma-sheet.py", [
      "--input", raw,
      "--output-dir", out,
      "--frames", "4",
      "--frame-size", "16x16",
      "--chroma-key", "#ff00ff",
      "--source-cell-width", "20",
      "--crop-width", "20",
      "--crop-height", "20",
      "--resize-percent", "100",
      "--trim",
      "--spill", "magenta",
      "--sheet-name", "sheet.png",
      "--preview-name", "preview.gif",
      "--json",
    ], temp);
    expect(extracted.status).toBe(0);
    const payload = JSON.parse(extracted.stdout);
    expect(existsSync(payload.sheet)).toBe(true);
    expect(existsSync(payload.previewGif)).toBe(true);

    const qaPreviews = runScript("make-qa-previews.py", [payload.sheet, "--output-dir", out, "--json"], temp);
    expect(qaPreviews.status).toBe(0);
    expect(existsSync(join(out, "preview-light.png"))).toBe(true);
    expect(existsSync(join(out, "preview-dark.png"))).toBe(true);
    expect(existsSync(join(out, "preview-checker.png"))).toBe(true);

    const qaReport = join(out, "qa.json");
    const qa = runScript("qa-sprite-sheet.py", [payload.sheet, "--frames", "4", "--frame-size", "16x16", "--edge-margin", "-1", "--warn-edge-margin", "-1", "--report", qaReport, "--json"], temp);
    expect(qa.status).toBe(0);
    expect(JSON.parse(qa.stdout).ok).toBe(true);
    expect(existsSync(qaReport)).toBe(true);

    const scored = runScript("score-candidates.py", [qaReport, "--json"], temp);
    expect(scored.status).toBe(0);
    expect(JSON.parse(scored.stdout).winner.report).toBe(qaReport);
  });


  test("center-align helper fixes horizontal center drift and QA can gate centers", () => {
    const magick = spawnSync("magick", ["-version"], { encoding: "utf8" });
    if (magick.status !== 0) return;

    const temp = mkdtempSync(join(tmpdir(), "sprite-center-"));
    const sheet = join(temp, "drift.png");
    const frameA = join(temp, "a.png");
    const frameB = join(temp, "b.png");
    spawnSync("magick", ["-size", "16x16", "xc:none", "-fill", "#111", "-draw", "rectangle 2,4 7,14", frameA], { encoding: "utf8" });
    spawnSync("magick", ["-size", "16x16", "xc:none", "-fill", "#111", "-draw", "rectangle 8,4 13,14", frameB], { encoding: "utf8" });
    const combined = spawnSync("magick", [frameA, frameB, "+append", sheet], { encoding: "utf8" });
    expect(combined.status).toBe(0);

    const gated = runScript("qa-sprite-sheet.py", [sheet, "--frames", "2", "--frame-size", "16x16", "--allow-bottom-edge", "--target-center-x", "8", "--max-center-drift", "2", "--warn-center-as-error", "--json"], temp);
    expect(gated.status).toBe(1);
    expect(JSON.parse(gated.stdout).failures.some((failure: string) => failure.includes("center drift"))).toBe(true);

    const out = join(temp, "centered");
    const aligned = runScript("center-align-frames.py", ["--input", sheet, "--output-dir", out, "--frames", "2", "--frame-size", "16x16", "--target-center-x", "8", "--json"], temp);
    expect(aligned.status).toBe(0);
    const payload = JSON.parse(aligned.stdout);
    expect(existsSync(payload.sheet)).toBe(true);

    const verified = runScript("qa-sprite-sheet.py", [payload.sheet, "--frames", "2", "--frame-size", "16x16", "--allow-bottom-edge", "--target-center-x", "8", "--max-center-drift", "2", "--warn-center-as-error", "--json"], temp);
    expect(verified.status).toBe(0);
  });

  test("preview GIF script reports Pillow dependency clearly when unavailable", () => {
    const result = runScript("make-preview-gif.py", ["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Generate animated GIF preview");
  });
});
