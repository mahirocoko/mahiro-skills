#!/usr/bin/env bun
import mqtt from 'mqtt';
import { geminiAppUrl, parseGeminiAccountIndex, resolveGeminiAccountIndex } from './mqtt-rpc.js';

const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RES = 'claude/browser/response';

type CheckResult = {
  name: string;
  ok: boolean;
  details?: string;
};

function send(client: mqtt.MqttClient, action: string, params: Record<string, unknown> = {}, timeoutMs = 12000): Promise<any> {
  return new Promise((resolve) => {
    const id = `${action}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const timer = setTimeout(() => {
      client.off('message', handler);
      resolve({ id, success: false, timeout: true, error: `Timeout on ${action}` });
    }, timeoutMs);

    const handler = (topic: string, msg: Buffer) => {
      if (topic !== TOPIC_RES) return;
      try {
        const data = JSON.parse(msg.toString());
        if (data.id === id) {
          clearTimeout(timer);
          client.off('message', handler);
          resolve(data);
        }
      } catch {
      }
    };

    client.on('message', handler);
    client.publish(TOPIC_CMD, JSON.stringify({ id, action, ts: Date.now(), ...params }));
  });
}

function printResult(r: CheckResult) {
  const icon = r.ok ? '✅' : '❌';
  console.log(`${icon} ${r.name}${r.details ? ` — ${r.details}` : ''}`);
}

async function main() {
  const args = Bun.argv.slice(2);
  const accountArgIndex = args.findIndex((part) => part === '--account');
  const accountIndex =
    parseGeminiAccountIndex(accountArgIndex >= 0 ? args[accountArgIndex + 1] : undefined) ??
    resolveGeminiAccountIndex();
  const targetUrl = geminiAppUrl(accountIndex);
  const appTabMatcher = typeof accountIndex === 'number'
    ? new RegExp(`^https://gemini\\.google\\.com/u/${accountIndex}/app(?:[/?#]|$)`, 'i')
    : /^https:\/\/gemini\.google\.com\/(?:u\/\d+\/)?app(?:[/?#]|$)/i;

  const client = mqtt.connect('mqtt://localhost:1883');

  await new Promise<void>((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('error', reject);
  });

  client.subscribe(TOPIC_RES);

  const checks: CheckResult[] = [];

  const ping = await send(client, 'ping');
  checks.push({ name: 'MQTT + extension ping', ok: Boolean(ping?.success) });

  const tabs = await send(client, 'list_tabs');
  const tabList = Array.isArray(tabs?.tabs) ? tabs.tabs : [];
  const appTab = tabList.find((t: any) => appTabMatcher.test(String(t?.url || '')));
  checks.push({
    name: 'Gemini /app tab exists',
    ok: Boolean(appTab?.id),
    details: appTab?.id ? `tabId=${appTab.id}` : `open ${targetUrl}`
  });

  const tabId = appTab?.id;

  if (tabId) {
    const state = await send(client, 'get_state', { tabId });
    checks.push({
      name: 'State channel healthy',
      ok: Boolean(state?.success),
      details: state?.success ? `mode=${state.mode}, loading=${state.loading}` : (state?.error || 'unknown error')
    });

    const tools = await send(client, 'list_tools', { tabId });
    checks.push({
      name: 'Tools inventory available',
      ok: Boolean(tools?.success && Array.isArray(tools?.items)),
      details: tools?.success ? `${tools.count} tools` : (tools?.error || 'list_tools failed')
    });

    const chat = await send(client, 'chat', { tabId, text: 'Reply with exactly: OK' });
    let chatOk = Boolean(chat?.success);
    let chatDetails = chat?.success ? `method=${chat.method || 'unknown'}` : (chat?.error || 'chat failed');

    if (!chatOk) {
      const freshTab = await send(client, 'create_tab', { url: targetUrl, accountIndex });
      const freshTabId = freshTab?.tabId;
      if (freshTabId) {
        await new Promise((r) => setTimeout(r, 1200));
        const retry = await send(client, 'chat', { tabId: freshTabId, text: 'Reply with exactly: OK' });
        if (retry?.success) {
          chatOk = true;
          chatDetails = `method=${retry.method || 'unknown'} (retry on fresh tab ${freshTabId})`;
        } else {
          chatDetails = `${chatDetails}; retry: ${retry?.error || 'failed'}`;
        }
      }
    }

    checks.push({
      name: 'Chat submit path',
      ok: chatOk,
      details: chatDetails
    });
  }

  console.log('\n🩺 Gemini Doctor Report\n');
  checks.forEach(printResult);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\nSummary: ${checks.length - failed}/${checks.length} checks passed`);

  client.end();
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
