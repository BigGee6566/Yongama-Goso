'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { startServer } = require('./helpers/server.js');
const { withPage, stubExternal } = require('./helpers/browser.js');

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

test('stubExternal answers the pinned hosts and withPage fails on any other host', async () => {
  const s = await startServer(root);
  try {
    // Allowed: a pinned CDN host is stubbed and nothing is recorded.
    await withPage(async (page) => {
      await stubExternal(page);
      await page.goto('/index.html', { waitUntil: 'load' });
      assert.strictEqual(await page.evaluate(async () => (await fetch('https://cdn.jsdelivr.net/x.css')).status), 200);
      assert.deepStrictEqual(page.unexpectedHosts, []);
    }, { baseUrl: s.url });
    // Not allowed: the request is still answered, but the test fails at the end of withPage.
    await assert.rejects(withPage(async (page) => {
      await stubExternal(page);
      await page.goto('/index.html', { waitUntil: 'load' });
      await page.evaluate(() => fetch('https://tracker.example.com/pixel', { mode: 'no-cors' }).catch(() => {}));
      assert.deepStrictEqual(page.unexpectedHosts, ['tracker.example.com']);
    }, { baseUrl: s.url }), /outside the pinned CDNs and Formspree/);
  } finally { await s.close(); }
});
