// Turns finished customer settings (Supabase static_cfg) into plain files in ./docs, served free by GitHub Pages.
// Visitors then load popups, chat and page changes from Pages, not from your Worker.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const KEY_OK = /^[A-Za-z0-9_-]{4,64}$/, MAXINLINE = 60000, BUCKETS = 64;
const np = x => String(x).length > 1 ? String(x).replace(/\/+$/, '') : String(x);
// Owner mode: when the pages folder holds the ASAP-Rank sales page (the asap-page meta tag), this repository is the public front door. Home, login, sign-up and the app are served from the domain root, and Google Analytics is added to the home and login pages only: never to the signed-in app and never to a customer's own pages.
export const FRONT_DEFAULT = 'https://asap-rank.artistryc.in';
export const gaTag = id => '<script async src="https://www.googletagmanager.com/gtag/js?id=' + id + '"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","' + id + '",{send_page_view:false,anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});(function(){var H=/^#(login|signup|forgot|pay|first)$/;function pv(){var h=H.test(location.hash)?location.hash.slice(1):"",p=location.pathname+(h?"/"+h:"");gtag("event","page_view",{page_location:location.origin+p,page_path:p,page_title:document.title});}pv();addEventListener("hashchange",pv);document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href*=signup]");if(a)gtag("event","start_now_click",{location:"page"})})})();</script>';
export const isOwnerSite = dir => { try { return /<meta name="asap-page" content="sales">/.test(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')) } catch (e) { return false } };
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
  const bj = typeof body.boostJs == 'string' ? body.boostJs : ''; body = { ...body }; delete body.boostJs;
  fs.mkdirSync(path.join(root, 'b'), { recursive: true }); fs.writeFileSync(path.join(root, 'b', site + '.js'), bj || ';');
  const dir = path.join(root, 'c'), sd = path.join(dir, site); fs.mkdirSync(dir, { recursive: true });
  fs.rmSync(sd, { recursive: true, force: true });
  const { core, shards } = splitCfg(body); fs.writeFileSync(path.join(dir, site + '.json'), JSON.stringify(core));
  const names = Object.keys(shards); if (names.length) { fs.mkdirSync(sd, { recursive: true }); names.forEach(n => fs.writeFileSync(path.join(sd, n + '.json'), JSON.stringify(shards[n]))) }
  return true;
}

// Keeps the public repository tidy. A site that was deleted loses its files at once. A site that was switched off, or whose plan ended, keeps them for 3 months (so a renewal comes back instantly), then they are removed too.
export const GRACE_DAYS = 90;
export function prune(root, keep) {
  let n = 0;
  for (const [dir, ext] of [['c', '.json'], ['b', '.js']]) {
    const d = path.join(root, dir); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f), isDir = fs.statSync(full).isDirectory(), site = isDir ? f : f.endsWith(ext) ? f.slice(0, -ext.length) : null;
      if (site === null || !KEY_OK.test(site) || keep.has(site)) continue;
      fs.rmSync(full, { recursive: true, force: true }); n++;
    }
  }
  return n;
}
export const liveSites = (rows, now = Date.now()) => new Set(rows.filter(x => {
  const ended = x.off ? (Date.parse(x.updated) || 0) : (x.until && x.until < now ? x.until : 0);
  return !ended || now - ended < GRACE_DAYS * 864e5;
}).map(x => x.site));

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
  // remove the files of deleted sites at once, and of switched-off or expired sites after 3 months (skipped when the list cannot be read, so an outage never wipes files)
  try {
    const all = []; for (let off = 0; off < 100000; off += 1000) {
      const r = await fetch(base + 'static_cfg?select=site,updated,off:body->off,until:body->until&order=site&limit=1000&offset=' + off, { headers: H }); if (!r.ok) throw new Error('Supabase ' + r.status);
      const part = await r.json(); all.push(...part); if (part.length < 1000) break;
    }
    if (all.length) console.log(JSON.stringify({ removed: prune(root, liveSites(all)) }));
  } catch (e) { console.error('cleanup skipped:', e.message) }
  // the dashboard, sales page, login and customer setup wizard: served free by Pages, so opening the dashboard costs the Worker nothing.
  // The pages live in the folder "site", or directly in the repository root if they were uploaded there.
  const PAGES = ['404.html', 'app.html', 'auth.html', 'customer-setup.html', 'index.html'];
  const pagesDir = fs.existsSync('site') ? 'site' : fs.existsSync('app.html') ? '.' : '';
  const note = t => fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><meta charset=utf-8><title>ASAP-Rank files</title><body style="font-family:system-ui;max-width:560px;margin:40px auto;padding:0 16px"><h2>ASAP-Rank files are published</h2><p>' + t + '</p>');
  if (APP_URL && pagesDir) {
    const app = root; fs.rmSync(path.join(root, 'app'), { recursive: true, force: true }); // pages sit in the site root so addresses stay short: /auth and /app, with no folder and no .html
    for (const f of pagesDir === 'site' ? fs.readdirSync('site') : PAGES.filter(x => fs.existsSync(x))) if (f !== 'config.js' && f !== 'analytics.txt') fs.copyFileSync(path.join(pagesDir, f), path.join(app, f));
    const sb = process.env.ASAP_SB_URL && process.env.ASAP_SB_ANON ? "\nwindow.ASAP_SB_URL = " + JSON.stringify(process.env.ASAP_SB_URL) + ";\nwindow.ASAP_SB_ANON = " + JSON.stringify(process.env.ASAP_SB_ANON) + ";" : '';
    const own = pagesDir === 'site' && isOwnerSite('site'), cfgTxt = "window.ASAP_API = " + JSON.stringify(APP_URL.replace(/\/+$/, '')) + ";" + (own ? "\nwindow.ASAP_FRONT = true;" : '') + sb + "\n";
    fs.writeFileSync(path.join(app, 'config.js'), cfgTxt);
    if (own) {
      const FRONT = (process.env.FRONT_URL || FRONT_DEFAULT).replace(/\/+$/, ''), GA = (process.env.GA_ID || (fs.existsSync('site/analytics.txt') ? fs.readFileSync('site/analytics.txt', 'utf8') : '')).trim().replace(/[^A-Za-z0-9-]/g, '');
      for (const f of fs.readdirSync('site')) {
        const src = path.join('site', f); if (f === 'config.js' || !fs.statSync(src).isFile()) continue;
        let t = fs.readFileSync(src); if (/\.(html|txt|xml)$/.test(f)) { t = fs.readFileSync(src, 'utf8').split(FRONT_DEFAULT).join(FRONT); if (GA && ['index.html', 'auth.html'].includes(f)) t = t.replace('</head>', gaTag(GA) + '</head>') } if (f === 'analytics.txt') continue;
        fs.writeFileSync(path.join(root, f), t);
      }
      fs.writeFileSync(path.join(root, 'config.js'), cfgTxt);
    }
  } else if (!APP_URL) note('The APP_URL secret is missing in this repository (Settings, Secrets and variables, Actions), so the dashboard pages were not added. Add it, then run the publish workflow again.');
  else note('The dashboard pages were not found. Put the folder "site" (or app.html, auth.html, index.html, 404.html and customer-setup.html) in the repository root, then run the publish workflow again.');
  // the loader and chat scripts, so the page-view traffic does not touch the Worker
  if (APP_URL) for (const f of ['rp.js', 'chat.js']) { try { const r = await fetch(APP_URL.replace(/\/+$/, '') + '/__rp/' + f); if (r.ok) fs.writeFileSync(path.join(root, f), await r.text()) } catch (e) { console.error('could not refresh', f) } }
  console.log(JSON.stringify({ published: total }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1) });
