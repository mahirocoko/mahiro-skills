import { describe, expect, test } from "bun:test";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "sprite-workflow");
const catalogPath = join(skillRoot, "data", "prompt-catalog.json");
const receiptPath = join(skillRoot, "data", "prompt-catalog-upstream-receipt.json");
const pinnedRevision = "b997e78609773975a98617568818ac32f40cf1a7";
const fidelityFields = ["positivePrompt", "negativePrompt", "notes", "title", "sourceHeading", "sourceLocator"] as const;

const catalogRaw = readFileSync(catalogPath);
const catalog = JSON.parse(catalogRaw.toString("utf8"));
const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: Record<string, unknown>) {
  const sorted = Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]));
  return `${JSON.stringify(sorted)}\n`;
}

describe("sprite-workflow upstream prompt fidelity receipt", () => {
  test("binds the pinned revision, raw catalog, and exact distribution", () => {
    expect(receipt).toMatchObject({
      schemaVersion: 1,
      upstreamRevision: pinnedRevision,
      entryCount: 107,
      collectionCounts: {
        "basic-character": 21,
        "profession-character": 30,
        monster: 30,
        "monster-girl": 20,
        "legacy-inline": 6,
      },
      catalogSha256: sha256(catalogRaw),
    });
    expect(Object.keys(receipt.sourceFileHashes).sort()).toEqual([
      "docs/prompt-examples/basic-character-prompts.md",
      "docs/prompt-examples/monster-girl-prompts.md",
      "docs/prompt-examples/monster-prompts.md",
      "docs/prompt-examples/profession-character-prompts.md",
      "src/App.tsx",
    ]);
    for (const hash of Object.values(receipt.sourceFileHashes)) {
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test("recomputes every field and canonical per-entry hash without upstream checkout", () => {
    expect(receipt.entries).toHaveLength(catalog.entries.length);
    expect(receipt.entries.map((entry: { id: string }) => entry.id)).toEqual(
      catalog.entries.map((entry: { id: string }) => entry.id),
    );

    for (const [index, entry] of catalog.entries.entries()) {
      const received = receipt.entries[index];
      const expectedFieldHashes = Object.fromEntries(
        fidelityFields.map(field => [field, sha256(entry[field])]),
      );
      expect(received.fieldHashes).toEqual(expectedFieldHashes);
      const fidelityRecord = Object.fromEntries([
        ["id", entry.id],
        ["collection", entry.collection],
        ...fidelityFields.map(field => [field, entry[field]]),
      ]);
      expect(received.sha256).toBe(sha256(canonicalJson(fidelityRecord)));
    }
  });
});
