export function formatsLine(entry) {
  const formats = Array.isArray(entry?.formats) ? entry.formats : [];
  const normalized = [...new Set(formats.map(value => String(value).trim().toUpperCase()).filter(Boolean))];
  if (normalized.includes('VST3')) {
    const index = normalized.indexOf('VST');
    if (index !== -1) { const first = Math.min(index, normalized.indexOf('VST3')); normalized.splice(normalized.indexOf('VST3'), 1); normalized.splice(normalized.indexOf('VST'), 1); normalized.splice(first, 0, 'VST3'); }
  }
  const trailing = ['NKS', 'STANDALONE'];
  const ordered = [...normalized.filter(value => !trailing.includes(value)), ...trailing.filter(value => normalized.includes(value))];
  return ordered.length ? ordered.slice(0, 4).map(value => value === 'STANDALONE' ? 'Standalone' : value).join(' · ') : null;
}
