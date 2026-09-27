import { RESEARCH_AUDIT } from '../data/research_audit.mjs';

// Keep in sync with monthly_sale_stats.py's observed source set.
export const OBSERVED_SOURCES = ['auto_check', 'pb_deals_poll', 'live_check', 'deal_intake', 'pb_crawl'];
const observed = new Set(OBSERVED_SOURCES);
const rowsOf = (entry) => Array.isArray(entry?.history) ? entry.history : [];
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

export function pbPathOf(pbUrl) {
  if (typeof pbUrl !== 'string' || !pbUrl.trim()) return null;
  try {
    const url = new URL(pbUrl, 'https://www.pluginboutique.com');
    const path = url.pathname.replace(/\/+$/, '');
    return path || null;
  } catch { return null; }
}

export function buildAuditIndex(audit) {
  const index = new Map();
  for (const item of audit?.items ?? []) {
    if (item?.reviewed !== true || !['confirmed', 'no_sale_seen'].includes(item.status)) continue;
    if (item.status === 'confirmed' && !(item.evidence ?? []).some((e) => finite(e?.price) && e?.snapshot_date && e?.snapshot_url)) continue;
    index.set(`${item.pb_path}|${item.research_date}|${item.research_source}`, item);
  }
  return index;
}

export const DEFAULT_AUDIT_INDEX = buildAuditIndex(RESEARCH_AUDIT);

export function isStandardCents(value) {
  return finite(value) && [0, 99, 95, 90, 50, 49].includes(((Math.round(value * 100) % 100) + 100) % 100);
}

export function sourceKindOf(row, pbPath, auditIndex = DEFAULT_AUDIT_INDEX) {
  if (observed.has(row?.source)) return 'tracker';
  if (row?.source === 'wayback') return 'archive';
  const item = auditIndex.get(`${pbPath}|${row?.date}|${row?.source}`);
  if (item?.status === 'confirmed') return 'archive_confirmed';
  if (item?.status === 'no_sale_seen') return 'research_contradicted';
  if (/thomann|gear4music/i.test(row?.source ?? '')) return 'research_other_store';
  if (row?.source === 'research_bf2023' || row?.source === 'research_bf2024') return 'research_estimate';
  return 'research_report';
}

export function confirmedSaleOf(row, pbPath, auditIndex = DEFAULT_AUDIT_INDEX) {
  if (sourceKindOf(row, pbPath, auditIndex) !== 'archive_confirmed') return null;
  const item = auditIndex.get(`${pbPath}|${row.date}|${row.source}`);
  const evidence = item.evidence.filter((e) => finite(e?.price) && e?.snapshot_date && e?.snapshot_url)
    .sort((a, b) => a.price - b.price || b.snapshot_date.localeCompare(a.snapshot_date))[0];
  return evidence ? { date: evidence.snapshot_date, price: evidence.price, url: evidence.snapshot_url } : null;
}

export function comparableHistory(entry, auditIndex = DEFAULT_AUDIT_INDEX) {
  const path = pbPathOf(entry?.pb_url);
  return rowsOf(entry).flatMap((row) => {
    const kind = sourceKindOf(row, path, auditIndex);
    if (kind === 'tracker' || kind === 'archive') return [row];
    if (kind !== 'archive_confirmed') return [];
    const sale = confirmedSaleOf(row, path, auditIndex);
    return sale ? [{ date: sale.date, regular: row.regular, sale: sale.price, source: 'wayback_confirmed' }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function comparablePrices(entry, auditIndex = DEFAULT_AUDIT_INDEX) {
  const path = pbPathOf(entry?.pb_url);
  return rowsOf(entry).flatMap((row) => {
    const kind = sourceKindOf(row, path, auditIndex);
    if (kind === 'tracker') {
      if (finite(row.sale)) return [{ date: row.date, price: row.sale, kind, isSale: true }];
      if (row.reg_src !== 'typical' && finite(row.regular)) return [{ date: row.date, price: row.regular, kind, isSale: false }];
    }
    if (kind === 'archive' && finite(row.regular) && isStandardCents(row.regular))
      return [{ date: row.date, price: row.regular, kind, isSale: false }];
    if (kind === 'archive_confirmed') {
      const sale = confirmedSaleOf(row, path, auditIndex);
      if (sale) return [{ date: sale.date, price: sale.price, kind, isSale: true }];
    }
    return [];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function lowestSeen(entry, auditIndex = DEFAULT_AUDIT_INDEX) {
  const low = comparablePrices(entry, auditIndex).sort((a, b) => a.price - b.price || b.date.localeCompare(a.date))[0];
  return low ? { price: low.price, date: low.date, kind: low.kind } : null;
}

export function latestTrackerRow(entry) {
  return rowsOf(entry).filter((row) => observed.has(row?.source))
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}
