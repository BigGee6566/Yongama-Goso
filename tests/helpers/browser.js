'use strict';
// Runs fn(page) in a fresh headless Chromium and always closes it.
// page.consoleErrors collects console.error texts and uncaught page errors.
const { chromium } = require('playwright');

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
  } finally {
    await browser.close();
  }
}

module.exports = { withPage };
