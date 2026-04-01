const statusEl = document.getElementById('status');
const statusText = document.getElementById('status-text');
const statusMeta = document.getElementById('status-meta');
const tabsListEl = document.getElementById('tabs-list');
const flowTabsListEl = document.getElementById('flow-tabs-list');
const errorEl = document.getElementById('error');
const viewGeminiTabBtn = document.getElementById('view-gemini-tab');
const viewFlowTabBtn = document.getElementById('view-flow-tab');
const viewGeminiSection = document.getElementById('view-gemini');
const viewFlowSection = document.getElementById('view-flow');
const reconnectBtn = document.getElementById('reconnect');
const openTabBtn = document.getElementById('open-tab');
const openFlowBtn = document.getElementById('open-flow');
const openFlowProjectBtn = document.getElementById('open-flow-project');
const refreshTabsBtn = document.getElementById('refresh-tabs');
const refreshTabsGlobalBtn = document.getElementById('refresh-tabs-global');
const modelFastBtn = document.getElementById('model-fast');
const modelThinkingBtn = document.getElementById('model-thinking');
const modelProBtn = document.getElementById('model-pro');
const accountSelect = document.getElementById('account-select');
const accountCustom = document.getElementById('account-custom');
const accountHint = document.getElementById('account-hint');
const flowProjectInput = document.getElementById('flow-project-id');
const saveFlowProjectBtn = document.getElementById('save-flow-project');
const flowProjectHint = document.getElementById('flow-project-hint');
const flowModeSelect = document.getElementById('flow-mode-select');
const flowVideoSubmodeSelect = document.getElementById('flow-video-submode-select');
const flowAspectRatioSelect = document.getElementById('flow-aspect-ratio');
const flowMultiplierSelect = document.getElementById('flow-multiplier-select');
const flowModelSelect = document.getElementById('flow-model-select');
const flowApplyControlsBtn = document.getElementById('flow-apply-controls');
const flowPromptInput = document.getElementById('flow-prompt-input');
const flowAttachmentModeSelect = document.getElementById('flow-attachment-mode');
const flowFrameGrid = document.getElementById('flow-frame-grid');
const flowFrameStartAssetInput = document.getElementById('flow-frame-start-asset');
const flowFrameEndAssetInput = document.getElementById('flow-frame-end-asset');
const flowAssetListWrap = document.getElementById('flow-asset-list-wrap');
const flowAssetListInput = document.getElementById('flow-asset-list');
const flowAttachGrid = document.getElementById('flow-attach-grid');
const flowClearBeforeTypeInput = document.getElementById('flow-clear-before-type');
const flowSendBtn = document.getElementById('flow-send');
const flowRefreshProjectBtn = document.getElementById('flow-refresh-project');

const FLOW_MODEL_OPTIONS = {
  image: [
    { value: '', label: 'Model (keep)' },
    { value: 'Nano Banana Pro', label: 'Nano Banana Pro' },
    { value: 'Nano Banana 2', label: 'Nano Banana 2' },
    { value: 'Imagen 4', label: 'Imagen 4' }
  ],
  video: [
    { value: '', label: 'Model (keep)' },
    { value: 'Veo 3.1 - Fast', label: 'Veo 3.1 - Fast' },
    { value: 'Veo 3.1 - Quality', label: 'Veo 3.1 - Quality' },
    { value: 'Veo 2 - Fast', label: 'Veo 2 - Fast' },
    { value: 'Veo 2 - Quality', label: 'Veo 2 - Quality' }
  ]
};

const ACCOUNT_STORAGE_KEY = 'geminiAccountIndex';
const FLOW_PROJECT_STORAGE_KEY = 'flowProjectId';
const FLOW_CLEAR_PROMPT_STORAGE_KEY = 'flowClearPromptBeforeType';
const FLOW_ATTACHMENT_SETTINGS_KEY = 'flowAttachmentSettings';
const ACTIVE_VIEW_STORAGE_KEY = 'proxyActiveView';
let currentAccountIndex = 0;
let currentFlowProjectId = '';

function sendRuntimeMessage(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { success: false, error: 'No response' });
    });
  });
}

function updateStatus(online) {
  statusEl.className = 'status ' + (online ? 'online' : 'offline');
  statusText.textContent = online ? 'Connected to MQTT' : 'Disconnected';
  const suffix = `Target /u/${currentAccountIndex}`;
  const flowSuffix = currentFlowProjectId ? ` • flow ${currentFlowProjectId.slice(0, 8)}` : '';
  statusMeta.textContent = online ? `Broker reachable • ${suffix}${flowSuffix}` : `Broker unavailable • ${suffix}${flowSuffix}`;
}

function normalizeAccountIndex(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function normalizeFlowProjectId(value) {
  return String(value || '').trim().replace(/[^a-z0-9-]/gi, '');
}

function resolveFlowProjectIdForAction() {
  return normalizeFlowProjectId(flowProjectInput.value || currentFlowProjectId);
}

function getFlowMode() {
  const mode = String(flowModeSelect?.value || 'image').trim().toLowerCase();
  return mode === 'video' ? 'video' : 'image';
}

function syncFlowControlsVisibility() {
  if (!flowModelSelect || !flowVideoSubmodeSelect) return;

  const mode = getFlowMode();
  const isVideo = mode === 'video';
  const previousValue = String(flowModelSelect.value || '');
  const options = FLOW_MODEL_OPTIONS[mode];

  flowModelSelect.innerHTML = '';
  for (const item of options) {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    flowModelSelect.appendChild(opt);
  }

  const canKeepValue = options.some((item) => item.value === previousValue);
  flowModelSelect.value = canKeepValue ? previousValue : '';

  flowVideoSubmodeSelect.disabled = !isVideo;
  if (!isVideo) {
    flowVideoSubmodeSelect.value = '';
  }

  syncFlowAttachmentVisibility();
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeAttachmentMode(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'frames' || raw === 'ingredients' || raw === 'ref') return raw;
  return 'none';
}

function parseAssetIds(value) {
  const text = String(value || '');
  const parts = text
    .split(/[\n,]/g)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

function syncFlowAttachmentVisibility() {
  if (!flowAttachGrid || !flowAttachmentModeSelect || !flowFrameGrid || !flowAssetListWrap) return;
  const isVideo = getFlowMode() === 'video';
  flowAttachGrid.classList.toggle('hidden', !isVideo);
  if (!isVideo) {
    flowFrameGrid.classList.add('hidden');
    flowAssetListWrap.classList.add('hidden');
    return;
  }

  const mode = normalizeAttachmentMode(flowAttachmentModeSelect.value);
  flowFrameGrid.classList.toggle('hidden', mode !== 'frames');
  flowAssetListWrap.classList.toggle('hidden', !(mode === 'ingredients' || mode === 'ref'));
}

function formatGenerateDebugMeta(response) {
  if (!response || typeof response !== 'object') return '';
  const attempts = Array.isArray(response.attempts) ? response.attempts : [];
  const tail = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const detection = String(response.detection || tail?.detection || tail?.lastDetection || '').trim();
  const buttonMatchPath = String(response.buttonMatchPath || tail?.buttonMatchPath || '').trim();
  if (!buttonMatchPath && !detection) return '';
  const pathPart = buttonMatchPath || 'unknown';
  const signalPart = detection || 'none';
  return `Generate debug • match ${pathPart} • signal ${signalPart}`;
}

async function setActiveView(view) {
  const target = view === 'flow' ? 'flow' : 'gemini';
  const showFlow = target === 'flow';

  viewGeminiTabBtn.classList.toggle('active', !showFlow);
  viewFlowTabBtn.classList.toggle('active', showFlow);
  viewGeminiSection.classList.toggle('active', !showFlow);
  viewFlowSection.classList.toggle('active', showFlow);

  await chrome.storage.local.set({ [ACTIVE_VIEW_STORAGE_KEY]: target });
}

function updateAccountHint() {
  accountHint.textContent = `Using /u/${currentAccountIndex}`;
}

function updateFlowProjectHint() {
  flowProjectHint.textContent = currentFlowProjectId
    ? `Target project: ${currentFlowProjectId}`
    : 'No project ID selected';
}

function syncAccountInputs() {
  const presets = new Set(['0', '1', '2']);
  const asText = String(currentAccountIndex);
  if (presets.has(asText)) {
    accountSelect.value = asText;
    accountCustom.disabled = true;
    accountCustom.value = asText;
  } else {
    accountSelect.value = 'custom';
    accountCustom.disabled = false;
    accountCustom.value = asText;
  }
  updateAccountHint();
}

async function saveAccountIndex(index) {
  currentAccountIndex = normalizeAccountIndex(index);
  syncAccountInputs();
  await chrome.storage.local.set({ [ACCOUNT_STORAGE_KEY]: currentAccountIndex });
  updateStatus(statusEl.classList.contains('online'));
}

async function loadAccountIndex() {
  const stored = await chrome.storage.local.get(ACCOUNT_STORAGE_KEY);
  currentAccountIndex = normalizeAccountIndex(stored?.[ACCOUNT_STORAGE_KEY] ?? 0);
  syncAccountInputs();
}

async function loadFlowProjectId() {
  const stored = await chrome.storage.local.get(FLOW_PROJECT_STORAGE_KEY);
  currentFlowProjectId = normalizeFlowProjectId(stored?.[FLOW_PROJECT_STORAGE_KEY] || '');
  flowProjectInput.value = currentFlowProjectId;
  updateFlowProjectHint();
}

async function loadActiveView() {
  const stored = await chrome.storage.local.get(ACTIVE_VIEW_STORAGE_KEY);
  const view = String(stored?.[ACTIVE_VIEW_STORAGE_KEY] || 'gemini').toLowerCase();
  await setActiveView(view === 'flow' ? 'flow' : 'gemini');
}

async function loadFlowSendOptions() {
  const stored = await chrome.storage.local.get(FLOW_CLEAR_PROMPT_STORAGE_KEY);
  if (flowClearBeforeTypeInput) {
    flowClearBeforeTypeInput.checked = normalizeBoolean(stored?.[FLOW_CLEAR_PROMPT_STORAGE_KEY]);
  }
}

async function loadFlowAttachmentSettings() {
  const stored = await chrome.storage.local.get(FLOW_ATTACHMENT_SETTINGS_KEY);
  const data = stored?.[FLOW_ATTACHMENT_SETTINGS_KEY] || {};
  if (flowAttachmentModeSelect) {
    flowAttachmentModeSelect.value = normalizeAttachmentMode(data.mode);
  }
  if (flowFrameStartAssetInput) {
    flowFrameStartAssetInput.value = String(data.startAssetId || '').trim();
  }
  if (flowFrameEndAssetInput) {
    flowFrameEndAssetInput.value = String(data.endAssetId || '').trim();
  }
  if (flowAssetListInput) {
    flowAssetListInput.value = String(data.assetList || '');
  }
  syncFlowAttachmentVisibility();
}

async function saveFlowSendOptions() {
  if (!flowClearBeforeTypeInput) return;
  await chrome.storage.local.set({ [FLOW_CLEAR_PROMPT_STORAGE_KEY]: Boolean(flowClearBeforeTypeInput.checked) });
}

async function saveFlowAttachmentSettings() {
  if (!flowAttachmentModeSelect) return;
  await chrome.storage.local.set({
    [FLOW_ATTACHMENT_SETTINGS_KEY]: {
      mode: normalizeAttachmentMode(flowAttachmentModeSelect.value),
      startAssetId: String(flowFrameStartAssetInput?.value || '').trim(),
      endAssetId: String(flowFrameEndAssetInput?.value || '').trim(),
      assetList: String(flowAssetListInput?.value || ''),
    }
  });
}

function getFlowAttachmentPlan() {
  const mode = normalizeAttachmentMode(flowAttachmentModeSelect?.value);
  if (getFlowMode() !== 'video' || mode === 'none') {
    return { mode: 'none', assetIds: [] };
  }

  if (mode === 'frames') {
    const startAssetId = String(flowFrameStartAssetInput?.value || '').trim();
    const endAssetId = String(flowFrameEndAssetInput?.value || '').trim();
    return { mode, startAssetId, endAssetId };
  }

  const assetIds = parseAssetIds(flowAssetListInput?.value || '');
  return { mode, assetIds };
}

async function applyFlowAttachments(projectId) {
  const plan = getFlowAttachmentPlan();
  if (plan.mode === 'none') {
    return { success: true, applied: 'none' };
  }

  if (plan.mode === 'frames') {
    if (!plan.startAssetId || !plan.endAssetId) {
      return { success: false, error: 'Frames mode requires both Start and End image IDs' };
    }

    const startSlot = await sendRuntimeMessage({ action: 'flow_select_frame_slot', slot: 'start', projectId });
    if (!startSlot?.success) {
      return { success: false, error: startSlot?.error || 'Failed to select Start frame slot' };
    }

    const startAttach = await sendRuntimeMessage({ action: 'flow_select_asset', assetId: plan.startAssetId, projectId, slot: 'start' });
    if (!startAttach?.success) {
      return { success: false, error: startAttach?.error || `Failed to attach Start image: ${plan.startAssetId}` };
    }

    const endSlot = await sendRuntimeMessage({ action: 'flow_select_frame_slot', slot: 'end', projectId });
    if (!endSlot?.success) {
      return { success: false, error: endSlot?.error || 'Failed to select End frame slot' };
    }

    const endAttach = await sendRuntimeMessage({ action: 'flow_select_asset', assetId: plan.endAssetId, projectId, slot: 'end' });
    if (!endAttach?.success) {
      return { success: false, error: endAttach?.error || `Failed to attach End image: ${plan.endAssetId}` };
    }

    return { success: true, applied: 'frames', count: 2 };
  }

  if (!Array.isArray(plan.assetIds) || plan.assetIds.length === 0) {
    const label = plan.mode === 'ref' ? 'Ref' : 'Ingredients';
    return { success: false, error: `${label} mode requires at least one image ID` };
  }

  if (plan.mode === 'ingredients') {
    const ingredientsMode = await sendRuntimeMessage({ action: 'flow_select_ingredients_mode', projectId });
    if (!ingredientsMode?.success) {
      return { success: false, error: ingredientsMode?.error || 'Failed to switch to Ingredients mode before attach' };
    }
  }

  if (plan.mode === 'ref') {
    const referenceMode = await sendRuntimeMessage({ action: 'flow_select_reference_mode', projectId });
    if (!referenceMode?.success) {
      return { success: false, error: referenceMode?.error || 'Failed to switch to Ref mode before attach' };
    }
  }

  for (const assetId of plan.assetIds) {
    const attach = await sendRuntimeMessage({ action: 'flow_select_asset', assetId, projectId });
    if (!attach?.success) {
      return { success: false, error: attach?.error || `Failed to attach image: ${assetId}` };
    }
  }

  return { success: true, applied: plan.mode, count: plan.assetIds.length };
}

async function saveFlowProjectId(value) {
  currentFlowProjectId = normalizeFlowProjectId(value);
  flowProjectInput.value = currentFlowProjectId;
  updateFlowProjectHint();
  await chrome.storage.local.set({ [FLOW_PROJECT_STORAGE_KEY]: currentFlowProjectId });
  updateStatus(statusEl.classList.contains('online'));
}

function showError(message) {
  if (!message) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    return;
  }
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function renderTabs(tabs, listEl, emptyLabel) {
  listEl.innerHTML = '';

  if (!Array.isArray(tabs) || tabs.length === 0) {
    const li = document.createElement('li');
    li.textContent = emptyLabel;
    li.className = 'tab-meta';
    listEl.appendChild(li);
    return;
  }

  for (const tab of tabs) {
    const li = document.createElement('li');
    if (tab.active) {
      li.classList.add('active');
    }

    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = tab.title || '(untitled tab)';

    const meta = document.createElement('div');
    meta.className = 'tab-meta';
    const flowProject = normalizeFlowProjectId(tab.projectId || '') || normalizeFlowProjectId(String(tab.url || '').split('/project/')[1] || '');
    const flowInfo = flowProject ? ` • project ${flowProject.slice(0, 8)}` : '';
    meta.textContent = `id ${tab.id}${tab.active ? ' • active' : ''}${flowInfo}`;

    li.appendChild(title);
    li.appendChild(meta);
    listEl.appendChild(li);
  }
}

async function refreshTabs() {
  const response = await sendRuntimeMessage({ action: 'list_tabs_all' });
  if (!response?.success) {
    showError(response?.error || 'Failed to list tabs');
    renderTabs([], tabsListEl, 'No Gemini tabs found yet');
    renderTabs([], flowTabsListEl, 'No Flow tabs found yet');
    return;
  }

  const allTabs = Array.isArray(response.tabs) ? response.tabs : [];
  const flowTabs = allTabs.filter((tab) => String(tab.kind || '').toLowerCase() === 'flow' || String(tab.url || '').startsWith('https://labs.google/fx/tools/flow'));
  const geminiTabs = allTabs.filter((tab) => !flowTabs.includes(tab));

  showError('');
  renderTabs(geminiTabs, tabsListEl, 'No Gemini tabs found yet');
  renderTabs(flowTabs, flowTabsListEl, 'No Flow tabs found yet');
}

reconnectBtn.addEventListener('click', () => {
  showError('');
  sendRuntimeMessage({ action: 'reconnect' }).then((response) => {
    const ok = Boolean(response?.success && response?.connected);
    updateStatus(ok);
    if (!ok) {
      showError(response?.error || 'Reconnect failed');
      return;
    }
    refreshTabs();
  });
});

viewGeminiTabBtn.addEventListener('click', () => {
  setActiveView('gemini');
});

viewFlowTabBtn.addEventListener('click', () => {
  setActiveView('flow');
});

openTabBtn.addEventListener('click', async () => {
  openTabBtn.disabled = true;
  openTabBtn.textContent = 'Opening...';
  showError('');

  const response = await sendRuntimeMessage({ action: 'open_gemini_tab', accountIndex: currentAccountIndex });
  if (!response?.success) {
    showError(response?.error || 'Failed to open Gemini tab');
  } else {
    await refreshTabs();
  }

  openTabBtn.disabled = false;
  openTabBtn.textContent = 'Open Gemini';
});

openFlowBtn.addEventListener('click', async () => {
  openFlowBtn.disabled = true;
  openFlowBtn.textContent = 'Opening...';
  showError('');

  const projectId = resolveFlowProjectIdForAction();
  const response = projectId
    ? await sendRuntimeMessage({ action: 'open_flow_project', projectId })
    : await sendRuntimeMessage({ action: 'open_flow_tab' });
  if (!response?.success) {
    showError(response?.error || 'Failed to open Flow tab');
  } else {
    await refreshTabs();
  }

  openFlowBtn.disabled = false;
  openFlowBtn.textContent = 'Open Flow';
});

openFlowProjectBtn.addEventListener('click', async () => {
  openFlowProjectBtn.disabled = true;
  openFlowProjectBtn.textContent = 'Opening...';
  showError('');

  const projectId = resolveFlowProjectIdForAction();
  if (!projectId) {
    showError('Please enter Flow project ID first');
    openFlowProjectBtn.disabled = false;
    openFlowProjectBtn.textContent = 'Open Project ID';
    return;
  }

  await saveFlowProjectId(projectId);
  const response = await sendRuntimeMessage({ action: 'open_flow_project', projectId });
  if (!response?.success) {
    showError(response?.error || 'Failed to open Flow project');
  } else {
    await refreshTabs();
  }

  openFlowProjectBtn.disabled = false;
  openFlowProjectBtn.textContent = 'Open Project ID';
});

refreshTabsBtn.addEventListener('click', () => {
  refreshTabs();
});

refreshTabsGlobalBtn.addEventListener('click', () => {
  refreshTabs();
});

flowModeSelect.addEventListener('change', () => {
  syncFlowControlsVisibility();
  saveFlowAttachmentSettings();
});

flowVideoSubmodeSelect.addEventListener('change', () => {
  syncFlowControlsVisibility();
  saveFlowAttachmentSettings();
});

if (flowAttachmentModeSelect) {
  flowAttachmentModeSelect.addEventListener('change', () => {
    syncFlowAttachmentVisibility();
    saveFlowAttachmentSettings();
  });
}

if (flowFrameStartAssetInput) {
  flowFrameStartAssetInput.addEventListener('change', () => {
    saveFlowAttachmentSettings();
  });
}

if (flowFrameEndAssetInput) {
  flowFrameEndAssetInput.addEventListener('change', () => {
    saveFlowAttachmentSettings();
  });
}

if (flowAssetListInput) {
  flowAssetListInput.addEventListener('change', () => {
    saveFlowAttachmentSettings();
  });
}

if (flowClearBeforeTypeInput) {
  flowClearBeforeTypeInput.addEventListener('change', () => {
    saveFlowSendOptions();
  });
}

async function applyFlowControls() {
  const mode = getFlowMode();
  const projectId = resolveFlowProjectIdForAction() || undefined;

  const modeAction = mode === 'video' ? 'flow_select_video_tab' : 'flow_select_image_tab';
  const modeResponse = await sendRuntimeMessage({ action: modeAction, projectId });
  if (!modeResponse?.success) {
    return { success: false, error: modeResponse?.error || `Failed to set mode: ${mode}` };
  }

  if (mode === 'video') {
    const submode = String(flowVideoSubmodeSelect?.value || '').trim().toLowerCase();
    if (submode === 'ingredients' || submode === 'frames') {
      const submodeAction = submode === 'ingredients' ? 'flow_select_ingredients_mode' : 'flow_select_frames_mode';
      const submodeResponse = await sendRuntimeMessage({ action: submodeAction, projectId });
      if (!submodeResponse?.success) {
        return { success: false, error: submodeResponse?.error || `Failed to set video type: ${submode}` };
      }
    }
  }

  const ratio = String(flowAspectRatioSelect.value || '').trim();
  if (ratio) {
    const ratioResponse = await sendRuntimeMessage({ action: 'flow_set_aspect_ratio', ratio, projectId });
    if (!ratioResponse?.success) {
      return { success: false, error: ratioResponse?.error || `Failed to set ratio: ${ratio}` };
    }
  }

  const multiplier = String(flowMultiplierSelect.value || '').trim();
  if (multiplier) {
    const multiplierResponse = await sendRuntimeMessage({ action: 'flow_set_multiplier', multiplier, projectId });
    if (!multiplierResponse?.success) {
      return { success: false, error: multiplierResponse?.error || `Failed to set multiplier: ${multiplier}` };
    }
  }

  const model = String(flowModelSelect.value || '').trim();
  if (model) {
    const modelResponse = await sendRuntimeMessage({ action: 'flow_set_model', model, projectId });
    if (!modelResponse?.success) {
      return { success: false, error: modelResponse?.error || `Failed to set model: ${model}` };
    }
  }

  return { success: true, mode };
}

flowApplyControlsBtn.addEventListener('click', async () => {
  flowApplyControlsBtn.disabled = true;
  const prev = flowApplyControlsBtn.textContent;
  flowApplyControlsBtn.textContent = 'Applying...';
  showError('');

  const response = await applyFlowControls();

  if (!response?.success) {
    showError(response?.error || 'Failed to apply Flow controls');
  } else {
    statusMeta.textContent = `Flow controls applied (${response.mode})`;
  }

  flowApplyControlsBtn.disabled = false;
  flowApplyControlsBtn.textContent = prev;
});

flowSendBtn.addEventListener('click', async () => {
  const prompt = String(flowPromptInput.value || '').trim();
  if (!prompt) {
    showError('Please enter a prompt first');
    return;
  }

  flowSendBtn.disabled = true;
  const prev = flowSendBtn.textContent;
  flowSendBtn.textContent = 'Sending...';
  showError('');

  const controls = await applyFlowControls();
  if (!controls?.success) {
    showError(controls?.error || 'Failed to prepare Flow controls');
    flowSendBtn.disabled = false;
    flowSendBtn.textContent = prev;
    return;
  }

  const projectId = resolveFlowProjectIdForAction() || undefined;
  const attachResponse = await applyFlowAttachments(projectId);
  if (!attachResponse?.success) {
    showError(attachResponse?.error || 'Failed to attach images in Flow');
    flowSendBtn.disabled = false;
    flowSendBtn.textContent = prev;
    return;
  }

  const clearBeforeType = Boolean(flowClearBeforeTypeInput?.checked);
  const typeResponse = await sendRuntimeMessage({ action: 'flow_type_prompt', text: prompt, projectId, clearBeforeType });
  if (!typeResponse?.success) {
    showError(typeResponse?.error || 'Failed to type Flow prompt');
    flowSendBtn.disabled = false;
    flowSendBtn.textContent = prev;
    return;
  }

  const generateAction = controls.mode === 'video' ? 'flow_generate_video' : 'flow_generate_image';
  const generateResponse = await sendRuntimeMessage({ action: generateAction, projectId });
  if (!generateResponse?.success) {
    showError(generateResponse?.error || 'Failed to generate');
    const debugMeta = formatGenerateDebugMeta(generateResponse);
    if (debugMeta) {
      statusMeta.textContent = debugMeta;
    }
  } else {
    statusMeta.textContent = controls.mode === 'video' ? 'Video generation started' : 'Image generation started';
  }

  flowSendBtn.disabled = false;
  flowSendBtn.textContent = prev;
});

flowRefreshProjectBtn.addEventListener('click', async () => {
  flowRefreshProjectBtn.disabled = true;
  const prev = flowRefreshProjectBtn.textContent;
  flowRefreshProjectBtn.textContent = 'Reading...';
  showError('');

  const response = await sendRuntimeMessage({ action: 'flow_current_project' });
  if (!response?.success) {
    showError(response?.error || 'Failed to read current Flow project');
  } else {
    await saveFlowProjectId(response.projectId || '');
    await refreshTabs();
  }

  flowRefreshProjectBtn.disabled = false;
  flowRefreshProjectBtn.textContent = prev;
});

async function selectModel(model, button) {
  button.disabled = true;
  const prev = button.textContent;
  button.textContent = '...';
  showError('');

  const response = await sendRuntimeMessage({ action: 'select_model', model, accountIndex: currentAccountIndex });
  if (!response?.success) {
    showError(response?.error || `Failed to select model: ${model}`);
  } else {
    statusMeta.textContent = `Model selected: ${model}`;
  }

  button.disabled = false;
  button.textContent = prev;
}

modelFastBtn.addEventListener('click', () => selectModel('fast', modelFastBtn));
modelThinkingBtn.addEventListener('click', () => selectModel('thinking', modelThinkingBtn));
modelProBtn.addEventListener('click', () => selectModel('pro', modelProBtn));

accountSelect.addEventListener('change', async () => {
  if (accountSelect.value === 'custom') {
    accountCustom.disabled = false;
    accountCustom.focus();
    await saveAccountIndex(accountCustom.value);
    return;
  }
  accountCustom.disabled = true;
  await saveAccountIndex(accountSelect.value);
});

accountCustom.addEventListener('change', async () => {
  await saveAccountIndex(accountCustom.value);
});

saveFlowProjectBtn.addEventListener('click', async () => {
  const projectId = normalizeFlowProjectId(flowProjectInput.value);
  await saveFlowProjectId(projectId);
  showError('');
  if (!projectId) {
    await refreshTabs();
    return;
  }

  saveFlowProjectBtn.disabled = true;
  const prev = saveFlowProjectBtn.textContent;
  saveFlowProjectBtn.textContent = 'Opening...';

  const response = await sendRuntimeMessage({ action: 'open_flow_project', projectId });
  if (!response?.success) {
    showError(response?.error || 'Saved but failed to open project');
  }
  await refreshTabs();

  saveFlowProjectBtn.disabled = false;
  saveFlowProjectBtn.textContent = prev;
});

flowProjectInput.addEventListener('change', async () => {
  await saveFlowProjectId(flowProjectInput.value);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'status') {
    updateStatus(msg.online);
  }
});

async function initialize() {
  await loadAccountIndex();
  await loadFlowProjectId();
  await loadActiveView();
  await loadFlowSendOptions();
  await loadFlowAttachmentSettings();
  syncFlowControlsVisibility();
  const response = await sendRuntimeMessage({ action: 'connection_state' });
  if (response?.success) {
    updateStatus(Boolean(response.connected));
    refreshTabs();
    return;
  }
  updateStatus(false);
  showError(response?.error || 'Could not read runtime connection state');
  renderTabs([], tabsListEl, 'No Gemini tabs found yet');
  renderTabs([], flowTabsListEl, 'No Flow tabs found yet');
}

initialize();
