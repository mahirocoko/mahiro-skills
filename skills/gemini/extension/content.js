console.log('[Oracle Proxy] Content script loaded on Gemini');

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'ping') {
    sendResponse({ success: true, ready: true });
    return true;
  }
  
  if (msg.action === 'get_response') {
    const response = extractGeminiResponse();
    sendResponse({ success: true, response });
    return true;
  }
  
  if (msg.action === 'get_state') {
    const state = getGeminiState();
    sendResponse({ success: true, ...state });
    return true;
  }
  
  return false;
});

function extractGeminiResponse() {
  const selectors = [
    'message-content',
    '[data-test-id="response"]',
    '.response-text',
    'model-response'
  ];
  
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim()) {
      return el.innerText;
    }
  }
  
  return null;
}

function getGeminiState() {
  const url = window.location.href;
  const isLoading = document.querySelector('[aria-label="Loading"]') !== null ||
                    document.querySelector('.loading') !== null;
  
  const responseCount = document.querySelectorAll('message-content, [data-test-id="response"]').length;
  
  let mode = 'chat';
  if (url.includes('mode=research')) mode = 'research';
  else if (url.includes('mode=canvas')) mode = 'canvas';
  
  return {
    url,
    title: document.title,
    loading: isLoading,
    responseCount,
    mode
  };
}

function showBadge(text, duration = 5000) {
  const existing = document.getElementById('oracle-content-badge');
  if (existing) existing.remove();
  
  const badge = document.createElement('div');
  badge.id = 'oracle-content-badge';
  badge.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1a1a2e;
    color: #eee;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    z-index: 999999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  badge.textContent = text;
  document.body.appendChild(badge);
  
  if (duration > 0) {
    setTimeout(() => badge.remove(), duration);
  }
  
  return badge;
}
