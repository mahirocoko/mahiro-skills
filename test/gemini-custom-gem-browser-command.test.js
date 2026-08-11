import { describe, expect, test } from 'bun:test';
import {
  CUSTOM_GEM_ACTION,
  CUSTOM_GEM_COMMAND_VERSION,
  CUSTOM_GEM_SUBMIT_ACTION,
  CUSTOM_GEM_SUBMIT_COMMAND_VERSION,
  CUSTOM_GEM_TARGETS,
  CUSTOM_GEM_UPLOAD_RESULT_VERSION,
  CUSTOM_GEM_URL,
  getCustomGemSendReadiness,
  isGeminiSendControlDescriptor,
  isExactCustomGemConversationUrl,
  normalizeCustomGemTarget,
  observeCustomGemConversationNavigation,
  selectGeminiSendControlDescriptor,
  sha256Hex,
  summarizeGemSources,
  validateGemStartRequest,
  validateGemSubmitRequest,
} from '../skills/gemini/extension/custom-gem-browser-command.js';

const requestId = '123e4567-e89b-12d3-a456-426614174000';
const [PRIMARY_TARGET, SECOND_TARGET] = CUSTOM_GEM_TARGETS;

test('the exact Custom Gem allowlist normalizes only the two approved base URLs', () => {
  expect(CUSTOM_GEM_TARGETS).toEqual([
    { gemId: 'd6f1958dff66', gemUrl: 'https://gemini.google.com/gem/d6f1958dff66' },
    { gemId: 'a217413102ab', gemUrl: 'https://gemini.google.com/gem/a217413102ab' },
  ]);
  for (const target of CUSTOM_GEM_TARGETS) {
    expect(normalizeCustomGemTarget(target.gemUrl)).toEqual({ ...target, currentUrl: target.gemUrl });
  }
  for (const invalidUrl of [
    'https://gemini.google.com/gem/unknown123456',
    'https://gemini.google.com/gem/d6f1958dff66/',
    'https://gemini.google.com/gem/d6f1958dff66/extra',
    'https://gemini.google.com/gem/d6f1958dff66?x=1',
    'https://gemini.google.com/gem/d6f1958dff66#fragment',
    'https://user:pass@gemini.google.com/gem/d6f1958dff66',
    'https://gemini.google.com:443/gem/d6f1958dff66',
    'http://gemini.google.com/gem/d6f1958dff66',
  ]) {
    expect(normalizeCustomGemTarget(invalidUrl)).toBeNull();
  }
});

test('scales trusted Send stability only when the source package grows beyond two images', () => {
  expect(getCustomGemSendReadiness(1)).toEqual({ stableMs: 2_000, readyWindowMs: 12_000 });
  expect(getCustomGemSendReadiness(2)).toEqual({ stableMs: 2_000, readyWindowMs: 12_000 });
  expect(getCustomGemSendReadiness(5)).toEqual({ stableMs: 6_500, readyWindowMs: 16_500 });
  expect(getCustomGemSendReadiness(6)).toEqual({ stableMs: 8_000, readyWindowMs: 18_000 });
  expect(() => getCustomGemSendReadiness(0)).toThrow('between 1 and 6');
  expect(() => getCustomGemSendReadiness(7)).toThrow('between 1 and 6');
});

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

async function makeProductImages(count) {
  return Promise.all(Array.from({ length: count }, (_, index) => makeImage(
    'product_gallery',
    `product-${index + 1}.jpg`,
    'image/jpeg',
    new Uint8Array([0xff, 0xd8, 0xff, index + 1]),
  )));
}

async function makeCreatorImage() {
  return makeImage(
    'creator_image',
    'creator.png',
    'image/png',
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
}

function metadataOnly(images) {
  return images.map(({ role, filename, mimeType, bytes, sha256 }) => ({
    role,
    filename,
    mimeType,
    bytes,
    sha256,
  }));
}

async function makeRequest(overrides = {}, target = PRIMARY_TARGET) {
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
    gemUrl: target.gemUrl,
    images: [product, creator],
    message: 'Use the supplied images.',
    timeoutMs: 30_000,
    ...overrides,
  };
}

describe('transactional Custom Gem request validation', () => {
  test('accepts both exact targets and strips binary data from summaries', async () => {
    for (const target of CUSTOM_GEM_TARGETS) {
      const result = await validateGemStartRequest(await makeRequest({}, target));

      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.request.gemId).toBe(target.gemId);
      expect(result.request.gemUrl).toBe(target.gemUrl);
      expect(result.request.currentUrl).toBe(target.gemUrl);
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
    }
  });

  test('accepts one product_gallery image without a creator_image', async () => {
    const [product] = await makeProductImages(1);
    const result = await validateGemStartRequest(await makeRequest({ images: [product] }));

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.request.sources.map(({ role, filename }) => ({ role, filename }))).toEqual([
      { role: 'product_gallery', filename: 'product-1.jpg' },
    ]);
  });

  test('accepts five ordered products followed by one creator image', async () => {
    const products = await makeProductImages(5);
    const creator = await makeCreatorImage();
    const result = await validateGemStartRequest(await makeRequest({ images: [...products, creator] }));

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.request.sources.map(({ role, filename }) => ({ role, filename }))).toEqual([
      ...products.map(({ role, filename }) => ({ role, filename })),
      { role: 'creator_image', filename: 'creator.png' },
    ]);
  });

  test('fails closed for invalid creator placement, duplicate creators, and product overflow', async () => {
    const products = await makeProductImages(6);
    const creator = await makeCreatorImage();
    const cases = [
      [[creator, products[0]], 'invalid_image_role_0'],
      [[products[0], creator, products[1]], 'invalid_image_role_2'],
      [[products[0], creator, creator], 'invalid_image_role_2'],
      [products, 'invalid_image_role_5'],
      [[...products.slice(0, 5), creator, creator], 'invalid_image_count'],
    ];

    for (const [images, code] of cases) {
      const result = await validateGemStartRequest(await makeRequest({ images }));
      expect(result).toMatchObject({ ok: false, error: { code } });
    }
  });

  test('uses the exact ordered-source count and role error messages', async () => {
    const empty = await validateGemStartRequest(await makeRequest({ images: [] }));
    expect(empty).toEqual({
      ok: false,
      error: {
        stage: 'validation',
        code: 'invalid_image_count',
        message: 'images must contain 1 to 5 ordered product_gallery items followed by an optional creator_image (maximum 6 items)',
      },
    });

    const creator = await makeCreatorImage();
    const misplaced = await validateGemStartRequest(await makeRequest({ images: [creator] }));
    expect(misplaced).toEqual({
      ok: false,
      error: {
        stage: 'validation',
        code: 'invalid_image_role_0',
        message: 'image 0 creator_image must follow at least one product_gallery item',
      },
    });
  });

  test('fails closed for action, version, URL, order, byte count, signature, and digest mismatches', async () => {
    const valid = await makeRequest();
    const cases = [
      [{ action: 'chat' }, 'invalid_action'],
      [{ version: 'wrong' }, 'invalid_version'],
      [{ gemUrl: 'https://gemini.google.com/app' }, 'invalid_gem_url'],
      [{ gemUrl: 'https://gemini.google.com/gem/unknown123456' }, 'invalid_gem_url'],
      [{ gemUrl: `${PRIMARY_TARGET.gemUrl}/` }, 'invalid_gem_url'],
      [{ gemUrl: `${PRIMARY_TARGET.gemUrl}?query=1` }, 'invalid_gem_url'],
      [{ gemUrl: `${PRIMARY_TARGET.gemUrl}#hash` }, 'invalid_gem_url'],
      [{ gemUrl: `https://user:pass@${PRIMARY_TARGET.gemUrl.slice('https://'.length)}` }, 'invalid_gem_url'],
      [{ gemUrl: PRIMARY_TARGET.gemUrl.replace('gemini.google.com', 'gemini.google.com:443') }, 'invalid_gem_url'],
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
      [{ images: [{ ...valid.images[0], filename: '../product.jpg' }, valid.images[1]] }, 'invalid_filename_0'],
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

async function makeSubmitRequest(overrides = {}, target = PRIMARY_TARGET) {
  const start = await makeRequest({}, target);
  const messageSha256 = await sha256Hex(new TextEncoder().encode(start.message));
  return {
    id: requestId,
    action: CUSTOM_GEM_SUBMIT_ACTION,
    version: CUSTOM_GEM_SUBMIT_COMMAND_VERSION,
    requestId,
    gemUrl: target.gemUrl,
    tabId: 42,
    currentUrl: target.gemUrl,
    sources: metadataOnly(start.images),
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
  test('accepts both exact targets and retains the trusted metadata-only contract', async () => {
    for (const target of CUSTOM_GEM_TARGETS) {
      const result = await validateGemSubmitRequest(await makeSubmitRequest({}, target));

      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.request.tabId).toBe(42);
      expect(result.request.gemId).toBe(target.gemId);
      expect(result.request.gemUrl).toBe(target.gemUrl);
      expect(result.request.currentUrl).toBe(target.gemUrl);
      expect(result.request.sources).toHaveLength(2);
      expect(result.request.sources[0]).not.toHaveProperty('base64');
      expect(result.request.sources[0]).not.toHaveProperty('data');
      expect(result.request.sources[0]).not.toHaveProperty('localPath');
      expect(result.request.uploadReceipt).toEqual({
        version: CUSTOM_GEM_UPLOAD_RESULT_VERSION,
        commandId: 'bridge-command-1',
        receiptId: 'a'.repeat(64),
      });
    }
  });

  test('accepts one product source and five products followed by a creator source', async () => {
    const oneProduct = await makeProductImages(1);
    const oneProductResult = await validateGemSubmitRequest(await makeSubmitRequest({
      sources: metadataOnly(oneProduct),
    }));
    expect(oneProductResult).toMatchObject({ ok: true });
    if (!oneProductResult.ok) return;
    expect(oneProductResult.request.sources.map(({ role }) => role)).toEqual(['product_gallery']);

    const products = await makeProductImages(5);
    const creator = await makeCreatorImage();
    const fiveProductResult = await validateGemSubmitRequest(await makeSubmitRequest({
      sources: metadataOnly([...products, creator]),
    }));
    expect(fiveProductResult).toMatchObject({ ok: true });
    if (!fiveProductResult.ok) return;
    expect(fiveProductResult.request.sources.map(({ role, filename }) => ({ role, filename }))).toEqual([
      ...products.map(({ role, filename }) => ({ role, filename })),
      { role: 'creator_image', filename: 'creator.png' },
    ]);
  });

  test('uses the exact metadata-only ordered-source count error message', async () => {
    const result = await validateGemSubmitRequest(await makeSubmitRequest({ sources: [] }));
    expect(result).toEqual({
      ok: false,
      error: {
        stage: 'validation',
        code: 'invalid_image_count',
        message: 'sources must contain 1 to 5 ordered product_gallery items followed by an optional creator_image (maximum 6 items)',
      },
    });
  });

  test('fails closed for invalid creator placement, duplicate creators, and product overflow', async () => {
    const products = await makeProductImages(6);
    const creator = await makeCreatorImage();
    const cases = [
      [[creator, products[0]], 'invalid_image_role_0'],
      [[products[0], creator, products[1]], 'invalid_image_role_2'],
      [[products[0], creator, creator], 'invalid_image_role_2'],
      [products, 'invalid_image_role_5'],
      [[...products.slice(0, 5), creator, creator], 'invalid_image_count'],
    ];

    for (const [sources, code] of cases) {
      const result = await validateGemSubmitRequest(await makeSubmitRequest({ sources: metadataOnly(sources) }));
      expect(result).toMatchObject({ ok: false, error: { code } });
    }
  });

  test('fails closed for extra fields, reordered sources, hashes, bytes, URLs, and receipts', async () => {
    const valid = await makeSubmitRequest();
    const cases = [
      [{ extra: true }, 'invalid_command_shape'],
      [{ currentUrl: `${CUSTOM_GEM_URL}/conversation` }, 'invalid_gem_url'],
      [{ gemUrl: SECOND_TARGET.gemUrl }, 'invalid_gem_url'],
      [{ currentUrl: SECOND_TARGET.gemUrl }, 'invalid_gem_url'],
      [{ gemUrl: 'https://gemini.google.com/gem/unknown123456' }, 'invalid_gem_url'],
      [{ gemUrl: `${CUSTOM_GEM_URL}?query=1` }, 'invalid_gem_url'],
      [{ currentUrl: `${CUSTOM_GEM_URL}/` }, 'invalid_gem_url'],
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

test('Thai Send detection accepts the real label, icon, and class but rejects ambiguity and unrelated buttons', () => {
  const thaiLabel = { ariaLabel: 'ส่งข้อความ' };
  const thaiIcon = { iconFont: 'send' };
  const thaiClass = { className: 'send-button active' };

  expect(isGeminiSendControlDescriptor(thaiLabel)).toBe(true);
  expect(isGeminiSendControlDescriptor(thaiIcon)).toBe(true);
  expect(isGeminiSendControlDescriptor(thaiClass)).toBe(true);
  expect(selectGeminiSendControlDescriptor([thaiLabel, { ariaLabel: 'ส่งไฟล์' }])).toBe(thaiLabel);
  expect(selectGeminiSendControlDescriptor([thaiLabel, thaiIcon])).toBeNull();
  expect(isGeminiSendControlDescriptor({ ariaLabel: 'ส่งไฟล์' })).toBe(false);
  expect(isGeminiSendControlDescriptor({ ariaLabel: 'ส่งคำติชม' })).toBe(false);
  expect(isGeminiSendControlDescriptor({ ariaLabel: 'ส่งให้เพื่อน' })).toBe(false);
});

const navigationTabs = (initial) => {
  const listeners = new Set();
  return {
    get: async () => initial,
    onUpdated: {
      addListener: (listener) => listeners.add(listener),
      removeListener: (listener) => listeners.delete(listener),
    },
    emit: (tabId, changeInfo, tab) => {
      for (const listener of listeners) listener(tabId, changeInfo, tab);
    },
    listenerCount: () => listeners.size,
  };
};

test('trusted Custom Gem navigation requires a post-arm exact conversation transition for either target', async () => {
  for (const target of CUSTOM_GEM_TARGETS) {
    const tabs = navigationTabs({ url: target.gemUrl, status: 'complete' });
    const observer = await observeCustomGemConversationNavigation({
      tabs,
      tabId: 77,
      gemUrl: target.gemUrl,
      deadlineAt: Date.now() + 5_000,
    });
    const conversationUrl = `${target.gemUrl}/87dc48f315422485`;
    tabs.emit(77, { url: conversationUrl }, { url: conversationUrl, status: 'loading' });
    tabs.emit(77, { status: 'complete' }, { url: conversationUrl, status: 'complete' });
    expect(await observer.promise).toBe(conversationUrl);
    expect(tabs.listenerCount()).toBe(0);
  }
});

test('trusted Custom Gem navigation rejects historic, cross-target, query, or unrelated destinations', async () => {
  for (const target of CUSTOM_GEM_TARGETS) {
    expect(isExactCustomGemConversationUrl(target.gemUrl, `${target.gemUrl}/abc12345`)).toBe(true);
    expect(isExactCustomGemConversationUrl(target.gemUrl, `${target.gemUrl}/settings`)).toBe(false);
    expect(isExactCustomGemConversationUrl(target.gemUrl, `${target.gemUrl}/abc-123`)).toBe(false);
    expect(isExactCustomGemConversationUrl(target.gemUrl, `${target.gemUrl}/abc12345?query=1`)).toBe(false);
    expect(isExactCustomGemConversationUrl(target.gemUrl, `${SECOND_TARGET.gemUrl}/abc12345`)).toBe(target === SECOND_TARGET);
    await expect(
      observeCustomGemConversationNavigation({
        tabs: navigationTabs({ url: `${target.gemUrl}/historic`, status: 'complete' }),
        tabId: 77,
        gemUrl: target.gemUrl,
        deadlineAt: Date.now() + 5_000,
      }),
    ).rejects.toMatchObject({ code: 'gem_url_mismatch' });

    const tabs = navigationTabs({ url: target.gemUrl, status: 'complete' });
    const observer = await observeCustomGemConversationNavigation({
      tabs,
      tabId: 77,
      gemUrl: target.gemUrl,
      deadlineAt: Date.now() + 5_000,
    });
    const unrelatedUrl = target === PRIMARY_TARGET ? SECOND_TARGET.gemUrl : PRIMARY_TARGET.gemUrl;
    tabs.emit(77, { url: unrelatedUrl }, { url: unrelatedUrl, status: 'loading' });
    await expect(observer.promise).rejects.toMatchObject({ code: 'gem_url_mismatch' });
    expect(tabs.listenerCount()).toBe(0);
  }
});

test('the extension logs only the action name, never the full MQTT command', async () => {
  const source = await Bun.file(new URL('../skills/gemini/extension/background-src.js', import.meta.url)).text();
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
  expect(source).toContain('gemId: request.gemId')
  expect(source).toContain('gemUrl: request.gemUrl')
  expect(source).toContain('currentUrl: request.currentUrl')
  expect(source).toContain('response.result.gemId !== request.gemId')
  expect(source).toContain('const navigation = await observeCustomGemConversationNavigation({')
  expect(source).toContain('const conversationUrl = await navigation.promise')
  expect(source).toContain('expectedUrl: conversationUrl')
  expect(source).toContain('navigation.cancel()')
  expect(source).toContain('awaitTrustedCustomGemResponsePage')
  expect(source).toContain("node.setAttribute('data-custom-gem-baseline', payload.attributionToken)")
  expect(source).toContain("normalizeText(messageText(node)) === normalizeText(message)")
  expect(source).toContain("node.getAttribute('data-custom-gem-baseline') !== attributionToken")
  expect(source).toContain('const attributionToken = request.requestId')
  expect(source).toContain('attributedMessageNode.compareDocumentPosition(node)')
  expect(source).toContain('func: cleanupCustomGemAttributionPage')
  expect(source).toContain("node.querySelectorAll('.query-text-line')")
  expect(source).toContain('const tabReadyDeadline = Math.min(deadlineAt, Date.now() + 5_000)')
  expect(source).toContain('const sendReadyDeadline = Math.min(deadlineAt, Date.now() + sendReadyWindowMs)')
  expect(source).toContain('Date.now() - readySince >= sendStableMs')
  expect(source).toContain('sendReadyWindowMs: readiness.readyWindowMs')
  expect(source).toContain("errorCode: 'attachment_media_not_ready'")
  expect(source).toContain("attachment_media_not_ready: 'The Custom Gem attachments did not finish rendering before Send'")
  expect(source).toContain('image.complete && image.naturalWidth > 0')
  expect(source).toContain("customGemSendReadiness: CUSTOM_GEM_SEND_READINESS_CAPABILITY")
  expect(source).toContain("node.querySelector('.markdown-main-panel, .markdown, message-content")
  expect(source).toContain("lines.push(`${'#'.repeat(Number(tag[1]))} ${text}`)")
  expect(source).toContain("chrome.runtime.lastError?.message || response?.error")
  expect(source).toContain('await reserveCustomGemDurableRequest(request, fingerprint)')
  expect(source).toContain('if (cached.fingerprint !== fingerprint)')
  expect(source).toContain('if (inFlight.fingerprint !== fingerprint)')
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
  expect(source).toContain('sourceCount: sources.length');
  expect(source).toContain('sourceOrder: sources.map(({ role }) => role)');
  expect(source).toContain("return label === 'send' || label === 'send message' || label === 'ส่ง' || label === 'ส่งข้อความ'");
  expect(source).toContain("btn.classList.contains('send-button')");
  expect(source).toContain("Ambiguous Send controls in the composer");
  expect(source).not.toContain('exactly two visible attachments');
});
