// Shared with category_inference.py. Keep rule order identical.
export function inferCategory(name, notes, pbUrl, isBundleSection) {
  const haystack = `${name} ${notes ?? ''} ${pbUrl ?? ''}`.toLowerCase();
  const rules = [
    [/\bpro-r\b/, 'Reverb'], [/\bpro-c\b/, 'Compressor'],
    [/\bpro-l\b/, 'Limiter'], [/\bpro-mb\b/, 'Compressor'],
    [/\bpro-ds\b/, 'Vocal'],
    [/\b(serum|omnisphere|nexus|sylenth1?|vital)\b/, 'Synth'],
    [/\breverb\b/, 'Reverb'], [/\beq\b/, 'EQ'],
    [/\bcomp(?:ressor)?\b/, 'Compressor'], [/synth/, 'Synth'],
    [/tape|saturat/, 'Saturation'], [/master|ozone/, 'Mastering'],
    [/\blimit(?:er)?\b/, 'Limiter'], [/drum/, 'Drums'],
    [/tune|vocal|melodyne/, 'Vocal'], [/bundle|collection/, 'Bundle'],
    [/instrument|orchestral|piano|guitar|\borgan\b|strings|choir|brass/, 'Instrument'],
    [/utility|\bmeter\b|analy[sz]|loudness/, 'Utility'],
  ];
  return rules.find(([pattern]) => pattern.test(haystack))?.[1] ?? (isBundleSection ? 'Bundle' : 'Effects');
}

export function categoryForProduct(name, entry, isBundleSection) {
  return entry.category || inferCategory(name, entry.notes, entry.pb_url, isBundleSection);
}
