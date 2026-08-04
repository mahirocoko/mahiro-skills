#!/usr/bin/env bun
import {
  connectClient,
  createClient,
  findGeminiAppTab,
  parseGeminiAccountIndex,
  request,
  resolveGeminiAccountIndex,
} from "./mqtt-rpc.js";
import { requireDeepResearchToolLabel } from "./deep-research-capability.ts";

const args = Bun.argv.slice(2);
const forceNew = args.includes("--new");
const accountArgIndex = args.findIndex((part) => part === "--account");
const accountIndex =
  parseGeminiAccountIndex(accountArgIndex >= 0 ? args[accountArgIndex + 1] : undefined) ??
  resolveGeminiAccountIndex();

const topic = args
  .filter((part, index) => {
    if (part === "--new" || part === "--account") return false;
    if (accountArgIndex >= 0 && index === accountArgIndex + 1) return false;
    return true;
  })
  .join(" ")
  .trim();

if (!topic) {
  console.error('Usage: bun "$SKILL_DIR/scripts/deep-research.ts" [--new] [--account <n>] <topic>');
  process.exit(1);
}

async function main() {
  console.log(`\n🔬 Deep Research: ${topic}\n`);

  const client = createClient("gemini-deep-research");
  await connectClient(client);

  let targetTabId: number | undefined;

  if (!forceNew) {
    const existing = await findGeminiAppTab(client, accountIndex);
    if (existing?.id) {
      const existingState = await request(client, "get_state", { tabId: existing.id }, 12000);
      const existingMode =
        typeof (existingState as { mode?: unknown }).mode === "string"
          ? ((existingState as { mode?: string }).mode as string).toLowerCase()
          : "";

      if (existingMode === "research") {
        targetTabId = existing.id;
        console.log(`1️⃣ Using existing Gemini research tab ${targetTabId}`);
      } else {
        console.log(`   ⚠️ Existing Gemini tab is not in research mode (${existingMode || "unknown"})`);
      }
    }
  }

  if (!targetTabId) {
    console.log("1️⃣ Creating new Gemini tab...");
    const created = await request(
      client,
      "create_tab",
      { accountIndex, mode: "research" },
      12000,
    );
    if (created.success === false || typeof created.tabId !== "number") {
      client.end();
      console.error(`❌ create_tab failed: ${String(created.error || "unknown error")}`);
      process.exit(1);
    }
    targetTabId = created.tabId;
    await Bun.sleep(1200);
    console.log(`   ✓ Tab created: ${targetTabId}`);
  }

  const researchRouteState = await request(client, "get_state", { tabId: targetTabId }, 12000);
  const confirmedRoute =
    typeof (researchRouteState as { mode?: unknown }).mode === "string"
      ? ((researchRouteState as { mode?: string }).mode as string).toLowerCase()
      : "";
  if (researchRouteState.success !== true || confirmedRoute !== "research") {
    client.end();
    console.error(
      `❌ The research route was not confirmed (${confirmedRoute || "unknown"}); refusing ordinary-chat fallback.`,
    );
    process.exit(1);
  }
  console.log("   ✓ Research route confirmed from exact-tab state");

  console.log("2️⃣ Selecting Deep Research tool...");
  const tools = await request(
    client,
    "list_tools",
    { tabId: targetTabId },
    12000,
  );

  let deepResearchToolLabel: string;
  try {
    deepResearchToolLabel = requireDeepResearchToolLabel(tools);
  } catch (error) {
    client.end();
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const selected = await request(
    client,
    "select_tool",
    { tabId: targetTabId, tool: deepResearchToolLabel },
    12000,
  );
  if (selected.success !== true) {
    client.end();
    console.error(`❌ select_tool failed: ${String(selected.error || "unknown error")}`);
    process.exit(1);
  }
  console.log(`   ✓ Deep Research tool selected: ${deepResearchToolLabel}`);

  console.log("3️⃣ Sending research prompt...");
  const chat = await request(
    client,
    "chat",
    { tabId: targetTabId, text: topic },
    15000,
  );
  client.end();

  if (chat.success === false) {
    console.error(`❌ chat failed: ${String(chat.error || "unknown error")}`);
    process.exit(1);
  }

  console.log(`   ✓ Prompt sent to tab ${targetTabId}`);
  console.log("\n🎉 Prompt sent after Deep Research capability selection. Check your Gemini tab.\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
