/* modal.js: the accessible dialog used by project cards (and later galleries).

   Modal.open(html, { label, opener }) shows html inside a dialog; Modal.close()
   removes it. While it is open:
   - the page behind cannot scroll;
   - focus moves into the dialog and Tab / Shift+Tab loop inside it;
   - Escape, the close button and a click on the dim overlay all close it;
   - on close, focus returns to opener (the button that opened it).
   Only one dialog exists at a time: opening a second replaces the first.

   Modal.open trusts its html: it is inserted as markup, unescaped. Callers must build it
   from escaped text (Render's HTML builders, or Render.escapeHTML for every SITE string).

   Classic script (no modules) so it works from file://. */
(function (root) {
  'use strict';

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

  var current = null; // { el, opener, onKey, prevOverflow } while a dialog is open

  // Focusable elements inside the dialog that are actually rendered.
  function focusables(el) {
    return [].slice.call(el.querySelectorAll(FOCUSABLE)).filter(function (n) {
      return n.offsetParent !== null || n === document.activeElement;
    });
  }

  // Removes dialog c and its key handler and gives the page its scroll back. Focus is not
  // moved here: close() returns it to the opener, open() moves it into the new dialog.
  function teardown(c) {
    document.removeEventListener('keydown', c.onKey, true);
    c.el.remove();
    document.body.style.overflow = c.prevOverflow;
  }

  function close() {
    if (!current) return;
    var c = current;
    current = null;
    teardown(c);
    // The opener may have been removed from the page in the meantime.
    if (c.opener && document.contains(c.opener) && c.opener.focus) c.opener.focus();
  }

  function open(html, options) {
    options = options || {};
    if (current) {
      // Replacing: drop the old dialog first. Its teardown restores the scroll state from
      // before it opened, so the new dialog saves and later restores that original state.
      // The opener is NOT carried over: the new dialog returns focus to options.opener, or
      // to whatever had focus once the old dialog was gone.
      var old = current;
      current = null;
      teardown(old);
    }

    var el = document.createElement('div');
    el.className = 'modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="modal__overlay" data-modal-close></div>' +
      '<div class="modal__panel">' +
      '<button type="button" class="modal__close" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
      '<div class="modal__content">' + html + '</div>' +
      '</div>';

    // The dialog is named by the content's own heading when it has an id,
    // otherwise by the label the caller passed.
    var heading = el.querySelector('.modal__content h2[id]');
    if (heading) el.setAttribute('aria-labelledby', heading.id);
    else el.setAttribute('aria-label', options.label || 'Details');

    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation(); // the header menu also listens for Escape
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      // Trap: wrap at both ends, and pull focus back if it ever escaped.
      var items = focusables(el);
      if (!items.length) { event.preventDefault(); return; }
      var first = items[0];
      var last = items[items.length - 1];
      var active = document.activeElement;
      if (!el.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    el.addEventListener('click', function (event) {
      if (event.target.closest('.modal__close') || event.target.hasAttribute('data-modal-close')) close();
    });

    current = {
      el: el,
      opener: options.opener || document.activeElement,
      onKey: onKey,
      prevOverflow: document.body.style.overflow
    };
    document.body.style.overflow = 'hidden';
    document.body.appendChild(el);
    // Capture phase, so the trap runs before any other Tab handling.
    document.addEventListener('keydown', onKey, true);
    el.querySelector('.modal__close').focus();
  }

  root.Modal = { open: open, close: close };
})(window);
