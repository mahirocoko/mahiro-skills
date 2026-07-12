import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "sprite-workflow");
const scriptsRoot = join(skillRoot, "scripts");
const imagePython = [process.env.SPRITE_WORKFLOW_PYTHON, "/usr/bin/python3", "python3"].find(
  candidate => candidate && spawnSync(candidate, ["-c", "import PIL"], { encoding: "utf8" }).status === 0,
) ?? "python3";

function runScript(name: string, args: string[], cwd = repoRoot) {
  return spawnSync(imagePython, [join(scriptsRoot, name), ...args], {
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
    expect(existsSync(join(skillRoot, "references", "prompt-presets.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "runner-contracts.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "tournament-scoring.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "asset-cleanup.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "dicut-cleanup.md"))).toBe(true);
    expect(existsSync(join(skillRoot, "references", "master-sprite-first.md"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "extract-chroma-sheet.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "make-qa-previews.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "qa-sprite-sheet.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "make-frame-zoom.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "motion-jitter-report.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "center-align-frames.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "smooth-settle-frame.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "compare-dicut-modes.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "score-candidates.py"))).toBe(true);
    expect(existsSync(join(scriptsRoot, "promote-named-artifact.py"))).toBe(true);
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


  test("promotes approved artifacts with safe asset-name filenames", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-named-promote-"));
    const outbox = join(temp, "job", "outbox");
    mkdirSync(outbox, { recursive: true });
    expect(spawnSync(imagePython, ["-c", `from PIL import Image\nim=Image.new('RGBA',(16,16),(255,0,0,255)); im.save(${JSON.stringify(join(outbox, "sheet.png"))},'PNG'); im.save(${JSON.stringify(join(outbox, "preview.gif"))},'GIF'); im.save(${JSON.stringify(join(outbox, "idle-frame.png"))},'PNG')`]).status).toBe(0);
    const manifest = join(outbox, "manifest.json");
    writeFileSync(manifest, JSON.stringify({
      frameSize: [16, 16],
      states: ["idle"],
      frames: [{ file: "idle-frame.png", state: "idle", index: 0 }],
      anchors: { default: [8, 15] },
      provenance: { sourceLane: "codex", usage: "source-candidate" },
      artifacts: { sheet: "sheet.png", previewGif: "preview.gif" },
    }, null, 2));
    const promoted = runScript("promote-named-artifact.py", [
      manifest,
      "--target-dir", join(temp, "public-assets"),
      "--asset-name", "cat-sit-tea",
      "--approve",
      "--allow-source-candidate",
    ], temp);
    expect(promoted.status).toBe(0);
    expect(existsSync(join(temp, "public-assets", "cat-sit-tea-sprite-sheet.png"))).toBe(true);
    expect(existsSync(join(temp, "public-assets", "cat-sit-tea-preview.gif"))).toBe(true);
    const outputManifest = JSON.parse(readFileSync(join(temp, "public-assets", "cat-sit-tea-manifest.json"), "utf8"));
    expect(outputManifest.name).toBe("cat-sit-tea");
    expect(outputManifest.artifacts.sheet.file).toBe("cat-sit-tea-sprite-sheet.png");
    expect(outputManifest.provenance.usage).toBe("production-approved");
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


  test("documents deeper Image Cockpit prompt and runner contracts", () => {
    const presets = readFileSync(join(skillRoot, "references", "prompt-presets.md"), "utf8");
    const runner = readFileSync(join(skillRoot, "references", "runner-contracts.md"), "utf8");
    const scoring = readFileSync(join(skillRoot, "references", "tournament-scoring.md"), "utf8");
    expect(presets).toContain("walk-cycle");
    expect(presets).toContain("Shared negative prompt");
    expect(presets).toContain("Standard direction-split animation");
    expect(runner).toContain("blocker JSON sidecar");
    expect(runner).toContain("sprite-generate");
    expect(scoring).toContain("Quality classifications");
    expect(scoring).toContain("visual honesty");
    const master = readFileSync(join(skillRoot, "references", "master-sprite-first.md"), "utf8");
    expect(master).toContain("clean master sprite");
    expect(master).toContain("Stop and regenerate");
  });

  test("new-job can scaffold an Image Cockpit-style walk prompt", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-scaffold-"));
    const created = runScript("new-job.py", [
      "--root", join(temp, ".agent-state", "sprite-workflow"),
      "--target-repo", temp,
      "--job-id", "walk-scaffold",
      "--title", "Cat walk",
      "--workflow-mode", "sprite-generate",
      "--prompt-preset", "walk-cycle",
      "--motion-preset", "walk-cycle",
      "--states", "walk",
      "--frame-size", "176x176",
      "--chroma-key", "#ff00ff",
      "--tournament-candidates", "3",
    ], temp);
    expect(created.status).toBe(0);
    const payload = JSON.parse(created.stdout) as { jobDir: string };
    const job = JSON.parse(readFileSync(join(payload.jobDir, "job.json"), "utf8"));
    const prompt = readFileSync(join(payload.jobDir, "prompt.md"), "utf8");
    expect(job.prompt).toContain("Motion-specific requirements");
    expect(job.prompt).toContain("walk cycle");
    expect(prompt).toContain("Character preservation");
    expect(prompt).toContain("Negative prompt / avoid");
    expect(prompt).toContain("exact solid flat key color");
    expect(prompt).toContain("generous spacing between frames");
    expect(prompt).toContain("visual honesty");
    expect(job.tournament.candidateCount).toBe(3);
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

  test("documents target-size visual honesty before promotion", () => {
    const skill = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
    const cleanup = readFileSync(join(skillRoot, "references", "asset-cleanup.md"), "utf8");
    expect(skill).toContain("Passing scripts/QA does not mean an asset is production-ready");
    expect(skill).toContain("visual honesty gate");
    expect(skill).toContain("do not call it final");
    expect(cleanup).toContain("Visual honesty gate");
    expect(cleanup).toContain("do not describe it as final");
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



  test("runs edge-connected dicut cleanup mode when ImageMagick is available", () => {
    const magick = spawnSync("magick", ["-version"], { encoding: "utf8" });
    if (magick.status !== 0) return;

    const temp = mkdtempSync(join(tmpdir(), "sprite-dicut-"));
    const raw = join(temp, "raw.png");
    const created = spawnSync("magick", [
      "-size", "96x32", "xc:#ee08df",
      "-fill", "#111111", "-draw", "rectangle 8,6 22,25",
      "-fill", "#ff00ff", "-draw", "rectangle 13,12 16,15",
      "-fill", "#111111", "-draw", "rectangle 62,5 78,25",
      "-fill", "#ff77aa", "-draw", "rectangle 70,10 74,14",
      raw,
    ], { encoding: "utf8" });
    expect(created.status).toBe(0);

    const out = join(temp, "out");
    const extracted = runScript("extract-chroma-sheet.py", [
      "--input", raw,
      "--output-dir", out,
      "--frames", "2",
      "--frame-size", "32x32",
      "--chroma-key", "#ff00ff",
      "--background-mode", "edge-connected",
      "--slice-mode", "component-x-runs",
      "--component-run-padding", "2",
      "--key-tolerance", "0.22",
      "--resize-percent", "100",
      "--trim",
      "--spill", "none",
      "--state", "test",
      "--json",
    ], temp);
    expect(extracted.status).toBe(0);
    const payload = JSON.parse(extracted.stdout);
    expect(existsSync(payload.sheet)).toBe(true);
    const manifest = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"));
    expect(manifest.source.backgroundMode).toBe("edge-connected");
    expect(manifest.source.sliceMode).toBe("component-x-runs");
    expect(manifest.source.detectedRuns.length).toBe(2);
  });



  test("documents dicut winner selection around edge-connected and spill", () => {
    const dicut = readFileSync(join(skillRoot, "references", "dicut-cleanup.md"), "utf8");
    expect(dicut).toContain("Edge-connected is the default recommendation");
    expect(dicut).toContain("Do not judge only on dark previews");
    expect(dicut).toContain("Spill cleanup is a fallback");
    const skill = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
    expect(skill).toContain("edge-connected is the default");
  });


  test("qa gates bounds width drift that center checks can miss", () => {
    const magick = spawnSync("magick", ["-version"], { encoding: "utf8" });
    if (magick.status !== 0) return;

    const temp = mkdtempSync(join(tmpdir(), "sprite-bounds-drift-"));
    const sheet = join(temp, "sheet.png");
    const frameA = join(temp, "frame-a.png");
    const frameB = join(temp, "frame-b.png");
    expect(spawnSync("magick", [
      "-size", "32x32", "xc:none",
      "-fill", "white", "-draw", "rectangle 11,8 20,24",
      frameA,
    ], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("magick", [
      "-size", "32x32", "xc:none",
      "-fill", "white", "-draw", "rectangle 9,8 22,24",
      frameB,
    ], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("magick", [frameA, frameB, "+append", sheet], { encoding: "utf8" }).status).toBe(0);

    const report = join(temp, "qa.json");
    const qa = runScript("qa-sprite-sheet.py", [
      sheet,
      "--frames", "2",
      "--frame-size", "32x32",
      "--target-center-x", "16",
      "--max-center-drift", "2",
      "--max-center-range", "2",
      "--max-bounds-width-range", "2",
      "--report", report,
      "--json",
    ], temp);
    expect(qa.status).toBe(0);
    const payload = JSON.parse(readFileSync(report, "utf8"));
    expect(payload.ok).toBe(true);
    expect(payload.warnings.some((warning: string) => warning.includes("bounds width range"))).toBe(true);
  });


  test("creates frame zooms and jitter reports for subtle loops", () => {
    const magick = spawnSync("magick", ["-version"], { encoding: "utf8" });
    if (magick.status !== 0) return;

    const temp = mkdtempSync(join(tmpdir(), "sprite-motion-review-"));
    const sheet = join(temp, "sheet.png");
    const frameA = join(temp, "a.png");
    const frameB = join(temp, "b.png");
    const frameC = join(temp, "c.png");
    expect(spawnSync("magick", ["-size", "32x32", "xc:none", "-fill", "white", "-draw", "rectangle 11,8 20,24", frameA], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("magick", ["-size", "32x32", "xc:none", "-fill", "white", "-draw", "rectangle 9,8 22,24", frameB], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("magick", ["-size", "32x32", "xc:none", "-fill", "white", "-draw", "rectangle 11,8 20,24", frameC], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("magick", [frameA, frameB, frameC, "+append", sheet], { encoding: "utf8" }).status).toBe(0);

    const out = join(temp, "review");
    const zoom = runScript("make-frame-zoom.py", [sheet, "--output-dir", out, "--frames", "3", "--frame-size", "32x32", "--adjacent", "1", "--json"], temp);
    expect(zoom.status).toBe(0);
    const zoomPayload = JSON.parse(zoom.stdout);
    expect(existsSync(zoomPayload.strip)).toBe(true);
    expect(existsSync(zoomPayload.adjacent[0])).toBe(true);

    const qaReport = join(temp, "qa.json");
    const qa = runScript("qa-sprite-sheet.py", [sheet, "--frames", "3", "--frame-size", "32x32", "--max-bounds-width-range", "2", "--report", qaReport, "--json"], temp);
    expect(qa.status).toBe(0);
    const jitter = runScript("motion-jitter-report.py", [qaReport, "--output", join(temp, "jitter.json"), "--max-bounds-width-delta", "2", "--json"], temp);
    expect(jitter.status).toBe(1);
    const jitterPayload = JSON.parse(jitter.stdout);
    expect(jitterPayload.riskyTransitions.some((risk: { metric: string }) => risk.metric === "bounds.width")).toBe(true);
  });

  test("smooth settle helper replaces a noisy frame with a stable frame", () => {
    const magick = spawnSync("magick", ["-version"], { encoding: "utf8" });
    if (magick.status !== 0) return;

    const temp = mkdtempSync(join(tmpdir(), "sprite-smooth-settle-"));
    const sheet = join(temp, "sheet.png");
    const frameA = join(temp, "a.png");
    const frameB = join(temp, "b.png");
    const frameC = join(temp, "c.png");
    expect(spawnSync("magick", ["-size", "32x32", "xc:none", "-fill", "white", "-draw", "rectangle 11,8 20,24", frameA], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("magick", ["-size", "32x32", "xc:none", "-fill", "white", "-draw", "rectangle 9,8 22,24", frameB], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("magick", ["-size", "32x32", "xc:none", "-fill", "white", "-draw", "rectangle 11,8 20,24", frameC], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("magick", [frameA, frameB, frameC, "+append", sheet], { encoding: "utf8" }).status).toBe(0);

    const out = join(temp, "smooth");
    const smoothed = runScript("smooth-settle-frame.py", ["--input", sheet, "--output-dir", out, "--frames", "3", "--frame-size", "32x32", "--replace-index", "1", "--source-index", "2", "--sheet-name", "sheet.png", "--preview-name", "preview.gif", "--json"], temp);
    expect(smoothed.status).toBe(0);
    const payload = JSON.parse(smoothed.stdout);
    expect(existsSync(payload.sheet)).toBe(true);
    expect(existsSync(payload.previewGif)).toBe(true);
    expect(readFileSync(join(out, "smooth-settle-report.md"), "utf8")).toContain("Replaced frame `01` with frame `02`");
  });

  test("compare dicut modes helper writes a winner report", () => {
    const magick = spawnSync("magick", ["-version"], { encoding: "utf8" });
    if (magick.status !== 0) return;

    const temp = mkdtempSync(join(tmpdir(), "sprite-dicut-compare-"));
    const raw = join(temp, "raw.png");
    const created = spawnSync("magick", [
      "-size", "96x32", "xc:#ee08df",
      "-fill", "#111111", "-draw", "rectangle 8,6 22,25",
      "-fill", "#ff55aa", "-draw", "rectangle 13,12 16,15",
      "-fill", "#111111", "-draw", "rectangle 62,5 78,25",
      "-fill", "#ff77aa", "-draw", "rectangle 70,10 74,14",
      raw,
    ], { encoding: "utf8" });
    expect(created.status).toBe(0);

    const out = join(temp, "compare");
    const compared = runScript("compare-dicut-modes.py", [
      "--input", raw,
      "--output-dir", out,
      "--frames", "2",
      "--frame-size", "32x32",
      "--chroma-key", "#ff00ff",
      "--key-tolerance", "0.22",
      "--resize-percent", "100",
      "--slice-mode", "component-x-runs",
      "--component-run-padding", "2",
      "--gravity", "center",
      "--state", "test",
      "--sheet-name", "sheet.png",
      "--preview-name", "preview.gif",
      "--json",
    ], temp);
    expect(compared.status).toBe(0);
    const payload = JSON.parse(compared.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.winner.mode).toBe("edge-connected");
    expect(payload.winnerReason).toContain("safer default");
    expect(existsSync(join(out, "compare-dicut-modes.json"))).toBe(true);
    const markdown = readFileSync(join(out, "compare-dicut-modes.md"), "utf8");
    expect(markdown).toContain("Visual honesty review is still required");
    expect(markdown).toContain("Do not choose by dark preview alone");
  });

  test("preview GIF script reports Pillow dependency clearly when unavailable", () => {
    const result = runScript("make-preview-gif.py", ["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Generate animated GIF preview");
  });
});
