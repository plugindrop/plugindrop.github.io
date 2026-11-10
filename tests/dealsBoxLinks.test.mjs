import test from 'node:test';
import assert from 'node:assert/strict';
import { dealsBoxLinks } from '../src/lib/dealsBoxLinks.mjs';

test('price pages lead, preserve order within groups, and cap at three', () => {
  const history = [
    { date: '2026-01-01', source: 'auto_check', regular: 100, sale: 50 },
    { date: '2026-01-16', source: 'auto_check', regular: 100, sale: null },
    { date: '2026-03-01', source: 'auto_check', regular: 100, sale: 50 },
  ];
  const data = { plugins: { 'Acme One': { history }, 'Acme Two': { history } } };
  const deals = [
    { productName: 'Missing One' }, { productName: 'Acme Two' },
    { productName: 'Missing Two' }, { productName: 'Acme One' },
  ];
  const result = dealsBoxLinks(deals, data);
  assert.deepEqual(result.map(({ productName }) => productName), ['Acme Two', 'Acme One', 'Missing One']);
  assert.equal(result[0].pricePath, '/plugin-prices/acme-two/');
  assert.equal(result[1].pricePath, '/plugin-prices/acme-one/');
  assert.equal(result[2].pricePath, null);
  assert.equal(deals[0].pricePath, undefined);
});
