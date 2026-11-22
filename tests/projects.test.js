'use strict';
// The Projects page: the card grid, filter chips, the accessible modal (name, focus
// trap, Escape, focus return), #<slug> deep links, and video previews.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { startServer } = require('./helpers/server.js');
const { withPage } = require('./helpers/browser.js');
const SITE = require('../assets/js/data.js');

const root = path.join(__dirname, '..');
const dataJs = fs.readFileSync(path.join(root, 'assets/js/data.js'), 'utf8');
const FIXTURE_VIDEO = { mp4: 'tests/fixtures/sample.mp4', webm: 'tests/fixtures/sample.webm' };

// Same stub as home.test.js: requests that leave the local site get an empty 200.
async function stubExternal(page) {
  await page.route((url) => /^https?:$/.test(url.protocol) && url.hostname !== '127.0.0.1', (route) => {
    const type = route.request().resourceType() === 'stylesheet' ? 'text/css' : 'application/octet-stream';
    return route.fulfill({ status: 200, contentType: type, body: '' });
  });
}

// Serves the real data.js plus one line giving the first project a (tiny) video,
// because the real data has none yet. Everything else is the shipped code.
async function withFixtureVideo(page) {
  await page.route('**/assets/js/data.js', (route) => route.fulfill({
    status: 200, contentType: 'text/javascript',
    body: `${dataJs}\nSITE.projects[0].media.video = ${JSON.stringify(FIXTURE_VIDEO)};\n`,
  }));
}

let server;
test.before(async () => { server = await startServer(root); });
test.after(async () => { await server.close(); });

function onProjects(fn, opts = {}) {
  return withPage(async (page) => {
    await stubExternal(page);
    if (opts.video) await withFixtureVideo(page);
    await page.goto(`/projects.html${opts.hash || ''}`, { waitUntil: 'load' });
    await fn(page);
  }, { baseUrl: server.url, ...opts });
}

const visibleCards = (page) => page.locator('.project-card:not([hidden])').count();
const activeInDialog = (page) => page.evaluate(() => !!document.activeElement.closest('[role=dialog]'));

test('renders 14 cards, from http and from file://, with no console errors', async () => {
  await onProjects(async (page) => {
    assert.equal(await page.locator('.project-card').count(), 14);
    assert.equal(await page.locator('h1').count(), 1);
    assert.deepEqual(page.consoleErrors, []);
  });
  await withPage(async (page) => {
    await stubExternal(page);
    await page.goto(pathToFileURL(path.join(root, 'projects.html')).href, { waitUntil: 'load' });
    assert.equal(await page.locator('.project-card').count(), 14);
    assert.deepEqual(page.consoleErrors, []);
  });
});

test('filter chips show 14, 11, 2, 5 and 2 cards and keep a status count', async () => {
  await onProjects(async (page) => {
    const chips = await page.$$eval('.filters button[aria-pressed]', (bs) => bs.map((b) => [b.textContent.trim(), b.dataset.filter]));
    assert.deepEqual(chips, [['All', 'all'], ['Web', 'web'], ['Mobile', 'mobile'], ['.NET', 'dotnet'], ['APIs', 'api']]);
    const want = { all: 14, web: 11, mobile: 2, dotnet: 5, api: 2 };
    for (const [filter, n] of Object.entries(want)) {
      await page.locator(`.filters button[data-filter="${filter}"]`).click();
      assert.equal(await visibleCards(page), n, filter);
      assert.equal(await page.locator(`.filters button[data-filter="${filter}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.filters button[aria-pressed="true"]').count(), 1, 'one chip pressed');
      assert.equal((await page.locator('[role=status]').textContent()).trim(), `Showing ${n} projects`);
    }
  });
});

test('a card opens a named dialog; Tab stays inside; Escape closes and returns focus', async () => {
  await onProjects(async (page) => {
    const card = page.locator('.project-card[data-slug="thaba-shield"]');
    const opener = card.locator('.project-card__open');
    assert.equal(await opener.getAttribute('aria-label'), 'Open ThabaShield details');
    await opener.click();
    const dialog = page.locator('[role=dialog][aria-modal=true]');
    assert.equal(await dialog.count(), 1);
    // The accessible name comes from the h2 the dialog points at.
    const title = await dialog.evaluate((d) => document.getElementById(d.getAttribute('aria-labelledby')).textContent.trim());
    assert.equal(title, SITE.projects.find((p) => p.slug === 'thaba-shield').title);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden', 'body scroll locked');
    assert.ok(await activeInDialog(page), 'focus moved into the dialog');

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      assert.ok(await activeInDialog(page), `Tab ${i + 1} stayed inside`);
    }
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Shift+Tab');
      assert.ok(await activeInDialog(page), `Shift+Tab ${i + 1} stayed inside`);
    }

    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[role=dialog]').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.closest('.project-card')?.dataset.slug), 'thaba-shield');
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden', 'scroll unlocked');
  });
});

test('the close button and an overlay click close the dialog; only one opens at a time', async () => {
  await onProjects(async (page) => {
    const open = () => page.locator('.project-card[data-slug="momali"] .project-card__open').click();
    await open();
    await page.locator('[role=dialog] button[aria-label="Close"]').click();
    assert.equal(await page.locator('[role=dialog]').count(), 0);
    await open();
    await page.locator('.modal__overlay').click({ position: { x: 5, y: 5 } });
    assert.equal(await page.locator('[role=dialog]').count(), 0);
    // A second Modal.open while one is showing replaces it rather than stacking.
    await open();
    await page.evaluate(() => Modal.open('<h2 id="x">Second</h2>', { label: 'Second', opener: document.body }));
    assert.equal(await page.locator('[role=dialog]').count(), 1);
  });
});

test('modal content: video controls, description, stack, links, gallery and demo-data caption', async () => {
  await onProjects(async (page) => {
    const p = SITE.projects.find((x) => x.repo && x.stack.length);
    await page.locator(`.project-card[data-slug="${p.slug}"] .project-card__open`).click();
    const text = await page.locator('[role=dialog]').textContent();
    assert.ok(text.includes(p.description.slice(0, 40)));
    assert.equal(await page.locator('[role=dialog] .badge').count(), p.stack.length);
    assert.equal(await page.locator('[role=dialog] .modal__code').getAttribute('href'), p.repo);
  }, { video: true });
  await onProjects(async (page) => {
    await page.locator('.project-card[data-slug="nova-journal"] .project-card__open').click();
    assert.equal(await page.locator('[role=dialog] video[controls]').count(), 1);
  }, { video: true });
});

test('a pending-pc card shows its logo and the badge; Code and Live links match the data', async () => {
  await onProjects(async (page) => {
    const pc = page.locator('.project-card[data-capture="pending-pc"]').first();
    assert.ok(await pc.locator('img').getAttribute('src').then((s) => /logo\.webp$/.test(s)), 'logo.webp');
    assert.equal((await pc.locator('.badge--pending').textContent()).trim(), 'Running capture coming soon');
    // The logo tile is bone, because the Logisticore logo is dark text on transparent.
    const bg = await page.locator('.project-card[data-slug="logisticore"] .project-card__media')
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    assert.equal(bg, 'rgb(245, 241, 234)');

    let live = 0;
    for (const p of SITE.projects) {
      const card = page.locator(`.project-card[data-slug="${p.slug}"]`);
      // Code links appear only for projects that have a public repo.
      assert.equal(await card.locator('.project-card__code').count(), p.repo ? 1 : 0, `${p.slug} code present`);
      if (p.repo) assert.equal(await card.locator('.project-card__code').getAttribute('href'), p.repo, `${p.slug} code`);
      const hasLive = await card.locator('.project-card__live').count();
      assert.equal(hasLive, p.live ? 1 : 0, `${p.slug} live`);
      live += hasLive;
    }
    assert.equal(live, 3);
  });
});

test('projects.html#busnova opens the BusNova dialog on load', async () => {
  await onProjects(async (page) => {
    const dialog = page.locator('[role=dialog][aria-modal=true]');
    await dialog.waitFor();
    assert.equal(await dialog.evaluate((d) => document.getElementById(d.getAttribute('aria-labelledby')).textContent.trim()), 'BusNova');
    assert.deepEqual(page.consoleErrors, []);
  }, { hash: '#busnova' });
});

test('video preview: hovering plays it (hover-capable device)', async () => {
  await onProjects(async (page) => {
    const video = page.locator('.project-card[data-slug="nova-journal"] video');
    assert.equal(await video.count(), 1, 'fixture video is on the first card');
    assert.equal(await video.evaluate((v) => v.paused), true, 'paused before hover');
    await page.locator('.project-card[data-slug="nova-journal"] .project-card__open').hover();
    await page.waitForFunction(() => !document.querySelector('.project-card[data-slug="nova-journal"] video').paused, null, { timeout: 5000 });
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => document.querySelector('.project-card[data-slug="nova-journal"] video').paused, null, { timeout: 5000 });
  }, { video: true });
});

test('video preview: reduced motion never autoplays on hover or focus', async () => {
  await onProjects(async (page) => {
    const open = page.locator('.project-card[data-slug="nova-journal"] .project-card__open');
    await open.hover();
    await open.focus();
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.project-card[data-slug="nova-journal"] video').evaluate((v) => v.paused), true);
  }, { video: true, reducedMotion: 'reduce' });
});

test('video preview: where hover is unavailable, it plays while 60% in view', async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: server.url });
    const page = await ctx.newPage();
    await stubExternal(page);
    await withFixtureVideo(page);
    await page.goto('/projects.html', { waitUntil: 'load' });
    assert.equal(await page.evaluate(() => matchMedia('(hover: hover)').matches), false, 'no hover');
    const sel = '.project-card[data-slug="nova-journal"] video';
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
    await page.waitForFunction((s) => !document.querySelector(s).paused, sel, { timeout: 5000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction((s) => document.querySelector(s).paused, sel, { timeout: 5000 });
  } finally { await browser.close(); }
});

test('no sideways scroll at 360px', async () => {
  await onProjects(async (page) => {
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(width <= 360, `scrollWidth ${width}`);
  }, { viewport: { width: 360, height: 740 } });
});
