import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";

const root = join(import.meta.dir, "..");
const script = join(root, "skills", "sprite-workflow", "scripts", "extract-chroma-sheet.py");
const hasMagick = spawnSync("magick", ["-version"]).status === 0;
const run = (input: string, output: string, extra: string[] = []) => spawnSync("python3", [script, "--input", input, "--output-dir", output, "--frames", "3", "--frame-size", "12x12", "--source-layout", "grid", "--source-columns", "3", "--source-rows", "1", "--slice-mode", "component-grid", "--background-mode", "edge-connected", "--spill", "none", "--component-run-padding", "0", ...extra, "--json"], { encoding: "utf8" });
const image = (path: string, draws: string[]) => spawnSync("magick", ["-size", "36x12", "xc:#ff00ff", ...draws, path]);
const rect = (color: string, bounds: string) => ["-fill", color, "-draw", `rectangle ${bounds}`];

describe("sprite workflow component-grid fail-closed recovery", () => {
  test("recovers uneven valid bodies in nominal row-major cells and preserves source metadata", () => {
    if (!hasMagick) return;
    const temp = mkdtempSync(join(tmpdir(), "component-grid-valid-")), input = join(temp, "in.png"), output = join(temp, "out");
    image(input, [...rect("red", "3,3 8,8"), ...rect("green", "14,2 21,9"), ...rect("blue", "27,4 32,7")]);
    const result = run(input, output, ["--source-note", "uneven-valid", "--source-id", "source-a"]);
    expect(result.status).toBe(0);
    const manifest = JSON.parse(readFileSync(join(output, "manifest.json"), "utf8"));
    expect(manifest.source.grid.order).toBe("row-major");
    expect(manifest.source.componentAssignments.map((item: any) => item.cell.index)).toEqual([0, 1, 2]);
    expect(manifest.source.note).toBe("uneven-valid");
    expect(manifest.lineage.sourceIds).toEqual(["source-a"]);
  });

  test("accepts bounded boundary FX but rejects distant cross-cell residue", () => {
    if (!hasMagick) return;
    const temp = mkdtempSync(join(tmpdir(), "component-grid-fx-")), input = join(temp, "near.png");
    image(input, [...rect("red", "3,3 8,8"), ...rect("green", "15,3 20,8"), ...rect("blue", "27,3 32,8"), ...rect("white", "11,1 12,2")]);
    const accepted = run(input, join(temp, "accepted"), ["--component-overflow-distance", "1"]);
    expect(accepted.status).toBe(0);
    const manifest = JSON.parse(readFileSync(join(temp, "accepted", "manifest.json"), "utf8"));
    expect(manifest.source.componentAssignments[1].nearbyFx.length).toBe(1);

    const distant = join(temp, "distant.png");
    image(distant, [...rect("red", "3,3 8,8"), ...rect("green", "15,3 20,8"), ...rect("blue", "27,3 32,8"), ...rect("white", "9,0 13,1")]);
    const rejected = run(distant, join(temp, "rejected"), ["--component-overflow-distance", "1"]);
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("no fixed-grid fallback");
  });

  test("rejects a missing cell and a cell with two large competing components", () => {
    if (!hasMagick) return;
    const temp = mkdtempSync(join(tmpdir(), "component-grid-adversarial-"));
    const missing = join(temp, "missing.png");
    image(missing, [...rect("red", "3,3 8,8"), ...rect("blue", "27,3 32,8")]);
    expect(run(missing, join(temp, "missing-out")).status).not.toBe(0);

    const ambiguous = join(temp, "ambiguous.png");
    image(ambiguous, [...rect("red", "1,2 4,9"), ...rect("white", "7,2 10,9"), ...rect("green", "16,4 19,7"), ...rect("blue", "27,3 32,8")]);
    expect(run(ambiguous, join(temp, "ambiguous-out"), ["--component-min-body-area", "8"]).status).not.toBe(0);
  });

  test("refuses stale output roots and non-basename artifact names", () => {
    if (!hasMagick) return;
    const temp = mkdtempSync(join(tmpdir(), "component-grid-output-")), input = join(temp, "in.png"), stale = join(temp, "stale");
    image(input, [...rect("red", "3,3 8,8"), ...rect("green", "15,3 20,8"), ...rect("blue", "27,3 32,8")]);
    mkdirSync(stale); writeFileSync(join(stale, "keep.txt"), "keep");
    expect(run(input, stale).stderr).toContain("absent or empty");
    expect(existsSync(join(stale, "keep.txt"))).toBe(true);
    const bad = run(input, join(temp, "bad-name"), ["--sheet-name", "../escaped.png"]);
    expect(bad.status).not.toBe(0); expect(bad.stderr).toContain("plain output basename");
  });
});
