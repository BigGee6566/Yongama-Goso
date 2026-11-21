'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { findForbidden } = require('./helpers/privacy.js');

const pdf = path.join(__dirname, '..', 'Yongama_Goso_CV.pdf');
const text = execFileSync('pdftotext', [pdf, '-'], { encoding: 'utf8' });

test('CV contains the latest content', () => {
  for (const s of ['Gonex Innovation Hub', 'Bachelor of Commerce', 'Oct 2026', 'References available on request']) {
    assert.ok(text.includes(s), `missing: ${s}`);
  }
});

test('CV contains no private values', () => {
  assert.deepStrictEqual(findForbidden(text), []);
});

test('CV no longer says "2023 - present" or "Student"', () => {
  assert.doesNotMatch(text, /2023\s*[–-]\s*present/i);
  assert.doesNotMatch(text, /Information Systems\) Student/i);
});
