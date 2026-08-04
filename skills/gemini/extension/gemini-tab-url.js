export function buildGeminiTabUrl(baseUrl, explicitUrl, mode) {
  if (mode === 'research' || mode === 'canvas') {
    return `${baseUrl}/explore?mode=${mode}`;
  }

  if (typeof explicitUrl === 'string' && explicitUrl.startsWith('http')) {
    return explicitUrl;
  }

  return baseUrl;
}
