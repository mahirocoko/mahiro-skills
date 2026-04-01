#!/usr/bin/env bun
import { connectClient, createClient } from "./mqtt-rpc.js";
import { getFlagValue, resolveFlowTabId, runStep, runStepWithRetry } from "./flow-utils.js";

type Model = "veo31-fast" | "veo31-quality" | "veo2-fast" | "veo2-quality";
type Multiplier = "x1" | "x2" | "x3" | "x4";
type AspectRatio = "landscape" | "portrait";

type Config = {
  projectId?: string;
  startAsset: string;
  endAsset: string;
  prompt: string;
  startAssetIndex?: number;
  endAssetIndex?: number;
  startAssetExactId?: string;
  endAssetExactId?: string;
  model: Model;
  multiplier: Multiplier;
  ratio: AspectRatio;
};

const DEFAULTS = {
  model: "veo31-fast" as Model,
  multiplier: "x1" as Multiplier,
  ratio: "portrait" as AspectRatio,
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

function usage(): never {
  console.error(`
Usage: bun "$SKILL_DIR/scripts/flow-frames-shot.ts" --start-asset <name> --end-asset <name> --prompt <text> [options]

Required:
  --start-asset <name>          Asset name/id for start slot
  --end-asset <name>            Asset name/id for end slot
  --prompt <text>               Video prompt text

Optional:
  --project <id>                Flow project ID
  --start-asset-index <n>       Deterministic index fallback for start slot
  --end-asset-index <n>         Deterministic index fallback for end slot
  --start-asset-exact-id <id>   Deterministic exact ID fallback for start slot
  --end-asset-exact-id <id>     Deterministic exact ID fallback for end slot
  --model <model>               veo31-fast (default), veo31-quality, veo2-fast, veo2-quality
  --multiplier <n>              x1 (default), x2, x3, x4
  --ratio <ratio>               portrait (default), landscape
`);
  process.exit(1);
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) usage();
  return parsed;
}

function parseConfig(argv: string[]): Config {
  const args = argv.slice(2);
  const startAsset = getFlagValue(args, "--start-asset") || "";
  const endAsset = getFlagValue(args, "--end-asset") || "";
  const prompt = getFlagValue(args, "--prompt") || "";
  const projectId = getFlagValue(args, "--project");
  const startAssetIndex = parseOptionalInt(getFlagValue(args, "--start-asset-index"));
  const endAssetIndex = parseOptionalInt(getFlagValue(args, "--end-asset-index"));
  const startAssetExactId = getFlagValue(args, "--start-asset-exact-id");
  const endAssetExactId = getFlagValue(args, "--end-asset-exact-id");

  const modelRaw = getFlagValue(args, "--model") || DEFAULTS.model;
  const multiplierRaw = getFlagValue(args, "--multiplier") || DEFAULTS.multiplier;
  const ratioRaw = getFlagValue(args, "--ratio") || DEFAULTS.ratio;

  if (!startAsset || !endAsset || !prompt) usage();
  if (!isModel(modelRaw) || !isMultiplier(multiplierRaw) || !isAspectRatio(ratioRaw)) usage();

  return {
    projectId,
    startAsset,
    endAsset,
    prompt,
    startAssetIndex,
    endAssetIndex,
    startAssetExactId,
    endAssetExactId,
    model: modelRaw,
    multiplier: multiplierRaw,
    ratio: ratioRaw,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function settle(ms = 220) {
  await Bun.sleep(ms);
}

function assertSlotAttached(stepName: string, response: Record<string, unknown>) {
  if (response.slotAttachedAfter !== true) {
    throw new Error(`${stepName} failed strict verification: slotAttachedAfter is not true`);
  }
}

async function main() {
  const config = parseConfig(process.argv);
  const client = createClient("flow-frames-shot");
  await connectClient(client);

  try {
    const tabId = await resolveFlowTabId(client, config.projectId);

    const report: Record<string, unknown> = {
      success: false,
      tabId,
      projectId: config.projectId || null,
      steps: {},
    };

    let selectVideoTab: Record<string, unknown>;
    try {
      selectVideoTab = await runStepWithRetry(
        client,
        "flow_select_video_tab",
        { tabId, projectId: config.projectId },
        12000,
        2,
      ) as Record<string, unknown>;
    } catch (error) {
      selectVideoTab = {
        success: false,
        warning: "flow_select_video_tab failed, continuing to frames mode",
        error: toErrorMessage(error),
      };
    }
    await settle(220);
    const selectFramesMode = await runStepWithRetry(
      client,
      "flow_select_frames_mode",
      { tabId, projectId: config.projectId },
      12000,
      3,
    );
    await settle(260);
    const selectStartSlot = await runStepWithRetry(
      client,
      "flow_select_frame_slot",
      { tabId, projectId: config.projectId, slot: "start" },
      12000,
      3,
    );

    report.steps = {
      selectVideoTab,
      selectFramesMode,
      selectStartSlot,
    };
    await settle();

    const startAsset = await runStepWithRetry(
      client,
      "flow_select_asset",
      {
        tabId,
        projectId: config.projectId,
        slot: "start",
        assetId: config.startAsset,
        assetIndex: config.startAssetIndex,
        assetExactId: config.startAssetExactId,
      },
      15000,
      3,
    );
    assertSlotAttached("start asset attach", startAsset as Record<string, unknown>);
    await settle();

    const selectEndSlot = await runStepWithRetry(
      client,
      "flow_select_frame_slot",
      { tabId, projectId: config.projectId, slot: "end" },
      12000,
      3,
    );
    await settle();

    const endAsset = await runStepWithRetry(
      client,
      "flow_select_asset",
      {
        tabId,
        projectId: config.projectId,
        slot: "end",
        assetId: config.endAsset,
        assetIndex: config.endAssetIndex,
        assetExactId: config.endAssetExactId,
      },
      15000,
      3,
    );
    assertSlotAttached("end asset attach", endAsset as Record<string, unknown>);
    await settle();

    const setModel = await runStep(client, "flow_set_model", { tabId, projectId: config.projectId, model: config.model }, 12000);
    await settle(180);
    const setMultiplier = await runStep(
      client,
      "flow_set_multiplier",
      { tabId, projectId: config.projectId, multiplier: config.multiplier },
      12000,
    );
    await settle(180);
    const setAspectRatio = await runStep(
      client,
      "flow_set_aspect_ratio",
      { tabId, projectId: config.projectId, ratio: config.ratio },
      12000,
    );
    await settle(180);
    const typePrompt = await runStep(
      client,
      "flow_type_prompt",
      { tabId, projectId: config.projectId, text: config.prompt, clearBeforeType: true },
      12000,
    );
    await settle(180);
    const generateVideo = await runStep(client, "flow_generate_video", { tabId, projectId: config.projectId }, 20000);

    report.steps = {
      ...(report.steps as Record<string, unknown>),
      startAsset,
      selectEndSlot,
      endAsset,
      setModel,
      setMultiplier,
      setAspectRatio,
      typePrompt,
      generateVideo,
    };
    report.success = true;
    console.log(JSON.stringify(report, null, 2));
  } finally {
    client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
