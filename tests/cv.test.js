'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { findForbidden, findAlwaysOn, loadFingerprints } = require('./helpers/privacy.js');

const pdf = path.join(__dirname, '..', 'Yongama_Goso_CV.pdf');
const text = execFileSync('pdftotext', [pdf, '-'], { encoding: 'utf8' });
// pdftotext breaks long lines; compare phrases with whitespace collapsed.
const flat = text.replace(/\s+/g, ' ');
const fingerprints = loadFingerprints();

test('CV contains the latest content', () => {
  for (const s of ['Gonex Innovation Hub', 'Bachelor of Commerce', 'Oct 2026', 'References available on request',
    'KuGompo City (East London), Eastern Cape']) {
    assert.ok(flat.includes(s), `missing: ${s}`);
  }
});

test('CV is one page', () => {
  const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
  assert.match(info, /^Pages:\s+1$/m);
});

test('CV has no tel: link, South African phone number or email other than the public one', () => {
  assert.deepStrictEqual(findAlwaysOn(text), []);
});

test('CV contains no private values', { skip: !fingerprints && 'no private values file' }, () => {
  assert.deepStrictEqual(findForbidden(text, fingerprints), []);
});

test('CV no longer says "2023 - present" or "Student"', () => {
  assert.doesNotMatch(text, /2023\s*[–-]\s*present/i);
  assert.doesNotMatch(text, /Information Systems\) Student/i);
});
