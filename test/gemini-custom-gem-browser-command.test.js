import { describe, expect, test } from 'bun:test';
import {
  CUSTOM_GEM_ACTION,
  CUSTOM_GEM_COMMAND_VERSION,
  CUSTOM_GEM_SUBMIT_ACTION,
  CUSTOM_GEM_SUBMIT_COMMAND_VERSION,
  CUSTOM_GEM_UPLOAD_RESULT_VERSION,
  CUSTOM_GEM_URL,
  sha256Hex,
  summarizeGemSources,
  validateGemStartRequest,
  validateGemSubmitRequest,
} from '../skills/gemini/extension/custom-gem-browser-command.js';

const requestId = '123e4567-e89b-12d3-a456-426614174000';

function toBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function makeImage(role, filename, mimeType, bytes) {
  return {
    role,
    filename,
    mimeType,
    bytes: bytes.byteLength,
    sha256: await sha256Hex(bytes),
    base64: toBase64(bytes),
  };
}

async function makeRequest(overrides = {}) {
  const product = await makeImage(
    'product_gallery',
    'product.jpg',
    'image/jpeg',
    new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
  );
  const creator = await makeImage(
    'creator_image',
    'creator.png',
    'image/png',
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  return {
    action: CUSTOM_GEM_ACTION,
    version: CUSTOM_GEM_COMMAND_VERSION,
    requestId,
    gemUrl: CUSTOM_GEM_URL,
    images: [product, creator],
    message: 'Use the two supplied images.',
    timeoutMs: 30_000,
    ...overrides,
  };
}

describe('transactional Custom Gem request validation', () => {
  test('accepts the exact ordered image contract and strips binary data from summaries', async () => {
    const result = await validateGemStartRequest(await makeRequest());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.sources.map(({ role, filename, mimeType, bytes }) => ({ role, filename, mimeType, bytes }))).toEqual([
      { role: 'product_gallery', filename: 'product.jpg', mimeType: 'image/jpeg', bytes: 4 },
      { role: 'creator_image', filename: 'creator.png', mimeType: 'image/png', bytes: 8 },
    ]);
    expect(result.request.messageSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.request.sources[0].base64).toBe(toBase64(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])));
    expect(summarizeGemSources(result.request.sources)).toEqual([
      { role: 'product_gallery', filename: 'product.jpg', mimeType: 'image/jpeg', bytes: 4, sha256: result.request.sources[0].sha256 },
      { role: 'creator_image', filename: 'creator.png', mimeType: 'image/png', bytes: 8, sha256: result.request.sources[1].sha256 },
    ]);
    expect(summarizeGemSources(result.request.sources)[0]).not.toHaveProperty('data');
    expect(summarizeGemSources(result.request.sources)[0]).not.toHaveProperty('base64');
  });

  test('fails closed for action, version, URL, order, byte count, signature, and digest mismatches', async () => {
    const valid = await makeRequest();
    const cases = [
      [{ action: 'chat' }, 'invalid_action'],
      [{ version: 'wrong' }, 'invalid_version'],
      [{ gemUrl: 'https://gemini.google.com/app' }, 'invalid_gem_url'],
      [{ images: [valid.images[1], valid.images[0]] }, 'invalid_image_role_0'],
      [{ images: [{ ...valid.images[0], bytes: 5 }, valid.images[1]] }, 'byte_count_mismatch_0'],
      [{ images: [{ ...valid.images[0], mimeType: 'image/png' }, valid.images[1]] }, 'invalid_signature_0'],
      [{ images: [{ ...valid.images[0], sha256: '0'.repeat(64) }, valid.images[1]] }, 'sha256_mismatch_0'],
    ];

    for (const [override, code] of cases) {
      const result = await validateGemStartRequest({ ...valid, ...override });
      expect(result).toMatchObject({ ok: false, error: { code } });
    }
  });

  test('enforces bounded minimal message, timeout, and per-image byte limits before browser work', async () => {
    const valid = await makeRequest();
    const cases = [
      [{ message: ` ${valid.message}` }, 'invalid_message'],
      [{ message: '🙂'.repeat(2_100) }, 'message_too_large'],
      [{ timeoutMs: 29_999 }, 'invalid_timeout'],
      [{ timeoutMs: 360_001 }, 'invalid_timeout'],
      [{ images: [{ ...valid.images[0], bytes: 3 * 1024 * 1024 + 1 }, valid.images[1]] }, 'invalid_byte_count_0'],
    ];

    for (const [override, code] of cases) {
      const result = await validateGemStartRequest({ ...valid, ...override });
      expect(result).toMatchObject({ ok: false, error: { code } });
    }

    const largeProduct = new Uint8Array(2 * 1024 * 1024 + 1);
    largeProduct.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const largeCreator = new Uint8Array(2 * 1024 * 1024 + 1);
    largeCreator.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const totalBytes = await validateGemStartRequest({
      ...valid,
      images: [
        await makeImage('product_gallery', 'large-product.webp', 'image/webp', largeProduct),
        await makeImage('creator_image', 'large-creator.webp', 'image/webp', largeCreator),
      ],
    });
    expect(totalBytes).toMatchObject({ ok: false, error: { code: 'total_image_bytes_exceeded' } });
  });
});

async function makeSubmitRequest(overrides = {}) {
  const start = await makeRequest();
  const messageSha256 = await sha256Hex(new TextEncoder().encode(start.message));
  return {
    id: requestId,
    action: CUSTOM_GEM_SUBMIT_ACTION,
    version: CUSTOM_GEM_SUBMIT_COMMAND_VERSION,
    requestId,
    gemUrl: CUSTOM_GEM_URL,
    tabId: 42,
    currentUrl: CUSTOM_GEM_URL,
    sources: start.images.map(({ role, filename, mimeType, bytes, sha256 }) => ({
      role,
      filename,
      mimeType,
      bytes,
      sha256,
    })),
    message: start.message,
    messageSha256,
    messageUtf8Bytes: new TextEncoder().encode(start.message).byteLength,
    timeoutMs: 30_000,
    uploadReceipt: {
      version: CUSTOM_GEM_UPLOAD_RESULT_VERSION,
      commandId: 'bridge-command-1',
      receiptId: 'a'.repeat(64),
    },
    ...overrides,
  };
}

describe('metadata-only Custom Gem submit validation', () => {
  test('accepts one exact trusted upload receipt without binary data or paths', async () => {
    const result = await validateGemSubmitRequest(await makeSubmitRequest());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.tabId).toBe(42);
    expect(result.request.currentUrl).toBe(CUSTOM_GEM_URL);
    expect(result.request.sources).toHaveLength(2);
    expect(result.request.sources[0]).not.toHaveProperty('base64');
    expect(result.request.sources[0]).not.toHaveProperty('data');
    expect(result.request.sources[0]).not.toHaveProperty('localPath');
    expect(result.request.uploadReceipt).toEqual({
      version: CUSTOM_GEM_UPLOAD_RESULT_VERSION,
      commandId: 'bridge-command-1',
      receiptId: 'a'.repeat(64),
    });
  });

  test('fails closed for extra fields, reordered sources, hashes, bytes, URLs, and receipts', async () => {
    const valid = await makeSubmitRequest();
    const cases = [
      [{ extra: true }, 'invalid_command_shape'],
      [{ currentUrl: `${CUSTOM_GEM_URL}/conversation` }, 'invalid_gem_url'],
      [{ sources: [valid.sources[1], valid.sources[0]] }, 'invalid_image_role_0'],
      [{ sources: [{ ...valid.sources[0], localPath: '/tmp/product.jpg' }, valid.sources[1]] }, 'invalid_image_0'],
      [{ messageUtf8Bytes: valid.messageUtf8Bytes + 1 }, 'message_byte_count_mismatch'],
      [{ messageSha256: 'b'.repeat(64) }, 'message_sha256_mismatch'],
      [{ uploadReceipt: { ...valid.uploadReceipt, receiptId: 'bad' } }, 'invalid_upload_receipt'],
    ];

    for (const [override, code] of cases) {
      const result = await validateGemSubmitRequest({ ...valid, ...override });
      expect(result).toMatchObject({ ok: false, error: { code } });
    }
  });
});

test('the extension logs only the action name, never the full MQTT command', async () => {
  const source = await Bun.file('skills/gemini/extension/background-src.js').text();
  expect(source).toContain("console.log('[Local Gemini Proxy] Command:', cmd.action);");
  expect(source).not.toContain("console.log('[Local Gemini Proxy] Command:', cmd.action, cmd);");
  expect(source).toContain("case 'gem_start_v1':");
  expect(source).toContain("case 'gem_submit_v1':");
  expect(source).toContain("'gem-media-attachment.gem-attachment-tile'");
  expect(source).toContain("attachmentVerification: 'trusted_sequential_tiles'");
  expect(source).toContain("const MAHIRO_BROWSER_CONTROL_EXTENSION_ID = 'ebijjoalkbhoackkociadkeaameeimih'")
  expect(source).toContain("type: 'CONSUME_CUSTOM_GEM_UPLOAD_ATTESTATION_V1'")
  expect(source).toContain("type: 'TRUSTED_CUSTOM_GEM_SEND_V1'")
  expect(source).toContain('message: request.message')
  const consumeAttestationBlock = source.slice(
    source.indexOf('function verifyTrustedCustomGemUploadReceipt'),
    source.indexOf('async function customGemSubmitPage'),
  )
  expect(consumeAttestationBlock).not.toContain('message: request.message')
  const trustedSendBlock = source.slice(
    source.indexOf('function requestTrustedCustomGemSend'),
    source.indexOf('async function runTrustedCustomGemSubmit'),
  )
  expect(trustedSendBlock).toContain('message: request.message')
  expect(source).toContain('await requestTrustedCustomGemSend(request)')
  expect(source).toContain('awaitTrustedCustomGemResponsePage')
  expect(source).toContain("node.setAttribute('data-custom-gem-baseline', payload.attributionToken)")
  expect(source).toContain("normalizeText(messageText(node)) === normalizeText(message)")
  expect(source).toContain("node.getAttribute('data-custom-gem-baseline') !== attributionToken")
  expect(source).toContain('const attributionToken = request.requestId')
  expect(source).toContain('attributedMessageNode.compareDocumentPosition(node)')
  expect(source).toContain('func: cleanupCustomGemAttributionPage')
  expect(source).toContain("node.querySelectorAll('.query-text-line')")
  expect(source).toContain('const tabReadyDeadline = Math.min(deadlineAt, Date.now() + 5_000)')
  expect(source).toContain('const sendReadyDeadline = Math.min(deadlineAt, Date.now() + 10_000)')
  expect(source).toContain('Date.now() - readySince >= 2_000')
  expect(source).toContain("node.querySelector('.markdown-main-panel, .markdown, message-content")
  expect(source).toContain("lines.push(`${'#'.repeat(Number(tag[1]))} ${text}`)")
  expect(source).toContain("chrome.runtime.lastError?.message || response?.error")
  expect(source).toContain('await reserveCustomGemDurableRequest(validation.request, fingerprint)')
  expect(source).toContain('await completeCustomGemDurableRequest(requestId, reservation.fingerprint, result)')
  expect(source).toContain("CUSTOM_GEM_DURABLE_REQUESTS_KEY = 'customGemDurableSubmitRequestsV1'")
  expect(source).toContain('const customGemSubmitInFlight = new Map()')
  expect(source).toContain("status: 'completed_tombstone'")
  expect(source).not.toContain('CUSTOM_GEM_DURABLE_REQUEST_TTL_MS')
  expect(source).toContain("return customGemAmbiguous(request.requestId, 'submit', code")
  expect(source).toContain("return customGemAmbiguous(request.requestId, 'response', 'response_too_large'")
  expect(source).toContain("cmd.action === 'reload_extension_v1'");
  expect(source).toContain('proxy_reload_wake=')
  expect(source).toContain('setTimeout(() => chrome.runtime.reload(), 100);');
  expect(source).toContain("if (this.type === 'file' && !this.disabled)");
  expect(source).toContain('capturedFileInput = this;');
  expect(source).toContain("[role^=\"menuitem\"]");
  expect(source).toContain('controlLabels: observedControlLabels');
  expect(source).toContain("[data-test-id=\"local-images-files-uploader-button\"]");
  expect(source).toContain("deadlineAt,\n    'MAIN',");
  expect(source).toContain("window.HTMLInputElement.prototype.showPicker = function ()");
});
