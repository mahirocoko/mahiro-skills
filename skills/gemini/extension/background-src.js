import mqtt from 'mqtt';

const MQTT_URL = 'ws://localhost:9001';
const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RSP = 'claude/browser/response';
const TOPIC_STATUS = 'claude/browser/status';

let client = null;
let connected = false;

function parseAccountIndex(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return undefined;
  return Number.parseInt(text, 10);
}

function geminiAppUrl(accountIndex) {
  if (Number.isInteger(accountIndex)) {
    return `https://gemini.google.com/u/${accountIndex}/app`;
  }
  return 'https://gemini.google.com/app';
}

function isGeminiAppUrl(url, accountIndex) {
  if (!url) return false;
  if (Number.isInteger(accountIndex)) {
    return url.startsWith(`https://gemini.google.com/u/${accountIndex}/app`);
  }
  return /^https:\/\/gemini\.google\.com\/(?:u\/\d+\/)?app(?:[/?#]|$)/i.test(String(url));
}

function isFlowUrl(url) {
  if (!url) return false;
  return /^https:\/\/labs\.google\/fx\/tools\/flow(?:[/?#]|$)/i.test(String(url));
}

function flowUrl() {
  return 'https://labs.google/fx/tools/flow';
}

function normalizeFlowProjectId(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.replace(/[^a-z0-9-]/gi, '');
}

function flowProjectUrl(projectId) {
  const normalized = normalizeFlowProjectId(projectId);
  if (!normalized) return flowUrl();
  return `https://labs.google/fx/tools/flow/project/${normalized}`;
}

function extractFlowProjectId(url) {
  const text = String(url || '');
  const match = text.match(/^https:\/\/labs\.google\/fx\/tools\/flow\/project\/([a-z0-9-]+)/i);
  return match?.[1] || '';
}

function notifyPopupStatus() {
  chrome.runtime.sendMessage({
    type: 'status',
    online: connected
  }).catch((err) => {
    if (!String(err).includes('Receiving end does not exist')) {
      console.error('[Oracle Proxy] Failed to notify popup:', err);
    }
  });
}

async function resolveTabId(tabId) {
  if (Number.isInteger(tabId)) {
    return tabId;
  }

  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeGemini = activeTabs.find((t) => t.url && t.url.startsWith('https://gemini.google.com/'));
  if (activeGemini?.id) {
    return activeGemini.id;
  }

  const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
  if (tabs[0]?.id) {
    return tabs[0].id;
  }

  throw new Error('No Gemini tab found');
}

async function resolveAppTabId(tabId, accountIndex) {
  if (Number.isInteger(tabId)) {
    const explicit = await chrome.tabs.get(tabId);
    if (isGeminiAppUrl(explicit?.url, accountIndex)) {
      return tabId;
    }
  }

  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeApp = activeTabs.find((t) => isGeminiAppUrl(t.url, accountIndex));
  if (activeApp?.id) {
    return activeApp.id;
  }

  const allGeminiTabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
  const appTab = allGeminiTabs.find((t) => isGeminiAppUrl(t.url, accountIndex));
  if (appTab?.id) {
    return appTab.id;
  }

  throw new Error(`No Gemini /app tab found. Open ${geminiAppUrl(accountIndex)} first.`);
}

async function resolveFlowTabId(tabId, projectId) {
  const wantedProjectId = normalizeFlowProjectId(projectId);

  if (Number.isInteger(tabId)) {
    const explicit = await chrome.tabs.get(tabId);
    if (isFlowUrl(explicit?.url)) {
      if (!wantedProjectId || extractFlowProjectId(explicit?.url) === wantedProjectId) {
        return tabId;
      }
    }
  }

  if (wantedProjectId) {
    const exactTabs = await chrome.tabs.query({ url: `${flowProjectUrl(wantedProjectId)}*` });
    const exactMatch = exactTabs.find((t) => extractFlowProjectId(t.url) === wantedProjectId);
    if (exactMatch?.id) {
      return exactMatch.id;
    }
  }

  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeFlow = activeTabs.find((t) => {
    if (!isFlowUrl(t.url)) return false;
    if (!wantedProjectId) return true;
    return extractFlowProjectId(t.url) === wantedProjectId;
  });
  if (activeFlow?.id) {
    return activeFlow.id;
  }

  const flowTabs = await chrome.tabs.query({ url: 'https://labs.google/fx/tools/flow*' });
  const flowTab = flowTabs.find((t) => {
    if (!isFlowUrl(t.url)) return false;
    if (!wantedProjectId) return true;
    return extractFlowProjectId(t.url) === wantedProjectId;
  });
  if (flowTab?.id) {
    return flowTab.id;
  }

  if (wantedProjectId) {
    throw new Error(`No Flow tab found for project ${wantedProjectId}. Open ${flowProjectUrl(wantedProjectId)} first.`);
  }

  throw new Error(`No Flow tab found. Open ${flowUrl()} first.`);
}

function connectMQTT() {
  if (client) {
    client.end();
  }
  
  client = mqtt.connect(MQTT_URL, {
    clientId: 'oracle-gemini-proxy-' + Date.now(),
    clean: true,
    connectTimeout: 5000,
    reconnectPeriod: 5000
  });
  
  client.on('connect', () => {
    connected = true;
    console.log('[Oracle Proxy] Connected to MQTT broker');
    
    client.subscribe(TOPIC_CMD, (err) => {
      if (err) {
        console.error('[Oracle Proxy] Subscribe failed:', err);
      } else {
        console.log('[Oracle Proxy] Subscribed to', TOPIC_CMD);
      }
    });
    
    publishStatus('online');
    notifyPopupStatus();
    injectStatusBadgeToAllGeminiTabs().catch(() => null);
  });
  
  client.on('message', (topic, message) => {
    if (topic === TOPIC_CMD) {
      try {
        const cmd = JSON.parse(message.toString());
        handleCommand(cmd);
      } catch (e) {
        console.error('[Oracle Proxy] Parse error:', e);
      }
    }
  });
  
  client.on('error', (err) => {
    console.error('[Oracle Proxy] MQTT error:', err);
    connected = false;
    notifyPopupStatus();
    injectStatusBadgeToAllGeminiTabs().catch(() => null);
  });
  
  client.on('close', () => {
    connected = false;
    console.log('[Oracle Proxy] Disconnected from MQTT broker');
    notifyPopupStatus();
    injectStatusBadgeToAllGeminiTabs().catch(() => null);
  });
  
  client.on('reconnect', () => {
    console.log('[Oracle Proxy] Reconnecting...');
  });
}

function publishStatus(status) {
  if (!client || !connected) return;
  
  const payload = JSON.stringify({
    status,
    timestamp: Date.now(),
    version: '1.0.0'
  });
  
  client.publish(TOPIC_STATUS, payload);
}

function sendResponse(id, data) {
  if (!client || !connected) return;
  
  const payload = JSON.stringify({
    id,
    ...data,
    ts: Date.now()
  });
  
  client.publish(TOPIC_RSP, payload);
}

async function handleCommand(cmd) {
  if (!cmd || !cmd.action) {
    sendResponse(cmd?.id || `invalid_${Date.now()}`, { success: false, error: 'Missing command action' });
    return;
  }
  
  console.log('[Oracle Proxy] Command:', cmd.action, cmd);
  
  let result;
  
  try {
    switch (cmd.action) {
      case 'ping':
        result = { success: true, pong: true };
        break;
        
      case 'list_tabs':
        result = await listGeminiTabs();
        break;

      case 'list_flow_tabs':
        result = await listFlowTabs();
        break;

      case 'list_tabs_all':
        result = await listAllTabs();
        break;
        
      case 'create_tab':
        result = await createGeminiTab(cmd.url, cmd.mode, parseAccountIndex(cmd.accountIndex));
        break;

      case 'create_flow_tab':
        result = await createFlowTab(cmd.url, cmd.projectId);
        break;

      case 'open_flow_project':
        result = await openFlowProject(cmd.projectId, cmd.tabId);
        break;

      case 'flow_current_project':
        result = await flowCurrentProject(cmd.tabId);
        break;

      case 'flow_new_project':
        result = await flowNewProject(cmd.tabId, cmd.projectId);
        break;

      case 'flow_select_tool':
        result = await flowSelectTool(cmd.tabId, cmd.tool, cmd.projectId);
        break;

      case 'flow_submit_prompt': {
        const legacySubmit = await flowSubmitPrompt(cmd.tabId, cmd.prompt || cmd.text, cmd.projectId);
        result = {
          ...legacySubmit,
          legacy: true,
          canonicalPath: ['flow_type_prompt', 'flow_generate_image']
        };
        break;
      }

      case 'flow_configure_create_image':
        result = await flowConfigureCreateImage(cmd.tabId, {
          aspectRatio: cmd.aspectRatio,
          outputsPerPrompt: cmd.outputsPerPrompt,
          model: cmd.model
        }, cmd.projectId);
        break;

      case 'flow_simulate_image_to_video':
        result = await flowSimulateImageToVideo(
          cmd.tabId,
          cmd.imagePrompt,
          cmd.videoPrompt,
          cmd.projectId,
          cmd.createImageOptions
        );

        break;

      // New Flow UI Commands (Ingredients mode, Veo 3.1, etc.)
      case 'flow_select_video_tab':
        result = await flowSelectVideoTab(cmd.tabId, cmd.projectId);
        break;

      case 'flow_select_image_tab':
        result = await flowSelectImageTab(cmd.tabId, cmd.projectId);
        break;

      case 'flow_select_ingredients_mode':
        result = await flowSelectIngredientsMode(cmd.tabId, cmd.projectId);
        break;

      case 'flow_select_reference_mode':
        result = await flowSelectReferenceMode(cmd.tabId, cmd.projectId);
        break;

      case 'flow_select_frames_mode':
        result = await flowSelectFramesMode(cmd.tabId, cmd.projectId);
        break;

      case 'flow_select_frame_slot':
        result = await flowSelectFrameSlot(cmd.tabId, cmd.slot, cmd.projectId);
        break;

      case 'flow_select_asset':
        result = await flowSelectAsset(
          cmd.tabId,
          cmd.assetId,
          cmd.projectId,
          cmd.slot,
          cmd.assetIndex,
          cmd.assetExactId,
        );
        break;

      case 'flow_select_latest_image_ingredient':
        result = await flowSelectLatestImageIngredient(cmd.tabId, cmd.projectId);
        break;

      case 'flow_clear_selected_ingredients':
        result = await flowClearSelectedIngredients(cmd.tabId, cmd.projectId);
        break;

      case 'flow_set_model':
        result = await flowSetModel(cmd.tabId, cmd.model, cmd.projectId);
        break;

      case 'flow_set_multiplier':
        result = await flowSetMultiplier(cmd.tabId, cmd.multiplier, cmd.projectId);
        break;

      case 'flow_set_aspect_ratio':
        result = await flowSetAspectRatio(cmd.tabId, cmd.ratio, cmd.projectId);
        break;

      case 'flow_type_prompt':
        result = await flowTypePrompt(cmd.tabId, cmd.text, cmd.projectId, cmd.clearBeforeType);
        break;

      case 'flow_generate_video':
        result = await flowGenerateVideo(cmd.tabId, cmd.projectId);
        break;

      case 'flow_generate_image':
        result = await flowGenerateImage(cmd.tabId, cmd.projectId);
        break;

        
      case 'focus_tab':
        result = await focusTab(cmd.tabId);
        break;
        
      case 'close_tab':
        result = await closeTab(cmd.tabId);
        break;
        
      case 'get_url':
        result = await getTabUrl(cmd.tabId);
        break;

        case 'get_text':
          result = await getTabText(cmd.tabId);
          break;

        case 'get_dom':
          result = await getTabDom(cmd.tabId, {
            selector: cmd.selector,
            maxNodes: cmd.maxNodes,
            includeHidden: cmd.includeHidden,
            includeHtml: cmd.includeHtml,
            maxTextLength: cmd.maxTextLength,
            maxHtmlLength: cmd.maxHtmlLength,
          });
          break;

        case 'get_html':
          result = await getTabHtml(cmd.tabId, cmd.maxChars);
          break;

        case 'get_state':
          result = await getTabState(cmd.tabId);
          break;

        case 'chat':
          result = await sendChat(cmd.tabId, cmd.text);
          break;
        
      case 'inject_badge':
        result = await injectBadge(cmd.tabId, cmd.text);
        break;

      case 'list_tools':
        result = await listTools(cmd.tabId, parseAccountIndex(cmd.accountIndex));
        break;

      case 'select_tool':
        result = await selectTool(cmd.tabId, cmd.tool, parseAccountIndex(cmd.accountIndex));
        break;

      case 'create_image':
        result = await createImage(cmd.tabId, cmd.prompt || cmd.text, parseAccountIndex(cmd.accountIndex));
        break;

      case 'create_with_tool':
        result = await createWithTool(cmd.tabId, cmd.tool, cmd.prompt || cmd.text, parseAccountIndex(cmd.accountIndex));
        break;
        
      case 'select_model':
          result = await selectModel(cmd.tabId, cmd.model, parseAccountIndex(cmd.accountIndex));
          break;

      default:
        result = { success: false, error: `Unknown action: ${cmd.action}` };
    }
  } catch (err) {
    result = { success: false, error: err instanceof Error ? err.message : String(err) };
  }
  
  sendResponse(cmd.id, result);
}

function normalizeFlowScriptResult(results, resolvedTabId, action) {
  const commandResult = results?.[0]?.result;
  if (!commandResult || typeof commandResult !== 'object') {
    return {
      success: false,
      tabId: resolvedTabId,
      error: `${action} did not return a valid result`,
      details: results?.[0] || null,
    };
  }

  if (commandResult.success !== true) {
    return {
      success: false,
      tabId: resolvedTabId,
      ...commandResult,
    };
  }

  return {
    tabId: resolvedTabId,
    ...commandResult,
  };
}

async function listGeminiTabs() {
  const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
  
  return {
    success: true,
    tabs: tabs.map(t => ({
      id: t.id,
      title: t.title,
      url: t.url,
      active: t.active,
      windowId: t.windowId
    })),
    count: tabs.length
  };
}

async function listFlowTabs() {
  const tabs = await chrome.tabs.query({ url: 'https://labs.google/fx/tools/flow*' });

  return {
    success: true,
    tabs: tabs
      .filter((t) => isFlowUrl(t.url))
      .map((t) => ({
        id: t.id,
        title: t.title,
        url: t.url,
        active: t.active,
        windowId: t.windowId,
        kind: 'flow',
        projectId: extractFlowProjectId(t.url) || null
      })),
    count: tabs.length
  };
}

async function listAllTabs() {
  const [gemini, flow] = await Promise.all([listGeminiTabs(), listFlowTabs()]);

  return {
    success: true,
    tabs: [...(gemini.tabs || []), ...(flow.tabs || [])],
    count: Number(gemini.count || 0) + Number(flow.count || 0)
  };
}

async function createGeminiTab(url, mode, accountIndex) {
  let targetUrl = geminiAppUrl(accountIndex);
  
  if (mode === 'research') {
    targetUrl += '/explore?mode=research';
  } else if (mode === 'canvas') {
    targetUrl += '/explore?mode=canvas';
  }
  
  if (url && url.startsWith('http')) {
    targetUrl = url;
  }
  
  const tab = await chrome.tabs.create({ url: targetUrl });
  
  await new Promise(r => setTimeout(r, 1000));
  
  return {
    success: true,
    tabId: tab.id,
    url: tab.url
  };
}

async function createFlowTab(url, projectId) {
  const normalizedProjectId = normalizeFlowProjectId(projectId);
  const targetUrl = typeof url === 'string' && url.startsWith('http')
    ? url
    : normalizedProjectId
      ? flowProjectUrl(normalizedProjectId)
      : flowUrl();
  const tab = await chrome.tabs.create({ url: targetUrl });

  await new Promise((r) => setTimeout(r, 800));

  return {
    success: true,
    tabId: tab.id,
    url: tab.url,
    kind: 'flow',
    projectId: extractFlowProjectId(tab.url) || null
  };
}

async function openFlowProject(projectId, tabId) {
  const normalizedProjectId = normalizeFlowProjectId(projectId);
  if (!normalizedProjectId) {
    return { success: false, error: 'Missing projectId' };
  }

  const targetUrl = flowProjectUrl(normalizedProjectId);
  try {
    const targetTabId = await resolveFlowTabId(tabId, normalizedProjectId);
    await chrome.tabs.update(targetTabId, { active: true, url: targetUrl });
    const tab = await chrome.tabs.get(targetTabId);
    if (tab?.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    return {
      success: true,
      tabId: targetTabId,
      url: targetUrl,
      projectId: normalizedProjectId,
      reused: true
    };
  } catch {
    const tab = await chrome.tabs.create({ url: targetUrl });
    await new Promise((r) => setTimeout(r, 800));
    return {
      success: true,
      tabId: tab.id,
      url: tab.url,
      projectId: normalizedProjectId,
      reused: false
    };
  }
}

async function flowCurrentProject(tabId) {
  const resolvedTabId = await resolveFlowTabId(tabId);
  const tab = await chrome.tabs.get(resolvedTabId);
  return {
    success: true,
    tabId: resolvedTabId,
    url: tab?.url,
    title: tab?.title,
    projectId: extractFlowProjectId(tab?.url) || null
  };
}

async function flowNewProject(tabId, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);

  const clickAttempt = async () => {
    const results = await chrome.scripting.executeScript({
      target: { tabId: resolvedTabId },
      func: async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const normalize = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const isVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        };

        const priorities = ['new project', 'create project', 'create'];

        for (let i = 0; i < 12; i += 1) {
          const candidates = Array.from(document.querySelectorAll('button, [role="button"], a')).filter(isVisible);
          let target = null;

          for (const phrase of priorities) {
            target = candidates.find((el) => {
              const label = normalize(el.getAttribute('aria-label') || el.textContent);
              return label === phrase || label.includes(phrase);
            });
            if (target) break;
          }

          if (target) {
            target.click();
            await sleep(250);
            return {
              success: true,
              clicked: true,
              label: String(target.textContent || target.getAttribute('aria-label') || '').trim(),
              url: window.location.href,
              title: document.title
            };
          }

          await sleep(300);
        }

        return {
          success: false,
          clicked: false,
          error: 'New project button not found',
          url: window.location.href,
          title: document.title
        };
      }
    });

    return results[0]?.result;
  };

  let result = await clickAttempt();

  if (!result?.success) {
    await chrome.tabs.update(resolvedTabId, { url: flowUrl(), active: true });
    for (let i = 0; i < 12; i += 1) {
      await new Promise((r) => setTimeout(r, 250));
      const tab = await chrome.tabs.get(resolvedTabId);
      if (tab?.status === 'complete') {
        break;
      }
    }
    result = await clickAttempt();
  }

  if (!result?.success) {
    return {
      success: false,
      tabId: resolvedTabId,
      error: result?.error || 'Failed to click New project',
      details: result || null
    };
  }

  return {
    success: true,
    tabId: resolvedTabId,
    clicked: true,
    label: result.label,
    url: result.url,
    title: result.title
  };
}

async function flowSelectTool(tabId, tool, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const targetTool = String(tool || '').trim();
  if (!targetTool) {
    return { success: false, tabId: resolvedTabId, error: 'Missing tool name' };
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async (toolName) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const compact = (txt) => norm(txt).replace(/[^a-z0-9]+/g, '');
      const wanted = norm(toolName);
      const wantedCompact = compact(toolName);
      const isVisible = (el) => {
        if (!el) return false;
        let node = el;
        for (let depth = 0; depth < 10 && node; depth += 1) {
          const ariaHidden = String(node.getAttribute?.('aria-hidden') || '').toLowerCase();
          const dataAriaHidden = String(node.getAttribute?.('data-aria-hidden') || '').toLowerCase();
          if (ariaHidden === 'true' || dataAriaHidden === 'true') return false;
          node = node.parentElement;
        }
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const knownTools = ['text to video', 'frames to video', 'ingredients to video', 'image to video', 'create image'];

      const textMatches = (rawText) => {
        const label = norm(rawText);
        const labelCompact = compact(rawText);
        return label === wanted || label.includes(wanted) || labelCompact === wantedCompact || labelCompact.includes(wantedCompact);
      };

      const extractKnownTool = (rawText) => {
        const txt = norm(rawText);
        return knownTools.find((toolItem) => txt.includes(toolItem)) || '';
      };

      const clickElement = async (el) => {
        if (!el) return;
        const overlay = el.querySelector('[data-type="button-overlay"]');
        const target = overlay || el;
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        el.click();
      };

      const closeImagePreviewIfNeeded = async () => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a, div, span')).filter(isVisible);
        const exitButton = buttons.find((el) => {
          const label = norm(el.getAttribute('aria-label') || el.textContent);
          return label === 'exit' || label === 'close' || label === 'back';
        }) || null;
        if (exitButton) {
          const clickable = exitButton.closest('button, [role="button"], a') || exitButton;
          await clickElement(clickable);
          await sleep(260);
        }
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
        await sleep(120);
      };

      const readComboboxLabel = (btn) => {
        if (!btn) return '';
        const directSpan = btn.querySelector(':scope > span');
        const directText = norm(directSpan?.textContent || '');
        if (directText) return directText;
        return norm(btn.getAttribute('aria-label') || btn.textContent);
      };

      const getToolControls = () => {
        const controls = Array.from(document.querySelectorAll('button[role="combobox"], button[aria-haspopup], button, [role="button"]')).filter(isVisible);
        return controls.filter((el) => {
          const txt = readComboboxLabel(el);
          return knownTools.some((toolItem) => txt.includes(toolItem));
        });
      };

      const findToolCombobox = () => {
        const controls = getToolControls();
        return controls[0] || null;
      };

      const currentToolFromCombobox = (btn) => {
        if (!btn) return '';
        const primary = extractKnownTool(readComboboxLabel(btn));
        if (primary) return primary;
        return extractKnownTool(btn.getAttribute('aria-label') || readComboboxLabel(btn));
      };

      const switchSurfaceIfNeeded = async (currentTool) => {
        const wantsImage = wantedCompact.includes('createimage');
        const wantsVideo = wantedCompact.includes('ingredientstovideo') || wantedCompact.includes('imagetovideo') || wantedCompact.includes('framestovideo') || wantedCompact.includes('texttovideo');
        const currentIsImage = compact(currentTool || '').includes('createimage');
        const currentIsVideo = !currentIsImage && Boolean(currentTool);
        if ((wantsImage && currentIsImage) || (wantsVideo && currentIsVideo)) return;

        const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVisible);
        const target = buttons.find((el) => {
          const label = norm(el.getAttribute('aria-label') || el.textContent);
          if (wantsImage) return label.includes('imageimages') || label === 'images' || label.includes(' image');
          if (wantsVideo) return label.includes('videocamvideos') || label === 'videos' || label.includes(' video');
          return false;
        });
        if (target) {
          await clickElement(target);
          await sleep(280);
        }
      };

      const pickFromMenuUsingCombobox = async (combobox) => {
        if (!combobox) return false;
        const controlsId = String(combobox.getAttribute('aria-controls') || '').trim();
        if (!controlsId) {
          const fallbackRoots = Array.from(document.querySelectorAll('[role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]')).filter(isVisible);
          for (const root of fallbackRoots) {
            const options = Array.from(root.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], li, button, [role="button"], label, span'));
            const match = options.find((el) => {
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') return false;
              const text = el.getAttribute('aria-label') || el.textContent;
              return textMatches(text);
            });
            if (match) {
              const clickable = match.closest('[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], li, button, [role="button"], label') || match;
              await clickElement(clickable);
              await sleep(320);
              return true;
            }
          }
          return false;
        }

        for (let i = 0; i < 6; i += 1) {
          const root = document.getElementById(controlsId);
          if (!root) {
            await sleep(160);
            continue;
          }
          const options = Array.from(root.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], li, button, [role="button"], label, span'));
          const match = options.find((el) => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            const text = el.getAttribute('aria-label') || el.textContent;
            return textMatches(text);
          });
          if (!match) {
            await sleep(120);
            continue;
          }
          const clickable = match.closest('[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], li, button, [role="button"], label') || match;
          await clickElement(clickable);
          await sleep(320);
          return true;
        }
        return false;
      };

      const pickToolFromVisibleMenus = async () => {
        const menuRoots = Array.from(document.querySelectorAll('[role="listbox"], [role="menu"], [data-radix-popper-content-wrapper], [role="dialog"]')).filter(isVisible);
        for (const root of menuRoots) {
          const options = Array.from(root.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], li, button, [role="button"], label, span'));
          const match = options.find((el) => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            const text = el.getAttribute('aria-label') || el.textContent;
            return textMatches(text);
          });
          if (!match) continue;
          const clickable = match.closest('[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], li, button, [role="button"], label') || match;
          await clickElement(clickable);
          await sleep(320);
          return true;
        }
        return false;
      };

      const tryOpenToolMenuAndPick = async () => {
        if (await pickToolFromVisibleMenus()) return true;

        const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVisible);
        const addButton = buttons.find((el) => {
          const label = norm(el.getAttribute('aria-label') || el.textContent);
          return label === '+' || label.includes('add') || label.includes('tool');
        }) || null;
        if (!addButton) return false;

        await clickElement(addButton);
        await sleep(220);
        return pickToolFromVisibleMenus();
      };

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await closeImagePreviewIfNeeded();
        const pickedFromMenu = await tryOpenToolMenuAndPick();
        if (pickedFromMenu) {
          return {
            success: true,
            label: toolName,
            pickedFromMenu: true
          };
        }

        const combobox = findToolCombobox();
        if (!combobox) {
          await sleep(220);
          continue;
        }

        const currentTool = currentToolFromCombobox(combobox);
        if (currentTool && textMatches(currentTool)) {
          return {
            success: true,
            label: String(combobox.textContent || combobox.getAttribute('aria-label') || '').trim(),
            alreadySelected: true
          };
        }

        await switchSurfaceIfNeeded(currentTool);

        const reloadedCombobox = findToolCombobox() || combobox;
        const reloadedTool = currentToolFromCombobox(reloadedCombobox);
        if (reloadedTool && textMatches(reloadedTool)) {
          return {
            success: true,
            label: String(reloadedCombobox.textContent || reloadedCombobox.getAttribute('aria-label') || '').trim(),
            alreadySelected: true
          };
        }

        await clickElement(reloadedCombobox);
        await sleep(260);
        const picked = await pickFromMenuUsingCombobox(reloadedCombobox);
        if (!picked) {
          await sleep(180);
          continue;
        }

        const verifyBox = findToolCombobox() || reloadedCombobox;
        const verifyTool = currentToolFromCombobox(verifyBox);
        if (verifyTool && textMatches(verifyTool)) {
          return {
            success: true,
            label: String(verifyBox.textContent || verifyBox.getAttribute('aria-label') || '').trim()
          };
        }

        await sleep(220);
      }

      const controls = getToolControls().map((btn) => readComboboxLabel(btn)).filter(Boolean);
      return { success: false, error: `Flow tool not found: ${toolName}`, labels: controls.slice(0, 40) };
    },
    args: [targetTool]
  });

  const result = results[0]?.result;
  if (!result?.success) {
    return {
      success: false,
      tabId: resolvedTabId,
      error: result?.error || 'Failed to select Flow tool',
      details: result || null
    };
  }

  return {
    success: true,
    tabId: resolvedTabId,
    tool: targetTool,
    label: result.label || targetTool
  };
}

async function flowCountImageTiles(tabId, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: () => {
      const norm = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const isVisible = (el) => {
        if (!el) return false;
        let node = el;
        for (let depth = 0; depth < 10 && node; depth += 1) {
          const ariaHidden = String(node.getAttribute?.('aria-hidden') || '').toLowerCase();
          const dataAriaHidden = String(node.getAttribute?.('data-aria-hidden') || '').toLowerCase();
          if (ariaHidden === 'true' || dataAriaHidden === 'true') return false;
          node = node.parentElement;
        }
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const tiles = Array.from(document.querySelectorAll('button, [role="button"], [role="option"], li, div'))
        .filter(isVisible)
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 28 || rect.height < 28 || rect.width > 280 || rect.height > 280) return false;
          return Boolean(el.querySelector('img, canvas, video'));
        });

      const progressNodes = Array.from(document.querySelectorAll('span, div, p, [role="status"]')).filter(isVisible);
      const hasPercentProgress = progressNodes.some((el) => /\b\d{1,3}%\b/.test(String(el.textContent || '').trim()));

      const pageText = norm(document.body?.innerText || '');
      const hasGeneratingText = pageText.includes('generating') || pageText.includes('rendering') || pageText.includes('processing');

      return { success: true, count: tiles.length, hasPercentProgress, hasGeneratingText };
    }
  });

  const result = results[0]?.result;
  return {
    success: Boolean(result?.success),
    tabId: resolvedTabId,
    count: Number(result?.count || 0),
    hasPercentProgress: Boolean(result?.hasPercentProgress),
    hasGeneratingText: Boolean(result?.hasGeneratingText)
  };
}

async function flowWaitForImageReady(tabId, projectId, baselineCount, timeoutMs = 90000) {
  const start = Date.now();
  let lastCount = Number(baselineCount || 0);
  let sawGenerationSignals = false;

  while (Date.now() - start < timeoutMs) {
    const now = await flowCountImageTiles(tabId, projectId);
    if (now?.success) {
      lastCount = now.count;
      if (now.count > baselineCount) {
        return {
          success: true,
          tabId: now.tabId,
          baselineCount,
          currentCount: now.count,
          completion: 'new_tile_detected',
          waitedMs: Date.now() - start
        };
      }

      const hasSignals = Boolean(now.hasPercentProgress || now.hasGeneratingText);
      if (hasSignals) {
        sawGenerationSignals = true;
      } else if (sawGenerationSignals) {
        return {
          success: true,
          tabId: now.tabId,
          baselineCount,
          currentCount: now.count,
          completion: 'generation_signals_cleared',
          waitedMs: Date.now() - start
        };
      }
    }
    await new Promise((r) => setTimeout(r, 900));
  }

  return {
    success: false,
    error: 'Timed out waiting for generated image tile',
    baselineCount,
    currentCount: lastCount,
    sawGenerationSignals,
    waitedMs: Date.now() - start
  };
}

async function flowClearSelectedIngredients(tabId, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const isVisible = (el) => {
        if (!el) return false;
        let node = el;
        for (let depth = 0; depth < 10 && node; depth += 1) {
          const ariaHidden = String(node.getAttribute?.('aria-hidden') || '').toLowerCase();
          const dataAriaHidden = String(node.getAttribute?.('data-aria-hidden') || '').toLowerCase();
          if (ariaHidden === 'true' || dataAriaHidden === 'true') return false;
          node = node.parentElement;
        }
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const click = (el) => {
        el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const selectedTiles = Array.from(document.querySelectorAll('[aria-selected="true"], [aria-pressed="true"], [data-selected="true"]'))
        .filter(isVisible)
        .filter((el) => Boolean(el.querySelector('img, canvas, video')));

      let cleared = 0;
      for (const tile of selectedTiles.slice(0, 8)) {
        click(tile);
        cleared += 1;
        await sleep(80);
      }

      const removeButtons = Array.from(document.querySelectorAll('button, [role="button"]'))
        .filter(isVisible)
        .filter((el) => {
          const label = norm(el.getAttribute('aria-label') || el.textContent);
          if (!label) return false;
          if (label.includes('generate') || label.includes('create') || label.includes('send')) return false;
          return label.includes('remove') || label.includes('clear') || label.includes('deselect') || label.includes('delete');
        });

      for (const btn of removeButtons.slice(0, 8)) {
        click(btn);
        cleared += 1;
        await sleep(80);
      }

      return { success: true, cleared };
    }
  });

  const result = results[0]?.result;
  return {
    success: Boolean(result?.success),
    tabId: resolvedTabId,
    cleared: Number(result?.cleared || 0)
  };
}

async function flowSelectLatestImageIngredient(tabId, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const clickElement = async (el) => {
        if (!el) return;
        el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const countAttachedMediaChips = () => {
        const chips = Array.from(document.querySelectorAll('button[data-card-open], [data-card-open]')).filter(isVisible);
        return chips.length;
      };

      const getOpenAssetRows = (controlsId) => {
        const scopedDialog = controlsId ? document.getElementById(controlsId) : null;
        const scopedList = scopedDialog?.querySelector('[data-testid="virtuoso-item-list"]')
          || document.querySelector('[role="dialog"][data-state="open"] [data-testid="virtuoso-item-list"]');
        const list = scopedList || document.querySelector('[role="dialog"] [data-testid="virtuoso-item-list"]') || document.querySelector('[data-testid="virtuoso-item-list"]');
        if (!list || !isVisible(list)) return [];
        return Array.from(list.querySelectorAll('[data-index]')).filter(isVisible);
      };

      const isReferenceButton = (el) => {
        if (!el || !isVisible(el)) return false;
        const label = norm(el.getAttribute('aria-label') || el.textContent || '');
        if (!label) return false;
        if (label.includes('preference') || label.includes('reference docs')) return false;
        return label === 'ref' || label.includes(' reference') || label.includes('add reference') || label.includes('ref with');
      };

      const findReferenceDialogTrigger = () => {
        const candidates = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"], [role="button"][aria-haspopup="dialog"], button, [role="button"]')).filter(isVisible);
        const direct = candidates.find((el) => isReferenceButton(el));
        if (direct) return direct;

        const withRefIcon = candidates.find((el) => {
          const iconText = norm(Array.from(el.querySelectorAll('i, span')).map((n) => n.textContent || '').join(' '));
          return iconText.includes('reference') || iconText.includes('ref');
        });
        return withRefIcon || null;
      };

      const findInboxAssetDialogTrigger = () => {
        const isAdd2Button = (el) => {
          const iconText = norm(Array.from(el.querySelectorAll('i, span')).map((n) => n.textContent || '').join(' '));
          const label = norm(el.getAttribute('aria-label') || el.textContent || '');
          return iconText.includes('add_2') || label === 'create' || label.includes(' add ');
        };

        const composerStarts = Array.from(document.querySelectorAll('[data-scroll-state="START"], [data-scroll-state="start"]')).filter(isVisible);
        for (const start of composerStarts) {
          let node = start;
          for (let depth = 0; depth < 8 && node; depth += 1) {
            const hasTextbox = Boolean(node.querySelector('[role="textbox"][data-slate-editor="true"]'));
            if (hasTextbox) {
              const candidates = Array.from(node.querySelectorAll('button[aria-haspopup="dialog"], [role="button"][aria-haspopup="dialog"]')).filter(isVisible);
              const add2 = candidates.find((btn) => {
                const ariaControls = norm(btn.getAttribute('aria-controls') || '');
                return ariaControls.startsWith('radix-') && isAdd2Button(btn);
              });
              if (add2) return add2;
            }
            node = node.parentElement;
          }
        }

        const triggerCandidates = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"], [role="button"][aria-haspopup="dialog"]')).filter(isVisible);
        return triggerCandidates.find((el) => {
          const ariaControls = norm(el.getAttribute('aria-controls') || '');
          return ariaControls.startsWith('radix-') && isAdd2Button(el);
        }) || null;
      };

      const ensureAssetRowsReady = async () => {
        const refTrigger = findReferenceDialogTrigger();
        const inboxTrigger = findInboxAssetDialogTrigger();
        const triggers = [];
        if (refTrigger) triggers.push({ kind: 'reference', el: refTrigger });
        if (inboxTrigger && inboxTrigger !== refTrigger) triggers.push({ kind: 'inbox', el: inboxTrigger });

        let controlsId = String(refTrigger?.getAttribute('aria-controls') || inboxTrigger?.getAttribute('aria-controls') || '').trim();
        let openedWithTrigger = false;
        let openedBy = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const rows = getOpenAssetRows(controlsId);
          if (rows.length > 0) return { rows, controlsId, openedWithTrigger, openedBy };

          const candidate = attempt < triggers.length ? triggers[attempt] : null;
          if (candidate) {
            await clickElement(candidate.el);
            await sleep(120);
            controlsId = String(candidate.el.getAttribute('aria-controls') || controlsId || '').trim();
            openedWithTrigger = String(candidate.el.getAttribute('aria-expanded') || '').toLowerCase() === 'true'
              || String(candidate.el.getAttribute('data-state') || '').toLowerCase() === 'open';
            if (openedWithTrigger || getOpenAssetRows(controlsId).length > 0) {
              openedBy = candidate.kind;
            }
          }

          await sleep(140);
        }
        return { rows: [], controlsId, openedWithTrigger, openedBy };
      };

      const pickLatestRow = (rows) => {
        if (!rows.length) return null;
        const withIndex = rows
          .map((row) => ({ row, idx: Number.parseInt(String(row.getAttribute('data-index') || ''), 10) }))
          .filter((entry) => Number.isFinite(entry.idx));
        if (withIndex.length > 0) {
          withIndex.sort((a, b) => a.idx - b.idx);
          return withIndex[0].row;
        }
        return rows[0];
      };

      const closePreview = async () => {
        const controls = Array.from(document.querySelectorAll('button, [role="button"], a')).filter(isVisible);
        const exit = controls.find((el) => {
          const label = norm(el.getAttribute('aria-label') || el.textContent);
          return label === 'exit' || label === 'close';
        });
        if (exit) {
          await clickElement(exit);
          await sleep(180);
        }
      };

      await closePreview();

      const beforeAttached = countAttachedMediaChips();
      const dialogState = await ensureAssetRowsReady();
      const rows = dialogState.rows;
      const latestRow = pickLatestRow(rows);
      if (latestRow) {
        const rowTarget = latestRow.firstElementChild || latestRow;
        await clickElement(rowTarget);
        await sleep(260);

        for (let verifyAttempt = 0; verifyAttempt < 10; verifyAttempt += 1) {
          const afterAttached = countAttachedMediaChips();
          if (afterAttached > beforeAttached || afterAttached > 0) {
            return {
              success: true,
              candidateCount: rows.length,
              selectedBy: 'dialog_virtuoso_latest',
              dialogOpened: dialogState.openedWithTrigger,
              dialogOpenedBy: dialogState.openedBy,
              dialogControlsId: dialogState.controlsId || null,
              beforeAttached,
              afterAttached,
            };
          }
          await sleep(120);
        }

        return {
          success: true,
          candidateCount: rows.length,
          selectedBy: 'dialog_virtuoso_clicked_no_chip_change',
          dialogOpened: dialogState.openedWithTrigger,
          dialogOpenedBy: dialogState.openedBy,
          dialogControlsId: dialogState.controlsId || null,
          beforeAttached,
          afterAttached: countAttachedMediaChips(),
        };
      }

      const candidates = Array.from(document.querySelectorAll('button, [role="button"], [role="option"], li, div'))
        .filter(isVisible)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const label = norm(el.getAttribute('aria-label') || el.textContent);
          const img = el.querySelector('img, canvas, video');
          const hasMedia = Boolean(img);
          const likelyThumb = hasMedia && rect.width <= 260 && rect.height <= 260 && rect.width >= 28 && rect.height >= 28;
          const blocked = label.includes('download') || label.includes('edit image') || label.includes('add to prompt') || label.includes('generate') || label.includes('create');
          return { el, rect, label, likelyThumb, blocked };
        })
        .filter((x) => x.likelyThumb && !x.blocked);

      candidates.sort((a, b) => {
        if (a.rect.top !== b.rect.top) return b.rect.top - a.rect.top;
        return b.rect.left - a.rect.left;
      });

      const target = candidates[0]?.el || null;
      if (!target) {
        return {
          success: false,
          error: 'No image ingredient candidate found',
          candidateCount: candidates.length,
          dialogRows: rows.length,
          dialogOpened: dialogState.openedWithTrigger,
          dialogOpenedBy: dialogState.openedBy,
          dialogControlsId: dialogState.controlsId || null,
        };
      }

      await clickElement(target);
      await sleep(220);
      return { success: true, candidateCount: candidates.length, selectedBy: 'legacy_fallback' };
    }
  });

  const result = results[0]?.result;
  if (!result?.success) {
    return {
      success: false,
      tabId: resolvedTabId,
      error: result?.error || 'Failed to select image ingredient',
      details: result || null
    };
  }

  return {
    success: true,
    tabId: resolvedTabId,
    candidateCount: result.candidateCount || 0,
    selectedBy: result.selectedBy || 'unknown',
    beforeAttached: Number(result.beforeAttached || 0),
    afterAttached: Number(result.afterAttached || 0),
  };
}

async function flowSubmitPrompt(tabId, prompt, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const text = String(prompt || '').trim();
  if (!text) {
    return { success: false, tabId: resolvedTabId, error: 'Missing prompt' };
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async (message) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const norm = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const compact = (txt) => norm(txt).replace(/[^a-z0-9]+/g, '');
      const sanitizeEditableText = (text) => {
        const cleaned = String(text || '')
          .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        return cleaned
          .replace(/^what do you want to create\?\s*/i, '')
          .replace(/^start creating\s*/i, '')
          .trim();
      };

      const readSlateStringText = (el) => {
        if (!el || typeof el.querySelectorAll !== 'function') return '';
        const leaves = Array.from(el.querySelectorAll('[data-slate-string="true"]'));
        if (leaves.length === 0) return '';
        return sanitizeEditableText(leaves.map((leaf) => String(leaf.textContent || '')).join(' '));
      };

      const readInputValue = (el) => {
        if (!el) return '';
        if (el.getAttribute('contenteditable') === 'true' || el.tagName === 'DIV') {
          const slateText = readSlateStringText(el);
          if (slateText) return slateText;
          return sanitizeEditableText(el.textContent || '');
        }
        return String(el.value || '').trim();
      };

      const isEditImageContext = (el) => {
        const context = el?.closest('section, form, [role="dialog"], [data-radix-popper-content-wrapper], div');
        const text = norm(context?.textContent || '');
        return text.includes('edit image') || text.includes('annotations') || text.includes('add to prompt');
      };

      const startComposers = Array.from(document.querySelectorAll('[data-scroll-state="START"], [data-scroll-state="start"]')).filter(isVisible);
      const composerContainer = startComposers.find((node) => node.querySelector('div[role="textbox"][contenteditable="true"][data-slate-editor="true"], [role="textbox"][contenteditable="true"], textarea')) || null;

      let input = composerContainer
        ? Array.from(composerContainer.querySelectorAll('div[role="textbox"][contenteditable="true"][data-slate-editor="true"], [role="textbox"][contenteditable="true"], textarea')).find((el) => isVisible(el) && !isEditImageContext(el)) || null
        : null;

      if (!input) {
        const fallbackInputs = Array.from(document.querySelectorAll('div[role="textbox"][contenteditable="true"][data-slate-editor="true"], [role="textbox"][contenteditable="true"], textarea'))
          .filter((el) => isVisible(el) && !isEditImageContext(el));
        input = fallbackInputs[0] || null;
      }

      if (!input) {
        return { success: false, error: 'Flow prompt input not found' };
      }

      const beforeValue = readInputValue(input);
      const composerRoot = composerContainer || input.closest('[data-scroll-state="START"], [data-scroll-state="start"], form, [role="form"], section, article, [data-radix-popper-content-wrapper], div') || input.parentElement || document.body;
      const shouldType = !beforeValue || !compact(beforeValue).includes(compact(message));

      const writeSlateText = (editorEl, value) => {
        if (!editorEl) return;
        const slateString = editorEl.querySelector('[data-slate-string="true"]');
        if (!slateString) return;
        slateString.textContent = value;
      };

      const clickButtonLikeUser = (el) => {
        if (!el) return;
        const overlay = el.querySelector('[data-type="button-overlay"]');
        const target = overlay || el;
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const getVisiblePromptRequiredErrorCount = () => {
        const nodes = Array.from(document.querySelectorAll('[role="alert"], [aria-live], div, span, p'));
        return nodes.filter((el) => {
          if (!isVisible(el)) return false;
          const txt = norm(el.textContent || '');
          return txt.includes('prompt must be provided');
        }).length;
      };

      const baselinePromptErrorCount = getVisiblePromptRequiredErrorCount();

      if (shouldType) {
        if (typeof input.click === 'function') input.click();
        input.focus();
        const isEditable = input.getAttribute('contenteditable') === 'true' || input.tagName === 'DIV';
        if (isEditable) {
          const slateEditor = input.getAttribute('data-slate-editor') === 'true';
          if (slateEditor) {
            writeSlateText(input, message);
            input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: message }));
            input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
          } else {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(input);
            selection?.removeAllRanges();
            selection?.addRange(range);
            const inserted = document.execCommand && document.execCommand('insertText', false, message);
            if (!inserted) {
              input.textContent = message;
              input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: message }));
              input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
            }
          }
        } else {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (input.tagName === 'TEXTAREA' && setter) setter.call(input, message);
          else if (inputSetter) inputSetter.call(input, message);
          else input.value = message;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      if (typeof input.click === 'function') input.click();
      input.focus();

      await sleep(180);

      const isSubmitButtonCandidate = (btn) => {
        if (!btn || !isVisible(btn)) return false;
        const label = norm(btn.getAttribute('aria-label') || btn.textContent);
        const blocked =
          label.includes('download') ||
          label.includes('edit image') ||
          label.includes('add to prompt') ||
          label.includes('add media') ||
          label.includes('scenebuilder') ||
          label.includes('upload') ||
          label.includes('attach') ||
          label === 'add' ||
          label === '+' ||
          label === 'add_2' ||
          label === 'exit';
        if (blocked) return false;
        const iconText = norm(btn.querySelector('.material-symbols-outlined, .material-icons')?.textContent || '');
        const iconLabel = norm(btn.querySelector('svg')?.getAttribute('aria-label') || btn.querySelector('[aria-label]')?.getAttribute('aria-label') || '');
        const hasForward = iconText.includes('arrow_forward') || label.includes('arrow_forward') || iconLabel.includes('arrow_forward');
        if (hasForward) return true;
        if (label.includes('generate') || label.includes('create') || label.includes('send')) return true;
        return iconLabel.includes('send') || iconLabel.includes('generate');
      };

      const getNearestSendButton = () => {
        const inputRect = input.getBoundingClientRect();
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isSubmitButtonCandidate);
        let winner = null;
        let bestScore = Number.POSITIVE_INFINITY;
        for (const btn of buttons) {
          const rect = btn.getBoundingClientRect();
          const dx = Math.abs(rect.left - inputRect.right);
          const dy = Math.abs(rect.top - inputRect.bottom);
          const score = dx + dy;
          if (score < bestScore) {
            bestScore = score;
            winner = btn;
          }
        }
        return winner;
      };

      const getSend = () => {
        const localButtons = Array.from(composerRoot.querySelectorAll('button, [role="button"]')).filter(isSubmitButtonCandidate);
        const preferForward = localButtons.find((btn) => {
          const label = norm(btn.getAttribute('aria-label') || btn.textContent);
          const iconText = norm(btn.querySelector('.material-symbols-outlined, .material-icons')?.textContent || '');
          return iconText.includes('arrow_forward') || label.includes('arrow_forward');
        });
        if (preferForward && !preferForward.disabled && String(preferForward.getAttribute('aria-disabled') || '').toLowerCase() !== 'true') {
          return preferForward;
        }
        const enabledLocal = localButtons.find((btn) => !btn.disabled && String(btn.getAttribute('aria-disabled') || '').toLowerCase() !== 'true');
        if (enabledLocal) return enabledLocal;
        if (localButtons.length > 0) return localButtons[0];

        const nearest = getNearestSendButton();
        if (nearest) return nearest;

        const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isSubmitButtonCandidate);
        return buttons[0] || null;
      };

      const hasStartedGeneration = () => {
        const scopeText = norm(composerRoot?.textContent || document.body?.textContent || '');
        if (scopeText.includes('generating') || scopeText.includes('stop generating') || scopeText.includes('cancel generation')) {
          return true;
        }
        return Boolean(composerRoot?.querySelector('[aria-busy="true"], [data-state="loading"], [data-loading="true"]'));
      };

      const submitted = async (allowNoSignal = false) => {
        const start = Date.now();
        const baseline = compact(beforeValue);
        while (Date.now() - start < 3500) {
          const visiblePromptErrorCount = getVisiblePromptRequiredErrorCount();
          if (visiblePromptErrorCount > baselinePromptErrorCount) {
            return false;
          }

          const nowValue = compact(readInputValue(input));
          if (!nowValue || nowValue !== baseline) return true;

          if (hasStartedGeneration()) return true;

          const send = getSend();
          const disabled = Boolean(send?.disabled) || String(send?.getAttribute('aria-disabled') || '').toLowerCase() === 'true';
          if (disabled) return true;

          if (allowNoSignal && Date.now() - start >= 800) {
            return true;
          }

          await sleep(120);
        }
        if (allowNoSignal && getVisiblePromptRequiredErrorCount() <= baselinePromptErrorCount) {
          return true;
        }
        return false;
      };

      const tryKeyboardSubmit = async () => {
        const keyVariants = [
          { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true },
          { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, ctrlKey: true },
          { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, metaKey: true }
        ];

        for (const payload of keyVariants) {
          input.dispatchEvent(new KeyboardEvent('keydown', payload));
          input.dispatchEvent(new KeyboardEvent('keyup', payload));
          const ok = await submitted(false);
          if (ok) return true;
        }
        return false;
      };

      const send = getSend();
      if (send && !send.disabled) {
        clickButtonLikeUser(send);
        const ok = await submitted(true);
        if (ok) {
          return { success: true, method: 'button' };
        }

        const keyboardFallback = await tryKeyboardSubmit();
        return keyboardFallback
          ? { success: true, method: 'button+enter-fallback' }
          : { success: false, error: 'Prompt not submitted after button click and keyboard fallback' };
      }

      const ok = await tryKeyboardSubmit();
      return ok
        ? { success: true, method: 'enter' }
        : { success: false, error: 'Prompt not submitted after keyboard submit attempts' };
    },
    args: [text]
  });

  const result = results[0]?.result;
  if (!result?.success) {
    return {
      success: false,
      tabId: resolvedTabId,
      error: result?.error || 'Failed to submit Flow prompt',
      details: result || null
    };
  }

  return {
    success: true,
    tabId: resolvedTabId,
    method: result.method || 'unknown',
    prompt: text
  };
}

async function flowConfigureCreateImage(tabId, options = {}, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const aspectRatio = String(options?.aspectRatio || '').trim();
  const outputsPerPrompt = String(options?.outputsPerPrompt || '').trim();
  const model = String(options?.model || '').trim();

  const toolProbe = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: () => {
      const norm = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const boxes = Array.from(document.querySelectorAll('button[role="combobox"]'));
      const toolBox = boxes.find((btn) => {
        const txt = norm(btn.getAttribute('aria-label') || btn.textContent);
        return txt.includes('create image') || txt.includes('ingredients to video') || txt.includes('frames to video') || txt.includes('text to video');
      }) || null;
      const label = norm(toolBox?.querySelector(':scope > span')?.textContent || toolBox?.getAttribute('aria-label') || toolBox?.textContent || '');
      return {
        found: Boolean(toolBox),
        label,
        createImageActive: label.includes('create image')
      };
    }
  });

  const toolState = toolProbe[0]?.result;
  if (!toolState?.found) {
    return {
      success: false,
      tabId: resolvedTabId,
      error: 'Flow tool selector not found',
      details: toolState || null
    };
  }

  const runConfigAttempt = async () => {
    const results = await chrome.scripting.executeScript({
      target: { tabId: resolvedTabId },
      func: async (cfg) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const compact = (txt) => norm(txt).replace(/[^a-z0-9]+/g, '');
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const clickByText = async (container, wanted) => {
        const targetText = norm(wanted);
        const targetCompact = compact(wanted);
        const candidates = Array.from(container.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], li, button, [role="button"], label, span'))
          .filter(isVisible);
        const match = candidates.find((el) => {
          const raw = el.getAttribute('aria-label') || el.textContent;
          const label = norm(raw);
          const labelCompact = compact(raw);
          return label === targetText || label.includes(targetText) || labelCompact === targetCompact || labelCompact.includes(targetCompact);
        });
        if (!match) return false;
        const clickable = match.closest('[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], li, button, [role="button"], label') || match;
        clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        clickable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        clickable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        clickable.click();
        await sleep(260);
        return true;
      };

      const readFieldText = (field) => compact(field?.getAttribute('aria-label') || field?.textContent);

      const getMenuRootsForField = (field) => {
        const controlsId = String(field?.getAttribute('aria-controls') || '').trim();
        if (controlsId) {
          const controlled = document.getElementById(controlsId);
          if (controlled && isVisible(controlled)) return [controlled];
        }
        return Array.from(document.querySelectorAll('[role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]')).filter(isVisible);
      };

      const findSettingsTrigger = () => {
        const settingsButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVisible);
        return settingsButtons.find((el) => {
          const label = norm(el.getAttribute('aria-label') || el.textContent);
          return label.includes('settings') || label === 'tune' || label.includes('tune');
        }) || null;
      };

      const findSettingsPanel = () => {
        const panelRoots = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper], [role="dialog"], [role="listbox"]')).filter(isVisible);
        return panelRoots.find((el) => {
          const text = norm(el.textContent);
          const hasExpectedLabels = text.includes('model') || text.includes('aspect ratio') || text.includes('outputs per prompt');
          if (!hasExpectedLabels) return false;
          const combos = Array.from(el.querySelectorAll('button[role="combobox"], [role="combobox"]')).filter(isVisible);
          return combos.length >= 1;
        }) || null;
      };

      const dispatchEscape = (target) => {
        if (!target || typeof target.dispatchEvent !== 'function') return;
        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      };

      const clickOutsidePanel = (panel) => {
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        const x = Math.max(2, Math.floor(rect.left - 12));
        const y = Math.max(2, Math.floor(rect.top - 12));
        const target = document.elementFromPoint(x, y) || document.body;
        const events = ['pointerdown', 'mousedown', 'mouseup', 'click', 'pointerup'];
        for (const type of events) {
          target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        }
      };

      const closeSettingsPanel = async () => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          let panel = findSettingsPanel();
          if (!panel) return true;

          dispatchEscape(document.activeElement || document.body);
          dispatchEscape(document);
          await sleep(120);

          panel = findSettingsPanel();
          if (!panel) return true;

          clickOutsidePanel(panel);
          await sleep(140);

          panel = findSettingsPanel();
          if (!panel) return true;

          const trigger = findSettingsTrigger();
          const expanded = String(trigger?.getAttribute('aria-expanded') || '').toLowerCase();
          if (trigger && expanded === 'true') {
            trigger.click();
            await sleep(160);
            panel = findSettingsPanel();
            if (!panel) return true;
          }
        }
        return !findSettingsPanel();
      };

      const finalize = async (result) => {
        const settingsClosed = await closeSettingsPanel();
        return {
          ...result,
          settingsClosed
        };
      };

      let panel = null;
      for (let i = 0; i < 4; i += 1) {
        const trigger = findSettingsTrigger();
        if (!trigger) break;
        trigger.click();
        await sleep(320);
        panel = findSettingsPanel();
        if (panel) break;
      }

      if (!panel) {
        return { success: false, error: 'Create Image settings panel not found (UI may be loading)' };
      }

      const applied = { aspectRatio: false, outputsPerPrompt: false, model: false };

      const pickSelectValue = async (labelText, valueText, fallbackIndex) => {
        if (!valueText) return true;
        const wantedCompact = compact(valueText);

        for (let attempt = 0; attempt < 4; attempt += 1) {
          panel = findSettingsPanel() || panel;
          const panelNode = panel || document.body;
          const fields = Array.from(panelNode.querySelectorAll('button[role="combobox"], [role="combobox"], button, [role="button"]')).filter(isVisible);

          let field = fields.find((el) => {
            const txt = norm(el.getAttribute('aria-label') || el.textContent);
            return txt.includes(norm(labelText));
          });

          if (!field && Number.isInteger(fallbackIndex)) {
            const combos = Array.from(panelNode.querySelectorAll('button[role="combobox"], [role="combobox"]')).filter(isVisible);
            field = combos[fallbackIndex] || null;
          }

          if (!field) {
            await sleep(260);
            continue;
          }

          field.click();
          await sleep(260);

          const menuRoots = getMenuRootsForField(field);
          let picked = false;
          for (const root of menuRoots) {
            const ok = await clickByText(root, valueText);
            if (ok) {
              picked = true;
              break;
            }
          }

          if (!picked) {
            await sleep(220);
            continue;
          }

          await sleep(260);
          const fieldText = readFieldText(field);
          if (!wantedCompact || fieldText.includes(wantedCompact)) {
            return true;
          }

          const refreshedFieldText = readFieldText(field);
          if (!wantedCompact || refreshedFieldText.includes(wantedCompact)) {
            return true;
          }
        }
        return false;
      };

      const steps = [
        { key: 'model', label: 'model', value: cfg.model, fallbackIndex: 2 },
        { key: 'aspectRatio', label: 'aspect ratio', value: cfg.aspectRatio, fallbackIndex: 0 },
        { key: 'outputsPerPrompt', label: 'outputs per prompt', value: cfg.outputsPerPrompt, fallbackIndex: 1 }
      ];

      for (const step of steps) {
        if (!step.value) {
          applied[step.key] = true;
          continue;
        }
        applied[step.key] = await pickSelectValue(step.label, step.value, step.fallbackIndex);
        if (!applied[step.key]) {
          return await finalize({
            success: false,
            applied,
            failedSetting: step.key
          });
        }
        await sleep(180);
      }

      return await finalize({
        success: applied.aspectRatio && applied.outputsPerPrompt && applied.model,
        applied
      });
      },
      args: [{ aspectRatio, outputsPerPrompt, model }]
    });

    return results[0]?.result || null;
  };

  let lastResult = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    lastResult = await runConfigAttempt();
    if (lastResult?.success) {
      return {
        success: true,
        tabId: resolvedTabId,
        applied: lastResult.applied,
        settingsClosed: Boolean(lastResult.settingsClosed),
        attempts: attempt + 1
      };
    }
    await new Promise((r) => setTimeout(r, 260));
  }

  return {
    success: false,
    tabId: resolvedTabId,
    error: 'Failed to apply one or more Create Image settings',
    details: lastResult || null
  };
}

async function flowSimulateImageToVideo(tabId, imagePrompt, videoPrompt, projectId, createImageOptions) {
  const imgPrompt = String(imagePrompt || '').trim();
  const vidPrompt = String(videoPrompt || '').trim();
  if (!imgPrompt || !vidPrompt) {
    return { success: false, error: 'Missing imagePrompt or videoPrompt' };
  }

  const step1 = await flowSelectTool(tabId, 'Create Image', projectId);
  if (!step1.success) return { success: false, stage: 'select_create_image', ...step1 };

  const stepClearCreate = await flowClearSelectedIngredients(tabId, projectId);

  let stepCfg = { success: true };
  if (createImageOptions && typeof createImageOptions === 'object') {
    stepCfg = await flowConfigureCreateImage(tabId, createImageOptions, projectId);
    if (!stepCfg.success) return { success: false, stage: 'configure_create_image', ...stepCfg };
  }

  const baselineTiles = await flowCountImageTiles(tabId, projectId);

  const step2 = await flowSubmitPrompt(tabId, imgPrompt, projectId);
  if (!step2.success) return { success: false, stage: 'submit_image_prompt', ...step2 };

  const stepWaitImage = await flowWaitForImageReady(tabId, projectId, baselineTiles.count, 90000);
  if (!stepWaitImage.success) return { success: false, stage: 'wait_image_generation', ...stepWaitImage };

  const videoToolCandidates = ['Frames to Video', 'Image to Video', 'Ingredients to Video'];
  let step3 = null;
  let selectedVideoTool = '';
  for (const candidate of videoToolCandidates) {
    const attempt = await flowSelectTool(tabId, candidate, projectId);
    if (attempt?.success) {
      step3 = attempt;
      selectedVideoTool = candidate;
      break;
    }
  }
  if (!step3?.success) {
    return { success: false, stage: 'select_video_tool', attemptedTools: videoToolCandidates, ...(step3 || {}) };
  }

  const stepClearVideo = await flowClearSelectedIngredients(tabId, projectId);

  const stepIngredient = await flowSelectLatestImageIngredient(tabId, projectId);
  if (!stepIngredient.success) return { success: false, stage: 'select_image_ingredient', ...stepIngredient };

  const step4 = await flowSubmitPrompt(tabId, vidPrompt, projectId);
  if (!step4.success) return { success: false, stage: 'submit_video_prompt', ...step4 };

  return {
    success: true,
    tabId: step4.tabId || step2.tabId || step1.tabId,
    steps: {
      selectCreateImage: step1.success,
      clearCreateAttachments: stepClearCreate.success,
      configureCreateImage: stepCfg.success,
      waitImageGeneration: stepWaitImage.success,
      submitImagePrompt: step2.success,
      selectedVideoTool,
      selectVideoTool: step3.success,
      clearVideoAttachments: stepClearVideo.success,
      selectImageIngredient: stepIngredient.success,
      submitVideoPrompt: step4.success
    }
  };
}

// ==========================================
// New Flow UI Commands (Veo 3.1, Ingredients Mode)
// ==========================================

async function flowControlMenuAction(tabId, projectId, action, value) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async (actionName, actionValue) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const compact = (txt) => norm(txt).replace(/[^a-z0-9]+/g, '');
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const clickLikeUser = (el) => {
        if (!el) return;
        const overlay = el.querySelector('[data-type="button-overlay"]');
        const target = overlay || el;
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const isMainControlButton = (btn) => {
        if (!isVisible(btn)) return false;
        if (btn.getAttribute('aria-haspopup') !== 'menu') return false;
        const txt = norm(btn.textContent || btn.getAttribute('aria-label') || '');
        const icon = norm(Array.from(btn.querySelectorAll('i, span')).map((n) => n.textContent || '').join(' '));
        if (icon.includes('add_2') || txt.includes('add_2')) return false;
        if (icon.includes('arrow_forward')) return false;
        return txt.includes('banana') || txt.includes('imagen') || txt.includes('veo') || txt.includes('landscape') || txt.includes('portrait') || txt.includes('x1') || txt.includes('x2') || txt.includes('x3') || txt.includes('x4');
      };

      const findMainControlButton = () => {
        const starts = Array.from(document.querySelectorAll('[data-scroll-state="START"], [data-scroll-state="start"]')).filter(isVisible);
        for (const start of starts) {
          let node = start;
          for (let depth = 0; depth < 6 && node; depth += 1) {
            const local = Array.from(node.querySelectorAll('button[aria-haspopup="menu"]')).filter(isMainControlButton);
            if (local[0]) return local[0];
            node = node.parentElement;
          }
        }

        const globalCandidates = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]')).filter(isMainControlButton);
        return globalCandidates[0] || null;
      };

      const openMainMenu = async () => {
        const controlBtn = findMainControlButton();
        if (!controlBtn) return { ok: false, error: 'Flow controls trigger not found' };

        const controlsId = String(controlBtn.getAttribute('aria-controls') || '').trim();
        const expanded = String(controlBtn.getAttribute('aria-expanded') || '').toLowerCase() === 'true'
          || String(controlBtn.getAttribute('data-state') || '').toLowerCase() === 'open';
        if (!expanded) {
          clickLikeUser(controlBtn);
          await sleep(140);
        }

        for (let i = 0; i < 10; i += 1) {
          const byId = controlsId ? document.getElementById(controlsId) : null;
          const openMenus = Array.from(document.querySelectorAll('[role="menu"][data-radix-menu-content][data-state="open"]')).filter(isVisible);
          const menu = (byId && isVisible(byId) ? byId : null)
            || openMenus.find((m) => m.querySelector('.flow_tab_slider_trigger'))
            || openMenus[0]
            || null;
          if (menu) {
            return { ok: true, menu, controlBtn, controlsId };
          }
          await sleep(120);
        }
        return { ok: false, error: 'Flow controls menu did not open', controlsId };
      };

      const clickTabInScope = async (scope, wantedLabel) => {
        const tabs = Array.from(scope.querySelectorAll('button[role="tab"], .flow_tab_slider_trigger')).filter(isVisible);
        const wanted = compact(wantedLabel);
        const target = tabs.find((tab) => {
          const txt = compact(tab.textContent || tab.getAttribute('aria-label') || '');
          const icon = compact(Array.from(tab.querySelectorAll('i, span')).map((n) => n.textContent || '').join(' '));
          return txt.includes(wanted) || icon.includes(wanted);
        }) || null;
        if (!target) return false;
        clickLikeUser(target);
        await sleep(120);
        return String(target.getAttribute('aria-selected') || '').toLowerCase() === 'true'
          || String(target.getAttribute('data-state') || '').toLowerCase() === 'active';
      };

      const findTablistByTokens = (menu, tokens) => {
        const tablists = Array.from(menu.querySelectorAll('[role="tablist"]')).filter(isVisible);
        const normalizedTokens = tokens.map((t) => compact(t));
        return tablists.find((tablist) => {
          const txt = compact(tablist.textContent || '');
          return normalizedTokens.every((token) => txt.includes(token));
        }) || null;
      };

      const clickTabByTablistTokens = async (menu, tablistTokens, wantedLabel) => {
        const tablist = findTablistByTokens(menu, tablistTokens);
        if (!tablist) return false;
        return clickTabInScope(tablist, wantedLabel);
      };

      const parseModelParts = (raw) => {
        const v = compact(raw);
        if (v === 'veo31fast') return ['veo', '3.1', 'fast'];
        if (v === 'veo31quality') return ['veo', '3.1', 'quality'];
        if (v === 'veo2fast') return ['veo', '2', 'fast'];
        if (v === 'veo2quality') return ['veo', '2', 'quality'];
        if (v === 'nanobananapro') return ['nano', 'banana', 'pro'];
        if (v === 'nanobanana2') return ['nano', 'banana', '2'];
        if (v === 'imagen4') return ['imagen', '4'];
        return String(raw || '').split(/[\s_-]+/).filter(Boolean);
      };

      const setModelFromMenu = async (menu, wantedModel) => {
        const modelBtn = Array.from(menu.querySelectorAll('button[aria-haspopup="menu"]')).filter(isVisible)[0] || null;
        if (!modelBtn) return { ok: false, error: 'Model dropdown trigger not found in controls menu' };

        const subId = String(modelBtn.getAttribute('aria-controls') || '').trim();
        clickLikeUser(modelBtn);
        await sleep(150);

        const parts = parseModelParts(wantedModel).map((x) => compact(x)).filter(Boolean);
        const optionMatches = (opt) => {
          const txt = compact(opt.textContent || opt.getAttribute('aria-label') || '');
          return parts.every((p) => txt.includes(p));
        };

        for (let i = 0; i < 20; i += 1) {
          const byId = subId ? document.getElementById(subId) : null;
          const allMenus = Array.from(document.querySelectorAll('[role="menu"][data-radix-menu-content]'));
          const openMenus = allMenus.filter((m) => isVisible(m) && String(m.getAttribute('data-state') || '').toLowerCase() === 'open');
          const candidateMenus = byId && isVisible(byId)
            ? [byId]
            : openMenus.filter((m) => m !== menu);

          let submenu = null;
          let option = null;
          let optionLabels = [];

          for (const candidate of candidateMenus) {
            const options = Array.from(candidate.querySelectorAll('[role="menuitem"], [data-radix-collection-item], button')).filter(isVisible);
            if (!options.length) continue;
            optionLabels = options.map((opt) => String(opt.textContent || opt.getAttribute('aria-label') || '').trim()).filter(Boolean);
            option = options.find(optionMatches) || null;
            if (option) {
              submenu = candidate;
              break;
            }
            if (!submenu) submenu = candidate;
          }

          if (!submenu) {
            if (i % 5 === 4) {
              clickLikeUser(modelBtn);
            }
            await sleep(120);
            continue;
          }

          if (!option) return { ok: false, error: `Model option not found: ${wantedModel}`, labels: optionLabels.slice(0, 10) };

          clickLikeUser(option.closest('button, [role="menuitem"], [data-radix-collection-item]') || option);
          await sleep(150);

          const selectedText = compact(modelBtn.textContent || modelBtn.getAttribute('aria-label') || '');
          const ok = parts.every((p) => selectedText.includes(p));
          return { ok, error: ok ? null : `Model select verify failed: ${wantedModel}` };
        }

        return { ok: false, error: 'Model submenu did not open' };
      };

      const opened = await openMainMenu();
      if (!opened.ok) return { success: false, error: opened.error };
      const { menu } = opened;

      if (actionName === 'select_image_tab') {
        const ok = await clickTabByTablistTokens(menu, ['image', 'video'], 'image');
        return ok ? { success: true, method: 'controls_menu' } : { success: false, error: 'Image tab not found in controls menu' };
      }

      if (actionName === 'select_video_tab') {
        const ok = await clickTabByTablistTokens(menu, ['image', 'video'], 'video');
        return ok ? { success: true, method: 'controls_menu' } : { success: false, error: 'Video tab not found in controls menu' };
      }

      if (actionName === 'select_video_submode') {
        const wanted = norm(actionValue || '');
        const normalized = wanted.includes('ingredient') ? 'ingredients' : wanted.includes('frame') ? 'frames' : '';
        if (!normalized) {
          return { success: false, error: `Unsupported video submode: ${wanted}` };
        }
        const ok = await clickTabByTablistTokens(menu, ['frames', 'ingredients'], normalized);
        return ok
          ? { success: true, method: 'controls_menu', submode: normalized }
          : { success: false, error: `Video submode '${normalized}' not found in controls menu` };
      }

      if (actionName === 'set_aspect_ratio') {
        const wanted = norm(actionValue || '');
        const ok = await clickTabByTablistTokens(menu, ['landscape', 'portrait'], wanted);
        return ok ? { success: true, method: 'controls_menu' } : { success: false, error: `Aspect ratio '${wanted}' not found in controls menu` };
      }

      if (actionName === 'set_multiplier') {
        const raw = norm(actionValue || '');
        const wanted = raw.startsWith('x') ? raw : `x${raw}`;
        const ok = await clickTabByTablistTokens(menu, ['x1', 'x2', 'x3', 'x4'], wanted);
        return ok ? { success: true, method: 'controls_menu' } : { success: false, error: `Multiplier '${wanted}' not found in controls menu` };
      }

      if (actionName === 'set_model') {
        const picked = await setModelFromMenu(menu, String(actionValue || ''));
        return picked.ok
          ? { success: true, method: 'controls_menu' }
          : { success: false, error: picked.error || 'Failed to set model', labels: picked.labels || [] };
      }

      return { success: false, error: `Unknown flow control action: ${actionName}` };
    },
    args: [action, value]
  });

  return normalizeFlowScriptResult(results, resolvedTabId, `flow_controls_${action}`);
}

/**
 * Select the Video tab in Flow UI
 * Clicks on the 'Video' tab to switch from Image mode
 */
async function flowSelectVideoTab(tabId, projectId) {
  const normalized = await flowControlMenuAction(tabId, projectId, 'select_video_tab', null);
  if (normalized.success === true) {
    return normalized;
  }

  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const fallbackTools = ['ingredients to video', 'image to video', 'frames to video'];
  for (const tool of fallbackTools) {
    const fallback = await flowSelectTool(resolvedTabId, tool, projectId);
    if (fallback.success === true) {
      return {
        success: true,
        tabId: resolvedTabId,
        method: 'flow_select_tool_fallback',
        tool,
        previousError: normalized.error || null,
      };
    }
  }

  return normalized;
}

async function flowSelectImageTab(tabId, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  let lastNormalized = null;

  const verifyImageContext = async () => {
    const probeResults = await chrome.scripting.executeScript({
      target: { tabId: resolvedTabId },
      func: () => {
        const norm = (txt) => String(txt || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const isVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        };

        const labels = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], [aria-label]'))
          .filter(isVisible)
          .map((el) => norm(el.textContent || el.getAttribute('aria-label') || ''));
        const pageText = norm(document.body?.textContent || '');
        const inImageUi = labels.some((txt) => txt === 'ref' || txt.includes('add reference') || txt.includes('create image') || txt.includes('image generation'))
          || pageText.includes('create image')
          || pageText.includes('edit image')
          || pageText.includes('image generation');

        return {
          success: true,
          inImageUi,
          hintCount: labels.length,
        };
      },
    });
    const probe = normalizeFlowScriptResult(probeResults, resolvedTabId, 'flow_select_image_tab_verify');
    return Boolean(probe.success === true && probe.inImageUi === true);
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const normalized = await flowControlMenuAction(resolvedTabId, projectId, 'select_image_tab', null);
    if (normalized.success === true) {
      return normalized;
    }
    lastNormalized = normalized;
    await new Promise((r) => setTimeout(r, 180));
  }

  const fallbackTools = ['create image', 'image generation'];
  for (const tool of fallbackTools) {
    const fallback = await flowSelectTool(resolvedTabId, tool, projectId);
    if (fallback.success === true && await verifyImageContext()) {
      return {
        success: true,
        tabId: resolvedTabId,
        method: 'flow_select_tool_fallback',
        tool,
        previousError: lastNormalized?.error || null,
      };
    }
  }

  const probeResults = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const isImageContext = () => {
        const scope = norm(document.body?.textContent || '');
        if (scope.includes('create image') || scope.includes('edit image') || scope.includes('image generation')) return true;
        const hints = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], div')).filter(isVisible);
        return hints.some((el) => {
          const txt = norm(el.textContent || el.getAttribute('aria-label') || '');
          if (!txt) return false;
          return txt.includes('create image') || txt.includes('image') || txt === 'ref' || txt.includes('add reference');
        });
      };

      if (isImageContext()) {
        return { success: true, method: 'context_probe', alreadyInImageContext: true };
      }

      const clickButtonLikeUser = (el) => {
        if (!el) return;
        const overlay = el.querySelector('[data-type="button-overlay"]');
        const target = overlay || el;
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const findImageButton = () => {
        const nodes = Array.from(document.querySelectorAll('button, [role="tab"], [role="button"]')).filter(isVisible);
        return nodes.find((el) => {
          const txt = norm(el.textContent || el.getAttribute('aria-label') || '');
          return txt === 'image' || txt.includes('create image') || txt.includes('image generation');
        }) || null;
      };

      const btn = findImageButton();
      if (!btn) {
        return { success: false, error: 'Image tab/button not found after controls/tool fallback' };
      }

      clickButtonLikeUser(btn);
      await sleep(220);
      if (isImageContext()) {
        return { success: true, method: 'direct_button_probe' };
      }

      return { success: false, error: 'Image tab clicked but image context not detected' };
    },
  });

  const probe = normalizeFlowScriptResult(probeResults, resolvedTabId, 'flow_select_image_tab_probe');
  if (probe.success === true) return probe;

  return {
    ...(lastNormalized || { success: false, tabId: resolvedTabId, error: 'flow_select_image_tab failed' }),
    fallbackError: 'Flow tool fallback and direct probe failed',
    probeError: probe.error || null,
  };
}

/**
 * Select Ingredients mode in Flow Video
 * Clicks on the 'Ingredients' tab/button
 */
async function flowSelectIngredientsMode(tabId, projectId) {
  const fromControls = await flowControlMenuAction(tabId, projectId, 'select_video_submode', 'ingredients');
  if (fromControls.success === true) {
    return fromControls;
  }

  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().trim();
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      // Find Ingredients button/tab
      const findIngredientsButton = () => {
        const buttons = Array.from(document.querySelectorAll('button, [role="tab"], [role="button"], div')).filter(isVisible);
        return buttons.find((el) => {
          const text = norm(el.textContent || el.getAttribute('aria-label') || '');
          return text === 'ingredients' || text.includes('ingredients');
        });
      };

      let btn = findIngredientsButton();
      if (!btn) {
        await sleep(300);
        btn = findIngredientsButton();
      }

      if (!btn) {
        return { success: false, error: 'Ingredients mode button not found' };
      }

      btn.click();
      await sleep(300);

      return { success: true, message: 'Ingredients mode selected' };
    }
  });

  const normalized = normalizeFlowScriptResult(results, resolvedTabId, 'flow_select_ingredients_mode');
  if (normalized.success === true) {
    return normalized;
  }

  const fallback = await flowSelectTool(resolvedTabId, 'ingredients to video', projectId);
  if (fallback.success === true) {
    return {
      success: true,
      tabId: resolvedTabId,
      method: 'flow_select_tool_fallback',
      tool: 'ingredients to video',
      previousError: normalized.error || null,
    };
  }

  return {
    ...normalized,
    fallbackError: fallback.error || null,
  };
}

async function flowSelectReferenceMode(tabId, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);

  const ensureReferenceContext = async () => {
    const checkResults = await chrome.scripting.executeScript({
      target: { tabId: resolvedTabId },
      func: () => {
        const norm = (txt) => String(txt || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const isVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        };
        const hasReferenceControls = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], [aria-label]'))
          .filter(isVisible)
          .some((el) => {
            const txt = norm(el.textContent || el.getAttribute('aria-label') || '');
            if (!txt || txt.includes('preference') || txt.includes('reference docs')) return false;
            return txt === 'ref' || txt.includes('add reference') || txt.includes('reference image');
          });
        return { success: true, hasReferenceControls };
      },
    });
    const normalized = normalizeFlowScriptResult(checkResults, resolvedTabId, 'flow_select_reference_mode_verify');
    return Boolean(normalized.success === true && normalized.hasReferenceControls === true);
  };

  if (!await ensureReferenceContext()) {
    await flowSelectImageTab(resolvedTabId, projectId);
  }

  const runOnce = async () => chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const clickButtonLikeUser = (el) => {
        if (!el) return;
        const overlay = el.querySelector('[data-type="button-overlay"]');
        const target = overlay || el;
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const isReferenceButton = (el) => {
        if (!el || !isVisible(el)) return false;
        const text = norm(el.textContent || el.getAttribute('aria-label') || '');
        if (!text) return false;
        if (text.includes('preference') || text.includes('reference docs')) return false;
        return text === 'ref' || text.includes(' ref ') || text.includes('reference') || text.includes('add reference');
      };

      const findReferenceButton = () => {
        const composerRoots = Array.from(document.querySelectorAll('form, section, article, div')).filter((el) => {
          const txt = norm(el.textContent || '');
          return txt.includes('what do you want to create') || txt.includes('start creating') || txt.includes('drop media');
        });
        const composerRoot = composerRoots.find(isVisible) || composerRoots[0] || document.body;
        const local = Array.from(composerRoot.querySelectorAll('button, [role="button"]')).find(isReferenceButton);
        if (local) return local;
        return Array.from(document.querySelectorAll('button, [role="button"]')).find(isReferenceButton) || null;
      };

      const findAddMediaTrigger = () => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], div[type="button"][aria-haspopup="dialog"]')).filter(isVisible);
        return buttons.find((el) => {
          const ariaHasPopup = String(el.getAttribute('aria-haspopup') || '').toLowerCase();
          if (ariaHasPopup !== 'dialog') return false;
          const iconText = norm(Array.from(el.querySelectorAll('i, span, img[alt]')).map((n) => n.textContent || n.getAttribute?.('alt') || '').join(' '));
          const txt = norm(el.textContent || el.getAttribute('aria-label') || '');
          return iconText.includes('add_2') || txt.includes('add') || txt.includes('reference') || txt.includes('create');
        }) || null;
      };

      const getOpenAssetRows = (controlsId) => {
        const byId = controlsId ? document.getElementById(controlsId) : null;
        const scoped = byId?.querySelector('[data-testid="virtuoso-item-list"]');
        const list = scoped
          || document.querySelector('[role="dialog"][data-state="open"] [data-testid="virtuoso-item-list"]')
          || document.querySelector('[role="dialog"] [data-testid="virtuoso-item-list"]')
          || document.querySelector('[data-testid="virtuoso-item-list"]');
        if (!list || !isVisible(list)) return [];
        const rows = Array.from(list.querySelectorAll('[data-index], [data-asset-id], [data-index="0"]')).filter(isVisible);
        return rows.length > 0 ? rows : Array.from(list.querySelectorAll('div, li, button')).filter(isVisible);
      };

      const isReferenceContext = () => {
        const labels = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], div')).filter(isVisible);
        return labels.some((el) => {
          const txt = norm(el.textContent || el.getAttribute('aria-label') || '');
          if (!txt) return false;
          if (txt.includes('preference') || txt.includes('reference docs')) return false;
          return txt === 'ref' || txt.includes('add reference') || txt.includes('reference image');
        });
      };

      if (isReferenceContext()) {
        return { success: true, message: 'Reference mode already available', alreadyAvailable: true };
      }

      let refButton = findReferenceButton();
      if (!refButton) {
        const trigger = findAddMediaTrigger();
        if (trigger) {
          clickButtonLikeUser(trigger);
          await sleep(180);
        }
        await sleep(220);
        refButton = findReferenceButton();
      }
      if (!refButton) {
        await sleep(220);
        refButton = findReferenceButton();
      }
      if (!refButton) {
        const trigger = findAddMediaTrigger();
        const controlsId = String(trigger?.getAttribute('aria-controls') || '').trim();
        const openRows = getOpenAssetRows(controlsId);
        if (openRows.length > 0) {
          return {
            success: true,
            message: 'Reference picker opened (ref label unavailable)',
            fallback: 'asset_rows_available',
            openRows: openRows.length,
          };
        }
        return { success: false, error: 'Ref action button not found after trigger attempts' };
      }

      clickButtonLikeUser(refButton);
      await sleep(200);

      const text = norm(refButton.textContent || refButton.getAttribute('aria-label') || '');
      return {
        success: true,
        message: 'Reference mode selected',
        label: text,
      };
    }
  });

  let last = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const results = await runOnce();
    const normalized = normalizeFlowScriptResult(results, resolvedTabId, 'flow_select_reference_mode');
    if (normalized.success === true) return normalized;
    last = normalized;
    await new Promise((r) => setTimeout(r, 180));
  }

  return last || { success: false, tabId: resolvedTabId, error: 'flow_select_reference_mode failed' };
}

/**
 * Select Frames mode in Flow Video
 * Clicks on the 'Frames' tab/button
 */
async function flowSelectFramesMode(tabId, projectId) {
  const fromControls = await flowControlMenuAction(tabId, projectId, 'select_video_submode', 'frames');
  if (fromControls.success === true) {
    return fromControls;
  }

  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().trim();
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      // Find Frames button/tab
      const findFramesButton = () => {
        const buttons = Array.from(document.querySelectorAll('button, [role="tab"], [role="button"], div')).filter(isVisible);
        return buttons.find((el) => {
          const text = norm(el.textContent || el.getAttribute('aria-label') || '');
          return text === 'frames' || text.includes('frames');
        });
      };

      let btn = findFramesButton();
      if (!btn) {
        await sleep(300);
        btn = findFramesButton();
      }

      if (!btn) {
        return { success: false, error: 'Frames mode button not found' };
      }

      btn.click();
      await sleep(300);

      return { success: true, message: 'Frames mode selected' };
    }
  });

  return normalizeFlowScriptResult(results, resolvedTabId, 'flow_select_frames_mode');
}

async function flowSelectFrameSlot(tabId, slot, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const targetSlot = String(slot || '').trim().toLowerCase();
  if (targetSlot !== 'start' && targetSlot !== 'end') {
    return { success: false, tabId: resolvedTabId, error: "Invalid slot. Use 'start' or 'end'" };
  }

  const runSlotPick = async () => {
    const results = await chrome.scripting.executeScript({
      target: { tabId: resolvedTabId },
      func: async (wantedSlot) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const isVisible = (el) => {
        if (!el) return false;
        let node = el;
        for (let depth = 0; depth < 10 && node; depth += 1) {
          const ariaHidden = String(node.getAttribute?.('aria-hidden') || '').toLowerCase();
          const dataAriaHidden = String(node.getAttribute?.('data-aria-hidden') || '').toLowerCase();
          if (ariaHidden === 'true' || dataAriaHidden === 'true') return false;
          node = node.parentElement;
        }
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const clickButtonLikeUser = (el) => {
        if (!el) return;
        const overlay = el.querySelector('[data-type="button-overlay"]');
        const target = overlay || el;
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const readSlotState = (el) => {
        const selectedHint = String(el?.getAttribute('aria-pressed') || el?.getAttribute('aria-selected') || '').toLowerCase();
        const dataState = String(el?.getAttribute('data-state') || '').toLowerCase();
        const expanded = String(el?.getAttribute('aria-expanded') || '').toLowerCase();
        return {
          selected: selectedHint === 'true' || dataState === 'active' || dataState === 'on' || expanded === 'true' || dataState === 'open',
          dataState,
          expanded,
        };
      };

      const findFrameSlotButton = () => {
        const isSlotControlCandidate = (el) => {
          if (!el || !isVisible(el)) return false;
          if (el.hasAttribute('data-card-open') || el.closest('[data-card-open]')) return false;
          const label = norm(el.getAttribute('aria-label') || '');
          const text = norm(el.textContent || '');
          if (label.includes('remove') || text.includes('remove')) return false;
          return true;
        };

        const dialogTriggers = Array.from(document.querySelectorAll('[aria-haspopup="dialog"]')).filter(isSlotControlCandidate);
        const exactDialogTrigger = dialogTriggers.find((btn) => {
          const text = norm(btn.textContent || btn.getAttribute('aria-label') || '');
          return text === wantedSlot;
        });
        if (exactDialogTrigger) return exactDialogTrigger;

        const buttons = Array.from(document.querySelectorAll('div[type="button"], button, [role="button"]')).filter(isSlotControlCandidate);
        const exact = buttons.find((btn) => {
          const text = norm(btn.textContent || btn.getAttribute('aria-label') || '');
          return text === wantedSlot;
        });
        if (exact) return exact;

        return buttons.find((btn) => {
          const text = norm(btn.textContent || btn.getAttribute('aria-label') || '');
          return (text.includes(wantedSlot) && (text.length < 16 || text === `${wantedSlot} frame`));
        }) || null;
      };

      let btn = findFrameSlotButton();
      if (!btn) {
        await sleep(250);
        btn = findFrameSlotButton();
      }
      if (!btn) {
        const available = Array.from(document.querySelectorAll('[aria-haspopup="dialog"], div[type="button"], button, [role="button"]'))
          .filter(isVisible)
          .map((el) => norm(el.textContent || el.getAttribute('aria-label') || ''))
          .filter(Boolean)
          .slice(0, 20);
        return { success: false, error: `${wantedSlot} frame slot button not found`, availableButtons: available };
      }

      let state = readSlotState(btn);
      if (!state.selected) {
        clickButtonLikeUser(btn);
        await sleep(180);
        state = readSlotState(btn);
      }
      if (!state.selected) {
        clickButtonLikeUser(btn);
        await sleep(220);
        state = readSlotState(btn);
      }

      if (!state.selected) {
        return {
          success: false,
          error: `${wantedSlot} frame slot did not open`,
          label: String(btn.textContent || btn.getAttribute('aria-label') || '').trim(),
          dataState: state.dataState,
          expanded: state.expanded,
        };
      }

      return {
        success: true,
        slot: wantedSlot,
        selected: state.selected,
        label: String(btn.textContent || btn.getAttribute('aria-label') || '').trim(),
        dataState: state.dataState,
        expanded: state.expanded,
      };
      },
      args: [targetSlot]
    });

    return normalizeFlowScriptResult(results, resolvedTabId, 'flow_select_frame_slot');
  };

  let lastResult = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) {
      await flowSelectVideoTab(resolvedTabId, projectId);
      await flowSelectFramesMode(resolvedTabId, projectId);
      await new Promise((r) => setTimeout(r, 180));
    }

    const result = await runSlotPick();
    if (result.success === true) {
      return result;
    }
    lastResult = result;

    const errorText = String(result.error || '').toLowerCase();
    const retryable = errorText.includes('slot button not found') || errorText.includes('slot did not open');
    if (!retryable) {
      return result;
    }
  }

  return lastResult || { success: false, tabId: resolvedTabId, error: `${targetSlot} frame slot selection failed` };
}

async function resolveFlowAssetAliasesFromEditPage(projectId, assetExactId) {
  const normalizedProjectId = normalizeFlowProjectId(projectId);
  const targetExactId = String(assetExactId || '').trim();
  if (!normalizedProjectId || !targetExactId) {
    return [];
  }

  const editUrl = `https://labs.google/fx/tools/flow/project/${normalizedProjectId}/edit/${targetExactId}`;
  const tab = await chrome.tabs.create({ url: editUrl, active: false });
  const tempTabId = tab?.id;
  if (!Number.isInteger(tempTabId)) {
    return [];
  }

  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const current = await chrome.tabs.get(tempTabId);
      if (current?.status === 'complete') {
        break;
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    const extracted = await chrome.scripting.executeScript({
      target: { tabId: tempTabId },
      func: async (projectId2, assetId2) => {
        const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            return await fetch(url, { ...options, signal: controller.signal });
          } finally {
            clearTimeout(timer);
          }
        };
        const strings = [];
        strings.push(String(window.location.href || ''));
        strings.push(String(document.title || ''));

        const imgSources = Array.from(document.querySelectorAll('img')).slice(0, 80).map((img) => (
          String(img.getAttribute('src') || img.getAttribute('data-src') || img.currentSrc || '').trim()
        ));
        strings.push(...imgSources);

        const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 80).map((a) => String(a.getAttribute('href') || '').trim());
        strings.push(...links);

        const metaContents = Array.from(document.querySelectorAll('meta[content]')).slice(0, 80).map((meta) => String(meta.getAttribute('content') || '').trim());
        strings.push(...metaContents);

        const scriptPayloads = Array.from(document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]'))
          .slice(0, 40)
          .map((script) => String(script.textContent || '').trim())
          .filter(Boolean);
        strings.push(...scriptPayloads);

        const trpcPath = `/fx/api/trpc/media.getMediaUrlRedirect?name=${encodeURIComponent(String(assetId2 || ''))}`;
        strings.push(trpcPath);
        try {
          const response = await fetchWithTimeout(trpcPath, { credentials: 'include', redirect: 'follow' }, 8000);
          strings.push(String(response.url || ''));
          const locationHeader = String(response.headers?.get?.('location') || '').trim();
          if (locationHeader) strings.push(locationHeader);
          const bodyText = await response.text();
          if (bodyText) strings.push(String(bodyText));
        } catch {}

        try {
          const editUrl = `https://labs.google/fx/tools/flow/project/${encodeURIComponent(String(projectId2 || ''))}/edit/${encodeURIComponent(String(assetId2 || ''))}`;
          const response = await fetchWithTimeout(editUrl, { credentials: 'include', redirect: 'follow' }, 8000);
          strings.push(String(response.url || ''));
          const bodyText = await response.text();
          if (bodyText) strings.push(String(bodyText));
        } catch {}

        return { success: true, strings };
      },
      args: [normalizedProjectId, targetExactId],
    });

    const payload = extracted?.[0]?.result;
    if (!payload?.success || !Array.isArray(payload?.strings)) {
      return [];
    }

    const idRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
    const found = new Set();
    for (const raw of payload.strings) {
      const matches = String(raw || '').match(idRegex) || [];
      for (const match of matches) {
        const normalized = String(match).toLowerCase();
        if (normalized !== normalizedProjectId.toLowerCase() && normalized !== targetExactId.toLowerCase()) {
          found.add(normalized);
        }
      }
    }

    return Array.from(found);
  } catch {
    return [];
  } finally {
    try {
      await chrome.tabs.remove(tempTabId);
    } catch {
    }
  }
}

/**
 * Select an asset from the asset library
 * @param {string} assetId - The ID or name of the asset to select
 */
async function flowSelectAsset(tabId, assetId, projectId, slot, assetIndex, assetExactId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const normalizedProjectId = normalizeFlowProjectId(projectId);
  const targetAssetId = String(assetId || assetExactId || '').trim();
  const targetCompact = targetAssetId.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const targetSlot = String(slot || '').trim().toLowerCase();
  const slotHint = targetSlot === 'start' || targetSlot === 'end' ? targetSlot : '';
  const rawAssetExactId = String(assetExactId || '').trim();
  const parsedAssetIndex = Number.parseInt(String(assetIndex ?? ''), 10);
  const hasAssetIndex = Number.isInteger(parsedAssetIndex);
  const aliasIdsFromEditPage = rawAssetExactId
    ? await resolveFlowAssetAliasesFromEditPage(normalizedProjectId, rawAssetExactId)
    : [];

  if (!targetAssetId) {
    return { success: false, tabId: resolvedTabId, error: 'Missing assetId' };
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async (wantedAssetId, wantedCompactId, wantedSlot, wantedAssetIndex, wantedAssetExactId, wantedProjectId, wantedAliasIds) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().trim();
      const compact = (txt) => norm(txt).replace(/[^a-z0-9]+/g, '');
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
      const parseMediaNameFromSrc = (src) => {
        const raw = String(src || '').trim();
        if (!raw) return '';
        try {
          const parsed = new URL(raw, window.location.origin);
          const fromQuery = String(parsed.searchParams.get('name') || '').trim();
          if (fromQuery) return fromQuery;
        } catch {}
        const uuidInUrl = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidInUrl?.[0]) return uuidInUrl[0];
        const match = raw.match(/[?&]name=([^&#]+)/i);
        if (!match?.[1]) return '';
        try {
          return decodeURIComponent(match[1]);
        } catch {
          return String(match[1]);
        }
      };
      const parseEditIdFromHref = (href) => {
        const raw = String(href || '').trim();
        if (!raw) return '';
        const byPath = raw.match(/\/edit\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (byPath?.[1]) return String(byPath[1]).toLowerCase();
        const anyUuid = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        return anyUuid?.[0] ? String(anyUuid[0]).toLowerCase() : '';
      };
      const parseFeUuidFromTileId = (tileId) => {
        const raw = String(tileId || '').trim();
        if (!raw) return '';
        const byPrefix = raw.match(/fe_id_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (byPrefix?.[1]) return String(byPrefix[1]).toLowerCase();
        const anyUuid = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        return anyUuid?.[0] ? String(anyUuid[0]).toLowerCase() : '';
      };
      const isVisible = (el) => {
        if (!el) return false;
        let node = el;
        for (let depth = 0; depth < 10 && node; depth += 1) {
          const ariaHidden = String(node.getAttribute?.('aria-hidden') || '').toLowerCase();
          const dataAriaHidden = String(node.getAttribute?.('data-aria-hidden') || '').toLowerCase();
          if (ariaHidden === 'true' || dataAriaHidden === 'true') return false;
          node = node.parentElement;
        }
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const wantedNormalized = norm(wantedAssetId);
      const wantedCompact = compact(wantedCompactId || wantedAssetId);
      const wantedExactId = String(wantedAssetExactId || '').trim();
      const wantedProject = String(wantedProjectId || '').trim();
      const wantedAliasSet = new Set(
        Array.isArray(wantedAliasIds)
          ? wantedAliasIds.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
          : [],
      );
      const wantedIndex = typeof wantedAssetIndex === 'number' && Number.isInteger(wantedAssetIndex)
        ? wantedAssetIndex
        : null;
      const matchMode = 'strict_exact';

      const findFramesBar = () => {
        const containers = Array.from(document.querySelectorAll('div, section, article')).filter(isVisible);
        const bar = containers.find((el) => {
          const text = norm(el.textContent || '');
          if (text.includes('swap first and last frames')) return true;
          const icon = norm(Array.from(el.querySelectorAll('i, span')).map((n) => n.textContent || '').join(' '));
          return icon.includes('swap_horiz');
        });
        return bar || null;
      };

      const clickButtonLikeUser = (el) => {
        if (!el) return;
        const overlay = el.querySelector('[data-type="button-overlay"]');
        const target = overlay || el;
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const findComposerRoot = () => {
        const starts = Array.from(document.querySelectorAll('[data-scroll-state="START"], [data-scroll-state="start"]')).filter(isVisible);
        if (!starts.length) return document.body;
        const start = starts[0];
        let node = start;
        for (let i = 0; i < 8 && node; i += 1) {
          const hasTextbox = Boolean(node.querySelector('[role="textbox"][data-slate-editor="true"], [role="textbox"][contenteditable="true"]'));
          if (hasTextbox) return node;
          node = node.parentElement;
        }
        return start.parentElement || document.body;
      };

      const isSlotDialogTrigger = (el, slotName) => {
        if (!slotName || !el || !isVisible(el)) return false;
        if (el.hasAttribute('data-card-open') || el.closest('[data-card-open]')) return false;
        if (String(el.getAttribute('aria-haspopup') || '').toLowerCase() !== 'dialog') return false;
        const text = norm(el.textContent || el.getAttribute('aria-label') || '');
        if (text !== slotName) return false;
        const label = norm(el.getAttribute('aria-label') || '');
        if (label.includes('remove') || text.includes('remove')) return false;
        return true;
      };

      const findSlotDialogTrigger = (slotName) => {
        if (!slotName) return null;
        const bar = findFramesBar();
        if (bar) {
          const inBar = Array.from(bar.querySelectorAll('[aria-haspopup="dialog"], div[type="button"][aria-haspopup="dialog"], button[aria-haspopup="dialog"], [role="button"][aria-haspopup="dialog"]'));
          const exactInBar = inBar.find((el) => isSlotDialogTrigger(el, slotName));
          if (exactInBar) return exactInBar;
        }

        const composerRoot = findComposerRoot();
        const local = Array.from(composerRoot.querySelectorAll('[aria-haspopup="dialog"], div[type="button"][aria-haspopup="dialog"], button[aria-haspopup="dialog"], [role="button"][aria-haspopup="dialog"]'));
        const exactLocal = local.find((el) => isSlotDialogTrigger(el, slotName));
        if (exactLocal) return exactLocal;

        const global = Array.from(document.querySelectorAll('[aria-haspopup="dialog"], div[type="button"][aria-haspopup="dialog"], button[aria-haspopup="dialog"], [role="button"][aria-haspopup="dialog"]'));
        return global.find((el) => isSlotDialogTrigger(el, slotName)) || null;
      };

      const findSlotContainer = (slotName) => {
        const slotTrigger = findSlotDialogTrigger(slotName);
        if (!slotTrigger) return null;
        const bar = findFramesBar();
        let node = slotTrigger;
        for (let depth = 0; depth < 8 && node && node !== bar; depth += 1) {
          if (typeof node.querySelector === 'function' && node.querySelector('button[data-card-open], [data-card-open]')) {
            return node;
          }
          node = node.parentElement;
        }
        return slotTrigger.parentElement || null;
      };

      const readAttachedSlotAssetId = (slotName) => {
        if (!slotName) return '';
        const container = findSlotContainer(slotName);
        if (!container) return '';
        const img = container.querySelector('button[data-card-open] img[src], [data-card-open] img[src], img[src*="media.getMediaUrlRedirect"]');
        const parsed = parseMediaNameFromSrc(
          img?.getAttribute('src') || img?.getAttribute('data-src') || img?.currentSrc || '',
        );
        return String(parsed || '').trim().toLowerCase();
      };

      const isSlotAttached = (slotName) => {
        if (!slotName) return null;
        const bar = findFramesBar();
        if (!bar) return null;
        return Boolean(readAttachedSlotAssetId(slotName));
      };

      const getOpenAssetRows = (controlsId) => {
        const byId = controlsId ? document.getElementById(controlsId) : null;
        const scopedList = byId?.querySelector('[data-testid="virtuoso-item-list"]');
        const list = scopedList
          || document.querySelector('[role="dialog"][data-state="open"] [data-testid="virtuoso-item-list"]')
          || document.querySelector('[role="dialog"] [data-testid="virtuoso-item-list"]')
          || document.querySelector('[data-testid="virtuoso-item-list"]');
        if (!list || !isVisible(list)) return [];
        const rows = Array.from(list.querySelectorAll('[data-index], [data-asset-id], [data-index="0"]')).filter(isVisible);
        return rows.length ? rows : Array.from(list.querySelectorAll('div, li, button')).filter(isVisible);
      };

      const getAssetList = async (controlsId) => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const rows = getOpenAssetRows(controlsId);
          if (rows.length > 0) return rows;
          await sleep(140);
        }
        return [];
      };

      const ensureAssetRowsReady = async (trigger, controlsId) => {
        let rows = await getAssetList(controlsId);
        if (rows.length > 0) return rows;

        for (let attempt = 0; attempt < 12; attempt += 1) {
          if (trigger && (attempt === 0 || attempt % 3 === 2)) {
            clickButtonLikeUser(trigger);
            await sleep(180);
          }
          rows = getOpenAssetRows(controlsId);
          if (rows.length > 0) return rows;
          await sleep(180);
        }
        return rows;
      };

      const closeAssetDialog = async (trigger, controlsId) => {
        const dialog = controlsId ? document.getElementById(controlsId) : null;
        if (dialog && isVisible(dialog) && trigger) {
          clickButtonLikeUser(trigger);
          await sleep(140);
          return true;
        }

        const openDialog = document.querySelector('[role="dialog"][data-state="open"]');
        if (openDialog && isVisible(openDialog) && trigger) {
          clickButtonLikeUser(trigger);
          await sleep(140);
          return true;
        }

        return false;
      };

      const findAssetLibraryTrigger = (slotName) => {
        if (slotName) {
          return findSlotDialogTrigger(slotName);
        }

        const composerRoot = findComposerRoot();
        const local = Array.from(composerRoot.querySelectorAll('button[aria-haspopup="dialog"], div[aria-haspopup="dialog"], [role="button"][aria-haspopup="dialog"], div[type="button"][aria-haspopup="dialog"]')).filter(isVisible);

        const localOpen = local.find((el) => {
          const expanded = norm(el.getAttribute('aria-expanded') || '');
          const state = norm(el.getAttribute('data-state') || '');
          return expanded === 'true' || state === 'open';
        });
        if (localOpen) return localOpen;

        const localMatch = local.find((el) => {
          const controlsId = norm(el.getAttribute('aria-controls') || '');
          const iconText = norm(Array.from(el.querySelectorAll('i, span')).map((n) => n.textContent || '').join(' '));
          const label = norm(el.getAttribute('aria-label') || el.textContent || '');
          return controlsId.startsWith('radix-')
            && (iconText.includes('add_2') || label === 'create' || label.includes('add') || label === 'start' || label === 'end');
        });
        if (localMatch) return localMatch;

        const global = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"], div[aria-haspopup="dialog"], [role="button"][aria-haspopup="dialog"], div[type="button"][aria-haspopup="dialog"]')).filter(isVisible);
        const globalOpen = global.find((el) => {
          const expanded = norm(el.getAttribute('aria-expanded') || '');
          const state = norm(el.getAttribute('data-state') || '');
          return expanded === 'true' || state === 'open';
        });
        if (globalOpen) return globalOpen;

        const globalMatch = global.find((el) => {
          const controlsId = norm(el.getAttribute('aria-controls') || '');
          const iconText = norm(Array.from(el.querySelectorAll('i, span')).map((n) => n.textContent || '').join(' '));
          const label = norm(el.getAttribute('aria-label') || el.textContent || '');
          return controlsId.startsWith('radix-')
            && (iconText.includes('add_2') || label === 'create' || label.includes('add') || label === 'start' || label === 'end');
        }) || null;
        if (globalMatch) return globalMatch;

        const looseButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVisible);
        return looseButtons.find((el) => {
          const iconText = norm(Array.from(el.querySelectorAll('i, span')).map((n) => n.textContent || '').join(' '));
          const label = norm(el.getAttribute('aria-label') || el.textContent || '');
          return iconText.includes('add_2') || label === 'create' || label.includes('add media');
        }) || null;
      };

      const findOpenDialogTrigger = (slotName) => {
        if (slotName) {
          const slotTrigger = findSlotDialogTrigger(slotName);
          if (!slotTrigger) return null;
          const expanded = norm(slotTrigger.getAttribute('aria-expanded') || '');
          const state = norm(slotTrigger.getAttribute('data-state') || '');
          return expanded === 'true' || state === 'open' ? slotTrigger : null;
        }

        const all = Array.from(document.querySelectorAll('[aria-haspopup="dialog"]')).filter(isVisible);
        return all.find((el) => {
          const expanded = norm(el.getAttribute('aria-expanded') || '');
          const state = norm(el.getAttribute('data-state') || '');
          return expanded === 'true' || state === 'open';
        }) || null;
      };

      const toCandidate = (row) => {
        const labelText = String(row.textContent || '').replace(/\s+/g, ' ').trim();
        const altText = String(Array.from(row.querySelectorAll('img[alt]')).map((img) => img.getAttribute('alt') || '').join(' ')).replace(/\s+/g, ' ').trim();
        const img = row.querySelector('img[src], img[currentSrc], img[data-src]');
        const srcAssetId = parseMediaNameFromSrc(
          img?.getAttribute('src') || img?.getAttribute('data-src') || img?.currentSrc || row.innerHTML || '',
        );
        const srcUrl = String(
          img?.getAttribute('src')
          || img?.getAttribute('data-src')
          || img?.currentSrc
          || '',
        ).trim();
        const srcUuids = Array.from(extractUuidSet(srcUrl));
        const editHref = String(row.querySelector('a[href*="/edit/"]')?.getAttribute('href') || '').trim();
        const editId = parseEditIdFromHref(editHref);
        const editUuids = Array.from(extractUuidSet(editHref));
        const tileId = String(
          row.getAttribute('data-tile-id')
          || row.closest('[data-tile-id]')?.getAttribute('data-tile-id')
          || '',
        ).trim();
        const feUuid = parseFeUuidFromTileId(tileId);
        const id = String(row.getAttribute('data-asset-id') || srcAssetId || '').trim();
        const dataIndex = String(row.getAttribute('data-index') || '').trim();
        const dataLabel = String(row.getAttribute('aria-label') || '');
        return {
          row,
          labelText: labelText,
          labelNormalized: norm(labelText || dataLabel),
          labelCompact: compact(labelText),
          id,
          idNormalized: norm(id),
          idCompact: compact(id),
          dataIndex,
          dataIndexNormalized: norm(dataIndex),
          dataIndexCompact: compact(dataIndex),
          altText: altText,
          altNormalized: norm(altText),
          altCompact: compact(altText),
          srcUrl,
          srcUuids,
          editHref,
          editId,
          editIdNormalized: norm(editId),
          editIdCompact: compact(editId),
          editUuids,
          tileId,
          feUuid,
          feUuidNormalized: norm(feUuid),
          feUuidCompact: compact(feUuid),
        };
      };

      const getDialogRoot = (controlsId) => {
        const byId = controlsId ? document.getElementById(controlsId) : null;
        if (byId && isVisible(byId)) return byId;
        const openDialog = document.querySelector('[role="dialog"][data-state="open"]');
        if (openDialog && isVisible(openDialog)) return openDialog;
        const anyDialog = document.querySelector('[role="dialog"]');
        return anyDialog && isVisible(anyDialog) ? anyDialog : null;
      };

      const getAssetPanelRoots = (controlsId) => {
        const roots = [];
        const dialogRoot = getDialogRoot(controlsId);
        if (dialogRoot) roots.push(dialogRoot);

        const searchInputs = Array.from(document.querySelectorAll('input[placeholder]')).filter((input) => {
          const placeholder = norm(input.getAttribute('placeholder') || '');
          return placeholder.includes('search for assets');
        });
        for (const input of searchInputs) {
          let node = input;
          for (let depth = 0; depth < 8 && node; depth += 1) {
            if (isVisible(node)) {
              const text = norm(node.textContent || '');
              if (text.includes('recently used') || text.includes('search for assets') || text.includes('upload image')) {
                roots.push(node);
                break;
              }
            }
            node = node.parentElement;
          }
        }

        return Array.from(new Set(roots));
      };

      const inferProjectIdFromLocation = () => {
        const text = String(window.location.href || '');
        const match = text.match(/\/project\/([0-9a-f-]{36})/i);
        return String(match?.[1] || '').trim();
      };

      const extractUuidSet = (text) => {
        const ids = new Set();
        if (!text) return ids;
        const matches = String(text).match(uuidRegex) || [];
        for (const match of matches) ids.add(String(match).toLowerCase());
        return ids;
      };

      const resolveAliasIdsFromEditPage = async () => {
        if (!wantedExactId) return [];
        const projectForEdit = wantedProject || inferProjectIdFromLocation();
        if (!projectForEdit) return [];
        const editUrl = `https://labs.google/fx/tools/flow/project/${projectForEdit}/edit/${wantedExactId}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(editUrl, { credentials: 'include', signal: controller.signal });
          if (!response.ok) return [];
          const html = await response.text();
          const ids = extractUuidSet(html);
          ids.delete(projectForEdit.toLowerCase());
          ids.delete(wantedExactId.toLowerCase());
          return Array.from(ids);
        } catch {
          return [];
        } finally {
          clearTimeout(timer);
        }
      };

      const collectImageCandidates = (controlsId) => {
        const roots = getAssetPanelRoots(controlsId);
        if (!roots.length) return [];

        const imgs = roots.flatMap((root) => Array.from(root.querySelectorAll('img[alt]')).filter(isVisible));
        const raw = imgs
          .map((img) => {
            const altText = String(img.getAttribute('alt') || '').trim();
            const host = img.closest('[data-index], [data-item-index], button, [role="button"], li');
            const srcAssetId = parseMediaNameFromSrc(
              img.getAttribute('src') || img.getAttribute('data-src') || img.currentSrc || host?.innerHTML || '',
            );
            if (!host || !isVisible(host)) return null;
            const genericAlt = norm(altText).includes('a piece of media generated or uploaded by you');
            const hostText = String(host.textContent || '').replace(/\s+/g, ' ').trim();
            const labelText = genericAlt ? hostText : altText;
            const editHref = String(host.querySelector('a[href*="/edit/"]')?.getAttribute('href') || '').trim();
            const editId = parseEditIdFromHref(editHref);
            return {
              row: host,
              labelText,
              labelNormalized: norm(labelText),
              labelCompact: compact(labelText),
              id: String(host.getAttribute('data-asset-id') || srcAssetId || '').trim(),
              idNormalized: norm(host.getAttribute('data-asset-id') || srcAssetId || ''),
              idCompact: compact(host.getAttribute('data-asset-id') || srcAssetId || ''),
              dataIndex: String(host.getAttribute('data-index') || host.getAttribute('data-item-index') || '').trim(),
              dataIndexNormalized: norm(host.getAttribute('data-index') || host.getAttribute('data-item-index') || ''),
              dataIndexCompact: compact(host.getAttribute('data-index') || host.getAttribute('data-item-index') || ''),
              altText,
              altNormalized: norm(altText),
              altCompact: compact(altText),
              srcUrl: String(img.getAttribute('src') || img.getAttribute('data-src') || img.currentSrc || '').trim(),
              srcUuids: Array.from(extractUuidSet(img.getAttribute('src') || img.getAttribute('data-src') || img.currentSrc || '')),
              editHref,
              editId,
              editIdNormalized: norm(editId),
              editIdCompact: compact(editId),
              editUuids: Array.from(extractUuidSet(editHref)),
            };
          })
          .filter(Boolean);

        const seen = new Set();
        return raw.filter((item) => {
          const key = `${item.labelCompact}|${item.altCompact}|${item.dataIndex}|${item.idCompact}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const collectVisibleListAliasEntries = () => {
        const roots = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"], [data-tile-id]')).filter(isVisible);
        if (roots.length === 0) {
          roots.push(document.body);
        }

        const entries = [];

        const distance = (a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return Math.abs(ar.x - br.x) + Math.abs(ar.y - br.y);
        };

        for (const root of roots) {
          const anchors = Array.from(root.querySelectorAll('a[href*="/edit/"]')).filter(isVisible);
          const images = Array.from(root.querySelectorAll('img[src], img[data-src], img[currentSrc]')).filter(isVisible);
          if (anchors.length === 0 || images.length === 0) continue;

          const rootTileId = String(root.getAttribute?.('data-tile-id') || '').trim();

          const mapped = anchors
            .map((anchor) => {
            const editHref = String(anchor.getAttribute('href') || '').trim();
            const editId = parseEditIdFromHref(editHref);
            if (!editId) return null;

            let nearestImg = null;
            let best = Number.POSITIVE_INFINITY;
            for (const img of images) {
              const d = distance(anchor, img);
              if (d < best) {
                best = d;
                nearestImg = img;
              }
            }

            const src = String(
              nearestImg?.getAttribute('src')
              || nearestImg?.getAttribute('data-src')
              || nearestImg?.currentSrc
              || '',
            ).trim();
            const nameId = parseMediaNameFromSrc(src);
            const srcUuids = Array.from(extractUuidSet(src));
            const tileId = String(
              anchor.closest('[data-tile-id]')?.getAttribute('data-tile-id')
              || nearestImg?.closest('[data-tile-id]')?.getAttribute('data-tile-id')
              || rootTileId
              || '',
            ).trim();
            const feUuid = parseFeUuidFromTileId(tileId);

            return {
              editId,
              editHref,
              nameId: String(nameId || '').trim().toLowerCase(),
              tileId,
              feUuid,
              srcUuids,
            };
          })
          .filter(Boolean);

          entries.push(...mapped);
        }

        const seen = new Set();
        return entries.filter((entry) => {
          const key = `${entry.editId}|${entry.nameId}|${entry.feUuid}|${entry.tileId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const targetUuidForAlias = (() => {
        const raw = String(wantedExactId || wantedAssetId || '').trim().toLowerCase();
        if (!raw) return '';
        const byUuid = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        return byUuid?.[0] ? String(byUuid[0]).toLowerCase() : '';
      })();

      const visibleAliasEntries = collectVisibleListAliasEntries();
      const visibleAliasSet = new Set(
        visibleAliasEntries
          .filter((entry) => targetUuidForAlias && (
            String(entry.editId || '').trim().toLowerCase() === targetUuidForAlias
            || String(entry.nameId || '').trim().toLowerCase() === targetUuidForAlias
            || String(entry.feUuid || '').trim().toLowerCase() === targetUuidForAlias
          ))
          .flatMap((entry) => [
            String(entry.nameId || '').trim().toLowerCase(),
            String(entry.editId || '').trim().toLowerCase(),
            String(entry.feUuid || '').trim().toLowerCase(),
            ...(Array.isArray(entry.srcUuids) ? entry.srcUuids.map((id) => String(id || '').trim().toLowerCase()) : []),
          ])
          .filter(Boolean),
      );
      const mergedAliasSet = new Set(wantedAliasSet);
      for (const visibleAlias of visibleAliasSet) mergedAliasSet.add(visibleAlias);

      const isExactMatch = (meta) => {
        if (!meta) return false;
        return (
          meta.labelNormalized === wantedNormalized && Boolean(wantedNormalized)
          || meta.labelCompact === wantedCompact && Boolean(wantedCompact)
          || meta.id === wantedAssetId
          || meta.idNormalized === wantedNormalized
          || (meta.idCompact && meta.idCompact === wantedCompact && Boolean(wantedCompact))
          || (meta.editId && meta.editId.toLowerCase() === wantedAssetId.toLowerCase())
          || meta.editIdNormalized === wantedNormalized
          || (meta.editIdCompact && meta.editIdCompact === wantedCompact && Boolean(wantedCompact))
          || (meta.feUuid && meta.feUuid.toLowerCase() === wantedAssetId.toLowerCase())
          || meta.feUuidNormalized === wantedNormalized
          || (meta.feUuidCompact && meta.feUuidCompact === wantedCompact && Boolean(wantedCompact))
          || (Array.isArray(meta.editUuids) && meta.editUuids.some((id) => String(id || '').trim().toLowerCase() === wantedAssetId.toLowerCase()))
          || meta.dataIndex === wantedAssetId
          || meta.dataIndexNormalized === wantedNormalized
          || (meta.dataIndexCompact && meta.dataIndexCompact === wantedCompact && Boolean(wantedCompact))
          || (meta.altText && meta.altText.toLowerCase() === wantedAssetId.toLowerCase())
          || meta.altNormalized === wantedNormalized
          || (meta.altCompact && meta.altCompact === wantedCompact)
        );
      };

      const beforeSlotAttached = isSlotAttached(wantedSlot);
      const beforeAttachedAssetId = readAttachedSlotAssetId(wantedSlot);

      if (wantedSlot && wantedExactId && beforeAttachedAssetId === wantedExactId.toLowerCase()) {
        return {
          success: true,
          message: `Asset '${wantedAssetId}' already attached`,
          matchMode: `${matchMode}+already_attached_exact_id`,
          requestedAssetId: wantedAssetId,
          requestedCompactAssetId: wantedCompact,
          requestedAssetExactId: wantedExactId,
          requestedAssetIndex: wantedIndex,
          selectedAssetId: beforeAttachedAssetId,
          selectedIndex: null,
          selectedText: null,
          slot: wantedSlot,
          slotAttachedBefore: beforeSlotAttached,
          slotAttachedAfter: Boolean(beforeSlotAttached),
          slotAttachedAssetIdAfter: beforeAttachedAssetId,
          candidateCount: 0,
          matchedCount: 0,
          openRows: 0,
          dialogClosed: false,
          dialogControlsId: null,
        };
      }

      const openTrigger = findOpenDialogTrigger(wantedSlot);
      const trigger = openTrigger || findAssetLibraryTrigger(wantedSlot);
      const controlsId = String(trigger?.getAttribute('aria-controls') || '').trim();
      if (trigger && !openTrigger) {
        clickButtonLikeUser(trigger);
        await ensureAssetRowsReady(trigger, controlsId);
        await sleep(350);
      }

      const rows = await ensureAssetRowsReady(trigger, controlsId);
      let candidates = rows.map(toCandidate);
      const imageCandidates = collectImageCandidates(controlsId);
      if (imageCandidates.length > 0) {
        candidates = imageCandidates;
      }
      const matches = candidates.filter(isExactMatch);
      const uniqueContainsMatches = candidates.filter((meta) => {
        if (!meta || !wantedCompact) return false;
        return (
          (meta.labelCompact && meta.labelCompact.includes(wantedCompact))
          || (meta.altCompact && meta.altCompact.includes(wantedCompact))
          || (meta.idCompact && meta.idCompact.includes(wantedCompact))
          || (meta.dataIndexCompact && meta.dataIndexCompact === wantedCompact)
        );
      });

      const resolvedMatches = matches.length > 0
        ? matches
        : uniqueContainsMatches.length === 1
          ? uniqueContainsMatches
          : [];
      const exactIdMatches = wantedExactId
        ? candidates.filter((meta) => {
          if (String(meta.id || '').trim() === wantedExactId) return true;
          if (String(meta.editId || '').trim() === wantedExactId) return true;
          if (mergedAliasSet.has(String(meta.id || '').trim().toLowerCase())) return true;
          if (mergedAliasSet.has(String(meta.editId || '').trim().toLowerCase())) return true;
          if (Array.isArray(meta.editUuids) && meta.editUuids.some((id) => mergedAliasSet.has(String(id || '').trim().toLowerCase()))) return true;
          if (Array.isArray(meta.srcUuids) && meta.srcUuids.some((id) => mergedAliasSet.has(String(id || '').trim().toLowerCase()))) return true;
          return Array.isArray(meta.srcUuids) && meta.srcUuids.some((id) => String(id || '').trim().toLowerCase() === wantedExactId.toLowerCase());
        })
        : [];
      const aliasIdMatches = mergedAliasSet.size > 0
        ? candidates.filter((meta) => {
          if (mergedAliasSet.has(String(meta.id || '').trim().toLowerCase())) return true;
          if (mergedAliasSet.has(String(meta.editId || '').trim().toLowerCase())) return true;
          if (Array.isArray(meta.editUuids) && meta.editUuids.some((id) => mergedAliasSet.has(String(id || '').trim().toLowerCase()))) return true;
          return Array.isArray(meta.srcUuids) && meta.srcUuids.some((id) => mergedAliasSet.has(String(id || '').trim().toLowerCase()));
        })
        : [];
      const indexMatches = wantedIndex !== null
        ? resolvedMatches.filter((meta) => Number.parseInt(String(meta.dataIndex || ''), 10) === wantedIndex)
        : [];
      const resolvedMatchMode = matches.length > 0
        ? matchMode
        : uniqueContainsMatches.length === 1
          ? 'strict_contains_unique'
          : matchMode;

      const chooseDeterministicMatch = () => {
        if (exactIdMatches.length === 1) {
          return { match: exactIdMatches[0], mode: `${resolvedMatchMode}+exact_id` };
        }
        if (indexMatches.length === 1) {
          return { match: indexMatches[0], mode: `${resolvedMatchMode}+index` };
        }
        return null;
      };

      const preferredSelectedAssetId = (meta) => {
        const expectedExactId = String(wantedExactId || '').trim().toLowerCase();
        if (!meta) return null;
        if (expectedExactId) {
          if (String(meta.editId || '').trim().toLowerCase() === expectedExactId) return expectedExactId;
          if (String(meta.id || '').trim().toLowerCase() === expectedExactId) return expectedExactId;
          if (Array.isArray(meta.editUuids) && meta.editUuids.some((id) => String(id || '').trim().toLowerCase() === expectedExactId)) {
            return expectedExactId;
          }
          if (Array.isArray(meta.srcUuids) && meta.srcUuids.some((id) => String(id || '').trim().toLowerCase() === expectedExactId)) {
            return expectedExactId;
          }
        }
        return meta.id || meta.editId || null;
      };

      const canonicalCandidateLabel = (meta) => {
        if (!meta) return null;
        const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const isGeneric = (value) => {
          const text = norm(value);
          if (!text) return true;
          return text.includes('a piece of media generated or uploaded by you')
            || text === 'image'
            || text === 'video';
        };
        const isNoisy = (value) => {
          const text = clean(value);
          if (!text) return true;
          if (text.length > 220) return true;
          const markerCount = (text.match(/play_circle|videocam|\bimage\b|\bvideo\b/gi) || []).length;
          return markerCount >= 3;
        };

        const alt = clean(meta.altText);
        if (alt && !isGeneric(alt) && !isNoisy(alt)) return alt;

        const label = clean(meta.labelText);
        if (label && !isNoisy(label)) return label;

        const editId = clean(meta.editId);
        if (editId) return editId;

        const id = clean(meta.id);
        if (id) return id;

        return null;
      };

      const selectCandidateAndVerify = async (match, mode, extra = {}) => {
        const target = match.row.firstElementChild || match.row;
        clickButtonLikeUser(target);
        await sleep(260);
        const dialogClosed = await closeAssetDialog(trigger, controlsId);

        let afterSlotAttached = isSlotAttached(wantedSlot);
        if (wantedSlot) {
          for (let attempt = 0; attempt < 10 && afterSlotAttached !== true; attempt += 1) {
            await sleep(120);
            afterSlotAttached = isSlotAttached(wantedSlot);
          }
          const verifiedAttachedAssetId = readAttachedSlotAssetId(wantedSlot);
          const expectedExactId = String(wantedExactId || '').trim().toLowerCase();
          if (expectedExactId && verifiedAttachedAssetId && verifiedAttachedAssetId !== expectedExactId) {
            return {
              success: false,
              error: `Asset '${wantedAssetId}' attached to ${wantedSlot} did not match expected exact ID`,
              matchMode: `${mode}+slot_ref_mismatch`,
              requestedAssetId: wantedAssetId,
              requestedCompactAssetId: wantedCompact,
              requestedAssetExactId: wantedExactId || null,
              requestedAssetIndex: wantedIndex,
              selectedAssetId: preferredSelectedAssetId(match),
              slot: wantedSlot,
              slotAttachedBefore: beforeSlotAttached,
              slotAttachedAfter: afterSlotAttached,
              slotAttachedAssetIdAfter: verifiedAttachedAssetId || null,
              candidateCount: candidates.length,
              matchedCount: resolvedMatches.length,
              dialogClosed,
              dialogControlsId: controlsId || null,
              ...extra,
            };
          }
          if (afterSlotAttached !== true) {
            return {
              success: false,
              error: `Asset '${wantedAssetId}' selected but ${wantedSlot} slot did not attach`,
              matchMode: mode,
              requestedAssetId: wantedAssetId,
              requestedCompactAssetId: wantedCompact,
              requestedAssetExactId: wantedExactId || null,
              requestedAssetIndex: wantedIndex,
              slot: wantedSlot,
              slotAttachedBefore: beforeSlotAttached,
              slotAttachedAfter: afterSlotAttached,
              slotAttachedAssetIdAfter: verifiedAttachedAssetId || null,
              candidateCount: candidates.length,
              matchedCount: resolvedMatches.length,
              dialogClosed,
              dialogControlsId: controlsId || null,
              ...extra,
            };
          }
        }

        return {
          success: true,
          message: `Asset '${wantedAssetId}' selected`,
          matchMode: mode,
          requestedAssetId: wantedAssetId,
          requestedCompactAssetId: wantedCompact,
          requestedAssetExactId: wantedExactId || null,
          requestedAssetIndex: wantedIndex,
          selectedAssetId: preferredSelectedAssetId(match),
          selectedIndex: match.dataIndex || null,
          selectedText: canonicalCandidateLabel(match),
          slot: wantedSlot || null,
          slotAttachedBefore: beforeSlotAttached,
          slotAttachedAfter: afterSlotAttached,
          slotAttachedAssetIdAfter: readAttachedSlotAssetId(wantedSlot) || null,
          candidateCount: candidates.length,
          matchedCount: resolvedMatches.length,
          openRows: getOpenAssetRows(controlsId).length,
          dialogClosed,
          dialogControlsId: controlsId || null,
          ...extra,
        };
      };

      if (wantedExactId) {
        if (exactIdMatches.length === 0) {
          const aliasIds = await resolveAliasIdsFromEditPage();
          const combinedAliasSet = new Set(aliasIds);
          for (const externalAlias of mergedAliasSet) combinedAliasSet.add(externalAlias);
          if (combinedAliasSet.size > 0) {
            const combinedAliasMatches = candidates.filter((meta) => {
              if (combinedAliasSet.has(String(meta.id || '').trim().toLowerCase())) return true;
              if (combinedAliasSet.has(String(meta.editId || '').trim().toLowerCase())) return true;
              if (Array.isArray(meta.editUuids) && meta.editUuids.some((id) => combinedAliasSet.has(String(id || '').trim().toLowerCase()))) return true;
              return Array.isArray(meta.srcUuids) && meta.srcUuids.some((id) => combinedAliasSet.has(String(id || '').trim().toLowerCase()));
            });
            if (combinedAliasMatches.length === 1) {
              const aliasMatch = combinedAliasMatches[0];
              const target = aliasMatch.row.firstElementChild || aliasMatch.row;
              clickButtonLikeUser(target);
              await sleep(260);
              const dialogClosed = await closeAssetDialog(trigger, controlsId);
            let afterSlotAttached = isSlotAttached(wantedSlot);
            if (wantedSlot) {
              for (let attempt = 0; attempt < 10 && afterSlotAttached !== true; attempt += 1) {
                await sleep(120);
                afterSlotAttached = isSlotAttached(wantedSlot);
              }
              const verifiedAttachedAssetId = readAttachedSlotAssetId(wantedSlot);
              const expectedExactId = String(wantedExactId || '').trim().toLowerCase();
              if (expectedExactId && verifiedAttachedAssetId && verifiedAttachedAssetId !== expectedExactId) {
                return {
                  success: false,
                  error: `Asset '${wantedAssetId}' attached to ${wantedSlot} did not match expected exact ID`,
                  matchMode: `${resolvedMatchMode}+slot_ref_mismatch`,
                  requestedAssetId: wantedAssetId,
                  requestedCompactAssetId: wantedCompact,
                  requestedAssetExactId: wantedExactId || null,
                  requestedAssetIndex: wantedIndex,
                  selectedAssetId: preferredSelectedAssetId(aliasMatch),
                  slot: wantedSlot,
                  slotAttachedBefore: beforeSlotAttached,
                  slotAttachedAfter: afterSlotAttached,
                  slotAttachedAssetIdAfter: verifiedAttachedAssetId || null,
                  candidateCount: candidates.length,
                  matchedCount: resolvedMatches.length,
                  dialogClosed,
                  dialogControlsId: controlsId || null,
                  aliasCandidates: Array.from(combinedAliasSet),
                };
              }
              if (afterSlotAttached !== true) {
                return {
                  success: false,
                  error: `Asset '${wantedAssetId}' selected but ${wantedSlot} slot did not attach`,
                  matchMode: `${resolvedMatchMode}+edit_page_alias`,
                  requestedAssetId: wantedAssetId,
                  requestedCompactAssetId: wantedCompact,
                  requestedAssetExactId: wantedExactId,
                  requestedAssetIndex: wantedIndex,
                  slot: wantedSlot,
                  slotAttachedBefore: beforeSlotAttached,
                  slotAttachedAfter: afterSlotAttached,
                  candidateCount: candidates.length,
                  matchedCount: resolvedMatches.length,
                  dialogClosed,
                  dialogControlsId: controlsId || null,
                  aliasCandidates: Array.from(combinedAliasSet),
                };
              }
            }

            return {
              success: true,
              message: `Asset '${wantedAssetId}' selected via edit-page lookup`,
              matchMode: `${resolvedMatchMode}+edit_page_alias`,
              requestedAssetId: wantedAssetId,
              requestedCompactAssetId: wantedCompact,
              requestedAssetExactId: wantedExactId,
              requestedAssetIndex: wantedIndex,
              selectedAssetId: preferredSelectedAssetId(aliasMatch),
              selectedIndex: aliasMatch.dataIndex || null,
              selectedText: canonicalCandidateLabel(aliasMatch),
              aliasCandidates: Array.from(combinedAliasSet),
              slot: wantedSlot || null,
              slotAttachedBefore: beforeSlotAttached,
              slotAttachedAfter: isSlotAttached(wantedSlot),
              slotAttachedAssetIdAfter: readAttachedSlotAssetId(wantedSlot) || null,
              dialogClosed,
              dialogControlsId: controlsId || null,
            };
            }
          }

          const available = candidates
            .slice(0, 24)
            .map((c) => ({
              text: canonicalCandidateLabel(c),
              id: c.id || null,
              editId: c.editId || null,
              index: c.dataIndex || null,
            }));
          return {
            success: false,
            error: `Exact asset ID '${wantedExactId}' not found`,
            matchMode: `${resolvedMatchMode}+require_exact_id`,
            requestedAssetId: wantedAssetId,
            requestedCompactAssetId: wantedCompact,
            requestedAssetExactId: wantedExactId,
            requestedAssetIndex: wantedIndex,
            openRows: rows.length,
            dialogControlsId: controlsId || null,
            matchedCount: resolvedMatches.length,
            candidateCount: candidates.length,
            availableCandidates: available,
            editLookupCandidates: aliasIds || [],
            externalLookupCandidates: Array.from(wantedAliasSet),
            visibleAliasCandidates: Array.from(visibleAliasSet),
          };
        }

        if (exactIdMatches.length > 1) {
          const matched = exactIdMatches.slice(0, 10).map((m) => ({
            text: canonicalCandidateLabel(m),
            id: m.id || null,
            editId: m.editId || null,
            index: m.dataIndex || null,
          }));
          return {
            success: false,
            error: `Ambiguous exact asset ID '${wantedExactId}' match (${exactIdMatches.length} matches)`,
            matchMode: `${resolvedMatchMode}+require_exact_id`,
            requestedAssetId: wantedAssetId,
            requestedCompactAssetId: wantedCompact,
            requestedAssetExactId: wantedExactId,
            requestedAssetIndex: wantedIndex,
            openRows: rows.length,
            dialogControlsId: controlsId || null,
            matchedCount: exactIdMatches.length,
            candidateCount: candidates.length,
            matchedCandidates: matched,
          };
        }
      }

      if (wantedExactId && exactIdMatches.length === 1) {
        return selectCandidateAndVerify(exactIdMatches[0], `${resolvedMatchMode}+exact_id`);
      }

      if (resolvedMatches.length === 0 && aliasIdMatches.length === 1) {
        return selectCandidateAndVerify(
          aliasIdMatches[0],
          `${resolvedMatchMode}+bg_edit_alias`,
          { aliasCandidates: Array.from(mergedAliasSet) },
        );
      }

      if (resolvedMatches.length === 0) {
        const available = candidates
          .slice(0, 24)
          .map((c) => ({
            text: canonicalCandidateLabel(c),
            id: c.id || null,
            editId: c.editId || null,
            index: c.dataIndex || null,
          }));
        return {
          success: false,
          error: `Asset '${wantedAssetId}' not found`,
          matchMode: resolvedMatchMode,
          requestedAssetId: wantedAssetId,
          requestedCompactAssetId: wantedCompact,
          openRows: rows.length,
          dialogControlsId: controlsId || null,
          matchedCount: resolvedMatches.length,
          candidateCount: candidates.length,
          availableCandidates: available,
        };
      }

      if (resolvedMatches.length > 1) {
        const deterministic = chooseDeterministicMatch();
        if (deterministic) {
          const match = deterministic.match;
          const target = match.row.firstElementChild || match.row;
          clickButtonLikeUser(target);
          await sleep(260);
          const dialogClosed = await closeAssetDialog(trigger, controlsId);

          let afterSlotAttached = isSlotAttached(wantedSlot);
          if (wantedSlot) {
            for (let attempt = 0; attempt < 10 && afterSlotAttached !== true; attempt += 1) {
              await sleep(120);
              afterSlotAttached = isSlotAttached(wantedSlot);
            }
            if (afterSlotAttached !== true) {
              return {
                success: false,
                error: `Asset '${wantedAssetId}' selected but ${wantedSlot} slot did not attach`,
                matchMode: deterministic.mode,
                requestedAssetId: wantedAssetId,
                requestedCompactAssetId: wantedCompact,
                requestedAssetExactId: wantedExactId || null,
                requestedAssetIndex: wantedIndex,
                slot: wantedSlot,
                slotAttachedBefore: beforeSlotAttached,
                slotAttachedAfter: afterSlotAttached,
                candidateCount: candidates.length,
                matchedCount: resolvedMatches.length,
                dialogClosed,
                dialogControlsId: controlsId || null,
              };
            }
          }

          return {
            success: true,
            message: `Asset '${wantedAssetId}' selected`,
            matchMode: deterministic.mode,
            requestedAssetId: wantedAssetId,
            requestedCompactAssetId: wantedCompact,
            requestedAssetExactId: wantedExactId || null,
            requestedAssetIndex: wantedIndex,
            selectedAssetId: preferredSelectedAssetId(match),
            selectedIndex: match.dataIndex || null,
            selectedText: canonicalCandidateLabel(match),
            slot: wantedSlot || null,
            slotAttachedBefore: beforeSlotAttached,
            slotAttachedAfter: afterSlotAttached,
            candidateCount: candidates.length,
            matchedCount: resolvedMatches.length,
            openRows: getOpenAssetRows(controlsId).length,
            dialogClosed,
            dialogControlsId: controlsId || null,
          };
        }

        const matched = resolvedMatches.slice(0, 10).map((m) => ({
          text: canonicalCandidateLabel(m),
          id: m.id || null,
          editId: m.editId || null,
          index: m.dataIndex || null,
        }));
        return {
          success: false,
          error: `Ambiguous asset '${wantedAssetId}' match (${resolvedMatches.length} matches)`,
          matchMode: resolvedMatchMode,
          requestedAssetId: wantedAssetId,
          requestedCompactAssetId: wantedCompact,
          requestedAssetExactId: wantedExactId || null,
          requestedAssetIndex: wantedIndex,
          openRows: rows.length,
          dialogControlsId: controlsId || null,
          matchedCount: resolvedMatches.length,
          candidateCount: candidates.length,
          matchedCandidates: matched,
        };
      }

      const match = resolvedMatches[0];
      const target = match.row.firstElementChild || match.row;
      clickButtonLikeUser(target);
      await sleep(260);
      const dialogClosed = await closeAssetDialog(trigger, controlsId);

      let afterSlotAttached = isSlotAttached(wantedSlot);
      if (wantedSlot) {
        for (let attempt = 0; attempt < 10 && afterSlotAttached !== true; attempt += 1) {
          await sleep(120);
          afterSlotAttached = isSlotAttached(wantedSlot);
        }
        if (afterSlotAttached !== true) {
          return {
            success: false,
            error: `Asset '${wantedAssetId}' selected but ${wantedSlot} slot did not attach`,
            matchMode: resolvedMatchMode,
            requestedAssetId: wantedAssetId,
            requestedCompactAssetId: wantedCompact,
            slot: wantedSlot,
            slotAttachedBefore: beforeSlotAttached,
            slotAttachedAfter: afterSlotAttached,
            candidateCount: candidates.length,
            matchedCount: resolvedMatches.length,
            dialogClosed,
            dialogControlsId: controlsId || null,
          };
        }
      }

      return {
        success: true,
        message: `Asset '${wantedAssetId}' selected`,
        matchMode: resolvedMatchMode,
        requestedAssetId: wantedAssetId,
        requestedCompactAssetId: wantedCompact,
        requestedAssetExactId: wantedExactId || null,
        requestedAssetIndex: wantedIndex,
        selectedAssetId: preferredSelectedAssetId(match),
        selectedIndex: match.dataIndex || null,
        selectedText: canonicalCandidateLabel(match),
        slot: wantedSlot || null,
        slotAttachedBefore: beforeSlotAttached,
        slotAttachedAfter: afterSlotAttached,
        candidateCount: candidates.length,
        matchedCount: resolvedMatches.length,
        openRows: getOpenAssetRows(controlsId).length,
        dialogClosed,
        dialogControlsId: controlsId || null,
      };
    },
    args: [targetAssetId, targetCompact, slotHint, hasAssetIndex ? parsedAssetIndex : null, rawAssetExactId, normalizedProjectId, aliasIdsFromEditPage]
  });

  const normalized = normalizeFlowScriptResult(results, resolvedTabId, 'flow_select_asset');
  const requestedId = String(assetExactId || assetId || '').trim() || null;
  const requestedExactId = String(normalized.requestedAssetExactId || assetExactId || '').trim() || null;
  const selectedCardIdentity = {
    assetId: normalized.selectedAssetId || null,
    index: normalized.selectedIndex ?? null,
    label: normalized.selectedText || null,
  };
  const selectedMatchesRequestedExact = requestedExactId
    ? String(selectedCardIdentity.assetId || '').toLowerCase() === requestedExactId.toLowerCase()
    : null;
  const matchedAliasPath = (() => {
    const mode = String(normalized.matchMode || '').toLowerCase();
    if (mode.includes('edit_page_alias')) return 'edit_page_lookup';
    if (mode.includes('bg_edit_alias')) return 'background_alias_map';
    if (Array.isArray(normalized.aliasCandidates) && normalized.aliasCandidates.length > 0) return 'alias_candidates';
    if (Array.isArray(normalized.editLookupCandidates) && normalized.editLookupCandidates.length > 0) return 'edit_lookup_candidates';
    if (Array.isArray(normalized.visibleAliasCandidates) && normalized.visibleAliasCandidates.length > 0) return 'visible_alias_candidates';
    if (mode.includes('exact_id') && selectedMatchesRequestedExact === false) return 'resolved_alias_from_exact_id';
    if (mode.includes('exact_id')) return 'exact_id';
    return null;
  })();

  return {
    ...normalized,
    selectionProof: {
      requestedId,
      requestedExactId,
      matchedAliasPath,
      matchMode: normalized.matchMode || null,
      selectedMatchesRequestedExact,
      selectedCardIdentity,
    },
  };
}

/**
 * Set the video generation model
 * @param {string} model - Model name: 'veo31-fast', 'veo31-quality', 'veo2-fast', 'veo2-quality'
 */
async function flowSetModel(tabId, model, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const targetModel = String(model || '').trim().toLowerCase();
  if (!targetModel) {
    return { success: false, tabId: resolvedTabId, error: 'Missing model parameter' };
  }

  return flowControlMenuAction(resolvedTabId, projectId, 'set_model', targetModel);
}

/**
 * Set the generation multiplier
 * @param {string} multiplier - 'x1', 'x2', 'x3', or 'x4'
 */
async function flowSetMultiplier(tabId, multiplier, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const targetMultiplier = String(multiplier || '').trim().toLowerCase();
  
  if (!targetMultiplier) {
    return { success: false, tabId: resolvedTabId, error: 'Missing multiplier parameter' };
  }
  return flowControlMenuAction(resolvedTabId, projectId, 'set_multiplier', targetMultiplier);
}

/**
 * Set the aspect ratio
 * @param {string} ratio - 'landscape' or 'portrait'
 */
async function flowSetAspectRatio(tabId, ratio, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const targetRatio = String(ratio || '').trim().toLowerCase();
  
  if (!targetRatio) {
    return { success: false, tabId: resolvedTabId, error: 'Missing ratio parameter' };
  }
  return flowControlMenuAction(resolvedTabId, projectId, 'set_aspect_ratio', targetRatio);
}

/**
 * Type a prompt into the Flow prompt input field
 * @param {string} text - The prompt text to type
 */
async function flowTypePrompt(tabId, text, projectId, clearBeforeType = false) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  const promptText = String(text || '').trim();
  const shouldClearBeforeType = Boolean(clearBeforeType);
  
  if (!promptText) {
    return { success: false, tabId: resolvedTabId, error: 'Missing prompt text' };
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async (message, clearBeforeTyping) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const compact = (txt) => norm(txt).replace(/[^a-z0-9]+/g, '');
      const isEditImageContext = (el) => {
        const context = el?.closest('section, form, [role="dialog"], [data-radix-popper-content-wrapper], div');
        const text = norm(context?.textContent || '');
        return text.includes('edit image') || text.includes('annotations') || text.includes('add to prompt');
      };
      const sanitizeEditableText = (text) => {
        const cleaned = String(text || '')
          .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        return cleaned
          .replace(/^what do you want to create\?\s*/i, '')
          .replace(/^start creating\s*/i, '')
          .trim();
      };

      const readSlateStringText = (el) => {
        if (!el || typeof el.querySelectorAll !== 'function') return '';
        const leaves = Array.from(el.querySelectorAll('[data-slate-string="true"]'));
        if (leaves.length === 0) return '';
        return sanitizeEditableText(leaves.map((leaf) => String(leaf.textContent || '')).join(' '));
      };

      const readInputValue = (el) => {
        if (!el) return '';
        if (el.getAttribute('contenteditable') === 'true' || el.tagName === 'DIV') {
          const slateText = readSlateStringText(el);
          if (slateText) return slateText;
          return sanitizeEditableText(el.textContent || '');
        }
        return String(el.value || '').trim();
      };

      const writeSlateText = (editorEl, value) => {
        if (!editorEl) return;
        const slateString = editorEl.querySelector('[data-slate-string="true"]');
        if (!slateString) return;
        slateString.textContent = value;
      };

      const clearInputValue = (inputEl) => {
        if (!inputEl) return;
        const isContentEditable = inputEl.getAttribute('contenteditable') === 'true' || inputEl.tagName === 'DIV';
        if (isContentEditable) {
          if (inputEl.getAttribute('data-slate-editor') === 'true') {
            writeSlateText(inputEl, '');
            inputEl.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward', data: null }));
            inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
            return;
          }

          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(inputEl);
          selection?.removeAllRanges();
          selection?.addRange(range);
          const deleted = document.execCommand && document.execCommand('delete', false);
          if (!deleted) {
            inputEl.textContent = '';
            inputEl.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward', data: null }));
            inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
          }
          return;
        }

        const textAreaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (inputEl.tagName === 'TEXTAREA' && textAreaSetter) {
          textAreaSetter.call(inputEl, '');
        } else if (inputSetter) {
          inputSetter.call(inputEl, '');
        } else {
          inputEl.value = '';
        }
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const startComposers = Array.from(document.querySelectorAll('[data-scroll-state="START"], [data-scroll-state="start"]')).filter(isVisible);
      const composerContainer = startComposers.find((node) => node.querySelector('div[role="textbox"][contenteditable="true"][data-slate-editor="true"], [role="textbox"][contenteditable="true"], textarea')) || null;

      let input = composerContainer
        ? Array.from(composerContainer.querySelectorAll('div[role="textbox"][contenteditable="true"][data-slate-editor="true"], [role="textbox"][contenteditable="true"], textarea')).find((el) => isVisible(el) && !isEditImageContext(el)) || null
        : null;

      if (!input) {
        const fallbackInputs = Array.from(document.querySelectorAll('div[role="textbox"][contenteditable="true"][data-slate-editor="true"], [role="textbox"][contenteditable="true"][aria-multiline="true"], textarea'))
          .filter((el) => isVisible(el) && !isEditImageContext(el));
        input = fallbackInputs[0] || null;
      }

      if (!input) {
        return {
          success: false,
          error: 'Prompt input field not found in Flow composer',
          details: {
            hasComposerContainer: Boolean(composerContainer),
            startComposerCount: startComposers.length,
          },
        };
      }

      const beforeValue = readInputValue(input);
      if (clearBeforeTyping) {
        if (typeof input.click === 'function') input.click();
        input.focus();
        clearInputValue(input);
        await sleep(90);
      }

      const valueBeforeTyping = readInputValue(input);
      const shouldType = clearBeforeTyping || !valueBeforeTyping || !compact(valueBeforeTyping).includes(compact(message));

      // Type the message
      if (shouldType) {
        if (typeof input.click === 'function') input.click();
        input.focus();
        await sleep(80);

        const isContentEditable = input.getAttribute('contenteditable') === 'true' || input.tagName === 'DIV';
        if (isContentEditable) {
          if (input.getAttribute('data-slate-editor') === 'true') {
            writeSlateText(input, message);
            input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: message }));
            input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
          } else {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(input);
            selection?.removeAllRanges();
            selection?.addRange(range);

            const inserted = document.execCommand && document.execCommand('insertText', false, message);
            if (!inserted) {
              input.textContent = message;
              input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: message }));
              input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
            }
          }
        } else {
          const textAreaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (input.tagName === 'TEXTAREA' && textAreaSetter) {
            textAreaSetter.call(input, message);
          } else if (inputSetter) {
            inputSetter.call(input, message);
          } else {
            input.value = message;
          }
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      await sleep(200);

      const afterValue = readInputValue(input);
      const expected = String(message || '').trim();
      if (!afterValue) {
        return {
          success: false,
          error: 'Prompt typing verification failed: input remains empty',
          beforeValue,
          valueBeforeTyping,
          afterValue,
          clearedBeforeType: Boolean(clearBeforeTyping),
        };
      }
      if (!afterValue.includes(expected) && afterValue !== expected) {
        const isContentEditable = input.getAttribute('contenteditable') === 'true' || input.tagName === 'DIV';
        if (isContentEditable) {
          input.textContent = expected;
          input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: expected }));
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: expected }));
          await sleep(120);
        }
        const repairedValue = readInputValue(input);
        if (repairedValue === expected) {
          return {
            success: true,
            message: 'Prompt typed successfully',
            typedText: repairedValue,
          };
        }
        return {
          success: false,
          error: 'Prompt typing verification failed: typed text mismatch',
          beforeValue,
          valueBeforeTyping,
          afterValue: repairedValue || afterValue,
          expected,
          clearedBeforeType: Boolean(clearBeforeTyping),
        };
      }

      return {
        success: true,
        message: 'Prompt typed successfully',
        typedText: afterValue,
        clearedBeforeType: Boolean(clearBeforeTyping),
      };
    },
    args: [promptText, shouldClearBeforeType]
  });

  return normalizeFlowScriptResult(results, resolvedTabId, 'flow_type_prompt');
}

/**
 * Click the generate video button
 */
async function flowGenerateVideo(tabId, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const clickButtonLikeUser = (el) => {
        if (!el) return;
        const overlay = el.querySelector('[data-type="button-overlay"]');
        const target = overlay || el;
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const composerRoots = Array.from(document.querySelectorAll('form, section, article, div')).filter((el) => {
        const txt = norm(el.textContent || '');
        return txt.includes('start creating') || txt.includes('what do you want to create') || txt.includes('drop media');
      });
      const composerRoot = composerRoots.find(isVisible) || composerRoots[0] || document.body;

      const closeSettingsMenus = async () => {
        const openMenus = Array.from(document.querySelectorAll('[role="menu"][data-radix-menu-content][data-state="open"]')).filter(isVisible);
        if (openMenus.length === 0) return;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
        if (typeof composerRoot?.click === 'function') composerRoot.click();
        await sleep(120);
      };

      const isGenerateVideoButton = (el) => {
        if (!el || !isVisible(el)) return false;
        if (el.closest('[role="menu"][data-radix-menu-content]')) return false;

        const text = norm(el.textContent || el.getAttribute('aria-label') || '');
        const iconText = norm(el.querySelector('.material-symbols-outlined, .material-icons')?.textContent || '');
        const hasMenu = String(el.getAttribute('aria-haspopup') || '').toLowerCase();
        if (hasMenu === 'menu' || hasMenu === 'dialog') return false;

        const blocked = text.includes('download') || text.includes('edit image') || text.includes('add to prompt') || text === 'exit' || text.includes('clear prompt') || text.includes('close');
        if (blocked) return false;

        if (iconText.includes('arrow_forward')) return true;
        if (text.includes('arrow_forward') || text === 'create' || text.includes('generate')) return true;
        return text.includes('create video') || text.includes('generate video');
      };

      const nearestButton = (buttons) => {
        const input = composerRoot.querySelector('textarea, [role="textbox"], [contenteditable="true"], div[contenteditable]');
        if (!input) return buttons[0] || null;
        const inputRect = input.getBoundingClientRect();
        let winner = null;
        let bestScore = Number.POSITIVE_INFINITY;
        for (const btn of buttons) {
          const rect = btn.getBoundingClientRect();
          const dx = Math.abs(rect.left - inputRect.right);
          const dy = Math.abs(rect.top - inputRect.bottom);
          const score = dx + dy;
          if (score < bestScore) {
            bestScore = score;
            winner = btn;
          }
        }
        return winner;
      };

      const findGenerateButton = () => {
        const localButtons = Array.from(composerRoot.querySelectorAll('button, [role="button"]')).filter(isGenerateVideoButton);
        const enabledLocal = localButtons.find((btn) => !btn.disabled && String(btn.getAttribute('aria-disabled') || '').toLowerCase() !== 'true');
        if (enabledLocal) return { button: enabledLocal, matchPath: 'composer.local.enabled' };
        if (localButtons.length > 0) {
          const nearestLocal = nearestButton(localButtons);
          if (nearestLocal) {
            return { button: nearestLocal, matchPath: 'composer.local.nearest' };
          }
        }

        const allButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isGenerateVideoButton);
        const enabledGlobal = allButtons.find((btn) => !btn.disabled && String(btn.getAttribute('aria-disabled') || '').toLowerCase() !== 'true');
        if (enabledGlobal) return { button: enabledGlobal, matchPath: 'global.enabled' };
        const nearestGlobal = nearestButton(allButtons);
        if (nearestGlobal) {
          return { button: nearestGlobal, matchPath: 'global.nearest' };
        }
        return { button: null, matchPath: '' };
      };

      const detectGenerationSignal = () => {
        const scopeText = norm(composerRoot?.textContent || document.body?.textContent || '');
        const hasGeneratingText = scopeText.includes('generating') || scopeText.includes('rendering') || scopeText.includes('processing') || scopeText.includes('stop generating') || scopeText.includes('cancel generation');
        if (hasGeneratingText) return 'generating_text';

        const liveCandidate = findGenerateButton();
        const liveBtn = liveCandidate?.button || null;
        const disabled = Boolean(liveBtn?.disabled) || String(liveBtn?.getAttribute('aria-disabled') || '').toLowerCase() === 'true';
        if (disabled) return 'button_disabled';

        const percentNode = Array.from(document.querySelectorAll('span, div, p, [role="status"]')).find((el) => isVisible(el) && /\b\d{1,3}%\b/.test(String(el.textContent || '').trim()));
        if (percentNode) return 'percent_progress';

        return '';
      };

      const getVisiblePromptRequiredErrorCount = () => {
        const nodes = Array.from(document.querySelectorAll('[role="alert"], [aria-live], div, span, p')).filter(isVisible);
        return nodes.filter((node) => {
          const text = norm(node.textContent || '');
          return text.includes('prompt must be provided');
        }).length;
      };

      const baselinePromptErrorCount = getVisiblePromptRequiredErrorCount();

      const clickAndWait = async (attempt) => {
        await closeSettingsMenus();

        let candidate = findGenerateButton();
        let btn = candidate?.button || null;
        let buttonMatchPath = String(candidate?.matchPath || '');
        if (!btn) {
          await sleep(260);
          candidate = findGenerateButton();
          btn = candidate?.button || null;
          buttonMatchPath = String(candidate?.matchPath || buttonMatchPath || '');
        }
        if (!btn) {
          return { success: false, error: 'Generate video button not found', attempt, buttonMatchPath, lastDetection: '' };
        }

        if (typeof composerRoot?.click === 'function') composerRoot.click();
        clickButtonLikeUser(btn);

        const waitStart = Date.now();
        let lastDetection = '';
        while (Date.now() - waitStart < 2800) {
          const promptRequiredErrors = getVisiblePromptRequiredErrorCount();
          if (promptRequiredErrors > baselinePromptErrorCount) {
            return {
              success: false,
              error: 'Prompt must be provided',
              errorCode: 'flow_prompt_required',
              promptRequiredErrors,
              attempt,
              buttonMatchPath,
              lastDetection,
            };
          }

          const detection = detectGenerationSignal();
          if (detection) {
            lastDetection = detection;
            return { success: true, message: 'Video generation started', detection, attempt, buttonMatchPath, lastDetection };
          }
          await sleep(120);
        }

        return { success: false, error: 'No generation signal after click', attempt, buttonMatchPath, lastDetection };
      };

      const first = await clickAndWait(1);
      if (first.success) return first;

      await sleep(420);
      const second = await clickAndWait(2);
      if (second.success) return second;

      const finalButtonMatchPath = String(second.buttonMatchPath || first.buttonMatchPath || '');
      const finalDetection = String(second.lastDetection || first.lastDetection || '');
      return {
        success: false,
        error: 'Generate click did not produce Flow generation signals after retry',
        buttonMatchPath: finalButtonMatchPath,
        detection: finalDetection,
        attempts: [first, second],
      };
    }
  });

  return normalizeFlowScriptResult(results, resolvedTabId, 'flow_generate_video');
}

async function flowGenerateImage(tabId, projectId) {
  const resolvedTabId = await resolveFlowTabId(tabId, projectId);

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const norm = (txt) => String(txt || '').toLowerCase().trim();
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const clickButtonLikeUser = (el) => {
        if (!el) return;
        const overlay = el.querySelector('[data-type="button-overlay"]');
        const target = overlay || el;
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (typeof el.click === 'function') el.click();
      };

      const composerRoots = Array.from(document.querySelectorAll('form, section, article, div')).filter((el) => {
        const txt = norm(el.textContent || '');
        return txt.includes('start creating') || txt.includes('what do you want to create') || txt.includes('drop media');
      });
      const composerRoot = composerRoots.find(isVisible) || composerRoots[0] || document.body;

      const isGenerateButton = (el) => {
        if (!el || !isVisible(el)) return false;
        const text = norm(el.textContent || el.getAttribute('aria-label') || '');
        const iconText = norm(el.querySelector('.material-symbols-outlined, .material-icons')?.textContent || '');
        const add2DialogTrigger =
          String(el.getAttribute('aria-haspopup') || '').toLowerCase() === 'dialog' && norm(el.querySelector('img[alt="add_2"]')?.getAttribute('alt') || '') === 'add_2';
        const blocked = text.includes('download') || text.includes('edit image') || text.includes('add to prompt') || text === 'exit' || text === 'add_2' || iconText.includes('add_2') || add2DialogTrigger;
        if (blocked) return false;
        if (iconText.includes('arrow_forward')) return true;
        if (text.includes('arrow_forward') || text.includes('send')) return true;
        return text === 'create' || text.includes('generate') || text.includes('create image');
      };

      const nearestButton = (buttons) => {
        const input = composerRoot.querySelector('textarea, [role="textbox"], [contenteditable="true"], div[contenteditable]');
        if (!input) return buttons[0] || null;
        const inputRect = input.getBoundingClientRect();
        let winner = null;
        let bestScore = Number.POSITIVE_INFINITY;
        for (const btn of buttons) {
          const rect = btn.getBoundingClientRect();
          const dx = Math.abs(rect.left - inputRect.right);
          const dy = Math.abs(rect.top - inputRect.bottom);
          const score = dx + dy;
          if (score < bestScore) {
            bestScore = score;
            winner = btn;
          }
        }
        return winner;
      };

      const findGenerateButton = () => {
        const localButtons = Array.from(composerRoot.querySelectorAll('button, [role="button"]')).filter(isGenerateButton);
        const enabledLocal = localButtons.find((btn) => !btn.disabled && String(btn.getAttribute('aria-disabled') || '').toLowerCase() !== 'true');
        if (enabledLocal) return enabledLocal;
        if (localButtons.length > 0) return nearestButton(localButtons);

        const allButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isGenerateButton);
        const enabledGlobal = allButtons.find((btn) => !btn.disabled && String(btn.getAttribute('aria-disabled') || '').toLowerCase() !== 'true');
        if (enabledGlobal) return enabledGlobal;
        return nearestButton(allButtons);
      };

      const detectGenerationSignal = () => {
        const scopeText = norm(composerRoot?.textContent || document.body?.textContent || '');
        const hasGeneratingText = scopeText.includes('generating') || scopeText.includes('rendering') || scopeText.includes('processing') || scopeText.includes('stop generating') || scopeText.includes('cancel generation');
        if (hasGeneratingText) return 'generating_text';

        const liveBtn = findGenerateButton();
        const disabled = Boolean(liveBtn?.disabled) || String(liveBtn?.getAttribute('aria-disabled') || '').toLowerCase() === 'true';
        if (disabled) return 'button_disabled';

        const percentNode = Array.from(document.querySelectorAll('span, div, p, [role="status"]')).find((el) => isVisible(el) && /\b\d{1,3}%\b/.test(String(el.textContent || '').trim()));
        if (percentNode) return 'percent_progress';

        return '';
      };

      const getVisiblePromptRequiredErrorCount = () => {
        const nodes = Array.from(document.querySelectorAll('[role="alert"], [aria-live], div, span, p')).filter(isVisible);
        return nodes.filter((node) => {
          const text = norm(node.textContent || '');
          return text.includes('prompt must be provided');
        }).length;
      };

      const baselinePromptErrorCount = getVisiblePromptRequiredErrorCount();

      const clickAndWait = async (attempt) => {
        let btn = findGenerateButton();
        if (!btn) {
          await sleep(280);
          btn = findGenerateButton();
        }
        if (!btn) return { success: false, error: 'Generate image button not found', attempt };

        if (typeof composerRoot?.click === 'function') composerRoot.click();
        clickButtonLikeUser(btn);

        const waitStart = Date.now();
        while (Date.now() - waitStart < 2800) {
          const promptRequiredErrors = getVisiblePromptRequiredErrorCount();
          if (promptRequiredErrors > baselinePromptErrorCount) {
            return {
              success: false,
              error: 'Prompt must be provided',
              errorCode: 'flow_prompt_required',
              promptRequiredErrors,
              attempt,
            };
          }

          const detection = detectGenerationSignal();
          if (detection) {
            return { success: true, message: 'Image generation started', detection, attempt };
          }
          await sleep(120);
        }

        return { success: false, error: 'No generation signal after click', attempt };
      };

      const first = await clickAndWait(1);
      if (first.success) return first;

      await sleep(420);
      const second = await clickAndWait(2);
      if (second.success) return second;

      return {
        success: false,
        error: 'Generate click did not produce Flow generation signals after retry',
        attempts: [first, second]
      };
    }
  });

  return normalizeFlowScriptResult(results, resolvedTabId, 'flow_generate_image');
}

async function focusTab(tabId) {
  const resolvedTabId = await resolveTabId(tabId);
  await chrome.tabs.update(resolvedTabId, { active: true });
  const tab = await chrome.tabs.get(resolvedTabId);
  await chrome.windows.update(tab.windowId, { focused: true });

  return { success: true, tabId: resolvedTabId };
}

async function closeTab(tabId) {
  const resolvedTabId = await resolveTabId(tabId);
  await chrome.tabs.remove(resolvedTabId);
  return { success: true, tabId: resolvedTabId };
}

async function getTabUrl(tabId) {
  const resolvedTabId = await resolveTabId(tabId);
  const tab = await chrome.tabs.get(resolvedTabId);
  return { success: true, url: tab.url, title: tab.title };
}

async function getTabText(tabId) {
  const resolvedTabId = await resolveTabId(tabId);
  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: () => document.body.innerText
  });

  return { success: true, tabId: resolvedTabId, text: results[0].result };
}

async function getTabDom(tabId, options = {}) {
  const resolvedTabId = await resolveTabId(tabId);
  const selector = typeof options.selector === 'string' ? options.selector : '';
  const maxNodesRaw = Number(options.maxNodes);
  const maxNodes = Number.isFinite(maxNodesRaw) ? Math.min(Math.max(Math.trunc(maxNodesRaw), 1), 500) : 80;
  const includeHidden = options.includeHidden === true;
  const includeHtml = options.includeHtml === true;
  const maxTextLengthRaw = Number(options.maxTextLength);
  const maxTextLength = Number.isFinite(maxTextLengthRaw) ? Math.min(Math.max(Math.trunc(maxTextLengthRaw), 20), 2000) : 240;
  const maxHtmlLengthRaw = Number(options.maxHtmlLength);
  const maxHtmlLength = Number.isFinite(maxHtmlLengthRaw) ? Math.min(Math.max(Math.trunc(maxHtmlLengthRaw), 50), 8000) : 600;

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: (opts) => {
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      };

      const cleanText = (value, limit) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
      const cleanClass = (value) => String(value || '').trim().replace(/\s+/g, '.');

      const toNode = (el, idx) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const text = cleanText(el.innerText || el.textContent || '', opts.maxTextLength);
        const node = {
          index: idx,
          tag: String(el.tagName || '').toLowerCase(),
          id: el.id || null,
          className: el.className || null,
          role: el.getAttribute('role') || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          name: el.getAttribute('name') || null,
          type: el.getAttribute('type') || null,
          placeholder: el.getAttribute('placeholder') || null,
          href: el.getAttribute('href') || null,
          text,
          visible: isVisible(el),
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          display: style.display,
          visibility: style.visibility,
        };
        if (opts.includeHtml) {
          node.outerHTML = String(el.outerHTML || '').slice(0, opts.maxHtmlLength);
        }
        const classSuffix = node.className ? `.${cleanClass(node.className)}` : '';
        const idSuffix = node.id ? `#${node.id}` : '';
        node.label = `${node.tag}${idSuffix}${classSuffix}`;
        return node;
      };

      let all = [];
      let invalidSelector = null;

      if (opts.selector) {
        try {
          all = Array.from(document.querySelectorAll(opts.selector));
        } catch (err) {
          invalidSelector = err instanceof Error ? err.message : String(err);
        }
      } else {
        const body = document.body;
        const descendants = body ? Array.from(body.querySelectorAll('*')) : [];
        all = body ? [body, ...descendants] : descendants;
      }

      if (invalidSelector) {
        return { success: false, error: `Invalid selector: ${invalidSelector}` };
      }

      const filtered = opts.includeHidden ? all : all.filter((el) => isVisible(el));
      const limited = filtered.slice(0, opts.maxNodes);
      const nodes = limited.map((el, idx) => toNode(el, idx));

      return {
        success: true,
        mode: opts.selector ? 'selector' : 'snapshot',
        selector: opts.selector || null,
        totalMatched: filtered.length,
        returnedCount: nodes.length,
        truncated: filtered.length > opts.maxNodes,
        page: {
          title: document.title || '',
          url: location.href,
        },
        nodes,
      };
    },
    args: [{ selector, maxNodes, includeHidden, includeHtml, maxTextLength, maxHtmlLength }],
  });

  const payload = results?.[0]?.result;
  if (!payload || typeof payload !== 'object') {
    return { success: false, tabId: resolvedTabId, error: 'get_dom did not return a valid result', details: results?.[0] || null };
  }
  return { tabId: resolvedTabId, ...payload };
}

async function getTabHtml(tabId, maxChars) {
  const resolvedTabId = await resolveTabId(tabId);
  const maxCharsRaw = Number(maxChars);
  const resolvedMaxChars = Number.isFinite(maxCharsRaw) ? Math.min(Math.max(Math.trunc(maxCharsRaw), 1000), 500000) : 120000;

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: (limit) => {
      const html = String(document.documentElement?.outerHTML || '');
      return {
        success: true,
        page: {
          title: document.title || '',
          url: location.href,
        },
        totalLength: html.length,
        truncated: html.length > limit,
        html: html.slice(0, limit),
      };
    },
    args: [resolvedMaxChars],
  });

  const payload = results?.[0]?.result;
  if (!payload || typeof payload !== 'object') {
    return { success: false, tabId: resolvedTabId, error: 'get_html did not return a valid result', details: results?.[0] || null };
  }
  return { tabId: resolvedTabId, ...payload };
}

async function sendChat(tabId, text) {
  const resolvedTabId = await resolveTabId(tabId);

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async (message) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const input = document.querySelector(
        '[role="textbox"][aria-label*="prompt" i], rich-textarea [contenteditable="true"], textarea[aria-label*="prompt" i], [contenteditable="true"], textarea'
      );
      if (!input) return { success: false, error: 'Input not found' };

      input.focus();

      const isContentEditable = input.getAttribute('contenteditable') === 'true' || input.tagName === 'DIV';
      if (isContentEditable) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);

        const inserted = document.execCommand && document.execCommand('insertText', false, message);
        if (!inserted) {
          input.textContent = message;
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message }));
        }
      } else {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (setter) {
          setter.call(input, message);
        } else {
          input.value = message;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      await sleep(180);

      const getSendButton = () => Array.from(document.querySelectorAll('button'))
        .filter(isVisible)
        .find((btn) => {
          const label = String(btn.getAttribute('aria-label') || btn.textContent || '').trim().toLowerCase();
          return /send message|send/.test(label);
        });

      let sendBtn = getSendButton();
      for (let i = 0; i < 8; i += 1) {
        if (sendBtn && !sendBtn.disabled) break;
        await sleep(120);
        sendBtn = getSendButton();
      }

      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        await sleep(220);
      } else {
        const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        const enterUp = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        input.dispatchEvent(enterDown);
        input.dispatchEvent(enterUp);
        await sleep(220);
      }

      const stillHasMessage = isContentEditable
        ? String(input.textContent || '').trim().length > 0
        : String(input.value || '').trim().length > 0;

      if (stillHasMessage) {
        const retryButton = getSendButton();
        if (retryButton && !retryButton.disabled) {
          retryButton.click();
          await sleep(220);
        }

        const stillAfterRetry = isContentEditable
          ? String(input.textContent || '').trim().length > 0
          : String(input.value || '').trim().length > 0;

        if (stillAfterRetry) {
          return { success: false, error: 'Message remained in composer after submit attempt' };
        }
      }

      return { success: true, method: sendBtn && !sendBtn.disabled ? 'button' : 'enter' };
    },
    args: [text]
  });

  const result = results[0]?.result;
  if (!result?.success) {
    return { success: false, tabId: resolvedTabId, error: result?.error || 'Failed to send chat' };
  }

  return { success: true, tabId: resolvedTabId, text, method: result.method || 'unknown' };
}

async function injectBadge(tabId, text) {
  const resolvedTabId = await resolveTabId(tabId);
  const badgeText = text || 'ORACLE';

  await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: (bt) => {
      const existing = document.getElementById('oracle-badge');
      if (existing) existing.remove();
      
      const badge = document.createElement('div');
      badge.id = 'oracle-badge';
      badge.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 999999;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      `;
      badge.textContent = bt;
      document.body.appendChild(badge);
      
      setTimeout(() => badge.remove(), 5000);
      
      return { success: true };
    },
    args: [badgeText]
  });

  return { success: true, tabId: resolvedTabId, injected: true };
}

async function injectStatusBadge(tabId) {
  const resolvedTabId = await resolveTabId(tabId);
  const statusText = connected ? 'ONLINE' : 'OFFLINE';

  await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: (status, tid) => {
      const existing = document.getElementById('oracle-status-id-badge');
      if (existing) existing.remove();

      const online = status === 'ONLINE';
      const bg = online
        ? 'linear-gradient(135deg, rgba(7,105,84,0.94), rgba(16,185,129,0.94))'
        : 'linear-gradient(135deg, rgba(127,29,29,0.94), rgba(239,68,68,0.94))';
      const border = online
        ? '1px solid rgba(110,231,183,0.75)'
        : '1px solid rgba(254,202,202,0.72)';

      const badge = document.createElement('div');
      badge.id = 'oracle-status-id-badge';
      badge.style.cssText = [
        'position:fixed',
        'top:12px',
        'left:12px',
        'z-index:999999',
        'padding:8px 12px',
        'border-radius:10px',
        'font:600 12px/1.3 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        'letter-spacing:0.2px',
        'color:#f8fbff',
        `background:${bg}`,
        border,
        'box-shadow:0 6px 22px rgba(0,0,0,0.25)'
      ].join(';');
      badge.textContent = `ORACLE ${status} | tab ${tid}`;
      document.body.appendChild(badge);
      return { success: true };
    },
    args: [statusText, resolvedTabId]
  });

  return {
    success: true,
    tabId: resolvedTabId,
    status: statusText,
    injected: true
  };
}

async function injectStatusBadgeToAllGeminiTabs() {
  const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
  await Promise.all(
    tabs
      .filter((tab) => Number.isInteger(tab.id))
      .map((tab) => injectStatusBadge(tab.id).catch(() => null))
  );
}

async function selectModel(tabId, model, accountIndex) {
  const resolvedTabId = await resolveAppTabId(tabId, accountIndex);
  const requestedModel = String(model || '').toLowerCase();

  try {
    const tab = await chrome.tabs.get(resolvedTabId);
    await chrome.tabs.update(resolvedTabId, { active: true });
    if (tab?.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } catch {
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async (targetModelRaw) => {
      const targetModel = String(targetModelRaw || '').toLowerCase();

      const normalizeLabel = (txt) => String(txt || '').trim().toLowerCase();
      const compressLabel = (txt) => String(txt || '').replace(/\s+/g, ' ').trim();
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      const picker = document.querySelector('button[data-test-id="bard-mode-menu-button"], button[aria-label="Open mode picker"], button[aria-label*="mode picker" i]');
      if (!picker) {
        return {
          success: false,
          error: 'Model picker not found in current UI',
          context: { url: location.href, title: document.title }
        };
      }

      const deriveModelName = (label, fallbackModel) => {
        const raw = compressLabel(label);
        const canonical = {
          fast: 'Fast',
          thinking: 'Thinking',
          pro: 'Pro'
        };
        if (canonical[fallbackModel]) {
          return canonical[fallbackModel];
        }
        if (/thinking/i.test(raw)) return 'Thinking';
        if (/fast/i.test(raw)) return 'Fast';
        if (/pro/i.test(raw)) return 'Pro';
        return String(fallbackModel || raw || '');
      };

      const aliases = {
        fast: [/\bfast\b/i],
        thinking: [/\bthinking\b/i],
        pro: [/\bpro\b/i]
      };
      const wanted = aliases[targetModel] || [new RegExp(targetModel, 'i')];
      picker.click();
      await sleep(120);

      let options = [];
      const isInteractable = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.pointerEvents !== 'none';
      };
      for (let i = 0; i < 8; i += 1) {
        const menuRoots = Array.from(document.querySelectorAll('[role="menu"]'));
        const activeMenu = menuRoots.find((m) => m.querySelector('[role="menuitemradio"]') && m.offsetParent !== null)
          || menuRoots.reverse().find((m) => m.querySelector('[role="menuitemradio"]'))
          || null;

        const radioOptions = activeMenu
          ? Array.from(activeMenu.querySelectorAll('[role="menuitemradio"]')).filter(isInteractable)
          : Array.from(document.querySelectorAll('[role="menuitemradio"]')).filter(isInteractable);

        if (radioOptions.length > 0) {
          options = radioOptions;
          break;
        }
        await sleep(120);
      }

      if (options.length === 0) {
        picker.click();
        await sleep(180);
        const menuRoot = document.querySelector('[role="menu"]') || document.body;
        options = Array.from(menuRoot.querySelectorAll('[role="menuitemradio"], [role="menuitem"], [role="option"]')).filter(isInteractable);
      }

      if (options.length === 0) {
        return { success: false, error: 'Model menu did not open' };
      }

      let match = options.find((opt) => {
        const label = normalizeLabel(opt.textContent);
        return wanted.some((pattern) => pattern.test(label));
      });

      if (!match) {
        const labels = options.map((opt) => normalizeLabel(opt.textContent)).filter(Boolean).slice(0, 8);
        if (targetModel === 'pro') {
          const pageText = normalizeLabel(document.body?.innerText || '');
          const upsellDetected = /upgrade to google ai plus/.test(pageText);
          if (upsellDetected) {
            return {
              success: false,
              error: 'Model is currently unavailable: pro',
              modelName: 'Pro',
              unavailable: true,
              reason: 'upsell-gated',
              labels
            };
          }
        }
        return { success: false, error: `Model option not found: ${targetModel}`, labels };
      }

      const checked = match.getAttribute('aria-checked') === 'true';
      const disabled = match.getAttribute('aria-disabled') === 'true' || match.hasAttribute('disabled');
      const matchedLabel = compressLabel(match.textContent) || targetModel;
      const matchedModelName = deriveModelName(matchedLabel, targetModel);
      if (checked) {
        return { success: true, model: targetModel, modelName: matchedModelName, menuLabel: matchedLabel, alreadySelected: true };
      }
      if (disabled) {
        return {
          success: false,
          error: `Model is currently unavailable: ${targetModel}`,
          modelName: matchedModelName,
          menuLabel: matchedLabel,
          unavailable: true
        };
      }

      const beforePickerLabel = normalizeLabel(picker.textContent);
      match.click();
      await sleep(240);

      const afterPickerLabel = normalizeLabel(picker.textContent);
      const afterChecked = match.getAttribute('aria-checked') === 'true';
      const selectedByLabel = wanted.some((pattern) => pattern.test(afterPickerLabel));

      if (afterChecked || selectedByLabel) {
        return {
          success: true,
          model: targetModel,
          modelName: matchedModelName,
          menuLabel: matchedLabel,
          beforePickerLabel,
          afterPickerLabel
        };
      }

      const pageText = normalizeLabel(document.body?.innerText || '');
      const upsellDetected = /upgrade to google ai plus/.test(pageText);
      if (targetModel === 'pro' && upsellDetected) {
        return {
          success: false,
          error: 'Model is currently unavailable: pro',
          modelName: matchedModelName,
          menuLabel: matchedLabel,
          unavailable: true,
          beforePickerLabel,
          afterPickerLabel,
          reason: 'upsell-gated'
        };
      }

      return {
        success: false,
        error: `Model selection did not stick: ${targetModel}`,
        modelName: matchedModelName,
        menuLabel: matchedLabel,
        beforePickerLabel,
        afterPickerLabel
      };
    },
    args: [requestedModel]
  });

  const result = results[0]?.result;
  if (!result?.success) {
    return {
      success: false,
      tabId: resolvedTabId,
      model: requestedModel,
      modelName: result?.modelName,
      menuLabel: result?.menuLabel,
      error: result?.error || 'Unknown model selection failure',
      details: result || null
    };
  }

  return {
    success: true,
    tabId: resolvedTabId,
    model: requestedModel,
    modelName: result?.modelName || requestedModel,
    menuLabel: result?.menuLabel,
    alreadySelected: Boolean(result?.alreadySelected)
  };
}

async function listTools(tabId, accountIndex) {
  const resolvedTabId = await resolveAppTabId(tabId, accountIndex);

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async () => {
      const normalize = (txt) => String(txt || '').replace(/\s+/g, ' ').trim();
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };

      const composer = document.querySelector('textarea, [contenteditable="true"], [aria-label*="prompt" i]');
      if (composer) {
        composer.click();
        await sleep(120);
      }

      const ensureToolsButton = async () => {
        let visibleButtons = Array.from(document.querySelectorAll('button')).filter(isVisible);
        let found = visibleButtons.find((btn) => {
          const label = normalize(btn.getAttribute('aria-label') || btn.textContent);
          return /\btools\b/i.test(label);
        });

        if (!found) {
          const newChat = Array.from(document.querySelectorAll('a,button')).find((el) => {
            const label = normalize(el.getAttribute('aria-label') || el.textContent);
            return /\bnew\s+chat\b/i.test(label);
          });
          if (newChat) {
            newChat.click();
            await sleep(400);
            visibleButtons = Array.from(document.querySelectorAll('button')).filter(isVisible);
            found = visibleButtons.find((btn) => {
              const label = normalize(btn.getAttribute('aria-label') || btn.textContent);
              return /\btools\b/i.test(label);
            });
          }
        }

        return { found, visibleButtons };
      };

      const ensured = await ensureToolsButton();
      const toolsButton = ensured.found;
      if (!toolsButton) {
        return {
          success: false,
          error: 'Tools button not found',
          buttons: ensured.visibleButtons
            .map((b) => normalize(b.getAttribute('aria-label') || b.textContent))
            .filter(Boolean)
            .slice(0, 20)
        };
      }

      toolsButton.click();
      await sleep(180);

      let menu = null;
      for (let i = 0; i < 8; i += 1) {
        const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(isVisible);
        const target = menus.find((m) => /tools/i.test(normalize(m.textContent))) || menus[menus.length - 1];
        if (target) {
          menu = target;
          break;
        }
        await sleep(120);
      }

      if (!menu) {
        return { success: false, error: 'Tools menu not open' };
      }

      const rawItems = Array.from(menu.querySelectorAll('[role="menuitemcheckbox"], [role="menuitem"], [role="menuitemradio"]'));
      const items = rawItems.map((el) => {
        const label = normalize(el.textContent);
        const disabled = el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled');
        return {
          label,
          disabled,
          role: el.getAttribute('role') || 'menuitem'
        };
      }).filter((x) => x.label.length > 0);

      const pageText = normalize(document.body?.innerText || '');
      const gated = /get access to all tools and features|upgrade to google ai plus|sign in/i.test(pageText);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      return {
        success: true,
        items,
        count: items.length,
        gated,
        menuTitle: normalize(menu.textContent).split(' ').slice(0, 2).join(' ')
      };
    }
  });

  const result = results[0]?.result;
  if (!result?.success) {
    return {
      success: false,
      tabId: resolvedTabId,
      error: result?.error || 'Failed to list tools',
      details: result || null
    };
  }

  return {
    success: true,
    tabId: resolvedTabId,
    items: result.items,
    count: result.count,
    gated: Boolean(result.gated),
    menuTitle: result.menuTitle
  };
}

async function selectTool(tabId, tool, accountIndex) {
  const resolvedTabId = await resolveAppTabId(tabId, accountIndex);
  const targetTool = String(tool || '').trim().toLowerCase();

  if (!targetTool) {
    return { success: false, tabId: resolvedTabId, error: 'Missing tool name' };
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: async (target) => {
      const normalize = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };

      const composer = document.querySelector('textarea, [contenteditable="true"], [aria-label*="prompt" i]');
      if (composer) {
        composer.click();
        await sleep(120);
      }

      const ensureToolsButton = async () => {
        let visibleButtons = Array.from(document.querySelectorAll('button')).filter(isVisible);
        let found = visibleButtons.find((btn) => {
          const label = normalize(btn.getAttribute('aria-label') || btn.textContent);
          return /\btools\b/i.test(label);
        });

        if (!found) {
          const newChat = Array.from(document.querySelectorAll('a,button')).find((el) => {
            const label = normalize(el.getAttribute('aria-label') || el.textContent);
            return /\bnew\s+chat\b/i.test(label);
          });
          if (newChat) {
            newChat.click();
            await sleep(400);
            visibleButtons = Array.from(document.querySelectorAll('button')).filter(isVisible);
            found = visibleButtons.find((btn) => {
              const label = normalize(btn.getAttribute('aria-label') || btn.textContent);
              return /\btools\b/i.test(label);
            });
          }
        }

        return { found, visibleButtons };
      };

      const ensured = await ensureToolsButton();
      const toolsButton = ensured.found;
      if (!toolsButton) {
        return {
          success: false,
          error: 'Tools button not found',
          buttons: ensured.visibleButtons
            .map((b) => normalize(b.getAttribute('aria-label') || b.textContent))
            .filter(Boolean)
            .slice(0, 20)
        };
      }

      toolsButton.click();
      await sleep(180);

      let menu = null;
      for (let i = 0; i < 8; i += 1) {
        const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(isVisible);
        const targetMenu = menus.find((m) => /tools/.test(normalize(m.textContent))) || menus[menus.length - 1];
        if (targetMenu) {
          menu = targetMenu;
          break;
        }
        await sleep(100);
      }

      if (!menu) {
        return { success: false, error: 'Tools menu not open' };
      }

      const items = Array.from(menu.querySelectorAll('[role="menuitemcheckbox"], [role="menuitem"], [role="menuitemradio"]'));
      const match = items.find((el) => {
        const label = normalize(el.textContent);
        return label.includes(target);
      });

      if (!match) {
        const labels = items.map((el) => normalize(el.textContent)).filter(Boolean);
        return { success: false, error: `Tool not found: ${target}`, labels };
      }

      const label = String(match.textContent || '').replace(/\s+/g, ' ').trim();
      const disabled = match.getAttribute('aria-disabled') === 'true' || match.hasAttribute('disabled');
      if (disabled) {
        return { success: false, error: `Tool is disabled: ${label}`, label, disabled: true };
      }

      match.click();
      await sleep(120);
      return { success: true, label, disabled: false };
    },
    args: [targetTool]
  });

  const result = results[0]?.result;
  if (!result?.success) {
    return {
      success: false,
      tabId: resolvedTabId,
      error: result?.error || 'Failed to select tool',
      details: result || null
    };
  }

  return {
    success: true,
    tabId: resolvedTabId,
    tool: targetTool,
    label: result.label
  };
}

async function createImage(tabId, prompt, accountIndex) {
  return createWithTool(tabId, 'create image', prompt, accountIndex);
}

async function createWithTool(tabId, tool, prompt, accountIndex) {
  const resolvedTabId = await resolveAppTabId(tabId, accountIndex);
  const toolName = String(tool || '').trim().toLowerCase();
  const toolPrompt = String(prompt || '').trim();

  if (!toolName) {
    return { success: false, tabId: resolvedTabId, error: 'Missing tool name' };
  }
  if (!toolPrompt) {
    return { success: false, tabId: resolvedTabId, error: 'Missing prompt' };
  }

  const toolResult = await selectTool(resolvedTabId, toolName, accountIndex);
  let finalTabId = resolvedTabId;
  let finalToolResult = toolResult;

  if (!finalToolResult.success && String(finalToolResult.error || '').includes('Tools button not found')) {
    const freshTab = await createGeminiTab(geminiAppUrl(accountIndex), undefined, accountIndex);
    if (freshTab?.success && Number.isInteger(freshTab.tabId)) {
      finalTabId = freshTab.tabId;
      let ready = false;
      for (let i = 0; i < 12; i += 1) {
        await new Promise((r) => setTimeout(r, 500));
        const probe = await listTools(finalTabId, accountIndex);
        if (probe?.success) {
          ready = true;
          break;
        }
      }

      if (ready) {
        finalToolResult = await selectTool(finalTabId, toolName, accountIndex);
      } else {
        finalToolResult = {
          success: false,
          error: 'Tools not available on fresh /app tab yet',
          details: freshTab
        };
      }
    }
  }

  if (!finalToolResult.success) {
    return {
      success: false,
      tabId: finalTabId,
      error: finalToolResult.error || `Failed to activate tool: ${toolName}`,
      details: finalToolResult.details || null
    };
  }

  const chatResult = await sendChat(finalTabId, toolPrompt);
  if (!chatResult.success) {
    return {
      success: false,
      tabId: finalTabId,
      error: chatResult.error || `Failed to send prompt for tool: ${toolName}`
    };
  }

  return {
    success: true,
    tabId: finalTabId,
    tool: toolName,
    prompt: toolPrompt,
    method: chatResult.method || 'unknown'
  };
}

async function getTabState(tabId) {
  const resolvedTabId = await resolveTabId(tabId);

  const results = await chrome.scripting.executeScript({
    target: { tabId: resolvedTabId },
    func: () => {
      const url = window.location.href;
      const title = document.title;

      const loading = Boolean(
        document.querySelector('[aria-label="Loading"]') ||
        document.querySelector('.loading') ||
        document.querySelector('[data-test-id="loading"]')
      );

      const responseCount =
        document.querySelectorAll('message-content, model-response, [data-test-id="response"], [data-response-index]').length;

      let mode = 'chat';
      if (url.includes('mode=research') || /deep\s+research/i.test(document.body?.innerText || '')) mode = 'research';
      else if (url.includes('mode=canvas') || /\bcanvas\b/i.test(document.body?.innerText || '')) mode = 'canvas';

      return {
        success: true,
        url,
        title,
        loading,
        responseCount,
        mode
      };
    }
  });

  const response = results[0]?.result;
  return {
    tabId: resolvedTabId,
    ...(response || { success: false, error: 'Failed to read tab state' })
  };
}

function setupSidePanelBehavior() {
  if (!chrome.sidePanel?.setPanelBehavior) {
    return;
  }

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.error('[Oracle Proxy] Failed to set side panel behavior:', err);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === 'reconnect') {
    connectMQTT();
    sendResponse({ success: true, connected });
    return true;
  }

  if (msg?.action === 'connection_state') {
    sendResponse({ success: true, connected });
    return true;
  }

  if (msg?.action === 'list_gemini_tabs') {
    listGeminiTabs()
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'list_flow_tabs') {
    listFlowTabs()
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'list_tabs_all') {
    listAllTabs()
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'open_gemini_tab') {
    createGeminiTab(msg?.url, msg?.mode, parseAccountIndex(msg?.accountIndex))
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'open_flow_tab') {
    createFlowTab(msg?.url, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'open_flow_project') {
    openFlowProject(msg?.projectId, msg?.tabId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_current_project') {
    flowCurrentProject(msg?.tabId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_new_project') {
    flowNewProject(msg?.tabId, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_select_tool') {
    flowSelectTool(msg?.tabId, msg?.tool, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_submit_prompt') {
    flowSubmitPrompt(msg?.tabId, msg?.prompt || msg?.text, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_configure_create_image') {
    flowConfigureCreateImage(
      msg?.tabId,
      {
        aspectRatio: msg?.aspectRatio,
        outputsPerPrompt: msg?.outputsPerPrompt,
        model: msg?.model
      },
      msg?.projectId
    )
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_simulate_image_to_video') {
    flowSimulateImageToVideo(msg?.tabId, msg?.imagePrompt, msg?.videoPrompt, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  // New Flow UI Commands (Ingredients mode, Veo 3.1, etc.)
  if (msg?.action === 'flow_select_video_tab') {
    flowSelectVideoTab(msg?.tabId, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_select_image_tab') {
    flowSelectImageTab(msg?.tabId, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_select_ingredients_mode') {
    flowSelectIngredientsMode(msg?.tabId, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_select_reference_mode') {
    flowSelectReferenceMode(msg?.tabId, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_select_frames_mode') {
    flowSelectFramesMode(msg?.tabId, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_select_frame_slot') {
    flowSelectFrameSlot(msg?.tabId, msg?.slot, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_select_asset') {
    flowSelectAsset(msg?.tabId, msg?.assetId, msg?.projectId, msg?.slot, msg?.assetIndex, msg?.assetExactId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_select_latest_image_ingredient') {
    flowSelectLatestImageIngredient(msg?.tabId, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_set_model') {
    flowSetModel(msg?.tabId, msg?.model, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_set_multiplier') {
    flowSetMultiplier(msg?.tabId, msg?.multiplier, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_set_aspect_ratio') {
    flowSetAspectRatio(msg?.tabId, msg?.ratio, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_type_prompt') {
    flowTypePrompt(msg?.tabId, msg?.text, msg?.projectId, msg?.clearBeforeType)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_generate_video') {
    flowGenerateVideo(msg?.tabId, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'flow_generate_image') {
    flowGenerateImage(msg?.tabId, msg?.projectId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'get_url') {
    getTabUrl(msg?.tabId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'get_text') {
    getTabText(msg?.tabId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'get_dom') {
    getTabDom(msg?.tabId, {
      selector: msg?.selector,
      maxNodes: msg?.maxNodes,
      includeHidden: msg?.includeHidden,
      includeHtml: msg?.includeHtml,
      maxTextLength: msg?.maxTextLength,
      maxHtmlLength: msg?.maxHtmlLength,
    })
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'get_html') {
    getTabHtml(msg?.tabId, msg?.maxChars)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'get_state') {
    getTabState(msg?.tabId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'inject_status_badge') {
    injectStatusBadge(msg?.tabId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (msg?.action === 'select_model') {
    selectModel(msg?.tabId, msg?.model, parseAccountIndex(msg?.accountIndex))
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Oracle Proxy] Extension installed');
  setupSidePanelBehavior();
  connectMQTT();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Oracle Proxy] Browser started');
  setupSidePanelBehavior();
  connectMQTT();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab?.url?.startsWith('https://gemini.google.com/')) return;
  injectStatusBadge(tabId).catch(() => null);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.url?.startsWith('https://gemini.google.com/')) {
      await injectStatusBadge(tabId);
    }
  } catch {
  }
});

setupSidePanelBehavior();
connectMQTT();

setInterval(() => {
  if (connected) {
    publishStatus('online');
  }
}, 30000);
