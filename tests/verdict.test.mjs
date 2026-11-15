import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { verdictLabel } from '../src/lib/verdict.mjs';
test('unknown history waits', () => assert.equal(verdictLabel({ history: [] }), 'WAIT'));
