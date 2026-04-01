#!/usr/bin/env bun
import { connectClient, createClient } from "./mqtt-rpc.js";
import { getFlagValue, resolveFlowTabId, runStep } from "./flow-utils.js";

type Model = "veo31-fast" | "veo31-quality" | "veo2-fast" | "veo2-quality";
type Multiplier = "x1" | "x2" | "x3" | "x4";
type AspectRatio = "landscape" | "portrait";
type Mode = "ingredients" | "frames";


function isModel(value: string): value is Model {
  return ["veo31-fast", "veo31-quality", "veo2-fast", "veo2-quality"].includes(value);
}

function isMultiplier(value: string): value is Multiplier {
  return ["x1", "x2", "x3", "x4"].includes(value);
}

function isAspectRatio(value: string): value is AspectRatio {
  return ["landscape", "portrait"].includes(value);
}

function isMode(value: string): value is Mode {
  return ["ingredients", "frames"].includes(value);
}

async function runStepWithLabel(
  client: ReturnType<typeof createClient>,
  label: string,
  action: string,
  params: Record<string, unknown>,
  timeoutMs = 10000,
): Promise<Record<string, unknown>> {
  console.log(label);
  return runStep(client, action, params, timeoutMs);
}

function usage(): never {

  console.log(`
Usage: bun "$SKILL_DIR/scripts/create-video-test.ts" "prompt" [options]

Options:
  --project <id>
  --asset <id>
  --asset-index <n>
  --asset-exact-id <id>
  --model <veo31-fast|veo31-quality|veo2-fast|veo2-quality>
  --multiplier <x1|x2|x3|x4>
  --ratio <portrait|landscape>
  --mode <ingredients|frames>
`);
  process.exit(1);
}


async function main() {
  const args = process.argv.slice(2);

  const modelRaw = getFlagValue(args, "--model") || "veo31-fast";
  const multiplierRaw = getFlagValue(args, "--multiplier") || "x1";
  const ratioRaw = getFlagValue(args, "--ratio") || "portrait";
  const modeRaw = getFlagValue(args, "--mode") || "ingredients";
  const assetId = getFlagValue(args, "--asset");
  const assetExactId = getFlagValue(args, "--asset-exact-id");
  const assetIndexRaw = getFlagValue(args, "--asset-index");
  const assetIndex = assetIndexRaw !== undefined ? Number.parseInt(assetIndexRaw, 10) : undefined;
  if (assetIndexRaw !== undefined && !Number.isInteger(assetIndex)) usage();
  const projectId = getFlagValue(args, "--project");

  if (!isModel(modelRaw) || !isMultiplier(multiplierRaw) || !isAspectRatio(ratioRaw) || !isMode(modeRaw)) {
    usage();
  }

  const flagsWithValue = new Set(["--model", "--multiplier", "--ratio", "--mode", "--asset", "--asset-index", "--asset-exact-id", "--project"]);
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

  const client = createClient("flow-video-test");
  await connectClient(client);

  try {
    const tabId = await resolveFlowTabId(client, projectId);
    console.log(`Using Flow tab: ${tabId}`);

    await runStepWithLabel(client, "1/8 select video tab", "flow_select_video_tab", { tabId, projectId });
    await Bun.sleep(250);

    await runStepWithLabel(
      client,
      `2/8 select ${modeRaw} mode`,
      modeRaw === "ingredients" ? "flow_select_ingredients_mode" : "flow_select_frames_mode",
      { tabId, projectId },
    );
    await Bun.sleep(250);

    if (assetId) {
      await runStepWithLabel(
        client,
        "3/8 select asset",
        "flow_select_asset",
        { tabId, projectId, assetId, assetIndex, assetExactId },
        12000,
      );
      await Bun.sleep(250);
    } else {
      console.log("3/8 skip asset (not provided)");
    }

    await runStepWithLabel(client, `4/8 set model ${modelRaw}`, "flow_set_model", { tabId, projectId, model: modelRaw });
    await Bun.sleep(200);

    await runStepWithLabel(
      client,
      `5/8 set multiplier ${multiplierRaw}`,
      "flow_set_multiplier",
      { tabId, projectId, multiplier: multiplierRaw },
    );
    await Bun.sleep(200);

    await runStepWithLabel(client, `6/8 set ratio ${ratioRaw}`, "flow_set_aspect_ratio", { tabId, projectId, ratio: ratioRaw });
    await Bun.sleep(200);

    await runStepWithLabel(client, "7/8 type prompt", "flow_type_prompt", { tabId, projectId, text: prompt });
    await Bun.sleep(200);

    await runStepWithLabel(client, "8/8 generate video", "flow_generate_video", { tabId, projectId }, 15000);
    console.log("Done: video generation started");
  } finally {
    client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
