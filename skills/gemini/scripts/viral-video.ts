#!/usr/bin/env bun
import {
  connectClient,
  createClient,
  findGeminiAppTab,
  geminiAppUrl,
  parseGeminiAccountIndex,
  request,
  resolveGeminiAccountIndex,
} from "./mqtt-rpc.js";

type Mode = "direct" | "gem";
type ContentType = "viral" | "ad" | "story" | "howto";
type Framework = "auto" | "accidental-spokesperson" | "micro-drama" | "impossible-tutorial";

type Config = {
  concept: string;
  mode: Mode;
  type: ContentType;
  framework: Framework;
  language: string;
  durationSeconds: number;
  platform: string;
  tone: string;
  audience: string;
  count: number;
  send: boolean;
  forceNew: boolean;
  pretty: boolean;
  accountIndex?: number;
};

type PromptBundle = {
  schema_version: string;
  generated_at: string;
  mode: Mode;
  type: ContentType;
  framework: Framework;
  input: {
    concept: string;
    language: string;
    duration_seconds: number;
    platform: string;
    tone: string;
    audience: string;
    count: number;
  };
  system_instruction: string;
  user_prompt: string;
  output_schema: Record<string, unknown>;
};

const DEFAULTS = {
  mode: "direct" as Mode,
  type: "story" as ContentType,
  framework: "micro-drama" as Framework,
  language: "Thai",
  durationSeconds: 8,
  platform: "TikTok/Reels/Shorts",
  tone: "dialogue-first, emotionally engaging, Thai-natural, follow-worthy",
  audience: "Gen Z + millennial social users",
  count: 7,
  send: false,
  forceNew: false,
  pretty: false,
};

const OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          hook: { type: "string" },
          promise: { type: "string" },
          beats: { type: "array", items: { type: "string" } },
          shot_list: { type: "array", items: { type: "string" } },
          caption: { type: "string" },
          cta: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          why_it_works_hypothesis: { type: "string" },
          compliance_notes: { type: "array", items: { type: "string" } },
        },
        required: ["title", "hook", "promise", "beats", "caption", "cta", "hashtags"],
      },
    },
    production_pack: {
      type: "object",
      properties: {
        selected_title: { type: "string" },
        script_vo: { type: "array", items: { type: "string" } },
        on_screen_text: { type: "array", items: { type: "string" } },
        storyboard: {
          type: "array",
          items: {
            type: "object",
            properties: {
              t_start: { type: "number" },
              t_end: { type: "number" },
              shot: { type: "string" },
              action: { type: "string" },
              camera: { type: "string" },
              audio: { type: "string" },
            },
            required: ["t_start", "t_end", "shot", "action", "camera"],
          },
        },
        scene_prompts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              clip_id: { type: "string" },
              aspect_ratio: { type: "string" },
              image_prompt: { type: "string" },
              video_prompt: { type: "string" },
              spoken_dialogue: { type: "string" },
              audio_direction: { type: "string" },
            },
            required: ["clip_id", "aspect_ratio", "image_prompt", "video_prompt"],
          },
        },
        veo_clips: {
          type: "array",
          items: {
            type: "object",
            properties: {
              clip_id: { type: "string" },
              aspect_ratio: { type: "string" },
              veo_prompt: { type: "string" },
            },
            required: ["clip_id", "aspect_ratio", "veo_prompt"],
          },
        },
      },
      required: ["selected_title", "storyboard", "scene_prompts", "veo_clips"],
    },
  },
  required: ["concepts", "production_pack"],
};

function readFlagValue(parts: string[], key: string): string | undefined {
  const index = parts.findIndex((part) => part === key);
  if (index === -1 || index + 1 >= parts.length) return undefined;
  return parts[index + 1];
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isMode(value: string): value is Mode {
  return value === "direct" || value === "gem";
}

function isContentType(value: string): value is ContentType {
  return value === "viral" || value === "ad" || value === "story" || value === "howto";
}

function isFramework(value: string): value is Framework {
  return value === "auto" || value === "accidental-spokesperson" || value === "micro-drama" || value === "impossible-tutorial";
}

function usage(): never {
  console.error('Usage: bun "$SKILL_DIR/scripts/viral-video.ts" "fat cat host" [--mode direct|gem] [--type viral|ad|story|howto] [--framework auto|accidental-spokesperson|micro-drama|impossible-tutorial] [--lang Thai] [--duration 8] [--platform TikTok/Reels/Shorts] [--tone "funny"] [--audience "Gen Z"] [--count 7] [--account <n>] [--send] [--no-send] [--new] [--pretty]');
  process.exit(1);
}

function parseConfig(argv: string[]): Config {
  const raw = argv.slice(2);
  const modeRaw = readFlagValue(raw, "--mode") || DEFAULTS.mode;
  const typeRaw = readFlagValue(raw, "--type") || DEFAULTS.type;
  const frameworkRaw = readFlagValue(raw, "--framework") || DEFAULTS.framework;

  if (!isMode(modeRaw) || !isContentType(typeRaw) || !isFramework(frameworkRaw)) {
    usage();
  }

  const language = readFlagValue(raw, "--lang") || DEFAULTS.language;
  const durationSeconds = readNumber(readFlagValue(raw, "--duration"), DEFAULTS.durationSeconds);
  const platform = readFlagValue(raw, "--platform") || DEFAULTS.platform;
  const tone = readFlagValue(raw, "--tone") || DEFAULTS.tone;
  const audience = readFlagValue(raw, "--audience") || DEFAULTS.audience;
  const count = readNumber(readFlagValue(raw, "--count"), DEFAULTS.count);
  const noSend = raw.includes("--no-send");
  const send = raw.includes("--send") && !noSend;
  const forceNew = raw.includes("--new");
  const pretty = raw.includes("--pretty");
  const accountIndex = parseGeminiAccountIndex(readFlagValue(raw, "--account")) ?? resolveGeminiAccountIndex();

  const flagsWithValue = new Set(["--mode", "--type", "--framework", "--lang", "--duration", "--platform", "--tone", "--audience", "--count", "--account"]);
  const conceptParts: string[] = [];
  for (let index = 0; index < raw.length; index++) {
    const part = raw[index];
    if (part.startsWith("--")) {
      if (flagsWithValue.has(part)) index += 1;
      continue;
    }
    conceptParts.push(part);
  }

  const concept = conceptParts.join(" ").trim();
  if (!concept) usage();

  return {
    concept,
    mode: modeRaw,
    type: typeRaw,
    framework: frameworkRaw,
    language,
    durationSeconds,
    platform,
    tone,
    audience,
    count,
    send,
    forceNew,
    pretty,
    accountIndex,
  };
}

function objectiveFor(type: ContentType): string {
  if (type === "ad") return "conversion-focused ad concept with clear offer and CTA";
  if (type === "story") return "dialogue-led short story arc with emotional hook and cliffhanger payoff";
  if (type === "howto") return "practical how-to format with clear steps and outcomes";
  return "high-retention viral concept with follow-worthy continuation and remix potential";
}

function frameworkRule(framework: Framework): string {
  if (framework === "accidental-spokesperson") {
    return "Use the accidental spokesperson pattern: contradiction hook, failure-to-win arc, proof moment, and conversational close.";
  }
  if (framework === "micro-drama") {
    return "Use micro-drama with twist pattern: tension-first cold open, escalation, twist recontextualizing opening, loop-friendly cliffhanger ending.";
  }
  if (framework === "impossible-tutorial") {
    return "Use impossible tutorial pattern: result-first hook, absurd constraint reveal, escalating steps, callback ending, participation CTA.";
  }
  return "Select the strongest framework per concept and diversify across accidental spokesperson, micro-drama, and impossible tutorial.";
}

function buildSystemInstruction(config: Config): string {
  return [
    "You are a short-form video strategist and storyboard generator.",
    "Follow constraints exactly.",
    "Output must be valid JSON matching the provided schema, no markdown.",
    "Default orientation is vertical 9:16.",
    "Default clip duration target is 8 seconds unless user overrides it.",
    "You are in prompt-only mode: never ask Gemini to generate image/video assets.",
    "For each scene, produce both image_prompt and video_prompt with matching visual identity.",
    "spoken_dialogue is optional and can include quoted Thai lines like \"...\" for voice guidance.",
    "When writing video prompts, keep each clip as one focused moment and include clear audio_direction.",
    "Include compliance_notes for risky claims and safer rewrites.",
    `Output language: ${config.language}`,
  ].join("\n");
}

function buildDirectPrompt(config: Config): string {
  return [
    "TASK",
    `Create ${config.count} short-form video concepts from this character concept: ${config.concept}`,
    `Primary objective: ${objectiveFor(config.type)}.`,
    frameworkRule(config.framework),
    "",
    "CHANNEL_CONTEXT",
    `Platform: ${config.platform}`,
    `Target duration seconds: ${config.durationSeconds}`,
    `Audience: ${config.audience}`,
    `Tone: ${config.tone}`,
    "",
    "QUALITY_RULES",
    "- Strong hook in first 1-2 seconds",
    "- Distinct ideas, no near-duplicates",
    "- Practical shot list for low-to-mid production",
    "- Build production_pack.scene_prompts where every scene includes BOTH image_prompt and video_prompt",
    "- image_prompt and video_prompt must describe the same scene, same character DNA, same setting continuity",
    "- spoken_dialogue is optional; if used, include quoted Thai dialogue for voice performance",
    "- Do not generate media or instruct tool execution; return prompts only",
    "- End with follow-worthy payoff or cliffhanger (avoid hard-sell CTA unless type=ad)",
    "- Include at least one safer alternative in compliance_notes for risky lines",
    "",
    "OUTPUT_SCHEMA_JSON",
    JSON.stringify(OUTPUT_SCHEMA),
  ].join("\n");
}

function buildGemPrompt(config: Config): string {
  return [
    "TASK",
    "Design a reusable GEM package for viral short-video ideation.",
    "Return JSON only with keys: gem_system_instruction, gem_starter_prompts, first_session_prompt, output_schema.",
    `Character concept seed: ${config.concept}`,
    `Primary objective: ${objectiveFor(config.type)}.`,
    frameworkRule(config.framework),
    "",
    "GEM_REQUIREMENTS",
    "- gem_system_instruction must enforce deterministic JSON outputs",
    "- gem_starter_prompts must include 10 prompts spanning viral/ad/story/howto",
    "- first_session_prompt must request immediate concepts + production_pack",
    "- first_session_prompt must enforce scene_prompts with image_prompt + video_prompt pair per scene",
    "- prompt-only only: no media generation actions",
    "- output_schema must equal provided schema exactly",
    "",
    "CHANNEL_CONTEXT",
    `Platform: ${config.platform}`,
    `Duration seconds: ${config.durationSeconds}`,
    `Audience: ${config.audience}`,
    `Tone: ${config.tone}`,
    `Language: ${config.language}`,
    "",
    "OUTPUT_SCHEMA_JSON",
    JSON.stringify(OUTPUT_SCHEMA),
  ].join("\n");
}

function buildBundle(config: Config): PromptBundle {
  const systemInstruction = buildSystemInstruction(config);
  const userPrompt = config.mode === "gem" ? buildGemPrompt(config) : buildDirectPrompt(config);

  return {
    schema_version: "gemini-viral-video.v1",
    generated_at: new Date().toISOString(),
    mode: config.mode,
    type: config.type,
    framework: config.framework,
    input: {
      concept: config.concept,
      language: config.language,
      duration_seconds: config.durationSeconds,
      platform: config.platform,
      tone: config.tone,
      audience: config.audience,
      count: config.count,
    },
    system_instruction: systemInstruction,
    user_prompt: userPrompt,
    output_schema: OUTPUT_SCHEMA,
  };
}

function toGeminiMessage(bundle: PromptBundle): string {
  return [
    "SYSTEM_INSTRUCTION",
    bundle.system_instruction,
    "",
    "USER_REQUEST",
    bundle.user_prompt,
  ].join("\n");
}

async function sendToGemini(config: Config, message: string): Promise<number> {
  const client = createClient("gemini-viral-video");
  await connectClient(client);

  let tabId: number | undefined;
  if (!config.forceNew) {
    const existing = await findGeminiAppTab(client, config.accountIndex);
    if (existing?.id) tabId = existing.id;
  }

  if (!tabId) {
    const created = await request(
      client,
      "create_tab",
      { url: geminiAppUrl(config.accountIndex), accountIndex: config.accountIndex },
      12000,
    );
    if (created.success === false || typeof created.tabId !== "number") {
      client.end();
      throw new Error(`create_tab failed: ${String(created.error || "unknown error")}`);
    }
    tabId = created.tabId;
    await Bun.sleep(1200);
  }

  const response = await request(client, "chat", { tabId, text: message }, 18000);
  client.end();

  if (response.success === false) {
    throw new Error(`chat failed: ${String(response.error || "unknown error")}`);
  }

  return tabId;
}

async function main() {
  const config = parseConfig(process.argv);
  const bundle = buildBundle(config);
  const prettySpacing = config.pretty ? 2 : 0;

  console.log(JSON.stringify(bundle, null, prettySpacing));

  if (!config.send) return;

  const tabId = await sendToGemini(config, toGeminiMessage(bundle));
  console.log(`\n✅ Sent prompt bundle to Gemini tab ${tabId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
