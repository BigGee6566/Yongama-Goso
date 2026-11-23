'use strict';
// Runs fn(page) in a fresh headless Chromium and always closes it.
// page.consoleErrors collects console.error texts and uncaught page errors.
const assert = require('node:assert');
const { chromium } = require('playwright');

// The only hosts outside the local site that a page may reach: the four pinned CDN hosts and
// Formspree (the contact form).
const ALLOWED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'formspree.io'];

// Answers every request that leaves the local site with an empty 200, so the browser tests
// never depend on the CDNs being reachable (the pinned URLs are checked statically in
// shell.test.js). Formspree requests go to `formspree(route)` when it is given. A request to
// any other host is answered too, but recorded in page.unexpectedHosts, and withPage fails the
// test if there is one.
async function stubExternal(page, formspree) {
  page.unexpectedHosts = page.unexpectedHosts || [];
  await page.route((url) => /^https?:$/.test(url.protocol) && url.hostname !== '127.0.0.1', (route) => {
    const url = new URL(route.request().url());
    if (!ALLOWED_HOSTS.includes(url.hostname)) page.unexpectedHosts.push(url.host);
    if (formspree && url.hostname === 'formspree.io') return formspree(route);
    const type = route.request().resourceType() === 'stylesheet' ? 'text/css' : 'application/octet-stream';
    return route.fulfill({ status: 200, contentType: type, body: '' });
  });
}

async function withPage(fn, opts = {}) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: opts.viewport || { width: 1280, height: 800 },
      reducedMotion: opts.reducedMotion || 'no-preference',
      baseURL: opts.baseUrl,
    });
    const page = await context.newPage();
    page.consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') page.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => page.consoleErrors.push(e.message));
    await fn(page);
    if (page.unexpectedHosts) {
      assert.deepStrictEqual([...new Set(page.unexpectedHosts)], [], 'requests to hosts outside the pinned CDNs and Formspree');
    }
  } finally {
    await browser.close();
  }
}

module.exports = { withPage, stubExternal, ALLOWED_HOSTS };
