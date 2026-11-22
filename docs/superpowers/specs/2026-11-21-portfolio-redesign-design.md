# Portfolio Redesign — Design

**Date:** 2026-11-21
**Owner:** Yongama Goso (BigGee6566)
**Status:** Draft, awaiting approval
**Branch:** `claude/keen-franklin-gqohrd`

---

## 1. Intent and why

Yongama wants his personal portfolio rebuilt so it follows the structure and feel of
https://www.chumamemela.co.za/ (a personal-brand site for an AI trainer and startup coach), while
presenting *his own* work: every project he has built (including his public GitHub repos), his skills,
tools, experience, capabilities, growth and public recognition.

Two requirements came directly from him:

1. **Everything on the current site must still appear**: projects, skills, services, experience
   events with galleries, certificates, the contact form and the CV download.
2. **Every repo project must be shown as images or video of the application actually running**,
   the same way the four existing projects are shown with screenshots.

**Audience (confirmed 2026-11-21):** employers come first. The CV's profile says he is "seeking
opportunities to apply and further develop technical and analytical skills". The primary call to
action is **"Work with me"**, and **"Partner with Gonex"** is the secondary one for partners,
funders and schools.

## 2. Content sources (the only sources allowed)

Every factual statement on the site must trace to one of these. Anything else is either left out
or shown as an explicit "pending" item. Nothing is invented.

| ID | Source | Location |
|---|---|---|
| S1 | CV (uploaded 2026-11-21) | `YONGAMA_Goso_CV...pdf` (user upload) |
| S2 | Delegate Biography and Business Profile (uploaded 2026-11-21) | user upload |
| S3 | Current portfolio | `index.html` (this repo, commit `610e5cc`) |
| S4 | CV source | `cv/resume.html` |
| S5 | GitHub repo READMEs, code, metadata and commit history | the 10 repos in §6 |
| S6 | Live deployments, verified loading on 2026-11-21 | URLs in §6 |

## 3. Goals, non-goals, anti-goals

**Goals**
- Multi-page site that mirrors the reference's *structure and rhythm*: dark hero with a role ticker
  and huge stacked name, a counter strip, About with a portrait, "What I Do" cards, a photo-backed
  call-to-action band, an approach statement and a rich footer.
- A Projects page where each repo project shows a looping muted screen recording of the running
  app, a poster screenshot, and a click-through gallery.
- Sections for Skills & Tools, Capabilities, Experience, Growth (timeline), Public Recognition and
  Certificates.
- Re-runnable capture scripts so media can be refreshed when an app changes.

**Non-goals**
- No CMS, backend, blog or "Publications" page (he has no publications in the sources).
- No WordPress or Elementor.
- No copying of the reference site's text, images, code, logo or colour scheme.

**Anti-goals** (failure even if the site "works")
- Any fabricated number, date, award, quote or client.
- A site that looks like a clone of Chuma Memela's. Chuma Memela is one of his CV referees, so the
  resemblance would be noticed.
- Publishing his phone number, home street address, student email or referees' contact details.
- Media that is not a real capture of the real app: no mock-ups passed off as running software, and
  no AI-generated screenshots.
- A heavy first load. Event photos alone are 38 MB today.

## 4. Constraints

- **Hosting:** GitHub Pages, served from the repo root at `https://biggee6566.github.io/Yongama-Goso/`.
  Static files only, no build step (the README promises "no build steps required").
- **Stack:** HTML5, CSS3 and vanilla JavaScript, which match the skills the current site claims.
  External assets only from Google Fonts and pinned-version CDNs (Devicon and Font Awesome are
  already used; pin exact versions instead of `@latest`).
- **Contact form:** keep the existing Formspree endpoint `https://formspree.io/f/mnjbagrl`.
- **Public contact details:** email `goso.yonga@gmail.com`, LinkedIn, GitHub, Facebook, Instagram, the
  contact form, and location "KuGompo City (East London), Eastern Cape". No phone, street address,
  student email or referee contacts.
- **Repo scope (his choice):** his own public repos with real app code, plus the four projects
  already on the current site.
- **Windows-only apps** (ASP.NET Web Forms, .NET Framework 4.x, SQL Server, or PostgreSQL for
  TutorConnect) cannot run in the cloud build container. They are captured on his Windows PC
  through Claude Remote Control (his choice), as a **separate later phase**. The site ships first
  with those five cards in a labelled "capture pending" state. The PC phase:
  - creates new, separately named demo databases from each repo's own seed and migration scripts;
  - never reads or modifies his existing development databases, which may hold real data;
  - confirms with him before running anything on his PC.

## 5. Approaches considered

| | A. Hand-built static multi-page **(chosen)** | B. Astro + GitHub Actions | C. WordPress + Elementor |
|---|---|---|---|
| Fit | Same tech as the current site; free hosting at the existing URL; he can edit it himself | Components and image optimisation, but adds Node and a CI build | Same tooling as the reference |
| Cost | Free | Free | Paid PHP hosting plus an Elementor Pro licence |
| Risk | Shared header and footer repeated across pages; solved by a small JS include | A broken build blocks deploys | Cannot be built or version-controlled from this repo |

**Chosen: A.** He picked it on 2026-11-21. It keeps his GitHub Pages URL, needs no toolchain, and
matches his stated stack.

## 6. Projects in scope

The capture method is decided per project. "Live" means the URL loaded with real content on
2026-11-21 (S6).

| # | Project | Repo | Stack (from S5) | Capture method | Status |
|---|---|---|---|---|---|
| 1 | NOVA Journal (HexSoftwares blog) | `HexSoftwares_Simple_Blog_Website` | HTML, CSS, JS, localStorage | Live: `simple-blog-website-mu.vercel.app` | Ready |
| 2 | Open Data Dashboard | `open-data-api-dashboard` | HTML, CSS, JS, World Bank API | Live: GitHub Pages | Ready |
| 3 | Thaba Shield | `thaba-shield` | JS client, Python, Docker | Live: `thaba-shield.vercel.app` (description to be taken from code, since there is no README) | Ready |
| 5 | Fintech FastAPI tutorial API | `fintech_tut_fastAPI` | Python, FastAPI | Run `uvicorn` and capture the interactive `/docs` UI exercising real endpoints | Run here |
| 6 | TutorConnect | `TutorConnect` | VB.NET, ASP.NET Web Forms, PostgreSQL (per its `App_Data/Scripts/postgres`) | His Windows PC via Remote Control | Pending PC |
| 7 | StudyLink | `StudyLink` | C#, ASP.NET Web Forms, EF6, SQL Server | His PC | Pending PC |
| 8 | SmartShelf | `SmartShelf` | C#, ASP.NET Web Forms, SQL Server | His PC | Pending PC |
| 9 | BusNova | `BusNova_System` | C#, ASP.NET Web Forms, ADO.NET, SQL Server | His PC | Pending PC |
| 10 | Logisticore Courier Service | `C-Sharp-Shooter` | C#, ASP.NET Web Forms, .NET 4.8, SQL Server | His PC | Pending PC |
| 11 | PlaceMe | (current site) | HTML, CSS, JS, SQL | Existing screenshot, reused | Ready |
| 12 | EduRand | (current site) | HTML, CSS, JS, UI/UX | Existing screenshot | Ready |
| 13 | JourneyMap | (current site) | HTML, CSS, JS, React | Existing screenshot | Ready |
| 14 | Laundry Website | (current site) | HTML, CSS, JS | Existing screenshot | Ready |

MoMali (UCT-Cortex-Hub-Fintech-Hackathon) was removed at the owner's request on 2026-11-22.

Excluded by his choice: `Edurand_V2` and `UFH-MARKETPLACE` (README only), `hello-world`, this
portfolio repo, private repos and repos owned by others.

**Held back until the UCT INF4001N 2027 entrance exam is marked** (his decision, 2026-11-21):
- `SA-NQOBA`: 19 commits by BigGee6566 and 1 by AsandaDingezweni.
- `CONQUEST-GAME`: its only commit is authored by Liyema Vundle.

Neither appears anywhere on the site. Adding them later is a data-only change.

**Team projects** are labelled honestly, using the team names in the READMEs (for example "Nova
Tech Developers, UFH IFS303" for StudyLink and "C Sharp Shooters" for Logisticore). His individual
role is shown only if he confirms it.

**Demo data rule:** if an app needs data to look alive, use only the repo's own seed scripts or
data entered through the app's own UI during capture, and caption it "demo data".

## 7. Site structure

Five pages share one header (logo mark, nav, "Download CV") and one footer (about blurb, quick
links, capability list, contact, socials, copyright). The reference uses six pages (Home,
Services, Education, Publications, Speaking & Media, Contact). This site maps that flow onto
what exists in the sources:

| Page | File | Sections (in order) |
|---|---|---|
| Home | `index.html` | Hero (role ticker: Chief Problem Solver, Full-Stack Developer, Techpreneur, Founder of Gonex Innovation Hub [S2, S3]; stacked name YONGAMA / GOSO; portrait; buttons: **Work with me** as the primary (goes to Contact), View Projects, LinkedIn) → counter strip → About (bio from S2 and S3) → What I Do (capabilities, §8) → Featured projects (4 cards with video) → Recognition highlights → photo CTA band → My Approach (from his own words in S3) → footer |
| Projects | `projects.html` | Intro → filter chips (All, Web, Mobile/Expo, .NET, APIs, Games) → project grid (§9) → project modal |
| Journey | `journey.html` | Growth timeline (§10) → Experience (work and Gonex) → Events and hackathons (the 4 existing events with galleries, plus the inter-university hackathon mentor role) → Education → Skills & Tools (§8) → Languages |
| Recognition | `recognition.html` | Awards and selections (§10) → Gonex Innovation Hub profile and vision (S2) → Certificates gallery (6 existing plus YES and UCT–Cortex Hub from S1) |
| Contact | `contact.html` | Contact details (public set from §4) → Formspree form → socials |

The existing `#section` anchors (`#projects`, `#experience`, `#certificates`, `#contact`) must keep
working from old links. Home keeps lightweight anchor sections, or a small redirect script maps
them to the new pages.

## 8. Capabilities, skills and tools (evidence-linked)

**What I Do** has four capability cards. Each is sourced:
1. **Full-stack web and mobile development:** web apps, Expo mobile apps and database-driven systems [S1, S5].
2. **IT support:** first-line support, hardware and software troubleshooting, documentation (YES / Youth@Work) [S1].
3. **Digital skills facilitation and mentoring:** Gonex programmes; hackathon mentor [S1, S2].
4. **Tech entrepreneurship:** founder of Gonex Innovation Hub NPC and Gonex Hub (Pty) Ltd [S1, S2].

The current site's three services (Web Development, Graphic Design, Digital Marketing, from S3)
are carried over as a compact "Services" row, because they are his own claims from the current
site.

**Skills & Tools:** each tool chip lists the projects that use it ("Used in: …"), generated from
the project data so the claim is always backed by a project:
- Languages: HTML, CSS, JavaScript, TypeScript, C#, VB.NET, Python, SQL
- Frameworks: React, React Native/Expo, ASP.NET Web Forms, Entity Framework 6, FastAPI, Bootstrap
- Data: SQL Server, PostgreSQL, localStorage

The final chip list is whatever the in-scope projects' `stack` fields contain, plus the CV tools.
A technology with no in-scope project behind it is dropped (for example MongoDB and Groq, which
only the held-back games use).
- Tooling: Git/GitHub, Docker, Vercel, Visual Studio, Google Workspace, Microsoft Office (Word, Excel, PowerPoint, Access) [S1]
- Soft skills [S1]: teamwork, leadership, time management, effective communication, critical thinking, public relations

## 9. Project card and media design

**Data model:** one file, `assets/js/data.js`, exports `projects`, `experiences`, `timeline`,
`recognition`, `certificates`, `skills` and `counters`. All pages render from it. This extends
the data-driven experience-card pattern already in `index.html`.

```
project = {
  slug, title, tagline, description,      // tagline and description paraphrase the README or what the UI visibly does
  context,                                // e.g. "UFH IFS303 team project, Nova Tech Developers"
  categories: ["web","mobile","dotnet","api","game"],
  stack: ["C#","ASP.NET Web Forms", ...],
  repo, live,                             // live only if verified loading
  media: { poster, video: { mp4, webm }, shots: [...], demoData: bool },
  capture: "captured" | "pending-pc" | "existing-screenshot"
}
```

**Card:** the poster image shows first. On hover or focus (desktop), or when scrolled into view
(mobile), a muted looping clip of about 8–15 s plays. The card shows the title, tagline, stack
badges, and "Code" and "Live" buttons. Clicking opens a modal with a large video, description,
context, stack and a screenshot gallery.

**`pending-pc` state:** a branded cover built from the repo's own logo asset, labelled "Running
capture coming soon". It must not look like a screenshot.

**Media pipeline** (`tools/capture/`):
- `capture.config.js` sets, per project, either a URL or a local start command, plus a scripted
  walk-through (pages, clicks and scrolls that show the main features).
- `capture.js` runs Playwright at 1440×900 (desktop) and 390×844 (mobile, for Expo apps). It writes:
  - `media/projects/<slug>/poster.webp`
  - `shot-N.webp`
  - `demo.webm`, plus `demo.mp4` (H.264, faststart) through ffmpeg
- Clips are capped at about 15 s and about 2.5 MB each.
- A PowerShell twin (`capture-windows.ps1`) runs the same Playwright script on his PC against IIS
  Express for the five Web Forms apps.
- `tools/optimize-images.py` (Pillow) writes WebP copies of the event photos at 1600 px (gallery)
  and 640 px (thumbnails) to `media/events/…`. Originals stay in `Images/`.

## 10. Growth timeline and recognition (verified facts only)

**Timeline:**

| When | Entry | Source |
|---|---|---|
| 2020–2022 | National Senior Certificate, Tlokweng Senior Secondary School | S1 |
| 2023–2026 | BCom (Information Systems), University of Fort Hare (completed) | S1, S2 |
| 23 Jul 2025 | Certificate in Full Stack Development, FNB App Academy 2025 (issued by IT Varsity) | S1 |
| Sep 2025 – Sep 2026 | Software Developer (IT support), Youth@Work, YES Programme sponsored by Fairtree Asset Management | S1 |
| 12–31 Jan 2026 | UCT–Cortex Hub Fintech Lab 2026 Summer School, The Cortex Hub, East London | S1 |
| 1 Aug 2026 | Completed the 12-month YES Quality Work Experience Programme | S1 |
| 17–18 Oct 2026 | Mentor, Inter-University Hackathon (Eduvos, UFH, WSU, NMU), The Cortex Hub | S1 |
| *date pending* | Founded Gonex Innovation Hub NPC, Sterkspruit; facilitated its first 8-week programme | S1, S2 |
| *date pending* | Human Rights Hackathon, Telkom10X Hackathon, UCT Cortex Hub Fintech Hackathon, Startup Grind All-Star Pitch Battle | S3 |
| Rolling | GitHub project milestones, taken from repo dates | S5 |

**Recognition:**
- 2nd place, Social Impact Business category, University of Fort Hare internal EDHE/ABSA
  InnoVarsity competition; qualified for the Eastern Cape Regional Round. *(Gonex Innovation Hub, S2. Date pending.)*
- Finalist, East London Startup Grind All-Star Pitch Battle. *(S2, S3. Date pending.)*
- Mentor, Inter-University Hackathon, 17–18 Oct 2026. *(S1)*
- Certificates: the 6 on the current site [S3], plus the YES Quality Work Experience Programme and
  the UCT–Cortex Hub Fintech Lab Summer School [S1]. The repo has no images of the last two, so
  they get **text-only certificate cards** until he supplies scans (a data-only swap later).

**Counter strip:** only countable, sourced numbers, computed from `data.js` so they cannot drift:
- public projects on GitHub
- hackathons and pitch events
- certifications
- languages spoken (6) [S1]

Gonex reach numbers (people trained, schools visited) appear only if he supplies them.

## 11. Decisions and remaining questions

**Decided by Yongama (2026-11-21):**

| Topic | Decision |
|---|---|
| Build approach | A: static multi-page HTML/CSS/JS on GitHub Pages |
| Look | Same structure as the reference, his own colours |
| Public contact details | Email and socials only |
| Repo scope | Own public repos with app code, plus the 4 existing projects |
| Windows apps | Captured on his PC through Remote Control, in a later phase |
| Exam games | SA-NQOBA and CONQUEST held back until the exam is marked |
| Main call to action | "Work with me" (employers) first, "Partner with Gonex" second |

**Public CV (decided):**
- Rebuild `cv/resume.html` from S1: degree completed, Gonex founder, October 2026 mentor role and
  YES completion.
- Leave out the phone number, suburb and street address; the location reads "KuGompo City (East
  London), Eastern Cape".
- References become "available on request", with no referee names or contacts.
- Regenerate `Yongama_Goso_CV.pdf` with `sh cv/build.sh` and **replace** the current PDF, which
  publishes his phone number today.

**Builder's calls (he can overrule):**
- The PC capture is a separate later phase, with fresh demo databases as described in §4.
- The YES and UCT–Cortex Hub certificates use text-only cards.

**Still open (non-blocking; defaults apply until answered):**
- **Q3. Counter numbers, dates and media coverage:** Gonex reach, the InnoVarsity date, the
  Startup Grind date, the Gonex founding date and any press links. Default: show "pending" or omit.
- **Q4. His role in team projects** (StudyLink, TutorConnect, Logisticore and others). Default:
  show the team name only.

## 12. Visual direction (builder's call within these bounds)

The aim is the same structure as the reference, in his own colours. These are proposals he can
correct:

- **Palette:**
  - Ink `#0E1116` (hero, footer, CTA band)
  - Bone `#F5F1EA` (light content sections, instead of pure white)
  - One hot accent, vermilion `#FF5A36`, for emphasis, buttons and the ticker
  - One cool signal colour, teal `#14B8A6`, for "Live" and status chips only
  - No gold or orange-gold, which is the reference's accent.
  - Vermilion is never used for small text on Bone, because of contrast.
- **Type:**
  - *Big Shoulders Display* (condensed, 800–900) for the stacked name and section titles
  - *Instrument Sans* for body text (already in `cv/fonts/`)
  - *JetBrains Mono* for stack badges, counters and labels
  - Avoid Inter, Roboto, Arial and Space Grotesk.
- **Motif:** instead of the reference's orbit rings, use thin topographic contour lines (a nod to
  the Drakensberg foothills around Sterkspruit) behind the portrait. A geometric triangle band
  inspired by beadwork serves as the section divider.
- **Motion:** one staggered load sequence in the hero, the ticker, counters that animate once in
  view, and scroll reveals. Everything respects `prefers-reduced-motion`, which also stops video
  autoplay.
- **Layout:**
  - curved bottom edge on the dark hero, as the reference does
  - the counter card overlaps the hero edge
  - an asymmetric About section
  - must work at 360 px wide, with no horizontal scroll and 16 px gutters

## 13. Quality bar

- Accessibility:
  - WCAG 2.2 AA contrast
  - keyboard-operable modals with focus trap and Escape to close
  - alt text on every image
  - captions or labels on videos (silent clips, so no audio captions are needed)
- Performance: Home loads at most about 2.5 MB before interaction. Videos use `preload="none"`
  with posters, images use `loading="lazy"`, and fonts are subset with `display=swap`.
- **Verification:** Playwright screenshots of every page at 1440 px and 390 px, link check, console
  clean, form posts to Formspree.

## 14. Left to the builder

- exact CSS, spacing, animation timing
- copy wording within the facts in §2
- walk-through steps for each capture
- file names under `media/`
- how the shared header and footer are injected
- the old-anchor redirect mechanism
