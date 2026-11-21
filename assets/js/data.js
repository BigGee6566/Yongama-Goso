/* data.js: all of the site's content, in one object called SITE.
   It is filled in Task 5; for now it is an empty stub.

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
  return {};
});
