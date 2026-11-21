#!/usr/bin/env node
'use strict';
// Usage: node tests/helpers/serve-cli.js [rootDir]  -> serves the site locally.
const path = require('node:path');
const { startServer } = require('./server.js');

startServer(path.resolve(process.argv[2] || path.join(__dirname, '..', '..'))).then(({ url }) => {
  console.log(`Serving at ${url}  (Ctrl+C to stop)`);
});
