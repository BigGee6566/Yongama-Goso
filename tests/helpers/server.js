'use strict';
// Tiny static file server for tests (the real site is plain files on GitHub Pages).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.pdf': 'application/pdf', '.woff2': 'font/woff2',
};

function startServer(rootDir) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch { res.writeHead(400).end('bad request'); return; }
    if (rel.endsWith('/')) rel += 'index.html'; // "/" -> "/index.html"
    const file = path.join(root, rel);
    // Refuse paths that escape the root (e.g. /../secret).
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end('forbidden'); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${server.address().port}`,
      close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
    }));
  });
}

const EXCLUDED = new Set(['node_modules', 'tests', 'tools', 'docs', '.git']);
const SCANNED = /\.(html|js|css|json|svg)$/i;

// Repo-relative (forward-slash) paths of every publishable text file.
function servedFiles(rootDir) {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!EXCLUDED.has(e.name)) walk(path.join(dir, e.name)); }
      else if (SCANNED.test(e.name)) out.push(path.relative(rootDir, path.join(dir, e.name)).split(path.sep).join('/'));
    }
  })(rootDir);
  return out.sort();
}

module.exports = { startServer, servedFiles };
