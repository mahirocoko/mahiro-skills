#!/usr/bin/env bun
import { connectClient, createClient, request } from "./mqtt-rpc.js";
import { getFlagValue } from "./flow-utils.js";

async function main() {
  const args = process.argv.slice(2);
  const command = getFlagValue(args, "--command");
  if (!command) {
  console.error('Usage: bun "$SKILL_DIR/scripts/test-flow-commands.ts" --command <flow_action>');
    process.exit(1);
  }

  const params: Record<string, unknown> = {};
  for (const key of ["model", "text", "prompt", "assetId", "assetIndex", "assetExactId", "referenceAssetId", "multiplier", "ratio", "projectId", "tabId", "slot", "clearBeforeType", "selector", "maxNodes", "maxChars", "maxTextLength", "maxHtmlLength", "includeHidden", "includeHtml"]) {
    const value = getFlagValue(args, `--${key}`);
    if (value !== undefined) {
      if (key === "tabId") {
        params[key] = Number.parseInt(value, 10);
      } else if (key === "assetIndex" || key === "maxNodes" || key === "maxChars" || key === "maxTextLength" || key === "maxHtmlLength") {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed)) {
          throw new Error(`${key} must be an integer`);
        }
        params[key] = parsed;
      } else if (key === "clearBeforeType" || key === "includeHidden" || key === "includeHtml") {
        const raw = String(value).toLowerCase().trim();
        params[key] = raw === "1" || raw === "true" || raw === "yes";
      } else {
        params[key] = value;
      }
    }
  }

  const client = createClient("flow-command-test");
  await connectClient(client);

  try {
    if (command === "flow_submit_prompt") {
      console.warn("[legacy] flow_submit_prompt is legacy for image tasks. Prefer flow_type_prompt + flow_generate_image.");
    }

    if (command === "flow_create_image_canonical") {
      const text = String(params.text || params.prompt || "").trim();
      if (!text) {
        throw new Error("flow_create_image_canonical requires --text (or --prompt)");
      }

      const base = {
        tabId: params.tabId,
        projectId: params.projectId,
      };

      const selectImageTab = await request(client, "flow_select_image_tab", base, 20000);
      const typePrompt = await request(client, "flow_type_prompt", { ...base, text }, 20000);
      const generateImage = await request(client, "flow_generate_image", base, 30000);

      const result = {
        success: selectImageTab.success !== false && typePrompt.success !== false && generateImage.success !== false,
        canonicalPath: ["flow_select_image_tab", "flow_type_prompt", "flow_generate_image"],
        steps: { selectImageTab, typePrompt, generateImage },
      };

      console.log(JSON.stringify(result, null, 2));
      if (result.success === false) process.exit(1);
      return;
    }

    if (command === "flow_create_video_from_latest_image_canonical") {
      const text = String(params.text || params.prompt || "").trim();
      if (!text) {
        throw new Error("flow_create_video_from_latest_image_canonical requires --text (or --prompt)");
      }

      const base = {
        tabId: params.tabId,
        projectId: params.projectId,
      };

      const selectVideoTab = await request(client, "flow_select_video_tab", base, 20000);
      const selectIngredientsMode = await request(client, "flow_select_ingredients_mode", base, 20000);

      let setModel: Record<string, unknown> = { success: true, skipped: true };
      if (params.model) {
        setModel = await request(client, "flow_set_model", { ...base, model: params.model }, 20000);
      }

      let setMultiplier: Record<string, unknown> = { success: true, skipped: true };
      if (params.multiplier) {
        setMultiplier = await request(client, "flow_set_multiplier", { ...base, multiplier: params.multiplier }, 20000);
      }

      let setAspectRatio: Record<string, unknown> = { success: true, skipped: true };
      if (params.ratio) {
        setAspectRatio = await request(client, "flow_set_aspect_ratio", { ...base, ratio: params.ratio }, 20000);
      }

      const selectLatestImageIngredient = await request(client, "flow_select_latest_image_ingredient", base, 20000);
      const typePrompt = await request(client, "flow_type_prompt", { ...base, text }, 20000);
      const generateVideo = await request(client, "flow_generate_video", base, 30000);

      const requiredOk =
        selectLatestImageIngredient.success !== false
        && typePrompt.success !== false
        && generateVideo.success !== false;

      const result = {
        success: requiredOk,
        canonicalPath: [
          "flow_select_video_tab",
          "flow_select_ingredients_mode",
          "flow_select_latest_image_ingredient",
          "flow_type_prompt",
          "flow_generate_video",
        ],
        notes: {
          selectVideoTab: selectVideoTab.success === false ? "optional step failed; continuing with active Flow context" : "ok",
          selectIngredientsMode: selectIngredientsMode.success === false ? "optional step failed; continuing with active Flow context" : "ok",
          setModel: setModel.success === false ? "optional step failed" : "ok_or_skipped",
          setMultiplier: setMultiplier.success === false ? "optional step failed" : "ok_or_skipped",
          setAspectRatio: setAspectRatio.success === false ? "optional step failed" : "ok_or_skipped",
        },
        steps: {
          selectVideoTab,
          selectIngredientsMode,
          setModel,
          setMultiplier,
          setAspectRatio,
          selectLatestImageIngredient,
          typePrompt,
          generateVideo,
        },
      };

      console.log(JSON.stringify(result, null, 2));
      if (result.success === false) process.exit(1);
      return;
    }

    if (command === "flow_create_video_with_asset_canonical") {
      const text = String(params.text || params.prompt || "").trim();
      if (!text) {
        throw new Error("flow_create_video_with_asset_canonical requires --text (or --prompt)");
      }

      const referenceAssetId = String(params.assetExactId || params.referenceAssetId || params.assetId || "").trim();
      if (!referenceAssetId) {
        throw new Error("flow_create_video_with_asset_canonical requires --assetExactId (or --referenceAssetId)");
      }
      const slot = String(params.slot || "").trim();
      const expectedExactId = referenceAssetId.toLowerCase();

      const base = {
        tabId: params.tabId,
        projectId: params.projectId,
      };

      const selectVideoTab = await request(client, "flow_select_video_tab", base, 20000);
      const selectIngredientsMode = await request(client, "flow_select_ingredients_mode", base, 20000);

      const selectAsset = await request(
        client,
        "flow_select_asset",
        {
          ...base,
          assetExactId: referenceAssetId,
          slot: slot || undefined,
        },
        30000,
      );

      const selectionProof =
        typeof selectAsset.selectionProof === "object" && selectAsset.selectionProof !== null
          ? (selectAsset.selectionProof as Record<string, unknown>)
          : null;
      const selectedCardIdentity =
        selectionProof && typeof selectionProof.selectedCardIdentity === "object" && selectionProof.selectedCardIdentity !== null
          ? (selectionProof.selectedCardIdentity as Record<string, unknown>)
          : null;
      const selectedMatchesRequestedExact = selectionProof?.selectedMatchesRequestedExact === true;
      const selectedAssetId = String(
        selectAsset.selectedAssetId
        || selectedCardIdentity?.assetId
        || "",
      )
        .trim()
        .toLowerCase();
      const exactIdVerified = selectedMatchesRequestedExact || selectedAssetId === expectedExactId;

      const slotAttachedAfter = selectAsset.slotAttachedAfter === true;
      const slotAttachedAssetIdAfter = String(selectAsset.slotAttachedAssetIdAfter || "")
        .trim()
        .toLowerCase();
      const slotVerified = slot
        ? (slotAttachedAfter && (!slotAttachedAssetIdAfter || slotAttachedAssetIdAfter === expectedExactId))
        : null;

      const attachVerified = selectAsset.success !== false && (slot ? slotVerified === true : exactIdVerified);
      const attachBlockReason = (() => {
        if (attachVerified) return null;
        if (selectAsset.success === false) return String(selectAsset.error || "flow_select_asset failed");
        if (slot && slotAttachedAfter !== true) return `slot '${slot}' did not attach`;
        if (slot && slotAttachedAssetIdAfter && slotAttachedAssetIdAfter !== expectedExactId) {
          return `slot '${slot}' attached '${slotAttachedAssetIdAfter}' instead of '${expectedExactId}'`;
        }
        if (!slot && !exactIdVerified) return "selected asset did not match requested exact ID";
        return "attachment verification failed";
      })();

      let setModel: Record<string, unknown> = { success: true, skipped: true };
      if (params.model) {
        setModel = await request(client, "flow_set_model", { ...base, model: params.model }, 20000);
      }

      let setMultiplier: Record<string, unknown> = { success: true, skipped: true };
      if (params.multiplier) {
        setMultiplier = await request(client, "flow_set_multiplier", { ...base, multiplier: params.multiplier }, 20000);
      }

      let setAspectRatio: Record<string, unknown> = { success: true, skipped: true };
      if (params.ratio) {
        setAspectRatio = await request(client, "flow_set_aspect_ratio", { ...base, ratio: params.ratio }, 20000);
      }

      const typePrompt = attachVerified
        ? await request(client, "flow_type_prompt", { ...base, text, clearBeforeType: true }, 20000)
        : { success: false, skipped: true, error: "blocked_by_attach_verification" };
      const generateVideo = attachVerified
        ? await request(client, "flow_generate_video", base, 30000)
        : { success: false, skipped: true, error: "blocked_by_attach_verification" };

      const requiredOk =
        attachVerified
        && typePrompt.success !== false
        && generateVideo.success !== false;

      const result = {
        success: requiredOk,
        canonicalPath: [
          "flow_select_video_tab",
          "flow_select_ingredients_mode",
          "flow_select_asset",
          "flow_type_prompt",
          "flow_generate_video",
        ],
        notes: {
          selectVideoTab: selectVideoTab.success === false ? "optional step failed; continuing with active Flow context" : "ok",
          selectIngredientsMode: selectIngredientsMode.success === false ? "optional step failed; continuing with active Flow context" : "ok",
          setModel: setModel.success === false ? "optional step failed" : "ok_or_skipped",
          setMultiplier: setMultiplier.success === false ? "optional step failed" : "ok_or_skipped",
          setAspectRatio: setAspectRatio.success === false ? "optional step failed" : "ok_or_skipped",
          attachVerification: attachVerified ? "ok" : `blocked: ${attachBlockReason}`,
        },
        referenceAssetId,
        attachVerification: {
          requestedSlot: slot || null,
          requestedExactId: expectedExactId,
          selectedMatchesRequestedExact,
          selectedAssetId: selectedAssetId || null,
          slotAttachedAfter: slot ? slotAttachedAfter : null,
          slotAttachedAssetIdAfter: slot ? (slotAttachedAssetIdAfter || null) : null,
          exactIdVerified,
          attachVerified,
          blockReason: attachBlockReason,
        },
        steps: {
          selectVideoTab,
          selectIngredientsMode,
          selectAsset,
          setModel,
          setMultiplier,
          setAspectRatio,
          typePrompt,
          generateVideo,
        },
      };

      console.log(JSON.stringify(result, null, 2));
      if (result.success === false) process.exit(1);
      return;
    }

    const result = await request(client, command, params, 20000);
    console.log(JSON.stringify(result, null, 2));
    if (result.success === false) process.exit(1);
  } finally {
    client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
