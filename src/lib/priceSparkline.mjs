export function sparklineGeom(rows, width = 600, height = 64) {
  const checks = (rows ?? []).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.sale ?? row.regular))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (checks.length < 5) return null;
  const first = Date.parse(checks[0].date), last = Date.parse(checks.at(-1).date);
  const values = checks.map(row => row.sale ?? row.regular);
  const low = Math.min(...values), high = Math.max(...values);
  if (last - first < 14 * 86400000 || low === high) return null;
  const points = checks.map((row, i) => ({ x: Math.round((Date.parse(row.date) - first) / (last - first) * width), y: Math.round((high - values[i]) / (high - low) * (height - 8)) + 4, value: values[i], date: row.date }));
  return { width, height, points, path: points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '), low };
}
