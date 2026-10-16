export function formatOsRequirement(value) {
  if (typeof value !== 'string') return '—';
  const match = /^(?:macOS|Windows)\s+\d+(?:\.\d+)*(?=\s|$|;)/i.exec(value.trim());
  return match ? match[0].replace(/^macos/i, 'macOS') : '—';
}
