/* app.js: wires the page up once the HTML has loaded.

   It is a classic script, not an ES module, on purpose: browsers refuse to
   load modules from file://, and the site must work when index.html is
   opened straight from disk. Everything sits inside one function (an IIFE)
   so its helpers don't leak out as globals.

   Flow: initHeader() runs on every page, then the init function for this
   page is looked up by <body data-page="..."> and run. */
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

  // One entry per <body data-page="...">. Later tasks fill these in.
  var PAGE_INITS = {
    home: function () {},
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
