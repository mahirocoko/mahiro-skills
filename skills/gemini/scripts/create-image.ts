#!/usr/bin/env bun
import mqtt from 'mqtt';

const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RES = 'claude/browser/response';

const prompt = process.argv.slice(2).join(' ').trim();

if (!prompt) {
  console.error('Usage: bun "$SKILL_DIR/scripts/create-image.ts" "your image prompt"');
  process.exit(1);
}

function send(client: mqtt.MqttClient, action: string, params: Record<string, unknown> = {}, timeoutMs = 12000): Promise<any> {
  return new Promise((resolve) => {
    const id = `${action}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const timer = setTimeout(() => {
      client.off('message', handler);
      resolve({ id, action, success: false, timeout: true, error: 'Timeout waiting for response' });
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

  console.log('🎨 Create image flow');
  console.log(`Prompt: ${prompt}`);

  const result = await send(client, 'create_image', { prompt });
  console.log(JSON.stringify(result, null, 2));

  client.end();

  if (!result?.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
