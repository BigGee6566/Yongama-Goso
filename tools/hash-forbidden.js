#!/usr/bin/env node
'use strict';
// Usage: node tools/hash-forbidden.js <plaintext-file>
// Reads `label|value` lines and writes tests/fixtures/forbidden.json with
// { label: sha256(normalised value) }. The plaintext file is never committed.
const fs = require('node:fs');
const { normaliseValue, sha256, FIXTURE } = require('../tests/helpers/privacy.js');

const src = process.argv[2];
if (!src) {
  console.error('usage: node tools/hash-forbidden.js <plaintext-file>');
  process.exit(1);
}
const table = {};
for (const line of fs.readFileSync(src, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const i = line.indexOf('|');
  table[line.slice(0, i).trim()] = sha256(normaliseValue(line.slice(i + 1)));
}
fs.writeFileSync(FIXTURE, JSON.stringify(table, null, 2) + '\n');
console.log(`wrote ${Object.keys(table).length} fingerprints to ${FIXTURE}`);
