#!/usr/bin/env bun
import { createClient, request, type TabInfo } from "./mqtt-rpc.js";

type FlowConfig = Record<string, unknown>;

type FlowClient = ReturnType<typeof createClient>;

export function getFlagValue(args: string[], key: string): string | undefined {
  const idx = args.findIndex((arg) => arg === key);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

export async function resolveFlowTabId(client: FlowClient, projectId?: string): Promise<number> {
  if (projectId) {
    const opened = await request(client, "open_flow_project", { projectId }, 12000);
    if (opened.success !== false && typeof opened.tabId === "number") {
      return opened.tabId;
    }
  }

  const listed = await request(client, "list_flow_tabs", {}, 10000);
  const tabs = Array.isArray(listed.tabs) ? (listed.tabs as TabInfo[]) : [];
  const active = tabs.find((tab) => tab.active && typeof tab.id === "number");
  if (active?.id) return active.id;
  if (tabs[0]?.id) return tabs[0].id;

  const created = await request(client, "create_flow_tab", projectId ? { projectId } : {}, 15000);
  if (created.success === false || typeof created.tabId !== "number") {
    throw new Error(`Failed to open Flow tab: ${String(created.error || "unknown")}`);
  }

  return created.tabId;
}

export async function runStep(
  client: FlowClient,
  action: string,
  params: FlowConfig,
  timeoutMs = 12000,
): Promise<Record<string, unknown>> {
  const response = await request(client, action, params, timeoutMs);
  if (response.success === false) {
    throw new Error(`${action} failed: ${String(response.error || "unknown")}`);
  }
  return response;
}

export async function runStepWithRetry(
  client: FlowClient,
  action: string,
  params: FlowConfig,
  timeoutMs: number,
  attempts: number,
  backoffMs = 220,
): Promise<Record<string, unknown>> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await runStep(client, action, params, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await Bun.sleep(backoffMs * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
