/* data.js: all of the site's content, in one object called SITE.

   Every fact traces to a source (see the design spec, section 2):
     S1 his latest CV, S2 his biography and business profile, S3 the old site's index.html,
     S5 the project repos (README, code), S6 the live deployments.
   Anything without a source is left out, or shown as "Date to be confirmed".

   The wrapper below is the "UMD" pattern: the same file works in two places.
   - In the browser (a classic <script>), there is no `module`, so SITE
     becomes a global variable that render.js and app.js can read.
   - In Node (the tests), `module.exports` exists, so require() returns SITE. */
(function (root, factory) {
  var SITE = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = SITE;
  } else {
    root.SITE = SITE;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PENDING = 'Date to be confirmed';

  // The gallery-size photos of one event, media/events/<folder>/01-1400.webp to NN-1400.webp,
  // in the old site's order (see media/manifest.json).
  function gallery(folder, count) {
    var out = [];
    for (var i = 1; i <= count; i++) {
      out.push('media/events/' + folder + '/' + (i < 10 ? '0' : '') + i + '-1400.webp');
    }
    return out;
  }

  // Media for a project that has no running capture yet (Tasks 12-13 replace it).
  function noCapture(poster) {
    return { poster: poster, shots: [], demoData: false };
  }

  return {
    // Public contact set only (S1, S3). Never a phone number, street address or referee.
    person: {
      name: 'Yongama Goso',
      location: 'KuGompo City (East London), Eastern Cape',
      email: 'goso.yonga@gmail.com',
      socials: {
        linkedin: 'https://www.linkedin.com/in/yongama-goso-85aaaa2b0',
        github: 'https://github.com/BigGee6566',
        facebook: 'https://www.facebook.com/yongama.ow.gee',
        instagram: 'https://www.instagram.com/big_gee_the_one_and_only/'
      },
      cv: 'Yongama_Goso_CV.pdf',
      portrait: { large: 'media/profile/portrait-1200.webp', small: 'media/profile/portrait-640.webp' }
    },

    // Hero ticker (S2 titles, S3 "Full Stack Developer", S1/S2 Gonex).
    roles: ['Chief Problem Solver', 'Full-Stack Developer', 'Techpreneur', 'Founder, Gonex Innovation Hub'],

    // S2 paragraphs 1-2, in the first person; the third from S3's About text.
    about: [
      'I am a Chief Problem Solver, techpreneur and the founder of Gonex Innovation Hub, from Sterkspruit in the Joe Gqabi District of the Eastern Cape. I have completed a Bachelor of Commerce in Information Systems at the University of Fort Hare, and I have practical experience in software development, IT support, digital skills facilitation, mentorship and technology-driven problem-solving.',
      'I am driven by a passion for using technology and entrepreneurship to address socioeconomic challenges, and I am particularly committed to expanding access to digital opportunities in underserved and rural communities. My work focuses on giving young people and women practical digital skills, entrepreneurial knowledge and the chance to take part in the growing digital economy.',
      'As a full-stack developer, I enjoy building complete, end-to-end digital products, from clean, responsive user interfaces to reliable backend systems and databases. I care about how things look, how they work, and how users experience them as a whole.'
    ],

    // "What I do" cards (spec §8). Titles match the site footer; text from S1 and S2.
    capabilities: [
      {
        icon: 'fa-solid fa-code',
        title: 'Full-stack web & mobile development',
        text: 'I develop and deploy web applications, full-stack mobile applications built with Expo, and database-driven systems.',
        source: 'S1, S5'
      },
      {
        icon: 'fa-solid fa-screwdriver-wrench',
        title: 'IT support',
        text: 'At Youth@Work on the YES Programme I gave first-line IT support, troubleshooting desktop, notebook and printer faults across hardware and software and documenting each fix.',
        source: 'S1'
      },
      {
        icon: 'fa-solid fa-chalkboard-user',
        title: 'Digital skills facilitation & mentoring',
        text: 'I facilitated the first Gonex Innovation Hub programmes over 8 weeks and mentored participants at a two-day inter-university hackathon at The Cortex Hub, East London.',
        source: 'S1, S2'
      },
      {
        icon: 'fa-solid fa-rocket',
        title: 'Tech entrepreneurship',
        text: 'I am the founder of Gonex Innovation Hub NPC and Gonex Hub (Pty) Ltd, and I am driven to use technology and entrepreneurship to address socioeconomic challenges.',
        source: 'S1, S2'
      }
    ],

    // The old site's three service cards, verbatim (S3).
    services: [
      { title: 'Web Development', text: 'I build responsive websites that look modern, load fast, and work on phones and PCs.' },
      { title: 'Graphic Design', text: 'I create clean designs for brands, posters, and UI layouts with a modern style.' },
      { title: 'Digital Marketing', text: 'I help businesses improve online presence with simple content strategies and planning.' }
    ],

    // Three lines from the old site's About text, verbatim (S3).
    approach: [
      'I learn by building real projects and solving real problems.',
      'I value clarity, structure, and scalability, and I aim to write code that is both practical and maintainable.',
      'I approach every project with discipline, curiosity, and a mindset of continuous improvement.'
    ],

    // The 13 in-scope projects, in spec §6 order. Copy paraphrases each repo's README or code (S5);
    // the last four keep the old site's title and description verbatim (S3). Live links: S6.
    // context names the team, course or programme the repo names (README, docs or team page), else "Personal project".
    projects: [
      {
        slug: 'nova-journal',
        title: 'NOVA Journal',
        tagline: 'A technology and creativity blog in plain HTML, CSS and JavaScript.',
        description: 'Built for Task 1 of the Hex Softwares Web Development Internship. Readers can search, filter by topic, sort and bookmark articles, switch between dark and light themes, and write new posts with an image upload that is resized in the browser. Posts, bookmarks, comments and form entries are kept in localStorage, so they stay in the browser that created them; the contact and newsletter forms do not send anything.',
        context: 'Hex Softwares Web Development Internship, Task 1',
        categories: ['web'],
        stack: ['HTML', 'CSS', 'JavaScript', 'localStorage'],
        repo: 'https://github.com/BigGee6566/HexSoftwares_Simple_Blog_Website',
        live: 'https://simple-blog-website-mu.vercel.app',
        capture: 'captured',
        media: {
          poster: 'media/projects/nova-journal/poster.webp',
          shots: ['media/projects/nova-journal/shot-1.webp', 'media/projects/nova-journal/shot-2.webp', 'media/projects/nova-journal/shot-3.webp', 'media/projects/nova-journal/shot-4.webp'],
          demoData: false,
          video: { mp4: 'media/projects/nova-journal/demo.mp4', webm: 'media/projects/nova-journal/demo.webm' }
        }
      },
      {
        slug: 'open-data-dashboard',
        title: 'Open Data Dashboard',
        tagline: 'World Bank indicators, charted by country.',
        description: 'Fetches GDP, population and inflation figures for a chosen country from the World Bank Open Data API, and shows the latest values as summary cards, line charts and a table. It has loading states and error handling, and a responsive layout built with CSS Grid and Flexbox.',
        context: 'Personal project',
        categories: ['web'],
        stack: ['HTML', 'CSS', 'JavaScript', 'World Bank API', 'Chart.js'],
        repo: 'https://github.com/BigGee6566/open-data-api-dashboard',
        live: 'https://biggee6566.github.io/open-data-api-dashboard/',
        capture: 'captured',
        media: {
          poster: 'media/projects/open-data-dashboard/poster.webp',
          shots: ['media/projects/open-data-dashboard/shot-1.webp', 'media/projects/open-data-dashboard/shot-2.webp', 'media/projects/open-data-dashboard/shot-3.webp', 'media/projects/open-data-dashboard/shot-4.webp'],
          demoData: false,
          video: { mp4: 'media/projects/open-data-dashboard/demo.mp4', webm: 'media/projects/open-data-dashboard/demo.webm' }
        }
      },
      {
        slug: 'thaba-shield',
        title: 'ThabaShield',
        tagline: 'A three-layer security console with an Expo client and a FastAPI hub.',
        description: 'A security dashboard with three layers: a document scanner that checks uploaded files with SHA-256 hashes and heuristic risk scoring, API anomaly detection that uses an Isolation Forest model to flag outliers in API traffic, and SafeCharge, which monitors telemetry from EV charging stations. The Expo client runs on web, iOS and Android, the FastAPI hub stores events in PostgreSQL, and the services run with Docker Compose. The API traffic and charging-station telemetry come from a traffic generator and a software emulator, not real devices.',
        context: 'Team project',
        categories: ['mobile'],
        stack: ['JavaScript', 'React Native/Expo', 'Python', 'FastAPI', 'PostgreSQL', 'SQLAlchemy', 'Docker'],
        repo: 'https://github.com/BigGee6566/thaba-shield',
        live: 'https://thaba-shield.vercel.app',
        capture: 'captured',
        media: {
          poster: 'media/projects/thaba-shield/poster.webp',
          shots: ['media/projects/thaba-shield/shot-1.webp', 'media/projects/thaba-shield/shot-2.webp', 'media/projects/thaba-shield/shot-3.webp'],
          demoData: false,
          video: { mp4: 'media/projects/thaba-shield/demo.mp4', webm: 'media/projects/thaba-shield/demo.webm' }
        }
      },
      {
        slug: 'fintech-api',
        title: 'Fintech FastAPI tutorial API',
        tagline: 'A small tutorial API built with FastAPI and SQLAlchemy.',
        description: 'A tutorial API with a Hello World endpoint and an endpoint that saves speaker records to a database. SQLAlchemy models define speakers and their talks, and Pydantic schemas check the request and response data.',
        context: 'Personal project',
        categories: ['api'],
        stack: ['Python', 'FastAPI', 'SQLAlchemy', 'PostgreSQL'],
        repo: 'https://github.com/BigGee6566/fintech_tut_fastAPI',
        capture: 'captured',
        media: {
          poster: 'media/projects/fintech-api/poster.webp',
          shots: ['media/projects/fintech-api/shot-1.webp', 'media/projects/fintech-api/shot-2.webp', 'media/projects/fintech-api/shot-3.webp', 'media/projects/fintech-api/shot-4.webp'],
          demoData: true,
          video: { mp4: 'media/projects/fintech-api/demo.mp4', webm: 'media/projects/fintech-api/demo.webm' }
        }
      },
      {
        slug: 'tutorconnect',
        title: 'TutorConnect',
        tagline: 'A tutoring management system for students, tutors and administrators.',
        description: 'Students find tutors, request sessions, track their bookings and write reviews. Tutors publish their availability, accept or decline requests, and manage sessions and postponements. Administrators approve users, manage subjects and study levels, moderate reviews and read the audit log. Security includes PBKDF2 password hashing, account lockout, rate limiting and parameterised SQL.',
        context: 'Nova Tech Developers, UFH IFS303',
        categories: ['dotnet', 'web'],
        stack: ['VB.NET', 'ASP.NET Web Forms', 'PostgreSQL'],
        repo: 'https://github.com/BigGee6566/TutorConnect',
        capture: 'pending-pc',
        media: noCapture('media/projects/tutorconnect/logo.webp')
      },
      {
        slug: 'studylink',
        title: 'StudyLink',
        tagline: 'A books, tutoring and academic resource hub.',
        description: 'The web system for Forte Books & Tuition Hub, with campuses in Alice, East London and Bisho. It grows the team\'s earlier TutorConnect into a six-role platform for students, tutors, staff, suppliers, managers and system admins, covering tutoring bookings, textbook rentals and sales, fees and simulated card payments, supplier orders, operations and reporting.',
        context: 'Nova Tech Developers, UFH IFS303',
        categories: ['dotnet', 'web'],
        stack: ['C#', 'ASP.NET Web Forms', 'Entity Framework 6', 'SQL Server', 'Bootstrap'],
        repo: 'https://github.com/BigGee6566/StudyLink',
        capture: 'pending-pc',
        media: noCapture('media/projects/studylink/logo.webp')
      },
      {
        slug: 'smartshelf',
        title: 'SmartShelf',
        tagline: 'A supermarket management system.',
        description: 'Built for the Forte Supermarket scenario, it covers the checkout counter, the stockroom and the manager\'s office, with a supplier portal attached. Cashiers ring up sales and cash up their tills. Managers maintain the catalogue, track stock by batch and expiry date, raise purchase orders and run reports on top sellers, low stock, expiry and waste, and supplier performance. Suppliers confirm orders and see reports on their own products.',
        context: 'UFH IFS303E coursework',
        categories: ['dotnet', 'web'],
        stack: ['C#', 'ASP.NET Web Forms', 'Entity Framework 6', 'SQL Server'],
        repo: 'https://github.com/BigGee6566/SmartShelf',
        capture: 'pending-pc',
        media: noCapture('media/projects/smartshelf/logo.webp')
      },
      {
        slug: 'busnova',
        title: 'BusNova',
        tagline: 'Day-to-day management for a small bus operator.',
        description: 'Handles a small bus operator\'s daily work: fleet and route setup, driver and bus scheduling, fuel and maintenance logs, and passenger ticket sales and bookings. Data access is hand-written ADO.NET against SQL Server, and payments run in a sandbox, with no real payment gateway.',
        context: 'University systems-development coursework',
        categories: ['dotnet', 'web'],
        stack: ['C#', 'ASP.NET Web Forms', 'ADO.NET', 'SQL Server', 'Bootstrap'],
        repo: 'https://github.com/BigGee6566/BusNova_System',
        capture: 'pending-pc',
        media: noCapture('media/projects/busnova/logo.webp')
      },
      {
        slug: 'logisticore',
        title: 'Logisticore Courier Service',
        tagline: 'A courier and parcel-logistics web application.',
        description: 'Customers book, pay for and track parcels by waybill number, with a live map of the driver\'s position. Operations staff register, sort and route parcels, drivers work a delivery manifest, and admins manage users, the fleet, finance and reports with CSV export. Payments go through a sandbox gateway, so no real money moves.',
        context: 'C Sharp Shooters',
        categories: ['dotnet', 'web'],
        stack: ['C#', 'ASP.NET Web Forms', 'ADO.NET', 'SQL Server', 'Chart.js'],
        repo: 'https://github.com/BigGee6566/C-Sharp-Shooter',
        capture: 'pending-pc',
        media: noCapture('media/projects/logisticore/logo.webp')
      },
      {
        slug: 'placeme',
        title: 'PlaceMe – Student Accommodation Website',
        tagline: 'Affordable student residences near the University of Fort Hare.',
        description: 'A student accommodation website designed to help students find affordable residences near the University of Fort Hare. The platform includes property listings, navigation, and call-to-action features for applications and inquiries.',
        context: 'Personal project',
        categories: ['web'],
        stack: ['HTML', 'CSS', 'JavaScript', 'SQL'],
        capture: 'existing-screenshot',
        media: noCapture('media/projects/placeme/poster.webp')
      },
      {
        slug: 'edurand',
        title: 'EduRand – Financial Education App',
        tagline: 'Savings tracking, lessons and achievements for students.',
        description: 'A student-focused financial education platform that helps users track savings, complete lessons, and earn achievements.',
        context: 'Personal project',
        categories: ['web'],
        stack: ['HTML', 'CSS', 'JavaScript', 'UI/UX'],
        capture: 'existing-screenshot',
        media: noCapture('media/projects/edurand/poster.webp')
      },
      {
        slug: 'journeymap',
        title: 'JourneyMap – Customer Journey Platform',
        tagline: 'The customer journey, from awareness to advocacy.',
        description: 'A web platform that visualizes the customer journey from awareness to advocacy using a clean and structured interface.',
        context: 'Personal project',
        categories: ['web'],
        stack: ['HTML', 'CSS', 'JavaScript', 'React', 'Git', 'UI/UX'],
        capture: 'existing-screenshot',
        media: noCapture('media/projects/journeymap/poster.webp')
      },
      {
        slug: 'laundry',
        title: 'Laundry Website',
        tagline: 'Service sections and a pricing layout.',
        description: 'Responsive UI with service sections and pricing layout.',
        context: 'Personal project',
        categories: ['web'],
        stack: ['HTML', 'CSS', 'JavaScript'],
        capture: 'existing-screenshot',
        media: noCapture('media/projects/laundry/poster.webp')
      }
    ],

    // Events (the 4 old-site events verbatim from S3, plus the S1 mentor role), work (S1) and the venture (S2).
    // org is "" where no source names an organiser.
    experiences: [
      {
        id: 'human-rights-hackathon',
        kind: 'event',
        title: 'Human Rights Hackathon',
        tag: 'Hackathon',
        org: '',
        when: PENDING,
        subtitle: 'Civic tech and social impact builds',
        description: 'I teamed up with other participants to design and prototype solutions that improve access to human rights resources. I focused on UI structure, clear content hierarchy, and a smooth demo flow for the final presentation.',
        highlights: [
          'Defined problem statement and user flow',
          'Built responsive UI screens',
          'Delivered a final demo and pitch'
        ],
        cover: 'media/events/human-rights/01-640.webp',
        hero: 'media/events/human-rights/02-1400.webp',
        gallery: gallery('human-rights', 7)
      },
      {
        id: 'telkom10x-hackathon',
        kind: 'event',
        title: 'Telkom10X Hackathon',
        tag: 'Hackathon',
        org: '',
        when: PENDING,
        subtitle: 'Innovation sprint and 10x thinking',
        description: 'We explored bold ideas and built rapid prototypes under tight deadlines. I contributed to front-end layout, feature prioritization, and refining the experience for a clear final demo.',
        highlights: [
          'Rapid ideation and validation',
          'Built a working web prototype',
          'Collaborated with a multidisciplinary team'
        ],
        cover: 'media/events/telkom10x/01-640.webp',
        hero: 'media/events/telkom10x/02-1400.webp',
        gallery: gallery('telkom10x', 45)
      },
      {
        id: 'uct-cortexhub-fintech-hackathon',
        kind: 'event',
        title: 'UCT Cortex Hub Fintech Hackathon',
        tag: 'Hackathon',
        org: '',
        when: PENDING,
        subtitle: 'Fintech solutions and product labs',
        description: 'We worked on fintech ideas, mapped user journeys, and built a prototype that explained the flow clearly. I focused on UI clarity, onboarding steps, and preparing a strong demo narrative.',
        highlights: [
          'Mapped fintech user journeys',
          'Designed onboarding and dashboard UI',
          'Showcased a working demo flow'
        ],
        cover: 'media/events/uct-cortex-hub/01-640.webp',
        hero: 'media/events/uct-cortex-hub/02-1400.webp',
        gallery: gallery('uct-cortex-hub', 26)
      },
      {
        id: 'startupgrind-all-star-pitch-battle',
        kind: 'event',
        title: 'StartUpGrind All-Star Pitch Battle',
        tag: 'Pitch Battle',
        org: 'Startup Grind East London',
        when: PENDING,
        subtitle: 'Live pitches and founder feedback',
        description: 'I took part in an all-star pitch battle where we refined our storytelling, product value, and delivery. I worked on the narrative, visuals, and demo flow to make the pitch clear and memorable.',
        highlights: [
          'Crafted a clear value proposition',
          'Prepared slides and demo flow',
          'Received feedback from mentors'
        ],
        cover: 'media/events/startup-grind/01-640.webp',
        hero: 'media/events/startup-grind/07-1400.webp',
        gallery: gallery('startup-grind', 9)
      },
      {
        id: 'inter-university-hackathon',
        kind: 'event',
        title: 'Inter-University Hackathon',
        tag: 'Mentor',
        org: 'Hosted by Walter Sisulu University at The Cortex Hub, East London',
        when: '17–18 Oct 2026',
        subtitle: 'Eduvos, UFH, Walter Sisulu University and Nelson Mandela University',
        description: 'I mentored participants at a two-day inter-university hackathon at The Cortex Hub, East London.',
        highlights: [
          'Mentored participants at a two-day inter-university hackathon at The Cortex Hub, East London.',
          'Hosted by Walter Sisulu University, supported by the Cortex Hub.'
        ],
        gallery: []
      },
      {
        id: 'yes-software-developer',
        kind: 'work',
        title: 'Software Developer',
        tag: 'Work',
        org: 'Youth@Work (YES Programme sponsored by Fairtree Asset Management (Pty) Ltd)',
        when: 'Sep 2025 – Sep 2026',
        subtitle: 'First-line IT support',
        description: 'A 12-month placement on the Youth Employment Service (YES) Quality Work Experience Programme, hosted by Youth@Work and sponsored by Fairtree Asset Management (Pty) Ltd, completed in full.',
        highlights: [
          'Provide first-line IT support to end users: log the fault, diagnose it, then fix or escalate it.',
          'Troubleshoot desktop, notebook and printer faults across both hardware and software.',
          'Install, service and replace hardware, and carry out routine maintenance checks.',
          'Write and maintain support documentation so faults and fixes are recorded and repeatable.',
          'Work the Saturday and Sunday support shift.'
        ],
        gallery: []
      },
      {
        id: 'gonex-founder',
        kind: 'work',
        title: 'Founder & Programme Facilitator',
        tag: 'Work',
        org: 'Gonex Innovation Hub NPC, Sterkspruit, Eastern Cape',
        when: '8-week programme',
        subtitle: 'A community-driven nonprofit in the Joe Gqabi District',
        description: 'I founded Gonex Innovation Hub NPC in Sterkspruit and facilitated its first programmes.',
        highlights: [
          'Founded Gonex Innovation Hub NPC, a community-driven nonprofit in Joe Gqabi District.',
          'Facilitated the hub\'s first programmes over 8 weeks.'
        ],
        gallery: []
      },
      {
        id: 'gonex-innovation-hub',
        kind: 'venture',
        title: 'Gonex Innovation Hub',
        tag: 'Venture',
        org: 'Gonex Innovation Hub NPC and Gonex Hub (Pty) Ltd',
        when: PENDING,
        subtitle: 'A youth-led digital skills and enterprise development organisation',
        description: 'Founded in Sterkspruit, Eastern Cape, Gonex provides accessible digital skills training, entrepreneurship support and career development opportunities to young people and women, particularly in underserved communities.',
        highlights: [
          'Brings digital skills and entrepreneurship programmes directly to schools and communities.',
          '2nd place, Social Impact Business category, University of Fort Hare internal EDHE/ABSA InnoVarsity competition, qualifying for the Eastern Cape Regional Round.',
          'Finalist, East London Startup Grind All-Star Pitch Battle.'
        ],
        gallery: []
      }
    ],

    // Growth timeline, exactly spec §10 (sources per entry). sort is "YYYY-MM", or "9999" when the date is pending.
    // The spec's "Rolling" row (GitHub milestones from repo dates) is not listed: no first-commit dates are available.
    timeline: [
      { when: '2020–2022', sort: '2020-01', title: 'National Senior Certificate', detail: 'Tlokweng Senior Secondary School', source: 'S1' },
      { when: '2023–2026', sort: '2023-01', title: 'BCom (Information Systems)', detail: 'University of Fort Hare (completed)', source: 'S1, S2' },
      { when: '23 Jul 2025', sort: '2025-07', title: 'Certificate in Full Stack Development', detail: 'FNB App Academy 2025 (issued by IT Varsity)', source: 'S1' },
      { when: 'Sep 2025 – Sep 2026', sort: '2025-09', title: 'Software Developer (IT support)', detail: 'Youth@Work, YES Programme sponsored by Fairtree Asset Management', source: 'S1' },
      { when: '12–31 Jan 2026', sort: '2026-01', title: 'UCT–Cortex Hub Fintech Lab 2026 Summer School', detail: 'The Cortex Hub, East London', source: 'S1' },
      { when: '1 Aug 2026', sort: '2026-08', title: 'Completed the 12-month YES Quality Work Experience Programme', detail: '', source: 'S1' },
      { when: '17–18 Oct 2026', sort: '2026-10', title: 'Mentor, Inter-University Hackathon', detail: 'Eduvos, UFH, WSU and NMU, at The Cortex Hub', source: 'S1' },
      { when: PENDING, sort: '9999', title: 'Founded Gonex Innovation Hub NPC, Sterkspruit', detail: 'Facilitated its first 8-week programme', source: 'S1, S2' },
      { when: PENDING, sort: '9999', title: 'Hackathons & pitch events', detail: 'Human Rights Hackathon, Telkom10X Hackathon, UCT Cortex Hub Fintech Hackathon, Startup Grind All-Star Pitch Battle', source: 'S3' }
    ],

    // Recognition, exactly spec §10 (S1, S2, S3).
    recognition: [
      {
        title: '2nd place, Social Impact Business category',
        detail: 'University of Fort Hare internal EDHE/ABSA InnoVarsity competition, with Gonex Innovation Hub; qualified for the Eastern Cape Regional Round.',
        when: PENDING,
        source: 'S2'
      },
      {
        title: 'Finalist, East London Startup Grind All-Star Pitch Battle',
        detail: 'With Gonex Innovation Hub.',
        when: PENDING,
        source: 'S2, S3'
      },
      {
        title: 'Mentor, Inter-University Hackathon',
        detail: 'Eduvos, UFH, Walter Sisulu University and Nelson Mandela University, at The Cortex Hub, East London.',
        when: '17–18 Oct 2026',
        source: 'S1'
      }
    ],

    // The 6 old-site certificates with their S3 titles and issuers (S3), then the two from S1. S3 gives no dates;
    // S1 dates the FNB App Academy certificate (23 July 2025) and none of the other five.
    // The last two have no image yet, so they render as text-only cards.
    certificates: [
      { slug: 'fnb-full-stack', title: 'Full Stack Developer Certificate', issuer: 'FNB App Academy 2025', when: '23 Jul 2025', image: 'media/certificates/fnb-full-stack.webp' },
      { slug: 'digital-learning', title: 'Digital Learning Certificate', issuer: 'Youth Development service', when: PENDING, image: 'media/certificates/digital-learning.webp' },
      { slug: 'hp-effective-business-websites', title: 'Effective Business Websites Certificate', issuer: 'HP Life | HP Foundation', when: PENDING, image: 'media/certificates/hp-effective-business-websites.webp' },
      { slug: 'hp-ai-for-beginners', title: 'AI for Beginners Certificate', issuer: 'HP Life | HP Foundation', when: PENDING, image: 'media/certificates/hp-ai-for-beginners.webp' },
      { slug: 'hp-starting-small-business', title: 'Starting a Small Business Certificate', issuer: 'HP Life | HP Foundation', when: PENDING, image: 'media/certificates/hp-starting-small-business.webp' },
      { slug: 'hp-finding-funding', title: 'Finding Funding Certificate', issuer: 'HP Life | HP Foundation', when: PENDING, image: 'media/certificates/hp-finding-funding.webp' },
      { slug: 'yes-quality-work-experience', title: 'Quality Work Experience Programme', issuer: 'Youth Employment Service (YES)', when: '1 Aug 2026' },
      { slug: 'uct-cortex-fintech-lab', title: 'UCT–Cortex Hub Fintech Lab 2026 Summer School', issuer: 'The Cortex Hub, East London', when: '12–31 Jan 2026' }
    ],

    // Education (S1).
    education: [
      { when: '2023–2026', school: 'University of Fort Hare', award: 'Bachelor of Commerce (Information Systems)' },
      { when: '2020–2022', school: 'Tlokweng Senior Secondary School', award: 'National Senior Certificate' }
    ],

    // Languages, with the CV's spelling and levels (S1).
    languages: [
      { name: 'English', level: 'Fluent' },
      { name: 'Xhosa', level: 'Fluent' },
      { name: 'Zulu', level: 'Fluent' },
      { name: 'Tswana', level: 'Intermediate' },
      { name: 'Sotho', level: 'Basics' },
      { name: 'Pedi', level: 'Basics' }
    ],

    // Gonex Innovation Hub business profile, paraphrased; the vision is verbatim (S2).
    gonex: {
      summary: [
        'Gonex Innovation Hub is a youth-led digital skills and enterprise development organisation founded in Sterkspruit, Eastern Cape. Its mission is to provide accessible digital skills training, entrepreneurship support and career development opportunities to young people and women, particularly in underserved communities.',
        'It works to help young people, students, aspiring entrepreneurs and schools turn ideas into practical solutions and sustainable businesses. Through a community-based approach, Gonex takes its digital skills and entrepreneurship programmes directly to schools and communities, for people who might otherwise face geographical and resource barriers.'
      ],
      vision: "A place where no young person's potential is limited by geography and where women lead their own enterprises.",
      url: 'https://gonex-website.vercel.app'
    },

    // Tools listed on the CV (S1). The CV says "Google Workplace"; the product is Google Workspace.
    cvTools: ['Visual Studio', 'Google Workspace', 'Microsoft Office (Word, Excel, PowerPoint, Access)']
  };
});
