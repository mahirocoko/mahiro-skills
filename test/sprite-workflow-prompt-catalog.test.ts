import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "sprite-workflow");
const script = join(skillRoot, "scripts", "prompt-catalog.py");
const catalogPath = join(skillRoot, "data", "prompt-catalog.json");
const templatesPath = join(skillRoot, "data", "prompt-templates.json");

function run(args: string[], cwd = repoRoot) {
  return spawnSync("python3", [script, ...args], { cwd, encoding: "utf8" });
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

describe("sprite-workflow prompt catalog", () => {
  test("ships all 107 examples with exact collection counts and unique provenance", () => {
    expect(catalog.entries).toHaveLength(107);
    const counts = Object.fromEntries(["basic-character", "profession-character", "monster", "monster-girl", "legacy-inline"].map(
      collection => [collection, catalog.entries.filter((entry: { collection: string }) => entry.collection === collection).length],
    ));
    expect(counts).toEqual({
      "basic-character": 21,
      "profession-character": 30,
      monster: 30,
      "monster-girl": 20,
      "legacy-inline": 6,
    });
    expect(new Set(catalog.entries.map((entry: { id: string }) => entry.id)).size).toBe(107);
    expect(new Set(catalog.entries.map((entry: { sourceLocator: string }) => entry.sourceLocator)).size).toBe(107);
  });

  test("validates strictly and resolves data independently of cwd", () => {
    const result = run(["validate", "--json"], "/tmp");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, entryCount: 107, templateCount: 5 });
  });

  test("search and original rendering are deterministic", () => {
    const first = run(["search", "forest mage", "--json"], "/tmp");
    const second = run(["--json", "search", "forest mage"], repoRoot);
    expect(first.status).toBe(0);
    expect(first.stdout).toBe(second.stdout);
    expect(JSON.parse(first.stdout).map((entry: { id: string }) => entry.id)).toContain("forest-mage-idle");

    const rendered = run(["render-original", "forest-mage-idle"]);
    const source = catalog.entries.find((entry: { id: string }) => entry.id === "forest-mage-idle");
    expect(rendered.status).toBe(0);
    expect(rendered.stdout).toBe(`${source.positivePrompt}\n`);
  });

  test("template rendering rejects missing and unknown parameters", () => {
    const missing = run(["template-render", "humanoid-character", "--json"]);
    expect(missing.status).toBe(2);
    expect(JSON.parse(missing.stderr).error).toContain("missing required parameter");

    const unknown = run(["template-render", "humanoid-character", "--param", "subject=mage", "--param", "bogus=value"]);
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toContain("unknown parameter");

    const rendered = run(["template-render", "humanoid-character", "--param", "subject=a traveling mage", "--json"]);
    expect(rendered.status).toBe(0);
    expect(JSON.parse(rendered.stdout)).toMatchObject({ id: "humanoid-character", exactOriginal: false });
  });

  test("ships full MIT attribution and pinned provenance", () => {
    const license = readFileSync(join(skillRoot, "references", "image-cockpit-LICENSE.txt"), "utf8");
    const reference = readFileSync(join(skillRoot, "references", "prompt-catalog.md"), "utf8");
    expect(license).toContain("MIT License");
    expect(license).toContain("Copyright (c) 2026 dreiachse-cyber");
    expect(license).toContain("Permission is hereby granted, free of charge");
    expect(catalog.upstream).toMatchObject({
      repository: "https://github.com/dreiachse-cyber/image-cockpit-for-codex-workflows",
      revision: "b997e78609773975a98617568818ac32f40cf1a7",
      license: "MIT",
    });
    expect(reference).toContain("not** claimed to be byte-for-byte equal");
  });

  test("keeps the lane data-only with no application or UI leakage", () => {
    const combined = [
      readFileSync(script, "utf8"),
      readFileSync(catalogPath, "utf8"),
      readFileSync(templatesPath, "utf8"),
    ].join("\n");
    for (const forbidden of ["lucide-react", "useState(", "ReactDOM", "<button", "className=", "src/styles.css"]) {
      expect(combined).not.toContain(forbidden);
    }
  });
});
