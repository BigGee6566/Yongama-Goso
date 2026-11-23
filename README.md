# Yongama Goso: portfolio site

The personal portfolio of Yongama Goso, a full-stack developer and the founder of Gonex Innovation Hub in Sterkspruit, Eastern Cape. It is live at https://biggee6566.github.io/Yongama-Goso/.

It has five pages:

| Page | File | What it shows |
| --- | --- | --- |
| Home | `index.html` | Intro, counters, what I do, featured projects, recognition, approach |
| Projects | `projects.html` | All 13 projects with filters, and a detail window with a demo clip |
| Journey | `journey.html` | Timeline, experience, events, education, skills, languages |
| Recognition | `recognition.html` | Awards, Gonex Innovation Hub, certificates |
| Contact | `contact.html` | Email, social links and a contact form (sent through Formspree) |

The design is written up in [`docs/superpowers/specs/2026-11-21-portfolio-redesign-design.md`](docs/superpowers/specs/2026-11-21-portfolio-redesign-design.md).

---

## The stack

- Plain HTML, CSS and vanilla JavaScript. There is no framework and **no build step**: the files in this repo are the files that get served.
- Hosted on GitHub Pages (the `.nojekyll` file tells Pages to serve the files as they are).
- Fonts come from Google Fonts. Icons come from Font Awesome and Devicon (both loaded from a CDN).
- Node.js and Playwright are only used for the tests and the capture tool. They are not part of the site.

How the code is laid out:

- `assets/js/data.js` holds all the content (projects, events, certificates, timeline and so on).
- `assets/js/render.js` turns that content into HTML.
- `assets/js/app.js` and `assets/js/modal.js` add behaviour (menu, filters, the project window, counters, scroll effects).
- `assets/css/tokens.css`, `layout.css` and `components.css` hold the styles. Colours, fonts and spacing are defined once in `tokens.css`.
- `media/` holds the optimised images and the project demo clips. `Yongama_Goso_CV.pdf` is the CV for the "Download CV" button; edit `cv/resume.html`, then run `sh cv/build.sh` to regenerate it.
- `tools/` holds the image optimiser and the capture tool. `tests/` holds the tests.

---

## How to view it

Either open `index.html` directly in your browser, or run a small local server:

```sh
npm install        # once, to get Playwright (only needed for tests and captures)
npm run serve      # prints a URL such as http://127.0.0.1:12345; open it
```

`npm run serve` runs `tests/helpers/serve-cli.js`, which serves the repo folder on a free local port. Stop it with Ctrl+C.

---

## Running the tests

```sh
npm test
```

This runs `node --test`, which finds every `*.test.js` file under `tests/`. Always use `npm test`: running `node --test tests/` can behave differently. The browser tests need Playwright's Chromium (`npx playwright install chromium`).

What the tests guard:

- **Privacy** (`tests/privacy.test.js`, `tests/privacy-helper.test.js`): no served file and not this README may contain a phone link (the `tel` URL scheme), a South African mobile number, an email address other than the public one, any of the private values (checked when the git-ignored private values file is present), the held-back game names, or the name of a project the owner asked to remove. See "The privacy guard" below.
- **Data** (`tests/data.test.js`): the content is complete and consistent. There are 13 projects in order, slugs are unique, categories are valid, capture states match their media, every media path exists, demo clips are small, dates are real or say "Date to be confirmed", and contact details are only the public set.
- **Pages** (`home`, `projects`, `journey`, `recognition`, `contact`, `shell`, `render` tests): each page renders the right content in a real browser, filters and counters work, and the shared header and footer are present.
- **Accessibility behaviours**: the mobile menu opens and closes, the project window is a labelled dialog that traps focus, closes with Escape and the close button, and returns focus. Animations respect reduced motion, and the role ticker can be paused.
- **Tools** (`optimize-images.test.js`, `capture.test.js`, `cv.test.js`, `harness.test.js`): the image optimiser, capture tool and CV build do what they say.

---

## How the content works

Nearly everything you read on the site lives in **`assets/js/data.js`**. To change a project, an event, a certificate, a date or a line of text, edit that file and refresh the page. You do not need to touch the HTML.

Comments in `data.js` marked "source" or `S3`, `S5`, `S6` and so on say where each piece of text came from (the old site, a repository README, a verified live link). Keep that habit: when you add or change something, say where it came from, and do not state anything you cannot back up. Where a date is not known, the text is exactly `Date to be confirmed`.

Run `npm test` after editing. The data tests catch missing images, wrong counts and typos in categories.

---

## Images

Source photos stay where they are (`Images/`). The optimiser writes small WebP copies into `media/` and records them in `media/manifest.json`:

```sh
python3 tools/optimize-images.py --repos <folder that contains your cloned project repos>
```

It needs Python 3 with Pillow. It does not delete or change your original images; it only writes into `media/`. It is safe to run again, and it removes manifest entries for files it no longer produces. Logos for the Windows apps are taken from the cloned repos, so point `--repos` at the folder that holds them.

---

## Captures (demo clips and screenshots)

Project demo clips and screenshots are recorded from the **running** app with the capture tool:

```sh
npm run capture -- <slug>
# or
node tools/capture/capture.js <slug>
```

Add `--url <address>` to record an app running somewhere else. It needs Playwright and `ffmpeg`. Each recipe lives in `tools/capture/capture.config.js`. The tool writes `poster.webp`, `shot-1.webp` and so on, and `demo.mp4` and `demo.webm` into `media/projects/<slug>/`.

**Never put capture files in `media/manifest.json`.** The image optimiser removes manifest entries it does not produce, so capture media would be deleted from the manifest on the next run. `data.js` points at the capture files directly, and `tests/data.test.js` checks that they exist and that each clip is at most 2,621,440 bytes.

### Capture status

| Project | Slug | Status |
| --- | --- | --- |
| NOVA Journal | `nova-journal` | Captured, recorded from the live site |
| Open Data Dashboard | `open-data-dashboard` | Captured, recorded from the live site |
| ThabaShield | `thaba-shield` | Captured, recorded from the live site |
| Fintech FastAPI Tutorial API | `fintech-api` | Captured, from a local run with demo data |
| TutorConnect | `tutorconnect` | Pending: needs the Windows PC steps below |
| StudyLink | `studylink` | Pending: needs the Windows PC steps below |
| SmartShelf | `smartshelf` | Pending: needs the Windows PC steps below |
| BusNova | `busnova` | Pending: needs the Windows PC steps below |
| Logisticore Courier Service | `logisticore` | Pending: needs the Windows PC steps below |
| PlaceMe | `placeme` | Existing screenshot (no recording) |
| EduRand | `edurand` | Existing screenshot (no recording) |
| JourneyMap | `journeymap` | Existing screenshot (no recording) |
| Laundry Website | `laundry` | Existing screenshot (no recording) |

The "capture kit" for the five pending apps is ready, but it has not been run yet. Until it is, their cards say "Running capture coming soon".

---

## Adding the two held-back exam games later

Two entrance-exam games are held back until the exam has been marked, so they are not on the site and are not named anywhere in this repo. When it is time to add them, it is a data-only change:

1. Add a project entry for each in `assets/js/data.js` (slug, title, tagline, description, stack, repo and so on), following the existing entries.
2. Record them with the capture tool, or give them a logo or screenshot and mark them `existing-screenshot`, the same way as the other projects.
3. Update the numbers the data tests expect (the project count of 13 and the category counts in `tests/data.test.js`, and the nine-repo and counter checks if they apply), and the "Public projects" counter input in `data.js` if it changes.
4. Make sure the privacy tests still pass. The two names are deliberately not in any test list today, so there is nothing to remove there; just do not add them to the "removed project" list in `tests/privacy.test.js`.
5. Run `npm test`, then commit.

No HTML or CSS change is needed, because the project cards and filters are built from the data.

---

## The privacy guard

Some personal details must never appear on the public site. `tests/privacy.test.js` scans every served file (what git would publish, minus `tests/`, `tools/`, `docs/` and `node_modules/`) and this README, in two layers.

**Always on.** These rules need no private file, so they run in every clone:

- no phone link (the `tel` URL scheme) anywhere;
- no South African mobile number (`+27` or a leading `0`, then `6x`, `7x` or `8x` and seven more digits, spaced, hyphenated or split across tags);
- no email address other than `goso.yonga@gmail.com`.

`tests/cv.test.js` applies the same rules to the text of `Yongama_Goso_CV.pdf`.

**Private values.** The exact private values (contact and other personal details that must stay off the site) are listed only in a plain-text file of `label|value` lines that is **never committed**. By default it is `.superpowers/sdd/2026-11-21-portfolio-redesign/forbidden-plaintext.txt`, which the root `.gitignore` ignores; set `PORTFOLIO_PRIVATE_VALUES` to use a file somewhere else. At test time the file is read into memory, and each value is compared with the text by SHA-256, so the tests and their output only ever name the labels. Nothing derived from the values (no hash, no list) is written to disk or committed. Where the file is absent, as in a fresh clone, these checks are skipped with a message that says so, and the always-on rules still run.

**Never commit the plaintext file.** Do not paste the values into any file, issue or commit message either, and do not write them in this README, because the test scans it.

Public contact details on the site are limited to that email address and social links.

---

## Capturing the Windows apps (on your PC)

TutorConnect, StudyLink, SmartShelf, BusNova and Logisticore are ASP.NET Web Forms apps, so they cannot be recorded in the Linux build container. Until they are recorded their cards say "Running capture coming soon". `tools/capture/capture-windows.ps1` records them on a Windows PC with the existing capture tool.

### Prerequisites

The script checks all of these first and stops with a message naming anything missing:

- Visual Studio 2022 (or Build Tools) with the ASP.NET and web development workload (MSBuild, found with `vswhere`) and IIS Express
- SQL Server Express with `sqlcmd` (default instance `.\SQLEXPRESS`, change it with `-SqlInstance`)
- PostgreSQL with `psql`, running locally (TutorConnect only), and `$env:PGPASSWORD` set to its password
- Node.js 20 or newer, `ffmpeg`, and Playwright (`npm install`, then `npx playwright install chromium`)
- The five repositories checked out side by side (`BigGee6566_TutorConnect`, `BigGee6566_StudyLink`, `BigGee6566_SmartShelf`, `BigGee6566_BusNova_System`, `BigGee6566_C-Sharp-Shooter`)

### The command

Run it with `-WhatIf` first, then one slug at a time (for example `-Slugs smartshelf`), before recording all five.

```powershell
.\tools\capture\capture-windows.ps1 -ReposRoot C:\path\to\the\checkouts
```

Add `-WhatIf` for a dry run that only prints the plan, `-Slugs studylink,smartshelf` to record some of them, `-SqlInstance 'localhost\SQLEXPRESS'` or `-PgHost`, `-PgPort`, `-PgUser` for other servers, and `-Force` to rebuild demo databases from a previous run.

### What it does

For each app: it creates a new database named `<App>_PortfolioDemo` (`StudyLink_PortfolioDemo`, `SmartShelf_PortfolioDemo`, `BusNova_PortfolioDemo`, `Logisticore_PortfolioDemo` in SQL Server, `tutorconnect_portfoliodemo` in local PostgreSQL, lower case on purpose) from the repo's own scripts, copies the project to `%TEMP%\portfolio-capture\<slug>`, points the copy at that database, builds it with MSBuild, starts IIS Express on a free port, runs `node tools/capture/capture.js <slug> --url http://localhost:<port>/`, and stops IIS Express. The demo login is read at run time from the repo's own docs (SmartShelf `README.md`, BusNova and Logisticore `CREDENTIALS.md`); for StudyLink and TutorConnect the script generates a throw-away password and creates the admin account through the app. If no login is found, only the public screens are recorded.

### What it does not touch

- Your existing databases: it only ever creates, and with `-Force` drops, databases whose name ends in `_PortfolioDemo`. The repos' SQL scripts hard-code their own database names, so every occurrence of the original name is rewritten to the demo name in a temporary copy, and the copy only runs if it then passes a strict check: the original name appears nowhere, there are no sqlcmd directives (`:connect`, `:r`, `!!`), and no statement names another database. TutorConnect's PostgreSQL script must contain no `\` meta-commands and no database, role or server statements. Config patching also fails closed (no connection string found, `configSource`, or a string with no database name aborts the run), and `-PgHost` must be localhost, 127.0.0.1 or ::1.
- The repositories' working trees: every change (connection strings, cookie settings, local settings) is made in the temporary copy, which is always deleted at the end, even after an error or Ctrl+C (`-KeepTemp` keeps it; those files may contain your local PostgreSQL password).
- The hosted Supabase database: TutorConnect is pointed at your local PostgreSQL, and the script refuses to start if any config it will use names a hosted database.
- `assets/js/data.js`: the script never edits it, and no credential is written to any file in this repo.

### After it finishes: update data.js

For each recorded slug the script prints the exact edit. In `assets/js/data.js`, in that project, replace `capture: 'pending-pc'` and its `media: noCapture(...)` line with:

```js
capture: 'captured',
media: {
  poster: 'media/projects/<slug>/poster.webp',
  shots: ['media/projects/<slug>/shot-1.webp', 'media/projects/<slug>/shot-2.webp'],
  demoData: true,
  video: { mp4: 'media/projects/<slug>/demo.mp4', webm: 'media/projects/<slug>/demo.webm' }
}
```

List every `shot-N.webp` the script prints. `demoData` is `true` because the recording shows seeded demo data. Review the clips, then run `npm test` and commit the `media/projects/<slug>/` files together with the `data.js` change.
