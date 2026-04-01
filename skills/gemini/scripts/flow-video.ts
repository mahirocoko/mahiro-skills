#!/usr/bin/env bun
import { connectClient, createClient } from "./mqtt-rpc.js";
import { getFlagValue, resolveFlowTabId, runStep } from "./flow-utils.js";

type Model = "veo31-fast" | "veo31-quality" | "veo2-fast" | "veo2-quality";
type Multiplier = "x1" | "x2" | "x3" | "x4";
type AspectRatio = "landscape" | "portrait";
type Mode = "ingredients" | "frames";

type Config = {
  prompt: string;
  projectId?: string;
  assetId?: string;
  assetIndex?: number;
  assetExactId?: string;
  model: Model;
  multiplier: Multiplier;
  ratio: AspectRatio;
  mode: Mode;
  dryRun: boolean;
};

const DEFAULTS = {
  model: "veo31-fast" as Model,
  multiplier: "x1" as Multiplier,
  ratio: "portrait" as AspectRatio,
  mode: "ingredients" as Mode,
};

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

function usage(): never {
  console.error(`
Usage: bun "$SKILL_DIR/scripts/flow-video.ts" "your video prompt" [options]

Options:
  --project <id>      Flow project ID (optional)
  --asset <id>        Asset ID to use in ingredients mode (optional)
  --asset-index <n>   Deterministic fallback index for ambiguous asset matches (optional)
  --asset-exact-id <id>  Deterministic fallback exact data-asset-id (optional)
  --model <model>     veo31-fast (default), veo31-quality, veo2-fast, veo2-quality
  --multiplier <n>    x1 (default), x2, x3, x4
  --ratio <ratio>     portrait (default), landscape
  --mode <mode>       ingredients (default), frames
  --dry-run           Show steps without executing
`);
  process.exit(1);
}

function parseConfig(argv: string[]): Config {
  const args = argv.slice(2);
  const modelRaw = getFlagValue(args, "--model") || DEFAULTS.model;
  const multiplierRaw = getFlagValue(args, "--multiplier") || DEFAULTS.multiplier;
  const ratioRaw = getFlagValue(args, "--ratio") || DEFAULTS.ratio;
  const modeRaw = getFlagValue(args, "--mode") || DEFAULTS.mode;

  if (!isModel(modelRaw) || !isMultiplier(multiplierRaw) || !isAspectRatio(ratioRaw) || !isMode(modeRaw)) {
    usage();
  }

  const projectId = getFlagValue(args, "--project");
  const assetId = getFlagValue(args, "--asset");
  const assetExactId = getFlagValue(args, "--asset-exact-id");
  const assetIndexRaw = getFlagValue(args, "--asset-index");
  const assetIndex = assetIndexRaw !== undefined ? Number.parseInt(assetIndexRaw, 10) : undefined;
  if (assetIndexRaw !== undefined && !Number.isInteger(assetIndex)) usage();
  const dryRun = args.includes("--dry-run");

  const flagsWithValue = new Set(["--project", "--asset", "--asset-index", "--asset-exact-id", "--model", "--multiplier", "--ratio", "--mode"]);
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

  return {
    prompt,
    projectId,
    assetId,
    assetIndex,
    assetExactId,
    model: modelRaw,
    multiplier: multiplierRaw,
    ratio: ratioRaw,
    mode: modeRaw,
    dryRun,
  };
}


async function generateVideo(config: Config): Promise<void> {
  if (config.dryRun) {
    console.log("DRY RUN");
    console.log(`- mode: ${config.mode}`);
    console.log(`- prompt: ${config.prompt}`);
    console.log(`- project: ${config.projectId || "(auto)"}`);
    console.log(`- asset: ${config.assetId || "(none)"}`);
    console.log(`- asset-index: ${config.assetIndex ?? "(none)"}`);
    console.log(`- asset-exact-id: ${config.assetExactId || "(none)"}`);
    console.log(`- model: ${config.model}`);
    console.log(`- multiplier: ${config.multiplier}`);
    console.log(`- ratio: ${config.ratio}`);
    return;
  }

  const client = createClient("flow-video");
  await connectClient(client);

  try {
    const tabId = await resolveFlowTabId(client, config.projectId);

    console.log(`Using Flow tab: ${tabId}`);
    await runStep(client, "flow_select_video_tab", { tabId, projectId: config.projectId }, 10000);
    await Bun.sleep(250);

    await runStep(
      client,
      config.mode === "ingredients" ? "flow_select_ingredients_mode" : "flow_select_frames_mode",
      { tabId, projectId: config.projectId },
      10000,
    );
    await Bun.sleep(250);

    if (config.assetId) {
      await runStep(
        client,
        "flow_select_asset",
        {
          tabId,
          projectId: config.projectId,
          assetId: config.assetId,
          assetIndex: config.assetIndex,
          assetExactId: config.assetExactId,
        },
        12000,
      );
      await Bun.sleep(250);
    }

    await runStep(client, "flow_set_model", { tabId, projectId: config.projectId, model: config.model }, 10000);
    await Bun.sleep(200);

    await runStep(
      client,
      "flow_set_multiplier",
      { tabId, projectId: config.projectId, multiplier: config.multiplier },
      10000,
    );
    await Bun.sleep(200);

    await runStep(client, "flow_set_aspect_ratio", { tabId, projectId: config.projectId, ratio: config.ratio }, 10000);
    await Bun.sleep(200);

    await runStep(client, "flow_type_prompt", { tabId, projectId: config.projectId, text: config.prompt }, 10000);
    await Bun.sleep(200);

    await runStep(client, "flow_generate_video", { tabId, projectId: config.projectId }, 15000);
    console.log("Video generation started successfully");
  } finally {
    client.end();
  }
}

async function main() {
  const config = parseConfig(process.argv);
  await generateVideo(config);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
