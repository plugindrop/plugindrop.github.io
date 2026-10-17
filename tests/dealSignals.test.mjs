import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ownChecks, ownSpanDays, urgencyTag, rarityTag } from '../src/lib/dealSignals.mjs';
const now = Date.parse('2026-10-17T12:00:00Z');
const row = (date, sale, source='auto_check', until) => ({ date, regular:100, sale, source, until });
test('own tracking excludes archives and requires 45 days for rarity', () => {
  const entry = { history:[row('2026-01-01',20,'wayback'),row('2026-09-03',null),row('2026-10-17',20)] };
  assert.equal(ownChecks(entry).length,2); assert.equal(ownSpanDays(entry),44); assert.equal(rarityTag(entry,now),null);
  entry.history[1].date='2026-09-02'; assert.equal(ownSpanDays(entry),45);
});
test('urgency uses only an auto-check store date', () => {
  const entry={history:[row('2026-10-17',20,'auto_check','2026-10-17')]};
  assert.equal(urgencyTag(entry,now).type,'ends-today');
  entry.history[0].until='2026-10-19'; assert.equal(urgencyTag(entry,now).type,'ends-soon');
  entry.history[0].until='2026-10-23'; assert.equal(urgencyTag(entry,now).type,'ends-on');
  entry.history[0].until='2026-11-25'; assert.equal(urgencyTag(entry,now),null);
});
test('first sale is qualified by span and earlier regular checks', () => {
  const entry={history:['2026-06-01','2026-06-15','2026-07-01','2026-07-15','2026-08-01'].map(d=>row(d,null)).concat(row('2026-10-17',20))};
  assert.equal(rarityTag(entry,now).type,'first-sale');
  assert.match(rarityTag(entry,now).full,/months of checks/);
});
test('new low, matching low and deeper discount use previous own episodes', () => {
  const history=[row('2026-06-01',40),row('2026-07-01',null),row('2026-07-15',40),row('2026-08-01',null),row('2026-10-17',30)];
  const entry={history}; assert.equal(rarityTag(entry,now).type,'new-low');
  history.at(-1).sale=40; assert.equal(rarityTag(entry,now).type,'matches-low');
  history[2].sale=60; history.at(-1).sale=44; assert.equal(rarityTag(entry,now).type,'deeper-than-usual');
  history[2].source='research'; assert.notEqual(rarityTag(entry,now)?.type,'deeper-than-usual');
});
