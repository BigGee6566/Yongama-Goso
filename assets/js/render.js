/* render.js: pure functions that turn SITE data into HTML strings.
   Filled in Task 6; for now Render is an empty stub.
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
  return {};
});
