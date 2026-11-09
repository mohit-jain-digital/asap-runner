#!/usr/bin/env node
/* ASAP-Rank installer. Node 18 or newer. Usage:  node install.mjs admin   |   node install.mjs customer
   Makes the GitHub repositories, the Supabase project and the Cloudflare app, and connects them with each other.
   You only paste three access tokens. They are used from this computer, never sent anywhere else, and never saved. */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto';
import readline from 'node:readline/promises'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url)), MODE = process.argv[2], A = {};
process.argv.slice(3).forEach(a => { const m = a.match(/^--([\w-]+)(?:=(.*))?$/); if (m) A[m[1]] = m[2] === undefined ? '1' : m[2] });
if (!['admin', 'customer'].includes(MODE)) { console.log('Usage: node install.mjs admin   or   node install.mjs customer'); process.exit(1) }
const CF = process.env.CF_API || 'https://api.cloudflare.com/client/v4', GH = process.env.GH_API || 'https://api.github.com', SB = process.env.SB_API || 'https://api.supabase.com';
const RAW = process.env.RAW_BASE || 'https://raw.githubusercontent.com', FAST = !!process.env.INSTALL_FAST;
const sleep = ms => FAST ? 0 : new Promise(r => setTimeout(r, ms)), say = t => console.log(t), STEP = (n, t) => say(`\n[${n}] ${t}`);
const STATE_FILE = path.join(process.cwd(), `.asap-install-${MODE}.json`);
let ST = {}; try { ST = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) } catch {}
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(ST, null, 1), { mode: 0o600 });
const rnd = n => crypto.randomBytes(n).toString('hex');

async function call(base, tok, method, p, body, o = {}) {
  const h = { authorization: 'Bearer ' + tok, 'user-agent': 'asap-rank-installer', ...(o.headers || {}) };
  let b = body; if (body !== undefined && !(body instanceof FormData)) { h['content-type'] = 'application/json'; b = JSON.stringify(body) }
  const r = await fetch(base + p, { method, headers: h, body: b }), t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = { raw: t } }
  if (!r.ok && !o.soft) throw new Error(`${method} ${p} gave ${r.status}: ${t.slice(0, 300)}`);
  return { ok: r.ok, status: r.status, j };
}
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
async function get(key, label, o = {}) {
  let v = A[key.toLowerCase().replace(/_/g, '-')] ?? process.env[key] ?? (o.keep ? ST.v?.[key] : undefined);
  if (!v && rl && !o.noask) { v = (await rl.question(`${label}${o.optional ? ' (press Enter to skip)' : ''}: `)).trim() }
  if (!v && o.def) v = o.def;
  if (!v && !o.optional) throw new Error(`Missing ${key}. Pass it as --${key.toLowerCase().replace(/_/g, '-')}=... or set it as an environment variable.`);
  if (v && o.keep) { (ST.v ||= {})[key] = v } return v || '';
}
const first = (...c) => c.find(p => p && fs.existsSync(p));
const dirs = {
  runner: A.runner || first(path.join(HERE, '2-runner-files-for-GitHub'), path.join(HERE, '1-runner-files-for-GitHub'), path.join(HERE, '1-ADMIN', '2-runner-files-for-GitHub'), path.join(HERE, '2-CUSTOMER', '1-runner-files-for-GitHub'), fs.existsSync(path.join(HERE, 'run.mjs')) ? HERE : ''),
  app: A.app || first(path.join(HERE, '3-customer-copy-for-GitHub'), path.join(HERE, '1-ADMIN', '3-customer-copy-for-GitHub')),
  code: A['app-code'] || first(path.join(HERE, '1-app-code', 'app-code.js'), path.join(HERE, '1-ADMIN', '1-app-code', 'app-code.js'), path.join(HERE, 'app-code.js'))
};
function walk(dir, map = f => f) {
  const out = []; (function rec(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', '.git', '.DS_Store'].includes(e.name) || /^install\.mjs$|^\.asap-install/.test(e.name) && !rel) continue;
      const r = rel ? rel + '/' + e.name : e.name; e.isDirectory() ? rec(path.join(d, e.name), r) : out.push({ path: map(r), content: fs.readFileSync(path.join(d, e.name)) });
    }
  })(dir, ''); return out;
}
const runnerFiles = () => walk(dirs.runner, r => r.replace(/^github-workflows\//, '.github/workflows/'));

/* ---------- GitHub ---------- */
const gh = (tok, m, p, b, o = {}) => call(GH, tok, m, p, b, { ...o, headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' } });
async function ensureRepo(tok, me, name, desc) {
  const r = await gh(tok, 'GET', `/repos/${me}/${name}`, undefined, { soft: true });
  if (r.ok) { if (r.j.private) say(`   Note: ${me}/${name} is private. GitHub Pages and unlimited free minutes need it public.`); return r.j }
  const c = await gh(tok, 'POST', '/user/repos', { name, description: desc, private: false, auto_init: true }); await sleep(3000); return c.j;
}
async function commitFiles(tok, me, repo, branch, files, msg) {
  let ref; for (let i = 0; i < 8; i++) { ref = await gh(tok, 'GET', `/repos/${me}/${repo}/git/ref/heads/${branch}`, undefined, { soft: true }); if (ref.ok) break; await sleep(2500) }
  if (!ref.ok) throw new Error(`Branch ${branch} of ${repo} is not ready. Run the installer again in a minute.`);
  const head = ref.j.object.sha, base = (await gh(tok, 'GET', `/repos/${me}/${repo}/git/commits/${head}`)).j.tree.sha, tree = [];
  for (const f of files) { const b = await gh(tok, 'POST', `/repos/${me}/${repo}/git/blobs`, { content: f.content.toString('base64'), encoding: 'base64' }); tree.push({ path: f.path, mode: '100644', type: 'blob', sha: b.j.sha }) }
  const t = await gh(tok, 'POST', `/repos/${me}/${repo}/git/trees`, { base_tree: base, tree });
  if (t.j.sha === base) { say('   Already up to date.'); return false }
  const c = await gh(tok, 'POST', `/repos/${me}/${repo}/git/commits`, { message: msg, tree: t.j.sha, parents: [head] });
  await gh(tok, 'PATCH', `/repos/${me}/${repo}/git/refs/heads/${branch}`, { sha: c.j.sha }); return true;
}
async function sodium() {
  try { const s = (await import('libsodium-wrappers')).default; await s.ready; return s } catch {}
  const dir = path.join(os.tmpdir(), 'asap-deps'); fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(path.join(dir, 'node_modules', 'libsodium-wrappers'))) execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--prefix', dir, '--no-audit', '--no-fund', '--silent', 'libsodium-wrappers'], { stdio: 'inherit', shell: process.platform === 'win32' });
  const s = createRequire(path.join(dir, 'x.js'))('libsodium-wrappers'); await s.ready; return s;
}
async function setSecrets(tok, me, repo, map) {
  const s = await sodium(), k = (await gh(tok, 'GET', `/repos/${me}/${repo}/actions/secrets/public-key`)).j;
  for (const [n, v] of Object.entries(map)) { if (!v) continue;
    const enc = s.to_base64(s.crypto_box_seal(s.from_string(v), s.from_base64(k.key, s.base64_variants.ORIGINAL)), s.base64_variants.ORIGINAL);
    await gh(tok, 'PUT', `/repos/${me}/${repo}/actions/secrets/${n}`, { encrypted_value: enc, key_id: k.key_id }) }
}

/* ---------- Supabase ---------- */
async function supabase(tok, schema) {
  let ref = A['supabase-ref'] || process.env.SUPABASE_REF || ST.sbref;
  if (!ref) {
    const orgs = (await call(SB, tok, 'GET', '/v1/organizations')).j, org = Array.isArray(orgs) && orgs[0]; if (!org) throw new Error('No Supabase organisation found on this account.');
    const list = (await call(SB, tok, 'GET', '/v1/projects')).j, old = Array.isArray(list) && list.find(p => p.name === 'asap-rank');
    if (old) ref = old.id || old.ref; else {
      ST.sbpass ||= rnd(16); save(); say('   Creating the Supabase project (about 2 minutes)...');
      const c = await call(SB, tok, 'POST', '/v1/projects', { name: 'asap-rank', organization_slug: org.slug || org.id, organization_id: org.id, db_pass: ST.sbpass, region: process.env.SUPABASE_REGION || 'ap-south-1' });
      ref = c.j.id || c.j.ref;
    }
    ST.sbref = ref; save();
  }
  for (let i = 0; i < 60; i++) { const p = (await call(SB, tok, 'GET', `/v1/projects/${ref}`)).j; if (/ACTIVE/.test(p.status || 'ACTIVE_HEALTHY')) break; if (i == 59) throw new Error('Supabase is still starting. Run the installer again in a few minutes.'); await sleep(8000) }
  const keys = (await call(SB, tok, 'GET', `/v1/projects/${ref}/api-keys`)).j, svc = keys.find(k => k.name === 'service_role'), anon = keys.find(k => k.name === 'anon');
  if (!svc) throw new Error('Supabase did not return the service key.');
  for (let i = 0; ; i++) { const r = await call(SB, tok, 'POST', `/v1/projects/${ref}/database/query`, { query: schema }, { soft: true }); if (r.ok) break; if (i >= 5) throw new Error('Supabase refused the database code: ' + JSON.stringify(r.j).slice(0, 300)); await sleep(10000) }
  return { url: `https://${ref}.supabase.co`, service: svc.api_key, anon: anon && anon.api_key || '' };
}

/* ---------- Cloudflare ---------- */
async function cloudflare(tok, code, vars, plain) {
  const acc = (await call(CF, tok, 'GET', '/accounts')).j.result || [], want = A['cf-account'] || process.env.CF_ACCOUNT_ID, a = acc.find(x => x.id === want) || acc[0];
  if (!a) throw new Error('This Cloudflare token cannot see an account. Check the token permissions.');
  const id = a.id, W = `/accounts/${id}`;
  let sub = (await call(CF, tok, 'GET', `${W}/workers/subdomain`, undefined, { soft: true })).j.result?.subdomain;
  if (!sub) { sub = 'asap-' + rnd(3); await call(CF, tok, 'PUT', `${W}/workers/subdomain`, { subdomain: sub }) }
  let db = ((await call(CF, tok, 'GET', `${W}/d1/database?name=asap-rank-data`)).j.result || []).find(d => d.name === 'asap-rank-data');
  if (!db) db = (await call(CF, tok, 'POST', `${W}/d1/database`, { name: 'asap-rank-data' })).j.result;
  const name = 'asap-rank', appUrl = `https://${name}.${sub}.workers.dev`;
  const bindings = [{ type: 'd1', name: 'DB', id: db.uuid }, ...Object.entries({ ...plain, APP_URL: appUrl }).map(([k, v]) => ({ type: 'plain_text', name: k, text: v }))];
  for (const [k, v] of Object.entries(vars)) if (v) bindings.push({ type: SECRET_NAMES.has(k) ? 'secret_text' : 'plain_text', name: k, text: v });
  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify({ main_module: 'index.js', compatibility_date: '2026-09-01', bindings, observability: { enabled: true, head_sampling_rate: 0.01 } })], { type: 'application/json' }));
  fd.append('index.js', new Blob([code], { type: 'application/javascript+module' }), 'index.js');
  say('   Uploading the app code...'); await call(CF, tok, 'PUT', `${W}/workers/scripts/${name}`, fd);
  await call(CF, tok, 'POST', `${W}/workers/scripts/${name}/subdomain`, { enabled: true, previews_enabled: false });
  await call(CF, tok, 'PUT', `${W}/workers/scripts/${name}/schedules`, [{ cron: '*/15 * * * *' }]);
  return { appUrl, account: a.name || id };
}
const SECRET_NAMES = new Set(['SECRET', 'LICENSE_KEY', 'SUPABASE_KEY', 'GH_TOKEN', 'BREVO_KEY', 'GEMINI_KEY', 'PSI_KEY', 'WA_VERIFY_TOKEN', 'WA_APP_SECRET', 'REPORT_SECRET', 'CF_API_TOKEN']);

/* ---------- the run ---------- */
async function main() {
  if (!dirs.runner || !fs.existsSync(path.join(dirs.runner, 'run.mjs'))) throw new Error('Cannot find the runner files folder next to this installer. Keep the unzipped folders together.');
  const admin = MODE === 'admin';
  say(`ASAP-Rank installer (${admin ? 'owner' : 'customer'}). It takes about 5 minutes. Nothing is saved except a private file in this folder with the random passwords it made, so a second run can update instead of starting over.`);
  say('\nYou need three access tokens. The installer asks for each one:');
  say(' GitHub     https://github.com/settings/tokens/new?scopes=repo,workflow&description=ASAP-Rank%20setup   (tick nothing else, press Generate)');
  say(' Supabase   https://supabase.com/dashboard/account/tokens   (Generate new token)');
  say(' Cloudflare https://dash.cloudflare.com/profile/api-tokens   (Create Token, Create Custom Token, permissions: Account / Workers Scripts / Edit, Account / D1 / Edit, Account / Account Settings / Read)\n');
  const ghT = await get('GITHUB_TOKEN', 'GitHub token'), sbT = await get('SUPABASE_TOKEN', 'Supabase token'), cfT = await get('CF_API_TOKEN', 'Cloudflare token');
  const me = (await gh(ghT, 'GET', '/user')).j.login; say(`GitHub: signed in as ${me}`);
  if (A.check) { await call(SB, sbT, 'GET', '/v1/organizations'); await call(CF, cfT, 'GET', '/accounts'); say('All three tokens work.'); return }
  const v = {};
  if (admin) {
    v.ADMIN_EMAIL = await get('ADMIN_EMAIL', 'Your email (you become the admin)', { keep: 1 });
    v.BREVO_KEY = await get('BREVO_KEY', 'Brevo API key (email sending)', { optional: 1, keep: 1 });
    v.GEMINI_KEY = await get('GEMINI_KEY', 'Google Gemini API key (the AI)', { optional: 1, keep: 1 });
    v.MAIL_FROM = await get('MAIL_FROM', 'Send emails from (an address you verified in Brevo)', { optional: 1, keep: 1, def: v.ADMIN_EMAIL ? 'ASAP-Rank <' + v.ADMIN_EMAIL + '>' : '' });
    v.PSI_KEY = await get('PSI_KEY', 'Google PageSpeed key', { optional: 1, keep: 1 });
  } else {
    v.LICENSE_KEY = await get('LICENSE_KEY', 'Your licence key (ASAP-Rank, More, Account)', { keep: 1 });
    v.GEMINI_KEY = await get('GEMINI_KEY', 'Google Gemini API key (the AI)', { optional: 1, keep: 1 });
    v.BREVO_KEY = await get('BREVO_KEY', 'Brevo API key (email sending)', { optional: 1, keep: 1 });
    v.PSI_KEY = await get('PSI_KEY', 'Google PageSpeed key', { optional: 1, keep: 1 });
  }
  ST.v = { ...ST.v, ...v }; ST.secret ||= rnd(24); ST.watok ||= rnd(16); save();
  const runnerName = A['runner-name'] || 'asap-runner', appName = 'asap-rank-app', runnerFull = `${me}/${runnerName}`;

  STEP(1, 'GitHub: the runner repository (public, free unlimited minutes and free Pages)');
  const rr = await ensureRepo(ghT, me, runnerName, 'ASAP-Rank background engine and static files');
  await commitFiles(ghT, me, runnerName, rr.default_branch || 'main', runnerFiles(), 'ASAP-Rank files');
  let tmpl = A.template || process.env.TEMPLATE_REPO || '';
  if (!admin && !tmpl && !(dirs.code && fs.existsSync(dirs.code))) tmpl = await get('TEMPLATE_REPO', 'App code location on GitHub, like yourname/asap-rank-app (your Admin gives you this)', { keep: 1 });
  if (admin) {
    STEP(2, 'GitHub: the customer copy repository (public, needed for the Deploy button)');
    if (!dirs.app) throw new Error('Cannot find the 3-customer-copy-for-GitHub folder.');
    const ar = await ensureRepo(ghT, me, appName, 'ASAP-Rank customer copy'); await commitFiles(ghT, me, appName, ar.default_branch || 'main', walk(dirs.app), 'ASAP-Rank customer copy'); tmpl = `${me}/${appName}`;
  }

  STEP(admin ? 3 : 2, 'Supabase: project and tables');
  const sb = await supabase(sbT, fs.readFileSync(path.join(dirs.runner, 'supabase', 'schema.sql'), 'utf8'));

  STEP(admin ? 4 : 3, 'Cloudflare: database, app, address and schedule');
  let code = dirs.code && fs.existsSync(dirs.code) ? fs.readFileSync(dirs.code, 'utf8') : '';
  if (!code && !admin && tmpl) { say('   Downloading the app code...'); const r = await fetch(`${RAW}/${tmpl}/main/src/index.js`); if (!r.ok) throw new Error('Could not download the app code from ' + tmpl); code = await r.text() }
  if (!code) throw new Error('Cannot find app-code.js. Put it next to this installer or pass --app-code=PATH.');
  const hubDef = (() => { try { return JSON.parse(fs.readFileSync(path.join(dirs.app || '', 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/mg, '')).vars.HUB_URL } catch { return '' } })();
  const pagesBase = `https://${me.toLowerCase()}.github.io/${runnerName}`;
  const vars = { SECRET: ST.secret, SUPABASE_URL: sb.url, SUPABASE_KEY: sb.service, GH_REPO: runnerFull, GH_TOKEN: A['app-token'] || process.env.GH_APP_TOKEN || ghT, STATIC_BASE: pagesBase, ...(sb.anon ? { SUPABASE_ANON: sb.anon } : {}) };
  const plain = { GEMINI_MODEL: 'gemini-2.5-flash' };
  if (admin) Object.assign(vars, { ADMIN_EMAIL: v.ADMIN_EMAIL, TEMPLATE_REPO: tmpl, DASH_ORIGIN: `https://${me.toLowerCase()}.github.io`, WA_VERIFY_TOKEN: ST.watok });
  else Object.assign(vars, { LICENSE_KEY: v.LICENSE_KEY }), plain.HUB_URL = await get('HUB_URL', 'Your ASAP-Rank address (the website you signed up on, like https://app.example.com)', { def: A.hub || hubDef, keep: 1 });
  for (const k of ['GEMINI_KEY', 'BREVO_KEY', 'PSI_KEY', 'MAIL_FROM']) if (v[k]) vars[k] = v[k];
  if (!admin && !plain.HUB_URL) throw new Error('Missing --hub=ADDRESS (the ASAP-Rank address your account is on).');
  const cf = await cloudflare(cfT, code, vars, plain);

  STEP(admin ? 5 : 4, 'GitHub: connect the runner to Supabase and your app, turn on Pages, publish');
  await setSecrets(ghT, me, runnerName, { SUPABASE_URL: sb.url, SUPABASE_SERVICE_KEY: sb.service, APP_URL: cf.appUrl, PSI_API_KEY: v.PSI_KEY });
  const pg = await gh(ghT, 'POST', `/repos/${me}/${runnerName}/pages`, { build_type: 'workflow' }, { soft: true });
  if (!pg.ok) { const u = await gh(ghT, 'PUT', `/repos/${me}/${runnerName}/pages`, { build_type: 'workflow' }, { soft: true }); if (!u.ok) say('   Could not turn on Pages by itself. Do it once by hand: repository Settings, Pages, Source: GitHub Actions.') }
  let started = false; for (let i = 0; i < 4 && !started; i++) { started = (await gh(ghT, 'POST', `/repos/${me}/${runnerName}/actions/workflows/publish.yml/dispatches`, { ref: rr.default_branch || 'main' }, { soft: true })).ok; if (!started) await sleep(5000) }
  const ping = await fetch(cf.appUrl, { method: 'GET' }).then(r => r.status, () => 0);
  ST.done = { appUrl: cf.appUrl, runner: runnerFull }; save();

  say('\n==================== DONE ====================');
  say(`Your app:        ${cf.appUrl}   ${ping == 200 ? '(answers)' : '(not answering yet: wait a minute and open it)'}`);
  say(`Your dashboard:  ${pagesBase}/app/   (ready in about 5 minutes: GitHub is publishing it${started ? '' : '. Press Run workflow on the ASAP-Rank publish action by hand'})`);
  say(`Runner repo:     https://github.com/${runnerFull}`);
  if (admin) say(`Customer copy:   https://github.com/${tmpl}   Deploy button: https://deploy.workers.cloudflare.com/?url=https://github.com/${tmpl}`);
  say('\nWhat is left for you (a few minutes each):');
  if (admin) { say(` 1. Open ${cf.appUrl} and sign up with ${v.ADMIN_EMAIL}. Then More, Admin, Default styling, Republish all.`);
    if (!v.BREVO_KEY) say(' 2. Emails: add a Brevo key and rerun this installer (it reuses everything).'); if (!v.GEMINI_KEY) say(' 3. AI: add a Gemini key and rerun this installer.');
    say(` 4. Optional WhatsApp sign-up check: guide Step 5.   Send customers: ${cf.appUrl}/customer-setup`) }
  else { say(` 1. Open ${cf.appUrl} and create your admin login (same email you used for your ASAP-Rank account).`); say(' 2. Add your pages and the snippet: guide Step 7.') }
  if (vars.GH_TOKEN === ghT && !A['app-token'] && !process.env.GH_APP_TOKEN) say('\nSecurity tip: the app is using your setup GitHub token. For least access, make a fine-grained token (only the runner repository, Contents: Read and write) and run:  node install.mjs ' + MODE + ' --app-token=THAT_TOKEN');
  say('You can delete the three setup tokens now if you like. To update later: run this installer again.');
}
main().then(() => process.exit(0), e => { console.error('\nStopped: ' + e.message + '\nFix that, then run the same command again. It carries on and does not make duplicates.'); process.exit(1) });
