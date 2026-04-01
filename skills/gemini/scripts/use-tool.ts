#!/usr/bin/env bun
import mqtt from 'mqtt';

const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RES = 'claude/browser/response';

const tool = String(process.argv[2] || '').trim();
const prompt = process.argv.slice(3).join(' ').trim();

if (!tool || !prompt) {
  console.error('Usage: bun "$SKILL_DIR/scripts/use-tool.ts" "tool name" "prompt"');
  process.exit(1);
}

function send(client: mqtt.MqttClient, action: string, params: Record<string, unknown> = {}, timeoutMs = 15000): Promise<any> {
  return new Promise((resolve) => {
    const id = `${action}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const timer = setTimeout(() => {
      client.off('message', handler);
      resolve({ id, success: false, timeout: true, error: 'Timeout waiting for response' });
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

async function main() {
  const client = mqtt.connect('mqtt://localhost:1883');

  await new Promise<void>((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('error', reject);
  });

  client.subscribe(TOPIC_RES);

  console.log(`🧰 Tool: ${tool}`);
  console.log(`📝 Prompt: ${prompt}`);

  let result = await send(client, 'create_with_tool', { tool, prompt });

  const unknown = String(result?.error || '').toLowerCase().includes('unknown action: create_with_tool');
  if (unknown) {
    const toolResult = await send(client, 'select_tool', { tool });
    if (!toolResult?.success) {
      result = toolResult;
    } else {
      const chatResult = await send(client, 'chat', { text: prompt });
      result = {
        success: Boolean(chatResult?.success),
        tool,
        fallback: true,
        selectTool: toolResult,
        chat: chatResult,
        error: chatResult?.success ? undefined : (chatResult?.error || 'Fallback chat failed')
      };
    }
  }

  console.log(JSON.stringify(result, null, 2));

  client.end();
  if (!result?.success) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
