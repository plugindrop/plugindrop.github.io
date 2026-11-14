const list = value => Array.isArray(value) ? value : [];
const nonempty = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const normalized = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[\s.!?。]+$/u, '');

export function dedupeChecks(items, compat = '') {
  const seen = new Set();
  const compatibility = normalized(compat).split(' · ').map(normalized);
  return list(items).filter(item => {
    const key = normalized(item?.text);
    if (!key || seen.has(key) || compatibility.includes(key)) return false;
    seen.add(key);
    return true;
  });
}

export function cleanEvidence(text) {
  const value = nonempty(text);
  if (!value || /^[a-z]/.test(value) || value.split(/\s+/).length < 6 || /^mode\s*,/i.test(value)) return null;
  return value;
}

export function sanitizeReq(value) {
  const text = nonempty(value);
  return text && text.length >= 6 && /(?:macOS|OS X|Windows|Win\s*\d)/i.test(text) && /\d/.test(text) ? text : null;
}

export function ownFactsFromContent(content) {
  const checks = list(content?.before_you_buy).map(item => nonempty(item?.text)).filter(Boolean);
  const find = pattern => checks.find(value => pattern.test(value)) || null;
  const formats = find(/\b(?:VST\d?|AU|AAX)\b/i)?.match(/\b(?:VST\d?|AU|AAX)\b/gi) || [];
  return {
    formats: [...new Set(formats.map(x => x.toUpperCase()))],
    mac_req: sanitizeReq(find(/macOS|OS X|^Mac:/i)),
    win_req: sanitizeReq(find(/Windows|^Win:/i)),
  };
}

export function selectBlocks(content) {
  if (!content || typeof content !== 'object') return [];
  return [
    (nonempty(content.overview) || nonempty(content.tagline) || list(content.features).some(x => nonempty(x?.text))) && 'overview',
    (list(content.sound).some(x => nonempty(x?.evidence)) || list(content.lineage).some(x => nonempty(x?.evidence)) || content.hasVideo) && 'sound',
    list(content.uses).filter(x => nonempty(x?.label) && nonempty(x?.evidence)).length >= 2 && 'uses',
    (list(content.before_you_buy).some(x => nonempty(x?.evidence)) || content.hasFacts) && 'before',
    list(content.peers).filter(nonempty).length >= 2 && 'compare',
  ].filter(Boolean);
}

export function hasContentDepth(name, productContent, rollout) {
  const allow = list(rollout?.allow);
  return (allow.includes('*') || allow.includes(name)) && selectBlocks(productContent?.[name]).length >= 3;
}

export function compatSummary(compat) {
  if (!compat) return null;
  const parts = [];
  if (compat.mac_min || compat.mac_max) parts.push(compat.mac_max ? `Listed up to macOS ${compat.mac_max}` : `macOS ${compat.mac_min} or later`);
  if (compat.win_min) parts.push(`Windows ${compat.win_min} or later`);
  if (compat.apple_silicon === true) parts.push('Apple Silicon native support listed');
  if (compat.licensing) parts.push(String(compat.licensing));
  if (compat.host) parts.push(String(compat.host));
  return parts.join(' · ') || null;
}

export function categoryShareLine({ count, aax, appleSilicon, category } = {}) {
  if (!count || !category) return null;
  return `Of the ${count} tracked ${category} products, ${aax ?? 0} list AAX; ${appleSilicon ?? 0} list Apple Silicon native support.`;
}

export function priceRankLine({ rank, count, category, price, date } = {}) {
  if (count < 5 || !rank || !category || !price || !date) return null;
  const suffix = rank % 100 >= 11 && rank % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[rank % 10] || 'th');
  return `At ${price} on ${date}, it was the ${rank}${suffix} lowest-priced of the ${count} ${category} products checked that day.`;
}

export function atAGlanceRows(content, verdict, peers = content?.peers) {
  if (!content) return [];
  const rows = [];
  const add = (label, text, href) => { if (nonempty(text)) rows.push({ label, text: text.trim(), ...(href ? { href } : {}) }); };
  add('What it is', nonempty(content.overview)?.split(/(?<=[.!?])\s+/)[0] || content.tagline);
  const uses = list(content.uses).filter(x => nonempty(x?.label) && nonempty(x?.evidence)).slice(0, 4);
  add('Made for', uses.map(x => x.label).join(' · '));
  const sound = list(content.sound).find(x => nonempty(x?.term) && nonempty(x?.evidence) && x.evidence.toLowerCase().includes(x.term.toLowerCase()));
  const lineage = list(content.lineage).find(x => nonempty(x?.phrase) && nonempty(x?.evidence));
  if (sound) add('Sound', `“${sound.evidence}” — ${content.vendor || 'Vendor'}`);
  else if (lineage) add('Sound', `Modelled on ${lineage.phrase}`);
  add('Next to', list(peers).filter(nonempty).slice(0, 3).join(' · '), '#how-it-compares');
  add('Price now', typeof verdict === 'string' ? verdict : verdict?.text);
  return rows.length >= 2 ? rows.slice(0, 5) : [];
}
