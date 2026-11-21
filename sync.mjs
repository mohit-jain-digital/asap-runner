// ASAP-Rank sync. Pulls the latest ASAP-Rank release into THIS repository.
// It runs only inside your own GitHub (started by the Sync button in your dashboard, or by hand from the Actions tab).
// Safety: the release must match the commit (or file checksum) published in the owner's version.json. If it does not, nothing is changed.
// Your own files are never touched: workflows, wrangler.jsonc, secrets and site/config.js stay as they are.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const KIND = process.argv[2] === 'app' ? 'app' : 'runner';
const MANIFEST = process.env.ASAP_MANIFEST_URL || 'https://asap-rank.artistryc.in/version.json';
const MIRROR = (process.env.ASAP_MIRROR_URL || '').replace(/\/+$/, '');
const GIT_BASE = process.env.ASAP_GIT_BASE || 'https://github.com/';
const OK_URL = u => /^https:\/\//.test(u) || (process.env.ASAP_ALLOW_HTTP === '1' && /^http:\/\//.test(u));
const TAKE = KIND === 'app'
  ? { dirs: ['src'], files: ['package.json', 'README.md', 'LICENSE', 'VERSION', 'sync.mjs'] }
  : { dirs: ['site', 'supabase'], files: ['run.mjs', 'checks.mjs', 'publish.mjs', 'mirror.mjs', 'sync.mjs', 'package.json', 'README.md', 'LICENSE', 'VERSION'] };
const KEEP_LOCAL = ['site/config.js'];

const getJson = async u => { const r = await fetch(u, { signal: AbortSignal.timeout(20000), headers: { accept: 'application/json' } }); if (!r.ok) throw new Error(u + ' answered ' + r.status); return r.json() };
async function manifest() {
  let err;
  for (const u of [MANIFEST, MIRROR && MIRROR + '/version.json'].filter(x => x && OK_URL(x))) {
    try {
      const m = await getJson(u), t = m && m[KIND];
      if (m && /^\d+(\.\d+){1,4}$/.test(String(m.version || '')) && t && /^[\w.-]+\/[\w.-]+$/.test(t.repo || '') && /^[\w.-]+$/.test(t.tag || '') && /^[0-9a-f]{40}$/.test(t.commit || '')) return m;
      err = new Error('The release list at ' + u + ' is incomplete.');
    } catch (e) { err = e }
  }
  throw err || new Error('No release list address is set.');
}
const read = f => { try { return fs.readFileSync(f, 'utf8').trim() } catch { return '' } };

let m; try { m = await manifest() } catch (e) { console.error('Could not read the release list: ' + e.message + '. Nothing was changed.'); process.exit(1) }
const t = m[KIND], have = read('VERSION');
console.log('Installed: ' + (have || 'unknown') + '   Latest: ' + m.version);
if (have === m.version) { console.log('Already up to date. Nothing to do.'); process.exit(0) }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asap-')), src = path.join(tmp, 'src');
let ok = false;
try {
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', t.tag, GIT_BASE + t.repo + '.git', src], { stdio: 'inherit' });
  const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD']).toString().trim();
  if (head !== t.commit) throw new Error('The downloaded release does not match the published commit.');
  ok = true;
} catch (e) { console.log('GitHub copy not usable: ' + e.message) }
if (!ok && MIRROR && OK_URL(MIRROR) && /^[0-9a-f]{64}$/.test(t.sha256 || '') && /^[\w.-]+$/.test(t.file || '')) {
  try {
    const r = await fetch(MIRROR + '/' + t.file, { signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('mirror answered ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (crypto.createHash('sha256').update(buf).digest('hex') !== t.sha256) throw new Error('The mirror file does not match its published checksum.');
    fs.mkdirSync(src); const f = path.join(tmp, 'rel.tar.gz'); fs.writeFileSync(f, buf);
    execFileSync('tar', ['xzf', f, '-C', src]); ok = true;
  } catch (e) { console.log('Mirror copy not usable: ' + e.message) }
}
if (!ok) { console.error('Could not get a verified copy of the release. Nothing was changed.'); process.exit(1) }

const kept = KEEP_LOCAL.filter(f => fs.existsSync(f)).map(f => [f, fs.readFileSync(f)]);
for (const d of TAKE.dirs) { if (!fs.existsSync(path.join(src, d))) continue; fs.rmSync(d, { recursive: true, force: true }); fs.cpSync(path.join(src, d), d, { recursive: true }) }
for (const f of TAKE.files) if (fs.existsSync(path.join(src, f))) fs.copyFileSync(path.join(src, f), f);
for (const [f, b] of kept) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b) }
fs.writeFileSync('VERSION', m.version + '\n');
console.log('Updated to ' + m.version + '.');
