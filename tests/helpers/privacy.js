'use strict';
// Privacy guard. The real private values are never stored in the repo, only
// SHA-256 fingerprints of them (tests/fixtures/forbidden.json). This module
// turns text into "candidates", hashes them, and reports which labels match.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'forbidden.json');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Candidates from one digit run: EVERY contiguous 9- and 10-digit window, so a
// number glued to other digits (e.g. a year before it) is still found. An
// 11-digit window starting "27" also yields its "0..." national form.
function digitCandidates(digits) {
  const out = [];
  for (const len of [9, 10, 11]) {
    for (let i = 0; i + len <= digits.length; i++) {
      const w = digits.slice(i, i + len);
      if (len < 11) out.push(w);
      else if (w.startsWith('27')) out.push('0' + w.slice(2));
    }
  }
  return out;
}

// Replace HTML tags with spaces and turn non-breaking spaces into plain ones.
function stripMarkup(lower) {
  return lower
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;|\u00a0/g, ' ');
}

// Everything in `text` that could equal a forbidden value, lowercased:
// single words, adjacent word pairs, and digit runs collected across
// separators (whitespace . ( ) - /) with every 9/10-digit window.
function candidates(text) {
  const lower = String(text).toLowerCase();
  const out = new Set();

  // Scan both the raw text (keeps mailto:/tel: attributes) and the
  // markup-stripped text (undoes digits split by tags or &nbsp;).
  for (const t of [lower, stripMarkup(lower)]) {
    // Words: split on anything that cannot be part of an email/word, then trim
    // sentence punctuation so "name@x.com." still matches.
    const words = t
      .split(/[^a-z0-9@._+-]+/)
      .map((w) => w.replace(/^[._+-]+|[._+-]+$/g, ''))
      .filter(Boolean);
    words.forEach((w, i) => {
      out.add(w);
      if (i + 1 < words.length) out.add(w + ' ' + words[i + 1]);
    });

    for (const run of t.match(/\d(?:[\s.()\-\/]*\d)*/g) || []) {
      digitCandidates(run.replace(/\D/g, '')).forEach((d) => out.add(d));
    }
  }
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

// Labels of the entries in `byHash` (Map: sha256 -> label) found in `text`.
function matchLabels(text, byHash) {
  const hits = new Set();
  for (const c of candidates(text)) {
    const label = byHash.get(sha256(c));
    if (label) hits.add(label);
  }
  return [...hits];
}

// Returns the labels (never the values) of forbidden items found in `text`.
function findForbidden(text) {
  const table = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')); // { label: sha256 }
  return matchLabels(text, new Map(Object.entries(table).map(([label, h]) => [h, label])));
}

module.exports = { findForbidden, matchLabels, candidates, normaliseValue, sha256, FIXTURE };
