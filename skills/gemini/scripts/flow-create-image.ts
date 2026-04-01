#!/usr/bin/env bun
import { connectClient, createClient } from "./mqtt-rpc.js";
import { getFlagValue, resolveFlowTabId, runStep } from "./flow-utils.js";

type AspectRatio = "portrait" | "landscape";
type Outputs = "x1" | "x2" | "x3" | "x4";


function usage(): never {
  console.error('Usage: bun "$SKILL_DIR/scripts/flow-create-image.ts" "prompt" [--project <id>] [--ratio portrait|landscape] [--outputs x1|x2|x3|x4]');
  process.exit(1);
}

function parseOutputs(raw: string | undefined): number {
  const mapping: Record<Outputs, number> = { x1: 1, x2: 2, x3: 3, x4: 4 };
  const key = (raw || "x1") as Outputs;
  return mapping[key] || 1;
}

function parseRatio(raw: string | undefined): AspectRatio {
  return raw === "landscape" ? "landscape" : "portrait";
}

async function runOptionalStep(
  client: ReturnType<typeof createClient>,
  action: string,
  params: Record<string, unknown>,
  timeoutMs = 12000,
): Promise<void> {
  try {
    await runStep(client, action, params, timeoutMs);
  } catch (error) {
    console.warn(`Optional step skipped: ${action} (${String(error instanceof Error ? error.message : error)})`);
  }
}


async function main() {
  const args = process.argv.slice(2);
  const projectId = getFlagValue(args, "--project");
  const ratio = parseRatio(getFlagValue(args, "--ratio"));
  const outputs = parseOutputs(getFlagValue(args, "--outputs"));

  const flagsWithValue = new Set(["--project", "--ratio", "--outputs"]);
  const promptParts: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (flagsWithValue.has(arg)) i += 1;
      continue;
    }
    promptParts.push(arg);
  }
  const prompt = promptParts.join(" ").trim();
  if (!prompt) usage();

  const client = createClient("flow-create-image");
  await connectClient(client);

  try {
    const tabId = await resolveFlowTabId(client, projectId);
    console.log(`Using Flow tab: ${tabId}`);

    await runOptionalStep(client, "flow_select_image_tab", { tabId, projectId }, 12000);
    await Bun.sleep(250);

    await runOptionalStep(client, "flow_set_aspect_ratio", { tabId, projectId, ratio }, 12000);
    await Bun.sleep(200);

    await runOptionalStep(client, "flow_set_multiplier", { tabId, projectId, multiplier: `x${outputs}` }, 12000);
    await Bun.sleep(200);

    await runStep(client, "flow_type_prompt", { tabId, projectId, text: prompt }, 12000);
    await Bun.sleep(200);

    const generated = await runStep(client, "flow_generate_image", { tabId, projectId }, 20000);
    const errorCode = typeof generated.errorCode === "string" ? generated.errorCode : "";
    if (errorCode === "flow_prompt_required") {
      throw new Error("flow_generate_image rejected prompt: Prompt must be provided");
    }
    const detection = typeof generated.detection === "string" ? generated.detection : "unknown";
    console.log(`Image generation started in Flow (detection: ${detection})`);
  } finally {
    client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
