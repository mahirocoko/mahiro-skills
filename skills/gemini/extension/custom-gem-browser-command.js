export const CUSTOM_GEM_ACTION = 'gem_start_v1';
export const CUSTOM_GEM_COMMAND_VERSION = 'custom-gem-browser-command-v1';
export const CUSTOM_GEM_SUBMIT_ACTION = 'gem_submit_v1';
export const CUSTOM_GEM_SUBMIT_COMMAND_VERSION = 'custom-gem-browser-submit-command-v2';
export const CUSTOM_GEM_RECOVER_ACTION = 'gem_recover_v1';
export const CUSTOM_GEM_RECOVER_COMMAND_VERSION = 'custom-gem-browser-recover-command-v1';
export const CUSTOM_GEM_RECOVERY_RESULT_VERSION = 'custom-gem-browser-recovery-result-v1';
export const CUSTOM_GEM_UPLOAD_RESULT_VERSION = 'custom-gem-source-upload-result-v2';
export const CUSTOM_GEM_RESULT_VERSION = 'custom-gem-browser-result-v1';
export const CUSTOM_GEM_BROWSER_CONTROL_EXTENSION_IDS = Object.freeze([
  'ebijjoalkbhoackkociadkeaameeimih',
  'jojlgfnapegeomekbaimbhankfoolinf',
]);
export const CUSTOM_GEM_TARGETS = Object.freeze([
  Object.freeze({
    gemId: 'd6f1958dff66',
    gemUrl: 'https://gemini.google.com/gem/d6f1958dff66',
  }),
  Object.freeze({
    gemId: 'a217413102ab',
    gemUrl: 'https://gemini.google.com/gem/a217413102ab',
  }),
]);
export const CUSTOM_GEM_TARGET_ALLOWLIST = CUSTOM_GEM_TARGETS;
// Kept as aliases for v1 callers that imported the original single-target constants.
export const CUSTOM_GEM_ID = CUSTOM_GEM_TARGETS[0].gemId;
export const CUSTOM_GEM_URL = CUSTOM_GEM_TARGETS[0].gemUrl;

const CUSTOM_GEM_TARGET_BY_URL = new Map(CUSTOM_GEM_TARGETS.map((target) => [target.gemUrl, target]));

export function normalizeCustomGemTarget(gemUrl) {
  if (typeof gemUrl !== 'string') return null;
  const target = CUSTOM_GEM_TARGET_BY_URL.get(gemUrl);
  return target ? { ...target, currentUrl: target.gemUrl } : null;
}
export const CUSTOM_GEM_PRODUCT_ROLE = 'product_gallery';
export const CUSTOM_GEM_CREATOR_ROLE = 'creator_image';
// Kept as the role vocabulary for callers that imported the original constant.
export const CUSTOM_GEM_IMAGE_ROLES = [CUSTOM_GEM_PRODUCT_ROLE, CUSTOM_GEM_CREATOR_ROLE];
export const CUSTOM_GEM_MIN_PRODUCT_IMAGES = 1;
export const CUSTOM_GEM_MAX_PRODUCT_IMAGES = 5;
export const CUSTOM_GEM_MAX_SOURCE_COUNT = CUSTOM_GEM_MAX_PRODUCT_IMAGES + 1;
export const CUSTOM_GEM_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const CUSTOM_GEM_MAX_TOTAL_BYTES = 4 * 1024 * 1024;
export const CUSTOM_GEM_MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const CUSTOM_GEM_MAX_MESSAGE_BYTES = 8 * 1024;
export const CUSTOM_GEM_MIN_TERMINAL_MARKERS = 1;
export const CUSTOM_GEM_MAX_TERMINAL_MARKERS = 8;
export const CUSTOM_GEM_MAX_TERMINAL_MARKER_BYTES = 256;
export const CUSTOM_GEM_MAX_TERMINAL_MARKERS_BYTES = 1_024;
export const CUSTOM_GEM_MIN_TIMEOUT_MS = 30_000;
export const CUSTOM_GEM_MAX_TIMEOUT_MS = 360_000;
export const CUSTOM_GEM_MAX_RESPONSE_BYTES = 64 * 1024;
export const CUSTOM_GEM_RESPONSE_STABLE_MS = 800;
export const CUSTOM_GEM_BASE_SEND_STABLE_MS = 2_000;
export const CUSTOM_GEM_EXTRA_SOURCE_STABLE_MS = 1_500;
export const CUSTOM_GEM_SEND_READY_GRACE_MS = 10_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/i;
const MAX_FILENAME_BYTES = 255;
const MAX_BASE64_CHARS = Math.ceil(CUSTOM_GEM_MAX_IMAGE_BYTES / 3) * 4;
const SAFE_ID_RE = /^[a-zA-Z0-9._:-]{1,240}$/;
const CHROME_EXTENSION_ID_RE = /^[a-p]{32}$/;

function invalid(stage, code, message) {
  return { ok: false, error: { stage, code, message } };
}

function normalizeControlLabel(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isKnownSendLabel(value) {
  const label = normalizeControlLabel(value);
  return label === 'send' || label === 'send message' || label === 'ส่ง' || label === 'ส่งข้อความ';
}

export function isGeminiSendControlDescriptor(control = {}) {
  const labels = [control.ariaLabel, control.title, control.label, control.textContent];
  const hasKnownSendLabel = labels.some(isKnownSendLabel);
  const iconFont = normalizeControlLabel(control.iconFont);
  const hasSendIcon = iconFont === 'send';
  const classNames = new Set(normalizeControlLabel(control.className).split(/\s+/).filter(Boolean));
  return hasKnownSendLabel || hasSendIcon || classNames.has('send-button');
}

export function selectGeminiSendControlDescriptor(controls) {
  if (!Array.isArray(controls)) return null;
  const matches = controls.filter(isGeminiSendControlDescriptor);
  return matches.length === 1 ? matches[0] : null;
}

export function getCustomGemSendReadiness(sourceCount) {
  if (!Number.isInteger(sourceCount) || sourceCount < 1 || sourceCount > CUSTOM_GEM_MAX_SOURCE_COUNT) {
    throw new Error('Custom Gem Send readiness source count must be between 1 and 6.');
  }
  const stableMs = CUSTOM_GEM_BASE_SEND_STABLE_MS
    + Math.max(0, sourceCount - 2) * CUSTOM_GEM_EXTRA_SOURCE_STABLE_MS;
  return {
    stableMs,
    readyWindowMs: stableMs + CUSTOM_GEM_SEND_READY_GRACE_MS,
  };
}

function validateOrderedSourceRole(role, index, state, itemLabel) {
  if (role === CUSTOM_GEM_PRODUCT_ROLE) {
    if (state.creatorSeen) {
      return invalid('validation', `invalid_image_role_${index}`, `${itemLabel} ${index} product_gallery cannot appear after creator_image`);
    }
    if (state.productCount >= CUSTOM_GEM_MAX_PRODUCT_IMAGES) {
      return invalid('validation', `invalid_image_role_${index}`, `${itemLabel} ${index} exceeds the maximum of 5 product_gallery items`);
    }
    state.productCount += 1;
    return null;
  }

  if (role === CUSTOM_GEM_CREATOR_ROLE) {
    if (state.productCount === 0) {
      return invalid('validation', `invalid_image_role_${index}`, `${itemLabel} ${index} creator_image must follow at least one product_gallery item`);
    }
    if (state.creatorSeen) {
      return invalid('validation', `invalid_image_role_${index}`, `${itemLabel} ${index} may contain at most one creator_image`);
    }
    state.creatorSeen = true;
    return null;
  }

  return invalid('validation', `invalid_image_role_${index}`, `${itemLabel} ${index} role must be product_gallery or creator_image`);
}

function invalidSourceCount(collectionLabel) {
  return invalid(
    'validation',
    'invalid_image_count',
    `${collectionLabel} must contain 1 to 5 ordered product_gallery items followed by an optional creator_image (maximum 6 items)`,
  );
}

export function utf8ByteLength(value) {
  return new TextEncoder().encode(String(value)).byteLength;
}

export function validateRequiredTerminalMarkers(value) {
  if (!Array.isArray(value) ||
      value.length < CUSTOM_GEM_MIN_TERMINAL_MARKERS ||
      value.length > CUSTOM_GEM_MAX_TERMINAL_MARKERS) {
    return invalid('validation', 'invalid_terminal_markers', 'requiredTerminalMarkers must contain 1 to 8 strings');
  }

  const markers = [];
  const seen = new Set();
  let totalUtf8Bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const marker = value[index];
    if (typeof marker !== 'string' || marker.length === 0 || marker !== marker.trim() || marker.includes('\u0000')) {
      return invalid(
        'validation',
        `invalid_terminal_marker_${index}`,
        `requiredTerminalMarkers ${index} must be a non-empty trimmed string without NUL`,
      );
    }
    const markerUtf8Bytes = utf8ByteLength(marker);
    if (markerUtf8Bytes > CUSTOM_GEM_MAX_TERMINAL_MARKER_BYTES) {
      return invalid(
        'validation',
        `terminal_marker_too_large_${index}`,
        `requiredTerminalMarkers ${index} exceeds 256 UTF-8 bytes`,
      );
    }
    if (seen.has(marker)) {
      return invalid('validation', 'duplicate_terminal_marker', 'requiredTerminalMarkers must contain unique strings');
    }
    seen.add(marker);
    markers.push(marker);
    totalUtf8Bytes += markerUtf8Bytes;
  }
  if (totalUtf8Bytes > CUSTOM_GEM_MAX_TERMINAL_MARKERS_BYTES) {
    return invalid('validation', 'terminal_markers_too_large', 'requiredTerminalMarkers exceed 1024 aggregate UTF-8 bytes');
  }
  return { ok: true, markers, utf8Bytes: totalUtf8Bytes };
}

export function hasRequiredTerminalMarkers(text, requiredTerminalMarkers) {
  if (typeof text !== 'string' ||
      !Array.isArray(requiredTerminalMarkers) ||
      requiredTerminalMarkers.length < CUSTOM_GEM_MIN_TERMINAL_MARKERS ||
      requiredTerminalMarkers.length > CUSTOM_GEM_MAX_TERMINAL_MARKERS) return false;
  let offset = 0;
  for (const marker of requiredTerminalMarkers) {
    if (typeof marker !== 'string' || marker.length === 0) return false;
    const index = text.indexOf(marker, offset);
    if (index < 0) return false;
    offset = index + marker.length;
  }
  return true;
}

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function decodeBase64(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('base64 must be a non-empty string');
  }
  if (value.length > MAX_BASE64_CHARS || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('base64 is not canonical');
  }

  let binary;
  try {
    binary = atob(value);
  } catch {
    throw new Error('base64 could not be decoded');
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function verifyImageSignature(bytes, mimeType) {
  if (!(bytes instanceof Uint8Array)) return false;

  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((byte, index) => bytes[index] === byte);
  }

  if (mimeType === 'image/webp') {
    return bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }

  return false;
}

export function summarizeGemSources(sources) {
  return sources.map(({ role, filename, mimeType, bytes, sha256 }) => ({
    role,
    filename,
    mimeType,
    bytes,
    sha256,
  }));
}

export async function validateGemStartRequest(input) {
  const requestId = input?.requestId ?? null;

  if (input?.action !== CUSTOM_GEM_ACTION) {
    return invalid('validation', 'invalid_action', `action must be ${CUSTOM_GEM_ACTION}`);
  }
  if (input?.version !== CUSTOM_GEM_COMMAND_VERSION) {
    return invalid('validation', 'invalid_version', `version must be ${CUSTOM_GEM_COMMAND_VERSION}`);
  }
  if (!isUuid(requestId)) {
    return invalid('validation', 'invalid_request_id', 'requestId must be a canonical UUID');
  }
  const target = normalizeCustomGemTarget(input?.gemUrl);
  if (!target) {
    return invalid(
      'validation',
      'invalid_gem_url',
      `gemUrl must equal one of: ${CUSTOM_GEM_TARGETS.map(({ gemUrl }) => gemUrl).join(', ')}`,
    );
  }
  if (input?.tabId !== undefined && input?.tabId !== null &&
      (!Number.isSafeInteger(input.tabId) || input.tabId < 0)) {
    return invalid('validation', 'invalid_tab_id', 'tabId must be an exact non-negative integer when supplied');
  }

  if (!Array.isArray(input?.images) || input.images.length < CUSTOM_GEM_MIN_PRODUCT_IMAGES || input.images.length > CUSTOM_GEM_MAX_SOURCE_COUNT) {
    return invalidSourceCount('images');
  }

  const sources = [];
  const roleState = { productCount: 0, creatorSeen: false };
  let totalBytes = 0;

  for (let index = 0; index < input.images.length; index += 1) {
    const image = input.images[index];
    if (!image || typeof image !== 'object') {
      return invalid('validation', `invalid_image_${index}`, 'each image must be an object');
    }
    const roleError = validateOrderedSourceRole(image.role, index, roleState, 'image');
    if (roleError) return roleError;
    if (typeof image.filename !== 'string' || image.filename.length === 0 ||
        utf8ByteLength(image.filename) > MAX_FILENAME_BYTES ||
        /[\\/\u0000-\u001f\u007f]/.test(image.filename)) {
      return invalid('validation', `invalid_filename_${index}`, 'image filename must be a bounded basename');
    }
    if (!CUSTOM_GEM_IMAGE_MIME_TYPES.includes(image.mimeType)) {
      return invalid('validation', `invalid_mime_type_${index}`, 'image mimeType must be image/jpeg, image/png, or image/webp');
    }
    if (!Number.isSafeInteger(image.bytes) || image.bytes <= 0 || image.bytes > CUSTOM_GEM_MAX_IMAGE_BYTES) {
      return invalid('validation', `invalid_byte_count_${index}`, 'image bytes must be within the per-image limit');
    }
    if (typeof image.sha256 !== 'string' || !SHA256_RE.test(image.sha256)) {
      return invalid('validation', `invalid_sha256_${index}`, 'image sha256 must be 64 hexadecimal characters');
    }
    if (typeof image.base64 !== 'string' || image.base64.length > MAX_BASE64_CHARS) {
      return invalid('validation', `invalid_base64_${index}`, 'image base64 is missing or too large');
    }

    let decoded;
    try {
      decoded = decodeBase64(image.base64);
    } catch (error) {
      return invalid('validation', `invalid_base64_${index}`, error instanceof Error ? error.message : 'image base64 could not be decoded');
    }
    if (decoded.byteLength !== image.bytes) {
      return invalid('validation', `byte_count_mismatch_${index}`, 'decoded image byte count does not match bytes');
    }
    if (!verifyImageSignature(decoded, image.mimeType)) {
      return invalid('validation', `invalid_signature_${index}`, 'image MIME signature does not match mimeType');
    }

    const actualSha256 = await sha256Hex(decoded);
    if (actualSha256 !== image.sha256.toLowerCase()) {
      return invalid('validation', `sha256_mismatch_${index}`, 'decoded image SHA-256 does not match sha256');
    }

    totalBytes += decoded.byteLength;
    if (totalBytes > CUSTOM_GEM_MAX_TOTAL_BYTES) {
      return invalid('validation', 'total_image_bytes_exceeded', 'total decoded image bytes exceed 4 MiB');
    }

    sources.push({
      role: image.role,
      filename: image.filename,
      mimeType: image.mimeType,
      bytes: decoded.byteLength,
      sha256: actualSha256,
      base64: image.base64,
      data: decoded,
    });
  }

  if (typeof input.message !== 'string' || input.message.length === 0) {
    return invalid('validation', 'invalid_message', 'message must be a non-empty string');
  }
  if (input.message !== input.message.trim() || input.message.includes('\u0000')) {
    return invalid('validation', 'invalid_message', 'message must be minimal text without surrounding whitespace or NUL');
  }
  if (utf8ByteLength(input.message) > CUSTOM_GEM_MAX_MESSAGE_BYTES) {
    return invalid('validation', 'message_too_large', 'message exceeds 8192 UTF-8 bytes');
  }

  if (!Number.isSafeInteger(input.timeoutMs) ||
      input.timeoutMs < CUSTOM_GEM_MIN_TIMEOUT_MS || input.timeoutMs > CUSTOM_GEM_MAX_TIMEOUT_MS) {
    return invalid('validation', 'invalid_timeout', 'timeoutMs must be between 30000 and 360000 milliseconds');
  }

  return {
    ok: true,
    request: {
      requestId,
      tabId: input.tabId === undefined || input.tabId === null ? undefined : input.tabId,
      gemId: target.gemId,
      gemUrl: target.gemUrl,
      currentUrl: target.currentUrl,
      timeoutMs: input.timeoutMs,
      message: input.message,
      messageSha256: await sha256Hex(new TextEncoder().encode(input.message)),
      sources,
    },
  };
}

export async function validateGemSubmitRequest(input) {
  const requestId = input?.requestId ?? null;
  const allowedKeys = [
    'action',
    'currentUrl',
    'gemUrl',
    'id',
    'message',
    'messageSha256',
    'messageUtf8Bytes',
    'requestId',
    'requiredTerminalMarkers',
    'sources',
    'tabId',
    'timeoutMs',
    'uploadReceipt',
    'version',
  ];
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).length !== allowedKeys.length ||
      Object.keys(input).some((key) => !allowedKeys.includes(key))) {
    return invalid('validation', 'invalid_command_shape', 'submit command fields must match the exact contract');
  }
  if (input.action !== CUSTOM_GEM_SUBMIT_ACTION) {
    return invalid('validation', 'invalid_action', `action must be ${CUSTOM_GEM_SUBMIT_ACTION}`);
  }
  if (input.version !== CUSTOM_GEM_SUBMIT_COMMAND_VERSION) {
    return invalid('validation', 'invalid_version', `version must be ${CUSTOM_GEM_SUBMIT_COMMAND_VERSION}`);
  }
  if (!isUuid(requestId) || input.id !== requestId) {
    return invalid('validation', 'invalid_request_id', 'id and requestId must be the same canonical UUID');
  }
  const target = normalizeCustomGemTarget(input.gemUrl);
  const currentTarget = normalizeCustomGemTarget(input.currentUrl);
  if (!target || !currentTarget || target.gemUrl !== currentTarget.gemUrl) {
    return invalid(
      'validation',
      'invalid_gem_url',
      `gemUrl and currentUrl must equal the same approved Custom Gem base URL (${CUSTOM_GEM_TARGETS.map(({ gemUrl }) => gemUrl).join(', ')})`,
    );
  }
  if (!Number.isSafeInteger(input.tabId) || input.tabId < 0) {
    return invalid('validation', 'invalid_tab_id', 'tabId must be an exact non-negative integer');
  }
  if (!Array.isArray(input.sources) || input.sources.length < CUSTOM_GEM_MIN_PRODUCT_IMAGES || input.sources.length > CUSTOM_GEM_MAX_SOURCE_COUNT) {
    return invalidSourceCount('sources');
  }

  const sources = [];
  const roleState = { productCount: 0, creatorSeen: false };
  let totalBytes = 0;
  const sourceKeys = ['bytes', 'filename', 'mimeType', 'role', 'sha256'];
  for (let index = 0; index < input.sources.length; index += 1) {
    const source = input.sources[index];
    if (!source || typeof source !== 'object' || Array.isArray(source) ||
        Object.keys(source).length !== sourceKeys.length ||
        Object.keys(source).some((key) => !sourceKeys.includes(key))) {
      return invalid('validation', `invalid_image_${index}`, 'each source must contain metadata only');
    }
    const roleError = validateOrderedSourceRole(source.role, index, roleState, 'source');
    if (roleError) return roleError;
    if (typeof source.filename !== 'string' || source.filename.length === 0 ||
        utf8ByteLength(source.filename) > MAX_FILENAME_BYTES ||
        /[\\/\u0000-\u001f\u007f]/.test(source.filename)) {
      return invalid('validation', `invalid_filename_${index}`, 'source filename must be a bounded basename');
    }
    if (!CUSTOM_GEM_IMAGE_MIME_TYPES.includes(source.mimeType)) {
      return invalid('validation', `invalid_mime_type_${index}`, 'source mimeType must be image/jpeg, image/png, or image/webp');
    }
    if (!Number.isSafeInteger(source.bytes) || source.bytes <= 0 || source.bytes > CUSTOM_GEM_MAX_IMAGE_BYTES) {
      return invalid('validation', `invalid_byte_count_${index}`, 'source bytes must be within the per-image limit');
    }
    if (typeof source.sha256 !== 'string' || !SHA256_RE.test(source.sha256)) {
      return invalid('validation', `invalid_sha256_${index}`, 'source sha256 must be 64 hexadecimal characters');
    }
    totalBytes += source.bytes;
    if (totalBytes > CUSTOM_GEM_MAX_TOTAL_BYTES) {
      return invalid('validation', 'total_image_bytes_exceeded', 'total source bytes exceed 4 MiB');
    }
    sources.push({
      role: source.role,
      filename: source.filename,
      mimeType: source.mimeType,
      bytes: source.bytes,
      sha256: source.sha256.toLowerCase(),
    });
  }

  if (typeof input.message !== 'string' || input.message.length === 0 ||
      input.message !== input.message.trim() || input.message.includes('\u0000')) {
    return invalid('validation', 'invalid_message', 'message must be minimal text without surrounding whitespace or NUL');
  }
  const messageUtf8Bytes = utf8ByteLength(input.message);
  if (messageUtf8Bytes > CUSTOM_GEM_MAX_MESSAGE_BYTES || input.messageUtf8Bytes !== messageUtf8Bytes) {
    return invalid('validation', 'message_byte_count_mismatch', 'messageUtf8Bytes must match the bounded message');
  }
  const messageSha256 = await sha256Hex(new TextEncoder().encode(input.message));
  if (input.messageSha256 !== messageSha256) {
    return invalid('validation', 'message_sha256_mismatch', 'messageSha256 must match the exact message');
  }
  const terminalMarkers = validateRequiredTerminalMarkers(input.requiredTerminalMarkers);
  if (!terminalMarkers.ok) return terminalMarkers;
  if (!Number.isSafeInteger(input.timeoutMs) ||
      input.timeoutMs < CUSTOM_GEM_MIN_TIMEOUT_MS || input.timeoutMs > CUSTOM_GEM_MAX_TIMEOUT_MS) {
    return invalid('validation', 'invalid_timeout', 'timeoutMs must be between 30000 and 360000 milliseconds');
  }

  const uploadReceipt = input.uploadReceipt;
  const receiptKeys = ['browserControlExtensionId', 'commandId', 'receiptId', 'version'];
  if (!uploadReceipt || typeof uploadReceipt !== 'object' || Array.isArray(uploadReceipt) ||
      Object.keys(uploadReceipt).length !== receiptKeys.length ||
      Object.keys(uploadReceipt).some((key) => !receiptKeys.includes(key)) ||
      uploadReceipt.version !== CUSTOM_GEM_UPLOAD_RESULT_VERSION ||
      typeof uploadReceipt.browserControlExtensionId !== 'string' ||
      !CHROME_EXTENSION_ID_RE.test(uploadReceipt.browserControlExtensionId) ||
      !CUSTOM_GEM_BROWSER_CONTROL_EXTENSION_IDS.includes(uploadReceipt.browserControlExtensionId) ||
      typeof uploadReceipt.commandId !== 'string' || !SAFE_ID_RE.test(uploadReceipt.commandId) ||
      typeof uploadReceipt.receiptId !== 'string' || !SHA256_RE.test(uploadReceipt.receiptId)) {
    return invalid('validation', 'invalid_upload_receipt', 'uploadReceipt must bind one exact trusted upload result');
  }

  return {
    ok: true,
    request: {
      requestId,
      tabId: input.tabId,
      gemId: target.gemId,
      gemUrl: target.gemUrl,
      currentUrl: target.currentUrl,
      timeoutMs: input.timeoutMs,
      message: input.message,
      messageSha256,
      requiredTerminalMarkers: terminalMarkers.markers,
      sources,
      uploadReceipt: {
        version: CUSTOM_GEM_UPLOAD_RESULT_VERSION,
        browserControlExtensionId: uploadReceipt.browserControlExtensionId,
        commandId: uploadReceipt.commandId,
        receiptId: uploadReceipt.receiptId.toLowerCase(),
      },
    },
  };
}

export async function validateGemRecoverRequest(input) {
  const requestId = input?.requestId ?? null;
  const allowedKeys = [
    'action',
    'conversationUrl',
    'gemUrl',
    'id',
    'message',
    'messageSha256',
    'messageUtf8Bytes',
    'requestId',
    'requiredTerminalMarkers',
    'tabId',
    'timeoutMs',
    'version',
  ];
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).length !== allowedKeys.length ||
      Object.keys(input).some((key) => !allowedKeys.includes(key))) {
    return invalid('validation', 'invalid_command_shape', 'recovery command fields must match the exact contract');
  }
  if (input.action !== CUSTOM_GEM_RECOVER_ACTION) {
    return invalid('validation', 'invalid_action', `action must be ${CUSTOM_GEM_RECOVER_ACTION}`);
  }
  if (input.version !== CUSTOM_GEM_RECOVER_COMMAND_VERSION) {
    return invalid('validation', 'invalid_version', `version must be ${CUSTOM_GEM_RECOVER_COMMAND_VERSION}`);
  }
  if (!isUuid(requestId) || input.id !== requestId) {
    return invalid('validation', 'invalid_request_id', 'id and requestId must be the same canonical UUID');
  }
  const target = normalizeCustomGemTarget(input.gemUrl);
  if (!target) {
    return invalid(
      'validation',
      'invalid_gem_url',
      `gemUrl must equal one of: ${CUSTOM_GEM_TARGETS.map(({ gemUrl }) => gemUrl).join(', ')}`,
    );
  }
  if (!isExactCustomGemConversationUrl(target.gemUrl, input.conversationUrl)) {
    return invalid('validation', 'invalid_conversation_url', 'conversationUrl must be one exact conversation under gemUrl');
  }
  if (!Number.isSafeInteger(input.tabId) || input.tabId < 0) {
    return invalid('validation', 'invalid_tab_id', 'tabId must be an exact non-negative integer');
  }
  if (typeof input.message !== 'string' || input.message.length === 0 ||
      input.message !== input.message.trim() || input.message.includes('\u0000')) {
    return invalid('validation', 'invalid_message', 'message must be minimal text without surrounding whitespace or NUL');
  }
  const messageUtf8Bytes = utf8ByteLength(input.message);
  if (messageUtf8Bytes > CUSTOM_GEM_MAX_MESSAGE_BYTES || input.messageUtf8Bytes !== messageUtf8Bytes) {
    return invalid('validation', 'message_byte_count_mismatch', 'messageUtf8Bytes must match the bounded message');
  }
  const messageSha256 = await sha256Hex(new TextEncoder().encode(input.message));
  if (input.messageSha256 !== messageSha256) {
    return invalid('validation', 'message_sha256_mismatch', 'messageSha256 must match the exact message');
  }
  const terminalMarkers = validateRequiredTerminalMarkers(input.requiredTerminalMarkers);
  if (!terminalMarkers.ok) return terminalMarkers;
  if (!Number.isSafeInteger(input.timeoutMs) ||
      input.timeoutMs < CUSTOM_GEM_MIN_TIMEOUT_MS || input.timeoutMs > CUSTOM_GEM_MAX_TIMEOUT_MS) {
    return invalid('validation', 'invalid_timeout', 'timeoutMs must be between 30000 and 360000 milliseconds');
  }

  return {
    ok: true,
    request: {
      requestId,
      tabId: input.tabId,
      gemId: target.gemId,
      gemUrl: target.gemUrl,
      currentUrl: input.conversationUrl,
      conversationUrl: input.conversationUrl,
      timeoutMs: input.timeoutMs,
      message: input.message,
      messageSha256,
      requiredTerminalMarkers: terminalMarkers.markers,
    },
  };
}

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const navigationError = (code, detail) => {
  const error = new Error(code);
  error.code = code;
  error.detail = detail;
  return error;
};

export const isExactCustomGemConversationUrl = (gemUrl, value) =>
  normalizeCustomGemTarget(gemUrl)?.gemUrl === gemUrl &&
  new RegExp(`^${escapeRegExp(gemUrl)}/[a-f0-9]{8,64}$`, 'i').test(String(value || ''));

export async function observeCustomGemConversationNavigation({
  tabs,
  tabId,
  gemUrl,
  deadlineAt,
  now = () => Date.now(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  const initial = await tabs.get(tabId);
  if (initial?.url !== gemUrl) {
    throw navigationError('gem_url_mismatch', `Custom Gem observer expected the base URL: ${initial?.url || ''}`);
  }

  let observedConversationUrl = null;
  let settled = false;
  let timer = null;
  let resolveNavigation;
  let rejectNavigation;
  const promise = new Promise((resolve, reject) => {
    resolveNavigation = resolve;
    rejectNavigation = reject;
  });
  promise.catch(() => undefined);
  const cleanup = () => {
    tabs.onUpdated.removeListener(onUpdated);
    if (timer) clearTimer(timer);
    timer = null;
  };
  const finish = (callback) => {
    if (settled) return;
    settled = true;
    cleanup();
    callback();
  };
  const onUpdated = (updatedTabId, changeInfo, tab) => {
    if (updatedTabId !== tabId || settled) return;
    if (typeof changeInfo?.url === 'string') {
      if (!isExactCustomGemConversationUrl(gemUrl, changeInfo.url)) {
        finish(() => rejectNavigation(navigationError('gem_url_mismatch', `Unexpected Custom Gem navigation: ${changeInfo.url}`)));
        return;
      }
      observedConversationUrl = changeInfo.url;
    }
    if (
      observedConversationUrl &&
      tab?.url === observedConversationUrl &&
      (changeInfo?.status === 'complete' || tab?.status === 'complete')
    ) {
      finish(() => resolveNavigation(observedConversationUrl));
    }
  };

  tabs.onUpdated.addListener(onUpdated);
  const navigationDeadline = Math.min(deadlineAt, now() + 15_000);
  timer = setTimer(() => {
    finish(() =>
      rejectNavigation(
        navigationError(
          'page_not_ready',
          `Custom Gem conversation navigation did not settle: ${observedConversationUrl || gemUrl}`,
        ),
      ),
    );
  }, Math.max(1, navigationDeadline - now()));

  return {
    promise,
    cancel: () => finish(() => undefined),
  };
}
