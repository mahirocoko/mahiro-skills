import { createHash } from "crypto";
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "fs";
import { extname, isAbsolute, join, relative } from "path";
import { install } from "../src/install";
import { makeTempEnv } from "./helpers";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "frontend-design");

function read(...segments: string[]) {
  return readFileSync(join(repoRoot, ...segments), "utf8");
}

function collectFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

function parseCsv(source: string) {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote) {
      if (character === ",") {
        row.push(field);
        field = "";
        afterQuote = false;
      } else if (character === "\r" || character === "\n") {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        row.push(field);
        if (row.length > 1 || row[0] !== "") records.push(row);
        row = [];
        field = "";
        afterQuote = false;
      } else {
        throw new Error("CSV closing quote must be followed by a delimiter or record terminator");
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) throw new Error("CSV quote must start at the beginning of a field");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.length > 1 || row[0] !== "") records.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (afterQuote || field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return records;
}

function parseFrozenCsv(source: string) {
  const [header = [], ...records] = parseCsv(source);
  if (header.length === 0) throw new Error("CSV header is missing");
  const rows = records.map((values) => {
    if (values.length !== header.length) throw new Error("CSV row does not match the header width");
    return Object.fromEntries(header.map((key, index) => [key, values[index]]));
  });
  return { header, rows };
}

function sha256Path(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("frontend-design reference research", () => {
  test("routes large collections to a stable, repo-neutral corpus contract", () => {
    const skill = read("skills", "frontend-design", "SKILL.md");
    const corpus = read("skills", "frontend-design", "references", "reference-corpus.md");
    const planFields = [
      "corpus_id",
      "research_question",
      "population_snapshot",
      "selection_source",
      "inclusion_exclusion",
      "dedupe_key",
      "independence_groups",
      "strata_targets",
      "batch_plan",
      "saturation_rule",
      "retention",
    ];
    const attemptFields = [
      "observation_id",
      "source_id",
      "attempt",
      "supersedes",
      "requested_url",
      "canonical_url",
      "resolved_url",
      "redirect_chain",
      "captured_at",
      "transport_state",
      "access_constraints",
      "surface_currency",
      "entry_context",
      "region",
      "locale",
      "overlay_state",
      "viewports",
      "dpr",
      "motion_states",
      "method",
      "artifact_refs",
      "artifact_hashes",
      "population_disposition",
      "inspection_depth",
      "admissibility",
      "limitations",
    ];
    const batchFields = [
      "batch_id",
      "planned_ids",
      "accounted_ids",
      "attempted_ids",
      "deferred_ids",
      "full_ids",
      "partial_ids",
      "structure_only_ids",
      "none_ids",
      "admissible_ids",
      "limited_ids",
      "inadmissible_ids",
      "new_cluster_ids",
      "revised_cluster_ids",
      "outlier_ids",
      "remaining_strata_gaps",
      "current_unanswered_question",
      "saturated",
    ];
    const coverageFields = [
      "expected_total",
      "discovered_total",
      "expected_missing_total",
      "unexpected_discovered_total",
      "included_total",
      "excluded_total",
      "attempted_total",
      "unattempted_total",
      "full_total",
      "partial_total",
      "structure_only_total",
      "none_total",
      "admissible_total",
      "limited_total",
      "inadmissible_total",
      "transport_reachable_total",
      "transport_automated_blocked_total",
      "transport_unreachable_total",
      "surface_current_total",
      "surface_stale_total",
      "surface_currency_unknown_total",
    ];
    const analysisFields = [
      "cluster_id",
      "conditional_pattern",
      "member_observation_ids",
      "counterexample_ids",
      "scope_limits",
      "outlier_type",
      "related_cluster_ids",
      "reason",
      "disposition",
    ];
    const candidateFields = [
      "candidate_id",
      "when",
      "prefer",
      "because",
      "evidence_cluster_ids",
      "scope",
      "approval",
    ];

    expect(skill).toContain("references/reference-corpus.md");
    expect(existsSync(join(skillRoot, "references", "reference-corpus.md"))).toBe(true);
    expect(corpus).toContain("This is a research method, not a pattern library");
    expect(corpus).toContain("There is no universal batch count");
    expect(corpus).toContain("research-only | promotion-proposed | promoted");
    expect(corpus).toContain("Keep it distinct from an evidence gap");
    expect(corpus).toContain("### Local Evidence Retention and Privacy");
    expect(corpus).toContain("sanitize secret or opaque query/fragment tokens, non-public referral identifiers");
    expect(corpus).toContain("Do not commit third-party screenshots, downloaded site bundles");

    for (const field of [
      ...planFields,
      ...attemptFields,
      ...coverageFields,
      ...batchFields,
      ...analysisFields,
      ...candidateFields,
    ]) {
      expect(corpus).toMatch(new RegExp(`^${field}:`, "m"));
    }
  });

  test("parses RFC 4180 quoting, escaped quotes, embedded commas, and CRLF", () => {
    expect(parseCsv('name,note\r\n"App, Inc.","said ""hello"""\r\n')).toEqual([
      ["name", "note"],
      ["App, Inc.", 'said "hello"'],
    ]);
    expect(() => parseCsv('name,note\n"broken,value')).toThrow("unterminated quoted field");
    expect(() => parseCsv('name,note\n"value"junk,ok\n')).toThrow(
      "closing quote must be followed by a delimiter or record terminator",
    );
  });

  test("preserves a complete, hashed authoring snapshot without packaging raw evidence", () => {
    const study = read("docs", "authoring", "frontend-design-reference-study-macapp-supply-2026-07.md");
    const csv = read("docs", "authoring", "frontend-design-reference-study-macapp-supply-2026-07.csv");
    const provenancePath = join(
      repoRoot,
      "docs",
      "authoring",
      "frontend-design-reference-study-macapp-supply-2026-07",
      "provenance.json",
    );
    const provenanceSource = readFileSync(provenancePath, "utf8");
    const provenance = JSON.parse(provenanceSource) as {
      schemaVersion: number;
      studyId: string;
      artifacts: Array<{ path: string; sha256: string; role: string; bytes: number }>;
      limitations: Array<{ id: string; detail: string }>;
      sanitization: { redactions: string[]; retainedPublicAttribution: string[]; excludedFromCommit: string[] };
      retention: { owner: string; reviewAt: string };
    };
    const { header, rows } = parseFrozenCsv(csv);
    const categories = new Map<string, number>();

    expect(header).toEqual([
      "name",
      "internal_url",
      "website_url",
      "outbound_url",
      "external_domain",
      "category",
      "featured",
      "curated_pick",
      "external_http_code",
      "external_effective_url",
      "external_redirects",
      "reachability",
    ]);
    expect(rows).toHaveLength(78);
    expect(new Set(rows.map((row) => row.internal_url)).size).toBe(78);

    for (const row of rows) {
      categories.set(row.category, (categories.get(row.category) ?? 0) + 1);
    }

    expect(categories.size).toBe(13);
    expect((categories.get("Utility") ?? 0) + (categories.get("Productivity") ?? 0)).toBe(46);
    expect(rows.filter((row) => row.featured === "True")).toHaveLength(5);
    expect(rows.filter((row) => row.curated_pick === "True")).toHaveLength(27);
    expect(rows.filter((row) => Number(row.external_redirects) > 0)).toHaveLength(13);

    expect(study).toContain("Status: reference-only authoring evidence");
    expect(study).toContain("[inventory sidecar](frontend-design-reference-study-macapp-supply-2026-07.csv)");
    expect(study).toContain("[committed provenance manifest](frontend-design-reference-study-macapp-supply-2026-07/provenance.json)");
    expect(study).toContain("## Evidence coverage and limits");
    expect(study).toContain("## Retrospective adequacy decision");
    expect(study).toContain("not a contract-compliant saturation result");
    expect(study).toContain("## Promotion decisions");
    expect(study).toContain("`promoted`");
    expect(study).toContain("approved by Mahiro on 2026-07-12");
    for (const field of [
      "Candidate ID",
      "Evidence IDs",
      "Counterexample / limitation IDs",
      "Scope",
      "Status",
      "Mahiro approval",
    ]) {
      expect(study).toContain(field);
    }
    expect(study).toContain("`fd-proof-evidence-001`");
    expect(study).toContain("`fd-corpus-method-001`");
    expect(study).toContain("`fd-proof-validity-001`");
    expect(study).not.toContain("Mahiro approval: pending");
    expect(study).not.toContain("`promotion-proposed`");
    expect(study).not.toContain("Already promoted into");
    expect(study).not.toContain("Promoted by this study");
    expect(study).not.toContain("source skill-tree receipt");

    expect(provenance.schemaVersion).toBe(1);
    expect(provenance.studyId).toBe("frontend-design-macapp-supply-2026-07");
    expect(provenance.artifacts).toHaveLength(5);
    expect(new Set(provenance.artifacts.map((artifact) => artifact.path))).toEqual(
      new Set([
        "docs/authoring/frontend-design-reference-study-macapp-supply-2026-07.md",
        "docs/authoring/frontend-design-reference-study-macapp-supply-2026-07.csv",
        "docs/authoring/frontend-design-reference-study-macapp-supply-2026-07/audit-01-26.md",
        "docs/authoring/frontend-design-reference-study-macapp-supply-2026-07/audit-27-52.md",
        "docs/authoring/frontend-design-reference-study-macapp-supply-2026-07/audit-53-78.md",
      ]),
    );
    for (const artifact of provenance.artifacts) {
      expect(isAbsolute(artifact.path)).toBe(false);
      expect(artifact.path.split("/")).not.toContain("..");
      expect(artifact.path.endsWith("provenance.json")).toBe(false);
      const artifactPath = join(repoRoot, artifact.path);
      expect(existsSync(artifactPath)).toBe(true);
      expect(readFileSync(artifactPath).byteLength).toBe(artifact.bytes);
      expect(sha256Path(artifactPath)).toBe(artifact.sha256);
    }
    expect(new Set(provenance.limitations.map((limitation) => limitation.id))).toEqual(
      new Set([
        "lim-category-skew",
        "lim-visual-gaps",
        "lim-schema-drift",
        "lim-state-context",
        "lim-geo-context",
        "lim-no-formal-saturation",
        "lim-local-visuals",
        "lim-legacy-reachability",
      ]),
    );
    expect(provenance.sanitization.redactions).toContain("Cursor referral identifier replaced with REDACTED");
    expect(provenance.sanitization.redactions).toContain("Framer dub_id replaced with REDACTED");
    expect(provenance.sanitization.retainedPublicAttribution).toEqual([
      "ref=macapp.supply",
      "atp=solt",
      "via=solt",
      "framer.link/solt",
    ]);
    expect(provenance.sanitization.excludedFromCommit).toContain("third-party screenshots and contact sheets");
    expect(provenance.retention).toMatchObject({ owner: "Mahiro", reviewAt: "2026-08-12" });
    expect(`${csv}\n${provenanceSource}`).not.toMatch(
      /cursor\.com\/referral\?code=(?!REDACTED)[^,&"\s]+/i,
    );
    expect(`${csv}\n${provenanceSource}`).not.toMatch(/dub_id=(?!REDACTED)[^,&"\s]+/i);
  });

  test("keeps source-specific corpus artifacts outside the packaged skill", () => {
    const packagedFiles = collectFiles(skillRoot);
    const packagedText = packagedFiles.map((path) => readFileSync(path, "utf8")).join("\n");
    const committedStudyRoot = join(
      repoRoot,
      "docs",
      "authoring",
      "frontend-design-reference-study-macapp-supply-2026-07",
    );
    const committedStudyFiles = collectFiles(committedStudyRoot);

    expect(
      packagedFiles.map((path) => relative(skillRoot, path)).some((path) => /macapp|reference-study/i.test(path)),
    ).toBe(false);
    expect(packagedText).not.toMatch(/Macapp Supply|macapp\.supply/i);
    expect(packagedText).not.toContain(".agent-state/frontend-design/research");
    expect(packagedText).not.toContain("/tmp/macapp");
    expect(
      committedStudyFiles.some((path) => [".png", ".jpg", ".jpeg", ".webp", ".html", ".js", ".zip"].includes(extname(path))),
    ).toBe(false);
  });

  test("isolates the complete frontend-design package from authoring evidence", () => {
    const temp = makeTempEnv();
    try {
      const result = install("codex", "local", ["frontend-design"], false, temp.env);
      const installedRoot = join(
        temp.env.MAHIRO_SKILLS_CWD!,
        ".codex",
        "skills",
        "frontend-design",
      );
      const sourceFiles = collectFiles(skillRoot).map((path) => relative(skillRoot, path)).sort();
      const installedFiles = collectFiles(installedRoot).map((path) => relative(installedRoot, path)).sort();
      const installedText = collectFiles(installedRoot)
        .map((path) => readFileSync(path, "utf8"))
        .join("\n");

      expect(result.status).toBe("installed");
      expect(installedFiles).toEqual(sourceFiles);
      expect(installedFiles).toContain("references/reference-corpus.md");
      expect(installedFiles).toContain("scripts/evidence.ts");

      for (const path of sourceFiles) {
        const source = readFileSync(join(skillRoot, path), "utf8");
        const installed = readFileSync(join(installedRoot, path), "utf8");
        expect(installed.replace("description: Mahiro Skill | ", "description: ")).toBe(source);
      }

      expect(installedText).not.toMatch(/Macapp Supply|macapp\.supply|docs\/authoring/i);
    } finally {
      temp.cleanup();
    }
  });
});
