'use strict';
// The Contact page: public details, the form and its Formspree handling.
// Formspree is always stubbed, so nothing is ever really sent.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { startServer } = require('./helpers/server.js');
const { withPage, stubExternal } = require('./helpers/browser.js');

const root = path.join(__dirname, '..');
const ENDPOINT = 'https://formspree.io/f/mnjbagrl';

let server;
test.before(async () => { server = await startServer(root); });
test.after(async () => { await server.close(); });

function onPage(formspree, fn, opts = {}) {
  return withPage(async (page) => {
    await stubExternal(page, formspree);
    await page.goto('/contact.html', { waitUntil: 'load' });
    await fn(page);
  }, { baseUrl: server.url, ...opts });
}

async function fillAndSubmit(page) {
  await page.fill('#contact-name', 'Test Visitor');
  await page.fill('#contact-email', 'visitor@example.com');
  await page.fill('#contact-phone', '0000');
  await page.fill('#contact-subject', 'Hello');
  await page.fill('#contact-message', 'A test message.');
  await page.click('#contact-form button[type=submit]');
}

const ok = (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });

test('form has the right action and fields, each with a visible label', async () => {
  await onPage(ok, async (page) => {
    const form = page.locator('form#contact-form');
    assert.equal(await form.getAttribute('action'), ENDPOINT);
    assert.equal((await form.getAttribute('method')).toUpperCase(), 'POST');
    const fields = await form.evaluate((f) => [...f.querySelectorAll('input,textarea')].map((e) => ({
      name: e.name, type: e.type, required: e.required, id: e.id,
      label: (document.querySelector('label[for="' + e.id + '"]') || {}).textContent || '',
    })));
    assert.deepEqual(fields.map((f) => f.name), ['name', 'email', 'phone', 'subject', 'message']);
    assert.deepEqual(fields.map((f) => f.required), [true, true, false, false, true]);
    assert.equal(fields[1].type, 'email');
    assert.equal(fields[4].type, 'textarea');
    for (const f of fields) assert.ok(f.id && f.label.trim(), 'label for ' + f.name);
    assert.equal(await page.locator('p#form-status[role=status][aria-live=polite]').count(), 1);
    assert.equal(await page.locator('#contact-form button[type=submit]').count(), 1);
    assert.equal(await page.locator('h1').count(), 1);
    assert.match(await page.locator('.page-intro').textContent(),
      /^For software development opportunities, collaborations, or partnering with Gonex Innovation Hub\.$/);
    assert.deepEqual(page.consoleErrors, []);
  });
});

test('a 200 shows the thanks message, sends JSON-accepting POST and empties the fields', async () => {
  let seen;
  await onPage((route) => { seen = route.request(); return ok(route); }, async (page) => {
    await fillAndSubmit(page);
    await page.waitForFunction(() => document.getElementById('form-status').textContent.includes('Thanks'));
    assert.equal(await page.locator('#form-status').textContent(), 'Thanks! Your message has been sent.');
    for (const id of ['name', 'email', 'phone', 'subject', 'message']) {
      assert.equal(await page.inputValue('#contact-' + id), '');
    }
    assert.equal(seen.method(), 'POST');
    assert.equal(seen.headers().accept, 'application/json');
  });
});

test('a 500 shows the problem message and keeps what was typed', async () => {
  await onPage((route) => route.fulfill({ status: 500, body: 'no' }), async (page) => {
    await fillAndSubmit(page);
    await page.waitForFunction(() => document.getElementById('form-status').textContent.includes('Sorry'));
    assert.equal(await page.locator('#form-status').textContent(), 'Sorry, there was a problem sending your message.');
    assert.equal(await page.inputValue('#contact-name'), 'Test Visitor');
  });
});

test('a network failure shows the network message', async () => {
  await onPage((route) => route.abort(), async (page) => {
    await fillAndSubmit(page);
    await page.waitForFunction(() => document.getElementById('form-status').textContent.includes('Network error'));
    assert.equal(await page.locator('#form-status').textContent(), 'Network error. Please try again in a moment.');
  });
});

test('the button is disabled while a slow request is in flight, then re-enabled', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  await onPage(async (route) => { await gate; return ok(route); }, async (page) => {
    const button = page.locator('#contact-form button[type=submit]');
    await fillAndSubmit(page);
    await page.waitForFunction(() => document.querySelector('#contact-form button[type=submit]').disabled);
    assert.equal(await page.locator('#form-status').textContent(), 'Sending your message...');
    release();
    await page.waitForFunction(() => document.getElementById('form-status').textContent.includes('Thanks'));
    assert.equal(await button.isDisabled(), false);
  });
});

test('shows the public contact details and nothing else', async () => {
  await onPage(ok, async (page) => {
    const hrefs = await page.$$eval('main a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const h of ['mailto:goso.yonga@gmail.com',
      'https://www.linkedin.com/in/yongama-goso-85aaaa2b0',
      'https://github.com/BigGee6566',
      'https://www.facebook.com/yongama.ow.gee',
      'https://www.instagram.com/big_gee_the_one_and_only/']) {
      assert.ok(hrefs.includes(h), h);
    }
    assert.ok((await page.locator('main').textContent()).includes('KuGompo City (East London), Eastern Cape'));
    for (const name of ['LinkedIn', 'GitHub', 'Facebook', 'Instagram']) {
      const a = page.locator('main a', { hasText: name });
      assert.equal(await a.getAttribute('target'), '_blank');
      assert.match(await a.getAttribute('rel'), /noopener/);
    }
    assert.equal(await page.locator('main a[href^="tel:"]').count(), 0);
  });
});

test('the footer email can only break at the @, with no sideways scroll at 360 and 390', async () => {
  for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    await onPage(ok, async (page) => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      const lines = await page.evaluate(() => {
        const a = document.querySelector('.footer-email');
        const left = document.createRange();
        const t = [...a.childNodes].find((n) => n.nodeType === 3);
        left.setStart(t, 0); left.setEnd(t, t.length);
        // One client rect per line box of the first text node (the part before the @).
        return { before: left.getClientRects().length, wbr: a.querySelectorAll('wbr').length,
          cs: getComputedStyle(a).overflowWrap + '|' + getComputedStyle(a).wordBreak };
      });
      assert.equal(lines.wbr, 1);
      assert.equal(lines.before, 1, 'local part stays on one line');
      assert.ok(!/anywhere|break-word/.test(lines.cs) && !/break-all/.test(lines.cs), lines.cs);
    }, { viewport });
  }
});
