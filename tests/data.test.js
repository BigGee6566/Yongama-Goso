'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('manifest paths are url-safe and exist', () => {
  const manifestPath = path.join(root, 'media', 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'media/manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const keys = Object.keys(manifest);
  assert.ok(keys.length > 0, 'manifest must not be empty');
  for (const key of keys) {
    assert.match(key, /^media\/[a-z0-9\/._-]+$/, `url-unsafe manifest key: ${key}`);
    assert.ok(fs.existsSync(path.join(root, key)), `missing file for manifest key: ${key}`);
  }
});
