'use strict';
// assets/js/data.js is the single source of every fact on the site. These tests pin
// its shape and the values the renderers (Task 6) and pages depend on.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const SITE = require('../assets/js/data.js');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'media', 'manifest.json'), 'utf8'));

const PENDING = 'Date to be confirmed';
const MAX_CLIP_BYTES = 2621440;

const SLUGS = [
  'nova-journal', 'open-data-dashboard', 'thaba-shield', 'momali', 'fintech-api',
  'tutorconnect', 'studylink', 'smartshelf', 'busnova', 'logisticore',
  'placeme', 'edurand', 'journeymap', 'laundry',
];
const WEB_FORMS = ['tutorconnect', 'studylink', 'smartshelf', 'busnova', 'logisticore'];
const EXISTING = ['placeme', 'edurand', 'journeymap', 'laundry'];
const LIVE_OR_LOCAL = ['nova-journal', 'open-data-dashboard', 'thaba-shield', 'momali', 'fintech-api'];
const CATEGORIES = ['web', 'mobile', 'dotnet', 'api'];

// The canonical stack spellings. Chart.js is the one addition, with code evidence in
// open-data-api-dashboard/index.html and C-Sharp-Shooter/Scripts/vendor/chart.umd.min.js.
const CANONICAL_STACK = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'React Native/Expo', 'Node.js', 'Python',
  'FastAPI', 'C#', 'VB.NET', 'ASP.NET Web Forms', 'Entity Framework 6', 'ADO.NET', 'SQL',
  'SQL Server', 'PostgreSQL', 'SQLAlchemy', 'Docker', 'Bootstrap', 'localStorage',
  'World Bank API', 'Git', 'UI/UX', 'Chart.js',
];

const bySlug = (slug) => SITE.projects.find((p) => p.slug === slug);
const exists = (rel) => fs.existsSync(path.join(root, rel));

test('manifest paths are url-safe and exist', () => {
  const keys = Object.keys(manifest);
  assert.ok(keys.length > 0, 'manifest must not be empty');
  for (const key of keys) {
    assert.match(key, /^media\/[a-z0-9\/._-]+$/, `url-unsafe manifest key: ${key}`);
    assert.ok(exists(key), `missing file for manifest key: ${key}`);
  }
});

test('the 14 projects are in spec §6 order', () => {
  assert.deepStrictEqual(SITE.projects.map((p) => p.slug), SLUGS);
});

test('project slugs are unique and every category is allowed', () => {
  const slugs = SITE.projects.map((p) => p.slug);
  assert.strictEqual(new Set(slugs).size, slugs.length, 'duplicate slug');
  for (const p of SITE.projects) {
    assert.ok(p.categories.length > 0, `${p.slug} has no category`);
    for (const c of p.categories) assert.ok(CATEGORIES.includes(c), `${p.slug}: bad category ${c}`);
  }
});

test('category filters give web 11, mobile 2, api 2, dotnet 5', () => {
  const count = (c) => SITE.projects.filter((p) => p.categories.includes(c)).length;
  assert.deepStrictEqual(
    { all: SITE.projects.length, web: count('web'), mobile: count('mobile'), api: count('api'), dotnet: count('dotnet') },
    { all: 14, web: 11, mobile: 2, api: 2, dotnet: 5 });
});

test('every project has the text fields filled in', () => {
  for (const p of SITE.projects) {
    for (const f of ['title', 'tagline', 'description', 'context']) {
      assert.ok(typeof p[f] === 'string' && p[f].trim(), `${p.slug}: empty ${f}`);
    }
  }
});

test('repo is set for exactly the first 10, on github.com/BigGee6566', () => {
  SITE.projects.forEach((p, i) => {
    if (i < 10) assert.ok(p.repo && p.repo.startsWith('https://github.com/BigGee6566/'), `${p.slug}: bad repo ${p.repo}`);
    else assert.strictEqual(p.repo, undefined, `${p.slug} must have no repo`);
  });
});

test('live links exist only for the three verified deployments', () => {
  const live = Object.fromEntries(SITE.projects.filter((p) => 'live' in p).map((p) => [p.slug, p.live]));
  assert.deepStrictEqual(live, {
    'nova-journal': 'https://simple-blog-website-mu.vercel.app',
    'open-data-dashboard': 'https://biggee6566.github.io/open-data-api-dashboard/',
    'thaba-shield': 'https://thaba-shield.vercel.app',
  });
});

test('capture states and posters follow the capture method', () => {
  for (const slug of WEB_FORMS) {
    const p = bySlug(slug);
    assert.strictEqual(p.capture, 'pending-pc', slug);
    assert.strictEqual(p.media.poster, `media/projects/${slug}/logo.webp`, slug);
  }
  for (const slug of EXISTING) {
    const p = bySlug(slug);
    assert.strictEqual(p.capture, 'existing-screenshot', slug);
    assert.strictEqual(p.media.poster, `media/projects/${slug}/poster.webp`, slug);
  }
  for (const slug of LIVE_OR_LOCAL) {
    const p = bySlug(slug);
    assert.ok(['pending', 'captured'].includes(p.capture), `${slug}: ${p.capture}`);
    if (p.capture === 'pending') assert.strictEqual(p.media.poster, 'media/projects/pending-cover.webp', slug);
  }
});

test('a project without a capture carries no video, no shots and no demo-data flag', () => {
  for (const p of SITE.projects.filter((x) => x.capture !== 'captured')) {
    assert.strictEqual(p.media.video, undefined, `${p.slug} has a video`);
    assert.deepStrictEqual(p.media.shots, [], `${p.slug} has shots`);
    assert.strictEqual(p.media.demoData, false, `${p.slug} demoData`);
  }
});

test('stack names use the canonical spellings', () => {
  for (const p of SITE.projects) {
    assert.ok(p.stack.length > 0, `${p.slug} has no stack`);
    for (const s of p.stack) assert.ok(CANONICAL_STACK.includes(s), `${p.slug}: non-canonical stack item "${s}"`);
  }
  for (const slug of WEB_FORMS) assert.ok(bySlug(slug).stack.includes('ASP.NET Web Forms'), slug);
  assert.ok(bySlug('tutorconnect').stack.includes('PostgreSQL'), 'TutorConnect runs on PostgreSQL');
  assert.ok(!bySlug('tutorconnect').stack.includes('SQL Server'), 'TutorConnect does not use SQL Server');
});

// Every image or clip path in the data, tagged with whether it is capture output.
// Capture output (Task 12) is never in the manifest, so it is checked by existence only.
function mediaPaths() {
  const out = [];
  for (const p of SITE.projects) {
    out.push({ where: `${p.slug} poster`, rel: p.media.poster, capture: p.capture === 'captured' });
    if (p.media.video) {
      out.push({ where: `${p.slug} mp4`, rel: p.media.video.mp4, capture: true });
      out.push({ where: `${p.slug} webm`, rel: p.media.video.webm, capture: true });
    }
    p.media.shots.forEach((s, i) => out.push({ where: `${p.slug} shot ${i}`, rel: s, capture: true }));
  }
  for (const e of SITE.experiences) {
    if (e.cover) out.push({ where: `${e.id} cover`, rel: e.cover });
    if (e.hero) out.push({ where: `${e.id} hero`, rel: e.hero });
    e.gallery.forEach((g, i) => out.push({ where: `${e.id} gallery ${i}`, rel: g }));
  }
  for (const c of SITE.certificates) if (c.image) out.push({ where: `${c.slug} image`, rel: c.image });
  for (const [k, v] of Object.entries(SITE.person.portrait)) out.push({ where: `portrait ${k}`, rel: v });
  return out;
}

test('every media path exists and contains no space; non-capture media are manifest keys', () => {
  for (const { where, rel, capture } of mediaPaths()) {
    assert.ok(typeof rel === 'string' && rel, `${where}: empty path`);
    assert.ok(!/\s/.test(rel), `${where}: path has a space: ${rel}`);
    assert.ok(exists(rel), `${where}: missing file ${rel}`);
    if (!capture) assert.ok(rel in manifest, `${where}: not in media/manifest.json: ${rel}`);
  }
});

test('each demo clip is at most 2,621,440 bytes', () => {
  for (const p of SITE.projects.filter((x) => x.media.video)) {
    for (const rel of [p.media.video.mp4, p.media.video.webm]) {
      const size = fs.statSync(path.join(root, rel)).size;
      assert.ok(size <= MAX_CLIP_BYTES, `${rel} is ${size} bytes`);
    }
  }
});

test('experiences: 5 events, 2 work entries and 1 venture', () => {
  const kinds = SITE.experiences.map((e) => e.kind);
  assert.strictEqual(kinds.filter((k) => k === 'event').length, 5);
  assert.strictEqual(kinds.filter((k) => k === 'work').length, 2);
  assert.strictEqual(kinds.filter((k) => k === 'venture').length, 1);
  const ids = SITE.experiences.map((e) => e.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate experience id');
  for (const e of SITE.experiences) {
    assert.ok(Array.isArray(e.highlights) && e.highlights.length > 0, `${e.id}: no highlights`);
    assert.ok(Array.isArray(e.gallery), `${e.id}: gallery must be an array`);
  }
});

test('the 4 S3 events use their manifest galleries, cover and hero', () => {
  const folders = {
    'human-rights-hackathon': 'human-rights',
    'telkom10x-hackathon': 'telkom10x',
    'uct-cortexhub-fintech-hackathon': 'uct-cortex-hub',
    'startupgrind-all-star-pitch-battle': 'startup-grind',
  };
  for (const [id, folder] of Object.entries(folders)) {
    const e = SITE.experiences.find((x) => x.id === id);
    assert.ok(e, `missing experience ${id}`);
    const keys = Object.keys(manifest).filter((k) => k.startsWith(`media/events/${folder}/`));
    const role = (r, size) => keys.find((k) => manifest[k].role === r && k.endsWith(`-${size}.webp`));
    assert.deepStrictEqual(e.gallery, keys.filter((k) => k.endsWith('-1400.webp')).sort(), `${id} gallery`);
    assert.strictEqual(e.cover, role('cover', 640), `${id} cover`);
    assert.strictEqual(e.hero, role('hero', 1400), `${id} hero`);
  }
});

test('the inter-university hackathon is a mentor event dated with an en dash, and has no photos yet', () => {
  const e = SITE.experiences.find((x) => x.id === 'inter-university-hackathon');
  assert.ok(e, 'missing inter-university-hackathon');
  assert.strictEqual(e.kind, 'event');
  assert.strictEqual(e.tag, 'Mentor');
  assert.strictEqual(e.when, '17–18 Oct 2026');
  assert.deepStrictEqual(e.gallery, []);
  assert.strictEqual(e.cover, undefined);
  assert.strictEqual(e.hero, undefined);
  assert.ok(SITE.recognition.some((r) => r.when === '17–18 Oct 2026' && /Inter-University Hackathon/.test(r.title)),
    'recognition must list the mentor role with the en-dash date');
});

test('8 certificates, the 6 S3 images in order, and text-only YES and UCT–Cortex cards', () => {
  assert.strictEqual(SITE.certificates.length, 8);
  assert.strictEqual(SITE.certificates.filter((c) => !('image' in c)).length, 2);
  assert.deepStrictEqual(SITE.certificates.filter((c) => c.image).map((c) => c.image), [
    'media/certificates/fnb-full-stack.webp',
    'media/certificates/digital-learning.webp',
    'media/certificates/hp-effective-business-websites.webp',
    'media/certificates/hp-ai-for-beginners.webp',
    'media/certificates/hp-starting-small-business.webp',
    'media/certificates/hp-finding-funding.webp',
  ]);
  const textOnly = SITE.certificates.filter((c) => !c.image).map(({ title, issuer, when }) => ({ title, issuer, when }));
  assert.deepStrictEqual(textOnly, [
    { title: 'Quality Work Experience Programme', issuer: 'Youth Employment Service (YES)', when: '1 Aug 2026' },
    { title: 'UCT–Cortex Hub Fintech Lab 2026 Summer School', issuer: 'The Cortex Hub, East London', when: '12–31 Jan 2026' },
  ]);
});

test('6 languages, in the CV spelling and levels', () => {
  assert.deepStrictEqual(SITE.languages, [
    { name: 'English', level: 'Fluent' },
    { name: 'Xhosa', level: 'Fluent' },
    { name: 'Zulu', level: 'Fluent' },
    { name: 'Tswana', level: 'Intermediate' },
    { name: 'Sotho', level: 'Basics' },
    { name: 'Pedi', level: 'Basics' },
  ]);
});

test('timeline: dated entries sort by YYYY-MM, pending ones say "Date to be confirmed" and sort "9999"', () => {
  assert.ok(SITE.timeline.length > 0);
  for (const t of SITE.timeline) {
    if (t.when === PENDING) assert.strictEqual(t.sort, '9999', t.title);
    else assert.match(t.sort, /^\d{4}-(0[1-9]|1[0-2])$/, `${t.title}: bad sort ${t.sort}`);
    if (t.sort === '9999') assert.strictEqual(t.when, PENDING, t.title);
    assert.match(t.source, /^S[1-6](, S[1-6])*$/, `${t.title}: bad source ${t.source}`);
  }
});

test('every date is a real date or exactly "Date to be confirmed"', () => {
  const whens = [
    ...SITE.timeline.map((x) => [x.title, x.when]),
    ...SITE.recognition.map((x) => [x.title, x.when]),
    ...SITE.certificates.map((x) => [x.title, x.when]),
    ...SITE.experiences.map((x) => [x.id, x.when]),
    ...SITE.education.map((x) => [x.school, x.when]),
  ];
  for (const [what, when] of whens) {
    assert.ok(typeof when === 'string' && when.trim(), `${what}: empty when`);
    assert.ok(when === PENDING || /\d/.test(when), `${what}: "${when}" is neither a date nor "${PENDING}"`);
    assert.doesNotMatch(when, /pending|tbc|tbd/i, `${what}: use "${PENDING}"`);
  }
});

test('capability titles match the site footer exactly, each with one sourced sentence', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const list = html.match(/What I do<\/h2>\s*<ul[^>]*>([\s\S]*?)<\/ul>/)[1];
  const footer = [...list.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1].replace(/&amp;/g, '&').trim());
  assert.deepStrictEqual(SITE.capabilities.map((c) => c.title), footer);
  for (const c of SITE.capabilities) {
    assert.ok(c.icon, `${c.title}: no icon`);
    assert.match(c.text, /^[^.]+(\.[^\s.][^.]*)*\.$/, `${c.title}: text must be one sentence`);
    assert.match(c.source, /^S[1-6](, S[1-6])*$/, `${c.title}: bad source`);
  }
});

test('person uses only the public contact set', () => {
  assert.deepStrictEqual(
    { name: SITE.person.name, location: SITE.person.location, email: SITE.person.email, socials: SITE.person.socials, cv: SITE.person.cv },
    {
      name: 'Yongama Goso',
      location: 'KuGompo City (East London), Eastern Cape',
      email: 'goso.yonga@gmail.com',
      socials: {
        linkedin: 'https://www.linkedin.com/in/yongama-goso-85aaaa2b0',
        github: 'https://github.com/BigGee6566',
        facebook: 'https://www.facebook.com/yongama.ow.gee',
        instagram: 'https://www.instagram.com/big_gee_the_one_and_only/',
      },
      cv: 'Yongama_Goso_CV.pdf',
    });
  assert.ok(exists(SITE.person.cv), 'the CV file must exist');
});

test('hero roles, approach and CV tools are the given values', () => {
  assert.deepStrictEqual(SITE.roles, ['Chief Problem Solver', 'Full-Stack Developer', 'Techpreneur', 'Founder, Gonex Innovation Hub']);
  assert.deepStrictEqual(SITE.approach, [
    'I learn by building real projects and solving real problems.',
    'I value clarity, structure, and scalability, and I aim to write code that is both practical and maintainable.',
    'I approach every project with discipline, curiosity, and a mindset of continuous improvement.',
  ]);
  assert.deepStrictEqual(SITE.cvTools, ['Visual Studio', 'Google Workspace', 'Microsoft Office (Word, Excel, PowerPoint, Access)']);
});

test('about is three first-person paragraphs; services are the three S3 cards', () => {
  assert.strictEqual(SITE.about.length, 3);
  for (const para of SITE.about) {
    assert.match(para, /\bI\b/, 'about paragraphs are first person');
    assert.doesNotMatch(para, /\b(He|His|Him)\b/, 'about must not copy the biography\'s third person');
  }
  assert.deepStrictEqual(SITE.services.map((s) => s.title), ['Web Development', 'Graphic Design', 'Digital Marketing']);
  for (const s of SITE.services) assert.ok(s.text.trim(), `${s.title}: empty text`);
});

test('Gonex: two summary paragraphs, the vision verbatim, and the site URL', () => {
  assert.strictEqual(SITE.gonex.summary.length, 2);
  assert.strictEqual(SITE.gonex.vision,
    "A place where no young person's potential is limited by geography and where women lead their own enterprises.");
  assert.strictEqual(SITE.gonex.url, 'https://gonex-website.vercel.app');
});

test('counter inputs: 10 public repos, 5 events, 8 certificates, 6 languages', () => {
  assert.deepStrictEqual([
    SITE.projects.filter((p) => p.repo).length,
    SITE.experiences.filter((e) => e.kind === 'event').length,
    SITE.certificates.length,
    SITE.languages.length,
  ], [10, 5, 8, 6]);
});
