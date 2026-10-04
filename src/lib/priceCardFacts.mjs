/** Attribute a displayed minimum when it comes from research at another store. */
export function lowestPriceAttribution(entry) {
  if (entry?.all_time_low == null) return null;
  const row = (entry.history ?? []).find((item) =>
    item.sale === entry.all_time_low && /^research_/.test(item.source ?? '') &&
    /gear4music|thomann/i.test(item.source));
  if (!row) return null;
  const store = /gear4music/i.test(row.source) ? 'Gear4Music' : 'Thomann';
  const month = new Date(`${row.date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });
  return `${store}, ${month}; research price`;
}
