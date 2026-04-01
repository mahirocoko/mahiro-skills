#!/usr/bin/env bun
import { connectClient, createClient, request } from "./mqtt-rpc.js";

type DomNode = {
  id?: string | null;
  href?: string | null;
  outerHTML?: string | null;
  rect?: { x?: number; y?: number; width?: number; height?: number };
};

function parseFlag(args: string[], key: string): string | undefined {
  const idx = args.findIndex((a) => a === key);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function toNodes(value: unknown): DomNode[] {
  if (!value || typeof value !== "object") return [];
  const nodes = (value as { nodes?: unknown }).nodes;
  return Array.isArray(nodes) ? (nodes as DomNode[]) : [];
}

function extractUuid(text: string | null | undefined): string | null {
  const raw = String(text || "");
  const editMatch = raw.match(/\/edit\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (editMatch) return editMatch[1];
  const m = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function distance(a: DomNode, b: DomNode): number {
  const ax = num(a.rect?.x);
  const ay = num(a.rect?.y);
  const bx = num(b.rect?.x);
  const by = num(b.rect?.y);
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function extractSrcFromOuterHtml(outerHTML: string | null | undefined): string | null {
  const raw = String(outerHTML || "");
  const srcMatch = raw.match(/\s(?:src|data-src)="([^"]+)"/i);
  return srcMatch ? srcMatch[1] : null;
}

function extractNameParam(src: string | null | undefined): string | null {
  const raw = String(src || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw, "https://labs.google");
    const name = u.searchParams.get("name");
    return name ? decodeURIComponent(name) : null;
  } catch {
    const m = raw.match(/[?&]name=([^&#]+)/i);
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const tabIdFlag = parseFlag(args, "--tabId");
  const projectId = parseFlag(args, "--projectId");
  const maxNodesRaw = parseFlag(args, "--maxNodes");
  const maxNodes = Number.isInteger(Number.parseInt(String(maxNodesRaw || ""), 10))
    ? Number.parseInt(String(maxNodesRaw), 10)
    : 100;

  const client = createClient("flow-visible-item-map");
  await connectClient(client);

  try {
    let tabId = Number.isInteger(Number.parseInt(String(tabIdFlag || ""), 10))
      ? Number.parseInt(String(tabIdFlag), 10)
      : undefined;

    if (!tabId) {
      const tabs = await request(client, "list_flow_tabs", {}, 15000);
      const list = Array.isArray(tabs.tabs) ? (tabs.tabs as Array<{ id?: unknown; projectId?: unknown; active?: unknown }>) : [];
      const matchByProject = projectId
        ? list.find((t) => String(t.projectId || "") === projectId)
        : undefined;
      const active = list.find((t) => t.active === true);
      const fallback = list.find((t) => typeof t.id === "number");
      const picked = matchByProject || active || fallback;
      tabId = typeof picked?.id === "number" ? picked.id : undefined;
    }

    if (!tabId) {
      throw new Error("No Flow tab found. Pass --tabId or --projectId.");
    }

    const hrefRes = await request(
      client,
      "get_dom",
      {
        tabId,
        selector: "[data-testid=\"virtuoso-item-list\"] a[href*=\"/edit/\"]",
        maxNodes,
        includeHidden: true,
      },
      20000,
    );

    const idRes = await request(
      client,
      "get_dom",
      {
        tabId,
        selector: "[data-testid=\"virtuoso-item-list\"] [id^=\"fe_id_\"]",
        maxNodes,
        includeHidden: true,
      },
      20000,
    );

    const imgRes = await request(
      client,
      "get_dom",
      {
        tabId,
        selector: "[data-testid=\"virtuoso-item-list\"] img[src], [data-testid=\"virtuoso-item-list\"] img[data-src]",
        maxNodes,
        includeHidden: true,
        includeHtml: true,
        maxHtmlLength: 4000,
      },
      20000,
    );

    const hrefNodes = toNodes(hrefRes).filter((n) => typeof n.href === "string" && n.href.length > 0);
    const feNodes = toNodes(idRes).filter((n) => typeof n.id === "string" && String(n.id).startsWith("fe_id_"));
    const imgNodes = toNodes(imgRes);

    const mapped = hrefNodes.map((hrefNode, i) => {
      const editId = extractUuid(hrefNode.href || "");
      let nearest: DomNode | undefined;
      let best = Number.POSITIVE_INFINITY;
      for (const node of feNodes) {
        const d = distance(hrefNode, node);
        if (d < best) {
          best = d;
          nearest = node;
        }
      }
      const feId = nearest?.id || null;
      const feUuid = extractUuid(feId);
      let nearestImg: DomNode | undefined;
      let bestImg = Number.POSITIVE_INFINITY;
      for (const img of imgNodes) {
        const d = distance(hrefNode, img);
        if (d < bestImg) {
          bestImg = d;
          nearestImg = img;
        }
      }
      const src = extractSrcFromOuterHtml(nearestImg?.outerHTML || null);
      const nameParam = extractNameParam(src);
      const nameUuid = extractUuid(nameParam || null);
      return {
        index: i,
        editId,
        feId,
        feUuid,
        imgName: nameParam,
        imgNameUuid: nameUuid,
        imgNameMatchesEdit: Boolean(editId && nameUuid && editId.toLowerCase() === nameUuid.toLowerCase()),
        matched: Boolean(editId && feUuid && editId.toLowerCase() === feUuid.toLowerCase()),
        href: hrefNode.href || null,
      };
    });

    const exactMatches = mapped.filter((m) => m.matched).length;
    const imgNameMatches = mapped.filter((m) => m.imgNameMatchesEdit).length;
    console.log(JSON.stringify({ success: true, tabId, count: mapped.length, exactMatches, imgNameMatches, items: mapped }, null, 2));
  } finally {
    client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
