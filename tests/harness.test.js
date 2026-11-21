'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { startServer } = require('./helpers/server.js');
const { withPage } = require('./helpers/browser.js');

const root = path.join(__dirname, '..');

test('startServer serves / as index.html and 404s a missing file', async () => {
  const s = await startServer(root);
  try {
    const home = await fetch(s.url + '/');
    assert.strictEqual(home.status, 200);
    assert.match(home.headers.get('content-type'), /^text\/html/);
    assert.match(await home.text(), /<html/i);
    assert.strictEqual((await fetch(s.url + '/no-such-file.html')).status, 404);
  } finally { await s.close(); }
});

test('withPage collects console errors', async () => {
  await withPage(async (page) => {
    await page.goto('data:text/html,<script>console.error("x")</script>');
    assert.deepStrictEqual(page.consoleErrors, ['x']);
  });
});
