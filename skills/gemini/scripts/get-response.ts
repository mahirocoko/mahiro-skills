#!/usr/bin/env bun
import { connectClient, createClient, request } from "./mqtt-rpc.js";

const rawTabId = process.argv[2];
const parsedTabId = rawTabId ? Number.parseInt(rawTabId, 10) : undefined;
const tabId = Number.isFinite(parsedTabId) ? parsedTabId : undefined;

if (rawTabId && tabId === undefined) {
  console.error('Usage: bun "$SKILL_DIR/scripts/get-response.ts" [tabId]');
  process.exit(1);
}

async function main() {
  const client = createClient("gemini-get-response");
  await connectClient(client);

  let selectedTabId = tabId;
  if (selectedTabId === undefined) {
    const geminiTabs = await request(client, "list_tabs", {}, 10000);
    const geminiList = Array.isArray(geminiTabs.tabs) ? geminiTabs.tabs : [];
    const firstGemini = geminiList.find((item) => {
      const id = typeof item === "object" && item !== null ? (item as { id?: unknown }).id : undefined;
      return typeof id === "number";
    }) as { id: number } | undefined;

    if (firstGemini?.id) {
      selectedTabId = firstGemini.id;
    } else {
      const flowTabs = await request(client, "list_flow_tabs", {}, 10000);
      const flowList = Array.isArray(flowTabs.tabs) ? flowTabs.tabs : [];
      const firstFlow = flowList.find((item) => {
        const id = typeof item === "object" && item !== null ? (item as { id?: unknown }).id : undefined;
        return typeof id === "number";
      }) as { id: number } | undefined;
      if (firstFlow?.id) {
        selectedTabId = firstFlow.id;
      }
    }
  }

  if (selectedTabId === undefined) {
    client.end();
    console.error("Error: No Gemini or Flow tab found");
    process.exit(1);
  }

  const data = await request(
    client,
    "get_text",
    { tabId: selectedTabId },
    10000,
  );
  client.end();

  if (data.success === false) {
    console.error("Error:", String(data.error || "unknown error"));
    process.exit(1);
  }

  if (typeof data.text === "string") {
    console.log(data.text);
    return;
  }

  console.error("No response text returned");
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
