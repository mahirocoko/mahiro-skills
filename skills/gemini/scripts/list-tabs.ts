#!/usr/bin/env bun
import { connectClient, createClient, request, type TabInfo } from "./mqtt-rpc.js";

async function listTabs(): Promise<TabInfo[]> {
  const client = createClient("gemini-list-tabs");
  await connectClient(client);

  const response = await request(client, "list_tabs", {}, 10000);
  client.end();

  if (response.success === false) {
    console.error("❌ list_tabs failed:", String(response.error || "unknown error"));
    return [];
  }

  return Array.isArray(response.tabs) ? (response.tabs as TabInfo[]) : [];
}

const tabs = await listTabs();

if (tabs.length === 0) {
  console.log("No Gemini tabs found");
  process.exit(1);
}

console.log(`\n🔮 Gemini Tabs (${tabs.length}):\n`);
console.log("┌─────────────┬────────────────────────────────────────────────┐");
console.log("│ Tab ID      │ Title / URL                                    │");
console.log("├─────────────┼────────────────────────────────────────────────┤");

for (const tab of tabs) {
  const id = String(tab.id).padEnd(11);
  const title = String(tab.title || "").substring(0, 46).padEnd(46);
  const active = tab.active ? " ⭐" : "";
  console.log(`│ ${id} │ ${title}${active} │`);
}

console.log("└─────────────┴────────────────────────────────────────────────┘");

// Output as JSON if --json flag
if (Bun.argv.includes("--json")) {
  console.log("\n" + JSON.stringify(tabs, null, 2));
}
