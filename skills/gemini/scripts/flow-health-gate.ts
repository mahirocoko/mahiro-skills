#!/usr/bin/env bun
import { connectClient, createClient, request } from "./mqtt-rpc.js";
import { getFlagValue, resolveFlowTabId } from "./flow-utils.js";

type Config = {
  projectId?: string;
  prompt: string;
  requireDetection: string;
  domSelector: string;
  composerSelector: string;
  policyAlertSelector: string;
  dryRun: boolean;
};


function parseConfig(argv: string[]): Config {
  const args = argv.slice(2);
  const projectId = getFlagValue(args, "--project");
  const prompt = String(getFlagValue(args, "--prompt") || "health gate smoke run").trim();
  const requireDetection = String(getFlagValue(args, "--require-detection") || "generating_text").trim();
  const domSelector = String(
    getFlagValue(args, "--dom-selector")
      || '[data-testid="virtuoso-item-list"] [data-index], [data-testid="virtuoso-item-list"] [data-asset-id]',
  ).trim();
  const composerSelector = String(
    getFlagValue(args, "--composer-selector")
      || '[role="textbox"][data-slate-editor="true"], [role="textbox"][contenteditable="true"]',
  ).trim();
  const policyAlertSelector = String(
    getFlagValue(args, "--policy-alert-selector")
      || '[role="alert"], [aria-live="assertive"], [aria-live="polite"]',
  ).trim();
  const dryRun = args.includes("--dry-run");

  if (!prompt) {
    throw new Error("--prompt must not be empty");
  }
  if (!requireDetection) {
    throw new Error("--require-detection must not be empty");
  }
  if (!domSelector) {
    throw new Error("--dom-selector must not be empty");
  }
  if (!composerSelector) {
    throw new Error("--composer-selector must not be empty");
  }
  if (!policyAlertSelector) {
    throw new Error("--policy-alert-selector must not be empty");
  }

  return {
    projectId,
    prompt,
    requireDetection,
    domSelector,
    composerSelector,
    policyAlertSelector,
    dryRun,
  };
}

type StepResult = Record<string, unknown>;

type DomNode = {
  text?: string;
  outerHTML?: string;
};

async function runStep(
  client: ReturnType<typeof createClient>,
  action: string,
  params: Record<string, unknown>,
  timeoutMs: number,
): Promise<StepResult> {
  return request(client, action, params, timeoutMs);
}

function summarizeDomProbe(result: StepResult): {
  success: boolean;
  returnedCount: number;
  sampleText: string | null;
  sampleHtml: string | null;
} {
  const nodes = Array.isArray(result.nodes) ? (result.nodes as DomNode[]) : [];
  const first = nodes[0] || {};
  const rawText = String(first.text || "").replace(/\s+/g, " ").trim();
  const rawHtml = String(first.outerHTML || "").replace(/\s+/g, " ").trim();
  return {
    success: result.success !== false,
    returnedCount: Number(result.returnedCount || 0),
    sampleText: rawText ? rawText.slice(0, 180) : null,
    sampleHtml: rawHtml ? rawHtml.slice(0, 300) : null,
  };
}

function detectPolicyAlert(result: StepResult): {
  hasPolicyAlert: boolean;
  matchedPhrases: string[];
  sampleAlertText: string | null;
} {
  const nodes = Array.isArray(result.nodes) ? (result.nodes as DomNode[]) : [];
  const texts = nodes
    .map((n) => String(n.text || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const joined = texts.join(" || ").toLowerCase();
  const phrases = [
    "might violate our policies",
    "harmful content",
    "failed this prompt",
    "please try a different prompt",
  ];
  const matchedPhrases = phrases.filter((p) => joined.includes(p));
  return {
    hasPolicyAlert: matchedPhrases.length > 0,
    matchedPhrases,
    sampleAlertText: texts[0] ? texts[0].slice(0, 220) : null,
  };
}

async function main() {
  const config = parseConfig(process.argv);

  if (config.dryRun) {
    console.log(JSON.stringify({
      success: true,
      dryRun: true,
      plan: [
        "get_dom (preflight)",
        "get_dom (composer preflight)",
        "get_dom (policy alert preflight)",
        "flow_select_video_tab",
        "flow_select_ingredients_mode",
        "flow_select_latest_image_ingredient",
        "flow_type_prompt",
        "flow_generate_video",
      ],
      projectId: config.projectId || null,
      prompt: config.prompt,
      requireDetection: config.requireDetection,
      domSelector: config.domSelector,
      composerSelector: config.composerSelector,
      policyAlertSelector: config.policyAlertSelector,
    }, null, 2));
    return;
  }

  const client = createClient("flow-health-gate");
  await connectClient(client);

  try {
    const tabId = await resolveFlowTabId(client, config.projectId);
    const base = { tabId, projectId: config.projectId };

    const domPreflightRaw = await runStep(
      client,
      "get_dom",
      {
        ...base,
        selector: config.domSelector,
        maxNodes: 5,
        includeHidden: false,
        includeHtml: true,
        maxTextLength: 240,
        maxHtmlLength: 800,
      },
      20000,
    );
    const domPreflight = summarizeDomProbe(domPreflightRaw);

    const composerPreflightRaw = await runStep(
      client,
      "get_dom",
      {
        ...base,
        selector: config.composerSelector,
        maxNodes: 3,
        includeHidden: false,
        includeHtml: true,
        maxTextLength: 180,
        maxHtmlLength: 600,
      },
      20000,
    );
    const composerPreflight = summarizeDomProbe(composerPreflightRaw);

    const policyAlertPreflightRaw = await runStep(
      client,
      "get_dom",
      {
        ...base,
        selector: config.policyAlertSelector,
        maxNodes: 8,
        includeHidden: false,
        includeHtml: false,
        maxTextLength: 300,
      },
      20000,
    );
    const policyAlert = detectPolicyAlert(policyAlertPreflightRaw);

    const selectVideoTab = await runStep(client, "flow_select_video_tab", base, 20000);
    const selectIngredientsMode = await runStep(client, "flow_select_ingredients_mode", base, 20000);
    let selectLatestImageIngredient = await runStep(client, "flow_select_latest_image_ingredient", base, 20000);
    let typePrompt = await runStep(
      client,
      "flow_type_prompt",
      { ...base, text: config.prompt, clearBeforeType: true },
      20000,
    );

    const recovery = {
      attempted: false,
      promptAttempts: [typePrompt] as StepResult[],
      reseatIngredientsModeAttempts: [] as StepResult[],
      reseatVideoTabAttempts: [] as StepResult[],
      latestIngredientAttempts: [selectLatestImageIngredient] as StepResult[],
    };

    if (selectLatestImageIngredient.success === false || typePrompt.success === false) {
      recovery.attempted = true;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (selectLatestImageIngredient.success === false) {
          const reseatIngredientsMode = await runStep(client, "flow_select_ingredients_mode", base, 20000);
          recovery.reseatIngredientsModeAttempts.push(reseatIngredientsMode);
          const latestIngredientRetry = await runStep(client, "flow_select_latest_image_ingredient", base, 20000);
          recovery.latestIngredientAttempts.push(latestIngredientRetry);
          if (latestIngredientRetry.success !== false) {
            selectLatestImageIngredient = latestIngredientRetry;
          }
        }

        if (typePrompt.success !== false) break;

        const reseatVideoTab = await runStep(client, "flow_select_video_tab", base, 20000);
        recovery.reseatVideoTabAttempts.push(reseatVideoTab);
        const reseatIngredientsMode = await runStep(client, "flow_select_ingredients_mode", base, 20000);
        recovery.reseatIngredientsModeAttempts.push(reseatIngredientsMode);

        const retryTypePrompt = await runStep(
          client,
          "flow_type_prompt",
          { ...base, text: config.prompt, clearBeforeType: true },
          20000,
        );
        recovery.promptAttempts.push(retryTypePrompt);
        if (retryTypePrompt.success !== false) {
          typePrompt = retryTypePrompt;
          break;
        }
      }
    }

    const generateVideo = await runStep(client, "flow_generate_video", base, 30000);

    const detection = String(generateVideo.detection || generateVideo.lastDetection || "").trim();
    const required = config.requireDetection;
    const generationGatePassed = generateVideo.success !== false && detection === required;
    const success =
      domPreflight.success
      && domPreflight.returnedCount > 0
      && composerPreflight.success
      && composerPreflight.returnedCount > 0
      && policyAlert.hasPolicyAlert === false
      && selectVideoTab.success !== false
      && selectIngredientsMode.success !== false
      && selectLatestImageIngredient.success !== false
      && typePrompt.success !== false
      && generationGatePassed;

    const result = {
      success,
      generationGatePassed,
      requiredDetection: required,
      observedDetection: detection || null,
      tabId,
      projectId: config.projectId || null,
      domPreflight,
      composerPreflight,
      policyAlert,
      steps: {
        domPreflightRaw,
        composerPreflightRaw,
        policyAlertPreflightRaw,
        selectVideoTab,
        selectIngredientsMode,
        selectLatestImageIngredient,
        typePrompt,
        recovery,
        generateVideo,
      },
    };

    console.log(JSON.stringify(result, null, 2));
    if (!success) process.exit(1);
  } finally {
    client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
