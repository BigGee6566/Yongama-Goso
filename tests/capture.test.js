'use strict';
// The capture tool's pure parts: ffmpeg argument lists and the recipe config shape.
// (Recording itself needs a browser and the network, so it is not run in the suite.)
const test = require('node:test');
const assert = require('node:assert');

const SITE = require('../assets/js/data.js');
const recipes = require('../tools/capture/capture.config.js');
const { ffmpegArgs } = require('../tools/capture/capture.js');

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
