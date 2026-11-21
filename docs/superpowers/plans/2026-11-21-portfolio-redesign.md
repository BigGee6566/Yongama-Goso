# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Yongama Goso's portfolio as a five-page static site that follows chumamemela.co.za's
structure in his own visual identity. Every project is shown with real captures of the running app,
and every fact traces to his CV, his biography, his current site or his repos.

**Architecture:** Plain HTML pages share one header and footer, copied into each page and kept
identical by a test. Content lives in one data file, written as a UMD-style classic script, so it
works on GitHub Pages, from `file://`, and inside Node tests. Pure render functions build HTML
strings from that data, and a small browser-only layer wires up behaviour. Media is produced by
re-runnable scripts: Pillow for photos, and Playwright plus ffmpeg for app captures.

**Tech Stack:**
- HTML5, CSS3, vanilla JS (ES2020, classic `<script defer>`)
- Node 22 `node:test`
- Playwright 1.63.0, already installed in the container; do not reinstall
- ffmpeg 6.1 (libx264, libvpx-vp9, libwebp)
- Python 3.13 with Pillow 12
- Docker, for app captures only

**Spec:** `docs/superpowers/specs/2026-11-21-portfolio-redesign-design.md`. Read it before any task.

## Global Constraints

- Hosting: GitHub Pages from the repo root, `https://biggee6566.github.io/Yongama-Goso/`, with no
  build step. Every page must also work when opened from `file://`.
- External assets, and no others:
  - `https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap`
  - `https://cdn.jsdelivr.net/npm/devicon@2.17.0/devicon.min.css`
  - `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css`
- Palette tokens:

  | Token | Value |
  |---|---|
  | `--ink` | `#0E1116` |
  | `--ink-2` | `#161B22` |
  | `--bone` | `#F5F1EA` |
  | `--bone-2` | `#EAE3D6` |
  | `--vermilion` | `#FF5A36` |
  | `--teal` | `#14B8A6` |
  | `--muted-on-bone` | `#4A4F57` |
  | `--muted-on-ink` | `rgba(245,241,234,.66)` |

  - No gold or orange-gold anywhere.
  - Vermilion is never used for text smaller than 24px on `--bone`.
- Fonts:
  - `--font-display: "Big Shoulders Display"`
  - `--font-body: "Instrument Sans"`
  - `--font-mono: "JetBrains Mono"`
  - Inter, Roboto, Arial and Space Grotesk are forbidden.
- Public contact details are limited to:
  - email `goso.yonga@gmail.com`
  - LinkedIn `https://www.linkedin.com/in/yongama-goso-85aaaa2b0`
  - GitHub `https://github.com/BigGee6566`
  - Facebook `https://www.facebook.com/yongama.ow.gee`
  - Instagram `https://www.instagram.com/big_gee_the_one_and_only/`
  - location "KuGompo City (East London), Eastern Cape"
- Content that must not appear in any served file:
  - **Private values**, checked by fingerprint only:
    - his phone number, his student number, his street address and suburb
    - both referees' phone numbers and email addresses
  - The plain values are **never written to a committed file**. They live only in the git-ignored
    plan workspace (`.superpowers/sdd/2026-11-21-portfolio-redesign/forbidden-plaintext.txt`).
    The committed `tests/fixtures/forbidden.json` holds `{label, sha256}` pairs, where `label` is a
    category such as "personal phone number", never the value.
  - **The two held-back game names**, `SA-NQOBA` and `CONQUEST`, checked as plain strings (these
    are not private).
- Formspree endpoint: `https://formspree.io/f/mnjbagrl`.
- No fabricated facts. Copy is limited to the spec's sources S1–S6. Unknown dates render as "Date to be confirmed".
- Media limits:
  - every demo clip at most 15 s and at most 2,621,440 bytes
  - no media path contains a space
  - Home transfers at most 2,621,440 bytes before interaction
- Accessibility:
  - WCAG 2.2 AA contrast
  - every `<img>` has non-empty `alt`
  - modals trap focus, close on Escape and restore focus
  - `prefers-reduced-motion: reduce` disables the ticker, reveals, counter animation and video autoplay
- Layout: no horizontal scroll at a 360px viewport, with 16px side gutters.
- Commits end with the session's attribution lines and are pushed to `claude/keen-franklin-gqohrd`.

## Review Focus

1. **Old links with hashes:** `index.html#projects`, `#experience`, `#certificates`, `#contact` and
   `#skills` circulate on LinkedIn and in the old CV, and must land on the matching new page.
   Tested in Task 7.
2. **Opening from `file://`:** the README promises "open index.html in your browser". Data and
   render scripts must work without a server. Tested in Task 4 (shell) and Task 8 (projects grid).
3. **Keyboard-only use of the project and gallery modals:** Tab stays inside, Escape closes and
   focus returns to the opener. Tested in Tasks 8 and 9.
4. **Reduced-motion users:** no autoplaying video, no ticker cycling, counters show final values.
   Tested in Task 7 (Home) and Task 8 (cards).
5. **Original photo filenames with spaces and parentheses** (`WhatsApp Image … (1).jpeg`) must
   never reach a URL. The optimiser renames them, and a data test fails on any spaced path.
   Tested in Tasks 3 and 5.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json` | Scripts `test`, `serve`, `capture`, `images`; devDependency `playwright@1.63.0` for his own machine (do **not** `npm install` in the container) |
| `.gitignore` | `node_modules/`, `tools/capture/.work/`, `.env` |
| `tests/helpers/server.js` | `startServer(rootDir) → Promise<{ url, close }>`: static server with MIME types and 404s; also `servedFiles(root)` |
| `tests/helpers/serve-cli.js` | `node tests/helpers/serve-cli.js` serves the repo on port 5173 for manual viewing |
| `tests/helpers/browser.js` | `withPage(fn, { viewport, reducedMotion, baseUrl })` wraps the Playwright chromium lifecycle and collects console errors into `page.consoleErrors` |
| `tests/privacy.test.js` | forbidden-string scan of every served file |
| `tests/cv.test.js` | public CV PDF content check |
| `tests/data.test.js` | manifest, schema, media existence and counter tests for `data.js` |
| `tests/render.test.js` | unit tests for `render.js` |
| `tests/shell.test.js` | header/footer identity, nav, 360px overflow, console-clean, `file://` |
| `tests/home.test.js`, `tests/projects.test.js`, `tests/journey.test.js`, `tests/recognition.test.js`, `tests/contact.test.js` | per-page browser tests |
| `tests/capture.test.js` | unit tests for capture helpers |
| `assets/css/tokens.css` | custom properties and font stacks |
| `assets/css/layout.css` | header, footer, sections, hero, CTA band, grid primitives, the 360px rules |
| `assets/css/components.css` | cards, chips, badges, counters, timeline, modal, gallery, form |
| `assets/js/data.js` | `SITE` content object (UMD) |
| `assets/js/render.js` | pure HTML-string renderers (UMD) |
| `assets/js/modal.js` | accessible modal: `Modal.open(html, { label, opener })`, `Modal.close()` |
| `assets/js/app.js` | DOM wiring, dispatched on `document.body.dataset.page` |
| `assets/img/contours.svg` | topographic contour motif |
| `assets/img/beadband.svg` | triangle band section divider |
| `index.html`, `projects.html`, `journey.html`, `recognition.html`, `contact.html` | the five pages |
| `media/` | generated WebP images and project videos; committed |
| `tools/optimize-images.py` | photo → WebP pipeline, writes `media/manifest.json` |
| `tools/capture/capture.config.js` | per-project capture recipes |
| `tools/capture/capture.js` | Playwright recorder, ffmpeg encode, poster and shots |
| `tools/capture/capture-windows.ps1` | the same recorder for the five Web Forms apps on his PC |
| `cv/resume.html` | public CV source, rebuilt from S1 |
| `Yongama_Goso_CV.pdf` | regenerated by `sh cv/build.sh` |
| `README.md` | updated run, test and capture instructions, plus a link to the spec |

The old `index.html` is replaced. Its experience descriptions and service copy move into
`data.js` verbatim, since they are S3 copy.

---

### Task 1: Test harness and privacy guard

**Files:**
- Create: `package.json`, `.gitignore`, `.nojekyll` (GitHub Pages' Jekyll would otherwise drop files starting with `_`), `tests/helpers/server.js`, `tests/helpers/serve-cli.js`, `tests/helpers/browser.js`, `tests/helpers/privacy.js`, `tools/hash-forbidden.js`, `tests/fixtures/forbidden.json`, `tests/privacy.test.js`

**Interfaces:**
- Produces:
  - `startServer(rootDir: string): Promise<{url: string, close(): Promise<void>}>`
  - `servedFiles(rootDir: string): string[]`: every `*.html`, `*.js`, `*.css`, `*.json` and `*.svg` under the root, excluding `node_modules`, `tests`, `tools`, `docs` and `.git`
  - `withPage(fn: (page) => Promise<void>, opts?: {viewport?: {width:number,height:number}, reducedMotion?: 'reduce'|'no-preference', baseUrl?: string}): Promise<void>`, where `page.consoleErrors: string[]` is collected

- [ ] **Step 1: Write the fingerprint tooling and `tests/privacy.test.js`.**
  - `tools/hash-forbidden.js` reads `label|value` lines from the plaintext file and writes
    `tests/fixtures/forbidden.json`.
  - `tests/helpers/privacy.js` exports `findForbidden(text: string): string[]`, which returns the
    *labels* of the matches. To match, it normalises the text:
    - lowercase it
    - make each word token, and each pair of adjacent words, a candidate
    - collapse each run of 9–10 digits separated only by spaces into its bare digits, and make that a candidate
    - hash each candidate with SHA-256
  - The plaintext values are normalised the same way before hashing.
  - The tests assert:
    - `findForbidden` returns `[]` for every `servedFiles(repoRoot)` file, plus `README.md` (GitHub Pages serves it).
    - No served file contains `SA-NQOBA` or `CONQUEST` (case-insensitive).
    - `cv/resume.html` is in the scanned set.
    - `findForbidden` flags a fixture string built at test time from the plaintext file. Skip this one when that file is absent, for example on his machine.
- [ ] **Step 2: Run** `node --test tests/privacy.test.js`.
  Expected: FAIL. `cv/resume.html` returns the labels "personal phone number" and "home suburb".
- [ ] **Step 3: Implement the helpers** with the signatures above. The server maps `.html .css .js .json .svg .webp .png .jpg .jpeg .mp4 .webm .pdf .woff2` to MIME types and resolves `/` to `/index.html`.
- [ ] **Step 4: Run** `node --test tests/privacy.test.js` and confirm it still FAILS, on `cv/resume.html`
  only. Task 2 turns it green.
- [ ] **Step 5: Commit** the harness files.

### Task 2: Public CV rebuilt from the latest CV

**Files:**
- Modify: `cv/resume.html`
- Regenerate: `Yongama_Goso_CV.pdf` (via `sh cv/build.sh`)
- Test: `tests/cv.test.js` (new), `tests/privacy.test.js`

- [ ] **Step 1: Write `tests/cv.test.js`.** It runs `pdftotext Yongama_Goso_CV.pdf -` and asserts:
  - The output contains "Gonex Innovation Hub", "Bachelor of Commerce", "Oct 2026" and
    "References available on request".
  - It contains none of the forbidden strings.
  - It does not match `/2023\s*[–-]\s*present/i`.
- [ ] **Step 2: Run** `node --test tests/cv.test.js`. Expected: FAIL, because the current PDF has the phone number and no Gonex.
- [ ] **Step 3: Rewrite the `cv/resume.html` content from S1.** Keep its existing CSS and fonts.
  - Contact block:
    - email `goso.yonga@gmail.com`
    - "KuGompo City (East London), Eastern Cape"
    - `github.com/BigGee6566`
    - `linkedin.com/in/yongama-goso-85aaaa2b0`
  - Profile: S1's profile paragraph, verbatim.
  - Education: UFH, Bachelor of Commerce (Information Systems), 2023 – 2026; Tlokweng Senior
    Secondary School, National Senior Certificate, 2020 – 2022.
  - Experience: the three S1 roles with their S1 bullets and dates.
  - Skills, languages, and training and certifications: as in S1.
  - Keep the existing "Hackathons & events" block, which is S3 copy.
  - References: replace with "References available on request".
- [ ] **Step 4: Run** `sh cv/build.sh`, then `node --test tests/cv.test.js tests/privacy.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `cv/resume.html`, `Yongama_Goso_CV.pdf`, `tests/cv.test.js`, then push.

### Task 3: Image optimisation pipeline

**Files:**
- Create: `tools/optimize-images.py`, `tests/data.test.js` (manifest test only; Task 5 extends it)
- Generate:
  - `media/events/<event>/NN-1600.webp` and `NN-640.webp`
  - `media/certificates/<slug>.webp`
  - `media/profile/portrait-{1200,640}.webp`
  - `media/projects/<slug>/poster.webp` for the 4 existing projects
  - `media/projects/<slug>/logo.webp` for the 5 Web Forms apps
  - `media/projects/pending-cover.webp`
  - `media/manifest.json`

**Interfaces:**
- Produces: `media/manifest.json`, shaped as
  `{ "<path relative to repo root>": { "src": "<original path>", "w": int, "h": int, "bytes": int } }`.
  `data.js` (Task 5) references only paths that appear as keys in it.

- [ ] **Step 1: Write the test.** The test in `tests/data.test.js` is named
  `manifest paths are url-safe and exist`. It asserts that every manifest key matches
  `/^media\/[a-z0-9\/._-]+$/` and that the file exists on disk.
- [ ] **Step 2: Run it.** Expected: FAIL (no manifest yet).
- [ ] **Step 3: Implement** `optimize-images.py` (argparse: `--repos <dir of cloned repos>`). Requirements:
  - Event photos are numbered `01..NN` in the order of the S3 `gallery` arrays, so the S3 cover and
    hero images keep their roles. The event-folder mapping is:

    | Source folder | Output folder |
    |---|---|
    | `Images/humanrights` | `human-rights` |
    | `Images/telkom10x` | `telkom10x` |
    | `Images/uct-cortexhub` | `uct-cortex-hub` |
    | `Images/startupgrind` | `startup-grind` |

  - Certificates map to these slugs, in S3 order: `fnb-full-stack`, `digital-learning`,
    `hp-effective-business-websites`, `hp-ai-for-beginners`, `hp-starting-small-business`,
    `hp-finding-funding`.
  - The existing project screenshots map to `placeme`, `edurand`, `journeymap` and `laundry`.
  - Logos come from each cloned repo's own branding file:
    - TutorConnect: `Images/branding/tutorconnect-logo.png`
    - SmartShelf: `Images/smartshelf-logo.png`
    - BusNova: `BusNova_System_NoDB/Images/logo.jpeg`
    - StudyLink and Logisticore: view their `branding/` and `Images/` folders and pick the logo-like asset.
  - `pending-cover.webp` is a 1440×900 typographic cover reading "Running capture coming soon", in ink and bone.
  - Encode with WebP quality 78 and method 6. Apply `ImageOps.exif_transpose` before resizing.
    Never upscale.
- [ ] **Step 4: Run** `python3 tools/optimize-images.py --repos <scratchpad>/repos`, then the test.
  Expected: PASS. Also check that `du -sh media` is under 15 MB.
- [ ] **Step 5: Commit** `tools/optimize-images.py`, `media/`, `tests/data.test.js`, then push.

### Task 4: Visual system and shared page shell

**Files:**
- Create: `assets/css/tokens.css`, `assets/css/layout.css`, `assets/css/components.css`, `assets/img/contours.svg`, `assets/img/beadband.svg`
- Create: the five page files, each containing the identical `<header class="site-header">` and
  `<footer class="site-footer">` blocks, an empty `<main>`, and the four scripts with `defer` in
  this order: `data.js`, `render.js`, `modal.js`, `app.js`
- Create: `assets/js/app.js` (dispatcher plus `initHeader`), with stub `data.js`, `render.js` and `modal.js`
- Test: `tests/shell.test.js`

**Interfaces:**
- Produces:
  - `<body data-page="home|projects|journey|recognition|contact">`
  - header nav links in this order: Home `index.html`, Projects `projects.html`, Journey
    `journey.html`, Recognition `recognition.html`, Contact `contact.html`
  - Download CV button `href="Yongama_Goso_CV.pdf" download`
  - the current page's link carries `aria-current="page"`, set statically in each file
  - the footer contains the about blurb, quick links, the capability list, the public contact set and "© 2026 Yongama Goso"
  - mobile nav toggle `button.nav-toggle[aria-expanded]` below 900px

- [ ] **Step 1: Write `tests/shell.test.js`.** Against `startServer`, the tests assert:
  1. `header` and `footer` outerHTML is identical across the five pages, after removing `aria-current`.
  2. Every nav `href` returns 200.
  3. At 360×740, on every page, `document.documentElement.scrollWidth <= 360`.
  4. There are zero console errors on every page.
  5. Opening `file://<repo>/index.html` renders `.site-header` with no console errors.
  6. The nav toggle at 390px flips `aria-expanded` and reveals the links.
- [ ] **Step 2: Run** `node --test tests/shell.test.js`. Expected: FAIL (the pages don't exist).
- [ ] **Step 3: Implement the shell.** Requirements:
  - Tokens use the exact Global Constraints values.
  - The logo mark is an inline SVG "YG" set in the display font.
  - The header is transparent over the dark hero on Home, and solid `--ink` elsewhere.
  - `contours.svg` holds thin (1px, 18% opacity) concentric irregular contour paths.
  - `beadband.svg` is a repeating triangle band in ink, vermilion and bone.
- [ ] **Step 4: Run** `node --test tests/shell.test.js tests/privacy.test.js`. Expected: PASS.
- [ ] **Step 5: Commit**, then push.

### Task 5: Content data

**Files:**
- Modify: `assets/js/data.js` (replace the stub)
- Test: `tests/data.test.js` (extend)

**Interfaces:**
- Consumes: `media/manifest.json` keys (Task 3).
- Produces: `SITE` (a browser global, and `module.exports` in Node):

```
SITE = {
  person: { name, location, email, socials: {linkedin, github, facebook, instagram}, cv: "Yongama_Goso_CV.pdf" },
  roles: string[],                       // hero ticker
  about: string[],                       // paragraphs
  capabilities: {icon, title, text, source}[],   // 4 cards, spec §8
  services: {title, text}[],             // 3 from S3 verbatim
  approach: string[],                    // 3 lines, S3 verbatim
  projects: Project[],                   // 14, spec §6 order
  experiences: {id, kind: "work"|"venture"|"event", title, tag, org, when, subtitle, description, highlights: string[], cover?, hero?, gallery: string[]}[],
  timeline: {when: string, sort: string /* YYYY-MM, or "9999" when pending */, title, detail, source}[],
  recognition: {title, detail, when, source}[],
  certificates: {slug, title, issuer, when, image?: string}[],   // 8; image absent for YES and UCT–Cortex
  education: {when, school, award}[],
  languages: {name, level}[],            // 6, S1 spelling
  gonex: { summary: string[], vision: string, url: "https://gonex-website.vercel.app" },
  cvTools: string[]                      // "Visual Studio", "Google Workspace", "Microsoft Office (Word, Excel, PowerPoint, Access)"
}
Project = { slug, title, tagline, description, context, categories: ("web"|"mobile"|"dotnet"|"api")[], stack: string[],
            repo?: string, live?: string,
            capture: "captured"|"existing-screenshot"|"pending-pc"|"pending",
            media: { poster: string, video?: {mp4: string, webm: string}, shots: string[], demoData: boolean } }
```

- [ ] **Step 1: Extend `tests/data.test.js`.** The tests assert:
  - The 14 project slugs, in order: `nova-journal, open-data-dashboard, thaba-shield, momali,
    fintech-api, tutorconnect, studylink, smartshelf, busnova, logisticore, placeme, edurand,
    journeymap, laundry`.
  - Slugs are unique, and every category is in the allowed set.
  - `repo` is set for exactly the first 10, each starting `https://github.com/BigGee6566/`.
  - `live` exists only for `nova-journal` (`https://simple-blog-website-mu.vercel.app`),
    `open-data-dashboard` (`https://biggee6566.github.io/open-data-api-dashboard/`) and
    `thaba-shield` (`https://thaba-shield.vercel.app`).
  - The 5 Web Forms slugs have `capture: "pending-pc"`; the 4 existing projects have `"existing-screenshot"`.
  - Every `media.*` path, and every experience and certificate image, exists on disk and contains no space.
  - Each `video.mp4` and `video.webm` is at most 2,621,440 bytes.
  - There are 5 `kind:"event"` experiences, 8 certificates (with `image` absent on exactly 2) and 6 languages.
  - Every pending date uses `when: "Date to be confirmed"` with `sort: "9999"`.
- [ ] **Step 2: Run** `node --test tests/data.test.js`. Expected: FAIL.
- [ ] **Step 3: Fill in `data.js`.** The copy rules:
  - `roles`: `["Chief Problem Solver","Full-Stack Developer","Techpreneur","Founder, Gonex Innovation Hub"]`.
  - `about`: two first-person paragraphs paraphrasing S2 paragraphs 1–2 (Sterkspruit, Joe Gqabi
    District; BCom Information Systems, UFH; software development, IT support, digital skills
    facilitation, mentorship; widening digital access for young people and women in underserved
    and rural communities). Add a third paragraph using S3's sentence about building complete,
    end-to-end products.
  - `approach` (S3 verbatim):
    - "I learn by building real projects and solving real problems."
    - "I value clarity, structure, and scalability, and I aim to write code that is both practical and maintainable."
    - "I approach every project with discipline, curiosity, and a mindset of continuous improvement."
  - `services`: the three S3 cards, with titles and text verbatim.
  - `capabilities`: spec §8 items 1–4, one sentence each, built from S1 and S2 wording.
  - `experiences`:
    - The 4 S3 events keep their `title`, `tag`, `subtitle`, `description` and `highlights` verbatim, with gallery paths remapped to `media/events/...`.
    - Add `inter-university-hackathon` (tag "Mentor", 17–18 Oct 2026, S1 bullets, empty gallery).
    - Add 2 `work` entries (YES Software Developer, Sep 2025 – Sep 2026, S1 bullets; Gonex Founder & Programme Facilitator, S1 bullets) and 1 `venture` entry (Gonex, from S2).
  - `timeline`, `recognition` and `certificates`: exactly spec §10.
  - Project `tagline`, `description` and `context`: paraphrase the repo README.
    - Where a repo has no README (`thaba-shield`, `fintech_tut_fastAPI`, MoMali's top level), describe only what the source code shows. Write nothing aspirational.
    - `context` names the team only where the README does (StudyLink: "Nova Tech Developers, UFH IFS303"; Logisticore: "C Sharp Shooters"; BusNova: "University systems-development coursework").
    - The 4 existing projects use the S3 copy verbatim.
  - Until Tasks 12–13 produce captures, the 5 live and local projects carry `capture: "pending"`
    and `media.poster: "media/projects/pending-cover.webp"`.
- [ ] **Step 4: Run** `node --test tests/data.test.js tests/privacy.test.js`. Expected: PASS.
- [ ] **Step 5: Commit**, then push.

### Task 6: Pure renderers

**Files:**
- Modify: `assets/js/render.js` (replace the stub)
- Test: `tests/render.test.js`

**Interfaces:**
- Consumes: `SITE` (Task 5).
- Produces (UMD, no DOM access; the browser global is `Render`):
  - `escapeHTML(s: string): string`
  - `filterProjects(projects, category: "all"|"web"|"mobile"|"dotnet"|"api"): Project[]`
  - `computeCounters(site): {value: number, label: string}[]`, in the order "Public projects on GitHub", "Hackathons & pitch events", "Certifications", "Languages spoken"
  - `skillUsage(projects): Map<string, string[] /* project titles */>`
  - `projectCardHTML(p: Project): string`. The root is `<article class="project-card" data-slug data-capture>`. It holds a `<button class="project-card__open" aria-haspopup="dialog">`; a `<video muted loop playsinline preload="none" poster>` only when `p.media.video` exists, otherwise an `<img loading="lazy">`; and the badge "Running capture coming soon" when capture is `pending` or `pending-pc`.
  - `projectModalHTML(p): string`
  - `experienceCardHTML(e): string`
  - `galleryHTML(images: string[], title: string): string`
  - `timelineHTML(entries): string`, sorted by `sort` ascending, with pending entries last
  - `certificateCardHTML(c): string`. When there is no image, it renders the `.cert-card--text` variant.
  - `recognitionHTML(items): string`

- [ ] **Step 1: Write `tests/render.test.js`.** The tests assert:
  - `escapeHTML('<a href="x">&</a>')` returns `'&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;'`.
  - `filterProjects(SITE.projects,'dotnet').length === 5`, `'mobile'` returns 2, `'api'` returns 2, `'web'` returns 11 and `'all'` returns 14.
  - `computeCounters(SITE).map(c=>c.value)` deep-equals `[10,5,8,6]`.
  - `skillUsage(SITE.projects).get('ASP.NET Web Forms').length === 5`.
  - The card HTML for a `pending-pc` project contains "Running capture coming soon" and no `<video`.
  - The card HTML for a fixture project with `media.video` contains `preload="none"`.
  - `timelineHTML` places every "Date to be confirmed" after every dated entry.
  - A fixture project titled `<script>` renders as `&lt;script&gt;` in both the card and the modal HTML.
- [ ] **Step 2: Run** `node --test tests/render.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement the renderers** with the signatures above.
- [ ] **Step 4: Run it again.** Expected: PASS.
- [ ] **Step 5: Commit**, then push.

### Task 7: Home page

**Files:**
- Modify: `index.html`, `assets/js/app.js`, `assets/css/layout.css`, `assets/css/components.css`
- Test: `tests/home.test.js`

**Interfaces:**
- Consumes: `SITE`, `Render.computeCounters`, `Render.projectCardHTML`, `Render.recognitionHTML`. The featured cards open the modal through `initProjectGrid` (Task 8). Until then, the cards link to `projects.html#<slug>`.
- Produces, in `app.js`:
  - `initTicker(el, roles)`
  - `initCounters(root)`
  - `initReveal()`
  - `prefersReducedMotion(): boolean`
  - `initLegacyAnchors()`, which on Home maps `#projects→projects.html`, `#experience→journey.html#experience`, `#skills→journey.html#skills`, `#certificates→recognition.html#certificates`, `#contact→contact.html` and `#services→#what-i-do`, using `location.replace`

- [ ] **Step 1: Write `tests/home.test.js`.** The tests assert:
  - The sections appear in this order: `#hero, #counters, #about, #what-i-do, #featured, #recognition-highlights, #cta, #approach`.
  - The `<h1>` text is "Yongama Goso".
  - The primary hero button text is "Work with me" and its `href` is `contact.html`. The secondary buttons are "View projects" and "LinkedIn".
  - `#cta` contains a "Partner with Gonex" link to `recognition.html#gonex`.
  - Counter values read `10 5 8 6` after scrolling into view.
  - `#featured` shows the cards `nova-journal`, `open-data-dashboard`, `thaba-shield` and `momali`.
  - Each legacy hash in Review Focus 1 lands on its mapped URL.
  - Under `reducedMotion:'reduce'`, the ticker still shows `roles[0]` after 4 s, and every `video` is paused.
  - The bytes transferred before interaction total at most 2,621,440 (sum of `response.body()` lengths).
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement Home per spec §7 and §12.** Requirements:
  - The dark hero has a curved bottom edge, with the counter card overlapping it.
  - The stacked name is YONGAMA / GOSO in the display font at `clamp(64px, 12vw, 180px)`.
  - The portrait is `media/profile/portrait-1200.webp` over `contours.svg`.
  - The About section is asymmetric.
  - Each capability card shows a Font Awesome icon.
  - The services row comes from `SITE.services`.
  - The CTA band uses a `media/events/startup-grind/` photo under an ink overlay. The copy is:
    "I'm open to software development opportunities, and Gonex Innovation Hub welcomes partners,
    funders and schools."
  - Load staggering uses `animation-delay`, and everything sits behind the reduced-motion guard.
- [ ] **Step 4: Run** `node --test tests/home.test.js tests/shell.test.js`. Expected: PASS.
- [ ] **Step 5: Commit**, then push.

### Task 8: Projects page and accessible modal

**Files:**
- Modify: `projects.html`, `assets/js/modal.js` (replace the stub), `assets/js/app.js`, `assets/css/components.css`
- Test: `tests/projects.test.js`

**Interfaces:**
- Consumes: `Render.filterProjects`, `Render.projectCardHTML`, `Render.projectModalHTML`, `Render.galleryHTML`.
- Produces:
  - `Modal.open(html: string, {label: string, opener: HTMLElement}): void`
  - `Modal.close(): void`
  - `initProjectGrid(root, projects)`, also used for Home's featured cards
  - `initVideoPreviews(root)`: plays on hover or focus where `(hover: hover)`, plays when 60% in view otherwise, pauses when out of view, and is disabled entirely under reduced motion
  - opening `projects.html#<slug>` opens that project's modal

- [ ] **Step 1: Write `tests/projects.test.js`.** The tests assert:
  - 14 cards render, including when the page is opened from `file://`.
  - The filter chips All, Web, Mobile, .NET and APIs, each a `button[aria-pressed]`, show 14, 11, 2, 5 and 2 cards.
  - Clicking a card opens a `[role=dialog][aria-modal=true]` whose accessible name is the project title.
  - Pressing Tab 20 times keeps `document.activeElement` inside the dialog.
  - Escape closes the dialog and returns focus to the opener.
  - A `pending-pc` card shows its `logo.webp` and the badge.
  - Each card's "Code" link equals `project.repo`, and "Live" appears only on the 3 live projects.
  - Under reduced motion, hovering a video card leaves `video.paused === true`.
  - `projects.html#busnova` opens the BusNova dialog on load.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.** Requirements:
  - The modal disables `body` scroll while open, and closes on overlay click.
  - It carries the video (with `controls`), the description, context, stack badges, links, the
    screenshot gallery, and the "demo data" caption when `media.demoData` is set.
  - Wire Home's featured cards to `initProjectGrid`.
- [ ] **Step 4: Run** `node --test tests/projects.test.js tests/home.test.js`. Expected: PASS.
- [ ] **Step 5: Commit**, then push.

### Task 9: Journey page

**Files:**
- Modify: `journey.html`, `assets/js/app.js`, `assets/css/components.css`
- Test: `tests/journey.test.js`

**Interfaces:**
- Consumes: `Render.timelineHTML`, `Render.experienceCardHTML`, `Render.galleryHTML`, `Render.skillUsage`, `Modal`.

- [ ] **Step 1: Write `tests/journey.test.js`.** The tests assert:
  - The anchors `#growth, #experience, #events, #education, #skills, #languages` exist.
  - The first timeline entry contains "2020", and the last entries contain "Date to be confirmed".
  - The 5 event cards render, and the Telkom10X gallery opens in the dialog with as many images as `SITE.experiences` lists for it.
  - The inter-university card has no "View gallery" button.
  - The "ASP.NET Web Forms" chip lists 5 project titles under "Used in".
  - "Visual Studio" and "Microsoft Office" render.
  - 6 languages render.
  - The gallery dialog passes the Task 8 focus-trap and Escape checks.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.** Requirements:
  - The timeline is a vertical rail with a vermilion node per entry. Pending entries use a dashed node.
  - Skill chips show Devicon icons where a class exists, and a mono text chip otherwise.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit**, then push.

### Task 10: Recognition page

**Files:**
- Modify: `recognition.html`, `assets/js/app.js`, `assets/css/components.css`
- Test: `tests/recognition.test.js`

- [ ] **Step 1: Write `tests/recognition.test.js`.** The tests assert:
  - The anchors `#awards, #gonex, #certificates` exist.
  - `#awards` contains "2nd place", "EDHE/ABSA InnoVarsity", "Eastern Cape Regional Round", "Startup Grind All-Star Pitch Battle" and "17–18 Oct 2026".
  - `#gonex` contains the S2 vision sentence verbatim and a link to `https://gonex-website.vercel.app`.
  - 8 certificate cards render, 6 of them with images that open in the dialog.
  - Exactly 2 `.cert-card--text` cards exist, containing "Quality Work Experience Programme" and "UCT–Cortex Hub Fintech Lab 2026 Summer School".
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement** per spec §7. The vision sentence renders as a pull-quote over the beadband divider.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit**, then push.

### Task 11: Contact page

**Files:**
- Modify: `contact.html`, `assets/js/app.js`
- Test: `tests/contact.test.js`

**Interfaces:**
- Produces: `initContactForm(form: HTMLFormElement, status: HTMLElement)`, ported from S3's submit handler with the same messages.

- [ ] **Step 1: Write `tests/contact.test.js`.** It routes `https://formspree.io/**` to a stub,
  so nothing is actually sent. The tests assert:
  - `form#contact-form` has `action="https://formspree.io/f/mnjbagrl"` and the fields name, email, phone (optional), subject and message.
  - With the stub returning 200, submitting shows "Thanks! Your message has been sent." and empties the fields.
  - With the stub returning 500, submitting shows "Sorry, there was a problem sending your message."
  - The page shows `mailto:goso.yonga@gmail.com`, the four social URLs and "KuGompo City (East London), Eastern Cape".
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full suite, `npm test`. Expected: all PASS.
- [ ] **Step 5: Commit**, then push.

### Task 12: Capture pipeline and live-site captures

**Files:**
- Create: `tools/capture/capture.config.js`, `tools/capture/capture.js`
- Test: `tests/capture.test.js`
- Modify: `assets/js/data.js`
- Generate: `media/projects/{nova-journal,open-data-dashboard,thaba-shield}/{poster.webp,shot-N.webp,demo.mp4,demo.webm}`

**Interfaces:**
- Produces:
  - `capture.config.js` exports `Recipe[]`, where
    `Recipe = {slug, url?: string, start?: {cwd, cmd, readyUrl, env?}, viewport: "desktop"|"mobile", steps: Step[]}` and
    `Step = {goto: string} | {click: string} | {fill: [string, string]} | {scroll: number} | {wait: number} | {shot: true}`.
    The viewports are desktop 1440×900 and mobile 390×844 at deviceScaleFactor 2.
  - `capture.js` exports:
    - `ffmpegArgs(input: string, output: string, kind: "mp4"|"webm", crf: number): string[]`
    - `runRecipe(recipe, outDir: string, opts?: {url?: string}): Promise<{poster: string, shots: string[], mp4: string, webm: string}>`
    - a CLI: `node tools/capture/capture.js <slug...> [--url <override>]`

- [ ] **Step 1: Write `tests/capture.test.js`.** The tests assert:
  - `ffmpegArgs('a.webm','b.mp4','mp4',28)` includes, in order, `-c:v libx264`, `-pix_fmt yuv420p`, `-movflags +faststart`, `-an`, `-t 15` and `-crf 28`.
  - The `webm` variant includes `-c:v libvpx-vp9`, `-b:v 0` and `-an`.
  - Every config recipe has a unique slug present in `SITE.projects`, exactly one of `url` or `start`, and at least one `{shot:true}` step.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.** Requirements:
  - Record with `recordVideo`, then encode MP4 and WebM.
  - If an output exceeds 2,621,440 bytes, re-encode it with `crf + 4`, up to 3 times.
  - The first shot becomes the poster. Shots are PNG screenshots converted with ffmpeg `-c:v libwebp -q:v 78`.
  - The walk-throughs are the builder's choice. Show each app's main features visibly working, and never type personal data.
- [ ] **Step 4: Run** `node tools/capture/capture.js nova-journal open-data-dashboard thaba-shield`.
  Then **view every poster and shot image** and confirm each shows the real app (not an error page,
  a blank page or a cookie wall). Update `data.js` to `capture:"captured"` with the media paths.
  Then run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit**, then push.

### Task 13: Local-run captures (MoMali, Fintech API)

**Files:**
- Modify: `tools/capture/capture.config.js`, `assets/js/data.js`
- Generate: `media/projects/{momali,fintech-api}/…`

Work in the scratchpad clones. Use throwaway local secrets in an uncommitted `.env`.

- [ ] **Step 1: Start MoMali** with `docker compose up --build`, using throwaway
  `POSTGRES_PASSWORD` and `JWT_SECRET` values. Then run `npx expo export -p web` in
  `FRONTEND/MoMali`, serve `dist/` and point it at `http://localhost:8000`.
  Expected: `GET http://localhost:8000/docs` returns 200 and the web app loads.
- [ ] **Step 2: Start the Fintech API.** Run Postgres 16 in Docker, `pip install -r requirements.txt`
  into a venv, then `DATABASE_URL=postgresql://… uvicorn main:app --port 8010`.
  Expected: `GET /docs` returns 200.
- [ ] **Step 3: Add recipes.**
  - MoMali: mobile viewport, register a demo account through the UI and walk the main screens.
  - Fintech API: desktop, show `/docs`, then use "Try it out" on `POST /speakers/` and `GET /api-endpoint`.
  - Run `node tools/capture/capture.js momali fintech-api`, then view every image.
  - Set `media.demoData: true` and `capture: "captured"` on both.
- [ ] **Step 4: Fallback rule.** If an app cannot be brought to a working state, do not fake a
  capture. Leave it as `capture:"pending"`, record the exact blocker in `README.md` under
  "Capture status", and report it to the user.
- [ ] **Step 5: Run** `npm test`. Expected: PASS. Then commit and push.

### Task 14: Windows capture kit (for the later PC phase; not run now)

**Files:**
- Create: `tools/capture/capture-windows.ps1`
- Modify: `README.md`, adding a section "Capturing the Windows apps"

- [ ] **Step 1: Write the script.** For each of the 5 Web Forms slugs it:
  - checks the prerequisites: MSBuild or Visual Studio, IIS Express, SQL Server Express (and PostgreSQL for TutorConnect), Node 20+ and ffmpeg, and stops with a clear message if any is missing;
  - creates a database named `<App>_PortfolioDemo` from the repo's own seed and migration scripts, and never touches existing catalogs;
  - patches the connection string in a temporary copy of `Web.config`, never the working tree;
  - starts IIS Express on a free port;
  - runs `node tools/capture/capture.js <slug> --url http://localhost:<port>/`.
- [ ] **Step 2: Verify that it parses.** If `pwsh` exists, run
  `pwsh -NoProfile -Command "$null = [System.Management.Automation.Language.Parser]::ParseFile('tools/capture/capture-windows.ps1',[ref]$null,[ref]$e); if ($e) { $e; exit 1 }"`.
  Otherwise, note in the commit message that the parse was not verified here.
- [ ] **Step 3: Commit**, then push.

### Task 15: Final verification and README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update `README.md`** with these sections:
  - the stack
  - "Open `index.html`" and `npm run serve`
  - `npm test`
  - the image and capture commands
  - capture status per project
  - a link to the spec
  - how to add the held-back games later (a data-only change)
- [ ] **Step 2: Run `npm test`.** Expected: all PASS, with 0 failures.
- [ ] **Step 3: Take screenshots** of all 5 pages at 1440×900 and 390×844 (deviceScaleFactor 2) into the scratchpad. View each one, and fix any visual defect before going on.
- [ ] **Step 4: Run a contrast spot-check.** Use Playwright `page.evaluate` to read the computed
  colours of body text, muted text and buttons on both bone and ink. Expected: every ratio is at
  least 4.5:1 for normal text.
- [ ] **Step 5: Commit and push**, then report results to the user, with the screenshots attached.
