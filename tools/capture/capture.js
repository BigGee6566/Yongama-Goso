'use strict';
/*
 * Capture tool: records a short demo clip and screenshots of a RUNNING app.
 *
 *   node tools/capture/capture.js <slug...> [--url <override>]
 *
 * For each slug it finds the recipe in capture.config.js, drives headless Chromium through
 * the recipe's steps and writes, into media/projects/<slug>/:
 *   poster.webp        the first {shot:true} step
 *   shot-1.webp ...    every {shot:true} step, in order (shot-1 is the same frame as the poster)
 *   demo.mp4 / demo.webm   the walk-through, 1280 px wide, no audio, at most 15 s
 *
 * These outputs are deliberately NOT listed in media/manifest.json: the image optimiser prunes
 * manifest entries it no longer produces, so keep capture media out of it. data.js points at the
 * files directly, and tests/data.test.js only checks that they exist and the clips are small.
 *
 * How it works: the walk-through is played twice.
 *   1. Video pass: viewport 1440x900 (or 390x844), device scale factor 1, Playwright
 *      recordVideo. {shot} steps just pause, so the clip stays smooth.
 *   2. Screenshot pass: a separate context at device scale factor 2 replays the same steps
 *      and takes a real PNG at each {shot}. ffmpeg turns the PNGs into WebP, at most 1600 px wide.
 * ffmpeg then encodes MP4 (H.264) and WebM (VP9). A file over 2,621,440 bytes is re-encoded at
 * crf+4, up to 3 more times.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { spawn, spawnSync } = require('node:child_process');

const MAX_BYTES = 2621440;     // per-clip size limit (tests/data.test.js enforces it)
const MAX_SECONDS = 15;        // per-clip duration limit
const OUT_WIDTH = 1280;        // clip width after scaling
const SHOT_MAX_WIDTH = 1600;   // screenshot width cap
const ROOT = path.resolve(__dirname, '..', '..');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, dsf: 1, shotDsf: 2 },
  mobile: { width: 390, height: 844, dsf: 1, shotDsf: 2 },
};

/**
 * The ffmpeg argument list that turns a Playwright recording into a web clip.
 * `kind` is "mp4" (H.264, faststart) or "webm" (VP9). `crf` is the quality (higher = smaller).
 * `startSec` (optional) skips that many seconds of lead-in (the page load) before encoding.
 */
function ffmpegArgs(input, output, kind, crf, startSec) {
  const head = ['-y'];
  if (startSec > 0) head.push('-ss', String(startSec));
  head.push('-i', input, '-vf', 'scale=' + OUT_WIDTH + ':-2');
  const tail = kind === 'mp4'
    ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-t', String(MAX_SECONDS), '-crf', String(crf)]
    : ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-an', '-t', String(MAX_SECONDS)];
  return head.concat(tail, [output]);
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error'].concat(args), { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + (r.stderr || r.error));
}

/** Encode one clip, re-encoding at crf+4 (up to 3 times) while it is over the size limit. */
function encodeClip(input, output, kind, startSec) {
  let crf = kind === 'mp4' ? 28 : 36;
  for (let attempt = 0; ; attempt++) {
    ffmpeg(ffmpegArgs(input, output, kind, crf, startSec));
    if (fs.statSync(output).size <= MAX_BYTES) return;
    if (attempt === 3) throw new Error(output + ' is still over ' + MAX_BYTES + ' bytes at crf ' + crf);
    crf += 4;
  }
}

/** PNG to WebP (quality 78), never wider than 1600 px. */
function toWebp(png, out) {
  ffmpeg(['-y', '-i', png, '-vf', "scale='min(" + SHOT_MAX_WIDTH + ",iw)':-2", '-c:v', 'libwebp', '-q:v', '78', out]);
}

/** Poll a URL until it answers (used for a recipe's local `start` server). */
function waitReady(url, timeoutMs) {
  const lib = url.startsWith('https') ? https : http;
  const until = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = lib.get(url, (res) => { res.resume(); resolve(); });
      req.on('error', () => (Date.now() > until ? reject(new Error('not ready: ' + url)) : setTimeout(tick, 500)));
    };
    tick();
  });
}

/** Run one step on a page. mode "video" pauses on shots; mode "shot" takes them. */
async function playStep(page, step, base, mode, shots) {
  if (step.goto !== undefined) {
    const target = /^https?:/.test(step.goto) ? step.goto : new URL(step.goto, base).href;
    await page.goto(target, { waitUntil: 'networkidle' });
  } else if (step.click !== undefined) {
    await page.click(step.click);
  } else if (step.fill) {
    // <select> elements are chosen by value; everything else is typed.
    const isSelect = await page.$eval(step.fill[0], (el) => el.tagName === 'SELECT');
    if (isSelect) await page.selectOption(step.fill[0], step.fill[1]);
    else await page.fill(step.fill[0], step.fill[1]);
  } else if (step.scroll !== undefined) {
    // Smooth scroll so the clip shows the movement.
    await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), step.scroll);
    await page.waitForTimeout(900);
  } else if (step.wait !== undefined) {
    await page.waitForTimeout(mode === 'shot' ? Math.min(step.wait, 800) : step.wait);
  } else if (step.shot) {
    if (mode === 'shot') {
      await page.waitForTimeout(500); // let animations settle
      const file = path.join(shots.dir, 'shot-' + (shots.list.length + 1) + '.png');
      await page.screenshot({ path: file });
      shots.list.push(file);
    } else {
      await page.waitForTimeout(700); // hold the frame in the clip
    }
  }
}

/**
 * Record one recipe into outDir. Returns the written file paths.
 * opts.url overrides recipe.url (handy for pointing at a local copy).
 */
async function runRecipe(recipe, outDir, opts) {
  const { chromium } = require('playwright');
  const vp = VIEWPORTS[recipe.viewport];
  if (!vp) throw new Error('unknown viewport ' + recipe.viewport);
  fs.mkdirSync(outDir, { recursive: true });
  const work = path.join(__dirname, '.work', recipe.slug);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  // Where the app lives: an override, the recipe's live URL, or a locally started server.
  let server = null;
  let base = (opts && opts.url) || recipe.url;
  if (!base && recipe.start) {
    const s = recipe.start;
    server = spawn(s.cmd, { cwd: path.resolve(ROOT, s.cwd), shell: true, env: Object.assign({}, process.env, s.env), stdio: 'ignore' });
    await waitReady(s.readyUrl, 60000);
    base = s.readyUrl;
  }

  const browser = await chromium.launch();
  try {
    // Pass 1: video. The clip starts when the page is created, so remember when the first
    // page load finished and skip the blank lead-in.
    const vctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
      recordVideo: { dir: work, size: { width: vp.width, height: vp.height } },
    });
    const vpage = await vctx.newPage();
    const t0 = Date.now();
    let lead = 0;
    for (const step of recipe.steps) {
      await playStep(vpage, step, base, 'video', null);
      if (step.goto !== undefined && !lead) lead = Math.max(0, (Date.now() - t0) / 1000 - 0.3);
    }
    const rawVideo = await vpage.video().path();
    await vctx.close(); // flushes the recording to disk

    // Pass 2: screenshots at 2x.
    const sctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.shotDsf,
    });
    const spage = await sctx.newPage();
    const shots = { dir: work, list: [] };
    for (const step of recipe.steps) await playStep(spage, step, base, 'shot', shots);
    await sctx.close();

    // Encode everything.
    const result = { poster: path.join(outDir, 'poster.webp'), shots: [], mp4: path.join(outDir, 'demo.mp4'), webm: path.join(outDir, 'demo.webm') };
    shots.list.forEach((png, i) => {
      const out = path.join(outDir, 'shot-' + (i + 1) + '.webp');
      toWebp(png, out);
      result.shots.push(out);
    });
    fs.copyFileSync(result.shots[0], result.poster);
    encodeClip(rawVideo, result.mp4, 'mp4', lead);
    encodeClip(rawVideo, result.webm, 'webm', lead);
    return result;
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}

async function main(argv) {
  const recipes = require('./capture.config.js');
  const slugs = [];
  let override;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') override = argv[++i];
    else slugs.push(argv[i]);
  }
  if (!slugs.length) { console.error('usage: node tools/capture/capture.js <slug...> [--url <override>]'); process.exit(2); }
  for (const slug of slugs) {
    const recipe = recipes.find((r) => r.slug === slug);
    if (!recipe) { console.error('no recipe for ' + slug); process.exit(2); }
    const res = await runRecipe(recipe, path.join(ROOT, 'media', 'projects', slug), { url: override });
    console.log(slug + ': ' + [res.poster].concat(res.shots, [res.mp4, res.webm]).map((f) => path.relative(ROOT, f) + ' (' + fs.statSync(f).size + ' B)').join(', '));
  }
}

module.exports = { ffmpegArgs, runRecipe };
if (require.main === module) main(process.argv.slice(2)).catch((e) => { console.error(e); process.exit(1); });
