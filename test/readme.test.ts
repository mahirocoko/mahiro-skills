import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const readmePath = join(import.meta.dir, "..", "README.md");

function indexOfOrThrow(content: string, needle: string): number {
  const index = content.indexOf(needle);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("README", () => {
  test("keeps install-first section order with a table of contents", () => {
    const content = readFileSync(readmePath, "utf8");

    const sections = [
      "## Table of Contents",
      "## Install",
      "## CLI",
      "## Repo layout",
      "## Included skills",
      "## Included commands",
      "## Packaging notes",
      "## Current status",
      "## Source of truth",
    ];

    const indices = sections.map((section) => indexOfOrThrow(content, section));

    for (let index = 1; index < indices.length; index += 1) {
      expect(indices[index]).toBeGreaterThan(indices[index - 1]);
    }
  });

  test("documents curl install and local checkout usage truthfully", () => {
    const content = readFileSync(readmePath, "utf8");

    expect(content).toContain("### Quick install via curl");
    expect(content).toContain("curl -fsSL https://raw.githubusercontent.com/mahirocoko/mahiro-skills/main/install.sh | bash -s -- --version v0.1.0 -- --agent opencode --scope global");
    expect(content).toContain("### Install from a local checkout");
    expect(content).toContain("bun ./src/cli.ts install --agent opencode --scope local");
    expect(content).toContain("This repo ships a private Bun CLI and installs from repo contents.");
    expect(content).not.toContain("npm install -g mahiro-skills");
    expect(content).not.toContain("bunx mahiro-skills");
  });
});
