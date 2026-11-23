'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { servedFiles } = require('./helpers/server.js');
const { findForbidden, findAlwaysOn, loadFingerprints, privateValuesPath } = require('./helpers/privacy.js');

const root = path.join(__dirname, '..');
// README.md is served by GitHub Pages too, so it is scanned as well.
const scanned = [...servedFiles(root), 'README.md'];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// Built in memory from the git-ignored private values file; null where it is absent.
const fingerprints = loadFingerprints();
const noValues = !fingerprints &&
  'no private values file (set PORTFOLIO_PRIVATE_VALUES, or see "The privacy guard" in README.md)';

test('cv/resume.html is in the scanned set', () => {
  assert.ok(scanned.includes('cv/resume.html'), 'resume.html must be scanned');
});

test('the scanned set holds only publishable files', () => {
  const bad = scanned.filter((rel) =>
    /^(?:\.git|node_modules|tests|tools|docs)\/|(?:^|\/)(?:\.superpowers|\.ruff_cache|\.media-stage-[^/]*)\//.test(rel));
  assert.deepStrictEqual(bad, []);
});

// Always on: these need no private file, so they also guard a fresh clone.
test('no served file has a tel: link, a South African phone number or another email address', () => {
  const problems = [];
  for (const rel of scanned) {
    const rules = findAlwaysOn(read(rel));
    if (rules.length) problems.push(`${rel}: ${rules.join(', ')}`);
  }
  assert.deepStrictEqual(problems, []);
});

test('no served file contains a private value', { skip: noValues }, () => {
  const problems = [];
  for (const rel of scanned) {
    const labels = findForbidden(read(rel), fingerprints);
    if (labels.length) problems.push(`${rel}: ${labels.join(', ')}`);
  }
  assert.deepStrictEqual(problems, []);
});

// The two held-back exam games (see "Adding the two held-back exam games later" in README.md).
test('no served file mentions the withheld identifiers', () => {
  const bad = scanned.filter((rel) => /SA-NQOBA|CONQUEST/i.test(read(rel)));
  assert.deepStrictEqual(bad, []);
});

// Projects the owner has asked to keep off the site. Plain strings, case-insensitive.
// The hyphenated repo name is matched, so the spaced event title
// "UCT Cortex Hub Fintech Hackathon" stays allowed.
const REMOVED = ['MoMali', 'UCT-Cortex-Hub-Fintech-Hackathon'];
test('no served file mentions a removed project', () => {
  const bad = scanned.filter((rel) => {
    const text = read(rel).toLowerCase();
    return REMOVED.some((s) => text.includes(s.toLowerCase()));
  });
  assert.deepStrictEqual(bad, []);
});

// Builds a string from the real values at test time, in memory only, and checks every one is
// found. Only labels are compared or reported, never the values.
test('findForbidden flags every value in the private values file', { skip: noValues }, () => {
  const rows = fs.readFileSync(privateValuesPath(), 'utf8').split(/\r?\n/).filter((l) => l.trim())
    .map((l) => [l.slice(0, l.indexOf('|')).trim(), l.slice(l.indexOf('|') + 1)]);
  const text = 'Contact: ' + rows.map(([, v]) => v).join(' ; ') + '.';
  assert.deepStrictEqual(findForbidden(text, fingerprints).sort(), rows.map(([l]) => l).sort());
});

test('findForbidden returns [] for innocuous text', { skip: noValues }, () => {
  assert.deepStrictEqual(findForbidden('Hello world, 2024 and 2025.', fingerprints), []);
});
