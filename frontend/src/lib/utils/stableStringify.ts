/**
 * Stable JSON stringify with sorted keys.
 * Used for comparing API responses to avoid unnecessary re-renders.
 */

export function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return String(obj);
  }

  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => stableStringify(item)).join(',') + ']';
  }

  // Sort object keys
  const keys = Object.keys(obj).sort();
  const parts = keys.map(key => {
    const value = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + stableStringify(value);
  });

  return '{' + parts.join(',') + '}';
}
