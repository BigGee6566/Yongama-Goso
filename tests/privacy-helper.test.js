'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { matchLabels, normaliseValue, sha256 } = require('./helpers/privacy.js');

// FAKE number, hashed here exactly as tools/hash-forbidden.js would.
const table = new Map([[sha256(normaliseValue('012 345 6789')), 'fake phone']]);
const hit = (t) => matchLabels(t, table);

const caught = {
  'bare digits': '0123456789',
  'spaced in a tag': '<p>012 345 6789</p>',
  'after a year': 'Updated 2025 012 345 6789',
  'html nbsp entity': '012&nbsp;345&nbsp;6789',
  'numeric nbsp entities': '012&#160;345&#xa0;6789',
  'literal U+00A0': '012 345 6789',
  'groups in separate tags': '<b>012</b> <b>345</b> <b>6789</b>',
  'brackets': '(012) 345 6789',
  'dots': '012.345.6789',
  'hyphens and slash': '012-345/6789',
};
for (const [name, text] of Object.entries(caught)) {
  test(`phone is caught: ${name}`, () => assert.deepStrictEqual(hit(text), ['fake phone']));
}

test('short digits and an unrelated 13-digit timestamp are not flagged', () => {
  assert.deepStrictEqual(hit('Room 0123'), []);
  assert.deepStrictEqual(hit('ts 1700000000000'), []);
});
