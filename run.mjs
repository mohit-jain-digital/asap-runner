// ASAP-Rank background runner. Runs on GitHub Actions (free). Talks to Supabase only. No npm packages.
// Work it does: 1) import all page addresses from a sitemap, 2) inspect each page (live check + 14 checks + optional PageSpeed).
// It never holds an AI key. AI suggestions start only from pages you choose, and the app (Cloudflare) does the AI call.
import zlib from 'node:zlib';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { checklist, safeUrl, norm } from './checks.mjs';

export const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (compatible; ASAP-RankChecker/1.0)';

export function supabaseStore(url, key) {
  const base = String(url).replace(/\/+$/, '') + '/rest/v1/', H = { apikey: key, authorization: 'Bearer ' + key, 'content-type': 'application/json' };
  const call = async (path, o = {}) => { const r = await fetch(base + path, { ...o, headers: { ...H, ...(o.headers || {}) } }); if (!r.ok) throw new Error('Supabase ' + r.status + ' ' + (await r.text()).slice(0, 200)); const t = await r.text(); return t ? JSON.parse(t) : null };
  return {
    claimJob: async () => ((await call('rpc/claim_job', { method: 'POST', body: '{}' })) || [])[0] || null,
    snap: async () => { try { await call('rpc/take_snaps', { method: 'POST', body: '{}' }) } catch (e) { console.log('::warning::Could not save the daily progress snapshot. Run the latest schema.sql in Supabase. ' + e.message) } },
    claimAi: async n => (await call('rpc/claim_ai', { method: 'POST', body: JSON.stringify({ n }) })) || [],
    saveAi: (row, patch) => call('urls?uid=eq.' + encodeURIComponent(row.uid) + '&url=eq.' + encodeURIComponent(row.url), { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify(patch) }),
    claimUrls: async n => (await call('rpc/claim_urls', { method: 'POST', body: JSON.stringify({ n }) })) || [],
    insertUrls: rows => call('urls?on_conflict=uid,url', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows) }),
    saveUrls: rows => call('urls?on_conflict=uid,url', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) }),
    updateJob: (id, patch) => call('jobs?id=eq.' + id, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ ...patch, updated: new Date().toISOString() }) }),
    countAll: async () => { const r = await fetch(base + 'urls?select=url', { headers: { ...H, prefer: 'count=exact', range: '0-0' } }); const m = /\/(\d+)$/.exec(r.headers.get('content-range') || ''); return m ? +m[1] : 0 },
    countUrls: async uid => { const r = await fetch(base + 'urls?select=url&uid=eq.' + encodeURIComponent(uid), { headers: { ...H, prefer: 'count=exact', range: '0-0' } }); const m = /\/(\d+)$/.exec(r.headers.get('content-range') || ''); return m ? +m[1] : 0 },
    remaining: async () => { const r = await fetch(base + "urls?select=url&status=in.(queued,running)", { headers: { ...H, prefer: 'count=exact', range: '0-0' } }); const m = /\/(\d+)$/.exec(r.headers.get('content-range') || ''); const j = await fetch(base + "jobs?select=id&status=in.(queued,running)", { headers: { ...H, prefer: 'count=exact', range: '0-0' } }); const m2 = /\/(\d+)$/.exec(j.headers.get('content-range') || ''); const a = await fetch(base + "urls?select=url&ai=in.(queued,running)", { headers: { ...H, prefer: 'count=exact', range: '0-0' } }); const m3 = /\/(\d+)$/.exec(a.headers.get('content-range') || ''); return (m ? +m[1] : 0) + (m2 ? +m2[1] : 0) + (m3 ? +m3[1] : 0) }
  };
}

const decodeXml = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
async function getXml(u) {
  const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'application/xml,text/xml,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(40000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  let b = Buffer.from(await r.arrayBuffer()); if (b.length > 80e6) throw new Error('too large');
  if (b[0] == 0x1f && b[1] == 0x8b) b = zlib.gunzipSync(b);
  return b.toString('utf8');
}

// ---- 1. Import: every page address from the sitemap (and sub-sitemaps), saved 1000 at a time, resumable ----
export async function runImport(store, job, { budgetMs = 600000, cap = 60000, gcap = 120000 } = {}) {
  const t0 = Date.now(), p = job.payload || {}, pr = job.progress || {};
  let site; try { site = new URL(p.site) } catch { throw new Error('That website address is not valid.') }
  const bare = h => h.toLowerCase().replace(/^www\./, ''), okHost = h => bare(h) == bare(site.hostname) || bare(h).endsWith('.' + bare(site.hostname));
  let queue = pr.queue, visited = new Set(pr.visited || []), found = pr.found || 0, capped = !!pr.capped, have = await store.countUrls(job.uid), gHave = store.countAll ? await store.countAll() : 0, gFull = !!pr.gFull;
  if (!queue) {
    queue = []; const rb = await fetch(site.origin + '/robots.txt', { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) }).then(r => r.ok ? r.text() : '').catch(() => '');
    [...rb.matchAll(/^sitemap:\s*(\S+)/gim)].forEach(m => queue.push(m[1]));
    queue.push(site.origin + '/sitemap.xml', site.origin + '/sitemap_index.xml', site.origin + '/wp-sitemap.xml');
    queue = [...new Set(queue)];
  }
  let any = pr.any || false, failed = 0;
  while (queue.length && Date.now() - t0 < budgetMs && !capped) {
    const sm = queue.shift(); if (visited.has(sm)) continue; visited.add(sm);
    let txt; try { txt = await getXml(sm) } catch { failed++; continue }
    const locs = [...txt.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)].map(m => decodeXml(m[1]));
    if (/<sitemapindex/i.test(txt)) { queue.push(...locs.filter(l => { const s = safeUrl(l); return s && okHost(new URL(s).hostname) })); any = true; continue }
    any = true; let rows = []; const seen = new Set();
    for (const l of locs) { const n = norm(l); if (!n || !safeUrl(n) || seen.has(n)) continue; let h; try { h = new URL(n).hostname } catch { continue } if (!okHost(h)) continue; seen.add(n); rows.push({ uid: job.uid, url: n, host: h, src: 'sitemap', status: 'new' }) }
    { const room = Math.min(cap - have, gcap - gHave); if (rows.length > room) { gFull = gFull || gcap - gHave <= cap - have; rows = rows.slice(0, Math.max(0, room)); capped = true } }
    for (let i = 0; i < rows.length; i += 1000) await store.insertUrls(rows.slice(i, i + 1000));
    have += rows.length; gHave += rows.length; found += rows.length;
    await store.updateJob(job.id, { progress: { queue, visited: [...visited].slice(-300), found, capped, any, gFull } });
  }
  if (!any && !queue.length) return store.updateJob(job.id, { status: 'error', err: 'No sitemap found. Check the address, or paste your page addresses instead.', progress: { found: 0 } });
  const fin = !queue.length || capped;
  return store.updateJob(job.id, { status: fin ? 'done' : 'queued', progress: { queue: fin ? [] : queue, visited: [...visited].slice(-300), found, capped, any, done: fin }, err: capped ? (gFull ? 'Shared storage is full, so no more pages can be added right now. Please contact the owner.' : 'Stopped at the limit of ' + cap + ' pages for your plan.') : null, lease_until: null });
}

// ---- 3. AI suggestions: for each queued page, ask the app (your Cloudflare Worker) to write suggestions with the customer's own AI key.
// The AI key never leaves Cloudflare. The suggestions are saved there as "Suggested" changes, never published from here. ----
export async function runSuggest(store, { budgetMs = 600000, appUrl = '', key = '', delayMs = 4000, maxTries = 3 } = {}) {
  const t0 = Date.now(); let done = 0;
  if (!appUrl || !key) return 0;
  while (Date.now() - t0 < budgetMs) {
    const rows = await store.claimAi(5); if (!rows.length) break;
    for (const row of rows) {
      if (Date.now() - t0 >= budgetMs) { await store.saveAi(row, { ai: 'queued', ai_lease: null, ai_tries: Math.max(0, (row.ai_tries || 1) - 1) }); continue }
      let j = null, st = 0;
      try { const r = await fetch(String(appUrl).replace(/\/+$/, '') + '/api/runner/suggest', { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }, body: JSON.stringify({ uid: row.uid, url: row.url }), signal: AbortSignal.timeout(120000) }); st = r.status; j = await r.json().catch(() => null) } catch (e) { j = { error: 'The app did not answer', retry: true } }
      const now = new Date().toISOString();
      if (j && j.ok) await store.saveAi(row, { ai: 'done', ai_n: j.added || 0, ai_at: now, ai_err: null, ai_lease: null });
      else if (st == 401) { await store.saveAi(row, { ai: 'queued', ai_lease: null, ai_tries: 0 }); console.log('::error::The app refused the runner. Check that SUPABASE_SERVICE_KEY here and SUPABASE_KEY in Cloudflare are the same key.'); return done }
      else if (j && j.retry && (row.ai_tries || 1) < maxTries) await store.saveAi(row, { ai: 'queued', ai_lease: null, ai_err: String(j.error || '').slice(0, 200) });
      else await store.saveAi(row, { ai: 'error', ai_err: String((j && j.error) || 'Failed').slice(0, 200), ai_at: now, ai_lease: null });
      done++; await sleep(delayMs);
    }
  }
  return done;
}

// ---- 2. Inspect: live check, 14 checks, optional PageSpeed ----
async function psiRun(u, key) {
  const r = await fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&url=' + encodeURIComponent(u) + '&key=' + encodeURIComponent(key), { signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error('PageSpeed ' + r.status); const j = await r.json(), L = j.lighthouseResult || {}, a = L.audits || {};
  return { perf: Math.round(100 * ((L.categories || {}).performance || {}).score), lcp: Math.round((a['largest-contentful-paint'] || {}).numericValue || 0), cls: +(((a['cumulative-layout-shift'] || {}).numericValue) || 0).toFixed(3) };
}
export async function inspectOne(r, { psiKey = '', gate = async () => {}, usePsi = false } = {}) {
  const base = { uid: r.uid, url: r.url, checked_at: new Date().toISOString(), lease_until: null }, empty = { score: null, pass: null, warn: null, fail: null, perf: null, lcp: null, cls: null, checks: null };
  try {
    await gate(new URL(r.url).hostname);
    const c = await checklist({}, { url: r.url, keyword: '' });
    if (c.error) return { ...base, ...empty, status: 'error', err: String(c.error).slice(0, 200) };
    const it = c.items || [], cnt = s => it.filter(i => i.status == s).length; let ps = { perf: null, lcp: null, cls: null };
    if (usePsi && psiKey) { try { ps = await psiRun(r.url, psiKey) } catch (e) { /* speed is optional */ } }
    return { ...base, status: 'done', err: null, score: c.score, pass: cnt('pass'), warn: cnt('warn'), fail: cnt('fail'), perf: ps.perf, lcp: ps.lcp, cls: ps.cls, checks: it.map(i => ({ id: i.id, label: i.label, status: i.status, detail: String(i.detail || '').slice(0, 400) })) };
  } catch (e) { return { ...base, ...empty, status: 'error', err: String(e && e.message || e).slice(0, 200) } }
}
async function pool(list, n, fn) { let i = 0; await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const x = list[i++]; await fn(x) } })) }
export async function runInspect(store, { budgetMs = 1500000, conc = 5, batch = 25, delayMs = 400, psiKey = '', psiMax = 200 } = {}) {
  const t0 = Date.now(), nextAt = new Map(); let done = 0, psiUsed = 0;
  const gate = async h => { const t = Math.max(Date.now(), nextAt.get(h) || 0); nextAt.set(h, t + delayMs); if (t > Date.now()) await sleep(t - Date.now()) };
  while (Date.now() - t0 < budgetMs) {
    const rows = await store.claimUrls(batch); if (!rows.length) break; const out = [];
    await pool(rows, conc, async r => { const usePsi = !!psiKey && psiUsed < psiMax && (psiUsed++, true); out.push(await inspectOne(r, { psiKey, gate, usePsi })) });
    await store.saveUrls(out); done += out.length;
  }
  return done;
}

export async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env; if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY.'); process.exit(1) }
  const store = supabaseStore(SUPABASE_URL, SUPABASE_SERVICE_KEY), T0 = Date.now(), total = (+process.env.RUN_MINUTES || 30) * 6e4; let imported = 0, inspected = 0;
  for (let k = 0; k < 20 && Date.now() - T0 < total * 0.4; k++) {
    const job = await store.claimJob(); if (!job) break;
    try { await runImport(store, job, { budgetMs: Math.max(60000, total * 0.4 - (Date.now() - T0)), cap: +process.env.Q_CAP || 60000, gcap: +process.env.G_CAP || 120000 }); imported++ } catch (e) { await store.updateJob(job.id, { status: 'error', err: String(e.message || e).slice(0, 300) }) }
  }
  inspected = await runInspect(store, { budgetMs: (total - (Date.now() - T0)) * 0.6, psiKey: process.env.PSI_API_KEY || '', psiMax: +process.env.PSI_MAX || 200 });
  const suggested = await runSuggest(store, { budgetMs: total - (Date.now() - T0), appUrl: process.env.APP_URL || '', key: SUPABASE_SERVICE_KEY, delayMs: +process.env.AI_DELAY_MS || 4000 }); inspected += suggested;
  if (store.countAll) { const g = await store.countAll(), gc = +process.env.G_CAP || 120000; if (g >= gc * 0.8) console.log('::warning::Storage is ' + Math.round(100 * g / gc) + '% full (' + g + ' of ' + gc + ' pages). Free up pages or upgrade Supabase before it fills.') }
  if (store.snap) await store.snap();
  const left = await store.remaining(); console.log(JSON.stringify({ imported, inspected, suggested, left, seconds: Math.round((Date.now() - T0) / 1000) }));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'again=' + (left > 0 && (imported + inspected) > 0 ? 'yes' : 'no') + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1) });
