'use strict';
// The Home page: section order, the hero, counters, featured work, the CTA band,
// old #hash links from the single-page site, reduced motion, and the page weight.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer } = require('./helpers/server.js');
const { withPage, stubExternal } = require('./helpers/browser.js');
const SITE = require('../assets/js/data.js');
const Render = require('../assets/js/render.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const SECTIONS = ['hero', 'counters', 'about', 'what-i-do', 'featured', 'recognition-highlights', 'cta', 'approach'];
const FEATURED = ['nova-journal', 'open-data-dashboard', 'thaba-shield', 'fintech-api'];
const CTA_COPY = "I'm open to software development opportunities, and Gonex Innovation Hub welcomes partners, funders and schools.";
const LINKEDIN = 'https://www.linkedin.com/in/yongama-goso-85aaaa2b0';
const BUDGET = 2621440; // 2.5 MiB: Home's weight before any interaction (Global Constraints)

// Old single-page links (Review Focus 1) and where each must land now.
const LEGACY = [
  ['projects', '/projects.html'],
  ['experience', '/journey.html#experience'],
  ['skills', '/journey.html#skills'],
  ['certificates', '/recognition.html#certificates'],
  ['contact', '/contact.html'],
  ['services', '/index.html#what-i-do'],
  ['about', '/index.html#about'],
];

const squash = (s) => String(s).replace(/\s+/g, ' ').trim();

let server;
test.before(async () => { server = await startServer(root); });
test.after(async () => { await server.close(); });

// Opens Home in a fresh browser (CDNs stubbed) and runs fn(page).
function onHome(fn, opts = {}) {
  return withPage(async (page) => {
    await stubExternal(page);
    await page.goto(`/index.html${opts.hash || ''}`, { waitUntil: 'load' });
    await fn(page);
  }, { baseUrl: server.url, ...opts });
}

test('static HTML: the fixed copy, the noscript fallback and the hero image attributes', () => {
  const noscript = (html.match(/<noscript>([\s\S]*?)<\/noscript>/) || [])[1];
  assert.ok(noscript, 'a <noscript> block inside main');
  assert.ok(html.indexOf('<noscript>') > html.indexOf('<main id="main"'), '<noscript> sits inside main');
  assert.ok(html.indexOf('<noscript>') < html.indexOf('</main>'), '<noscript> sits inside main');
  assert.equal(squash(noscript.replace(/<[^>]+>/g, '')),
    'This page needs JavaScript for some sections. You can still browse my work on GitHub or download my CV.');
  assert.match(noscript, /<a [^>]*href="https:\/\/github\.com\/BigGee6566"[^>]*>GitHub<\/a>/);
  assert.match(noscript, /<a [^>]*href="Yongama_Goso_CV\.pdf"[^>]*>download my CV<\/a>/);

  assert.ok(html.includes('<h1 class="hero__name"'), 'h1.hero__name');
  assert.match(html, /<h1 class="hero__name"[^>]*><span>Yongama<\/span> <span>Goso<\/span><\/h1>/);

  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const hero = imgs.filter((t) => t.includes('fetchpriority="high"'));
  assert.equal(hero.length, 1, 'exactly one image has fetchpriority="high"');
  assert.match(hero[0], /src="media\/profile\/portrait-1200\.webp"/);
  assert.match(hero[0], /srcset="[^"]*media\/profile\/portrait-640\.webp 640w[^"]*media\/profile\/portrait-1200\.webp 1200w"/);
  assert.match(hero[0], /\ssizes="[^"]+"/);
  for (const t of imgs.filter((x) => x !== hero[0])) assert.match(t, /loading="lazy"/, `lazy: ${t}`);
  assert.match(html, /<img [^>]*src="media\/events\/startup-grind\/07-1400\.webp"/, 'CTA photo is the startup-grind hero image');
});

test('sections in order, the h1, the hero buttons and the CTA band', async () => {
  await onHome(async (page) => {
    const ids = await page.$$eval('main > section', (s) => s.map((x) => x.id));
    assert.deepEqual(ids, SECTIONS);

    assert.equal(await page.locator('h1').count(), 1, 'one h1');
    assert.equal(squash(await page.locator('h1').textContent()), 'Yongama Goso');

    const buttons = await page.$$eval('#hero .hero__actions a', (as) => as.map((a) => ({
      text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'),
      primary: a.classList.contains('btn--primary'), target: a.getAttribute('target'), rel: a.getAttribute('rel'),
    })));
    assert.deepEqual(buttons.map((b) => b.text), ['Work with me', 'View projects', 'LinkedIn']);
    assert.deepEqual(buttons.map((b) => b.href), ['contact.html', 'projects.html', LINKEDIN]);
    assert.deepEqual(buttons.map((b) => b.primary), [true, false, false], 'only "Work with me" is primary');
    assert.equal(buttons[2].target, '_blank');
    assert.match(buttons[2].rel || '', /\bnoopener\b/);

    const cta = page.locator('#cta');
    assert.ok(squash(await cta.textContent()).includes(CTA_COPY), 'CTA copy, exactly');
    assert.equal(await cta.locator('a[href="recognition.html#gonex"]', { hasText: 'Partner with Gonex' }).count(), 1);
    assert.equal(await cta.locator('a[href="contact.html"]', { hasText: 'Work with me' }).count(), 1);

    assert.deepEqual(page.consoleErrors, [], 'console errors');
  });
});

test('content is filled from SITE: about, capabilities, services, recognition and approach', async () => {
  await onHome(async (page) => {
    const about = squash(await page.locator('#about').textContent());
    for (const p of SITE.about) assert.ok(about.includes(squash(p)), `#about has: ${p.slice(0, 40)}...`);

    const caps = page.locator('#what-i-do .capability');
    assert.equal(await caps.count(), SITE.capabilities.length);
    for (let i = 0; i < SITE.capabilities.length; i++) {
      const c = SITE.capabilities[i];
      assert.ok(squash(await caps.nth(i).textContent()).includes(squash(c.title)), `capability ${i} title`);
      assert.equal(await caps.nth(i).locator(`i[class="${c.icon}"][aria-hidden="true"]`).count(), 1, `capability ${i} icon`);
    }
    const services = await page.$$eval('#what-i-do .service', (s) => s.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    assert.equal(services.length, SITE.services.length);
    SITE.services.forEach((s, i) => assert.ok(services[i].includes(s.title) && services[i].includes(s.text), `service ${s.title}`));

    const rec = page.locator('#recognition-highlights');
    assert.equal(await rec.locator('ul.recognition > li').count(), SITE.recognition.length);
    assert.equal(await rec.locator('a[href="recognition.html"]', { hasText: 'More recognition' }).count(), 1);

    const approach = squash(await page.locator('#approach').textContent());
    for (const a of SITE.approach) assert.ok(approach.includes(a), `#approach has: ${a}`);
  });
});

test('counters read 9 5 8 6 once scrolled into view', async () => {
  const expected = Render.computeCounters(SITE).map((c) => String(c.value)).join(' ');
  assert.equal(expected, '9 5 8 6');
  await onHome(async (page) => {
    await page.locator('#counters').scrollIntoViewIfNeeded();
    await page.waitForFunction((want) => [...document.querySelectorAll('#counters .counter__value')]
      .map((e) => e.textContent.trim()).join(' ') === want, expected, { timeout: 5000 });
    const labels = await page.$$eval('#counters .counter__label', (l) => l.map((x) => x.textContent.trim()));
    assert.deepEqual(labels, Render.computeCounters(SITE).map((c) => c.label));
  });
});

test('#featured shows the four featured cards; a card opens the project dialog in place', async () => {
  await onHome(async (page) => {
    const slugs = await page.$$eval('#featured .project-card', (c) => c.map((x) => x.dataset.slug));
    assert.deepEqual(slugs, FEATURED);
    assert.equal(await page.locator('#featured a[href="projects.html"]', { hasText: 'See all projects' }).count(), 1);

    const opener = page.locator('#featured .project-card[data-slug="thaba-shield"] .project-card__open');
    assert.equal(await opener.getAttribute('aria-haspopup'), 'dialog');
    await opener.click();
    const dialog = page.locator('[role=dialog][aria-modal=true]');
    assert.equal(await dialog.count(), 1);
    assert.ok(squash(await dialog.textContent()).includes('ThabaShield'));
    assert.ok(page.url().endsWith('/index.html'), 'stayed on Home');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[role=dialog]').count(), 0);
  });
});

test('old #hash links from the single-page site land on their new URLs', async () => {
  await withPage(async (page) => {
    await stubExternal(page);
    for (const [hash, want] of LEGACY) {
      await page.goto(`/index.html#${hash}`, { waitUntil: 'commit' });
      await page.waitForURL((u) => u.pathname + u.hash === want, { timeout: 5000 });
      await page.waitForLoadState('load');
      assert.equal(new URL(page.url()).pathname + new URL(page.url()).hash, want, `#${hash}`);
    }
    // #services lands on What I do, scrolled into view after the cards render.
    await page.goto('/index.html#services', { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const r = document.getElementById('what-i-do').getBoundingClientRect();
      return r.top >= -2 && r.top < window.innerHeight / 2;
    }, null, { timeout: 5000 });
  }, { baseUrl: server.url });
});

test('the ticker cycles through SITE.roles without announcing every tick, and can be paused', async () => {
  await onHome(async (page) => {
    const word = page.locator('#hero [data-ticker]');
    assert.equal(squash(await word.textContent()), SITE.roles[0]);
    // The changing word is hidden from screen readers; the full list is read once instead.
    assert.equal(await word.evaluate((el) => !!el.closest('[aria-hidden="true"]')), true, 'cycling text is aria-hidden');
    const list = squash(await page.locator('#hero .hero__roles-all').textContent());
    for (const r of SITE.roles) assert.ok(list.includes(r), `screen-reader role list has ${r}`);

    await page.waitForFunction((first) => document.querySelector('#hero [data-ticker]').textContent.trim() !== first,
      SITE.roles[0], { timeout: 6000 });
    assert.ok(SITE.roles.includes(squash(await word.textContent())), 'shows a role from SITE.roles');

    const pause = page.locator('#hero .ticker-pause');
    assert.ok(await pause.isVisible(), 'pause control is visible while the ticker runs');
    await pause.click();
    assert.equal(await pause.getAttribute('aria-pressed'), 'true');
    await page.waitForTimeout(500); // let any in-flight swap finish
    const held = await word.textContent();
    await page.waitForTimeout(3500);
    assert.equal(await word.textContent(), held, 'paused ticker stays put');
  });
});

test('reduced motion: the ticker holds roles[0], counters and reveals are final, no video plays', async () => {
  await onHome(async (page) => {
    await page.waitForTimeout(4000);
    assert.equal(squash(await page.locator('#hero [data-ticker]').textContent()), SITE.roles[0]);
    assert.equal(await page.locator('#hero .ticker-pause').isVisible(), false, 'no pause control when nothing moves');
    assert.equal(await page.$$eval('video', (vs) => vs.every((v) => v.paused)), true, 'every video is paused');
    const values = await page.$$eval('#counters .counter__value', (v) => v.map((x) => x.textContent.trim()).join(' '));
    assert.equal(values, '9 5 8 6', 'counters show final values without scrolling');
    const hidden = await page.$$eval('[data-reveal]', (els) => els.filter((e) => getComputedStyle(e).opacity !== '1').length);
    assert.equal(hidden, 0, 'every reveal element is visible');
  }, { reducedMotion: 'reduce' });
});

test('every image has alt text; no sideways scroll at 360px', async () => {
  await onHome(async (page) => {
    const alts = await page.$$eval('img', (is) => is.map((i) => (i.getAttribute('alt') || '').trim()));
    // A captured project card shows a <video poster> instead of an <img>, so count both.
    const videoLabels = await page.$$eval('video[poster]', (vs) => vs.map((v) => (v.getAttribute('aria-label') || '').trim()));
    assert.ok(alts.length + videoLabels.length >= 6, 'portrait, CTA photo and the featured posters');
    assert.ok(alts.every((a) => a.length > 0), 'every <img> has alt text');
    assert.ok(videoLabels.every((a) => a.length > 0), 'every poster <video> has an aria-label');
    for (const y of [0, 900, 1800, 2700, 3600, 4500, 5400]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(100);
    }
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(width <= 360, `scrollWidth ${width} > 360`);
    assert.deepEqual(page.consoleErrors, [], 'console errors');
  }, { viewport: { width: 360, height: 740 } });
});

test('Home transfers at most 2,621,440 local bytes before interaction', async () => {
  await withPage(async (page) => {
    await stubExternal(page);
    // Collect each body's promise as the response arrives, then await them all, so a body
    // still being read when the page settles is counted rather than missed.
    const bodies = [];
    page.on('response', (res) => {
      if (new URL(res.url()).hostname !== '127.0.0.1') return; // CDN requests are stubbed
      bodies.push(res.body().then((b) => b.length, () => 0)); // redirects have no body
    });
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const total = (await Promise.all(bodies)).reduce((a, b) => a + b, 0);
    assert.ok(total > 0, 'responses were counted');
    assert.ok(total <= BUDGET, `Home transferred ${total} bytes (budget ${BUDGET})`);
  }, { baseUrl: server.url, viewport: { width: 1440, height: 900 } });
});
