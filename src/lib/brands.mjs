/**
 * brands — canonical brand detection shared by /brands/[brand].astro and
 * TopDeals.astro's ranking (dealRanking.mjs).
 *
 * Matching is done against the *start* of the product name (e.g. "FabFilter
 * Pro-Q 4" -> "FabFilter"), falling back to a whole-word search in `notes`
 * for the rare product whose name doesn't carry the brand token. Products
 * that don't match any known brand are left ungrouped rather than guessed at.
 *
 * `tier` feeds TopDeals' brand-recognition ranking bonus (S > A > unlisted/B).
 * Tier values are an initial hypothesis, not a measured fact — revisit once
 * GA4 pb_click data has accumulated (see docs/codex-requests/
 * topdeals-scoring-copy-redesign-2026-09-25.md §PR-1).
 */

export const BRAND_ALIASES = [
  { canonical: 'FabFilter', prefixes: ['FabFilter'], tier: 'S' },
  { canonical: 'u-he', prefixes: ['u-he'], tier: 'S' },
  { canonical: 'Native Instruments', prefixes: ['Native Instruments', 'NI Komplete'], tier: 'S' },
  { canonical: 'Arturia', prefixes: ['Arturia'], tier: 'S' },
  { canonical: 'iZotope', prefixes: ['iZotope'], tier: 'S' },
  { canonical: 'Waves', prefixes: ['Waves'], tier: 'S' },
  { canonical: 'Soundtoys', prefixes: ['Soundtoys'], tier: 'S' },
  { canonical: 'Softube', prefixes: ['Softube'], tier: 'A' },
  { canonical: 'Plugin Alliance', prefixes: ['Plugin Alliance', 'bx_'], tier: 'A' },
  { canonical: 'Universal Audio', prefixes: ['UAD', 'Universal Audio'], tier: 'S' },
  { canonical: 'Spitfire Audio', prefixes: ['Spitfire Audio', 'Spitfire'], tier: 'S' },
  { canonical: 'Output', prefixes: ['Output'], tier: 'A' },
  { canonical: 'Baby Audio', prefixes: ['Baby Audio'], tier: 'A' },
  { canonical: 'Cherry Audio', prefixes: ['Cherry Audio'], tier: 'A' },
  { canonical: 'Kilohearts', prefixes: ['Kilohearts'], tier: 'A' },
  { canonical: 'Xfer', prefixes: ['Xfer'], tier: 'S' },
  { canonical: 'Spectrasonics', prefixes: ['Spectrasonics'], tier: 'S' },
  { canonical: 'UVI', prefixes: ['UVI'], tier: 'A' },
  { canonical: 'Toontrack', prefixes: ['Toontrack'], tier: 'A' },
  { canonical: 'XLN Audio', prefixes: ['XLN Audio'], tier: 'A' },
  { canonical: 'Slate Digital', prefixes: ['Slate Digital'], tier: 'A' },
  { canonical: 'Valhalla', prefixes: ['Valhalla'], tier: 'S' },
  { canonical: 'Eventide', prefixes: ['Eventide'], tier: 'A' },
  { canonical: 'Sonnox', prefixes: ['Sonnox'], tier: 'A' },
  { canonical: 'Cableguys', prefixes: ['Cableguys'], tier: 'A' },
  { canonical: 'Newfangled Audio', prefixes: ['Newfangled Audio', 'Newfangled'], tier: 'A' },
  { canonical: 'GForce', prefixes: ['GForce'], tier: 'A' },
  { canonical: 'Sonible', prefixes: ['Sonible'], tier: 'A' },
  { canonical: 'oeksound', prefixes: ['oeksound'], tier: 'A' },
  { canonical: 'Wavesfactory', prefixes: ['Wavesfactory'], tier: 'B' },
  { canonical: 'Klanghelm', prefixes: ['Klanghelm'], tier: 'B' },
  { canonical: 'AudioThing', prefixes: ['AudioThing'], tier: 'B' },
  { canonical: 'Denise Audio', prefixes: ['Denise Audio'], tier: 'B' },
  { canonical: 'Minimal Audio', prefixes: ['Minimal Audio'], tier: 'A' },
  { canonical: 'Excite Audio', prefixes: ['Excite Audio'], tier: 'A' },
  { canonical: 'Heavyocity', prefixes: ['Heavyocity'], tier: 'A' },
  { canonical: 'ProjectSAM', prefixes: ['ProjectSAM'], tier: 'A' },
  { canonical: 'EastWest', prefixes: ['EastWest'], tier: 'A' },
  { canonical: 'Vengeance', prefixes: ['Vengeance Sound', 'Vengeance'], tier: 'B' },
  { canonical: 'reFX', prefixes: ['reFX'], tier: 'A' },
  { canonical: 'Reveal Sound', prefixes: ['Reveal Sound'], tier: 'B' },
  { canonical: 'KV331', prefixes: ['KV331 Audio', 'KV331'], tier: 'B' },
  { canonical: 'LennarDigital', prefixes: ['LennarDigital'], tier: 'A' },
  { canonical: 'Celemony', prefixes: ['Celemony'], tier: 'A' },
  { canonical: 'Antares', prefixes: ['Antares'], tier: 'A' },
  { canonical: 'Relab', prefixes: ['Relab Development', 'Relab'], tier: 'B' },
  { canonical: 'LiquidSonics', prefixes: ['LiquidSonics'], tier: 'A' },
  { canonical: 'DMG Audio', prefixes: ['DMG Audio'], tier: 'A' },
  { canonical: 'GetGood Drums', prefixes: ['GetGood Drums'], tier: 'B' },
  // Added 2026-09-25 (topdeals-scoring-copy-redesign): brands seen in live
  // price_history.json deals that weren't grouped on /brands/ pages either.
  { canonical: 'Solid State Logic', prefixes: ['SSL Native', 'SSL', 'Solid State Logic'], tier: 'S' },
  { canonical: 'Unfiltered Audio', prefixes: ['Unfiltered Audio'], tier: 'A' },
  { canonical: 'Empirical Labs', prefixes: ['Empirical Labs'], tier: 'A' },
  { canonical: 'IK Multimedia', prefixes: ['IK Multimedia', 'AmpliTube'], tier: 'A' },
  { canonical: 'Moog', prefixes: ['Moog'], tier: 'A' },
];

const TIER_BY_CANONICAL = new Map(BRAND_ALIASES.map((b) => [b.canonical, b.tier ?? 'B']));

export function tierOf(canonicalBrand) {
  if (!canonicalBrand) return null;
  return TIER_BY_CANONICAL.get(canonicalBrand) ?? 'B';
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Flattened + sorted longest-prefix-first so e.g. "Spitfire Audio" is tried
// before the shorter "Spitfire", and "NI Komplete" before any bare "NI".
export function flattenBrandPrefixes(defs) {
  const flat = [];
  for (const d of defs) for (const p of d.prefixes) flat.push({ prefix: p, canonical: d.canonical });
  return flat.sort((a, b) => b.prefix.length - a.prefix.length);
}

const FLAT_PREFIXES = flattenBrandPrefixes(BRAND_ALIASES);

export function detectBrand(name, notes, flatPrefixes = FLAT_PREFIXES) {
  for (const { prefix, canonical } of flatPrefixes) {
    // Prefixes ending in "_" (e.g. "bx_") glue directly onto the next word
    // with no space ("bx_console SSL 4000 E"), unlike normal brand names.
    if (prefix.endsWith('_')) {
      if (name.startsWith(prefix)) return canonical;
      continue;
    }
    if (name === prefix || name.startsWith(prefix + ' ')) return canonical;
  }
  if (notes) {
    for (const { prefix, canonical } of flatPrefixes) {
      const re = new RegExp(`\\b${escapeRegExp(prefix)}\\b`);
      if (re.test(notes)) return canonical;
    }
  }
  return null;
}
