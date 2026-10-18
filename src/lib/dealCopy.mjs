export function validatedTagline(record) {
  if (!record || record.status !== 'ok' || typeof record.tagline !== 'string' || !record.tagline.trim()) return null;
  if (!/^https:\/\//.test(record.source_url ?? record.tagline_source_url ?? '') || !record.tagline_source_quote || !/^\d{4}-\d{2}-\d{2}$/.test(record.retrieved ?? record.tagline_checked ?? '')) return null;
  if (!record.machine_checks || !['quote_in_source', 'grounded_noun', 'lint_pass'].every(key => record.machine_checks[key] === true)) return null;
  return record.tagline.trim();
}

export function taglineForProduct(key, records = {}) {
  return validatedTagline(records[key]);
}
