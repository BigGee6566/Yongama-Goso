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
 *     Any step may add requires:'NAME': it is skipped unless that environment variable is set.
 *     A fill value of '$env:NAME' is read from the environment when the step runs. A recipe
 *     never holds a credential: the Windows kit (capture-windows.ps1) sets DEMO_USER and
 *     DEMO_PASS from each app's own documentation, or leaves them unset to skip the login.
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
  {
    // Fintech API (FastAPI): the generated /docs page. GET /api-endpoint, then POST /speakers/
    // with generic demo values. The API is run locally (native PostgreSQL, uvicorn on port
    // 8010), so run: node tools/capture/capture.js fintech-api --url http://localhost:8010
    slug: 'fintech-api',
    url: 'http://localhost:8010',
    viewport: 'desktop',
    steps: [
      { goto: '/docs' },
      { wait: 1200 },
      { shot: true },                                              // poster: the endpoint list
      { click: '#operations-default-first_api_api_endpoint_get .opblock-summary' },
      { click: '#operations-default-first_api_api_endpoint_get button.try-out__btn' },
      { click: '#operations-default-first_api_api_endpoint_get button.execute' },
      { wait: 1500 },
      { shot: true },                                              // GET response visible
      { click: '#operations-default-first_api_api_endpoint_get .opblock-summary' },
      { click: '#operations-default-create_speaker_speakers__post .opblock-summary' },
      { click: '#operations-default-create_speaker_speakers__post button.try-out__btn' },
      { fill: ['#operations-default-create_speaker_speakers__post textarea.body-param__text', '{\n  "name": "Demo Speaker",\n  "bio": "A demo speaker bio",\n  "company": "Demo Company"\n}'] },
      { wait: 600 },
      { shot: true },                                              // request body filled in
      { click: '#operations-default-create_speaker_speakers__post button.execute' },
      { wait: 1500 },
      { scroll: 760 },
      { shot: true },                                              // 200 response visible
    ],
  },

  // ---------------------------------------------------------------------------------------------
  // The five ASP.NET Web Forms apps. They cannot run in the Linux build container, so they are
  // recorded on the owner's Windows PC by tools/capture/capture-windows.ps1. That script builds
  // each site in a temporary copy, points it at a NEW *_PortfolioDemo database, starts IIS
  // Express and runs `node tools/capture/capture.js <slug> --url http://localhost:<port>/`.
  // The url below is only a placeholder: --url replaces it.
  //
  // Logins: the script puts the demo account into DEMO_USER / DEMO_PASS for this one process;
  // these recipes only ever name those variables. With no demo login found, the steps marked
  // requires:'DEMO_USER' are skipped and only the public screens are recorded. Every step is
  // read-only (the walk-through is played twice, so nothing may change state). Selectors end in
  // [id$="..."] because Web Forms prefixes control ids with the container name.
  // ---------------------------------------------------------------------------------------------
  {
    // TutorConnect (VB.NET, PostgreSQL). The login is the administrator the script creates
    // through the app's own first-run setup page, so only the admin screens are shown.
    slug: 'tutorconnect',
    url: 'http://localhost:0/',
    viewport: 'desktop',
    steps: [
      { goto: '/Account/Login.aspx' },
      { wait: 900 },
      { shot: true },
      { fill: ['input[id$="txtUserName"]', '$env:DEMO_USER'], requires: 'DEMO_USER' },
      { fill: ['input[id$="txtPassword"]', '$env:DEMO_PASS'], requires: 'DEMO_USER' },
      { click: 'input[id$="btnLogin"]', requires: 'DEMO_USER' },
      { wait: 1500, requires: 'DEMO_USER' },
      { goto: '/Admin/Dashboard.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
      { goto: '/Admin/Users/ManageUsers.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
      { goto: '/Admin/Subjects/ManageSubjects.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
    ],
  },
  {
    // StudyLink (C#, EF6, SQL Server): the public pages, then the System Admin's screens.
    slug: 'studylink',
    url: 'http://localhost:0/',
    viewport: 'desktop',
    steps: [
      { goto: '/' },
      { wait: 900 },
      { shot: true },
      { goto: '/Catalogue/Books.aspx' },
      { wait: 800 },
      { shot: true },
      { goto: '/Account/Login.aspx' },
      { wait: 600 },
      { fill: ['input[id$="Identifier"]', '$env:DEMO_USER'], requires: 'DEMO_USER' },
      { fill: ['input[id$="Password"]', '$env:DEMO_PASS'], requires: 'DEMO_USER' },
      { click: 'input[id$="LoginButton"]', requires: 'DEMO_USER' },
      { wait: 1500, requires: 'DEMO_USER' },
      { goto: '/Admin/Dashboard.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
      { goto: '/Admin/AuditLog.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
    ],
  },
  {
    // SmartShelf (C#, EF6, SQL Server): the sign-in page, then the Store Manager's screens.
    slug: 'smartshelf',
    url: 'http://localhost:0/',
    viewport: 'desktop',
    steps: [
      { goto: '/Login.aspx' },
      { wait: 900 },
      { shot: true },
      { fill: ['input[id$="txtUsername"]', '$env:DEMO_USER'], requires: 'DEMO_USER' },
      { fill: ['input[id$="txtPassword"]', '$env:DEMO_PASS'], requires: 'DEMO_USER' },
      { click: 'input[id$="btnLogin"]', requires: 'DEMO_USER' },
      { wait: 1500, requires: 'DEMO_USER' },
      { goto: '/Manager/Dashboard.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
      { goto: '/Manager/Inventory.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
      { goto: '/Manager/Reports.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
    ],
  },
  {
    // BusNova (C#, ADO.NET, SQL Server): the public home, then the manager's screens.
    slug: 'busnova',
    url: 'http://localhost:0/',
    viewport: 'desktop',
    steps: [
      { goto: '/Home.aspx' },
      { wait: 900 },
      { shot: true },
      { goto: '/Login.aspx' },
      { wait: 600 },
      { fill: ['input[id$="txtEmail"]', '$env:DEMO_USER'], requires: 'DEMO_USER' },
      { fill: ['input[id$="txtPassword"]', '$env:DEMO_PASS'], requires: 'DEMO_USER' },
      { click: 'input[id$="btnLogin"]', requires: 'DEMO_USER' },
      { wait: 1500, requires: 'DEMO_USER' },
      { goto: '/Dashboard.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
      { goto: '/ReportTicketSales.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
      { goto: '/LiveMap.aspx', requires: 'DEMO_USER' },
      { wait: 1500, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
    ],
  },
  {
    // Logisticore (C#, ADO.NET, SQL Server): the sign-in page, then the Staff Portal admin screens.
    slug: 'logisticore',
    url: 'http://localhost:0/',
    viewport: 'desktop',
    steps: [
      { goto: '/Default.aspx' },
      { wait: 900 },
      { shot: true },
      { goto: '/Login.aspx' },
      { wait: 600 },
      { click: '#btnRoleStaff', requires: 'DEMO_USER' },
      { fill: ['input[id$="txtEmail"]', '$env:DEMO_USER'], requires: 'DEMO_USER' },
      { fill: ['input[id$="txtPassword"]', '$env:DEMO_PASS'], requires: 'DEMO_USER' },
      { click: 'input[id$="btnLogin"]', requires: 'DEMO_USER' },
      { wait: 1500, requires: 'DEMO_USER' },
      { goto: '/Admin/Dashboard.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
      { goto: '/Admin/Shipments.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
      { goto: '/Ops/Dashboard.aspx', requires: 'DEMO_USER' },
      { wait: 900, requires: 'DEMO_USER' },
      { shot: true, requires: 'DEMO_USER' },
    ],
  },
];
