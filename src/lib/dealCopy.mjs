export function validatedTagline(record) {
  if (!record || record.status !== 'ok' || typeof record.tagline !== 'string' || !record.tagline.trim()) return null;
  if (!/^https:\/\//.test(record.source_url ?? record.tagline_source_url ?? '') || !record.tagline_source_quote || !/^\d{4}-\d{2}-\d{2}$/.test(record.retrieved ?? record.tagline_checked ?? '')) return null;
  if (!record.machine_checks || !['quote_in_source', 'grounded_noun', 'lint_pass'].every(key => record.machine_checks[key] === true)) return null;
  if (/pluginboutique\.com\/?(?:[?#]|$)/i.test(record.source_url ?? '') || /\b(?:breathe life into your mix bus|analogue colour|classic analogue hardware colour|audio demo)\b/i.test(`${record.tagline} ${record.tagline_source_quote}`)) return null;
  if (/de.ess/i.test(record.tagline) && !/de.ess/i.test(record.tagline_source_quote)) return null;
  if (/\b(?:experimental spatial reverb|hard.tuning and voice manipulation|lo.fi effects for guitar|plate reverb for drums)\b/i.test(record.tagline)) return null;
  if (/\b(?:pristine|huge|massive|transparent|mastering.grade|confidence|professional(?:.quality)?|louder|deeper|bright|present|extreme|smooth|clean|punchy|fat|lush|warm|best|amazing|incredible|legendary|iconic|essential|ultimate|perfect)\b/i.test(record.tagline)) return null;
  if (/\b(?:medium fast attack|medium fast release|mono drum room phasing|before the original sound|gentle passive eq shaping|orchestral scoring|classic steinway model d|(?:19|20)\d{2}\s+(?:synth|five.voice))\b/i.test(record.tagline)) return null;
  return record.tagline.trim();
}

export function taglineForProduct(key, records = {}) {
  return validatedTagline(records[key]);
}

export function makerQuoteForProduct(key, records = {}) {
  const r = records[key];
  const quote = r?.maker_quote?.trim();
  const url = r?.maker_quote_source_url;
  const retrieved = r?.maker_quote_retrieved;
  if (!quote || quote.length < 40 || quote.length > 120 || !/^https:\/\/[^\s/]+\/\S+/i.test(url ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(retrieved ?? '')) return null;
  if (/pluginboutique\.com\/?(?:[?#]|$)/i.test(url) || /\b(?:audio demo|breathe life into your mix bus|analogue colour|classic analogue hardware colour)\b/i.test(quote) || /(?:\$|€|£)\s*\d|\d\s*%/.test(quote)) return null;
  return { quote, source_url: url };
}
