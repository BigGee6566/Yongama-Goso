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

  var FEATURED = ['nova-journal', 'open-data-dashboard', 'thaba-shield', 'momali'];

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

    fill('[data-featured]', FEATURED.map(function (slug) {
      var p = site.projects.filter(function (x) { return x.slug === slug; })[0];
      return p ? Render.projectCardHTML(p) : '';
    }).join(''));

    fill('[data-recognition]', Render.recognitionHTML(site.recognition));

    fill('[data-approach]', site.approach.map(function (a, i) {
      return '<li data-reveal style="--reveal-delay:' + i * 90 + 'ms">' + esc(a) + '</li>';
    }).join(''));
  }

  // Until Task 8 builds the project modal, a featured card's button opens that
  // project on the Projects page. Task 8 swaps this one function for
  // initProjectGrid(). Meanwhile the button leads to a page, not a dialog, so
  // its aria-haspopup="dialog" would mislead screen readers; it is removed.
  function initFeaturedCards(root) {
    if (!root) return;
    root.querySelectorAll('.project-card__open').forEach(function (b) {
      b.removeAttribute('aria-haspopup');
    });
    root.addEventListener('click', function (event) {
      var open = event.target.closest('.project-card__open');
      if (!open) return;
      var slug = open.closest('.project-card').dataset.slug;
      window.location.href = 'projects.html#' + encodeURIComponent(slug);
    });
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
    initFeaturedCards(document.querySelector('[data-featured]'));
    initReveal();
    rescrollToHash();
  }

  // One entry per <body data-page="...">. Later tasks fill the others in.
  var PAGE_INITS = {
    home: initHome,
    projects: function () {},
    journey: function () {},
    recognition: function () {},
    contact: function () {}
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
