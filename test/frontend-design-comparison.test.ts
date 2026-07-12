import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(import.meta.dir, "..");

function read(...segments: string[]) {
  return readFileSync(join(repoRoot, ...segments), "utf8");
}

function extractSection(source: string, heading: string) {
  const start = source.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);

  const level = heading.match(/^#+/)?.[0].length ?? 1;
  const bodyStart = start + heading.length;
  const tail = source.slice(bodyStart);
  const nextHeading = tail.match(new RegExp(`\\n#{1,${level}} `));
  const end = nextHeading?.index === undefined ? source.length : bodyStart + nextHeading.index;

  return source.slice(start, end);
}

function parseFirstTable(section: string) {
  const lines = section.split("\n");
  const tableStart = lines.findIndex((line) => line.trim().startsWith("|"));
  expect(tableStart).toBeGreaterThanOrEqual(0);

  const tableLines: string[] = [];
  for (const line of lines.slice(tableStart)) {
    if (!line.trim().startsWith("|")) {
      break;
    }
    tableLines.push(line);
  }
  const splitRow = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());
  const headers = splitRow(tableLines[0] ?? "");

  return tableLines.slice(2).map((line) =>
    Object.fromEntries(splitRow(line).map((cell, index) => [headers[index], cell])),
  );
}

function findRow(rows: Array<Record<string, string>>, field: string, value: string) {
  const row = rows.find((candidate) => candidate[field]?.includes(value));
  expect(row).toBeDefined();
  return row ?? {};
}

function canReuseProjectDecision(
  retentionRow: Record<string, string>,
  sourceRepository: string,
  targetRepository: string,
  appliesTo: string,
  targetSurface: string,
) {
  return (
    retentionRow["Later reads"]?.includes("same repository") === true &&
    sourceRepository === targetRepository &&
    appliesTo === targetSurface
  );
}

describe("frontend-design comparison contract", () => {
  const skill = read("skills", "frontend-design", "SKILL.md");
  const references = read("skills", "frontend-design", "references", "reference-contracts.md");
  const guidance = read("skills", "mahiro-guidance-refine", "SKILL.md");
  const comparison = extractSection(references, "## 5. Comparison Mode: Anonymous Composition Exploration");
  const stateRows = parseFirstTable(extractSection(comparison, "### Comparison State Contract"));
  const retentionRows = parseFirstTable(extractSection(comparison, "### Retention and Reuse Contract"));

  test("keeps bounded work out and blocks cosmetic or inadmissible makers", () => {
    const bounded = findRow(stateRows, "Event or condition", "bounded task");
    const cosmetic = findRow(stateRows, "Event or condition", "hypotheses differ only");
    const inadmissible = findRow(stateRows, "Event or condition", "inadmissible or unmatched");

    expect(extractSection(skill, "## Effort Ladder")).toContain(
      "do not add comparison artifacts to bounded work by default",
    );
    expect(bounded["Next state"]).toBe("inactive");
    expect(bounded["Durable record"]).toBe("none");
    expect(cosmetic["Next state"]).toBe("blocked");
    expect(cosmetic["Promotion"]).toBe("none");
    expect(inadmissible["Next state"]).toBe("blocked");
    expect(inadmissible["Promotion"]).toBe("none");
  });

  test("keeps critic, human selection, reveal, fixes, and Neither in the required order", () => {
    const criticRecorded = findRow(stateRows, "Event or condition", "immutable critic verdict written");
    const humanPending = findRow(stateRows, "Event or condition", "human selection not provided");
    const humanSelected = findRow(stateRows, "Event or condition", "human selects an option");
    const neither = findRow(stateRows, "Event or condition", "human selects Neither");
    const criticFix = findRow(stateRows, "Event or condition", "critic requests an implementation fix");

    expect(criticRecorded["Next state"]).toBe("human-pending");
    expect(criticRecorded.Mapping).toBe("sealed");
    expect(humanPending["Next state"]).toBe("human-pending");
    expect(humanPending["Durable record"]).toBe("none");
    expect(humanSelected.Mapping).toBe("reveal now");
    expect(humanSelected.Promotion).toBe("selected project/surface only");
    expect(neither.Mapping).toBe("reveal now");
    expect(neither.Promotion).toBe("none");
    expect(criticFix["Next state"]).toBe("blocked");
    expect(criticFix.Promotion).toContain("same-state recapture");
  });

  test("parses a complete post-selection schema without converting feasibility into taste", () => {
    const decisionRows = parseFirstTable(extractSection(comparison, "### Post-selection Decision Record"));
    const fields = new Set(decisionRows.map((row) => row.Field));
    const requiredFields = [
      "Decision identity",
      "Project context",
      "Source and targets",
      "Retention",
      "Experiment controls",
      "Maker hypotheses",
      "Admissibility",
      "Preliminary critic verdict",
      "Human selection",
      "Decision basis",
      "Human rationale",
      "Agent inference",
      "Post-reveal relationship",
      "Preserve",
      "Loser strengths",
      "Rejected interpretations",
      "Conditional learning",
      "Scope boundaries",
      "Revalidation",
      "Decision status",
      "Portability",
      "History links",
    ];

    for (const field of requiredFields) {
      expect(fields.has(field)).toBe(true);
    }

    const sampleArtifact = Object.fromEntries(requiredFields.map((field) => [field, "recorded"]));
    expect(requiredFields.filter((field) => !(field in sampleArtifact))).toEqual([]);
    expect(extractSection(comparison, "### Post-selection Decision Record")).toContain(
      "If feasibility or deadline drives the human choice",
    );
    expect(extractSection(comparison, "### Post-selection Decision Record")).toContain(
      "leave taste-oriented conditional learning as `none`",
    );
  });

  test("retains decisions only with explicit project scope and preserves contradictory history", () => {
    const sessionOnly = findRow(retentionRows, "Retention", "session-only");
    const projectPrivate = findRow(retentionRows, "Retention", "project-private");
    const projectShared = findRow(retentionRows, "Retention", "project-shared");
    const contradiction = findRow(stateRows, "Event or condition", "contradicts or narrows");

    expect(sessionOnly["Durable write"]).toBe("no Decision Record");
    expect(projectPrivate.Approval).toBe("explicit human approval");
    expect(projectShared.Approval).toContain("explicit human approval");
    expect(canReuseProjectDecision(projectPrivate, "repo-a", "repo-a", "landing", "landing")).toBe(true);
    expect(canReuseProjectDecision(projectPrivate, "repo-a", "repo-b", "landing", "landing")).toBe(false);
    expect(canReuseProjectDecision(projectPrivate, "repo-a", "repo-a", "landing", "dashboard")).toBe(false);
    expect(contradiction["Durable record"]).toContain("superseding or narrowing link");
    expect(contradiction.Promotion).toContain("do not erase history");
  });

  test("keeps project-memory holdouts sealed and prevents cross-brand leakage", () => {
    const holdoutRows = parseFirstTable(extractSection(comparison, "### Longitudinal and Holdout Checks"));
    const sameProject = findRow(holdoutRows, "Holdout", "same-project");
    const crossBrand = findRow(holdoutRows, "Holdout", "cross-brand negative");

    expect(sameProject["Conditioned lane"]).toContain("matching repository and applies-to scope");
    expect(sameProject["Control lane"]).toBe("load no retained decision");
    expect(sameProject["Required boundary"]).toContain("sealed and matched");
    expect(crossBrand["Conditioned lane"]).toBe("load no decision from the source project");
    expect(crossBrand["Required boundary"]).toContain("may leak globally");
    expect(comparison).toContain("A `portable-candidate` remains unavailable cross-project");
  });

  test("routes guidance promotion to the existing owner instead of editing skills from a selection", () => {
    expect(comparison).toContain("through `mahiro-guidance-refine`");
    expect(comparison).toContain("a selection result never edits skill files automatically");
    expect(guidance).toContain("Choose one destination");
    expect(guidance).toContain("Do not promote a single correction into global doctrine");
  });
});
