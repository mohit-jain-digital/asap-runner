// Optional: keeps a backup copy of your login and sales pages on another web host (for example Bluehost), so people can still reach
// them if GitHub Pages is down. Two steps, both run by the publish workflow:
//   node mirror.mjs stage docs bluehost-site    copies the pages into a folder and adds a .htaccess for Apache hosts
//   node mirror.mjs upload bluehost-site        sends that folder by FTP over TLS. Does nothing unless the BLUEHOST_FTP_* secrets are set.
// A failed upload never stops publishing: it prints a clear warning and the next publish tries again.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Only the public pages. Per-website popup and chat files stay on GitHub Pages.
export const PAGE = /^(?:[A-Za-z0-9_-]+\.(?:html|txt|xml)|config\.js)$/;
export const HTACCESS = `# Written by ASAP-Rank. Makes /auth open auth.html, like GitHub Pages does.
Options -MultiViews -Indexes
DirectoryIndex index.html
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.+?)/?$ $1.html [L]
ErrorDocument 404 /404.html
<FilesMatch "^(config\\.js)$">
  Header set Cache-Control "no-cache"
</FilesMatch>
`;

export function stage(src, dest) {
  if (!fs.existsSync(src)) throw new Error('Pages folder not found: ' + src);
  fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(dest, { recursive: true });
  const copied = [];
  for (const f of fs.readdirSync(src)) { const p = path.join(src, f); if (fs.statSync(p).isFile() && PAGE.test(f)) { fs.copyFileSync(p, path.join(dest, f)); copied.push(f) } }
  if (!copied.includes('index.html') || !copied.includes('auth.html')) { fs.rmSync(dest, { recursive: true, force: true }); return { copied: [], note: 'This repository does not hold the ASAP-Rank login and sales pages, so there is nothing to back up.' } }
  fs.writeFileSync(path.join(dest, '.htaccess'), HTACCESS); copied.push('.htaccess');
  return { copied, note: '' };
}

const dirOk = d => d === '' || (/^[A-Za-z0-9._~\/-]+$/.test(d) && !d.split('/').includes('..'));
export function upload(dir, env = process.env, curl = env.MIRROR_CURL || 'curl') {
  const host = String(env.BLUEHOST_FTP_HOST || '').trim(), user = String(env.BLUEHOST_FTP_USER || ''), pass = String(env.BLUEHOST_FTP_PASS || '');
  if (!host && !user && !pass) return { skipped: true, sent: [], failed: [], note: 'No BLUEHOST_FTP_* secrets are set, so the backup copy was not uploaded.' };
  if (!/^[A-Za-z0-9.-]+(:\d+)?$/.test(host) || !user || !pass) return { skipped: false, sent: [], failed: ['setup'], note: 'The Bluehost secrets are incomplete. Set BLUEHOST_FTP_HOST (for example ftp.yourdomain.com), BLUEHOST_FTP_USER and BLUEHOST_FTP_PASS.' };
  const rd = String(env.BLUEHOST_FTP_DIR || '').trim().replace(/^\/+|\/+$/g, '');
  if (!dirOk(rd)) return { skipped: false, sent: [], failed: ['setup'], note: 'BLUEHOST_FTP_DIR may only hold letters, numbers and slashes, for example public_html/backup.' };
  if (!fs.existsSync(dir)) return { skipped: false, sent: [], failed: ['setup'], note: 'Nothing was staged to upload.' };
  const tls = String(env.BLUEHOST_FTP_TLS || 'explicit').toLowerCase(), sent = [], failed = [];
  for (const f of fs.readdirSync(dir).sort((a, b) => (a == 'config.js') - (b == 'config.js') || a.localeCompare(b))) {
    const url = 'ftp://' + host + '/' + (rd ? rd + '/' : '') + f; let ok = false, err = '';
    for (let i = 0; i < 2 && !ok; i++) {
      const args = ['--silent', '--show-error', '--fail', '--ftp-create-dirs', '--ftp-pasv', '--connect-timeout', '20', '--max-time', '90', ...(tls == 'none' ? [] : ['--ssl-reqd']), '--config', '-', '-T', path.join(dir, f), url];
      const r = spawnSync(curl, args, { input: 'user = "' + (user + ':' + pass).replace(/(["\\])/g, '\\$1') + '"\n', encoding: 'utf8', timeout: 100000 });
      ok = r.status === 0; if (!ok) err = String(r.stderr || r.error || '').trim().split('\n').pop().replace(pass, '***');
    }
    if (ok) sent.push(f); else failed.push(f + (err ? ' (' + err + ')' : ''));
  }
  return { skipped: false, sent, failed, note: '' };
}

function cli(argv, env = process.env) {
  const [cmd, a, b] = argv;
  if (cmd == 'stage') { const r = stage(a || 'docs', b || 'bluehost-site'); console.log(r.copied.length ? 'Staged ' + r.copied.length + ' files for the backup copy: ' + r.copied.join(', ') : r.note); return 0 }
  if (cmd == 'upload') {
    const r = upload(a || 'bluehost-site', env);
    if (r.skipped) { console.log(r.note); return 0 }
    if (r.failed.length) { console.log('::warning title=Bluehost backup copy::' + (r.note || 'Some files were not uploaded: ' + r.failed.join('; ') + '. Check the FTP host, user, password and folder, and that FTP is allowed for your hosting account.')); return 0 }
    console.log('Backup copy updated on your web host: ' + r.sent.length + ' files.'); return 0;
  }
  console.log('Usage: node mirror.mjs stage <pages-folder> <staging-folder>  |  node mirror.mjs upload <staging-folder>'); return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(cli(process.argv.slice(2)));
