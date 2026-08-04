export function normalizeToolLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function toolLabelsEqual(actual, requested) {
  return normalizeToolLabel(actual) === normalizeToolLabel(requested);
}
