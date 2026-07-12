import { describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  EVIDENCE_SCHEMA_VERSION,
  EVIDENCE_TOOL_VERSION,
  computeExperimentDigest,
  deriveCaseKey,
  deriveStateKey,
  sha256File,
  validateEvidenceManifest,
} from "../skills/frontend-design/scripts/evidence";

const scriptPath = join(import.meta.dir, "..", "skills", "frontend-design", "scripts", "evidence.ts");
const guidePath = join(
  import.meta.dir,
  "..",
  "skills",
  "frontend-design",
  "references",
  "evidence-tools.md",
);

interface ITestManifest {
  schemaVersion: number;
  toolVersion: string;
  requiredCases: string[];
  interactionRequirements: Array<{ control: string; states: Record<string, string> }>;
  captures: string[];
  closures: Array<{
    issueId: string;
    changeType: "capture-only" | "implementation";
    caseKey: string;
    beforeStateKey: string;
    beforeSourceFingerprint: string;
    issue: string;
    fix: string;
    afterSidecar: string;
  }>;
}

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), "frontend-design-evidence-"));
  mkdirSync(join(root, "captures"));
  mkdirSync(join(root, "sidecars"));
  return root;
}

function createState(
  sourceFingerprint: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    surface: "landing",
    origin: "http://127.0.0.1:4173",
    route: "/",
    surfaceSentinel: "Verified landing heading",
    sourceFingerprint,
    viewport: { width: 390, height: 844, dpr: 1 },
    language: "en",
    pressedLanguage: "en",
    h1: "Speak once. Keep moving.",
    uiState: "default",
    scrollTarget: "top",
    openControls: [] as string[],
    motion: "settled",
    ...overrides,
  };
}

function writeCapture(
  root: string,
  expected: ReturnType<typeof createState>,
  actualOverrides: Record<string, unknown> = {},
) {
  const caseKey = deriveCaseKey(expected);
  const stateKey = deriveStateKey(expected);
  const artifact = `captures/${stateKey}.png`;
  const sidecarPath = `sidecars/${stateKey}.json`;
  writeFileSync(join(root, artifact), `image:${stateKey}`);

  const sidecar = {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    toolVersion: EVIDENCE_TOOL_VERSION,
    caseKey,
    stateKey,
    artifact,
    artifactSha256: sha256File(join(root, artifact)),
    capturedAt: "2026-07-11T12:00:00.000Z",
    status: "pass",
    maxDocumentOverflowPx: 0,
    expected,
    actual: {
      ...expected,
      viewportWidth: expected.viewport.width,
      documentScrollWidth: expected.viewport.width,
      fontsReady: true,
      imagesReady: true,
      consoleErrors: [] as string[],
      networkErrors: [] as string[],
      ...actualOverrides,
    },
  };
  writeFileSync(join(root, sidecarPath), JSON.stringify(sidecar, null, 2));

  return { caseKey, stateKey, sidecarPath, artifact, sidecar };
}

function writeManifest(root: string, manifest: unknown) {
  const path = join(root, "evidence-manifest.json");
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  return path;
}

function baseManifest(captures: ReturnType<typeof writeCapture>[]): ITestManifest {
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    toolVersion: EVIDENCE_TOOL_VERSION,
    requiredCases: captures.map((capture) => capture.caseKey),
    interactionRequirements: [],
    captures: captures.map((capture) => capture.sidecarPath),
    closures: [],
  };
}

describe("frontend-design executable evidence tools", () => {
  test("documents a directly runnable installed-skill command setup", () => {
    const guide = readFileSync(guidePath, "utf8");
    const assignment = 'SKILL_DIR="/absolute/path/to/installed/frontend-design"';
    const command = 'bun "$SKILL_DIR/scripts/evidence.ts"';

    expect(guide).toContain(assignment);
    expect(guide).toContain('test -f "$SKILL_DIR/scripts/evidence.ts"');
    expect(guide.indexOf(assignment)).toBeLessThan(guide.indexOf(command));
    expect(guide).toContain(command);
    expect(guide).not.toContain("CODEX_HOME");
  });

  test("requires material motion cases without pretending overlap judgment is structured", () => {
    const guide = readFileSync(guidePath, "utf8");
    const references = readFileSync(
      join(import.meta.dir, "..", "skills", "frontend-design", "references", "reference-contracts.md"),
      "utf8",
    );

    expect(guide).toContain("list distinct `initial`, `fallback`, and `settled` case keys in `requiredCases`");
    expect(guide).toContain("the validator does not infer missing material states");
    expect(references).toContain("declare every material initial, fallback, and settled state as a separate required case");
    expect(guide).toContain("remain state-bound visual plus DOM/geometry judgments");
    expect(guide).toContain("The validator does not enforce them unless explicit structured fields and tooling are added");
  });

  test("derives distinct keys for initial, fallback, and settled motion states", () => {
    const source = "0".repeat(64);
    const initial = createState(source, { motion: "initial" });
    const fallback = createState(source, { motion: "fallback" });
    const settled = createState(source, { motion: "settled" });

    expect(new Set([deriveCaseKey(initial), deriveCaseKey(fallback), deriveCaseKey(settled)]).size).toBe(3);
    expect(new Set([deriveStateKey(initial), deriveStateKey(fallback), deriveStateKey(settled)]).size).toBe(3);
  });

  test("validates truthful matched language states and the CLI-derived keys", () => {
    const root = createRoot();
    try {
      const source = "a".repeat(64);
      const english = writeCapture(root, createState(source));
      const thai = writeCapture(
        root,
        createState(source, {
          language: "th",
          pressedLanguage: "th",
          h1: "พูดครั้งเดียว แล้วทำงานต่อได้เลย",
        }),
      );
      const manifest = baseManifest([english, thai]);
      manifest.interactionRequirements = [
        { control: "language", states: { en: english.caseKey, th: thai.caseKey } },
      ];
      const manifestPath = writeManifest(root, manifest);

      expect(validateEvidenceManifest(manifestPath)).toEqual({
        ok: true,
        errors: [],
        captures: 2,
        closures: 0,
      });

      const statePath = join(root, "expected.json");
      writeFileSync(statePath, JSON.stringify(english.sidecar.expected));
      const result = Bun.spawnSync(["bun", scriptPath, "key", statePath]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(new TextDecoder().decode(result.stdout))).toEqual({
        caseKey: english.caseKey,
        stateKey: english.stateKey,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects wrong language, stale identity, and dishonest capture labels", () => {
    const root = createRoot();
    try {
      const capture = writeCapture(root, createState("b".repeat(64)), {
        language: "th",
        pressedLanguage: "th",
        surfaceSentinel: "Old build heading",
      });
      const result = validateEvidenceManifest(writeManifest(root, baseManifest([capture])));

      expect(result.ok).toBe(false);
      expect(result.errors.some((error) => error.includes("actual.language"))).toBe(true);
      expect(result.errors.some((error) => error.includes("actual.pressedLanguage"))).toBe(true);
      expect(result.errors.some((error) => error.includes("actual.surfaceSentinel"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects document overflow and missing expanded interaction evidence", () => {
    const root = createRoot();
    try {
      const expanded = writeCapture(
        root,
        createState("c".repeat(64), {
          uiState: "expanded",
          scrollTarget: "proof",
          openControls: ["proof"],
        }),
        { documentScrollWidth: 776 },
      );
      const manifest = baseManifest([expanded]);
      manifest.interactionRequirements = [
        {
          control: "proof inspector",
          states: { collapsed: "missing-collapsed-case", expanded: expanded.caseKey },
        },
      ];
      const result = validateEvidenceManifest(writeManifest(root, manifest));

      expect(result.ok).toBe(false);
      expect(result.errors.some((error) => error.includes("document overflow"))).toBe(true);
      expect(result.errors.some((error) => error.includes("missing-collapsed-case"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("requires same-case rechecks and source changes only for implementation fixes", () => {
    const root = createRoot();
    try {
      const beforeSource = "d".repeat(64);
      const after = writeCapture(root, createState("e".repeat(64)));
      const manifest = baseManifest([after]);
      manifest.closures = [
        {
          issueId: "overflow",
          changeType: "implementation",
          caseKey: after.caseKey,
          beforeStateKey: `${after.caseKey}--src_${beforeSource}`,
          beforeSourceFingerprint: beforeSource,
          issue: "Document overflowed.",
          fix: "Contained the proof scroller.",
          afterSidecar: after.sidecarPath,
        },
      ];

      expect(validateEvidenceManifest(writeManifest(root, manifest)).ok).toBe(true);

      manifest.closures[0] = {
        ...manifest.closures[0],
        changeType: "capture-only",
      };
      const failed = validateEvidenceManifest(writeManifest(root, manifest));
      expect(failed.ok).toBe(false);
      expect(failed.errors.some((error) => error.includes("capture-only fix"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("produces path-independent digests and binds execution receipt changes", () => {
    const rootA = createRoot();
    const rootB = createRoot();
    try {
      for (const root of [rootA, rootB]) {
        mkdirSync(join(root, "packet"));
        mkdirSync(join(root, "artifacts"));
        mkdirSync(join(root, "receipts"));
        writeFileSync(join(root, "packet", "brief.md"), "same brief");
        writeFileSync(join(root, "packet", "prompt.txt"), "same prompt");
        writeFileSync(join(root, "artifacts", "render.png"), "same render");
        writeFileSync(
          join(root, "digest-without-receipt.json"),
          JSON.stringify({
            schemaVersion: EVIDENCE_SCHEMA_VERSION,
            packetFiles: ["packet/prompt.txt", "packet/brief.md"],
            artifactFiles: ["artifacts/render.png"],
            receiptFiles: [],
          }),
        );
      }

      const packetDigest = computeExperimentDigest(join(rootA, "digest-without-receipt.json")).packetDigest;
      const receipt = {
        schemaVersion: EVIDENCE_SCHEMA_VERSION,
        packetDigest,
        model: "model-a",
        effort: "high",
        sessionId: "session-1",
        isolatedWorkdir: "/isolated/lane",
        timestamp: "2026-07-11T12:00:00.000Z",
        promptSha256: "1".repeat(64),
        outputSha256: "2".repeat(64),
      };

      for (const root of [rootA, rootB]) {
        writeFileSync(join(root, "receipts", "lane.json"), JSON.stringify(receipt, null, 2));
        writeFileSync(
          join(root, "digest.json"),
          JSON.stringify({
            schemaVersion: EVIDENCE_SCHEMA_VERSION,
            packetFiles: ["packet/prompt.txt", "packet/brief.md"],
            artifactFiles: ["artifacts/render.png"],
            receiptFiles: ["receipts/lane.json"],
          }),
        );
      }

      const first = computeExperimentDigest(join(rootA, "digest.json"));
      const second = computeExperimentDigest(join(rootB, "digest.json"));
      expect(first.packetDigest).toBe(second.packetDigest);
      expect(first.experimentDigest).toBe(second.experimentDigest);

      const changedReceipt = { ...receipt, model: "model-b" };
      writeFileSync(join(rootB, "receipts", "lane.json"), JSON.stringify(changedReceipt, null, 2));
      const changed = computeExperimentDigest(join(rootB, "digest.json"));
      expect(changed.packetDigest).toBe(first.packetDigest);
      expect(changed.experimentDigest).not.toBe(first.experimentDigest);

      cpSync(join(rootA, "packet", "brief.md"), join(rootB, "packet", "brief.md"));
      expect(readFileSync(join(rootB, "packet", "brief.md"), "utf8")).toBe("same brief");
    } finally {
      rmSync(rootA, { recursive: true, force: true });
      rmSync(rootB, { recursive: true, force: true });
    }
  });

  test("rejects parent traversal instead of normalizing it into the experiment", () => {
    const root = createRoot();
    try {
      writeFileSync(
        join(root, "digest.json"),
        JSON.stringify({
          schemaVersion: EVIDENCE_SCHEMA_VERSION,
          packetFiles: ["packet/../outside.txt"],
          artifactFiles: [],
          receiptFiles: [],
        }),
      );
      expect(() => computeExperimentDigest(join(root, "digest.json"))).toThrow(
        "path must stay experiment-relative",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
