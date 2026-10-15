# Portfolio Redesign: from `index.html` to Next.js

> **Status:** plan only. Nothing in this document has been built yet.
> **Prepared:** 15 October 2026, for Yongama Goso (BCom Information Systems, University of Fort Hare).
> **Scope:** a step-by-step migration of this repository from one hand-written HTML file to a Next.js portfolio. It covers the design system, motion, pages, folders, components, layouts, navigation, gallery, authentication, SEO and accessibility, deployment, and recommendations.

**How to read this document.** Statements are labelled where it matters:

- **FACT** means it was checked against this repo, the npm registry, or a cited source.
- **RECOMMENDATION** means a decision this plan makes, with the reason given.
- **OPINION** means a design judgement you are free to overrule.
- **VERIFY** means a version-sensitive detail to confirm in the official docs on the day you build.

---

## Table of contents

0. [Key decisions (summary)](#0-key-decisions-summary)
1. [Audit of the current site](#1-audit-of-the-current-site)
2. [Design direction](#2-design-direction)
3. [Colour scheme](#3-colour-scheme)
4. [Typography](#4-typography)
5. [Tech stack](#5-tech-stack)
6. [Pages and information architecture](#6-pages-and-information-architecture)
7. [Folder structure](#7-folder-structure)
8. [Components](#8-components)
9. [Layouts and navigation](#9-layouts-and-navigation)
10. [Motion integration](#10-motion-integration)
11. [Gallery layout and gallery motion](#11-gallery-layout-and-gallery-motion)
12. [Optional 3D hero](#12-optional-3d-hero)
13. [Authentication](#13-authentication)
14. [Contact form and back end](#14-contact-form-and-back-end)
15. [SEO, accessibility and performance checklist](#15-seo-accessibility-and-performance-checklist)
16. [Step-by-step migration](#16-step-by-step-migration)
17. [Recommendations for a modern, designed portfolio](#17-recommendations-for-a-modern-designed-portfolio)
18. [Content only you can provide](#18-content-only-you-can-provide)
19. [Sources](#19-sources)

---

## 0. Key decisions (summary)

| Decision | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript** | Pages render on the server for SEO, `next/image` optimises images, and routing is file-based. It is also the stack named in your blueprint. |
| Styling | **Tailwind CSS v4**, with design tokens defined in CSS (`@theme`) | One source of colours and spacing, and dark/light themes become cheap. |
| Motion | **Motion** (formerly Framer Motion), imported from `motion/react` | Declarative React animations, scroll reveals, shared-element transitions, and reduced-motion support. |
| Content | **Typed data files + MDX** for project case studies | Content stays out of components. You edit text without touching the layout. |
| Gallery | CSS-columns masonry + **yet-another-react-lightbox** | Your 87 event photos get a fast grid and an accessible full-screen viewer. |
| Contact | Keep **Formspree** first; upgrade later to a **Server Action + Resend** | Ship fast first, then own the pipeline. |
| Auth | **None for public pages.** Optional **Auth.js** (GitHub sign-in) only for a private `/admin` | A portfolio's visitors never need to log in. |
| 3D | **Optional, last phase**, lazy-loaded with a static fallback | Heavy 3D hurts phones on mobile data, which matters to South African visitors. |
| Hosting | **Vercel** | First-party Next.js hosting, preview deployments on every branch, and an image CDN. |

---

## 1. Audit of the current site

**FACT.** Checked in this repository on 15 Oct 2026.

### What exists

| Item | Where | Notes |
|---|---|---|
| Whole site | `index.html` (1,786 lines) | HTML, CSS (inline `<style>`) and JS (inline `<script>`) in one file |
| Colours | `index.html:13-22` | `--bg #1b212c`, `--panel #232a36`, `--card #2b3341`, `--cyan #00e6ff` |
| Font | `index.html:29` | `Arial, Helvetica, sans-serif` |
| Sections | `#home`, `#about`, `#services`, `#skills`, `#projects`, `#experience`, `#certificates`, `#contact` | All on one page |
| Experience data | `index.html:1436` (`const experiences = [...]`) | 4 events with descriptions, highlights and gallery arrays. **Reuse this data as-is.** |
| Contact form | `index.html:1254` | Formspree endpoint `https://formspree.io/f/mnjbagrl` |
| CV | `Yongama_Goso_CV.pdf`, built from `cv/resume.html` by `cv/build.sh` | Fonts: Bricolage Grotesque, Instrument Sans, JetBrains Mono |
| Images | `Images/` | telkom10x 45, uct-cortexhub 26, startupgrind 9, humanrights 7, certificates 6, projects 4, profile 2 (99 files) |

### What to fix during the move

| Problem | Evidence | Fix in the new site |
|---|---|---|
| Dead links | `index.html:1017`, `1024`, `1031`: three "Read More" links with `href="#"` | Link services to real pages, or remove the links |
| No meta description, no Open Graph tags | Only `<title>Yongama Goso Portfolio  </title>` (`index.html:7`) | Next.js Metadata API plus generated OG images (§15) |
| Generic alt text | e.g. `alt="Project 4"`, `alt="Certificate 2"` | Descriptive alt text stored in the data files |
| Thin project descriptions | Laundry Website: "Responsive UI with service sections and pricing layout." | Case-study pages (§6, §17) |
| Flat skills grid | 8 icons, no grouping | A grouped, filterable skills matrix |
| No timeline | The YES Software Developer role and Fort Hare don't appear on the site | `/experience` timeline |
| Heavy, oddly named images | e.g. `WhatsApp Image 2026-02-05 at 20.19.31 (1).jpeg` | Image pipeline: rename, resize, WebP/AVIF (§11) |
| No dark/light toggle; fixed Arial | `index.html:29` | Tokens plus `next-themes` (§3) |

---

## 2. Design direction

**OPINION.** Treat this section as a creative brief.

**Concept: "Built in the Eastern Cape."** You are a builder from KuGompo City (East London) who joins business thinking (BCom IS) with shipping software.

The design should feel like **an engineer's notebook made premium**: structured grids, monospace labels, precise lines, then one or two moments of real craft.

| Element | Direction |
|---|---|
| Tone | Precise, confident, warm. Not neon "hacker", not corporate template. |
| Dominant colour | Deep ink with your existing **cyan** as the signature accent |
| Second accent | **Ochre / aloe-flower orange**, a warm local note used sparingly |
| Signature moment | Hero with a large name, a rotating multilingual greeting (*Molo · Sawubona · Dumela · Hello*), and a cursor-reactive dot grid |
| Texture | A subtle grain overlay and fine 1px grid lines in section backgrounds |
| Layout | Asymmetric 12-column grid; a bento "Now" block; case studies as long-form editorial pages |

### Adapted from the chumamemela.co.za analysis

**Keep these patterns (adapted, not copied):**
- Your name as the hero visual.
- A rotating role line ("Software Developer · BCom IS · Builder").
- A stat strip.
- An "approach" section written as "X should not be Y" statements.
- Separate pages for awards, publications and media.
- A one-tap **WhatsApp** contact, which suits South African visitors.

**Avoid the weaknesses found there:**
- No `h1` on the page.
- 0 of 4 home-page images with alt text.
- Unsourced percentages ("Audience Engagement 99%").
- About 6.7 MB of images on desktop.
- About eight font families.
- Leftover template content ("1985", "2002" on the Services page).
- A footer link pointing to `#`.

---

## 3. Colour scheme

**RECOMMENDATION.** Dark theme by default (it continues your current brand), plus a light theme.

Contrast ratios below were **calculated** with the WCAG relative-luminance formula. AA requires **4.5:1** for normal text and **3:1** for large text ([WCAG 2.2, 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).

### Dark theme (default)

| Token | HEX | Use | Contrast |
|---|---|---|---|
| `--color-bg` | `#0E1117` | Page background | — |
| `--color-surface` | `#161B24` | Cards, nav | — |
| `--color-surface-2` | `#1E2530` | Raised cards, inputs | — |
| `--color-line` | `rgb(255 255 255 / 0.08)` | Borders, grid lines | — |
| `--color-text` | `#E8ECF2` | Body text | **15.94:1** on bg |
| `--color-muted` | `#9AA4B2` | Secondary text | **7.49:1** on bg, **6.85:1** on surface |
| `--color-accent` | `#00E6FF` | Links, focus rings, highlights (your current cyan) | **12.39:1** on bg |
| `--color-accent-2` | `#F2A93B` | Ochre: tags, "Now" badge, small highlights | **9.46:1** on bg |
| `--color-on-accent` | `#0E1117` | Text on cyan buttons | **12.39:1** |

### Light theme

| Token | HEX | Contrast |
|---|---|---|
| `--color-bg` | `#F7F5F0` (warm paper) | — |
| `--color-surface` | `#FFFFFF` | — |
| `--color-text` | `#12161D` | **16.64:1** |
| `--color-muted` | `#4A5361` | **7.14:1** |
| `--color-accent` | `#006B7C` (deep teal; plain cyan fails on light) | **5.68:1** |
| `--color-accent-2` | `#A8541A` (burnt ochre) | **4.88:1** |
| `--color-on-accent` | `#FFFFFF` on teal | **6.19:1** |

**Rule (RECOMMENDATION):** about 70% ink/paper, 25% surfaces, 5% accent. Cyan is for **interaction** (links, focus, primary buttons). Ochre is for **status and labels only**. Never use both on the same element.

### Tailwind v4 implementation (`src/app/globals.css`)

```css
@import "tailwindcss";

/* Light/dark switch is driven by a class on <html>, set by next-themes */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-bg: #F7F5F0;
  --color-surface: #FFFFFF;
  --color-surface-2: #EFECE4;
  --color-line: rgb(18 22 29 / 0.10);
  --color-text: #12161D;
  --color-muted: #4A5361;
  --color-accent: #006B7C;
  --color-accent-2: #A8541A;
  --color-on-accent: #FFFFFF;

  --font-display: var(--font-bricolage);
  --font-sans: var(--font-instrument);
  --font-mono: var(--font-jetbrains);

  --radius-card: 1rem;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Dark values override the same tokens, so components never change */
.dark {
  --color-bg: #0E1117;
  --color-surface: #161B24;
  --color-surface-2: #1E2530;
  --color-line: rgb(255 255 255 / 0.08);
  --color-text: #E8ECF2;
  --color-muted: #9AA4B2;
  --color-accent: #00E6FF;
  --color-accent-2: #F2A93B;
  --color-on-accent: #0E1117;
}

body { background: var(--color-bg); color: var(--color-text); }
```

Tailwind then generates classes such as `bg-bg`, `bg-surface`, `text-muted`, `text-accent`, `border-line` and `font-display` from these tokens. **VERIFY** the `@custom-variant` syntax against the Tailwind v4 dark-mode docs.

---

## 4. Typography

**RECOMMENDATION.** Use the **same three faces as the CV** (`cv/resume.html`), so the CV and the website read as one brand.

| Role | Font | Weights | Use |
|---|---|---|---|
| Display | **Bricolage Grotesque** | 600, 800 | Name, page titles, section headings |
| Body | **Instrument Sans** | 400, 600 | Paragraphs, UI |
| Mono | **JetBrains Mono** | 500 | Labels, dates, tags, code, small "metadata" text |

Load them with `next/font/google`. Next.js self-hosts the files at build time: there are no requests to Google from the browser and no layout shift.

```tsx
// src/lib/fonts.ts
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";

export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
export const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
export const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["500"], display: "swap" });
```

**Type scale** (fluid, with `clamp`): hero name `clamp(3rem, 10vw, 9rem)`, h1 `clamp(2.25rem, 5vw, 4rem)`, h2 `clamp(1.75rem, 3vw, 2.5rem)`, body `1.0625rem / 1.65`, mono labels `0.75rem` uppercase with `0.08em` tracking.

**Limit: three families, no more.** The analysed site used about eight.

---

## 5. Tech stack

**FACT.** These are the latest versions published on the npm registry on 15 Oct 2026 (`npm view <pkg> version`). **VERIFY** the versions again on the day you install, and pin what you install in `package.json`.

| Layer | Package | Version | What it does for you | Needed? |
|---|---|---|---|---|
| Framework | `next` | 16.4.1 | App Router, server components, routing, image and font optimisation | Yes |
| UI runtime | `react`, `react-dom` | 19.3.1 | Components | Yes |
| Language | `typescript` | 7.0.2 | Type safety for props and content data | Yes |
| Styling | `tailwindcss` (+ `@tailwindcss/postcss`) | 4.3.3 | Utility classes driven by your tokens | Yes |
| Class helpers | `clsx`, `tailwind-merge` | 2.1.1 / 3.7.0 | Clean conditional class names (`cn()` helper) | Yes |
| Animation | `motion` | 14.3.0 | Scroll reveals, layout and shared transitions, gestures | Yes |
| Smooth scroll | `lenis` | 1.3.26 | Inertia scrolling, synced with Motion | Optional |
| Theme | `next-themes` | 0.4.6 | Dark/light toggle without a flash | Yes |
| Icons | `lucide-react` | 1.57.0 | Consistent line icons (replaces Font Awesome) | Yes |
| Tech logos | `devicon` (CSS) or inline SVGs | — | Skill logos (you already use Devicon) | Yes |
| Lightbox | `yet-another-react-lightbox` | 3.32.2 | Accessible full-screen gallery with zoom, swipe and keyboard | Yes |
| Carousel | `embla-carousel-react` | 8.6.0 | Swipeable rows (certificates, testimonials) | Optional |
| Forms | `react-hook-form` + `@hookform/resolvers` | 7.90.0 / 5.9.1 | Form state with almost no re-renders | Phase 8 |
| Validation | `zod` | 4.6.7 | One schema validates the form on client **and** server | Phase 8 |
| Email | `resend` | 6.33.0 | Sends contact messages from a Server Action | Phase 8 (optional) |
| Case studies | `@next/mdx` | 16.4.1 | Write project pages in Markdown with React components | Yes |
| Auth | `next-auth` | `beta` = 5.0.0-beta.32 (`latest` = 4.24.15) | GitHub sign-in for `/admin` only | Optional |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei` | 0.186.1 / 9.8.2 / 10.7.9 | Interactive hero object | Optional |
| Analytics | `@vercel/analytics` | 2.0.1 | Privacy-friendly page views | Recommended |
| Images | `sharp` | 0.35.5 | Build-time resize and convert script (§11) | Yes (dev) |
| Unit tests | `vitest` + `@testing-library/react` | 5.0.5 | Component tests | Yes (dev) |
| End-to-end tests | `@playwright/test` | 1.64.1 | Real-browser tests: navigation, form, CV download, lightbox | Yes (dev) |
| Lint/format | `eslint`, `prettier` | 10.12.0 / 3.9.10 | Code consistency | Yes (dev) |

**Note on Motion (FACT):** the `framer-motion` package was renamed to `motion`. Both are published at 14.3.0, and new code should `import { motion } from "motion/react"`.

**Note on Auth.js (FACT):** v5 is published under the npm `beta` tag, not `latest`. Treat it as pre-release.

---

## 6. Pages and information architecture

```
/                       Home: hero, Now, featured projects, skills, experience preview, gallery teaser, CTA
├── /projects           All projects, filterable by stack
│   └── /projects/[slug]  Case study (MDX): problem → approach → stack → result → lessons
├── /experience         Timeline: YES Software Developer, FNB App Academy, UCT–Cortex Hub, Fort Hare, Tlokweng NSC
├── /gallery            Events: Telkom10X, UCT Cortex Hub, Human Rights Hackathon, StartUpGrind (filter + lightbox)
├── /certificates       Certificates grid with lightbox (FNB, YES, HP LIFE ×4, ...)
├── /about              Story, approach, languages, what you're looking for
├── /contact            Form, email, WhatsApp, LinkedIn, GitHub
├── /cv                 HTML view of the CV + "Download PDF" (same data as cv/resume.html)
├── /uses   (optional)  Your tools and setup
├── /notes  (optional)  Short MDX articles: what you learned building X
├── /admin  (protected) Contact messages and content status (only if you add auth, §13)
├── not-found           Custom 404 with links home
└── opengraph-image     Auto-generated social preview per page
```

**Home page section order (RECOMMENDATION):**
1. Hero: name, rotating greeting, the line "Software Developer · BCom (IS) · KuGompo City", and three CTAs (View work / Download CV / Contact).
2. **Now** (bento): what you're building, learning and reading, with your status ("Open to graduate and junior developer roles").
3. Featured projects: two or three large case-study cards.
4. Skills matrix, grouped: Frontend, Backend & APIs, Data, Tools.
5. Experience preview: the three latest timeline items, linking to `/experience`.
6. Gallery teaser: a six-photo strip, linking to `/gallery`.
7. Closing CTA and footer.

---

## 7. Folder structure

**RECOMMENDATION.** Create the app in place in this repo. The old `index.html` stays in `legacy/` until launch day.

```
Yongama-Goso/
├── src/
│   ├── app/
│   │   ├── (site)/                    # public pages share the site layout
│   │   │   ├── layout.tsx             # header + footer + page transition wrapper
│   │   │   ├── template.tsx           # re-mounts per route → enter animation (§10)
│   │   │   ├── page.tsx               # /
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx           # /projects
│   │   │   │   └── [slug]/page.tsx    # /projects/placeme etc. (statically generated)
│   │   │   ├── experience/page.tsx
│   │   │   ├── gallery/page.tsx
│   │   │   ├── certificates/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── contact/
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts         # "use server" contact action (Phase 8)
│   │   │   └── cv/page.tsx
│   │   ├── (admin)/                   # optional, protected (§13)
│   │   │   └── admin/
│   │   │       ├── layout.tsx
│   │   │       └── page.tsx
│   │   ├── api/auth/[...nextauth]/route.ts   # only if auth is added
│   │   ├── layout.tsx                 # <html>, fonts, ThemeProvider, MotionConfig, metadata
│   │   ├── globals.css                # Tailwind import + tokens (§3)
│   │   ├── not-found.tsx
│   │   ├── opengraph-image.tsx        # generated OG image
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── ui/          # Button, Badge, Card, Tag, Input, Textarea, Tooltip, SectionHeading
│   │   ├── layout/      # Header, NavLinks, MobileMenu, Footer, SkipLink, ThemeToggle
│   │   ├── sections/    # Hero, NowBento, FeaturedProjects, SkillsMatrix, ExperiencePreview, GalleryTeaser, CTA
│   │   ├── motion/      # Reveal, Stagger, RoleRotator, MagneticButton, ScrollProgress, PageTransition
│   │   ├── gallery/     # MasonryGallery, GalleryFilter, GalleryLightbox
│   │   ├── projects/    # ProjectCard, ProjectFilter, CaseStudyHeader, MDX components
│   │   ├── timeline/    # Timeline, TimelineItem
│   │   ├── contact/     # ContactForm, ContactLinks
│   │   └── three/       # HeroScene (optional, client-only)
│   ├── content/
│   │   ├── profile.ts         # name, roles, contact, socials (single source of truth)
│   │   ├── projects.ts        # project index (slug, title, stack, cover, summary, featured)
│   │   ├── projects/*.mdx     # one case study per project
│   │   ├── experience.ts      # timeline entries (from the CV)
│   │   ├── events.ts          # migrated from index.html:1436 `experiences`
│   │   ├── certificates.ts
│   │   ├── skills.ts          # grouped skills
│   │   └── gallery.json       # generated by scripts/optimize-images.mjs (§11)
│   ├── lib/
│   │   ├── fonts.ts
│   │   ├── cn.ts              # clsx + tailwind-merge helper
│   │   ├── seo.ts             # metadata helpers, JSON-LD builders
│   │   └── validation.ts      # zod schemas (contact)
│   └── types/content.ts       # Project, Event, Certificate, TimelineItem types
├── public/
│   ├── images/                # optimised output (projects/, events/, certificates/, profile/)
│   ├── Yongama_Goso_CV.pdf    # copied from the CV build
│   └── favicon.svg
├── scripts/
│   └── optimize-images.mjs    # sharp: rename → resize → webp/avif → gallery.json
├── cv/                        # unchanged: resume.html, build.sh, fonts/
├── tests/
│   ├── unit/                  # vitest
│   └── e2e/                   # playwright
├── legacy/index.html          # old site, kept until launch, then deleted
├── next.config.ts
├── mdx-components.tsx         # required by @next/mdx
├── proxy.ts                   # only if auth is added (VERIFY name; older Next used middleware.ts)
├── .env.example
└── package.json
```

**Why route groups `(site)` and `(admin)`?** The parentheses don't appear in the URL. They let public pages and the admin area use **different layouts**, so the admin area has no marketing header.

---

## 8. Components

"Server" components render on the server and ship no JavaScript. "Client" components need `"use client"` because they use state, effects, or Motion.

| Component | Type | Key props | Used in |
|---|---|---|---|
| `Header` | Server (renders client `NavLinks`) | — | site layout |
| `NavLinks` | Client | `items: {href,label}[]` | Header; highlights the active link with `usePathname()` and an animated underline (`layoutId`) |
| `MobileMenu` | Client | `items` | Header; full-screen drawer, focus trap, closes on Esc and on route change |
| `ThemeToggle` | Client | — | Header |
| `SkipLink` | Server | — | root layout ("Skip to content") |
| `Footer` | Server | — | site layout; socials, email, WhatsApp, back to top |
| `Hero` | Server shell + client parts | `profile` | Home |
| `RoleRotator` | Client | `items: string[]`, `interval` | Hero (Molo / Sawubona / Dumela / Hello and roles) |
| `DotGrid` | Client | `density`, `radius` | Hero background (canvas, cursor-reactive, paused off-screen) |
| `NowBento` | Server | `now: NowItem[]` | Home |
| `ProjectCard` | Client (hover and `layoutId`) | `project` | Home, /projects |
| `ProjectFilter` | Client | `stacks`, `value`, `onChange` | /projects |
| `CaseStudyHeader` | Server | `project` | /projects/[slug] |
| `SkillsMatrix` | Client | `groups: SkillGroup[]` | Home; filter tabs with animated layout |
| `Timeline` / `TimelineItem` | Server + `Reveal` | `items: TimelineItem[]` | /experience, Home preview |
| `MasonryGallery` | Client | `images`, `onOpen(index)` | /gallery, /certificates |
| `GalleryFilter` | Client | `events`, `active` | /gallery |
| `GalleryLightbox` | Client (dynamic import) | `slides`, `index`, `open`, `onClose` | /gallery, /certificates |
| `ContactForm` | Client | — | /contact |
| `Reveal` | Client | `delay?`, `y?`, `once?` | Everywhere: scroll-in animation wrapper |
| `Stagger` | Client | `gap?` | Lists and grids |
| `MagneticButton` | Client | `children`, `strength?` | Hero CTAs (pointer devices only) |
| `ScrollProgress` | Client | — | Case-study pages: reading progress bar |
| `SectionHeading` | Server | `eyebrow`, `title`, `as?` | All sections (keeps heading levels correct) |
| `Button` / `Badge` / `Card` | Server | variants | Everywhere |

**Rule (RECOMMENDATION):** keep `"use client"` at the **leaves**. Pages stay server components and import small client islands. This keeps JavaScript small.

---

## 9. Layouts and navigation

### Root layout (`src/app/layout.tsx`)

```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { bricolage, instrument, jetbrains } from "@/lib/fonts";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://YOUR-DOMAIN"), // TODO(Yongama): final domain
  title: { default: "Yongama Goso: Software Developer", template: "%s · Yongama Goso" },
  description: "Software developer and BCom Information Systems student at the University of Fort Hare, building web and mobile products in the Eastern Cape.",
  openGraph: { type: "website", locale: "en_ZA" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning
      className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` is needed because `next-themes` adds the `dark` class before React hydrates.

### Site layout (`src/app/(site)/layout.tsx`)

- `SkipLink` → sticky `Header` (blurred surface background; it hides on scroll down and shows on scroll up) → `<main id="content">` → `Footer`.

### Navigation behaviour

| Behaviour | How |
|---|---|
| Primary links | Work · Experience · Gallery · About · Contact, with "CV" as an outlined button |
| Active state | `usePathname()` and a Motion underline using `layoutId="nav-underline"`, so it **slides** between links |
| Mobile | Burger opens a full-screen `MobileMenu`. Links stagger in, focus is trapped, and `Esc`, the route change or the backdrop click closes it |
| Home scroll-spy | On `/`, highlight the section in view (IntersectionObserver) |
| Case-study breadcrumbs | `Work / PlaceMe`, plus "Next project →" at the bottom |
| Keyboard | Every interactive element reachable with Tab, a visible focus ring (`outline: 2px solid var(--color-accent)`), no keyboard traps |
| Command menu (optional, OPINION) | `Ctrl/⌘ + K` opens quick links (projects, CV, email), a nice touch for a developer portfolio |

---

## 10. Motion integration

**FACT.** Motion for React is imported from `motion/react`. Any file that uses it must be a client component (`"use client"`).

### 10.1 Global setup: respect reduced motion, keep the bundle small

```tsx
// src/components/motion/MotionProvider.tsx
"use client";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    // reducedMotion="user": if the OS asks for less motion, transforms are skipped
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      {/* LazyMotion + `m` components load only the features you use */}
      <LazyMotion features={domAnimation} strict>{children}</LazyMotion>
    </MotionConfig>
  );
}
```

With `strict` enabled, use `m.div` instead of `motion.div` inside the app. **VERIFY** the current feature bundles (`domAnimation` / `domMax`) in the Motion docs. `layoutId` animations need `domMax`.

### 10.2 Scroll reveal (used everywhere)

```tsx
// src/components/motion/Reveal.tsx
"use client";
import { m } from "motion/react";

export function Reveal({ children, delay = 0, y = 24 }: { children: React.ReactNode; delay?: number; y?: number }) {
  return (
    <m.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }} // animate once, slightly before fully in view
      transition={{ delay }}
    >
      {children}
    </m.div>
  );
}
```

**Important (lesson from the Chuma Memela site):** content hidden until scroll is invisible to people who never scroll, and to screenshot tools. Keep `initial` offsets small, and **never** hide critical text such as the h1 or contact details behind a scroll trigger.

### 10.3 Page-load orchestration (hero)

One well-staged entrance beats many scattered effects:

| Order | Element | Delay |
|---|---|---|
| 1 | Greeting (RoleRotator) fades up | 0.1s |
| 2 | Name: each word slides up from a clipped mask | 0.2s, staggered 0.08s |
| 3 | Role line and CTAs | 0.5s |
| 4 | Dot grid fades in | 0.7s |
| 5 | Header | 0.8s |

```tsx
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } };
const word = { hidden: { y: "110%" }, show: { y: "0%" } };
// <m.h1 variants={container} initial="hidden" animate="show">
//   {["Yongama", "Goso"].map(w => <span className="inline-block overflow-hidden" key={w}><m.span className="inline-block" variants={word}>{w}</m.span></span>)}
// </m.h1>
```

### 10.4 Route transitions

`template.tsx` re-mounts on every navigation, which makes **enter** animations simple:

```tsx
// src/app/(site)/template.tsx
"use client";
import { m } from "motion/react";
export default function Template({ children }: { children: React.ReactNode }) {
  return <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{children}</m.div>;
}
```

**Honest limitation:** *exit* animations between App Router pages are not reliable with `AnimatePresence`, because the old page unmounts immediately. Keep transitions enter-only. **VERIFY** whether React's View Transitions support has become stable in Next.js before adding cross-page morphs.

### 10.5 Shared-element and layout animations

- **Nav underline:** `<m.span layoutId="nav-underline" />` under the active link slides between items.
- **Filter reflow:** add `layout` to each card in `/projects`, `/gallery` and the skills matrix. When filters change, cards glide to their new positions. Wrap the list in `AnimatePresence mode="popLayout"` so removed cards fade out.
- **Card to case study (OPINION, optional):** within one page, a `layoutId` cover image can expand into a detail panel. Across routes this is limited (see 10.4).

### 10.6 Scroll-linked effects (use sparingly)

```tsx
const { scrollYProgress } = useScroll();                            // whole page
const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
// <m.div style={{ scaleX }} className="fixed top-0 left-0 right-0 h-0.5 origin-left bg-accent" />
```

Use for: a reading-progress bar on case studies, and a slight parallax on the hero portrait (`useTransform(scrollY, [0, 500], [0, -60])`).

### 10.7 Micro-interactions

- **Buttons:** `whileHover={{ y: -2 }}` and `whileTap={{ scale: 0.97 }}`.
- **Magnetic CTA:** follows the cursor a few pixels. Enable only when `matchMedia("(pointer: fine)")`, never on touch.
- **Project cards:** the image scales to 1.04, the arrow nudges right, and a border glow fades in.

### 10.8 Motion performance rules

1. Animate **only `transform` and `opacity`**. They are GPU-friendly and don't trigger layout.
2. No animation on page `scroll` events without Motion's `useScroll`, which is optimised.
3. Pause canvas and 3D loops when off-screen (IntersectionObserver) or when the tab is hidden.
4. Test with "Reduce motion" turned on in your OS. Everything must still be readable and usable.

### 10.9 Optional: smooth scrolling with Lenis

Lenis adds inertia scrolling. **OPINION:** it can feel premium on desktop but sluggish to some users. Make it desktop-only, and disable it when `prefers-reduced-motion` is set.

---

## 11. Gallery layout and gallery motion

### 11.1 Data: from `index.html` to typed content

Move `const experiences` (`index.html:1436`) into `src/content/events.ts` unchanged, then add captions and alt text:

```ts
// src/types/content.ts
export type GalleryImage = { src: string; width: number; height: number; blurDataURL: string; alt: string; event: EventId };
export type EventId = "telkom10x" | "uct-cortexhub" | "human-rights" | "startupgrind";
```

### 11.2 Image pipeline (`scripts/optimize-images.mjs`)

**Why:** the current files are full-size phone photos with names like `WhatsApp Image 2026-02-05 at 20.19.31 (1).jpeg`. The spaces and brackets are fragile in URLs.

Steps the script performs for each file in `Images/<event>/`:
1. **Rename** to `<event>-NN.webp`, for example `telkom10x-01.webp`.
2. **Resize** to a maximum width of 2400px, keeping the aspect ratio. Output **WebP** (quality around 78), plus **AVIF** if you want it.
3. **Read width and height** to prevent layout shift.
4. **Make a tiny blur placeholder:** a 16px-wide version, base64-encoded.
5. **Write** `src/content/gallery.json` with `{ src, width, height, blurDataURL, alt: "TODO", event }`.

Then fill in each `alt` by hand. Describe the photo ("Team pitching a prototype to judges at Telkom10X"), not "image 3".

### 11.3 Layout

**RECOMMENDATION: CSS-columns masonry.** It needs no JavaScript layout library and keeps photos at their natural aspect ratios.

```tsx
<ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4 [&>li]:break-inside-avoid">
  {images.map((img, i) => (
    <li key={img.src}>
      <button onClick={() => onOpen(i)} className="group block w-full overflow-hidden rounded-[var(--radius-card)] focus-visible:outline-2 focus-visible:outline-accent">
        <Image src={img.src} alt={img.alt} width={img.width} height={img.height}
          placeholder="blur" blurDataURL={img.blurDataURL}
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]" />
      </button>
    </li>
  ))}
</ul>
```

**Alternative (OPINION): a bento event grid** on the gallery index. Each event is one card with a large cover, a photo count, the date and the role you played. Clicking a card filters the masonry below. This tells the **story** of each event, not just a photo dump.

| Breakpoint | Columns |
|---|---|
| < 640px | 1 |
| 640–1023px | 2 |
| ≥ 1024px | 3 (4 at ≥ 1536px for the big Telkom10X set) |

### 11.4 Gallery motion

- **Filter tabs** (All · Telkom10X · UCT Cortex Hub · Human Rights · StartUpGrind): the active pill slides between tabs with `layoutId="gallery-tab"`.
- **Reflow:** each `<m.li layout>` glides to its new column slot when the filter changes. Wrap the list in `AnimatePresence mode="popLayout"` for fade in and out.
- **Entrance:** images reveal with a short stagger (`staggerChildren: 0.04`), **capped at the first 12**. Later images appear instantly, so a 45-photo set doesn't take ages to animate.
- **Hover:** a subtle scale (1.03) and a caption sliding up from the bottom edge.
- **Lightbox:** `yet-another-react-lightbox` with the `Zoom`, `Thumbnails`, `Captions` and `Counter` plugins. It supports keyboard (← → Esc), swipe on touch and focus management. Load it with `next/dynamic` so its JavaScript only downloads when someone opens a photo.

```tsx
const GalleryLightbox = dynamic(() => import("./GalleryLightbox"), { ssr: false });
```

### 11.5 Certificates page

Use the same `MasonryGallery` and lightbox components with `certificates.ts`. Each card shows issuer, title, date and a "Verify" link where the issuer provides one.

---

## 12. Optional 3D hero

**RECOMMENDATION:** only after everything else ships, and only if it says something about you.

- **Concept (OPINION):** an abstract low-poly form, or a slowly rotating wireframe "node graph" (people, data, systems: an Information Systems metaphor). It should react gently to the cursor.
- **Stack:** `three`, `@react-three/fiber`, `@react-three/drei`.
- **Rules:**
  1. Load it client-only and lazily: `dynamic(() => import("@/components/three/HeroScene"), { ssr: false, loading: () => <HeroFallback/> })`.
  2. Show a **static image fallback** on small screens, when `prefers-reduced-motion` is set, and when WebGL is unavailable.
  3. Cap the device pixel ratio (`dpr={[1, 1.5]}`), use `frameloop="demand"` where possible, and pause when off-screen.
  4. Budget: the 3D chunk should not delay the LCP element. Keep the hero's **text** as the LCP element.
- **Cheaper alternative (RECOMMENDATION):** the 2D canvas `DotGrid` (§8) gives most of the "interactive" feel at a fraction of the cost.

---

## 13. Authentication

### Do you need it?

**OPINION: not for the public portfolio.** Recruiters must never be asked to log in.

Authentication only makes sense for a **private `/admin` area**, for example to:
- read contact-form messages stored in a database,
- toggle which projects are "featured",
- check page-view stats.

If none of that interests you yet, **skip this section**. Formspree already emails you the messages.

### If you add it: Auth.js (`next-auth` v5, beta) with GitHub sign-in

**Why GitHub:** you already have an account (`BigGee6566`), there's no password to manage, and you can restrict access to **only your account**.

1. Install the beta: `npm i next-auth@beta`.
2. In GitHub **Settings → Developer settings → OAuth Apps**, create an app:
   - Homepage URL: your domain.
   - Callback URL: `https://YOUR-DOMAIN/api/auth/callback/github`, plus `http://localhost:3000/api/auth/callback/github` for development.
3. Add the environment variables to `.env.local` (and Vercel project settings). **Never commit these.**
   ```
   AUTH_SECRET=        # generate with: npx auth secret
   AUTH_GITHUB_ID=
   AUTH_GITHUB_SECRET=
   ADMIN_GITHUB_LOGIN=BigGee6566
   ```
4. Create `src/auth.ts`:
   ```ts
   import NextAuth from "next-auth";
   import GitHub from "next-auth/providers/github";

   export const { handlers, auth, signIn, signOut } = NextAuth({
     providers: [GitHub],
     callbacks: {
       // Allow-list: only your GitHub account may sign in
       signIn: ({ profile }) => profile?.login === process.env.ADMIN_GITHUB_LOGIN,
     },
   });
   ```
5. Create `src/app/api/auth/[...nextauth]/route.ts` with two lines: `import { handlers } from "@/auth";` and `export const { GET, POST } = handlers;`. **VERIFY** the exact shape in the Auth.js docs.
6. Protect `/admin` **in two places**:
   - in the route-guard file (`proxy.ts` in Next 16, `middleware.ts` before), matching `/admin/:path*`;
   - **and** inside `src/app/(admin)/admin/layout.tsx`, with `const session = await auth(); if (!session) redirect("/api/auth/signin")`.

   Checking only in the route-guard file is not enough, so check again where the data is read.

**Alternatives:** Clerk (hosted, quickest setup, free tier, a third-party dependency) or Supabase Auth (if you also want Supabase's database for messages). **VERIFY** current free-tier limits before choosing.

---

## 14. Contact form and back end

### Phase 1: keep Formspree (works today)

Keep the existing endpoint (`index.html:1254`), but submit with `fetch` from a client component. That gives inline success and error states and no page reload. Add:
- client validation with `zod`,
- a hidden **honeypot** field to catch spam bots,
- disabling the button while sending,
- `aria-live="polite"` status text so screen readers hear the result.

### Phase 2 (optional): own the pipeline

`src/app/(site)/contact/actions.ts`, a **Server Action**:
1. `"use server"`. Parse `FormData` with the **same zod schema** the client uses.
2. Reject if the honeypot is filled. Add rate limiting if spam appears (for example Upstash Ratelimit, **VERIFY** its pricing).
3. Send the email with **Resend** (`RESEND_API_KEY` in env vars) to `goso.yonga@gmail.com`, with the visitor's email as `replyTo`.
4. Optionally store the message in a database for `/admin` (§13).
5. Return `{ ok: true }` or field errors. The form shows them under each field.

**POPIA note (South Africa):** the form collects personal information (name, email). Add one line under the form saying what you use it for ("only to reply to you") and don't keep messages longer than needed. *This is general information, not legal advice.*

---

## 15. SEO, accessibility and performance checklist

### SEO

- [ ] Every page exports `metadata` or `generateMetadata` with a unique **title** and **description**.
- [ ] `opengraph-image.tsx` generates social previews (name, role, accent colour).
- [ ] `sitemap.ts` and `robots.ts` exist in `src/app/`.
- [ ] JSON-LD `Person` on the home page: name, jobTitle, alumniOf ("University of Fort Hare"), sameAs (GitHub, LinkedIn).
- [ ] Exactly **one `<h1>` per page**, and heading levels never skip (enforced by `SectionHeading`).
- [ ] Clean URLs (`/projects/placeme`), and `canonical` set via `metadataBase`.

### Accessibility (target WCAG 2.2 AA)

- [ ] Every `<img>` and `next/image` has meaningful `alt`. Decorative images use `alt=""`.
- [ ] Colour contrast meets the ratios in §3.
- [ ] Visible focus styles. A skip link. A focus trap in the mobile menu and the lightbox.
- [ ] Form inputs have `<label>`s, not just placeholders. Errors are linked with `aria-describedby`.
- [ ] Everything works with `prefers-reduced-motion: reduce`.
- [ ] `lang="en-ZA"` on `<html>`. Wrap isiXhosa greetings in `<span lang="xh">`.
- [ ] Automated check: `@axe-core/playwright` in the e2e tests.

### Performance (Core Web Vitals, "good" thresholds from web.dev)

| Metric | Target |
|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.5s |
| INP (Interaction to Next Paint) | ≤ 200ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 |

How to hit them:
- Hero text is the LCP element.
- The portrait uses `next/image` with `priority`.
- Fonts come through `next/font`.
- Width and height are set on every image.
- 3D and the lightbox are lazy-loaded.
- Fewer than about 150 KB of first-load JavaScript on the home page (OPINION budget). Check it with `next build` output.

---

## 16. Step-by-step migration

Each phase ends with **"Done when"** checks. Do the phases in order. Commit at the end of each one.

### Phase 0: Prepare (½ day)

1. Create a branch: `git checkout -b redesign/nextjs`.
2. Move the old site: `git mv index.html legacy/index.html`. Keep `Images/` where it is for now.
3. Fill in the **content inventory** (§18): project problems and outcomes, dates, alt text.

**Done when:** the branch exists, `legacy/index.html` opens in a browser, and the content list is drafted.

### Phase 1: Scaffold (½ day)

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
npm i motion next-themes lucide-react clsx tailwind-merge
npm i -D prettier vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test sharp
```

**VERIFY:** if `create-next-app` refuses a non-empty folder, scaffold into `tmp/` and move the files up. Check the flags with `npx create-next-app@latest --help`.

**Done when:** `npm run dev` serves the starter page at `http://localhost:3000`, and `npm run build` passes.

### Phase 2: Design tokens and fonts (1 day)

1. Paste the tokens (§3) into `globals.css`. Add `src/lib/fonts.ts` (§4).
2. Build the `ui/` primitives: `Button`, `Badge`, `Card`, `SectionHeading`, `Input`.
3. Make a temporary `/styleguide` page showing every token and component in both themes. Delete it before launch.

**Done when:** the styleguide looks right in dark and light, and the contrast pairs match §3.

### Phase 3: Layout and navigation (1 day)

1. Root layout with `ThemeProvider` and `MotionProvider` (§9, §10.1).
2. `(site)/layout.tsx` with `SkipLink`, `Header`, `NavLinks`, `MobileMenu`, `ThemeToggle` and `Footer`.
3. Stub pages for every route in §6, each with a real `<h1>` and `metadata`.

**Done when:** every route loads, the mobile menu works with the keyboard only, and there are no console errors.

### Phase 4: Content into data files (1 day)

1. `content/profile.ts`: copy from `cv/resume.html` (contact, roles, languages).
2. `content/events.ts`: move `experiences` from `index.html:1436`.
3. `content/projects.ts` and `projects/*.mdx`: PlaceMe, EduRand, JourneyMap, Laundry Website (problem, approach, stack, result).
4. `content/experience.ts`, `certificates.ts`, `skills.ts`.
5. Types in `src/types/content.ts`. Let TypeScript catch missing fields.

**Done when:** `npm run build` type-checks every content file.

### Phase 5: Sections and pages (2–3 days)

Build the home sections in order (§6). Then `/projects` and `[slug]` with `generateStaticParams`, then `/experience`, `/about`, `/certificates` and `/cv`. Copy the PDF to `public/`, and link "Download CV" to `/Yongama_Goso_CV.pdf` with the `download` attribute.

**Done when:** every page shows real content at 375px, 768px and 1440px widths with no horizontal scroll.

### Phase 6: Motion (1–2 days)

`Reveal`, `Stagger`, the hero orchestration, the nav underline, filter reflow, the case-study scroll progress and the micro-interactions (§10).

**Done when:** the animations run at 60 fps in Chrome DevTools' Performance panel, and **with OS "Reduce motion" on, nothing moves and nothing is hidden**.

### Phase 7: Gallery (1–2 days)

1. Run `node scripts/optimize-images.mjs` to produce `public/images/events/*` and `gallery.json`.
2. Write the alt text by hand.
3. Build `MasonryGallery`, `GalleryFilter` and `GalleryLightbox` (§11).

**Done when:** the gallery page's images are lazy-loaded, the lightbox opens with Enter, arrows navigate, Esc closes it and focus returns to the clicked photo.

### Phase 8: Contact form (½–1 day)

Formspree via `fetch` with zod, a honeypot and `aria-live` (§14, Phase 1). Optionally move to the Server Action with Resend.

**Done when:** a test message arrives in your inbox, invalid input shows field errors, and a spam test (filled honeypot) is silently dropped.

### Phase 9: SEO, accessibility and performance (1 day)

Work through the §15 checklist. Run Lighthouse (Chrome DevTools) on mobile for `/`, `/projects/[slug]` and `/gallery`.

**Done when:** Lighthouse Accessibility is at least 95 and SEO at least 95, Core Web Vitals targets are met in the lab, and the OG preview looks right when you paste the link into LinkedIn's Post Inspector.

### Phase 10: Auth and admin (optional, 1 day)

§13. **Done when:** you can sign in with GitHub, any other GitHub account is rejected, and `/admin` redirects when signed out.

### Phase 11: Tests (1 day)

- **Vitest** for `RoleRotator` cycling, the zod schema and the `ProjectFilter` logic.
- **Playwright e2e** for:
  - navigation on every route,
  - the mobile menu,
  - the CV download returning HTTP 200 and `application/pdf`,
  - the lightbox keyboard flow,
  - the contact form validation,
  - `axe` with no serious violations.

Add `"test"` and `"test:e2e"` scripts to `package.json`.

**Done when:** both suites pass locally, and in GitHub Actions if you add CI.

### Phase 12: Deploy and launch (½ day)

1. Import the repo at vercel.com (Add New → Project). The framework preset is detected automatically.
2. Add the environment variables (if you use Resend or auth).
3. Every push creates a **preview URL**. Check it, then merge to `main` for production.
4. Connect your domain. **TODO(Yongama):** decide on one, for example `yongamagoso.co.za`. `.co.za` domains are registered through ZACR-accredited registrars. Make sure **both** `www` and the bare domain resolve (the analysed site's bare domain did not).
5. After launch, delete `legacy/`, the old root `Images/` (once copied and optimised) and any unused assets.

**Done when:** the production URL serves the new site over HTTPS, the bare domain and `www` both work, and the old links (`/#projects`) still land on the home page.

**Estimated total (OPINION):** about 12–17 working days at a steady pace, or less without the optional phases.

---

## 17. Recommendations for a modern, designed portfolio

**OPINION**, ranked by impact for someone seeking graduate and junior developer roles.

1. **Case studies over cards.** For each project, write the problem, your role, constraints, architecture (a simple diagram), the hardest bug, the result (users, speed, anything measurable) and what you'd change. This is the single biggest upgrade.
2. **A signature hero, not a template.** The large name, the multilingual greeting and the cursor-reactive dot grid make one memorable moment. Everything else stays calm.
3. **A "Now" bento box.** What you're building, learning and reading, plus your availability. It shows you're active and gives recruiters a reason to return.
4. **Local identity as a strength.** Eastern Cape, isiXhosa greetings, community problems you solved (PlaceMe for Fort Hare students). It's authentic and memorable. Keep it tasteful, not a costume.
5. **Proof over adjectives.** Replace "hardworking, passionate" with evidence: hackathon outcomes, the YES programme completion, the FNB App Academy certificate and links to live demos and repos. **No unsourced percentages.**
6. **CV and site from one source.** `content/profile.ts` can feed both the `/cv` page and, later, the PDF build, so they never drift apart.
7. **Light and dark themes, both designed.** Not just inverted colours: the warm-paper light theme should feel intentional.
8. **Craft details.**
   - Custom 404.
   - A focus ring styled in your accent.
   - Text selection colour in the accent.
   - Favicon and OG images in your brand.
   - A "Last updated" date in the footer.
   - Copy-email-to-clipboard with a toast.
9. **A `/notes` section (MDX).** Two or three short write-ups ("How I built the PlaceMe listings with SQL", "What I learned at Telkom10X"). They show communication skill and help SEO.
10. **An `/uses` page.** Your editor, tools and stack. It's quick to write and developers love it.
11. **Analytics without cookies.** `@vercel/analytics` shows which projects recruiters open.
12. **Do not:**
    - Use autoplaying audio.
    - Use cursor effects on touch devices.
    - Hide content behind long loading screens.
    - Put 3D before content.
    - Use more than three fonts.
    - Use stock "coding" photos (use your real event photos instead).

---

## 18. Content only you can provide

Marked `TODO(Yongama)` in the build:

- [ ] **For each project** (PlaceMe, EduRand, JourneyMap, Laundry Website):
  - the problem,
  - your role,
  - the stack,
  - one hard technical challenge,
  - the outcome,
  - live link and repo link,
  - 2–3 clean screenshots.
- [ ] Which 2–3 projects to **feature** on the home page.
- [ ] The **real dates** of each event (Telkom10X, Human Rights Hackathon, UCT Cortex Hub, StartUpGrind) and your role at each.
- [ ] **Confirm** the YES role dates (CV: Sep 2025 – Sep 2026) against the certificate date (1 Aug 2026).
- [ ] **Confirm** whether "UCT Cortex Hub Fintech Hackathon" and "UCT–Cortex Hub Fintech Lab Summer School" are the same event.
- [ ] **Alt text** for gallery photos (or at least for the covers and first 12 per event).
- [ ] Your **domain** choice, and whether you want `/admin` (auth) at all.
- [ ] A short "Now" entry and your current availability statement.

---

## 19. Sources

| Source | URL | Used for | Accessed |
|---|---|---|---|
| npm registry (`npm view <pkg> version`, `npm view next-auth dist-tags`) | https://www.npmjs.com | All version numbers in §5 | 15 Oct 2026 |
| Next.js documentation | https://nextjs.org/docs | App Router, Metadata, `next/font`, `next/image`, route groups, templates, MDX | Verify at build time |
| Motion for React documentation | https://motion.dev/docs/react | `motion/react`, LazyMotion, MotionConfig, layout animations, useScroll | Verify at build time |
| Tailwind CSS v4 documentation | https://tailwindcss.com/docs | `@theme`, dark mode variant | Verify at build time |
| Auth.js documentation | https://authjs.dev | v5 setup, GitHub provider | Verify at build time |
| yet-another-react-lightbox | https://yet-another-react-lightbox.com | Lightbox plugins | Verify at build time |
| web.dev: Core Web Vitals | https://web.dev/articles/vitals | LCP, INP and CLS thresholds | — |
| W3C: Understanding WCAG 2.2, Contrast (Minimum) | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | 4.5:1 and 3:1 contrast rules | — |
| Analysis of https://www.chumamemela.co.za/ | (this session, 15 Oct 2026) | §2 patterns to adapt and avoid | 15 Oct 2026 |
| This repository | `index.html`, `cv/resume.html`, `Images/` | §1 audit, content sources | 15 Oct 2026 |

---

**Next action:** fill in §18 (project case-study notes are the biggest item). Then start Phase 0.
**Key risk:** scope creep. 3D, auth and the admin area are optional. Ship Phases 0–9 first, then decide.
