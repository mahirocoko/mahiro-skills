import { describe, expect, test } from "bun:test";
import { createHash } from "crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";

const repoRoot = join(import.meta.dir, "..");
const scripts = join(repoRoot, "skills", "sprite-workflow", "scripts");
const imagePython = [process.env.SPRITE_WORKFLOW_PYTHON, "/usr/bin/python3", "python3"].find(
  candidate => candidate && spawnSync(candidate, ["-c", "import PIL"], { encoding: "utf8" }).status === 0,
) ?? "python3";
const run = (name: string, args: string[], cwd = repoRoot) => spawnSync(imagePython, [join(scripts, name), ...args], { cwd, encoding: "utf8" });

describe("sprite-workflow real pipeline rehearsal", () => {
  test("preserves action, review evidence, normalized frames, hashes, and approval through promotion", () => {
    if (spawnSync("magick", ["-version"]).status !== 0) return;
    const temp = mkdtempSync(join(tmpdir(), "sprite-rehearsal-"));
    const raw = join(temp, "raw.png");
    expect(spawnSync("magick", [
      "-size", "64x32", "xc:#ff00ff",
      "-fill", "#102030", "-draw", "rectangle 10,8 21,23",
      "-fill", "#204060", "-draw", "rectangle 42,10 53,27",
      raw,
    ]).status).toBe(0);

    const jobs = join(temp, "jobs");
    const created = run("new-job.py", [
      "--root", jobs,
      "--target-repo", temp,
      "--job-id", "idle-side",
      "--title", "Idle side rehearsal",
      "--states", "idle",
      "--frame-count", "2",
      "--action", "idle",
      "--direction", "side",
      "--content-policy", "character-only",
      "--anchor-policy", "feet",
      "--lineage-source-id", "master:rehearsal",
      "--source-lane", "imagegen",
      "--usage", "source-candidate",
    ], temp);
    expect(created.status).toBe(0);
    const job = JSON.parse(created.stdout);
    const receipt = join(temp, "provider-receipt.json");
    writeFileSync(receipt, JSON.stringify({
      poseAuthorship: "generated-poses",
      providerReceipt: {
        provider: "rehearsal-imagegen",
        model: "fixture-model",
        operation: "imagegen",
        sourceArtifacts: [{
          file: "raw.png",
          sha256: createHash("sha256").update(readFileSync(raw)).digest("hex"),
        }],
      },
    }, null, 2));

    const missingReceipt = run("extract-chroma-sheet.py", [
      "--input", raw,
      "--output-dir", join(temp, "missing-receipt"),
      "--frames", "2",
      "--frame-size", "32x32",
      "--source-layout", "horizontal",
      "--source-cell-width", "32",
      "--source-job", join(job.jobDir, "job.json"),
    ], temp);
    expect(missingReceipt.status).not.toBe(0);
    expect(missingReceipt.stderr).toContain("imagegen-required extraction requires --provider-receipt");

    const extractedDir = join(temp, "extracted");
    const extracted = run("extract-chroma-sheet.py", [
      "--input", raw,
      "--output-dir", extractedDir,
      "--frames", "2",
      "--frame-size", "32x32",
      "--source-layout", "horizontal",
      "--source-cell-width", "32",
      "--crop-width", "32",
      "--crop-height", "32",
      "--background-mode", "edge-connected",
      "--spill", "none",
      "--source-job", join(job.jobDir, "job.json"),
      "--provider-receipt", receipt,
      "--state", "idle",
      "--json",
    ], temp);
    expect(extracted.status).toBe(0);

    const reviewDir = join(temp, "native-review");
    const reviewed = run("make-native-review.py", [
      join(extractedDir, "manifest.json"),
      "--output-dir", reviewDir,
      "--approve",
      "--notes", "Reviewed native silhouette, appendages, and target-size readability.",
      "--json",
    ], temp);
    expect(reviewed.status).toBe(0);

    const alignedDir = join(temp, "aligned");
    const aligned = run("bottom-align-frames.py", [
      "--input", join(reviewDir, "native-pre-normalization.png"),
      "--output-dir", alignedDir,
      "--frames", "2",
      "--frame-size", "32x32",
      "--target-bottom-y", "28",
      "--source-manifest", join(reviewDir, "manifest.json"),
      "--json",
    ], temp);
    expect(aligned.status).toBe(0);
    expect(run("validate-manifest.py", [join(alignedDir, "manifest.json"), "--json"], temp).status).toBe(0);

    const promotedDir = join(temp, "runtime");
    const promoted = run("promote-named-artifact.py", [
      join(alignedDir, "manifest.json"),
      "--target-dir", promotedDir,
      "--asset-name", "idle-side",
      "--approve",
      "--allow-source-candidate",
    ], temp);
    expect(promoted.status).toBe(0);
    const promotedManifestPath = join(promotedDir, "idle-side-manifest.json");
    expect(run("validate-manifest.py", [promotedManifestPath, "--json"], temp).status).toBe(0);
    const manifest = JSON.parse(readFileSync(promotedManifestPath, "utf8"));
    expect(manifest.action).toBe("idle");
    expect(manifest.direction).toBe("side");
    expect(manifest.lineage.sourceIds).toEqual(["master:rehearsal", "idle-side"]);
    expect(manifest.lineage.normalization.translationOnly).toBe(true);
    expect(manifest.reviews.nativePreNormalization.approved).toBe(true);
    expect(manifest.frames).toHaveLength(2);
    expect(manifest.provenance.sourceRequirement).toBe("imagegen-required");
    expect(manifest.provenance.poseAuthorship).toBe("generated-poses");
    expect(manifest.provenance.providerReceipt.sourceArtifacts[0].file).toBe("raw-generated/source-0000.png");
    expect(existsSync(join(promotedDir, "raw-generated", "source-0000.png"))).toBe(true);
    expect(manifest.frames.every((frame: { file: string; sha256: string; dimensions: number[] }) =>
      existsSync(join(promotedDir, frame.file)) && frame.sha256.length === 64 && frame.dimensions.join("x") === "32x32",
    )).toBe(true);

    const rollup = run("rollup-sprite-batch.py", [promotedManifestPath, "--expected", "idle:side", "--json"], temp);
    expect(rollup.status).toBe(0);
    expect(JSON.parse(rollup.stdout).missingCoverage).toEqual([]);
  });
});
