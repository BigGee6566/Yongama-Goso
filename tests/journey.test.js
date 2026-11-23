'use strict';
// The Journey page: anchors, timeline, experience and event cards, the gallery
// dialog (focus trap, Escape), skill chips with "Used in", education, languages.
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

function onJourney(fn, opts = {}) {
  return withPage(async (page) => {
    await stubExternal(page);
    await page.goto('/journey.html', { waitUntil: 'load' });
    await fn(page);
  }, { baseUrl: server.url, ...opts });
}

const activeInDialog = (page) => page.evaluate(() => !!document.activeElement.closest('[role=dialog]'));

test('has the six anchored sections in order, one h1, and no console errors (http and file://)', async () => {
  await onJourney(async (page) => {
    const ids = await page.$$eval('main section[id]', (s) => s.map((e) => e.id));
    assert.deepEqual(ids, ['growth', 'experience', 'events', 'education', 'skills', 'languages']);
    assert.equal(await page.locator('h1').count(), 1);
    assert.ok((await page.locator('.page-intro').textContent()).trim().length > 20);
    assert.deepEqual(page.consoleErrors, []);
  });
  await withPage(async (page) => {
    await stubExternal(page);
    await page.goto(pathToFileURL(path.join(root, 'journey.html')).href, { waitUntil: 'load' });
    assert.equal(await page.locator('.timeline__item').count(), SITE.timeline.length);
    assert.deepEqual(page.consoleErrors, []);
  });
});

test('timeline starts in 2020 and ends with unconfirmed dates marked as pending', async () => {
  await onJourney(async (page) => {
    const items = page.locator('#growth .timeline__item');
    assert.equal(await items.count(), SITE.timeline.length);
    assert.ok((await items.first().textContent()).includes('2020'));
    const last = items.last();
    assert.ok((await last.textContent()).includes('Date to be confirmed'));
    assert.ok((await items.nth(-2).textContent()).includes('Date to be confirmed'));
    assert.ok(await page.locator('#growth .timeline__item--pending').count() >= 2);
  });
});

test('work and venture entries sit under Experience, the 5 events under Events', async () => {
  await onJourney(async (page) => {
    const work = SITE.experiences.filter((e) => e.kind !== 'event').length;
    assert.equal(await page.locator('#experience .exp-card').count(), work);
    assert.equal(await page.locator('#events .exp-card').count(), 5);
    assert.equal(await page.locator('#events .exp-card[data-kind="event"]').count(), 5);
  });
});

test('the inter-university card has no gallery button; others do', async () => {
  await onJourney(async (page) => {
    const inter = page.locator('#events .exp-card[data-id="inter-university-hackathon"]');
    assert.equal(await inter.count(), 1);
    assert.equal(await inter.locator('.exp-card__gallery').count(), 0);
    assert.equal(await page.locator('#events .exp-card__gallery').count(), 4);
  });
});

test('Telkom10X gallery opens in a named dialog with every photo, Tab is trapped, Escape restores focus', async () => {
  await onJourney(async (page) => {
    const tk = SITE.experiences.find((e) => e.id === 'telkom10x-hackathon');
    const opener = page.locator('.exp-card[data-id="telkom10x-hackathon"] .exp-card__gallery');
    await opener.click();
    const dialog = page.locator('[role=dialog][aria-modal=true]');
    assert.equal(await dialog.count(), 1);
    assert.equal(await dialog.locator('.gallery__item').count(), tk.gallery.length);
    const name = await dialog.evaluate((d) => document.getElementById(d.getAttribute('aria-labelledby')).textContent.trim());
    assert.equal(name, tk.title);
    // Full-size photos open in a new tab without a referrer leak.
    assert.equal(await dialog.locator('.gallery__item').first().getAttribute('target'), '_blank');
    assert.match(await dialog.locator('.gallery__item').first().getAttribute('rel'), /noopener/);
    assert.ok(await activeInDialog(page));
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      assert.ok(await activeInDialog(page), `Tab ${i + 1} stayed inside`);
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Shift+Tab');
      assert.ok(await activeInDialog(page), `Shift+Tab ${i + 1} stayed inside`);
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[role=dialog]').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.gallery), 'telkom10x-hackathon');
  });
});

test('"ASP.NET Web Forms" chip lists 5 project titles under "Used in"', async () => {
  await onJourney(async (page) => {
    const chip = page.locator('#skills .skill', { hasText: 'ASP.NET Web Forms' }).first();
    const used = await chip.locator('.skill__used li').allTextContents();
    assert.equal(used.length, 5);
    const want = SITE.projects.filter((p) => p.stack.includes('ASP.NET Web Forms')).map((p) => p.title);
    assert.deepEqual(used.map((s) => s.trim()).sort(), want.sort());
    assert.ok((await chip.textContent()).includes('Used in'));
    // The visible count is aria-hidden; screen readers get it as words in the summary.
    assert.equal((await chip.locator('summary .visually-hidden').textContent()).trim(), ', used in 5 projects');
  });
});

test('every distinct stack item renders; tools render without "Used in"; icons only where a class exists', async () => {
  await onJourney(async (page) => {
    const distinct = new Set();
    SITE.projects.forEach((p) => p.stack.forEach((s) => distinct.add(s)));
    assert.equal(await page.locator('#skills [data-group="built-with"] .skill').count(), distinct.size);
    const tools = page.locator('#skills [data-group="tools"]');
    const text = await tools.textContent();
    assert.ok(text.includes('Visual Studio'));
    assert.ok(text.includes('Microsoft Office'));
    assert.equal(await tools.locator('.skill').count(), SITE.cvTools.length);
    assert.equal(await tools.locator('.skill__used').count(), 0);
    // Every icon is a Devicon class, and chips without one are plain text.
    const icons = await page.$$eval('#skills .skill i', (is) => is.map((i) => i.className));
    assert.ok(icons.length > 10);
    assert.ok(icons.every((c) => /^devicon-[a-z0-9-]+-(plain|original)\b/.test(c)), icons.join('|'));
    assert.ok(await page.locator('#skills .skill:not(:has(i))').count() > 0);
  });
});

test('Education and 6 languages render', async () => {
  await onJourney(async (page) => {
    assert.equal(await page.locator('#education .edu').count(), SITE.education.length);
    assert.ok((await page.locator('#education').textContent()).includes('University of Fort Hare'));
    assert.equal(await page.locator('#languages .language').count(), 6);
    assert.ok((await page.locator('#languages').textContent()).includes('Tswana'));
  });
});

test('under reduced motion nothing is hidden waiting for a reveal', async () => {
  await onJourney(async (page) => {
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('reveal-ready')), false);
    const opacities = await page.$$eval('#growth .timeline__item, #experience .exp-card', (els) => els.map((e) => getComputedStyle(e).opacity));
    assert.ok(opacities.every((o) => o === '1'));
  }, { reducedMotion: 'reduce' });
});

test('the old Home anchors land on real sections', async () => {
  await onJourney(async (page) => {
    for (const id of ['experience', 'skills']) {
      assert.equal(await page.locator(`main #${id}`).count(), 1);
    }
  });
});
