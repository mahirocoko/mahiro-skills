import { createHash } from "crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "fs";
import { basename, dirname, isAbsolute, normalize, resolve, sep } from "path";

export const EVIDENCE_SCHEMA_VERSION = 1;
export const EVIDENCE_TOOL_VERSION = "1.0.0";

interface IViewport {
  width: number;
  height: number;
  dpr: number;
}

interface ICaptureState {
  surface: string;
  origin: string;
  route: string;
  surfaceSentinel: string;
  sourceFingerprint: string;
  viewport: IViewport;
  language: string;
  pressedLanguage: string;
  h1: string;
  uiState: string;
  scrollTarget: string;
  openControls: string[];
  motion: string;
}

interface IActualCaptureState extends ICaptureState {
  viewportWidth: number;
  documentScrollWidth: number;
  fontsReady: boolean;
  imagesReady: boolean;
  consoleErrors: string[];
  networkErrors: string[];
}

export interface ICaptureSidecar {
  schemaVersion: number;
  toolVersion: string;
  caseKey: string;
  stateKey: string;
  artifact: string;
  artifactSha256: string;
  capturedAt: string;
  status: "pass" | "fail";
  maxDocumentOverflowPx: number;
  expected: ICaptureState;
  actual: IActualCaptureState;
}

interface IInteractionRequirement {
  control: string;
  states: Record<string, string>;
}

interface IClosureRecord {
  issueId: string;
  changeType: "capture-only" | "implementation";
  caseKey: string;
  beforeStateKey: string;
  beforeSourceFingerprint: string;
  issue: string;
  fix: string;
  afterSidecar: string;
}

export interface IEvidenceManifest {
  schemaVersion: number;
  toolVersion: string;
  requiredCases: string[];
  interactionRequirements: IInteractionRequirement[];
  captures: string[];
  closures: IClosureRecord[];
}

interface IExecutionReceipt {
  schemaVersion: number;
  packetDigest: string;
  model: string;
  effort: string;
  sessionId: string;
  isolatedWorkdir: string;
  timestamp: string;
  promptSha256: string;
  outputSha256: string;
}

interface IDigestManifest {
  schemaVersion: number;
  packetFiles: string[];
  artifactFiles: string[];
  receiptFiles: string[];
}

interface IFileDigest {
  path: string;
  sha256: string;
}

export interface IEvidenceValidationResult {
  ok: boolean;
  errors: string[];
  captures: number;
  closures: number;
}

export interface IExperimentDigestResult {
  schemaVersion: number;
  packetDigest: string;
  experimentDigest: string;
  packetFiles: IFileDigest[];
  artifactFiles: IFileDigest[];
  receiptFiles: IFileDigest[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function canonicalPath(path: string) {
  return path.split(sep).join("/");
}

function safeRelativePath(root: string, path: string) {
  const normalized = normalize(path);
  const segments = path.replaceAll("\\", "/").split("/");
  const unsafe =
    path.length === 0 ||
    isAbsolute(path) ||
    segments.includes("..") ||
    normalized === ".." ||
    normalized.startsWith(`..${sep}`);

  if (unsafe) {
    throw new Error(`path must stay experiment-relative: ${path}`);
  }

  return resolve(root, normalized);
}

function requireFile(root: string, path: string) {
  const absolutePath = safeRelativePath(root, path);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new Error(`missing file: ${path}`);
  }
  return absolutePath;
}

export function sha256File(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function safeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "none";
}

function normalizedControls(controls: string[]) {
  return [...controls].map(safeToken).sort();
}

export function deriveCaseKey(state: ICaptureState) {
  const openControls = normalizedControls(state.openControls).join("+") || "none";
  const viewport = `${state.viewport.width}x${state.viewport.height}@${state.viewport.dpr}`;
  return [
    safeToken(state.surface),
    viewport,
    safeToken(state.language),
    safeToken(state.uiState),
    safeToken(state.scrollTarget),
    `open_${openControls}`,
    `motion_${safeToken(state.motion)}`,
  ].join("--");
}

export function deriveStateKey(state: ICaptureState) {
  return `${deriveCaseKey(state)}--src_${safeToken(state.sourceFingerprint)}`;
}

function sameStringArray(left: string[], right: string[]) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function validateCaptureState(sidecarPath: string, sidecar: ICaptureSidecar, errors: string[]) {
  const prefix = `${sidecarPath}:`;
  const expectedCaseKey = deriveCaseKey(sidecar.expected);
  const expectedStateKey = deriveStateKey(sidecar.expected);
  const exactFields: Array<keyof ICaptureState> = [
    "surface",
    "origin",
    "route",
    "surfaceSentinel",
    "sourceFingerprint",
    "language",
    "pressedLanguage",
    "h1",
    "uiState",
    "scrollTarget",
    "motion",
  ];

  if (sidecar.schemaVersion !== EVIDENCE_SCHEMA_VERSION) {
    errors.push(`${prefix} unsupported schemaVersion`);
  }
  if (sidecar.toolVersion !== EVIDENCE_TOOL_VERSION) {
    errors.push(`${prefix} toolVersion must be ${EVIDENCE_TOOL_VERSION}`);
  }
  if (sidecar.caseKey !== expectedCaseKey) {
    errors.push(`${prefix} caseKey does not match expected state`);
  }
  if (sidecar.stateKey !== expectedStateKey) {
    errors.push(`${prefix} stateKey does not match expected state/source fingerprint`);
  }
  if (basename(sidecarPath) !== `${sidecar.stateKey}.json`) {
    errors.push(`${prefix} sidecar filename must be derived from stateKey`);
  }
  if (basename(sidecar.artifact) !== `${sidecar.stateKey}.png`) {
    errors.push(`${prefix} artifact filename must be derived from stateKey`);
  }

  for (const field of exactFields) {
    if (sidecar.actual[field] !== sidecar.expected[field]) {
      errors.push(`${prefix} actual.${field} does not match expected.${field}`);
    }
  }

  for (const field of ["width", "height", "dpr"] as const) {
    if (sidecar.actual.viewport[field] !== sidecar.expected.viewport[field]) {
      errors.push(`${prefix} actual.viewport.${field} does not match expected viewport`);
    }
  }

  if (!sameStringArray(sidecar.actual.openControls, sidecar.expected.openControls)) {
    errors.push(`${prefix} openControls do not match expected interaction state`);
  }
  if (!sidecar.actual.fontsReady) {
    errors.push(`${prefix} fonts were not ready`);
  }
  if (!sidecar.actual.imagesReady) {
    errors.push(`${prefix} critical images were not ready`);
  }
  if (sidecar.actual.consoleErrors.length > 0) {
    errors.push(`${prefix} console errors were present`);
  }
  if (sidecar.actual.networkErrors.length > 0) {
    errors.push(`${prefix} network errors were present`);
  }
  if (sidecar.actual.viewportWidth !== sidecar.expected.viewport.width) {
    errors.push(`${prefix} measured viewport width does not match expected viewport`);
  }
  if (
    sidecar.actual.documentScrollWidth >
    sidecar.actual.viewportWidth + sidecar.maxDocumentOverflowPx
  ) {
    errors.push(`${prefix} document overflow exceeds the allowed threshold`);
  }
  if (sidecar.status !== "pass") {
    errors.push(`${prefix} admitted capture status must be pass`);
  }
}

export function validateEvidenceManifest(manifestPath: string): IEvidenceValidationResult {
  const errors: string[] = [];
  const root = dirname(resolve(manifestPath));
  const manifest = readJson<IEvidenceManifest>(manifestPath);
  const sidecars = new Map<string, ICaptureSidecar>();

  if (manifest.schemaVersion !== EVIDENCE_SCHEMA_VERSION) {
    errors.push("manifest: unsupported schemaVersion");
  }
  if (manifest.toolVersion !== EVIDENCE_TOOL_VERSION) {
    errors.push(`manifest: toolVersion must be ${EVIDENCE_TOOL_VERSION}`);
  }
  if (new Set(manifest.captures).size !== manifest.captures.length) {
    errors.push("manifest: duplicate capture sidecar paths");
  }

  for (const sidecarPath of manifest.captures) {
    try {
      const absoluteSidecar = requireFile(root, sidecarPath);
      const sidecar = readJson<ICaptureSidecar>(absoluteSidecar);
      validateCaptureState(sidecarPath, sidecar, errors);
      const artifactPath = requireFile(root, sidecar.artifact);
      if (sha256File(artifactPath) !== sidecar.artifactSha256) {
        errors.push(`${sidecarPath}: artifact SHA-256 mismatch`);
      }
      if (sidecars.has(sidecar.caseKey)) {
        errors.push(`${sidecarPath}: duplicate admitted caseKey ${sidecar.caseKey}`);
      }
      sidecars.set(sidecar.caseKey, sidecar);
    } catch (error) {
      errors.push(`${sidecarPath}: ${(error as Error).message}`);
    }
  }

  for (const caseKey of manifest.requiredCases) {
    if (!sidecars.has(caseKey)) {
      errors.push(`manifest: missing required case ${caseKey}`);
    }
  }

  for (const requirement of manifest.interactionRequirements) {
    const states = Object.entries(requirement.states);
    if (states.length < 2) {
      errors.push(`interaction ${requirement.control}: at least two states are required`);
    }
    for (const [state, caseKey] of states) {
      if (!sidecars.has(caseKey)) {
        errors.push(`interaction ${requirement.control}/${state}: missing case ${caseKey}`);
      }
    }
  }

  for (const closure of manifest.closures) {
    try {
      const afterPath = requireFile(root, closure.afterSidecar);
      const after = readJson<ICaptureSidecar>(afterPath);
      if (!closure.issue.trim() || !closure.fix.trim()) {
        errors.push(`closure ${closure.issueId}: issue and fix are required`);
      }
      if (after.caseKey !== closure.caseKey) {
        errors.push(`closure ${closure.issueId}: recheck must use the same caseKey`);
      }
      if (after.stateKey === closure.beforeStateKey) {
        errors.push(`closure ${closure.issueId}: recheck stateKey must identify a new capture`);
      }
      if (
        closure.changeType === "implementation" &&
        after.expected.sourceFingerprint === closure.beforeSourceFingerprint
      ) {
        errors.push(`closure ${closure.issueId}: implementation fix must change sourceFingerprint`);
      }
      if (
        closure.changeType === "capture-only" &&
        after.expected.sourceFingerprint !== closure.beforeSourceFingerprint
      ) {
        errors.push(`closure ${closure.issueId}: capture-only fix must keep sourceFingerprint`);
      }
      if (after.status !== "pass") {
        errors.push(`closure ${closure.issueId}: recheck sidecar must pass`);
      }
    } catch (error) {
      errors.push(`closure ${closure.issueId}: ${(error as Error).message}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    captures: manifest.captures.length,
    closures: manifest.closures.length,
  };
}

function digestEntries(root: string, paths: string[]) {
  const canonicalPaths = paths.map((path) => {
    safeRelativePath(root, path);
    return canonicalPath(normalize(path));
  });
  const uniquePaths = [...new Set(canonicalPaths)].sort();
  if (uniquePaths.length !== paths.length) {
    throw new Error("digest manifest contains duplicate paths");
  }

  return uniquePaths.map((path) => ({
    path,
    sha256: sha256File(requireFile(root, path)),
  }));
}

function digestFileList(entries: IFileDigest[]) {
  const canonical = entries.map((entry) => `${entry.path}\0${entry.sha256}\n`).join("");
  return createHash("sha256").update(canonical).digest("hex");
}

function validateReceipt(path: string, receipt: IExecutionReceipt, packetDigest: string) {
  const errors: string[] = [];
  if (receipt.schemaVersion !== EVIDENCE_SCHEMA_VERSION) {
    errors.push("unsupported schemaVersion");
  }
  if (receipt.packetDigest !== packetDigest) {
    errors.push("packetDigest does not match computed packet digest");
  }
  for (const field of [
    "model",
    "effort",
    "sessionId",
    "isolatedWorkdir",
    "timestamp",
    "promptSha256",
    "outputSha256",
  ] as const) {
    if (!receipt[field]?.trim()) {
      errors.push(`${field} is required`);
    }
  }
  for (const field of ["promptSha256", "outputSha256"] as const) {
    if (!/^[a-f0-9]{64}$/.test(receipt[field])) {
      errors.push(`${field} must be a lowercase SHA-256`);
    }
  }
  if (Number.isNaN(Date.parse(receipt.timestamp))) {
    errors.push("timestamp must be an ISO-compatible date");
  }
  if (errors.length > 0) {
    throw new Error(`${path}: ${errors.join("; ")}`);
  }
}

export function computeExperimentDigest(manifestPath: string): IExperimentDigestResult {
  const root = dirname(resolve(manifestPath));
  const manifest = readJson<IDigestManifest>(manifestPath);
  if (manifest.schemaVersion !== EVIDENCE_SCHEMA_VERSION) {
    throw new Error("digest manifest has an unsupported schemaVersion");
  }

  const packetFiles = digestEntries(root, manifest.packetFiles);
  const packetDigest = digestFileList(packetFiles);

  for (const receiptPath of manifest.receiptFiles) {
    const absolutePath = requireFile(root, receiptPath);
    validateReceipt(receiptPath, readJson<IExecutionReceipt>(absolutePath), packetDigest);
  }

  const artifactFiles = digestEntries(root, manifest.artifactFiles);
  const receiptFiles = digestEntries(root, manifest.receiptFiles);
  const experimentDigest = digestFileList([...packetFiles, ...artifactFiles, ...receiptFiles]);

  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    packetDigest,
    experimentDigest,
    packetFiles,
    artifactFiles,
    receiptFiles,
  };
}

function usage() {
  return [
    "Usage:",
    "  bun evidence.ts key <expected-state.json>",
    "  bun evidence.ts validate <evidence-manifest.json>",
    "  bun evidence.ts digest <digest-manifest.json> [--write <result.json>]",
  ].join("\n");
}

async function main() {
  const [command, manifestPath, ...rest] = process.argv.slice(2);
  if (!command || !manifestPath || !["key", "validate", "digest"].includes(command)) {
    console.error(usage());
    process.exit(1);
  }

  if (command === "key") {
    const state = readJson<ICaptureState>(manifestPath);
    console.log(
      JSON.stringify({ caseKey: deriveCaseKey(state), stateKey: deriveStateKey(state) }, null, 2),
    );
    return;
  }

  if (command === "validate") {
    const result = validateEvidenceManifest(manifestPath);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }

  const result = computeExperimentDigest(manifestPath);
  const writeIndex = rest.indexOf("--write");
  if (writeIndex >= 0) {
    const outputPath = rest[writeIndex + 1];
    if (!outputPath) {
      throw new Error("--write requires an output path");
    }
    writeFileSync(resolve(outputPath), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.main) {
  await main();
}
