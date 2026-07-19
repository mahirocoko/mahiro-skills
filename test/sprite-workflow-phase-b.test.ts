import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
const root = join(import.meta.dir, "..");
const scripts = join(root, "skills", "sprite-workflow", "scripts");
const run = (name: string, args: string[]) => spawnSync("python3", [join(scripts, name), ...args], { encoding: "utf8" });

describe("sprite workflow Phase B", () => {
  test("reports provider-neutral blockers and enforces explicit bounded selection", () => {
    const status = run("extract-motion-reference.py", ["--capability-status"]);
    const payload = JSON.parse(status.stdout); expect(payload.provider).toBeNull(); expect(payload.generation).toBe(false); expect(Array.isArray(payload.blockers)).toBe(true);
    if (payload.ok) { const rejected = run("extract-motion-reference.py", ["--input", __filename, "--output-dir", join(tmpdir(), "never")]); expect(rejected.status).not.toBe(0); expect(rejected.stderr).toContain("human-selected"); }
  });

  test("extracts exact synthetic ffmpeg frames with hashes when available", () => {
    if (spawnSync("ffmpeg", ["-version"]).status !== 0 || spawnSync("ffprobe", ["-version"]).status !== 0) return;
    const temp = mkdtempSync(join(tmpdir(), "motion-b-")), video = join(temp, "in.mp4"), out = join(temp, "out");
    expect(spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=red:size=32x24:rate=4:duration=1", "-pix_fmt", "yuv420p", video]).status).toBe(0);
    const result = run("extract-motion-reference.py", ["--input", video, "--output-dir", out, "--start", "0", "--duration", "0.5", "--fps", "4", "--json"]);
    expect(result.status).toBe(0); const manifest = JSON.parse(readFileSync(join(out, "motion-reference.json"), "utf8"));
    expect(manifest.frames.length).toBe(2); expect(manifest.frames.every((f: any) => f.sha256.length === 64 && f.createdAt && Number.isFinite(f.sourceTimeSeconds))).toBe(true);
    expect(existsSync(join(out, manifest.source.file))).toBe(true);
    expect(manifest.source.sha256).toHaveLength(64);
    expect(run("extract-motion-reference.py", ["--input", video, "--output-dir", join(temp, "too-long"), "--start", "0", "--duration", "11"]).status).not.toBe(0);
  });

  test("keeps legacy fixed horizontal and supports fixed row-major grids", () => {
    if (spawnSync("magick", ["-version"]).status !== 0) return;
    const temp = mkdtempSync(join(tmpdir(), "grid-b-")), input = join(temp, "grid.png");
    spawnSync("magick", ["-size", "16x16", "xc:#ff00ff", "-fill", "red", "-draw", "rectangle 1,1 6,6", "-fill", "green", "-draw", "rectangle 9,1 14,6", "-fill", "blue", "-draw", "rectangle 1,9 6,14", "-fill", "white", "-draw", "rectangle 9,9 14,14", input]);
    const out = join(temp, "out"); const result = run("extract-chroma-sheet.py", ["--input", input, "--output-dir", out, "--frames", "4", "--frame-size", "8x8", "--source-layout", "grid", "--source-columns", "2", "--source-rows", "2", "--spill", "none", "--json"]);
    expect(result.status).toBe(0); const manifest = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8")); expect(manifest.source.grid.order).toBe("row-major"); expect(manifest.frames.map((f: any) => f.index)).toEqual([0,1,2,3]); expect(manifest.provenance.sourceRequirement).toBe("diagnostic-only");
    const componentOut = join(temp, "components"); const component = run("extract-chroma-sheet.py", ["--input", input, "--output-dir", componentOut, "--frames", "4", "--frame-size", "8x8", "--source-layout", "grid", "--source-columns", "2", "--source-rows", "2", "--slice-mode", "component-grid", "--background-mode", "edge-connected", "--component-run-padding", "0", "--spill", "none", "--json"]); expect(component.status).toBe(0); const recovered = JSON.parse(readFileSync(join(componentOut, "manifest.json"), "utf8")); expect(recovered.source.componentAssignments.length).toBe(4); expect(recovered.source.grid.order).toBe("row-major");
    const fail = run("extract-chroma-sheet.py", ["--input", input, "--output-dir", join(temp, "bad"), "--frames", "5", "--frame-size", "8x8", "--slice-mode", "component-grid", "--source-layout", "grid", "--source-columns", "5", "--source-rows", "1"]); expect(fail.status).not.toBe(0); expect(fail.stderr).toContain("no fixed-grid fallback");
    const badTolerance = run("extract-chroma-sheet.py", ["--input", input, "--output-dir", join(temp, "bad-tolerance"), "--frames", "4", "--frame-size", "8x8", "--source-layout", "grid", "--source-columns", "2", "--source-rows", "2", "--key-tolerance", "18"]); expect(badTolerance.status).not.toBe(0); expect(badTolerance.stderr).toContain("normalized value");
  });

  test("reports body/FX and normalized warning-first alpha holes", () => {
    if (spawnSync("magick", ["-version"]).status !== 0) return;
    const temp = mkdtempSync(join(tmpdir(), "holes-b-")), sheet = join(temp, "sheet.png");
    spawnSync("magick", ["-size", "32x32", "xc:white", "(", "-size", "32x32", "xc:black", "-fill", "white", "-draw", "rectangle 5,5 26,26", "-fill", "black", "-draw", "rectangle 10,10 20,20", "-fill", "white", "-draw", "rectangle 29,10 30,11", ")", "-alpha", "off", "-compose", "CopyOpacity", "-composite", sheet]);
    const warning = run("qa-sprite-sheet.py", [sheet, "--frames", "1", "--frame-size", "32x32", "--edge-margin", "-1", "--warn-edge-margin", "-1", "--max-enclosed-alpha-hole-ratio", "0.01", "--json"]); const report = JSON.parse(warning.stdout);
    expect(warning.status).toBe(0); expect(report.warnings.some((x: string) => x.includes("alpha-hole ratio"))).toBe(true); expect(report.frames[0].components.body).toBeTruthy(); expect(report.frames[0].components.nearbyFx.length).toBeGreaterThan(0);
    const strict = run("qa-sprite-sheet.py", [sheet, "--frames", "1", "--frame-size", "32x32", "--edge-margin", "-1", "--warn-edge-margin", "-1", "--max-enclosed-alpha-hole-ratio", "0.01", "--alpha-warnings-as-error", "--json"]); expect(strict.status).toBe(1);
    const intentional = run("qa-sprite-sheet.py", [sheet, "--frames", "1", "--frame-size", "32x32", "--edge-margin", "-1", "--warn-edge-margin", "-1", "--max-enclosed-alpha-hole-ratio", "0.01", "--alpha-warnings-as-error", "--intentional-alpha-holes", "--json"]); expect(intentional.status).toBe(0);
  });

  test("validates optional motion/grid metadata while retaining legacy compatibility", () => {
    const temp = mkdtempSync(join(tmpdir(), "manifest-b-")); mkdirSync(join(temp, "frames")); writeFileSync(join(temp, "frames", "a.png"), "x");
    const path = join(temp, "manifest.json"), base: any = { frameSize:[8,8], states:["idle"], frames:[{file:"frames/a.png",state:"idle",index:0}], provenance:{sourceLane:"manual",usage:"reference-only"} };
    writeFileSync(path, JSON.stringify(base)); expect(run("validate-manifest.py", [path]).status).toBe(0);
    base.motionReference={startSeconds:0,durationSeconds:1,endSeconds:1,humanSelected:true}; base.gridExtraction={mode:"fixed",columns:1,rows:1,order:"row-major"}; writeFileSync(path, JSON.stringify(base)); expect(run("validate-manifest.py", [path]).status).toBe(0);
    base.gridExtraction.order="column-major"; writeFileSync(path, JSON.stringify(base)); expect(run("validate-manifest.py", [path]).status).toBe(1);
  });
});
