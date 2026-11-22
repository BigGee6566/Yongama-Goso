'use strict';
/*
 * Capture recipes: one per project that can be recorded.
 *
 * Recipe = { slug, url?, start?, viewport, steps }
 *   - slug      matches SITE.projects[i].slug in assets/js/data.js
 *   - url       a live site to record, OR
 *   - start     { cwd, cmd, readyUrl, env? } to launch a local server first (the tool then
 *               records readyUrl's origin). Exactly one of url / start per recipe.
 *   - viewport  "desktop" (1440x900) or "mobile" (390x844, device scale factor 2)
 *   - steps     the walk-through, played in order:
 *       { goto: path-or-url }  { click: selector }  { fill: [selector, text] }
 *       { scroll: pixels }     { wait: ms }         { shot: true }
 *     Selectors are Playwright selectors, so `text=Some label` works.
 *     { shot: true } saves a screenshot. The FIRST one also becomes the poster.
 *
 * Pace: roughly 1-2 s per step, and the whole walk-through must fit in 15 s because the
 * encoder cuts every clip at 15 s. Never type personal data. If a recipe fills a field, use
 * generic demo text and set demoData: true on the project in data.js.
 *
 * To record a new project: add a recipe here, run
 *   node tools/capture/capture.js <slug>
 * then set capture/media in data.js for that project.
 */
module.exports = [
  {
    // NOVA Journal: home, filter by topic, open an article, switch the theme.
    // No text is typed, so demoData stays false.
    slug: 'nova-journal',
    url: 'https://simple-blog-website-mu.vercel.app',
    viewport: 'desktop',
    steps: [
      { goto: '/index.html' },
      { wait: 1000 },
      { goto: '/blog.html' },
      { wait: 600 },
      { scroll: 260 },
      { wait: 700 },
      { shot: true },          // poster: the article grid
      { scroll: -260 },
      { click: 'button.chip:has-text("Software Development")' },
      { wait: 1200 },
      { shot: true },
      { click: 'button.chip:has-text("All")' },
      { wait: 900 },
      { click: '.read-link >> nth=0' },
      { wait: 1500 },
      { shot: true },
      { click: 'button.theme-toggle' },
      { wait: 1200 },
      { shot: true },
    ],
  },
  {
    // Open Data Dashboard: switch country, let the charts redraw.
    slug: 'open-data-dashboard',
    url: 'https://biggee6566.github.io/open-data-api-dashboard/',
    viewport: 'desktop',
    steps: [
      { goto: './' }, // relative: the dashboard lives under /open-data-api-dashboard/
      { wait: 2500 },
      { shot: true },
      { click: '#country' },
      { wait: 400 },
      { fill: ['#country', 'NGA'] },
      { wait: 3000 },
      { shot: true },
      { fill: ['#country', 'KEN'] },
      { wait: 3000 },
      { shot: true },
      { scroll: 420 },
      { wait: 1500 },
      { shot: true },
    ],
  },
  {
    // ThabaShield: the public site (home, solutions, about). The Dashboard sits behind a
    // sign-in, so it is not recorded. Nothing is typed.
    slug: 'thaba-shield',
    url: 'https://thaba-shield.vercel.app',
    viewport: 'desktop',
    steps: [
      { goto: '/' },
      { wait: 2200 },
      { shot: true },
      { click: 'text=Solutions >> nth=0' },
      { wait: 2200 },
      { shot: true },
      { click: 'text=About >> nth=0' },
      { wait: 2000 },
      { shot: true },
      { click: 'text=Home >> nth=0' },
      { wait: 1500 },
    ],
  },
];
