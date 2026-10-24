// Turns finished customer settings (Supabase static_cfg) into plain files in ./docs, served free by GitHub Pages.
// Visitors then load popups, chat and page changes from Pages, not from your Worker.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const KEY_OK = /^[A-Za-z0-9_-]{4,64}$/, MAXINLINE = 60000, BUCKETS = 64;
const np = x => String(x).length > 1 ? String(x).replace(/\/+$/, '') : String(x);
export const bucket = p => { let h = 2166136261; for (let i = 0; i < p.length; i++) { h ^= p.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) % BUCKETS };
// A page rule is "exact" when it names one page. Anything with a wildcard, regex or list goes in the shared "w" shard.
const exact = p => { p = String(p || '').trim(); return !!p && !/[*\n,]/.test(p) && !p.startsWith('re:') };

// Returns { core, shards: { name: {changes:[...]}} }. Small sites stay in one file.
export function splitCfg(body) {
  const b = { ...body }, ch = Array.isArray(b.changes) ? b.changes : [];
  if (JSON.stringify(ch).length <= MAXINLINE) return { core: b, shards: {} };
  const sh = {}; ch.forEach(c => { const n = exact(c.page) ? String(bucket(np(c.page))) : 'w'; (sh[n] = sh[n] || { changes: [] }).changes.push(c) });
  b.changes = []; b.sh = 1; if (!sh.w) sh.w = { changes: [] }; return { core: b, shards: sh };
}
export function writeSite(root, site, body) {
  if (!KEY_OK.test(site)) return false;
  const dir = path.join(root, 'c'), sd = path.join(dir, site); fs.mkdirSync(dir, { recursive: true });
  fs.rmSync(sd, { recursive: true, force: true });
  const { core, shards } = splitCfg(body); fs.writeFileSync(path.join(dir, site + '.json'), JSON.stringify(core));
  const names = Object.keys(shards); if (names.length) { fs.mkdirSync(sd, { recursive: true }); names.forEach(n => fs.writeFileSync(path.join(sd, n + '.json'), JSON.stringify(shards[n]))) }
  return true;
}

export async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, APP_URL } = process.env; if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY.'); process.exit(1) }
  const base = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/', H = { apikey: SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + SUPABASE_SERVICE_KEY, 'content-type': 'application/json' }, root = process.env.DOCS_DIR || 'docs';
  fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(path.join(root, '.nojekyll'), '');
  let total = 0;
  for (let round = 0; round < 40; round++) {
    const r = await fetch(base + 'static_cfg?select=site,body&dirty=eq.true&order=updated&limit=250', { headers: H }); if (!r.ok) throw new Error('Supabase ' + r.status);
    const rows = await r.json(); if (!rows.length) break; const done = [];
    for (const x of rows) { try { if (writeSite(root, x.site, x.body)) { done.push(x.site); total++ } else done.push(x.site) } catch (e) { console.error('skip', x.site, e.message) } }
    const u = await fetch(base + 'static_cfg?site=in.(' + done.map(encodeURIComponent).join(',') + ')', { method: 'PATCH', headers: { ...H, prefer: 'return=minimal' }, body: JSON.stringify({ dirty: false }) }); if (!u.ok) throw new Error('Supabase mark ' + u.status);
    if (rows.length < 250) break;
  }
  // the loader and chat scripts, so the page-view traffic does not touch the Worker
  if (APP_URL) for (const f of ['rp.js', 'chat.js']) { try { const r = await fetch(APP_URL.replace(/\/+$/, '') + '/__rp/' + f); if (r.ok) fs.writeFileSync(path.join(root, f), await r.text()) } catch (e) { console.error('could not refresh', f) } }
  console.log(JSON.stringify({ published: total }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1) });
