'use strict';
// The shared page shell: the header and footer every page wears, each page's <head>,
// nav links, no sideways scroll at 360px, a clean console, file:// and the mobile nav.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { startServer } = require('./helpers/server.js');
const { withPage } = require('./helpers/browser.js');

const root = path.join(__dirname, '..');

const PAGES = [
  { file: 'index.html', page: 'home', name: 'Home' },
  { file: 'projects.html', page: 'projects', name: 'Projects' },
  { file: 'journey.html', page: 'journey', name: 'Journey' },
  { file: 'recognition.html', page: 'recognition', name: 'Recognition' },
  { file: 'contact.html', page: 'contact', name: 'Contact' },
];

// The only external stylesheets a page may load (Global Constraints).
const EXTERNAL_CSS = [
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap',
  'https://cdn.jsdelivr.net/npm/devicon@2.17.0/devicon.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
];

// The public contact set, and nothing else, may be linked from the footer.
const PUBLIC_LINKS = [
  'mailto:goso.yonga@gmail.com',
  'https://www.linkedin.com/in/yongama-goso-85aaaa2b0',
  'https://github.com/BigGee6566',
  'https://www.facebook.com/yongama.ow.gee',
  'https://www.instagram.com/big_gee_the_one_and_only/',
];

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
// The <header class="site-header"> or <footer class="site-footer"> block, as written in the file.
const block = (html, tag) => (html.match(new RegExp(`<${tag} class="site-${tag}"[\\s\\S]*?</${tag}>`)) || [])[0];
const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
// Visible text of an HTML fragment, with the few entities we use decoded.
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// Answers every request that leaves the local site with an empty 200, so the browser
// tests don't depend on the CDNs being reachable (the pinned URLs are checked statically).
async function stubExternal(page) {
  await page.route((url) => /^https?:$/.test(url.protocol) && url.hostname !== '127.0.0.1', (route) => {
    const type = route.request().resourceType() === 'stylesheet' ? 'text/css' : 'application/octet-stream';
    return route.fulfill({ status: 200, contentType: type, body: '' });
  });
}

test('header and footer are identical on all five pages, apart from aria-current', () => {
  const strip = (s) => s.replace(/ aria-current="page"/g, '');
  const shells = PAGES.map(({ file }) => {
    const html = read(file);
    const header = block(html, 'header');
    const footer = block(html, 'footer');
    assert.ok(header, `${file}: no <header class="site-header">`);
    assert.ok(footer, `${file}: no <footer class="site-footer">`);
    return { file, header: strip(header), footer: strip(footer) };
  });
  for (const s of shells.slice(1)) {
    assert.strictEqual(s.header, shells[0].header, `${s.file} header differs from index.html`);
    assert.strictEqual(s.footer, shells[0].footer, `${s.file} footer differs from index.html`);
  }
});

test('the header has the nav in order, the CV button, the toggle, and one current link per page', () => {
  for (const { file } of PAGES) {
    const header = block(read(file), 'header');
    const navList = (header.match(/<ul class="nav-links">[\s\S]*?<\/ul>/) || [''])[0];
    assert.deepStrictEqual(hrefs(navList), PAGES.map((p) => p.file), `${file}: nav links`);
    assert.deepStrictEqual(text(navList).trim().split(' '), PAGES.map((p) => p.name), `${file}: nav labels`);

    const current = [...header.matchAll(/<a [^>]*aria-current="page"[^>]*>/g)].map((m) => m[0]);
    assert.strictEqual(current.length, 1, `${file}: exactly one aria-current link`);
    assert.match(current[0], new RegExp(`href="${file.replace('.', '\\.')}"`), `${file}: aria-current on its own link`);

    assert.match(header, /<a [^>]*href="Yongama_Goso_CV\.pdf" download[ >]/, `${file}: Download CV button`);
    assert.match(header, />\s*(<[^>]+>\s*)*Download CV\s*</, `${file}: Download CV label`);

    const toggle = (header.match(/<button [^>]*class="nav-toggle"[^>]*>/) || [])[0];
    assert.ok(toggle, `${file}: button.nav-toggle`);
    assert.match(toggle, /aria-expanded="false"/, `${file}: toggle starts collapsed`);
    const controls = (toggle.match(/aria-controls="([^"]+)"/) || [])[1];
    assert.ok(controls && header.includes(`id="${controls}"`), `${file}: aria-controls names an element in the header`);

    assert.match(header, /<svg [^>]*class="brand-mark"[\s\S]*?>YG</, `${file}: inline SVG "YG" logo mark`);
  }
});

test('the footer carries the blurb, quick links, capabilities, the public contact set and the copyright', () => {
  const footer = block(read('index.html'), 'footer');
  const words = text(footer);
  for (const s of [
    'Full-stack developer and founder of Gonex Innovation Hub, building software and digital-skills programmes from the Eastern Cape.',
    'Full-stack web & mobile development', 'IT support', 'Digital skills facilitation & mentoring', 'Tech entrepreneurship',
    'goso.yonga@gmail.com', 'KuGompo City (East London), Eastern Cape', '© 2026 Yongama Goso',
  ]) assert.ok(words.includes(s), `footer is missing: ${s}`);
  for (const p of PAGES) assert.ok(hrefs(footer).includes(p.file), `footer quick links miss ${p.file}`);

  const outward = [...new Set(hrefs(footer).filter((h) => /^(https?:|mailto:|tel:)/.test(h)))].sort();
  assert.deepStrictEqual(outward, [...PUBLIC_LINKS].sort(), 'footer links exactly the public contact set');
});

test('every page has the agreed <head>, body, landmarks and scripts', () => {
  for (const { file, page, name } of PAGES) {
    const html = read(file);
    assert.match(html, /^<!DOCTYPE html>/i, `${file}: doctype`);
    assert.match(html, /<html lang="en/, `${file}: lang`);
    assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'), `${file}: viewport`);
    assert.ok(html.includes(`<title>Yongama Goso — ${name}</title>`), `${file}: title`);
    assert.match(html, /<meta name="description" content="[^"]{40,}">/, `${file}: meta description`);
    assert.match(html, new RegExp(`<body [^>]*data-page="${page}"`), `${file}: body data-page`);
    assert.ok(html.includes('<a class="skip-link" href="#main">'), `${file}: skip link`);
    assert.match(html, /<main id="main"/, `${file}: main#main`);

    const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepStrictEqual(sheets.filter((h) => /^https?:/.test(h)).sort(), [...EXTERNAL_CSS].sort(), `${file}: external CSS`);
    assert.deepStrictEqual(sheets.filter((h) => !/^https?:/.test(h)),
      ['assets/css/tokens.css', 'assets/css/layout.css', 'assets/css/components.css'], `${file}: local CSS`);

    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
    assert.deepStrictEqual(scripts.map((a) => (a.match(/src="([^"]+)"/) || [])[1]),
      ['assets/js/data.js', 'assets/js/render.js', 'assets/js/modal.js', 'assets/js/app.js'], `${file}: scripts in order`);
    for (const a of scripts) {
      assert.match(a, /\sdefer\b/, `${file}: script ${a} must be deferred`);
      assert.doesNotMatch(a, /type="module"/, `${file}: classic scripts only, so file:// works`);
    }
    assert.doesNotMatch(html, /\ssrc="https?:/, `${file}: no external src`);
  }
});

test('tokens.css holds the exact palette and font tokens, and no CSS names a forbidden font', () => {
  const tokens = read('assets/css/tokens.css');
  for (const [name, value] of [
    ['--ink', '#0E1116'], ['--ink-2', '#161B22'], ['--bone', '#F5F1EA'], ['--bone-2', '#EAE3D6'],
    ['--vermilion', '#FF5A36'], ['--teal', '#14B8A6'], ['--muted-on-bone', '#4A4F57'],
    ['--muted-on-ink', 'rgba(245,241,234,.66)'],
  ]) assert.ok(tokens.includes(`${name}: ${value};`), `tokens.css: ${name}: ${value};`);
  for (const [name, family] of [
    ['--font-display', 'Big Shoulders Display'], ['--font-body', 'Instrument Sans'], ['--font-mono', 'JetBrains Mono'],
  ]) assert.ok(tokens.includes(`${name}: "${family}"`), `tokens.css: ${name} starts with "${family}"`);

  for (const css of ['tokens.css', 'layout.css', 'components.css']) {
    const decls = read(`assets/css/${css}`).match(/(font-family|--font-[a-z-]+)\s*:[^;]+/g) || [];
    for (const d of decls) assert.doesNotMatch(d, /\b(Inter|Roboto|Arial|Space Grotesk)\b/, `${css}: ${d}`);
  }
});

test('the motifs exist: thin 18% contour lines and a triangle bead band', () => {
  const contours = read('assets/img/contours.svg');
  assert.ok((contours.match(/<path\b/g) || []).length >= 8, 'contours.svg has concentric paths');
  assert.match(contours, /stroke-width="1"/);
  assert.match(contours, /stroke-opacity="\.18"/);
  const band = read('assets/img/beadband.svg');
  assert.ok((band.match(/<(path|polygon)\b/g) || []).length >= 3, 'beadband.svg has triangles');
  for (const c of ['#0E1116', '#FF5A36', '#F5F1EA']) assert.ok(band.includes(c), `beadband.svg uses ${c}`);
});

test('the script stubs define their globals and load in Node', () => {
  // data.js was filled in Task 5 (its content is tested in data.test.js); it must still load.
  const site = require('../assets/js/data.js');
  assert.strictEqual(typeof site, 'object');
  assert.ok(Array.isArray(site.projects), 'data.js exports SITE with projects');
  // render.js was filled in Task 6 (tested in render.test.js); it must still load.
  assert.strictEqual(typeof require('../assets/js/render.js').escapeHTML, 'function');
});

test('every local link in the header and footer returns 200', async () => {
  const html = read('index.html');
  const local = [...new Set(hrefs(block(html, 'header') + block(html, 'footer'))
    .filter((h) => !/^(https?:|mailto:|tel:|#)/.test(h)))];
  assert.ok(local.length >= 6, 'header and footer have local links');
  const s = await startServer(root);
  try {
    for (const h of local) assert.strictEqual((await fetch(`${s.url}/${h}`)).status, 200, `${h} should return 200`);
  } finally { await s.close(); }
});

test('no page scrolls sideways at 360x740, and gutters are 16px', async () => {
  const s = await startServer(root);
  try {
    await withPage(async (page) => {
      await stubExternal(page);
      for (const { file } of PAGES) {
        await page.goto(`/${file}`, { waitUntil: 'load' });
        const { scrollWidth, gutter } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          gutter: getComputedStyle(document.querySelector('.site-header .container')).paddingLeft,
        }));
        assert.ok(scrollWidth <= 360, `${file}: scrollWidth ${scrollWidth} > 360`);
        assert.strictEqual(gutter, '16px', `${file}: side gutter`);
      }
    }, { viewport: { width: 360, height: 740 }, baseUrl: s.url });
  } finally { await s.close(); }
});

test('every page loads with zero console errors and the stub globals defined', async () => {
  const s = await startServer(root);
  try {
    await withPage(async (page) => {
      await stubExternal(page);
      for (const { file } of PAGES) {
        page.consoleErrors.length = 0;
        await page.goto(`/${file}`, { waitUntil: 'load' });
        assert.deepStrictEqual(page.consoleErrors, [], `${file}: console errors`);
        assert.ok(await page.evaluate(() => typeof SITE === 'object' && typeof Render === 'object'
          && typeof Modal.open === 'function' && typeof Modal.close === 'function'), `${file}: SITE, Render and Modal`);
      }
    }, { baseUrl: s.url });
  } finally { await s.close(); }
});

test('index.html opened from file:// renders the header with no console errors', async () => {
  await withPage(async (page) => {
    await stubExternal(page);
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'load' });
    assert.ok(await page.locator('.site-header').isVisible(), '.site-header is visible');
    assert.ok(await page.locator('.site-header .nav-links a').first().isVisible(), 'nav links render at desktop width');
    assert.deepStrictEqual(page.consoleErrors, []);
  });
});

test('below 900px the nav toggle opens and closes the links', async () => {
  const s = await startServer(root);
  try {
    await withPage(async (page) => {
      await stubExternal(page);
      for (const file of ['index.html', 'projects.html']) {
        await page.goto(`/${file}`, { waitUntil: 'load' });
        const toggle = page.locator('.site-header .nav-toggle');
        const links = page.locator('.site-header .nav-links a');
        const journey = page.locator('.site-header .nav-links a[href="journey.html"]');
        assert.ok(await toggle.isVisible(), `${file}: toggle visible at 390px`);
        assert.strictEqual(await toggle.getAttribute('aria-expanded'), 'false');
        assert.strictEqual(await journey.isVisible(), false, `${file}: links hidden while collapsed`);

        await toggle.click();
        assert.strictEqual(await toggle.getAttribute('aria-expanded'), 'true', `${file}: click expands`);
        for (let i = 0; i < 5; i++) await links.nth(i).waitFor({ state: 'visible', timeout: 2000 });

        await page.keyboard.press('Escape');
        assert.strictEqual(await toggle.getAttribute('aria-expanded'), 'false', `${file}: Escape collapses`);
        await journey.waitFor({ state: 'hidden', timeout: 2000 });
        assert.ok(await toggle.evaluate((el) => el === document.activeElement), `${file}: focus returns to the toggle`);

        // Following a link closes the menu. Navigation is cancelled so the state can be read.
        await toggle.click();
        await journey.evaluate((a) => a.addEventListener('click', (e) => e.preventDefault()));
        await journey.click();
        assert.strictEqual(await toggle.getAttribute('aria-expanded'), 'false', `${file}: following a link collapses`);
      }
    }, { viewport: { width: 390, height: 844 }, baseUrl: s.url });

    await withPage(async (page) => {
      await stubExternal(page);
      await page.goto('/projects.html', { waitUntil: 'load' });
      assert.strictEqual(await page.locator('.site-header .nav-toggle').isVisible(), false, 'no toggle at 1280px');
      assert.ok(await page.locator('.site-header .nav-links a[href="journey.html"]').isVisible(), 'links inline at 1280px');
    }, { baseUrl: s.url });
  } finally { await s.close(); }
});
