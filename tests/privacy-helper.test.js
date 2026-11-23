'use strict';
// Unit tests for the privacy helper. Every value here is FAKE, and the fingerprint table is
// built in this file only; nothing is read from the private values file.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  matchLabels, normaliseValue, sha256, findForbidden, findAlwaysOn, loadFingerprints,
  privateValuesPath, DEFAULT_PRIVATE_VALUES, PUBLIC_EMAIL,
} = require('./helpers/privacy.js');

// A FAKE number, hashed exactly as loadFingerprints() hashes a value.
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

// --- loadFingerprints: the Map is built in memory from a `label|value` file ---------------

function tempFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'privacy-helper-'));
  const file = path.join(dir, 'values.txt');
  fs.writeFileSync(file, content);
  return { file, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('loadFingerprints builds sha256 -> label from label|value lines', () => {
  const { file, cleanup } = tempFile('fake phone|012 345 6789\r\n\nfake email|someone@example.com\n');
  try {
    const map = loadFingerprints(file);
    assert.strictEqual(map.size, 2);
    assert.deepStrictEqual([...map.values()].sort(), ['fake email', 'fake phone']);
    assert.ok(![...map.keys()].includes('012 345 6789'), 'keys are hashes, not values');
    assert.deepStrictEqual(findForbidden('Write to Someone@Example.com or call 012-345-6789.', map).sort(),
      ['fake email', 'fake phone']);
    assert.deepStrictEqual(findForbidden('Hello world, 2024 and 2025.', map), []);
  } finally { cleanup(); }
});

test('loadFingerprints returns null when the file is absent', () => {
  assert.strictEqual(loadFingerprints(path.join(os.tmpdir(), 'no-such-dir-xyz', 'values.txt')), null);
});

test('a malformed line is reported by number, without its content', () => {
  const { file, cleanup } = tempFile('fake phone|012 345 6789\nfake-secret-without-a-bar\n');
  try {
    assert.throws(() => loadFingerprints(file), (e) => /line 2/.test(e.message) && !e.message.includes('fake-secret'));
  } finally { cleanup(); }
});

test('findForbidden refuses to run without a table instead of passing silently', () => {
  assert.throws(() => findForbidden('text', null), /no private values file/);
});

test('PORTFOLIO_PRIVATE_VALUES overrides the default git-ignored path', () => {
  const saved = process.env.PORTFOLIO_PRIVATE_VALUES;
  try {
    delete process.env.PORTFOLIO_PRIVATE_VALUES;
    assert.ok(privateValuesPath().split(path.sep).join('/').endsWith(DEFAULT_PRIVATE_VALUES));
    process.env.PORTFOLIO_PRIVATE_VALUES = path.join(os.tmpdir(), 'elsewhere.txt');
    assert.strictEqual(privateValuesPath(), path.join(os.tmpdir(), 'elsewhere.txt'));
  } finally {
    if (saved === undefined) delete process.env.PORTFOLIO_PRIVATE_VALUES;
    else process.env.PORTFOLIO_PRIVATE_VALUES = saved;
  }
});

test('the default private values path is git-ignored', () => {
  const ignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8').split(/\r?\n/);
  assert.ok(ignore.includes('.superpowers/'), 'root .gitignore must ignore .superpowers/');
  assert.ok(DEFAULT_PRIVATE_VALUES.startsWith('.superpowers/'));
});

// --- Always-on guards: no private file needed ---------------------------------------------

const PHONE = 'South African phone number';
const TEL = 'tel: link';
const OTHER_EMAIL = 'email address other than ' + PUBLIC_EMAIL;
const alwaysOnCaught = [
  ['a bare mobile number', '0825550100', [PHONE]],
  ['a spaced mobile number', 'Call 082 555 0100 today', [PHONE]],
  ['a hyphenated mobile number', '072-555-0100', [PHONE]],
  ['an international number', '+27 82 555 0100', [PHONE]],
  ['a number split across tags', '<b>082</b> <b>555</b> <b>0100</b>', [PHONE]],
  ['a number split by &nbsp;', '082&nbsp;555&nbsp;0100', [PHONE]],
  ['a tel: link', '<a href="tel:+27825550100">call</a>', [TEL, PHONE]],
  ['a tel: link with no number', '<a href="TEL:">call</a>', [TEL]],
  ['another email', 'someone@example.com', [OTHER_EMAIL]],
  ['another email beside the public one', `${PUBLIC_EMAIL} or someone@example.org`, [OTHER_EMAIL]],
];
for (const [name, text, rules] of alwaysOnCaught) {
  test(`always-on guard catches ${name}`, () => assert.deepStrictEqual(findAlwaysOn(text), rules));
}

const alwaysOnAllowed = {
  'the public email': `<a href="mailto:${PUBLIC_EMAIL}">${PUBLIC_EMAIL}</a>`,
  'the public email in capitals': PUBLIC_EMAIL.toUpperCase(),
  'years and short numbers': 'From 2024 to 2025, room 0123, 8 weeks',
  'a 13-digit timestamp': 'ts 1700000000000',
  'a landline-style number': '012 345 6789',
  'a pinned CDN package': 'https://cdn.jsdelivr.net/npm/devicon@2.16.0/devicon.min.css',
  'the word hotel:': 'The hotel: near the station',
};
for (const [name, text] of Object.entries(alwaysOnAllowed)) {
  test(`always-on guard allows ${name}`, () => assert.deepStrictEqual(findAlwaysOn(text), []));
}
