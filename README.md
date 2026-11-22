## Hi there
This is my personal developer portfolio website built using **HTML, CSS, and JavaScript**.
It showcases my skills, projects, certificates, experience, and contact information in a clean, modern, and responsive design.

---

## About the Portfolio

This portfolio was created to:
- Present my **projects** and the tools used
- Display my **technical skills**
- Showcase my **certificates and achievements**
- Highlight my **experience** through real events and hackathons
- Provide an easy way to **contact me**

The design focuses on simplicity, readability, and a professional layout inspired by modern UI principles.

---

## Technologies Used

- **HTML5** - Page structure and content
- **CSS3** - Styling, layout, responsiveness, and animations
- **JavaScript (Vanilla)** - Dynamic experience cards, modal, and form submission
- **Font Awesome** - Social media icons
- **Devicon** - Technology skill icons

---

## Features

- Responsive layout (desktop, tablet, mobile)
- Hero section with profile image and social links
- Skills section with technology icons
- Projects section with descriptions and tool badges
- Experience section with 4 event cards
- Fullscreen modal with hero image, highlights, and gallery
- Certificates gallery (6 certificates) with lightbox previews
- Contact form connected to Formspree (real email submissions)
- Clean dark-themed design with cyan accent colors

---

## Structure

- `index.html` - Main layout and styles
- `script` - Experience data, modal behavior, and contact form submission
- `Images/` - All images used in the portfolio (projects, certificates, experience galleries)
- `Yongama_Goso_CV.pdf` - The CV served by the "Download CV" button. Edit `cv/resume.html`, then run `sh cv/build.sh` to regenerate it

---

## Run Locally

Open `index.html` in your browser. No build steps required.

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
