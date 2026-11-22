'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const SITE = require('../assets/js/data.js');
const R = require('../assets/js/render.js');

const fixture = (over) => Object.assign({
  slug: 'fx', title: 'Fixture', tagline: 'Tag', description: 'Desc', context: 'Ctx',
  categories: ['web', 'dotnet'], stack: ['HTML', 'C#'], capture: 'recorded',
  media: { poster: 'media/projects/fx/poster.webp', shots: [], demoData: false }
}, over);

test('escapeHTML', () => {
  assert.equal(R.escapeHTML('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  assert.equal(R.escapeHTML("it's"), 'it&#39;s');
});

test('filterProjects', () => {
  assert.equal(R.filterProjects(SITE.projects, 'dotnet').length, 5);
  assert.equal(R.filterProjects(SITE.projects, 'mobile').length, 2);
  assert.equal(R.filterProjects(SITE.projects, 'api').length, 2);
  assert.equal(R.filterProjects(SITE.projects, 'web').length, 11);
  assert.equal(R.filterProjects(SITE.projects, 'all').length, 14);
});

test('computeCounters', () => {
  const c = R.computeCounters(SITE);
  assert.deepEqual(c.map(x => x.value), [10, 5, 8, 6]);
  assert.deepEqual(c.map(x => x.label), ['Public projects on GitHub', 'Hackathons & pitch events', 'Certifications', 'Languages spoken']);
});

test('skillUsage', () => {
  const m = R.skillUsage(SITE.projects);
  assert.equal(m.get('ASP.NET Web Forms').length, 5);
  assert.ok(m.get('HTML').every(t => typeof t === 'string'));
});

test('project card: pending-pc', () => {
  const p = SITE.projects.find(x => x.capture === 'pending-pc');
  const h = R.projectCardHTML(p);
  assert.ok(h.includes('Running capture coming soon'));
  assert.ok(!h.includes('<video'));
  assert.ok(h.includes('project-card--logo'));
  assert.ok(h.includes('data-capture="pending-pc"'));
  assert.ok(h.includes('data-categories="dotnet web"'));
  assert.ok(h.includes('<img') && h.includes('loading="lazy"'));
});

test('project card: structure, links, badges', () => {
  const h = R.projectCardHTML(fixture({ repo: 'https://github.com/x/y', live: 'https://x.dev' }));
  assert.match(h, /^<article class="project-card" data-slug="fx" data-capture="recorded" data-categories="web dotnet">/);
  assert.ok(h.includes('<button class="project-card__open" aria-haspopup="dialog"'));
  assert.ok(h.includes('<h3'));
  assert.ok(h.includes('<li class="badge">HTML</li>'));
  assert.ok(h.includes('class="project-card__code" href="https://github.com/x/y" target="_blank" rel="noopener"'));
  assert.ok(h.includes('project-card__live'));
  assert.ok(!h.includes('coming soon'));
  const bare = R.projectCardHTML(fixture({ tagline: '', context: '' }));
  assert.ok(!bare.includes('project-card__code') && !bare.includes('project-card__live'));
  assert.ok(!bare.includes('<p class="project-card__tagline"></p>'));
  assert.ok(!/<p[^>]*><\/p>/.test(bare));
});

test('project card: video', () => {
  const p = fixture({ media: { poster: 'p.webp', video: { mp4: 'a.mp4', webm: 'a.webm' }, shots: [], demoData: false } });
  const h = R.projectCardHTML(p);
  assert.ok(h.includes('<video'));
  assert.ok(h.includes('preload="none"'));
  assert.ok(h.includes('muted') && h.includes('loop') && h.includes('playsinline'));
  assert.ok(h.includes('poster="p.webp"'));
  assert.ok(h.includes('<source src="a.mp4" type="video/mp4">'));
  assert.ok(h.includes('<source src="a.webm" type="video/webm">'));
  assert.ok(!h.includes('<img'));
});

test('project modal', () => {
  const p = fixture({
    repo: 'https://github.com/x/y', live: 'https://x.dev',
    media: { poster: 'p.webp', shots: ['media/a-1400.webp', 'media/b-1400.webp'], demoData: true }
  });
  const h = R.projectModalHTML(p);
  assert.ok(h.includes('<h2 id="modal-title-fx">Fixture</h2>'));
  assert.ok(!h.includes('role="dialog"'));
  assert.ok(h.includes('<img') && h.includes('p.webp'));
  assert.ok(h.includes('Desc') && h.includes('Ctx'));
  assert.ok(h.includes('class="badge"'));
  assert.ok(h.includes('href="https://github.com/x/y"') && h.includes('href="https://x.dev"'));
  assert.ok(h.includes('<p class="demo-data-note">'));
  assert.ok(h.includes('class="gallery"'));
  const noDemo = R.projectModalHTML(fixture());
  assert.ok(!noDemo.includes('demo-data-note') && !noDemo.includes('class="gallery"'));
  const v = R.projectModalHTML(fixture({ media: { poster: 'p.webp', video: { mp4: 'a.mp4', webm: 'a.webm' }, shots: [], demoData: false } }));
  assert.ok(v.includes('<video') && v.includes('controls'));
});

test('title is escaped in card and modal', () => {
  const p = fixture({ title: '<script>' });
  assert.ok(R.projectCardHTML(p).includes('&lt;script&gt;'));
  assert.ok(R.projectModalHTML(p).includes('&lt;script&gt;'));
  assert.ok(!R.projectCardHTML(p).includes('<script>'));
  assert.ok(!R.projectModalHTML(p).includes('<script>'));
});

test('attribute values and URLs are escaped', () => {
  const h = R.projectCardHTML(fixture({ repo: 'https://x.dev/?a="b"&c=<d>', slug: 'a"b' }));
  assert.ok(!h.includes('"b"&c'));
  assert.ok(h.includes('&quot;b&quot;&amp;c=&lt;d&gt;'));
  assert.ok(h.includes('data-slug="a&quot;b"'));
});

test('galleryHTML', () => {
  assert.equal(R.galleryHTML([], 'T'), '');
  const h = R.galleryHTML(['media/e/01-1400.webp', 'media/e/x.webp'], 'Hack');
  assert.ok(h.startsWith('<div class="gallery">'));
  assert.ok(h.includes('<a class="gallery__item" href="media/e/01-1400.webp" target="_blank" rel="noopener">'));
  assert.ok(h.includes('src="media/e/01-640.webp"'));
  assert.ok(h.includes('src="media/e/x.webp"'));
  assert.ok(h.includes('alt="Hack — photo 1 of 2"'));
  assert.ok(h.includes('alt="Hack — photo 2 of 2"'));
  assert.ok(h.includes('loading="lazy"'));
});

test('experienceCardHTML', () => {
  const withG = SITE.experiences.find(e => e.gallery.length && e.cover);
  const h = R.experienceCardHTML(withG);
  assert.ok(h.includes('<article class="exp-card"'));
  assert.ok(h.includes('data-id="' + withG.id + '"') && h.includes('data-kind="' + withG.kind + '"'));
  assert.ok(h.includes('<button class="exp-card__gallery" data-gallery="' + withG.id + '">View gallery</button>'));
  assert.ok(h.includes(withG.cover));
  assert.ok(h.includes(R.escapeHTML(withG.highlights[0])));
  assert.ok(!h.includes('exp-card--text'));
  const base = { id: 'x', kind: 'work', title: 'T', tag: 'Tag', org: '', when: 'W', subtitle: 'S', description: 'D', highlights: ['h1'], gallery: [] };
  const t = R.experienceCardHTML(base);
  assert.ok(t.includes('exp-card--text'));
  assert.ok(!t.includes('exp-card__gallery'));
  assert.ok(!t.includes('exp-card__org'));
  assert.ok(R.experienceCardHTML(Object.assign({}, base, { org: 'Acme' })).includes('Acme'));
  for (const e of SITE.experiences) {
    const out = R.experienceCardHTML(e);
    assert.equal(out.includes('exp-card__gallery'), e.gallery.length > 0);
    assert.ok(!/<(p|span|h3)[^>]*><\/(p|span|h3)>/.test(out));
  }
});

test('timelineHTML sorts pending last', () => {
  const h = R.timelineHTML(SITE.timeline);
  assert.ok(h.startsWith('<ol class="timeline">'));
  const dated = h.split('Date to be confirmed');
  const lastDatedIdx = Math.max(...SITE.timeline.filter(e => e.sort !== '9999').map(e => h.indexOf(R.escapeHTML(e.title))));
  const firstPendingIdx = Math.min(...SITE.timeline.filter(e => e.sort === '9999').map(e => h.indexOf(R.escapeHTML(e.title))));
  assert.ok(dated.length > 1);
  assert.ok(lastDatedIdx < firstPendingIdx);
  assert.equal((h.match(/timeline__item--pending/g) || []).length, SITE.timeline.filter(e => e.sort === '9999').length);
  const small = R.timelineHTML([
    { when: 'B', sort: '2020-02', title: 'b', detail: '' },
    { when: 'A', sort: '2020-01', title: 'a', detail: 'd' }
  ]);
  assert.ok(small.indexOf('>a<') < small.indexOf('>b<'));
  assert.ok(!small.includes('timeline__detail"></'));
});

test('certificateCardHTML', () => {
  const withImg = R.certificateCardHTML(SITE.certificates.find(c => c.image));
  assert.ok(withImg.startsWith('<figure class="cert-card">'));
  assert.ok(withImg.includes('<button class="cert-card__open" data-full="media/certificates/fnb-full-stack.webp" aria-haspopup="dialog">'));
  assert.ok(withImg.includes('<figcaption>'));
  const noImg = R.certificateCardHTML(SITE.certificates.find(c => !c.image));
  assert.ok(noImg.startsWith('<article class="cert-card cert-card--text">'));
  assert.ok(!noImg.includes('<img') && !noImg.includes('<button'));
});

test('recognitionHTML', () => {
  const h = R.recognitionHTML(SITE.recognition);
  assert.ok(h.startsWith('<ul class="recognition">'));
  assert.equal((h.match(/<li/g) || []).length, SITE.recognition.length);
  assert.ok(h.includes(R.escapeHTML(SITE.recognition[0].title)));
  assert.ok(h.includes(R.escapeHTML(SITE.recognition[0].detail)));
});

test('every project, experience and certificate renders without DOM access', () => {
  SITE.projects.forEach(p => { R.projectCardHTML(p); R.projectModalHTML(p); });
  SITE.certificates.forEach(c => R.certificateCardHTML(c));
});
