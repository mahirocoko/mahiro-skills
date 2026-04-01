import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const tabId = 2127157530; // Latest smooth tab

async function send(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `${action}_${Date.now()}`;
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

    client.subscribe('claude/browser/response');
    const handler = (topic: string, msg: Buffer) => {
      if (topic !== 'claude/browser/response') return;
      const data = JSON.parse(msg.toString());
      if (data.id === id) {
        clearTimeout(timeout);
        client.off('message', handler);
        resolve(data);
      }
    };
    client.on('message', handler);
    client.publish('claude/browser/command', JSON.stringify({ id, action, tabId, ...params }));
  });
}

async function main() {
  await new Promise(r => client.on('connect', r));

  console.log('Inspecting state/text from tab', tabId, '...\n');

  const state = await send('get_state');
  console.log('=== TAB STATE ===\n');
  console.log(JSON.stringify(state, null, 2));

  const result = await send('get_text');
  const text = typeof result.text === 'string' ? result.text : '';
  console.log('\n=== TEXT PREVIEW (first 1200 chars) ===\n');
  console.log(text.slice(0, 1200));

  client.end();
}

main().catch(console.error);
