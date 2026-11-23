'use strict';
// Privacy guard, in two layers.
//
// 1. Fingerprints of the real private values. The values live only in a git-ignored
//    plain-text file (`label|value` per line), never in the repo. At test time that file
//    is read into an in-memory Map of sha256(normalised value) -> label, and text is
//    turned into "candidates", hashed and looked up. Nothing derived from the values is
//    ever written to disk. Where the file is absent (a fresh clone), loadFingerprints()
//    returns null and the fingerprint tests are skipped.
// 2. Always-on guards that need no private file: no `tel:` link, no South African phone
//    number, and no email address other than the public one.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..', '..');
// Relative to the repo root. PORTFOLIO_PRIVATE_VALUES overrides it.
const DEFAULT_PRIVATE_VALUES = '.superpowers/sdd/2026-11-21-portfolio-redesign/forbidden-plaintext.txt';

const PUBLIC_EMAIL = 'goso.yonga@gmail.com';

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
function stripMarkup(text) {
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;|\u00a0/gi, ' ');
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

// Where the git-ignored plaintext file is expected.
function privateValuesPath() {
  const fromEnv = process.env.PORTFOLIO_PRIVATE_VALUES;
  return fromEnv ? path.resolve(fromEnv) : path.join(REPO_ROOT, DEFAULT_PRIVATE_VALUES);
}

// Map sha256(normalised value) -> label, built in memory from `label|value` lines.
// Returns null when the file is absent. Errors name a line number, never its content.
function loadFingerprints(file = privateValuesPath()) {
  if (!fs.existsSync(file)) return null;
  const byHash = new Map();
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, n) => {
    if (!line.trim()) return;
    const i = line.indexOf('|');
    if (i <= 0 || !line.slice(i + 1).trim()) {
      throw new Error(`private values file: line ${n + 1} is not "label|value"`);
    }
    byHash.set(sha256(normaliseValue(line.slice(i + 1))), line.slice(0, i).trim());
  });
  return byHash;
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

let cached; // undefined until first use; then a Map, or null when the file is absent
// Returns the labels (never the values) of private values found in `text`.
// Throws when there is no private values file: callers skip first (see loadFingerprints).
function findForbidden(text, byHash) {
  if (byHash === undefined) {
    if (cached === undefined) cached = loadFingerprints();
    byHash = cached;
  }
  if (!byHash) throw new Error('findForbidden: no private values file; skip this check instead');
  return matchLabels(text, byHash);
}

// --- Always-on guards -------------------------------------------------------------------

// A South African mobile number: +27 or a leading 0, then 6x/7x/8x and seven more digits,
// each optionally after one space or hyphen.
const SA_PHONE = /(?:\+27[\s-]?|\b0)[6-8]\d(?:[\s-]?\d){7}\b/;
const TEL_LINK = /\btel:/i;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;

// Names of the always-on rules that `text` breaks (never the matching text itself).
function findAlwaysOn(text) {
  const raw = String(text);
  // Tags and &nbsp; become spaces, then runs of spaces collapse, so a number split across
  // tags ("<b>082</b> <b>555</b> ...") still reads as one.
  const plain = stripMarkup(raw).replace(/\s+/g, ' ');
  const out = [];
  if (TEL_LINK.test(raw)) out.push('tel: link');
  if (SA_PHONE.test(raw) || SA_PHONE.test(plain)) out.push('South African phone number');
  const emails = [...raw.matchAll(EMAIL), ...plain.matchAll(EMAIL)].map((m) => m[0].toLowerCase());
  if (emails.some((e) => e !== PUBLIC_EMAIL)) out.push('email address other than ' + PUBLIC_EMAIL);
  return out;
}

module.exports = {
  findForbidden, loadFingerprints, privateValuesPath, matchLabels, candidates, normaliseValue,
  sha256, findAlwaysOn, PUBLIC_EMAIL, DEFAULT_PRIVATE_VALUES,
};
