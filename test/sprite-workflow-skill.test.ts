import { describe, expect, test } from "bun:test";
import { createHash } from "crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "fs";
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
    expect(readFileSync(join(skillRoot, "references", "runner-contracts.md"), "utf8")).toContain("source-ready-normalization-required");
    expect(readFileSync(join(skillRoot, "references", "subagent-prompts.md"), "utf8")).toContain("main orchestrator owns canonical extraction");
    expect(readFileSync(join(skillRoot, "references", "tournament-scoring.md"), "utf8")).toContain("Mechanical score is advisory only");
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
    expect(job.provenance.sourceRequirement).toBe("imagegen-required");
    expect(readFileSync(join(payload.jobDir, "prompt.md"), "utf8")).toContain("Do not substitute Pillow/manual transforms");
    expect(readFileSync(join(payload.jobDir, "prompt.md"), "utf8")).toContain("<!-- sprite-workflow:sourceRequirement=imagegen-required -->");

    const framesDir = join(payload.jobDir, "outbox", "frames");
    const rawDir = join(payload.jobDir, "outbox", "raw-generated");
    mkdirSync(framesDir, { recursive: true });
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(join(framesDir, "idle-00.png"), "not-a-real-png-but-a-frame-file");
    writeFileSync(join(rawDir, "provider-source.png"), "provider-source-fixture");
    const sourceHash = createHash("sha256").update(readFileSync(join(rawDir, "provider-source.png"))).digest("hex");
    writeFileSync(payload.manifest, JSON.stringify({
      frameSize: [16, 16],
      states: ["idle", "work"],
      frames: [{ file: "frames/idle-00.png", state: "idle", index: 0, durationMs: 120 }],
      anchors: { default: [8, 15] },
      provenance: {
        sourceLane: "codex",
        sourceRequirement: "imagegen-required",
        poseAuthorship: "generated-poses",
        providerReceipt: {
          provider: "codex-imagegen",
          model: "gpt-image",
          operation: "imagegen",
          sourceArtifacts: [{ file: "raw-generated/provider-source.png", sha256: sourceHash }],
        },
        usage: "source-candidate",
      },
    }, null, 2));

    const validated = runScript("validate-manifest.py", [payload.manifest, "--json"], temp);
    expect(validated.status).toBe(0);
    expect(JSON.parse(validated.stdout).ok).toBe(true);

    const stripped = JSON.parse(readFileSync(payload.manifest, "utf8"));
    delete stripped.provenance.sourceRequirement;
    writeFileSync(payload.manifest, JSON.stringify(stripped, null, 2));
    const downgraded = runScript("validate-manifest.py", [payload.manifest, "--json"], temp);
    expect(downgraded.status).toBe(1);
    expect(downgraded.stdout).toContain("must match bound job.json value 'imagegen-required'");
    stripped.provenance.sourceRequirement = "imagegen-required";
    writeFileSync(payload.manifest, JSON.stringify(stripped, null, 2));

    const sheet = runScript("make-contact-sheet.py", [payload.manifest], temp);
    expect(sheet.status).toBe(0);
    const sheetPath = join(payload.jobDir, "outbox", "contact-sheet.html");
    expect(existsSync(sheetPath)).toBe(true);
    expect(readFileSync(sheetPath, "utf8")).toContain("Sprite contact sheet");
  });

  test("defaults Gemini generation to imagegen-required and rejects conflicting structured prompt markers", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-source-requirement-"));
    const root = join(temp, ".agent-state", "sprite-workflow");
    const gemini = runScript("new-job.py", [
      "--root", root,
      "--target-repo", temp,
      "--job-id", "gemini-source",
      "--title", "Gemini move",
      "--workflow-mode", "sprite-generate",
      "--source-lane", "gemini",
    ], temp);
    expect(gemini.status).toBe(0);
    const payload = JSON.parse(gemini.stdout) as { jobDir: string };
    const job = JSON.parse(readFileSync(join(payload.jobDir, "job.json"), "utf8"));
    expect(job.provenance.sourceRequirement).toBe("imagegen-required");

    const conflict = runScript("new-job.py", [
      "--root", root,
      "--target-repo", temp,
      "--job-id", "conflicting-source",
      "--title", "Conflicting source",
      "--workflow-mode", "sprite-generate",
      "--source-requirement", "diagnostic-only",
      "--prompt", "<!-- sprite-workflow:sourceRequirement=manual-rig-allowed -->",
    ], temp);
    expect(conflict.status).toBe(1);
    expect(conflict.stderr + conflict.stdout).toContain("sourceRequirement marker conflicts with structured provenance.sourceRequirement");
  });

  test("fails closed when imagegen-required provenance lacks provider artifacts", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-imagegen-gate-"));
    const framesDir = join(temp, "frames");
    const rawDir = join(temp, "raw-generated");
    mkdirSync(framesDir, { recursive: true });
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(join(framesDir, "move-00.png"), "candidate-frame");
    writeFileSync(join(rawDir, "provider-source.png"), "real-provider-source-receipt-fixture");
    const hash = createHash("sha256").update(readFileSync(join(rawDir, "provider-source.png"))).digest("hex");
    const manifest = join(temp, "manifest.json");
    const base = {
      frameSize: [16, 16],
      states: ["move"],
      frames: [{ file: "frames/move-00.png", state: "move", index: 0 }],
      provenance: {
        sourceLane: "codex",
        sourceRequirement: "imagegen-required",
        usage: "source-candidate",
      },
    };
    writeFileSync(manifest, JSON.stringify(base, null, 2));
    const blocked = runScript("validate-manifest.py", [manifest, "--json"], temp);
    expect(blocked.status).toBe(1);
    expect(blocked.stdout).toContain("providerReceipt");
    expect(blocked.stdout).toContain("generated-poses");

    writeFileSync(manifest, JSON.stringify({
      ...base,
      provenance: {
        ...base.provenance,
        poseAuthorship: "generated-poses",
        providerReceipt: {
          provider: "codex-imagegen",
          model: "gpt-image",
          operation: "imagegen",
          sourceArtifacts: [{ file: "raw-generated/provider-source.png", sha256: hash }],
        },
      },
    }, null, 2));
    expect(runScript("validate-manifest.py", [manifest, "--json"], temp).status).toBe(0);

    writeFileSync(manifest, JSON.stringify({
      ...base,
      provenance: { sourceLane: "manual", sourceRequirement: "diagnostic-only", usage: "production-approved" },
    }, null, 2));
    const diagnostic = runScript("validate-manifest.py", [manifest, "--json"], temp);
    expect(diagnostic.status).toBe(1);
    expect(diagnostic.stdout).toContain("diagnostic-only provenance cannot be production-approved");
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
    mkdirSync(join(outbox, "raw-generated"), { recursive: true });
    expect(spawnSync(imagePython, ["-c", `from PIL import Image\nim=Image.new('RGBA',(16,16),(255,0,0,255)); im.save(${JSON.stringify(join(outbox, "sheet.png"))},'PNG'); im.save(${JSON.stringify(join(outbox, "preview.gif"))},'GIF'); im.save(${JSON.stringify(join(outbox, "idle-frame.png"))},'PNG'); im.save(${JSON.stringify(join(outbox, "raw-generated", "provider-source.png"))},'PNG')`]).status).toBe(0);
    const providerHash = createHash("sha256").update(readFileSync(join(outbox, "raw-generated", "provider-source.png"))).digest("hex");
    const manifest = join(outbox, "manifest.json");
    writeFileSync(manifest, JSON.stringify({
      frameSize: [16, 16],
      states: ["idle"],
      frames: [{ file: "idle-frame.png", state: "idle", index: 0 }],
      anchors: { default: [8, 15] },
      provenance: {
        sourceLane: "codex",
        sourceRequirement: "imagegen-required",
        poseAuthorship: "generated-poses",
        providerReceipt: {
          provider: "codex-imagegen",
          model: "gpt-image",
          operation: "imagegen",
          sourceArtifacts: [{ file: "raw-generated/provider-source.png", sha256: providerHash }],
        },
        usage: "source-candidate",
      },
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
    expect(outputManifest.provenance.providerReceipt.sourceArtifacts[0].file).toBe("raw-generated/source-0000.png");
    expect(existsSync(join(temp, "public-assets", "raw-generated", "source-0000.png"))).toBe(true);
  });

  test("preserves imagegen receipt artifacts through plain promotion and blocks atlas bypass", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-receipt-promote-"));
    const jobDir = join(temp, "job");
    const outbox = join(jobDir, "outbox");
    mkdirSync(join(outbox, "frames"), { recursive: true });
    mkdirSync(join(outbox, "raw-generated"), { recursive: true });
    writeFileSync(join(jobDir, "job.json"), JSON.stringify({
      provenance: { sourceLane: "codex", sourceRequirement: "imagegen-required", usage: "source-candidate" },
    }, null, 2));
    expect(spawnSync(imagePython, ["-c", `from PIL import Image\nim=Image.new('RGBA',(8,8),(20,40,60,255)); im.save(${JSON.stringify(join(outbox, "frames", "move-00.png"))},'PNG'); im.save(${JSON.stringify(join(outbox, "raw-generated", "provider-source.png"))},'PNG')`]).status).toBe(0);
    const frameHash = createHash("sha256").update(readFileSync(join(outbox, "frames", "move-00.png"))).digest("hex");
    const sourceHash = createHash("sha256").update(readFileSync(join(outbox, "raw-generated", "provider-source.png"))).digest("hex");
    const manifest = join(outbox, "manifest.json");
    const provenance = {
      sourceLane: "codex",
      sourceRequirement: "imagegen-required",
      poseAuthorship: "generated-poses",
      providerReceipt: {
        provider: "codex-imagegen",
        model: "gpt-image",
        operation: "imagegen",
        sourceArtifacts: [{ file: "raw-generated/provider-source.png", sha256: sourceHash }],
      },
      usage: "production-approved",
    };
    writeFileSync(manifest, JSON.stringify({
      frameSize: [8, 8],
      frameCount: 1,
      states: ["move"],
      frames: [{ id: "move-0", file: "frames/move-00.png", state: "move", index: 0, anchor: [4, 7], sha256: frameHash, dimensions: [8, 8] }],
      provenance,
    }, null, 2));
    const promoted = runScript("promote-artifact.py", [manifest, "--target-dir", join(temp, "plain-promoted"), "--approve"], temp);
    expect(promoted.status).toBe(0);
    expect(existsSync(join(temp, "plain-promoted", "raw-generated", "provider-source.png"))).toBe(true);
    const promotedManifest = join(temp, "plain-promoted", "manifest.json");
    expect(runScript("validate-manifest.py", [promotedManifest], temp).status).toBe(0);
    const promotedData = JSON.parse(readFileSync(promotedManifest, "utf8"));
    expect(promotedData.provenance.sourceWorkflow.endsWith("/job/outbox")).toBe(true);
    delete promotedData.provenance.sourceRequirement;
    writeFileSync(promotedManifest, JSON.stringify(promotedData, null, 2));
    const promotedLegacyReview = join(temp, "promoted-legacy-review.json");
    writeFileSync(promotedLegacyReview, JSON.stringify({
      schemaVersion: 1,
      decision: "approved-legacy-provenance",
      reviewer: "sprite workflow fixture",
      reviewedAt: "2026-07-19T00:00:00Z",
      reason: "Attempted promoted downgrade regression fixture.",
      sourceManifestSha256: createHash("sha256").update(readFileSync(promotedManifest)).digest("hex"),
    }, null, 2));
    const promotedDowngrade = runScript("assemble-approved-atlas.py", [
      promotedManifest,
      "--output", join(temp, "promoted-downgrade-atlas.png"),
      "--atlas-manifest", join(temp, "promoted-downgrade-atlas.json"),
      "--allow-legacy-provenance",
      "--legacy-provenance-review", promotedLegacyReview,
    ], temp);
    expect(promotedDowngrade.status).toBe(2);
    expect(promotedDowngrade.stderr).toContain("legacy provenance path is unavailable for a previously promoted manifest");

    writeFileSync(manifest, JSON.stringify({
      frameSize: [8, 8],
      frameCount: 1,
      states: ["move"],
      frames: [{ id: "move-0", file: "frames/move-00.png", state: "move", index: 0, anchor: [4, 7], sha256: frameHash, dimensions: [8, 8] }],
      provenance: { sourceLane: "codex", usage: "production-approved" },
    }, null, 2));
    const atlas = runScript("assemble-approved-atlas.py", [manifest, "--output", join(temp, "atlas.png"), "--atlas-manifest", join(temp, "atlas.json")], temp);
    expect(atlas.status).toBe(2);
    expect(atlas.stderr).toContain("manifest lacks sourceRequirement");
    const legacyReview = join(temp, "legacy-review.json");
    writeFileSync(legacyReview, JSON.stringify({
      schemaVersion: 1,
      decision: "approved-legacy-provenance",
      reviewer: "sprite workflow fixture",
      reviewedAt: "2026-07-19T00:00:00Z",
      reason: "Attempted downgrade regression fixture.",
      sourceManifestSha256: createHash("sha256").update(readFileSync(manifest)).digest("hex"),
    }, null, 2));
    const downgrade = runScript("assemble-approved-atlas.py", [
      manifest,
      "--output", join(temp, "downgrade-atlas.png"),
      "--atlas-manifest", join(temp, "downgrade-atlas.json"),
      "--allow-legacy-provenance",
      "--legacy-provenance-review", legacyReview,
    ], temp);
    expect(downgrade.status).toBe(2);
    expect(downgrade.stderr).toContain("legacy provenance path is unavailable for a job-bound manifest");
  });

  test("rejects a symlinked bound job provenance contract", () => {
    const temp = mkdtempSync(join(tmpdir(), "sprite-bound-job-symlink-"));
    const jobDir = join(temp, "job");
    const outbox = join(jobDir, "outbox");
    mkdirSync(join(outbox, "frames"), { recursive: true });
    writeFileSync(join(temp, "outside-job.json"), JSON.stringify({ provenance: { sourceRequirement: "diagnostic-only" } }));
    symlinkSync(join(temp, "outside-job.json"), join(jobDir, "job.json"));
    writeFileSync(join(outbox, "frames", "idle-00.png"), "frame-fixture");
    const manifest = join(outbox, "manifest.json");
    writeFileSync(manifest, JSON.stringify({
      frameSize: [8, 8],
      states: ["idle"],
      frames: [{ file: "frames/idle-00.png", state: "idle", index: 0 }],
      provenance: { sourceLane: "manual", sourceRequirement: "manual-rig-allowed", usage: "source-candidate" },
    }, null, 2));

    const result = runScript("validate-manifest.py", [manifest, "--json"], temp);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("bound job.json must be a regular non-symlink");
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
    const provenance = readFileSync(join(skillRoot, "references", "provenance-policy.md"), "utf8");
    const scoring = readFileSync(join(skillRoot, "references", "tournament-scoring.md"), "utf8");
    expect(presets).toContain("walk-cycle");
    expect(presets).toContain("Shared negative prompt");
    expect(presets).toContain("Standard direction-split animation");
    expect(runner).toContain("blocker JSON sidecar");
    expect(runner).toContain("sprite-generate");
    expect(provenance).toContain("Never infer imagegen authorship from `sourceLane: codex` alone");
    expect(provenance).toContain("not a signed provider attestation");
    expect(scoring).toContain("Quality classifications");
    expect(scoring).toContain("visual honesty");
    const master = readFileSync(join(skillRoot, "references", "master-sprite-first.md"), "utf8");
    expect(master).toContain("clean master sprite");
    expect(master).toContain("Stop and regenerate");
  });

  test("documents the v0.1.6 workflow follow-up without repinning the prompt catalog", () => {
    const followUp = readFileSync(join(skillRoot, "references", "image-cockpit-v0.1.6-follow-up.md"), "utf8");
    const geometry = readFileSync(join(skillRoot, "references", "generation-geometry-contracts.md"), "utf8");
    const receipt = JSON.parse(readFileSync(join(skillRoot, "data", "prompt-catalog-upstream-receipt.json"), "utf8"));

    expect(followUp).toContain("79a219c99a8923e9b341c6f9ffcfe5dfd844063e");
    expect(followUp).toContain("v0.1.5 revision");
    expect(followUp).toContain("Raw versus normalized QA");
    expect(followUp).toContain("Separate body and raster FX");
    expect(followUp).toContain("Effect-sheet QA");
    expect(geometry).toContain("Accepted-master shared scale profile");
    expect(geometry).toContain("Elongated creatures");
    expect(geometry).toContain("Rooted bosses");
    expect(geometry).toContain("Ground-contact FX");
    expect(receipt.upstreamRevision).toBe("b997e78609773975a98617568818ac32f40cf1a7");
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
    const runner = readFileSync(join(skillRoot, "references", "runner-contracts.md"), "utf8");
    expect(skill).toContain("Passing scripts/QA does not mean an asset is production-ready");
    expect(skill).toContain("visual honesty gate");
    expect(skill).toContain("do not call it final");
    expect(skill).toContain("imagegen-required");
    expect(skill).toContain("static or near-static rows fail");
    expect(runner).toContain("## Source-authorship gate");
    expect(runner).toContain("hash-bound provider receipt");
    expect(runner).toContain("Manual transforms, Pillow rigs");
    expect(runner).toContain("not `image-cockpit.animation.v2`");
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
