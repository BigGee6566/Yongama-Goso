/* app.js: wires the page up once the HTML has loaded.

   It is a classic script, not an ES module, on purpose: browsers refuse to
   load modules from file://, and the site must work when index.html is
   opened straight from disk. Everything sits inside one function (an IIFE)
   so its helpers don't leak out as globals.

   Flow: initHeader() runs on every page, then the init function for this
   page is looked up by <body data-page="..."> and run.

   Shared helpers any page's init can call: prefersReducedMotion(),
   initReveal(), initTicker(el, roles) and initCounters(root). */
(function () {
  'use strict';

  // Matches the CSS breakpoint in layout.css: under 900px the links fold
  // into a panel behind the menu button.
  var MOBILE_NAV = window.matchMedia('(max-width: 899.98px)');

  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    // Home's transparent header turns solid (and pins) once the page scrolls.
    // The class is harmless on other pages, whose header is always solid.
    function onScroll() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = header.querySelector('.nav-toggle');
    var nav = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
    if (!nav) return;

    // aria-expanded is the single source of truth: screen readers announce
    // it, and the CSS shows the panel when it is "true".
    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    // Escape closes the menu and puts focus back on the button, so keyboard
    // users are not left stranded inside a hidden panel.
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Following a link closes the menu (this matters for same-page #links).
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    // A tap anywhere outside the header closes it too.
    document.addEventListener('click', function (event) {
      if (isOpen() && !header.contains(event.target)) setOpen(false);
    });

    // Growing past the breakpoint resets the menu, so it is not found
    // half-open when the window shrinks again.
    // (Safari before 14 only knows the older addListener spelling.)
    function onBreakpoint(event) {
      if (!event.matches) setOpen(false);
    }
    if (MOBILE_NAV.addEventListener) MOBILE_NAV.addEventListener('change', onBreakpoint);
    else MOBILE_NAV.addListener(onBreakpoint);
  }

  /* ---- Motion helpers: shared by every page --------------------------- */

  // True when the visitor's system asks for less motion. Every animation in
  // this file checks it first (the CSS does the same with a media query).
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Scroll reveals. Elements marked data-reveal fade up the first time they
  // enter the viewport. The CSS only hides them once <html> has .reveal-ready,
  // which is added here, so with reduced motion, no IntersectionObserver or no
  // JavaScript at all, nothing is ever hidden.
  function initReveal(root) {
    var els = (root || document).querySelectorAll('[data-reveal]');
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    document.documentElement.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target); // reveal once, then stop watching
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // The role ticker: el (the visible word) cycles through roles. It sits inside
  // [data-ticker-root], which also holds:
  // - [data-ticker-all]: a visually hidden line given the whole list once, so
  //   screen readers hear every role without an announcement on each tick (the
  //   visible word is aria-hidden in the HTML);
  // - [data-ticker-pause]: a pause button. WCAG 2.2.2 asks for one on anything
  //   that keeps updating by itself for more than five seconds.
  // Under reduced motion it stays on roles[0] and the button stays hidden.
  var TICK_MS = 2600;   // time each role stays up
  var SWAP_MS = 280;    // matches the ticker-out animation in components.css

  function initTicker(el, roles) {
    if (!el || !roles || !roles.length) return;
    var host = el.closest('[data-ticker-root]') || document;
    var all = host.querySelector('[data-ticker-all]');
    var pause = host.querySelector('[data-ticker-pause]');
    el.textContent = roles[0];
    if (all) all.textContent = roles.join('; ');
    if (prefersReducedMotion() || roles.length < 2) return;

    var i = 0;
    var timer = null;
    function next() {
      el.classList.remove('is-in');
      el.classList.add('is-out');          // slide the old role up and out ...
      setTimeout(function () {
        i = (i + 1) % roles.length;
        el.textContent = roles[i];
        el.classList.remove('is-out');
        void el.offsetWidth;               // (reading layout restarts the CSS animation)
        el.classList.add('is-in');         // ... and the new one up from below
      }, SWAP_MS);
    }
    function play() { timer = setInterval(next, TICK_MS); }
    function stop() { clearInterval(timer); timer = null; }

    play();
    if (!pause) return;
    pause.hidden = false;
    pause.addEventListener('click', function () {
      var paused = pause.getAttribute('aria-pressed') === 'true';
      pause.setAttribute('aria-pressed', paused ? 'false' : 'true');
      if (paused) play(); else stop();
    });
  }

  // Counters: every [data-count] inside root is rendered with its final value.
  // When motion is allowed (and IntersectionObserver exists) they drop to 0 and
  // count up once, the first time a quarter of root is in view (on a laptop
  // the card already peeks over the fold on load, so it counts straight away).
  var COUNT_MS = 1400;

  function initCounters(root) {
    var els = root ? [].slice.call(root.querySelectorAll('[data-count]')) : [];
    if (!els.length || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    els.forEach(function (el) { el.textContent = '0'; });

    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var start = null;
      function frame(now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / COUNT_MS, 1);
        var eased = 1 - Math.pow(1 - t, 3); // ease-out: quick at first, settling at the end
        els.forEach(function (el) {
          el.textContent = String(Math.round(Number(el.dataset.count) * eased));
        });
        if (t < 1) requestAnimationFrame(frame); // t reaches exactly 1, so the last frame is exact
      }
      requestAnimationFrame(frame);
    }, { threshold: 0.25 });
    io.observe(root);
  }

  /* ---- Home --------------------------------------------------------------- */

  // Links into the old single-page site (index.html#projects and so on) still
  // circulate on LinkedIn and in the old CV. Each section now has its own page.
  var LEGACY_HASHES = {
    '#projects': 'projects.html',
    '#experience': 'journey.html#experience',
    '#skills': 'journey.html#skills',
    '#certificates': 'recognition.html#certificates',
    '#contact': 'contact.html'
  };

  // Returns true when it is sending the visitor to another page. replace()
  // rather than assign(): the old URL leaves no history entry, so Back works.
  function initLegacyAnchors() {
    var hash = window.location.hash;
    if (LEGACY_HASHES[hash]) {
      window.location.replace(LEGACY_HASHES[hash]);
      return true;
    }
    if (hash === '#services') window.location.replace('#what-i-do'); // renamed, same page
    return false;
  }

  var FEATURED = ['nova-journal', 'open-data-dashboard', 'thaba-shield', 'fintech-api'];

  // Puts html into the element matching selector, if the page has one.
  function fill(selector, html) {
    var el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  // Every string from SITE goes through escapeHTML before it becomes markup.
  function renderHome(site) {
    var esc = Render.escapeHTML;

    // The number sits in an aria-hidden span (it changes while counting up);
    // screen readers read the final value from the hidden span beside it.
    fill('[data-counters]', Render.computeCounters(site).map(function (c) {
      return '<li class="counter">' +
        '<span class="counter__value" data-count="' + c.value + '" aria-hidden="true">' + c.value + '</span>' +
        '<span class="visually-hidden">' + c.value + '</span>' +
        '<span class="counter__label">' + esc(c.label) + '</span></li>';
    }).join(''));

    var edu = site.education[0];
    fill('[data-about-facts]', [
      ['Based in', site.person.location],
      ['Studied', edu.award + ', ' + edu.school],
      ['Speaks', site.languages.map(function (l) { return l.name; }).join(', ')]
    ].map(function (f) {
      return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>';
    }).join(''));

    fill('[data-about-text]', site.about.map(function (p, i) {
      return '<p' + (i === 0 ? ' class="about__lead"' : '') + '>' + esc(p) + '</p>';
    }).join(''));

    // --reveal-delay staggers the cards as they fade in (see components.css).
    fill('[data-capabilities]', site.capabilities.map(function (c, i) {
      return '<li class="capability" data-reveal style="--reveal-delay:' + i * 90 + 'ms">' +
        '<span class="capability__icon"><i class="' + esc(c.icon) + '" aria-hidden="true"></i></span>' +
        '<span class="capability__num" aria-hidden="true">0' + (i + 1) + '</span>' +
        '<h3 class="capability__title">' + esc(c.title) + '</h3>' +
        '<p class="capability__text">' + esc(c.text) + '</p></li>';
    }).join(''));

    fill('[data-services]', site.services.map(function (s) {
      return '<li class="service"><h4 class="service__title">' + esc(s.title) + '</h4><p>' + esc(s.text) + '</p></li>';
    }).join(''));

    fill('[data-recognition]', Render.recognitionHTML(site.recognition));

    fill('[data-approach]', site.approach.map(function (a, i) {
      return '<li data-reveal style="--reveal-delay:' + i * 90 + 'ms">' + esc(a) + '</li>';
    }).join(''));
  }

  /* ---- Project grid: shared by Home (featured) and Projects ------------------- */

  // Plays a card's video on hover or keyboard focus (and pauses on leave) where
  // the device has a hover-capable pointer. On touch devices there is no hover,
  // so a video plays while at least 60% of it is on screen instead. Under
  // reduced motion nothing ever autoplays: the poster stays, and the modal's
  // video has controls for anyone who wants to press play.
  function initVideoPreviews(root) {
    if (!root || prefersReducedMotion()) return;
    var videos = [].slice.call(root.querySelectorAll('.project-card video'));
    if (!videos.length) return;

    // play() returns a promise that rejects if the browser blocks or interrupts it;
    // that is harmless here, so the rejection is swallowed.
    function play(v) { var r = v.play(); if (r && r.catch) r.catch(function () {}); }

    if (window.matchMedia('(hover: hover)').matches) {
      videos.forEach(function (v) {
        var card = v.closest('.project-card');
        card.addEventListener('mouseenter', function () { play(v); });
        card.addEventListener('mouseleave', function () { v.pause(); });
        card.addEventListener('focusin', function () { play(v); });
        card.addEventListener('focusout', function (e) {
          // Moving focus between the card's own links must not stop the video.
          if (!card.contains(e.relatedTarget)) v.pause();
        });
      });
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) play(entry.target); else entry.target.pause();
        });
      }, { threshold: 0.6 });
      videos.forEach(function (v) { io.observe(v); });
    }
  }

  // Renders projects as cards into root, makes each card's media button open the
  // project's modal, and opens the modal for a matching #<slug> in the URL
  // (this is how Home's old "open on projects.html" links and shared links land).
  function initProjectGrid(root, projects) {
    if (!root) return;
    root.innerHTML = projects.map(Render.projectCardHTML).join('');

    var bySlug = {};
    projects.forEach(function (p) { bySlug[p.slug] = p; });

    function openProject(p, button) {
      Modal.open(Render.projectModalHTML(p), { label: p.title, opener: button });
    }

    root.querySelectorAll('.project-card').forEach(function (card) {
      var p = bySlug[card.dataset.slug];
      var button = card.querySelector('.project-card__open');
      // Render's markup has no accessible name beyond the image alt, so say what
      // the button does.
      button.setAttribute('aria-label', 'Open ' + p.title + ' details');
      button.addEventListener('click', function () { openProject(p, button); });
    });

    initVideoPreviews(root);

    // A malformed hash (e.g. #%E0%A4%A) makes decodeURIComponent throw; ignore it.
    var slug = '';
    try { slug = decodeURIComponent(window.location.hash.slice(1)); } catch (e) { /* no modal */ }
    if (bySlug[slug]) {
      var card = root.querySelector('.project-card[data-slug="' + slug + '"]');
      openProject(bySlug[slug], card.querySelector('.project-card__open'));
    }
  }

  // The filter chips: exactly one is pressed at a time; the others' cards get
  // the hidden attribute, and a role="status" line announces the new count.
  function initFilters(root, projects) {
    var chips = [].slice.call(document.querySelectorAll('.filters [data-filter]'));
    var status = document.querySelector('[data-filter-status]');
    if (!root || !chips.length) return;

    function apply(category) {
      var keep = {};
      Render.filterProjects(projects, category).forEach(function (p) { keep[p.slug] = true; });
      root.querySelectorAll('.project-card').forEach(function (card) {
        card.hidden = !keep[card.dataset.slug];
        // A hidden card must not keep playing.
        var v = card.querySelector('video');
        if (v && card.hidden) v.pause();
      });
      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', c.dataset.filter === category ? 'true' : 'false');
      });
      var n = Object.keys(keep).length;
      if (status) status.textContent = 'Showing ' + n + (n === 1 ? ' project' : ' projects');
    }

    chips.forEach(function (c) {
      c.addEventListener('click', function () { apply(c.dataset.filter); });
    });
    apply('all');
  }

  function initProjects() {
    var root = document.querySelector('[data-projects]');
    initProjectGrid(root, SITE.projects);
    initFilters(root, SITE.projects);
  }

  // The browser jumps to a #section before app.js has filled the sections
  // above it, which then grow and push the target down. Jump again once filled.
  function rescrollToHash() {
    var id = window.location.hash.slice(1);
    var target = id && document.getElementById(id);
    if (target) target.scrollIntoView();
  }

  function initHome() {
    if (initLegacyAnchors()) return;   // leaving for another page: render nothing
    window.addEventListener('hashchange', initLegacyAnchors);
    renderHome(SITE);
    initTicker(document.querySelector('[data-ticker]'), SITE.roles);
    initCounters(document.querySelector('[data-counters]'));
    initProjectGrid(document.querySelector('[data-featured]'), FEATURED.map(function (slug) {
      return SITE.projects.filter(function (p) { return p.slug === slug; })[0];
    }).filter(Boolean));
    initReveal();
    rescrollToHash();
  }

  /* ---- Journey ------------------------------------------------------------ */

  // Devicon class for each stack item or tool that has one. Checked against
  // devicon@2.17.0's stylesheet; anything missing here (ASP.NET Web Forms,
  // VB.NET, Entity Framework 6, ADO.NET, localStorage, UI/UX, SQL, the World
  // Bank API, Microsoft Office, Google Workspace) shows a plain mono chip
  // rather than a near-miss logo that would misname the technology.
  var DEVICON = {
    'HTML': 'devicon-html5-plain',
    'CSS': 'devicon-css3-plain',
    'JavaScript': 'devicon-javascript-plain',
    'TypeScript': 'devicon-typescript-plain',
    'React': 'devicon-react-original',
    'React Native/Expo': 'devicon-reactnative-original',
    'Chart.js': 'devicon-chartjs-plain',
    'Bootstrap': 'devicon-bootstrap-plain',
    'Python': 'devicon-python-plain',
    'FastAPI': 'devicon-fastapi-plain',
    'SQLAlchemy': 'devicon-sqlalchemy-plain',
    'PostgreSQL': 'devicon-postgresql-plain',
    'SQL Server': 'devicon-microsoftsqlserver-plain',
    'C#': 'devicon-csharp-plain',
    'Docker': 'devicon-docker-plain',
    'Git': 'devicon-git-plain',
    'Visual Studio': 'devicon-visualstudio-plain'
  };

  // One chip. `used` (project titles) is optional: with it, the chip has a
  // <details> that opens a "Used in" list, so the grid stays calm until asked.
  function skillChipHTML(name, used) {
    var esc = Render.escapeHTML;
    var icon = DEVICON[name] ? '<i class="' + DEVICON[name] + '" aria-hidden="true"></i>' : '';
    var label = '<span class="skill__name">' + icon + esc(name) + '</span>';
    if (!used || !used.length) return '<li class="skill">' + label + '</li>';
    return '<li class="skill skill--used"><details>' +
      '<summary>' + label + '<span class="skill__count" aria-hidden="true">' + used.length + '</span></summary>' +
      '<div class="skill__used"><p class="skill__used-label">Used in</p><ul>' +
      used.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
      '</ul></div></details></li>';
  }

  function renderSkills(site) {
    var chips = [];
    Render.skillUsage(site.projects).forEach(function (titles, name) {
      chips.push(skillChipHTML(name, titles));
    });
    return '<div class="skill-group" data-group="built-with"><h3 class="skill-group__title">Built with</h3>' +
      '<ul class="skills">' + chips.join('') + '</ul></div>' +
      '<div class="skill-group" data-group="tools"><h3 class="skill-group__title">Tools</h3>' +
      '<ul class="skills">' + site.cvTools.map(function (t) { return skillChipHTML(t); }).join('') + '</ul></div>';
  }

  function initJourney() {
    var esc = Render.escapeHTML;
    function cards(kind) {
      return SITE.experiences.filter(function (e) {
        return (e.kind === 'event') === (kind === 'event');
      }).map(Render.experienceCardHTML).join('');
    }
    fill('[data-timeline]', Render.timelineHTML(SITE.timeline));
    fill('[data-experience]', cards('work'));
    fill('[data-events]', cards('event'));
    fill('[data-education]', SITE.education.map(function (e) {
      return '<li class="edu"><span class="edu__when">' + esc(e.when) + '</span>' +
        '<h3 class="edu__award">' + esc(e.award) + '</h3><p class="edu__school">' + esc(e.school) + '</p></li>';
    }).join(''));
    fill('[data-skills]', renderSkills(SITE));
    fill('[data-languages]', SITE.languages.map(function (l) {
      return '<li class="language"><span class="language__name">' + esc(l.name) + '</span>' +
        '<span class="language__level">' + esc(l.level) + '</span></li>';
    }).join(''));

    // "View gallery" buttons open the event's photos in the shared modal.
    var byId = {};
    SITE.experiences.forEach(function (e) { byId[e.id] = e; });
    document.querySelectorAll('.exp-card__gallery').forEach(function (button) {
      var e = byId[button.dataset.gallery];
      button.setAttribute('aria-haspopup', 'dialog');
      button.addEventListener('click', function () {
        Modal.open('<h2 id="gallery-title-' + esc(e.id) + '">' + esc(e.title) + '</h2>' +
          Render.galleryHTML(e.gallery, e.title), { label: e.title, opener: button });
      });
    });

    // Reveal each timeline entry and card as it scrolls in (a no-op under
    // reduced motion; see initReveal).
    document.querySelectorAll('.timeline__item, .exp-card, .edu').forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      el.style.setProperty('--reveal-delay', (i % 3) * 80 + 'ms');
    });
    initReveal();
    rescrollToHash();   // #experience / #skills sit below sections that just grew
  }

  /* ---- Recognition -------------------------------------------------------- */

  function initRecognition() {
    var esc = Render.escapeHTML;
    fill('[data-recognition]', Render.recognitionHTML(SITE.recognition));
    // Every SITE string is escaped; the vision is the verbatim sentence.
    fill('[data-gonex-summary]', SITE.gonex.summary.map(function (p) {
      return '<p>' + esc(p) + '</p>';
    }).join(''));
    fill('[data-gonex-vision]', '<blockquote class="pull-quote">' + esc(SITE.gonex.vision) + '</blockquote>');
    var link = document.querySelector('[data-gonex-link]');
    if (link) link.setAttribute('href', SITE.gonex.url);
    fill('[data-certificates]', SITE.certificates.map(Render.certificateCardHTML).join(''));

    // Image cards open the full scan in the shared dialog. Text cards (no
    // scan yet) have no button, so they stay inert. The dialog is named by
    // its first h2[id]; the issuer line shows below the image.
    var byImage = {};
    SITE.certificates.forEach(function (c) { byImage[c.image] = c; });
    document.querySelectorAll('.cert-card__open').forEach(function (button) {
      var c = byImage[button.dataset.full];
      if (!c) return;
      button.addEventListener('click', function () {
        Modal.open('<h2 id="cert-title-' + esc(c.slug) + '">' + esc(c.title) + '</h2>' +
          '<img src="' + esc(button.dataset.full) + '" alt="' + esc(c.title) + ' certificate">' +
          '<p>' + esc(c.issuer) + ' \u00b7 ' + esc(c.when) + '</p>', { label: c.title, opener: button });
      });
    });

    document.querySelectorAll('.recognition > li, .pull-quote, .cert-card').forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      el.style.setProperty('--reveal-delay', (i % 4) * 70 + 'ms');
    });
    initReveal();
    rescrollToHash();   // #gonex / #certificates sit below sections that just grew
  }

  /* ---- Contact ------------------------------------------------------------ */

  // Posts the form to Formspree with fetch (ported from the old site) and says
  // what happened in `status`, a polite live region. The button is disabled
  // while the request is in flight so a double click cannot send it twice.
  function initContactForm(form, status) {
    if (!form || !status) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      status.textContent = 'Sending your message...';
      status.classList.remove('success', 'error');
      var button = form.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      try {
        var response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }   // Formspree answers JSON, not a redirect page
        });
        if (response.ok) {
          status.textContent = 'Thanks! Your message has been sent.';
          status.classList.add('success');
          form.reset();
        } else {
          status.textContent = 'Sorry, there was a problem sending your message.';
          status.classList.add('error');
        }
      } catch (error) {
        status.textContent = 'Network error. Please try again in a moment.';
        status.classList.add('error');
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  var SOCIALS = [
    ['linkedin', 'LinkedIn', 'fa-brands fa-linkedin-in'],
    ['github', 'GitHub', 'fa-brands fa-github'],
    ['facebook', 'Facebook', 'fa-brands fa-facebook-f'],
    ['instagram', 'Instagram', 'fa-brands fa-instagram']
  ];

  function initContact() {
    var esc = Render.escapeHTML;
    var p = SITE.person;
    fill('[data-contact-details]',
      '<li><i class="fa-solid fa-envelope" aria-hidden="true"></i><div><span class="contact-list__label">Email</span>' +
      '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></div></li>' +
      '<li><i class="fa-solid fa-location-dot" aria-hidden="true"></i><div><span class="contact-list__label">Based in</span>' +
      '<span>' + esc(p.location) + '</span></div></li>');
    fill('[data-contact-socials]', SOCIALS.map(function (s) {
      return '<li><a class="social" href="' + esc(p.socials[s[0]]) + '" target="_blank" rel="noopener">' +
        '<i class="' + s[2] + '" aria-hidden="true"></i><span>' + s[1] + '</span></a></li>';
    }).join(''));
    initContactForm(document.getElementById('contact-form'), document.getElementById('form-status'));
    initReveal();
  }

  // One entry per <body data-page="...">. Later tasks fill the others in.
  var PAGE_INITS = {
    home: initHome,
    projects: initProjects,
    journey: initJourney,
    recognition: initRecognition,
    contact: initContact
  };

  function start() {
    initHeader();
    var init = PAGE_INITS[document.body.dataset.page];
    if (init) init();
  }

  // Deferred scripts run before DOMContentLoaded, so normally we wait for it;
  // if the document has already finished parsing, start straight away.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
