'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'tools', 'optimize-images.py');

const LOGOS = [
  'BigGee6566_TutorConnect/Images/branding/tutorconnect-logo.png',
  'BigGee6566_StudyLink/Images/branding/studylink-logo.png',
  'BigGee6566_SmartShelf/Images/smartshelf-logo.png',
  'BigGee6566_BusNova_System/BusNova_System_NoDB/Images/logo.jpeg',
  'BigGee6566_C-Sharp-Shooter/Images/web/logo.png',
];

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p)];
  }).sort();
}

function run(args) {
  return spawnSync('python3', ['-I', script, ...args], { encoding: 'utf8' });
}

test('optimizer keeps foreign files, is idempotent, and is atomic on failure', { timeout: 300000 }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'optimg-'));
  try {
    const repos = path.join(tmp, 'repos');
    const out = path.join(tmp, 'out');
    for (const l of LOGOS) {
      const p = path.join(repos, l);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      execFileSync('python3', ['-I', '-c',
        `from PIL import Image; Image.new("RGB",(40,20),(9,9,9)).save(${JSON.stringify(p)}, ${JSON.stringify(l.endsWith('.jpeg') ? 'JPEG' : 'PNG')})`]);
    }
    const foreign = ['media/projects/nova-journal/demo.mp4', 'media/projects/nova-journal/shot-1.webp'];
    for (const f of foreign) {
      fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true });
      fs.writeFileSync(path.join(out, f), 'dummy ' + f);
    }

    let r = run(['--repos', repos, '--out-root', out]);
    assert.strictEqual(r.status, 0, r.stderr);
    const first = listFiles(out);
    for (const f of foreign) assert.strictEqual(fs.readFileSync(path.join(out, f), 'utf8'), 'dummy ' + f);
    assert.ok(!first.some((f) => f.includes('.media-stage-')), 'staging dir left behind');

    r = run(['--repos', repos, '--out-root', out]);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.deepStrictEqual(listFiles(out), first, 'second run must give an identical file set');
    for (const f of foreign) assert.ok(fs.existsSync(path.join(out, f)), `${f} was removed`);

    // failure (missing logo sources) must leave media/ exactly as it was
    const before = listFiles(out);
    const manifestBefore = fs.readFileSync(path.join(out, 'media/manifest.json'), 'utf8');
    r = run(['--repos', path.join(tmp, 'no-such-repos'), '--out-root', out]);
    assert.notStrictEqual(r.status, 0);
    assert.deepStrictEqual(listFiles(out), before);
    assert.strictEqual(fs.readFileSync(path.join(out, 'media/manifest.json'), 'utf8'), manifestBefore);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
