import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyLink,
  decodeHtml,
  extractCanonical,
  extractAnchors,
  fetchBoundedText,
  parseSitemapLinks,
  parseSitemapLocs,
  resetRequestBudget,
  validateInspectableUrl,
} from "../skills/studying-codrops/scripts/codrops";

const repoRoot = join(import.meta.dir, "..");
const skillRoot = join(repoRoot, "skills", "studying-codrops");

const read = (...segments: string[]) => readFileSync(join(repoRoot, ...segments), "utf8");

const asFetcher = (handler: (input: string, init?: RequestInit) => Promise<Response>) =>
  (async (input: string | URL | Request, init?: RequestInit) => handler(input.toString(), init)) as typeof fetch;

const readFrontmatter = (source: string) => {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  expect(match).not.toBeNull();

  return Object.fromEntries(
    (match?.[1] ?? "").split("\n").map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
  );
};

describe("studying-codrops skill", () => {
  test("ships an explicit Codrops-only study contract and paired wrappers", () => {
    const skill = read("skills", "studying-codrops", "SKILL.md");
    const command = read("commands", "studying-codrops.md");
    const geminiCommand = read("commands-gemini", "mh-studying-codrops.toml");

    expect(skill).toContain("## Trigger Policy");
    expect(skill).toContain("Do not auto-load it for ordinary frontend implementation");
    expect(skill).toContain("Codrops findings are candidate evidence, not design authority");
    expect(skill).toContain("## Evidence Workflow");
    expect(skill).toContain("## Stop Gates");
    expect(skill).toContain("## Output Contract");
    expect(skill).toContain("## Validation / Self-check");
    expect(skill).toContain("use `frontend-design`");
    expect(skill).toContain("use `deep-research`");
    expect(skill).toContain("use `learn`");
    expect(skill).toContain("use `uncodixify`");
    expect(skill).toContain("prints bounded metadata to stdout");
    expect(skill).not.toContain("--out");
    expect(command).toContain('skill: "studying-codrops"');
    expect(command).toContain("Do not auto-route ordinary frontend work here");
    expect(geminiCommand).toContain('skill: \\\"studying-codrops\\\"');
    expect(geminiCommand).toContain(".gemini/skills/studying-codrops/SKILL.md");
    expect(geminiCommand).toContain("~/.gemini/skills/studying-codrops/SKILL.md");
  });

  test("keeps metadata and progressive-disclosure references valid", () => {
    const skill = read("skills", "studying-codrops", "SKILL.md");
    const frontmatter = readFrontmatter(skill);
    const referenceLinks = [...skill.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map((match) => match[1]);

    expect(frontmatter.name).toBe("studying-codrops");
    expect(frontmatter.description.length).toBeGreaterThan(100);
    expect(frontmatter.description.length).toBeLessThanOrEqual(1024);
    expect(frontmatter.description).not.toContain("Mahiro Skill |");
    expect(frontmatter.description).toContain("Use only when");
    expect(frontmatter.description).toContain("Does not auto-load");
    expect(skill.split("\n").length).toBeLessThanOrEqual(500);
    expect(referenceLinks.length).toBeGreaterThanOrEqual(5);

    for (const reference of referenceLinks) {
      expect(existsSync(join(skillRoot, reference))).toBe(true);
    }
  });

  test("is discoverable but intentionally outside the default bundle", () => {
    const llms = read("skills", "llms.txt");
    const readme = read("README.md");
    const marketplace = JSON.parse(read(".claude-plugin", "marketplace.json")) as {
      bundles: Array<{ skills: string[]; commands: string[] }>;
    };
    const defaultBundle = marketplace.bundles[0];
    const llmsEntry = llms.split("\n").find((line) => line.startsWith("- `studying-codrops`")) ?? "";
    const readmeEntry = readme.split("\n").find((line) => line.startsWith("| `studying-codrops`")) ?? "";

    expect(llmsEntry).toContain("Codrops/Tympanus");
    expect(llmsEntry).toContain("Trigger only");
    expect(readmeEntry).toContain("Codrops/Tympanus");
    expect(readmeEntry).toContain("universal frontend style");
    expect(defaultBundle.skills).not.toContain("studying-codrops");
    expect(defaultBundle.commands).not.toContain("studying-codrops");
  });

  test("parses public sitemap metadata without retaining article bodies", () => {
    const index = `
      <a href="https://tympanus.net/codrops/post-sitemap.html">Posts</a>
      <a href="https://tympanus.net/codrops/webzibition-sitemap2.html">Webzibition</a>
      <a href="https://example.com/sitemap.html">Other</a>
    `;
    const sitemap = `
      <urlset>
        <url><loc>https://tympanus.net/codrops/one/</loc></url>
        <url><loc>https://tympanus.net/codrops/two/?a=1&amp;b=2</loc></url>
      </urlset>
    `;

    expect(parseSitemapLinks(index)).toEqual([
      "https://tympanus.net/codrops/post-sitemap.html",
      "https://tympanus.net/codrops/webzibition-sitemap2.html",
    ]);
    expect(parseSitemapLocs(sitemap)).toEqual([
      "https://tympanus.net/codrops/one/",
      "https://tympanus.net/codrops/two/?a=1&b=2",
    ]);
  });

  test("classifies repositories separately from GitHub profiles and invalid links", () => {
    const anchors = extractAnchors(`
      <a href="https://github.com/codrops/PageTransitions">Code</a>
      <a href="https://github.com/codrops">GitHub</a>
      <a href="https://github.com/franky-adl">Github</a>
      <a href="https://tympanus.net/Development/Grid">Demo</a>
      <a href="https://codepen.io/example/full/abc">Open</a>
      <a href="https://example.com">Visit website</a>
      <a href="http://[">Code</a>
    `).map((anchor) => classifyLink(anchor));

    expect(anchors.map((anchor) => anchor.kind)).toEqual([
      "source",
      "external",
      "external",
      "demo",
      "code",
      "visit",
      "invalid",
    ]);
    expect(anchors.at(-1)?.href).toBe("http://[");
  });

  test("allows only credential-free Codrops and GitHub HTTP URLs", () => {
    expect(validateInspectableUrl("https://tympanus.net/codrops/").hostname).toBe("tympanus.net");
    expect(validateInspectableUrl("https://github.com/codrops/PageTransitions").hostname).toBe("github.com");
    expect(() => validateInspectableUrl("http://127.0.0.1:3000")).toThrow("outside the Codrops/GitHub allowlist");
    expect(() => validateInspectableUrl("http://169.254.169.254/latest/meta-data")).toThrow(
      "outside the Codrops/GitHub allowlist",
    );
    expect(() => validateInspectableUrl("data:text/plain,hello")).toThrow("Unsupported URL scheme");
    expect(() => validateInspectableUrl("https://user:pass@github.com/codrops/PageTransitions")).toThrow(
      "credentials are not allowed",
    );
  });

  test("parses canonical links regardless of attribute order and truncates anchor text", () => {
    const canonical = extractCanonical(
      `<link href='/codrops/example/?a=1&#38;b=2' data-extra rel='alternate canonical'>`,
      "https://tympanus.net/codrops/example/",
    );
    const longText = "a".repeat(250);
    const [anchor] = extractAnchors(
      `<A data-label="one > zero" HREF=https://github.com/codrops/PageTransitions>${longText}</A>`,
    ).map((item) => classifyLink(item));

    expect(canonical).toBe("https://tympanus.net/codrops/example/?a=1&b=2");
    expect(decodeHtml("invalid &#999999999999; entity")).toBe("invalid &#999999999999; entity");
    expect(anchor.kind).toBe("source");
    expect(anchor.text.length).toBe(200);
    expect(anchor.textTruncated).toBe(true);
  });

  test("revalidates redirects and rejects redirects outside the allowlist", async () => {
    resetRequestBudget();
    const allowedRequests: string[] = [];
    const allowedFetcher = asFetcher(async (input) => {
      allowedRequests.push(input);
      if (allowedRequests.length === 1) {
        return new Response(null, { status: 302, headers: { location: "https://github.com/codrops/PageTransitions" } });
      }
      return new Response("ok", { status: 200 });
    });
    const allowed = await fetchBoundedText("https://tympanus.net/codrops/example/", {
      fetcher: allowedFetcher,
      retryDelayMs: 0,
    });

    expect(allowed.finalUrl).toBe("https://github.com/codrops/PageTransitions");
    expect(allowedRequests).toHaveLength(2);

    resetRequestBudget();
    const blockedFetcher = asFetcher(async () =>
      new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }),
    );
    await expect(
      fetchBoundedText("https://tympanus.net/codrops/example/", { fetcher: blockedFetcher, retryDelayMs: 0 }),
    ).rejects.toThrow("outside the Codrops/GitHub allowlist");
  });

  test("bounds retries, response size, time, and total request count", async () => {
    resetRequestBudget();
    let retryCalls = 0;
    const retryFetcher = asFetcher(async () => {
      retryCalls += 1;
      return retryCalls === 1 ? new Response("retry", { status: 503 }) : new Response("ok", { status: 200 });
    });
    const retried = await fetchBoundedText("https://tympanus.net/codrops/example/", {
      fetcher: retryFetcher,
      retryDelayMs: 0,
    });
    expect(retried.body).toBe("ok");
    expect(retryCalls).toBe(2);

    resetRequestBudget();
    const oversizedFetcher = asFetcher(async () =>
      new Response(null, { status: 200, headers: { "content-length": "5000001" } }),
    );
    await expect(
      fetchBoundedText("https://tympanus.net/codrops/example/", { fetcher: oversizedFetcher }),
    ).rejects.toThrow("Response exceeds 5000000 bytes");

    resetRequestBudget();
    const hangingFetcher = asFetcher(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );
    await expect(
      fetchBoundedText("https://tympanus.net/codrops/example/", {
        fetcher: hangingFetcher,
        retryDelayMs: 0,
        timeoutMs: 1,
      }),
    ).rejects.toThrow();

    resetRequestBudget();
    const okFetcher = asFetcher(async () => new Response("ok", { status: 200 }));
    for (let index = 0; index < 40; index += 1) {
      await fetchBoundedText("https://tympanus.net/codrops/example/", { fetcher: okFetcher });
    }
    await expect(fetchBoundedText("https://tympanus.net/codrops/example/", { fetcher: okFetcher })).rejects.toThrow(
      "Request cap exceeded (40)",
    );
    resetRequestBudget();
  });

  test("records the bounded authoring study without bundling third-party assets", () => {
    const study = read("docs", "authoring", "studying-codrops-study-2026-07.md");

    expect(study).toContain("The initial set contains 58 items");
    expect(study).toContain("WordPress Webzibition item permalinks redirected");
    expect(study).toContain("This is sufficient for the v0 procedural contract");
    expect(study).toContain("not a claim that all 58 items were deeply read or visually verified");
    expect(study).toContain("No article bodies, screenshots, videos, assets, or source snapshots are committed");
    expect(study).toContain("525ad0cb1a075a1dfa067972d49973c017ab3e327b097dd986e000e578600f08");
    expect(study).toContain("Provisional claim-to-evidence map");
  });
});
