import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import { createHash } from "crypto";

const root = join(import.meta.dir, "..", "skills", "sprite-workflow");
const scripts = join(root, "scripts");
const imagePython = [process.env.SPRITE_WORKFLOW_PYTHON, "/usr/bin/python3", "python3"].find(
  candidate => candidate && spawnSync(candidate, ["-c", "import PIL"], { encoding: "utf8" }).status === 0,
) ?? "python3";
const run = (name: string, args: string[]) => spawnSync(imagePython, [join(scripts, name), ...args], { encoding: "utf8" });
const hasPillow = spawnSync(imagePython, ["-c", "import PIL"], { encoding: "utf8" }).status === 0;
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
function legacyReview(manifest: string, path: string) {
  writeFileSync(path, JSON.stringify({
    schemaVersion: 1,
    decision: "approved-legacy-provenance",
    reviewer: "phase-c fixture",
    reviewedAt: "2026-07-19T00:00:00Z",
    reason: "Explicit legacy atlas compatibility fixture.",
    sourceManifestSha256: hash(manifest),
  }, null, 2));
  return path;
}
function png(path: string, code: string) {
  const result = spawnSync(imagePython, ["-c", `from PIL import Image\n${code}\nim.save(${JSON.stringify(path)}, format='PNG', optimize=False, compress_level=9)`], { encoding: "utf8" });
  expect(result.status).toBe(0);
}

describe("sprite workflow Phase C", () => {
  test("ships bounded contracts and upstream MIT notices", () => {
    expect(readFileSync(join(root, "references", "native-grid-snap-contract.md"), "utf8")).toContain("not");
    expect(readFileSync(join(root, "references", "pixel-snap-provenance.md"), "utf8")).toContain("92173f04a14dfb58081694d8c0351cd1a51ee1a0");
    expect(readFileSync(join(root, "references", "NOTICE-Sprite-Fusion-Pixel-Snapper-MIT.txt"), "utf8")).toContain("Copyright 2025 Hugo Duprez");
    expect(readFileSync(join(root, "references", "NOTICE-chongdashu-sprite-pipeline-MIT.txt"), "utf8")).toContain("Copyright 2026 Chong-U Lim");
  });

  test("recovers deterministic native pixels and validates hashes", () => {
    if (!hasPillow) return;
    const dir = mkdtempSync(join(tmpdir(), "phase-c-snap-")); const source = join(dir, "source.png");
    png(source, "im=Image.new('RGBA',(4,4)); im.putdata([(255,0,0,255),(0,255,0,255),(0,0,255,255),(0,0,0,0)]); im=im.resize((16,16), Image.Resampling.NEAREST)");
    const a = join(dir, "a.png"), b = join(dir, "b.png"), ar = join(dir, "a.json"), br = join(dir, "b.json");
    expect(run("snap-native-grid.py", [source, "--mode", "explicit", "--grid-size", "4", "--output", a, "--report", ar]).status).toBe(0);
    expect(run("snap-native-grid.py", [source, "--mode", "explicit", "--grid-size", "4", "--output", b, "--report", br]).status).toBe(0);
    expect(hash(a)).toBe(hash(b)); const report = JSON.parse(readFileSync(ar, "utf8"));
    expect(report.status).toBe("recovered"); expect(report.confidence).toBe("high"); expect(report.cuts.nativeDimensions).toEqual([4, 4]);
    expect(run("validate-snap-report.py", [ar, "--json"]).status).toBe(0);
  });

  test("refuses non-square and low-confidence snap inputs", () => {
    if (!hasPillow) return;
    const dir = mkdtempSync(join(tmpdir(), "phase-c-refuse-")); const nonSquare = join(dir, "wide.png"), noisy = join(dir, "noisy.png");
    png(nonSquare, "im=Image.new('RGBA',(8,4),(1,2,3,255))");
    png(noisy, "im=Image.new('RGBA',(8,8)); im.putdata([((x*31+y*17)%256,(x*13+y*29)%256,(x*7+y*19)%256,255) for y in range(8) for x in range(8)])");
    expect(run("snap-native-grid.py", [nonSquare, "--mode", "auto", "--output", join(dir, "x.png"), "--report", join(dir, "x.json")]).status).toBe(2);
    const refused = run("snap-native-grid.py", [noisy, "--mode", "auto", "--output", join(dir, "y.png"), "--report", join(dir, "y.json")]);
    expect(refused.status).toBe(2); expect(refused.stderr).toContain("outside stable scope");
  });

  test("assembles deterministic approved atlases and validates them", () => {
    if (!hasPillow) return;
    const dir = mkdtempSync(join(tmpdir(), "phase-c-atlas-")); mkdirSync(join(dir, "frames"));
    const one = join(dir, "frames", "one.png"), two = join(dir, "frames", "two.png");
    png(one, "im=Image.new('RGBA',(3,4),(255,0,0,255))"); png(two, "im=Image.new('RGBA',(2,2),(0,255,0,255))");
    const manifest = join(dir, "manifest.json"); writeFileSync(manifest, JSON.stringify({ provenance: { usage: "production-approved" }, frames: [
      { id: "idle-0", state: "idle", index: 0, file: "frames/one.png", sha256: hash(one), dimensions: [3,4], anchor: [1,3] },
      { id: "idle-1", state: "idle", index: 1, file: "frames/two.png", sha256: hash(two), dimensions: [2,2], anchor: [1,1] },
    ] }));
    const a = join(dir, "a.png"), b = join(dir, "b.png"), am = join(dir, "a.json"), bm = join(dir, "b.json");
    const review = legacyReview(manifest, join(dir, "legacy-review.json"));
    const blockedLegacy = run("assemble-approved-atlas.py", [manifest, "--output", a, "--atlas-manifest", am, "--layout", "row"]);
    expect(blockedLegacy.status).toBe(2); expect(blockedLegacy.stderr).toContain("manifest lacks sourceRequirement");
    const missingReview = run("assemble-approved-atlas.py", [manifest, "--output", a, "--atlas-manifest", am, "--layout", "row", "--allow-legacy-provenance"]);
    expect(missingReview.status).toBe(2); expect(missingReview.stderr).toContain("--legacy-provenance-review is required");
    expect(run("assemble-approved-atlas.py", [manifest, "--output", a, "--atlas-manifest", am, "--layout", "row", "--allow-legacy-provenance", "--legacy-provenance-review", review]).status).toBe(0);
    expect(run("assemble-approved-atlas.py", [manifest, "--output", b, "--atlas-manifest", bm, "--layout", "row", "--allow-legacy-provenance", "--legacy-provenance-review", review]).status).toBe(0);
    expect(hash(a)).toBe(hash(b)); expect(JSON.parse(readFileSync(am, "utf8")).frames[1].anchor).toEqual([4,1]);
    expect(JSON.parse(readFileSync(am, "utf8")).legacyProvenanceReview.decision).toBe("approved-legacy-provenance");
    expect(run("validate-atlas-manifest.py", [am, "--json"]).status).toBe(0);
  });

  test("refuses unapproved, hash-mismatched, traversal, and symlink atlas inputs", () => {
    if (!hasPillow) return;
    const dir = mkdtempSync(join(tmpdir(), "phase-c-security-")); const outside = join(dir, "outside.png"); png(outside, "im=Image.new('RGBA',(2,2),(1,2,3,255))");
    const work = join(dir, "work"); mkdirSync(work); symlinkSync(outside, join(work, "link.png"));
    const base = { provenance: { usage: "production-approved" }, frames: [{ id: "x", state: "idle", index: 0, dimensions: [2,2], anchor: [0,0], sha256: hash(outside), file: "../outside.png" }] };
    const invoke = (value: object) => { const m = join(work, "m.json"); writeFileSync(m, JSON.stringify(value)); const review = legacyReview(m, join(work, "legacy-review.json")); return run("assemble-approved-atlas.py", [m, "--output", join(work,"a.png"), "--atlas-manifest", join(work,"a.json"), "--allow-legacy-provenance", "--legacy-provenance-review", review]); };
    expect(invoke(base).status).toBe(2);
    expect(invoke({ ...base, frames: [{ ...base.frames[0], file: "link.png" }] }).status).toBe(2);
    expect(invoke({ ...base, provenance: { usage: "source-candidate" } }).status).toBe(2);
    expect(invoke({ ...base, frames: [{ ...base.frames[0], file: "../outside.png", sha256: "0".repeat(64) }] }).status).toBe(2);
  });
});
