const keys = new Set(['off', 'until', 'price', 'low']);

export function sortGridCards(cards, key) {
  if (!keys.has(key)) throw new RangeError(`Unknown grid sort: ${key}`);
  return cards.map((card, index) => ({ card, index })).sort((a, b) => {
    const x = a.card, y = b.card;
    let order;
    if (key === 'off') order = (y.off ?? -Infinity) - (x.off ?? -Infinity);
    else if (key === 'price') order = (x.current ?? Infinity) - (y.current ?? Infinity);
    else if (key === 'until') order = (x.until ?? '9999-12-31').localeCompare(y.until ?? '9999-12-31');
    else order = Number(y.rarity?.type === 'new-low') - Number(x.rarity?.type === 'new-low');
    return order || (y.score ?? 0) - (x.score ?? 0) || a.index - b.index;
  }).map(({ card }) => card);
}

export function gridOrderAttrs(cards) {
  const attrs = Object.fromEntries(cards.map(card => [card.key, {}]));
  for (const key of keys) sortGridCards(cards, key).forEach((card, rank) => { attrs[card.key][key] = rank; });
  return attrs;
}
