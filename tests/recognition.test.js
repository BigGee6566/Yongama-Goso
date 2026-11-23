'use strict';
// The Recognition page: anchors, awards, the Gonex profile and vision,
// and the certificate gallery with its dialog.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { startServer } = require('./helpers/server.js');
const { withPage, stubExternal } = require('./helpers/browser.js');
const SITE = require('../assets/js/data.js');

const root = path.join(__dirname, '..');

let server;
test.before(async () => { server = await startServer(root); });
test.after(async () => { await server.close(); });

function onPage(fn, opts = {}) {
  return withPage(async (page) => {
    await stubExternal(page);
    await page.goto('/recognition.html', { waitUntil: 'load' });
    await fn(page);
  }, { baseUrl: server.url, ...opts });
}

const activeInDialog = (page) => page.evaluate(() => !!document.activeElement.closest('[role=dialog]'));

test('anchors, one h1, intro, and no console errors (http and file://)', async () => {
  await onPage(async (page) => {
    const ids = await page.$$eval('main section[id]', (s) => s.map((e) => e.id));
    assert.deepEqual(ids, ['awards', 'gonex', 'certificates']);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal((await page.locator('.page-intro').textContent()).trim(),
      'Awards, selections and certificates, and the community organisation I founded.');
    assert.deepEqual(page.consoleErrors, []);
  });
  await withPage(async (page) => {
    await stubExternal(page);
    await page.goto(pathToFileURL(path.join(root, 'recognition.html')).href, { waitUntil: 'load' });
    assert.equal(await page.locator('.cert-card').count(), 8);
    assert.deepEqual(page.consoleErrors, []);
  });
});

test('#awards lists the recognition entries', async () => {
  await onPage(async (page) => {
    const text = await page.locator('#awards').textContent();
    for (const s of ['2nd place', 'EDHE/ABSA InnoVarsity', 'Eastern Cape Regional Round',
      'Startup Grind All-Star Pitch Battle', '17–18 Oct 2026']) {
      assert.ok(text.includes(s), s);
    }
    assert.equal(await page.locator('#awards .recognition > li').count(), SITE.recognition.length);
  });
});

test('#gonex has the summary, the vision verbatim as a pull-quote, and an external link', async () => {
  await onPage(async (page) => {
    const g = page.locator('#gonex');
    assert.ok((await g.locator('h2').textContent()).includes('Gonex Innovation Hub'));
    assert.equal(await g.locator('.gonex__summary p').count(), SITE.gonex.summary.length);
    const quote = g.locator('blockquote.pull-quote');
    assert.equal(await quote.count(), 1);
    assert.equal((await quote.textContent()).trim(), SITE.gonex.vision);
    const link = g.locator('a', { hasText: 'Visit Gonex Innovation Hub' });
    assert.equal(await link.getAttribute('href'), 'https://gonex-website.vercel.app');
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.match(await link.getAttribute('rel'), /noopener/);
  });
});

test('8 certificate cards: 6 open the dialog, 2 are inert text cards', async () => {
  await onPage(async (page) => {
    assert.equal(await page.locator('#certificates .cert-card').count(), 8);
    assert.equal(await page.locator('#certificates .cert-card__open').count(), 6);
    const text = page.locator('#certificates .cert-card--text');
    assert.equal(await text.count(), 2);
    const all = await text.allTextContents();
    assert.ok(all.some((t) => t.includes('Quality Work Experience Programme')));
    assert.ok(all.some((t) => t.includes('UCT–Cortex Hub Fintech Lab 2026 Summer School')));
    assert.equal(await text.locator('button').count(), 0);
  });
});

test('certificate dialog is named, shows the image, traps Tab, Escape restores focus', async () => {
  await onPage(async (page) => {
    const c = SITE.certificates[0];
    const opener = page.locator('.cert-card__open').first();
    await opener.click();
    const dialog = page.locator('[role=dialog][aria-modal=true]');
    assert.equal(await dialog.count(), 1);
    const name = await dialog.evaluate((d) => document.getElementById(d.getAttribute('aria-labelledby')).textContent.trim());
    assert.equal(name, c.title);
    const img = dialog.locator('img');
    assert.equal(await img.getAttribute('src'), c.image);
    assert.equal(await img.getAttribute('alt'), c.title + ' certificate');
    assert.ok((await dialog.textContent()).includes(c.issuer));
    assert.ok(await activeInDialog(page));
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      assert.ok(await activeInDialog(page), `Tab ${i + 1} stayed inside`);
    }
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Shift+Tab');
      assert.ok(await activeInDialog(page), `Shift+Tab ${i + 1} stayed inside`);
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[role=dialog]').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.full), c.image);
  });
});

test('under reduced motion nothing is hidden waiting for a reveal', async () => {
  await onPage(async (page) => {
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('reveal-ready')), false);
    const o = await page.$$eval('#awards li, #certificates .cert-card, #gonex .pull-quote', (els) => els.map((e) => getComputedStyle(e).opacity));
    assert.ok(o.length > 8 && o.every((v) => v === '1'));
  }, { reducedMotion: 'reduce' });
});

test('no horizontal scroll at 360px', async () => {
  await onPage(async (page) => {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 360));
  }, { viewport: { width: 360, height: 800 } });
});
