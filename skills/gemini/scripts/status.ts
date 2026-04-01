#!/usr/bin/env bun
import { connectClient, createClient, request, TOPIC_CMD, TOPIC_RES, type TabInfo } from "./mqtt-rpc.js";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function main() {
  const client = createClient("gemini-status");
  await connectClient(client);

  const ping = await request(client, "ping", {}, 5000);
  const tabsResponse = await request(client, "list_tabs", {}, 10000);
  client.end();

  console.log("\n🔮 Gemini Proxy Status\n");
  console.log("═".repeat(60));

  if (ping.success === false) {
    console.log("\n🔴 Extension: OFFLINE or not connected");
    console.log(`   Error: ${String(ping.error || "unknown error")}`);
    process.exit(1);
  }

  console.log("\n🟢 Extension: ONLINE");
  if (typeof ping.version === "string") {
    console.log(`   Version: ${ping.version}`);
  }
  if (typeof ping.timestamp === "number") {
    console.log(`   Last seen: ${formatTime(ping.timestamp)}`);
  }

  console.log("\n📑 Tabs:");
  const tabs = Array.isArray(tabsResponse.tabs) ? (tabsResponse.tabs as TabInfo[]) : [];
  if (tabs.length > 0) {
    for (const tab of tabs) {
      const active = tab.active ? "⭐" : "  ";
      const shortUrl = String(tab.url || "").replace("https://gemini.google.com", "");
      console.log(`   ${active} ${tab.id} │ ${String(tab.title || "").substring(0, 30)} │ ${shortUrl}`);
    }
    console.log(`\n   Total: ${tabs.length} tab(s)`);
  } else {
    console.log("   No Gemini tabs found");
  }

  console.log("\n📡 MQTT Topics:");
  console.log(`   Command:  ${TOPIC_CMD}`);
  console.log(`   Response: ${TOPIC_RES}`);
  console.log("   Status:   claude/browser/status");

  console.log("\n⚡ Quick Commands:");
  console.log('   bun "$SKILL_DIR/scripts/list-tabs.ts"');
  console.log('   bun "$SKILL_DIR/scripts/deep-research.ts" "q"');
  console.log('   bun "$SKILL_DIR/scripts/send-chat.ts" "msg"');

  console.log("\n" + "═".repeat(60));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
