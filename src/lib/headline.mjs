export function composeHeadline({ brand, product, tagline, off, state, category = 'plugin' }) {
  const name = brand ? `${brand} ${product}` : product;
  if (state === 'free') return tagline ? `${tagline}: ${name} is free` : `${name} is free`;
  if (state === 'live' && off > 0) return tagline ? `${tagline}: ${name} is ${off}% off` : `${name} is ${off}% off`;
  return tagline ? `${tagline}: ${name}: price history and last sale` : `${name}: price history and last sale`;
}

export function composeSeoTitle({ brand, product, off, state, until }) {
  const name = `${brand ? `${brand} ` : ''}${product}`;
  if (state === 'free') return `${name}: Free Download`.slice(0, 65);
  if (state !== 'live' || !(off > 0)) return `${name} Price History & Sale Tracker`.slice(0, 65);
  const date = until ? ` (Ends ${new Date(`${until}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })})` : '';
  return `${name} ${off}% Off${date}`.slice(0, 65);
}
