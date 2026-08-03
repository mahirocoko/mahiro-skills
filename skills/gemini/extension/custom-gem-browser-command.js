export const CUSTOM_GEM_ACTION = 'gem_start_v1';
export const CUSTOM_GEM_COMMAND_VERSION = 'custom-gem-browser-command-v1';
export const CUSTOM_GEM_SUBMIT_ACTION = 'gem_submit_v1';
export const CUSTOM_GEM_SUBMIT_COMMAND_VERSION = 'custom-gem-browser-submit-command-v1';
export const CUSTOM_GEM_UPLOAD_RESULT_VERSION = 'custom-gem-source-upload-result-v1';
export const CUSTOM_GEM_RESULT_VERSION = 'custom-gem-browser-result-v1';
export const CUSTOM_GEM_ID = 'd6f1958dff66';
export const CUSTOM_GEM_URL = `https://gemini.google.com/gem/${CUSTOM_GEM_ID}`;
export const CUSTOM_GEM_IMAGE_ROLES = ['product_gallery', 'creator_image'];
export const CUSTOM_GEM_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const CUSTOM_GEM_MAX_TOTAL_BYTES = 4 * 1024 * 1024;
export const CUSTOM_GEM_MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const CUSTOM_GEM_MAX_MESSAGE_BYTES = 8 * 1024;
export const CUSTOM_GEM_MIN_TIMEOUT_MS = 30_000;
export const CUSTOM_GEM_MAX_TIMEOUT_MS = 360_000;
export const CUSTOM_GEM_MAX_RESPONSE_BYTES = 64 * 1024;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/i;
const MAX_FILENAME_BYTES = 255;
const MAX_BASE64_CHARS = Math.ceil(CUSTOM_GEM_MAX_IMAGE_BYTES / 3) * 4;
const SAFE_ID_RE = /^[a-zA-Z0-9._:-]{1,240}$/;

function invalid(stage, code, message) {
  return { ok: false, error: { stage, code, message } };
}

export function utf8ByteLength(value) {
  return new TextEncoder().encode(String(value)).byteLength;
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
  if (input?.gemUrl !== CUSTOM_GEM_URL) {
    return invalid('validation', 'invalid_gem_url', `gemUrl must equal ${CUSTOM_GEM_URL}`);
  }
  if (input?.tabId !== undefined && input?.tabId !== null &&
      (!Number.isSafeInteger(input.tabId) || input.tabId < 0)) {
    return invalid('validation', 'invalid_tab_id', 'tabId must be an exact non-negative integer when supplied');
  }

  if (!Array.isArray(input?.images) || input.images.length !== CUSTOM_GEM_IMAGE_ROLES.length) {
    return invalid('validation', 'invalid_image_count', 'images must contain exactly two ordered items');
  }

  const sources = [];
  let totalBytes = 0;

  for (let index = 0; index < input.images.length; index += 1) {
    const image = input.images[index];
    const expectedRole = CUSTOM_GEM_IMAGE_ROLES[index];
    if (!image || typeof image !== 'object') {
      return invalid('validation', `invalid_image_${index}`, 'each image must be an object');
    }
    if (image.role !== expectedRole) {
      return invalid('validation', `invalid_image_role_${index}`, `image ${index} must have role ${expectedRole}`);
    }
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
      role: expectedRole,
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
      gemUrl: CUSTOM_GEM_URL,
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
  if (input.gemUrl !== CUSTOM_GEM_URL || input.currentUrl !== CUSTOM_GEM_URL) {
    return invalid('validation', 'invalid_gem_url', `gemUrl and currentUrl must equal ${CUSTOM_GEM_URL}`);
  }
  if (!Number.isSafeInteger(input.tabId) || input.tabId < 0) {
    return invalid('validation', 'invalid_tab_id', 'tabId must be an exact non-negative integer');
  }
  if (!Array.isArray(input.sources) || input.sources.length !== CUSTOM_GEM_IMAGE_ROLES.length) {
    return invalid('validation', 'invalid_image_count', 'sources must contain exactly two ordered metadata items');
  }

  const sources = [];
  let totalBytes = 0;
  const sourceKeys = ['bytes', 'filename', 'mimeType', 'role', 'sha256'];
  for (let index = 0; index < input.sources.length; index += 1) {
    const source = input.sources[index];
    const expectedRole = CUSTOM_GEM_IMAGE_ROLES[index];
    if (!source || typeof source !== 'object' || Array.isArray(source) ||
        Object.keys(source).length !== sourceKeys.length ||
        Object.keys(source).some((key) => !sourceKeys.includes(key))) {
      return invalid('validation', `invalid_image_${index}`, 'each source must contain metadata only');
    }
    if (source.role !== expectedRole) {
      return invalid('validation', `invalid_image_role_${index}`, `source ${index} must have role ${expectedRole}`);
    }
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
      role: expectedRole,
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
  if (!Number.isSafeInteger(input.timeoutMs) ||
      input.timeoutMs < CUSTOM_GEM_MIN_TIMEOUT_MS || input.timeoutMs > CUSTOM_GEM_MAX_TIMEOUT_MS) {
    return invalid('validation', 'invalid_timeout', 'timeoutMs must be between 30000 and 360000 milliseconds');
  }

  const uploadReceipt = input.uploadReceipt;
  const receiptKeys = ['commandId', 'receiptId', 'version'];
  if (!uploadReceipt || typeof uploadReceipt !== 'object' || Array.isArray(uploadReceipt) ||
      Object.keys(uploadReceipt).length !== receiptKeys.length ||
      Object.keys(uploadReceipt).some((key) => !receiptKeys.includes(key)) ||
      uploadReceipt.version !== CUSTOM_GEM_UPLOAD_RESULT_VERSION ||
      typeof uploadReceipt.commandId !== 'string' || !SAFE_ID_RE.test(uploadReceipt.commandId) ||
      typeof uploadReceipt.receiptId !== 'string' || !SHA256_RE.test(uploadReceipt.receiptId)) {
    return invalid('validation', 'invalid_upload_receipt', 'uploadReceipt must bind one exact trusted upload result');
  }

  return {
    ok: true,
    request: {
      requestId,
      tabId: input.tabId,
      gemUrl: CUSTOM_GEM_URL,
      currentUrl: CUSTOM_GEM_URL,
      timeoutMs: input.timeoutMs,
      message: input.message,
      messageSha256,
      sources,
      uploadReceipt: {
        version: CUSTOM_GEM_UPLOAD_RESULT_VERSION,
        commandId: uploadReceipt.commandId,
        receiptId: uploadReceipt.receiptId.toLowerCase(),
      },
    },
  };
}
