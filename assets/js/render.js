/* render.js: pure functions that turn SITE data into HTML strings.
   No DOM access. app.js inserts the strings into the pages.
   Same UMD wrapper as data.js: a global `Render` in the browser, and
   module.exports in Node so the renderers can be unit-tested. */
(function (root, factory) {
  var Render = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = Render;
  } else {
    root.Render = Render;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PENDING_SORT = '9999';

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  var esc = escapeHTML;

  // Wraps text in a tag only when the text is non-empty.
  function el(tag, cls, text) {
    if (!text) return '';
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + esc(text) + '</' + tag + '>';
  }

  function filterProjects(projects, category) {
    if (!category || category === 'all') return projects.slice();
    return projects.filter(function (p) { return p.categories.indexOf(category) !== -1; });
  }

  function computeCounters(site) {
    return [
      { value: site.projects.filter(function (p) { return p.repo; }).length, label: 'Public projects on GitHub' },
      { value: site.experiences.filter(function (e) { return e.kind === 'event'; }).length, label: 'Hackathons & pitch events' },
      { value: site.certificates.length, label: 'Certifications' },
      { value: site.languages.length, label: 'Languages spoken' }
    ];
  }

  function skillUsage(projects) {
    var map = new Map();
    projects.forEach(function (p) {
      (p.stack || []).forEach(function (s) {
        if (!map.has(s)) map.set(s, []);
        map.get(s).push(p.title);
      });
    });
    return map;
  }

  function badgesHTML(stack) {
    if (!stack || !stack.length) return '';
    return '<ul class="badges">' + stack.map(function (s) {
      return '<li class="badge">' + esc(s) + '</li>';
    }).join('') + '</ul>';
  }

  function linksHTML(p, cls) {
    var out = '';
    if (p.repo) out += '<a class="' + cls + 'code" href="' + esc(p.repo) + '" target="_blank" rel="noopener">Code</a>';
    if (p.live) out += '<a class="' + cls + 'live" href="' + esc(p.live) + '" target="_blank" rel="noopener">Live</a>';
    return out;
  }

  // media.video is {mp4, webm}, or a path to one of them.
  function videoSources(v) {
    if (typeof v === 'string') {
      var base = v.replace(/\.(mp4|webm)$/, '');
      return { mp4: base + '.mp4', webm: base + '.webm' };
    }
    return v;
  }

  function videoHTML(p, attrs) {
    var v = videoSources(p.media.video);
    return '<video ' + attrs + ' poster="' + esc(p.media.poster) + '">' +
      '<source src="' + esc(v.mp4) + '" type="video/mp4">' +
      '<source src="' + esc(v.webm) + '" type="video/webm">' +
      '</video>';
  }

  function posterImg(p) {
    return '<img src="' + esc(p.media.poster) + '" alt="' + esc(p.title + ' preview') + '" loading="lazy">';
  }

  function projectCardHTML(p) {
    var pending = p.capture === 'pending' || p.capture === 'pending-pc';
    var cls = 'project-card' + (p.capture === 'pending-pc' ? ' project-card--logo' : '');
    var media = p.media.video
      ? videoHTML(p, 'muted loop playsinline preload="none"')
      : posterImg(p);
    return '<article class="' + cls + '" data-slug="' + esc(p.slug) + '" data-capture="' + esc(p.capture) +
      '" data-categories="' + esc(p.categories.join(' ')) + '">' +
      '<button class="project-card__open" aria-haspopup="dialog">' +
      '<span class="project-card__media">' + media + '</span>' +
      (pending ? '<span class="badge badge--pending">Running capture coming soon</span>' : '') +
      '</button>' +
      '<div class="project-card__body">' +
      '<h3 class="project-card__title">' + esc(p.title) + '</h3>' +
      el('p', 'project-card__tagline', p.tagline) +
      el('p', 'project-card__context', p.context) +
      badgesHTML(p.stack) +
      '<div class="project-card__links">' + linksHTML(p, 'project-card__') + '</div>' +
      '</div></article>';
  }

  function projectModalHTML(p) {
    var media = p.media.video
      ? videoHTML(p, 'controls playsinline preload="metadata"')
      : '<img src="' + esc(p.media.poster) + '" alt="' + esc(p.title + ' preview') + '">';
    var shots = p.media.shots || [];
    return '<h2 id="modal-title-' + esc(p.slug) + '">' + esc(p.title) + '</h2>' +
      '<div class="modal__media">' + media + '</div>' +
      (p.media.demoData ? '<p class="demo-data-note">Demo data shown. No real user information appears here.</p>' : '') +
      el('p', 'modal__description', p.description) +
      el('p', 'modal__context', p.context) +
      badgesHTML(p.stack) +
      '<div class="modal__links">' + linksHTML(p, 'modal__') + '</div>' +
      (shots.length ? galleryHTML(shots, p.title) : '');
  }

  function thumb(path) {
    return /-1400\.webp$/.test(path) ? path.replace(/-1400\.webp$/, '-640.webp') : path;
  }

  function galleryHTML(images, title) {
    if (!images || !images.length) return '';
    var n = images.length;
    return '<div class="gallery">' + images.map(function (src, i) {
      return '<a class="gallery__item" href="' + esc(src) + '">' +
        '<img src="' + esc(thumb(src)) + '" alt="' + esc(title + ' — photo ' + (i + 1) + ' of ' + n) + '" loading="lazy">' +
        '</a>';
    }).join('') + '</div>';
  }

  function experienceCardHTML(e) {
    var hl = (e.highlights || []).filter(Boolean);
    return '<article class="exp-card' + (e.cover ? '' : ' exp-card--text') + '" data-id="' + esc(e.id) +
      '" data-kind="' + esc(e.kind) + '">' +
      (e.cover ? '<img class="exp-card__cover" src="' + esc(e.cover) + '" alt="' + esc(e.title + ' cover photo') + '" loading="lazy">' : '') +
      '<div class="exp-card__body">' +
      el('span', 'exp-card__tag', e.tag) +
      '<h3 class="exp-card__title">' + esc(e.title) + '</h3>' +
      el('p', 'exp-card__when', e.when) +
      el('p', 'exp-card__org', e.org) +
      el('p', 'exp-card__subtitle', e.subtitle) +
      el('p', 'exp-card__description', e.description) +
      (hl.length ? '<ul class="exp-card__highlights">' + hl.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' : '') +
      (e.gallery && e.gallery.length ? '<button class="exp-card__gallery" data-gallery="' + esc(e.id) + '">View gallery</button>' : '') +
      '</div></article>';
  }

  function timelineHTML(entries) {
    var sorted = entries.map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) {
      if (a.e.sort < b.e.sort) return -1;
      if (a.e.sort > b.e.sort) return 1;
      return a.i - b.i;
    });
    return '<ol class="timeline">' + sorted.map(function (x) {
      var e = x.e;
      return '<li class="timeline__item' + (e.sort === PENDING_SORT ? ' timeline__item--pending' : '') + '">' +
        el('span', 'timeline__when', e.when) +
        el('h3', 'timeline__title', e.title) +
        el('p', 'timeline__detail', e.detail) +
        '</li>';
    }).join('') + '</ol>';
  }

  function certificateCardHTML(c) {
    var caption = '<span class="cert-card__title">' + esc(c.title) + '</span>' +
      el('span', 'cert-card__issuer', c.issuer) + el('span', 'cert-card__when', c.when);
    if (!c.image) {
      return '<article class="cert-card cert-card--text">' + caption + '</article>';
    }
    return '<figure class="cert-card">' +
      '<button class="cert-card__open" data-full="' + esc(c.image) + '" aria-haspopup="dialog">' +
      '<img src="' + esc(thumb(c.image)) + '" alt="' + esc(c.title + ' certificate') + '" loading="lazy">' +
      '</button><figcaption>' + caption + '</figcaption></figure>';
  }

  function recognitionHTML(items) {
    return '<ul class="recognition">' + items.map(function (r) {
      return '<li>' + el('strong', 'recognition__title', r.title) +
        el('p', 'recognition__detail', r.detail) + el('span', 'recognition__when', r.when) + '</li>';
    }).join('') + '</ul>';
  }

  return {
    escapeHTML: escapeHTML,
    filterProjects: filterProjects,
    computeCounters: computeCounters,
    skillUsage: skillUsage,
    projectCardHTML: projectCardHTML,
    projectModalHTML: projectModalHTML,
    experienceCardHTML: experienceCardHTML,
    galleryHTML: galleryHTML,
    timelineHTML: timelineHTML,
    certificateCardHTML: certificateCardHTML,
    recognitionHTML: recognitionHTML
  };
});
