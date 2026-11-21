'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { servedFiles } = require('./helpers/server.js');
const { findForbidden } = require('./helpers/privacy.js');

const root = path.join(__dirname, '..');
// README.md is served by GitHub Pages too, so it is scanned as well.
const scanned = [...servedFiles(root), 'README.md'];

test('cv/resume.html is in the scanned set', () => {
  assert.ok(scanned.includes('cv/resume.html'), 'resume.html must be scanned');
});

test('no served file contains a forbidden fingerprint', () => {
  const problems = [];
  for (const rel of scanned) {
    const labels = findForbidden(fs.readFileSync(path.join(root, rel), 'utf8'));
    if (labels.length) problems.push(`${rel}: ${labels.join(', ')}`);
  }
  assert.deepStrictEqual(problems, []);
});

test('no served file mentions the withheld identifiers', () => {
  const bad = scanned.filter((rel) =>
    /SA-NQOBA|CONQUEST/i.test(fs.readFileSync(path.join(root, rel), 'utf8')));
  assert.deepStrictEqual(bad, []);
});

// Builds a string from the real plaintext values at test time. The file is
// git-ignored, so this is skipped wherever it is absent.
const plaintext = path.join(root, '.superpowers/sdd/2026-11-21-portfolio-redesign/forbidden-plaintext.txt');
test('findForbidden flags every value from the plaintext file', { skip: !fs.existsSync(plaintext) && 'plaintext file absent' }, () => {
  const rows = fs.readFileSync(plaintext, 'utf8').split('\n').filter(Boolean)
    .map((l) => [l.slice(0, l.indexOf('|')), l.slice(l.indexOf('|') + 1)]);
  const fixture = 'Contact: ' + rows.map(([, v]) => v).join(' ; ') + '.';
  const found = findForbidden(fixture).sort();
  assert.deepStrictEqual(found, rows.map(([l]) => l).sort());
});

test('findForbidden returns [] for innocuous text', () => {
  assert.deepStrictEqual(findForbidden('Hello world, 2024 and 2025.'), []);
});
