import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const tabId = 2127157509;

client.on('connect', async () => {
  const stateId = 'state_' + Date.now();
  const textId = 'text_' + Date.now();
  client.subscribe('claude/browser/response');

  console.log('Checking Gemini state and text on tab', tabId);

  client.publish('claude/browser/command', JSON.stringify({
    id: stateId,
    action: 'get_state',
    tabId
  }));

  client.publish('claude/browser/command', JSON.stringify({
    id: textId,
    action: 'get_text',
    tabId
  }));

  client.on('message', (topic, msg) => {
    if (topic !== 'claude/browser/response') return;
    const data = JSON.parse(msg.toString());
    if (data.id === stateId) {
      console.log('\n=== TAB STATE ===');
      console.log(JSON.stringify(data, null, 2));
    }
    if (data.id === textId) {
      console.log('\n=== TAB TEXT PREVIEW ===');
      const text = typeof data.text === 'string' ? data.text : '';
      console.log(text.slice(0, 600));
      client.end();
    }
  });

  setTimeout(() => {
    console.log('Timeout');
    client.end();
  }, 5000);
});
