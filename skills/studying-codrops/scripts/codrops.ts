const CODROPS_BASE_URL = "https://tympanus.net/codrops/";
const WORDPRESS_API_URL = `${CODROPS_BASE_URL}wp-json/wp/v2/`;
const USER_AGENT = "mahiro-skills/studying-codrops metadata inventory";
const ALLOWED_HOSTS = new Set(["github.com", "tympanus.net", "www.github.com", "www.tympanus.net"]);
const MAX_ANCHOR_TEXT_LENGTH = 200;
const MAX_REDIRECTS = 4;
const MAX_REQUESTS = 40;
const MAX_RESPONSE_BYTES = 5_000_000;
const MAX_SITEMAP_FAMILIES = 20;
const REQUEST_TIMEOUT_MS = 20_000;
const RETRY_ATTEMPTS = 2;

let requestCount = 0;

interface IAnchor {
  href: string;
  text: string;
}

interface IClassifiedLink extends IAnchor {
  domain: string;
  kind: "code" | "demo" | "external" | "internal" | "invalid" | "source" | "visit";
  textTruncated?: boolean;
}

interface IInventoryEndpoint {
  endpoint: string;
  total: number | null;
}

interface IFetchRuntime {
  fetcher?: typeof fetch;
  retryDelayMs?: number;
  timeoutMs?: number;
}

const decodeCodePoint = (entity: string, code: string, radix: number) => {
  const value = Number.parseInt(code, radix);
  if (!Number.isSafeInteger(value) || value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
    return entity;
  }
  try {
    return String.fromCodePoint(value);
  } catch {
    return entity;
  }
};

export const decodeHtml = (value: string) =>
  value
    .replace(/&#x([\da-f]+);/gi, (entity, code: string) => decodeCodePoint(entity, code, 16))
    .replace(/&#(\d+);/g, (entity, code: string) => decodeCodePoint(entity, code, 10))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

export const stripTags = (value: string) =>
  decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const parseAttributes = (source: string) => {
  const attributes = new Map<string, string>();
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of source.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), decodeHtml(match[2] ?? match[3] ?? match[4] ?? ""));
  }

  return attributes;
};

const findTagEnd = (source: string, start: number) => {
  let quote: '"' | "'" | null = null;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  return -1;
};

export const parseSitemapLinks = (source: string) => {
  const links = [...source.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => decodeHtml(match[1]))
    .filter((url) => url.startsWith(CODROPS_BASE_URL) && /sitemap[^/]*\.html$/i.test(url));

  return [...new Set(links)].filter((url) => url !== `${CODROPS_BASE_URL}sitemap.html`);
};

export const parseSitemapLocs = (source: string) =>
  [...new Set([...source.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decodeHtml(match[1].trim())))];

export const extractAnchors = (source: string): IAnchor[] => {
  const anchors: IAnchor[] = [];
  const lowerSource = source.toLowerCase();
  const startPattern = /<a\b/gi;
  let match: RegExpExecArray | null;

  while ((match = startPattern.exec(source))) {
    const startTagEnd = findTagEnd(source, startPattern.lastIndex);
    if (startTagEnd < 0) break;
    const closeTagStart = lowerSource.indexOf("</a", startTagEnd + 1);
    if (closeTagStart < 0) {
      startPattern.lastIndex = startTagEnd + 1;
      continue;
    }
    const closeTagEnd = findTagEnd(source, closeTagStart + 3);
    if (closeTagEnd < 0) break;

    const href = parseAttributes(source.slice(startPattern.lastIndex, startTagEnd)).get("href");
    startPattern.lastIndex = closeTagEnd + 1;
    if (!href) continue;
    anchors.push({ href, text: stripTags(source.slice(startTagEnd + 1, closeTagStart)) });
  }

  return anchors;
};

export const classifyLink = (anchor: IAnchor, pageUrl = CODROPS_BASE_URL): IClassifiedLink => {
  let url: URL;
  try {
    url = new URL(anchor.href, pageUrl);
  } catch {
    return { ...anchor, domain: "", kind: "invalid" };
  }

  const domain = url.hostname.toLowerCase().replace(/^www\./, "");
  const textTruncated = anchor.text.length > MAX_ANCHOR_TEXT_LENGTH;
  const retainedText = textTruncated ? `${anchor.text.slice(0, MAX_ANCHOR_TEXT_LENGTH - 1)}…` : anchor.text;
  const text = retainedText.toLowerCase();
  const isCodrops = domain === "tympanus.net" && url.pathname.startsWith("/codrops/");
  let kind: IClassifiedLink["kind"] = isCodrops ? "internal" : "external";
  const githubSegments = url.pathname.split("/").filter(Boolean);
  const isGithubRepository =
    domain === "github.com" &&
    githubSegments.length >= 2 &&
    !new Set(["explore", "features", "login", "marketplace", "orgs", "settings", "signup", "topics"]).has(
      githubSegments[0].toLowerCase(),
    );

  if (domain === "github.com" || domain === "gist.github.com") {
    kind = isGithubRepository || domain === "gist.github.com" ? "source" : "external";
  } else if (domain === "codepen.io" || domain === "codesandbox.io" || /\b(code|source|github)\b/.test(text)) {
    kind = "code";
  } else if (/\b(demo|preview|try it|open demo)\b/.test(text) || /\/(Development|Tutorials|Blueprints|Sketches)\//.test(url.pathname)) {
    kind = "demo";
  } else if (/\b(visit|website|view site)\b/.test(text)) {
    kind = "visit";
  }

  return { href: url.toString(), text: retainedText, domain, kind, ...(textTruncated && { textTruncated }) };
};

export const validateInspectableUrl = (input: string, base?: string) => {
  const url = new URL(input, base);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  if (url.username || url.password) throw new Error("URL credentials are not allowed");
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error(`Host is outside the Codrops/GitHub allowlist: ${url.hostname}`);
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error(`URL port is not allowed: ${url.port}`);
  return url;
};

const readBoundedBody = async (response: Response) => {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_RESPONSE_BYTES) throw new Error(`Response exceeds ${MAX_RESPONSE_BYTES} bytes`);
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error(`Response exceeds ${MAX_RESPONSE_BYTES} bytes`);
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
};

export const resetRequestBudget = () => {
  requestCount = 0;
};

export const fetchBoundedText = async (input: string, runtime: IFetchRuntime = {}) => {
  const fetcher = runtime.fetcher ?? fetch;
  const retryDelayMs = runtime.retryDelayMs ?? 250;
  const timeoutMs = runtime.timeoutMs ?? REQUEST_TIMEOUT_MS;
  let url = validateInspectableUrl(input);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    let response: Response | undefined;
    let lastError: unknown;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
      try {
        if (requestCount >= MAX_REQUESTS) throw new Error(`Request cap exceeded (${MAX_REQUESTS})`);
        requestCount += 1;
        response = await fetcher(url, {
          headers: { "user-agent": USER_AGENT },
          redirect: "manual",
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status !== 429 && response.status < 500) break;
        lastError = new Error(`HTTP ${response.status} for ${url}`);
        await response.body?.cancel();
      } catch (error) {
        lastError = error;
      }
      if (attempt < RETRY_ATTEMPTS && retryDelayMs > 0) await Bun.sleep(retryDelayMs * attempt);
    }

    if (!response) throw lastError instanceof Error ? lastError : new Error(`Request failed for ${url}`);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`Redirect without location for ${url}`);
      await response.body?.cancel();
      url = validateInspectableUrl(location, url.toString());
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);

    return { body: await readBoundedBody(response), headers: response.headers, finalUrl: url.toString() };
  }

  throw new Error(`Redirect limit exceeded (${MAX_REDIRECTS}) for ${input}`);
};

const endpointTotal = async (endpoint: string): Promise<IInventoryEndpoint> => {
  const { headers } = await fetchBoundedText(`${WORDPRESS_API_URL}${endpoint}?per_page=1&_fields=id`);
  const rawTotal = headers.get("x-wp-total");
  return { endpoint, total: rawTotal ? Number(rawTotal) : null };
};

const mapWithConcurrency = async <T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) => {
  const output: R[] = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      output.push(await task(item));
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
};

const inventory = async () => {
  resetRequestBudget();
  const index = await fetchBoundedText(`${CODROPS_BASE_URL}sitemap.html`);
  const sitemapUrls = parseSitemapLinks(index.body).slice(0, MAX_SITEMAP_FAMILIES);
  if (sitemapUrls.length === 0) throw new Error("No Codrops sitemap families discovered");
  const sitemapFamilies = await mapWithConcurrency(sitemapUrls, 3, async (url) => {
    validateInspectableUrl(url);
    const page = await fetchBoundedText(url);
    return { url, count: parseSitemapLocs(page.body).length };
  });
  const endpoints = await mapWithConcurrency(
    ["posts", "collective", "css_reference", "webzibition", "sketches", "news", "web_demo"],
    3,
    endpointTotal,
  );
  const categories = await fetchBoundedText(
    `${WORDPRESS_API_URL}categories?per_page=100&orderby=count&order=desc&_fields=id,name,slug,count,parent`,
  );

  return {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    source: CODROPS_BASE_URL,
    sitemap: {
      indexUrl: `${CODROPS_BASE_URL}sitemap.html`,
      total: sitemapFamilies.reduce((sum, item) => sum + item.count, 0),
      families: sitemapFamilies.sort((a, b) => a.url.localeCompare(b.url)),
    },
    wordpress: {
      apiUrl: WORDPRESS_API_URL,
      endpoints: endpoints.sort((a, b) => a.endpoint.localeCompare(b.endpoint)),
      categories: JSON.parse(categories.body),
    },
    limits: [
      "Metadata-only inventory; no article bodies or assets retained.",
      "Counts are dated observations and can differ across sitemap and API filters.",
      "Third-party demos and source repositories are not crawled recursively.",
    ],
  };
};

export const extractCanonical = (source: string, pageUrl: string) => {
  for (const match of source.matchAll(/<link\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[1]);
    const rel = attributes.get("rel")?.toLowerCase().split(/\s+/) ?? [];
    const href = attributes.get("href");
    if (!rel.includes("canonical") || !href) continue;
    try {
      return validateInspectableUrl(href, pageUrl).toString();
    } catch {
      return null;
    }
  }
  return null;
};

const inspect = async (url: string) => {
  resetRequestBudget();
  validateInspectableUrl(url);
  const page = await fetchBoundedText(url);
  const title = stripTags(page.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const canonical = extractCanonical(page.body, page.finalUrl);
  const links = extractAnchors(page.body)
    .map((anchor) => classifyLink(anchor, page.finalUrl))
    .filter((link) => link.kind !== "internal" && link.kind !== "invalid");
  const uniqueLinks = [...new Map(links.map((link) => [`${link.kind}:${link.href}`, link])).values()];

  return {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    requestedUrl: url,
    finalUrl: page.finalUrl,
    canonicalUrl: canonical,
    title,
    links: uniqueLinks,
    evidenceStatus: "metadata-checked",
    parser: "best-effort-html-metadata",
    limits: [
      "Link classification is heuristic and must be confirmed before reuse claims.",
      "No rendered interaction, source revision, license, or asset rights were verified by this command.",
      `Only Codrops/Tympanus and GitHub URLs are accepted; responses are capped at ${MAX_RESPONSE_BYTES} bytes.`,
    ],
  };
};

const usage = () => {
  console.log(`Usage:
  bun scripts/codrops.ts inventory
  bun scripts/codrops.ts inspect <codrops-or-github-url>`);
};

const main = async () => {
  const args = process.argv.slice(2);
  const command = args.shift();

  if (command === "inventory" && args.length === 0) {
    process.stdout.write(`${JSON.stringify(await inventory(), null, 2)}\n`);
    return;
  }

  if (command === "inspect" && args.length === 1) {
    process.stdout.write(`${JSON.stringify(await inspect(args[0]), null, 2)}\n`);
    return;
  }

  usage();
  process.exitCode = 1;
};

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
