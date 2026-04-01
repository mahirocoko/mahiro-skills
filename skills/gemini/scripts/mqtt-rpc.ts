#!/usr/bin/env bun
import mqtt from "mqtt";

export const MQTT_URL = "mqtt://localhost:1883";
export const TOPIC_CMD = "claude/browser/command";
export const TOPIC_RES = "claude/browser/response";

type JsonObject = Record<string, unknown>;

export type TabInfo = {
  id: number;
  title?: string;
  url?: string;
  active?: boolean;
  windowId?: number;
};

const GEMINI_APP_ANY_ACCOUNT_RE = /^https:\/\/gemini\.google\.com\/(?:u\/\d+\/)?app(?:[/?#]|$)/i;

export function parseGeminiAccountIndex(raw: unknown): number | undefined {
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;
  const text = String(raw).trim();
  if (!/^\d+$/.test(text)) return undefined;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveGeminiAccountIndex(raw?: string | number): number | undefined {
  return parseGeminiAccountIndex(raw ?? process.env.GEMINI_ACCOUNT_INDEX);
}

export function geminiAppUrl(accountIndex?: number): string {
  if (typeof accountIndex === "number") {
    return `https://gemini.google.com/u/${accountIndex}/app`;
  }
  return "https://gemini.google.com/app";
}

export function isGeminiAppUrl(url: string | undefined, accountIndex?: number): boolean {
  if (!url) return false;
  if (typeof accountIndex === "number") {
    const expectedPrefix = `https://gemini.google.com/u/${accountIndex}/app`;
    return url.startsWith(expectedPrefix);
  }
  return GEMINI_APP_ANY_ACCOUNT_RE.test(url);
}

export function createClient(clientIdPrefix: string): mqtt.MqttClient {
  return mqtt.connect(MQTT_URL, {
    clientId: `${clientIdPrefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  });
}

export async function connectClient(client: mqtt.MqttClient): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    client.once("connect", () => resolve());
    client.once("error", reject);
  });

  await new Promise<void>((resolve, reject) => {
    client.subscribe(TOPIC_RES, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function request(
  client: mqtt.MqttClient,
  action: string,
  params: JsonObject = {},
  timeoutMs = 12000,
): Promise<JsonObject> {
  return new Promise((resolve) => {
    const id = `${action}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const timer = setTimeout(() => {
      client.off("message", handler);
      resolve({
        id,
        action,
        success: false,
        timeout: true,
        error: `Timeout on ${action}`,
      });
    }, timeoutMs);

    const handler = (topic: string, message: Buffer) => {
      if (topic !== TOPIC_RES) return;

      let data: JsonObject;
      try {
        data = JSON.parse(message.toString()) as JsonObject;
      } catch (error) {
        if (process.env.DEBUG_GEMINI_MQTT === "1") {
          console.error("Skipping non-JSON MQTT message:", String(error));
        }
        return;
      }

      if (data.id !== id) return;

      clearTimeout(timer);
      client.off("message", handler);
      resolve(data);
    };

    client.on("message", handler);
    client.publish(
      TOPIC_CMD,
      JSON.stringify({
        id,
        action,
        ts: Date.now(),
        ...params,
      }),
    );
  });
}

export async function findGeminiAppTab(client: mqtt.MqttClient, accountIndex?: number): Promise<TabInfo | null> {
  const tabsResponse = await request(client, "list_tabs");
  const tabs = Array.isArray(tabsResponse.tabs) ? (tabsResponse.tabs as TabInfo[]) : [];
  return tabs.find((tab) => isGeminiAppUrl(String(tab.url || ""), accountIndex)) || null;
}
