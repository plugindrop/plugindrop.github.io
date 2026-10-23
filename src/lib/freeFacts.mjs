export function freeFactsLine(fact) {
  const fields = [['license', 'License'], ['formats', 'Formats'], ['os', 'OS']];
  return fields.map(([field, label]) => [label, fact?.[field]?.value])
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`).join(' · ');
}
