'use strict';
// The capture tool's pure parts: ffmpeg argument lists and the recipe config shape.
// (Recording itself needs a browser and the network, so it is not run in the suite.)
const test = require('node:test');
const assert = require('node:assert');

const SITE = require('../assets/js/data.js');
const recipes = require('../tools/capture/capture.config.js');
const { ffmpegArgs, resolveEnv, shouldRun } = require('../tools/capture/capture.js');

// True when `wanted` appears in `args` in this relative order.
function inOrder(args, wanted) {
  let at = -1;
  for (const w of wanted) {
    const i = args.indexOf(w, at + 1);
    if (i === -1) return false;
    at = i;
  }
  return true;
}

test('ffmpegArgs mp4: H.264, yuv420p, faststart, no audio, 15 s cap, crf', () => {
  const a = ffmpegArgs('a.webm', 'b.mp4', 'mp4', 28);
  assert.ok(inOrder(a, ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-t', '15', '-crf', '28']), a.join(' '));
  assert.strictEqual(a[a.length - 1], 'b.mp4');
  assert.ok(a.includes("scale='min(1280,iw)':-2"), 'never upscale: ' + a.join(' '));
});

test('ffmpegArgs webm: VP9, constant quality, no audio', () => {
  const a = ffmpegArgs('a.webm', 'b.webm', 'webm', 34);
  assert.ok(inOrder(a, ['-c:v', 'libvpx-vp9', '-b:v', '0', '-an']), a.join(' '));
  assert.ok(inOrder(a, ['-crf', '34']));
  assert.ok(inOrder(a, ['-t', '15']));
});

test('every recipe has a unique project slug, one source, and a shot step', () => {
  const slugs = new Set();
  for (const r of recipes) {
    assert.ok(!slugs.has(r.slug), 'duplicate slug ' + r.slug);
    slugs.add(r.slug);
    assert.ok(SITE.projects.some((p) => p.slug === r.slug), 'unknown project ' + r.slug);
    assert.strictEqual(Boolean(r.url) + Boolean(r.start), 1, r.slug + ' needs exactly one of url/start');
    assert.ok(['desktop', 'mobile'].includes(r.viewport));
    assert.ok(r.steps.some((s) => s.shot === true), r.slug + ' needs a {shot:true} step');
  }
});

test('resolveEnv: "$env:NAME" is read from the environment at run time; other text is untouched', () => {
  assert.strictEqual(resolveEnv('$env:DEMO_USER', { DEMO_USER: 'someone' }), 'someone');
  assert.strictEqual(resolveEnv('plain text', {}), 'plain text');
  assert.strictEqual(resolveEnv('a $env:DEMO_USER b', { DEMO_USER: 'x' }), 'a $env:DEMO_USER b', 'only a whole-string reference is resolved');
  assert.throws(() => resolveEnv('$env:MISSING_ONE', {}), /MISSING_ONE/);
  assert.throws(() => resolveEnv('$env:EMPTY_ONE', { EMPTY_ONE: '' }), /EMPTY_ONE/);
});

test('shouldRun: a step with requires:"NAME" runs only when that variable is set and non-empty', () => {
  assert.strictEqual(shouldRun({ click: 'a' }, {}), true);
  assert.strictEqual(shouldRun({ click: 'a', requires: 'DEMO_USER' }, {}), false);
  assert.strictEqual(shouldRun({ click: 'a', requires: 'DEMO_USER' }, { DEMO_USER: '' }), false);
  assert.strictEqual(shouldRun({ click: 'a', requires: 'DEMO_USER' }, { DEMO_USER: 'u' }), true);
});

const WINDOWS_SLUGS = ['tutorconnect', 'studylink', 'smartshelf', 'busnova', 'logisticore'];

test('the five Windows recipes exist, point at a placeholder URL and never hold a credential', () => {
  for (const slug of WINDOWS_SLUGS) {
    const r = recipes.find((x) => x.slug === slug);
    assert.ok(r, 'missing recipe ' + slug);
    assert.ok(/^http:\/\/localhost:0\//.test(r.url), slug + ' url is a placeholder replaced by --url');
    assert.ok(r.steps.filter((s) => s.shot === true).length >= 3, slug + ' walks at least three screens');
    for (const s of r.steps) {
      if (!s.fill) continue;
      // Anything typed into a login field must come from the environment.
      if (/pass|ident|user|email|login/i.test(s.fill[0])) {
        assert.ok(/^\$env:[A-Z_]+$/.test(s.fill[1]), slug + ': ' + s.fill[0] + ' must be filled from $env:NAME');
        assert.strictEqual(s.requires, 'DEMO_USER', slug + ': a login fill must be skippable');
      }
    }
  }
});
