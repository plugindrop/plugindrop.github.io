export function validatedTagline(record) {
  if (!record || record.status !== 'ok' || typeof record.tagline !== 'string' || !record.tagline.trim()) return null;
  if (!/^https:\/\//.test(record.source_url ?? record.tagline_source_url ?? '') || !record.tagline_source_quote || !/^\d{4}-\d{2}-\d{2}$/.test(record.retrieved ?? record.tagline_checked ?? '')) return null;
  if (!record.machine_checks || !['quote_in_source', 'grounded_noun', 'lint_pass'].every(key => record.machine_checks[key] === true)) return null;
  if (/pluginboutique\.com\/?(?:[?#]|$)/i.test(record.source_url ?? '') || /\b(?:breathe life into your mix bus|analogue colour|classic analogue hardware colour|audio demo)\b/i.test(`${record.tagline} ${record.tagline_source_quote}`)) return null;
  if (/de.ess/i.test(record.tagline) && !/de.ess/i.test(record.tagline_source_quote)) return null;
  if (/\b(?:experimental spatial reverb|hard.tuning and voice manipulation|lo.fi effects for guitar|plate reverb for drums)\b/i.test(record.tagline)) return null;
  if (/\b(?:pristine|huge|massive|transparent|mastering.grade|confidence|professional(?:.quality)?|louder|deeper|bright|present|extreme|smooth|clean|punchy|fat|lush|warm|best|amazing|incredible|legendary|iconic|essential|ultimate|perfect)\b/i.test(record.tagline)) return null;
  return record.tagline.trim();
}

export function taglineForProduct(key, records = {}) {
  return validatedTagline(records[key]);
}
