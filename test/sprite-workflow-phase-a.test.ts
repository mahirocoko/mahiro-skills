import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import { createHash } from "crypto";

const repoRoot = join(import.meta.dir, "..");
const scripts = join(repoRoot, "skills", "sprite-workflow", "scripts");
const imagePython = [process.env.SPRITE_WORKFLOW_PYTHON, "/usr/bin/python3", "python3"].find(
  candidate => candidate && spawnSync(candidate, ["-c", "import PIL"], { encoding: "utf8" }).status === 0,
) ?? "python3";
const run = (name: string, args: string[], cwd = repoRoot) => spawnSync(imagePython, [join(scripts, name), ...args], { cwd, encoding: "utf8" });
const writeJson = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2));
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const png = (path: string, width = 16, height = 16) => spawnSync(imagePython, ["-c", `from PIL import Image\nImage.new('RGBA',(${width},${height}),(255,0,0,255)).save(${JSON.stringify(path)},'PNG')`]);

describe("sprite workflow Phase A", () => {
  test("keeps frame count independent and carries optional schema-v2 metadata", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-v2-"));
    const result = run("new-job.py", ["--root", join(temp, "state"), "--target-repo", temp, "--job-id", "v2", "--title", "Walk side", "--states", "walk", "--frame-count", "6", "--action", "walk", "--direction", "side", "--content-policy", "character-only", "--anchor-policy", "feet", "--lineage-source-id", "master-1", "--grid-columns", "3", "--grid-rows", "2", "--grid-mode", "fixed"], temp);
    expect(result.status).toBe(0);
    const job = JSON.parse(readFileSync(join(JSON.parse(result.stdout).jobDir, "job.json"), "utf8"));
    expect(job.frameCount).toBe(6); expect(job.states).toEqual(["walk"]); expect(job.spriteContext.frameCount).toBe(6);
    expect(job.spriteContext.grid).toEqual({ columns: 3, rows: 2, gutter: 0 }); expect(job.gridExtraction).toEqual({ mode: "fixed", columns: 3, rows: 2, order: "row-major" });
    expect([job.action, job.direction, job.contentPolicy, job.anchorPolicy]).toEqual(["walk", "side", "character-only", "feet"]);
    expect(job.lineage.sourceIds).toEqual(["master-1"]);
    const undersized = run("new-job.py", ["--root", join(temp, "state"), "--target-repo", temp, "--job-id", "too-small", "--title", "Too small", "--states", "walk", "--frame-count", "5", "--grid-columns", "2", "--grid-rows", "2"], temp);
    expect(undersized.status).toBe(1); expect(undersized.stderr + undersized.stdout).toContain("enough cells");
  });

  test("validates legacy manifests and rejects inconsistent explicit frameCount", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-validate-")); mkdirSync(join(temp, "frames")); writeFileSync(join(temp, "frames", "a.png"), "x");
    const manifest = join(temp, "manifest.json");
    writeJson(manifest, { frameSize: [16, 16], states: ["idle"], frames: [{ file: "frames/a.png", state: "idle", index: 0 }], provenance: { sourceLane: "codex", usage: "source-candidate" } });
    expect(run("validate-manifest.py", [manifest]).status).toBe(0);
    const bad = JSON.parse(readFileSync(manifest, "utf8")); bad.frameCount = 2; writeJson(manifest, bad);
    expect(run("validate-manifest.py", [manifest, "--json"]).status).toBe(1);
  });

  test("reports cross-action scale warning with explicit exclusions", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-scale-"));
    const reports = [["idle", 10], ["walk", 20], ["fx", 50]].map(([action, height]) => { const path = join(temp, `${action}.json`); writeJson(path, { action, frames: [{ bounds: { height } }, { bounds: { height } }] }); return path; });
    const result = run("compare-action-scale.py", [...reports, "--exclude", "fx", "--max-ratio-delta", "0.1", "--json"]);
    expect(result.status).toBe(0); const payload = JSON.parse(result.stdout);
    expect(payload.warningFirst).toBe(true); expect(payload.warnings.length).toBe(2); expect(payload.exclusions[0].action).toBe("fx");
  });

  test("rolls up missing slots and unique source reuse", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-rollup-"));
    const a = join(temp, "a.json"), b = join(temp, "b.json");
    writeJson(a, { action: "idle", direction: "front", lineage: { sourceIds: ["master"] } });
    writeJson(b, { action: "walk", direction: "front", lineage: { sourceIds: ["master"] } });
    const result = run("rollup-sprite-batch.py", [a, b, "--expected", "idle:front", "--expected", "walk:front", "--expected", "idle:side", "--json"]);
    expect(result.status).toBe(0); const payload = JSON.parse(result.stdout);
    expect(payload.missingCoverage).toEqual(["idle:side"]); expect(payload.sourceReuse.master).toEqual(["idle:front", "walk:front"]); expect(payload.uniqueSourceCount).toBe(1);
  });

  test("requires native review evidence before promoting normalized assets", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-native-")); mkdirSync(join(temp, "frames"));
    png(join(temp, "sheet.png")); png(join(temp, "frames", "a.png"));
    const manifest = join(temp, "manifest.json");
    writeJson(manifest, { frameSize: [16, 16], frameCount: 1, states: ["idle"], frames: [{ file: "frames/a.png", state: "idle", index: 0, sha256: hash(join(temp, "frames", "a.png")), dimensions: [16, 16] }], provenance: { sourceLane: "codex", usage: "production-approved" }, artifacts: { sheet: { file: "sheet.png", sha256: hash(join(temp, "sheet.png")), dimensions: [16, 16] } }, lineage: { normalization: { kind: "bottom-align" } } });
    const blocked = run("promote-named-artifact.py", [manifest, "--target-dir", join(temp, "prod"), "--asset-name", "hero", "--approve"]);
    expect(blocked.status).toBe(1); expect(blocked.stderr + blocked.stdout).toContain("native pre-normalization review");
    const review = run("make-native-review.py", [manifest, "--output-dir", join(temp, "review"), "--approve", "--json"]);
    expect(review.status).toBe(0); const reviewed = JSON.parse(review.stdout); expect(existsSync(reviewed.artifact)).toBe(true);
    const promoted = run("promote-named-artifact.py", [reviewed.manifest, "--target-dir", join(temp, "prod"), "--asset-name", "hero", "--approve"]);
    expect(promoted.status).toBe(0);
  });

  test("bottom alignment is integer translation, exposes bottom QA, and refuses clipping", () => {
    if (spawnSync("magick", ["-version"]).status !== 0) return;
    const temp = mkdtempSync(join(tmpdir(), "sprite-bottom-")); const a = join(temp, "a.png"), b = join(temp, "b.png"), sheet = join(temp, "sheet.png");
    spawnSync("magick", ["-size", "16x16", "xc:none", "-fill", "white", "-draw", "rectangle 5,4 10,11", a]);
    spawnSync("magick", ["-size", "16x16", "xc:none", "-fill", "white", "-draw", "rectangle 5,6 10,14", b]);
    spawnSync("magick", [a, b, "+append", sheet]);
    const qa = run("qa-sprite-sheet.py", [sheet, "--frames", "2", "--frame-size", "16x16", "--edge-margin", "-1", "--warn-edge-margin", "-1", "--max-bottom-range", "1", "--max-bottom-neighbor-delta", "1", "--json"]);
    expect(JSON.parse(qa.stdout).warnings.some((value: string) => value.includes("bottomY"))).toBe(true);
    const aligned = run("bottom-align-frames.py", ["--input", sheet, "--output-dir", join(temp, "aligned"), "--frames", "2", "--frame-size", "16x16", "--target-bottom-y", "14", "--json"]);
    expect(aligned.status).toBe(0); expect(JSON.parse(aligned.stdout).shifts.every((shift: { dx: number; dy: number }) => shift.dx === 0 && Number.isInteger(shift.dy))).toBe(true);
    const clipped = run("bottom-align-frames.py", ["--input", sheet, "--output-dir", join(temp, "clipped"), "--frames", "2", "--frame-size", "16x16", "--target-bottom-y", "18"]);
    expect(clipped.status).toBe(1); expect(clipped.stderr + clipped.stdout).toContain("clip");
  });

  test("body-mask-required QA fails closed", () => {
    if (spawnSync("magick", ["-version"]).status !== 0) return;
    const temp = mkdtempSync(join(tmpdir(), "sprite-mask-")); const sheet = join(temp, "sheet.png");
    spawnSync("magick", ["-size", "16x16", "xc:none", "-fill", "white", "-draw", "rectangle 4,4 11,13", sheet]);
    const result = run("qa-sprite-sheet.py", [sheet, "--frames", "1", "--frame-size", "16x16", "--require-body-mask", "--edge-margin", "-1", "--warn-edge-margin", "-1", "--json"]);
    expect(result.status).toBe(1); expect(JSON.parse(result.stdout).failures).toContain("body mask required but --body-mask-sheet was not supplied");
  });
});
