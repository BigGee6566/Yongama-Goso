'use strict';
// Privacy guard. The real private values are never stored in the repo, only
// SHA-256 fingerprints of them (tests/fixtures/forbidden.json). This module
// turns text into "candidates", hashes them, and reports which labels match.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'forbidden.json');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Bare digits of a run if it looks like a phone / student number (9-10 digits).
// A "+27" style prefix (11 digits starting 27) also yields its "0..." form.
function digitCandidates(digits) {
  const out = [];
  if (digits.length === 9 || digits.length === 10) out.push(digits);
  if (digits.length === 11 && digits.startsWith('27')) out.push('0' + digits.slice(2));
  return out;
}

// Everything in `text` that could equal a forbidden value, lowercased:
// single words, adjacent word pairs, and digit runs with spaces/hyphens removed.
function candidates(text) {
  const lower = String(text).toLowerCase();
  const out = new Set();

  // Words: split on anything that cannot be part of an email/word, then trim
  // sentence punctuation so "name@x.com." still matches.
  const words = lower
    .split(/[^a-z0-9@._+-]+/)
    .map((w) => w.replace(/^[._+-]+|[._+-]+$/g, ''))
    .filter(Boolean);
  words.forEach((w, i) => {
    out.add(w);
    if (i + 1 < words.length) out.add(w + ' ' + words[i + 1]);
  });

  // Digit runs separated only by spaces or hyphens ("012 345 6789").
  for (const run of lower.match(/\d[\d \-]*\d/g) || []) {
    digitCandidates(run.replace(/\D/g, '')).forEach((d) => out.add(d));
  }
  // Unbroken digit strings inside longer tokens (e.g. "tel:0123456789").
  for (const run of lower.match(/\d+/g) || []) digitCandidates(run).forEach((d) => out.add(d));

  return out;
}

// Normalise a plaintext value the same way text candidates are normalised.
function normaliseValue(value) {
  const v = String(value).toLowerCase().trim().replace(/\s+/g, ' ');
  if (/^[\d \-+]+$/.test(v)) {
    const d = digitCandidates(v.replace(/\D/g, ''));
    if (d.length) return d[d.length - 1];
  }
  return v;
}

// Returns the labels (never the values) of forbidden items found in `text`.
function findForbidden(text) {
  const table = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')); // { label: sha256 }
  const byHash = new Map(Object.entries(table).map(([label, h]) => [h, label]));
  const hits = new Set();
  for (const c of candidates(text)) {
    const label = byHash.get(sha256(c));
    if (label) hits.add(label);
  }
  return [...hits];
}

module.exports = { findForbidden, candidates, normaliseValue, sha256, FIXTURE };
