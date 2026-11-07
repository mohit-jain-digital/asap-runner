var __name=function(f){return f};(function loader() {
  const d = document, s = d.currentScript || d.querySelector('script[src*="/__rp/rp.js"]'); if (!s) return;
  if (window.__rpOn) return; window.__rpOn = 1;
  const sq = new URL(s.src), AP = (s.getAttribute('data-api') || '').replace(/\/+$/, ''), STAT = !!AP && AP !== sq.origin, o = (STAT ? AP : sq.origin) + '/__rp/', site = sq.searchParams.get('site') || s.getAttribute('data-site') || '', L = location, P = L.pathname + L.search, DBG = /rp_debug/.test(L.search);
  const np = x => x.length > 1 ? x.replace(/\/+$/, '') : x;
  const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v) } catch (e) {} };
  const esc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const q = new URLSearchParams(L.search), u = {};
  ['source', 'medium', 'campaign', 'term', 'content'].forEach(k => { const v = q.get('utm_' + k); if (v) u[k] = v });
  if (Object.keys(u).length) ls('rp_utm', JSON.stringify(u));
  let U = {}; try { U = JSON.parse(ls('rp_utm') || '{}') } catch (e) {}
  const edge = !!d.querySelector('meta[name=rp-edge]');
  const dl = (n, x) => (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: n }, x));
  const EQ = []; let ET = 0, SBX = null;
  const fl = () => { if (!EQ.length) return; const l = EQ.splice(0, 30), wk = () => { try { navigator.sendBeacon(o + 'ev', JSON.stringify({ site, h: L.hostname, list: l })) } catch (e) {} };
    if (!SBX) return wk();
    try { const m = {}; l.forEach(x => { const k = x.e + '|' + x.r; m[k] = (m[k] || 0) + 1 }); fetch(SBX.u + '/rest/v1/rpc/ev_add', { method: 'POST', keepalive: true, headers: { apikey: SBX.k, 'content-type': 'application/json' }, body: JSON.stringify({ p_site: site, p_rows: Object.keys(m).map(k => { const i = k.indexOf('|'); return { e: k.slice(0, i), r: k.slice(i + 1), n: m[k] } }) }) }).then(r => { if (!r.ok) wk() }).catch(wk) } catch (e) { wk() } };
  const ev = (n, r) => { EQ.push({ e: n, r: String(r == null ? '' : r).slice(0, 60) }); if (EQ.length >= 20) fl(); else if (!ET) ET = setTimeout(() => { ET = 0; fl() }, 90000) };
  addEventListener('pagehide', fl); addEventListener('visibilitychange', () => { if (d.hidden) fl() });
  const ok = u => /^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(u || '');
  const kv = v => { const o = {}; v.split('\n').forEach(l => { const m = /^\s*([A-Za-z ]+):\s*(.*)$/.exec(l); if (m) o[m[1].trim().toLowerCase()] = m[2].trim() }); return o };
  const jl = o => { const t = typeof o == 'string' ? o : JSON.stringify(o); if (ldHas(t)) return; const j = d.createElement('script'); j.type = 'application/ld+json'; j.dataset.rpLd = 1; j.textContent = t; d.head.appendChild(j) };
  const mt = (n, v, a) => { let m = d.querySelector('meta[' + a + '="' + n + '"]'); if (!m) { m = d.createElement('meta'); m.setAttribute(a, n); d.head.appendChild(m) } m.content = v };
  const blockHas = t => [...d.querySelectorAll('[data-rp-block]')].some(b => b.textContent.includes(String(t).trim().slice(0, 60)));
  const ldHas = v => [...d.querySelectorAll('script[type="application/ld+json"]')].some(x => x.textContent.replace(/\s+/g, '') == String(v).replace(/\s+/g, ''));
  const nz = s => String(s || '').toLowerCase().replace(/[^a-z0-9\u00c0-\uffff]+/g, ' ').trim();
  const mine = e => !!(e.closest && e.closest('[data-rp-block],#rpc'));
  const heads = () => [...d.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h => !mine(h));
  const rootEl = () => d.querySelector('.entry-content,.post-content,.article-content,.single-content,.page-content') || d.querySelector('article') || d.querySelector('main,[role=main]') || d.body;
  const comEl = () => d.querySelector('#comments,.comments-area,#disqus_thread,#respond,.comment-respond');
  const ftEl = () => [...d.querySelectorAll('footer,#footer,#colophon,.site-footer,[role=contentinfo]')].filter(f => !mine(f) && !f.closest('article,main,aside'))[0] || null;
  const SECS = 'section,.elementor-section,.elementor-top-section,.wp-block-group,.et_pb_section,.vc_row,.fl-row,.e-con';
  const secEnd = h => {
    const s = h.closest(SECS); if (s && s !== rootEl() && s !== d.body && !s.contains(rootEl())) return s;
    let a = h; while (a.parentElement && !a.nextElementSibling && a.parentElement !== d.body && a.parentElement !== rootEl()) a = a.parentElement;
    let last = a, n = a.nextElementSibling; const lv = +h.tagName.charAt(1);
    while (n) { if (/^H[1-6]$/.test(n.tagName) && +n.tagName.charAt(1) <= lv) break; last = n; n = n.nextElementSibling }
    return last;
  };
  const place = (el, pos) => {
    pos = String(pos || '').trim(); const p = pos.toLowerCase().replace(/\bthe\b/g, '').replace(/\s+/g, ' ').trim(), ms = /^(before|after|inside)\s+selector:\s*(.+)$/i.exec(pos), sc = /^(before|after)\s+(?:section|heading):\s*(.+)$/i.exec(pos);
    try {
      if (ms) { const t = d.querySelector(ms[2].trim()); if (t) { const k = ms[1].toLowerCase(); if (k == 'inside') t.appendChild(el); else t.parentNode.insertBefore(el, k == 'before' ? t : t.nextSibling); return true } }
      else if (sc) { const q = nz(sc[2]), h = heads().find(x => nz(x.textContent).includes(q)); if (h) { if (sc[1].toLowerCase() == 'before') h.parentNode.insertBefore(el, h); else { const e2 = secEnd(h); e2.parentNode.insertBefore(el, e2.nextSibling) } return true } }
      else if (/comment/.test(p)) { const c = comEl(); if (c) { c.parentNode.insertBefore(el, /^(after|below|under)/.test(p) ? c.nextSibling : c); return true } }
      else if (/footer/.test(p)) { const f = ftEl(); if (f) { f.parentNode.insertBefore(el, f); return true } }
    } catch (e) {}
    const r = rootEl(), c = comEl();
    if (c && r.contains(c) && c !== r && c.parentNode) { c.parentNode.insertBefore(el, c); return true }
    if (r === d.body) { const f = ftEl(); if (f) { f.parentNode.insertBefore(el, f); return true } }
    r.appendChild(el); return true;
  };
  const FQS = '[itemtype*="FAQPage" i],[class*="faq" i],[id*="faq" i],[class*="accordion" i],[class*="frequently" i]';
  const ITEMS = 'details,dt,summary,h3,h4,button[aria-expanded],[class*="accordion-item" i],[class*="faq-item" i],[class*="question" i]';
  const findFaq = () => {
    const bl = d.body.textContent.length, isq = c => /faq|frequently/i.test((c.className && c.className.baseVal == null ? c.className : '') + ' ' + c.id + ' ' + (c.getAttribute('itemtype') || '')) || (c.textContent.match(/\?/g) || []).length >= 2;
    const all = [...d.querySelectorAll(FQS)].filter(c => c !== d.body && !mine(c) && !c.closest('header,nav,footer') && c.textContent.length < bl * .7 && c.querySelectorAll(ITEMS).length >= 2 && isq(c));
    const c = all.find(x => !all.some(y => y !== x && y.contains(x))); if (c) return c;
    const h = heads().find(x => /\b(faqs?|frequently asked|common questions|questions (?:and|&) answers)\b/i.test(x.textContent)); if (!h) return null;
    const nx = h.nextElementSibling; if (nx && !mine(nx)) { if (nx.matches('dl') || nx.querySelector('dl,details,dt')) return nx; if (nx.matches('details')) return h.parentElement }
    let q = h.parentElement; while (q && q !== d.body && q.querySelectorAll('details,dt,summary,h3,h4').length < 2 && q.textContent.length < bl * .7) q = q.parentElement;
    return q && q !== d.body && q.textContent.length < bl * .7 && q.contains(h) ? q : h;
  };
  const setTx = (el, t) => { const w = d.createTreeWalker(el, 4); let n, f = null; while (n = w.nextNode()) { if (!n.data.trim()) continue; if (!f) { f = n; f.data = t } else n.data = '' } if (!f) el.textContent = t };
  const mkFaq = (items, hd) => { const e = d.createElement('section'); e.dataset.rpBlock = 'FAQ'; e.innerHTML = (hd ? '<h2>' + esc(hd) + '</h2>' : '') + items.map(m => '<h3>' + esc(m[1]) + '</h3><p>' + esc(m[2].trim()) + '</p>').join(''); return e };
  const mergeFaq = (c, items) => {
    const det = [...c.querySelectorAll('details')].filter(x => !mine(x)), dts = [...c.querySelectorAll('dt')].filter(x => !mine(x));
    if (det.length) { let at = det[det.length - 1]; const last = at; items.forEach(m => { const n = last.cloneNode(true); n.removeAttribute('open'); n.dataset.rpBlock = 'FAQ'; const sm = n.querySelector('summary'); if (sm) setTx(sm, m[1]); const bd = [...n.children].find(x => x !== sm); if (bd) setTx(bd, m[2].trim()); else { const q = d.createElement('p'); q.textContent = m[2].trim(); n.appendChild(q) } at.parentNode.insertBefore(n, at.nextSibling); at = n }); return true }
    if (dts.length) { const dl = dts[dts.length - 1].parentNode; items.forEach(m => { const a = d.createElement('dt'), b = d.createElement('dd'); a.dataset.rpBlock = 'FAQ'; b.dataset.rpBlock = 'FAQ'; a.textContent = m[1]; b.textContent = m[2].trim(); dl.appendChild(a); dl.appendChild(b) }); return true }
    const e = mkFaq(items, ''); const at = /^H[1-6]$/.test(c.tagName) ? secEnd(c) : c; at.parentNode.insertBefore(e, at.nextSibling); return true;
  };
  const addLd = items => {
    if (d.querySelector('[itemtype*="FAQPage" i]')) return;
    const mk = m => ({ '@type': 'Question', name: m[1], acceptedAnswer: { '@type': 'Answer', text: m[2].trim() } });
    for (const sc of d.querySelectorAll('script[type="application/ld+json"]')) {
      let j; try { j = JSON.parse(sc.textContent) } catch (e) { if (/FAQPage/.test(sc.textContent)) return; continue }
      const nodes = Array.isArray(j) ? j : (j && j['@graph']) || [j], fp = nodes.find(n => n && (n['@type'] == 'FAQPage' || (Array.isArray(n['@type']) && n['@type'].indexOf('FAQPage') > -1)));
      if (fp) { const me = Array.isArray(fp.mainEntity) ? fp.mainEntity : fp.mainEntity ? [fp.mainEntity] : [], have = me.map(q => nz(q && q.name)); items.forEach(m => { if (have.indexOf(nz(m[1])) < 0) me.push(mk(m)) }); fp.mainEntity = me; sc.textContent = JSON.stringify(j); return }
    }
    jl({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(mk) });
  };
  const faq = v => {
    const pos = (/^\s*position:\s*(.+)$/im.exec(v) || [])[1] || 'auto', merge = !/^\s*merge:\s*(off|no)\b/im.test(v), hd = (/^\s*heading:\s*(.+)$/im.exec(v) || [])[1];
    const all = [...v.matchAll(/Q:\s*(.+?)\s*A:\s*([\s\S]+?)(?=\s*Q:|$)/g)]; if (!all.length) return;
    const body = nz(d.body.textContent), items = all.filter(m => body.indexOf(nz(m[1]).slice(0, 60)) < 0); if (!items.length) return;
    const ex = merge ? findFaq() : null; if (ex) { mergeFaq(ex, items); addLd(items); return }
    const lang = (d.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    place(mkFaq(items, hd || (lang == 'en' ? 'Frequently asked questions' : '')), pos); addLd(items);
  };
  const blk = (x, v) => {
    if (kv(v).heading && blockHas(kv(v).heading)) return;
    const o = kv(v), e = d.createElement('section'), im = o.image && ok(o.image) ? '<img src="' + esc(o.image) + '" alt="' + esc(o.alt || '') + '" loading=lazy style="max-width:100%;height:auto;border-radius:16px">' : '';
    e.dataset.rpBlock = x.type; e.style.cssText = 'margin:24px 0;padding:24px;border:2px solid currentColor;border-radius:20px;font:inherit';
    e.innerHTML = im + (o.heading ? '<h2 style="margin:12px 0 8px">' + esc(o.heading) + '</h2>' : '') + (o.text ? '<p>' + esc(o.text) + '</p>' : '') + (o.button && ok(o.link) ? '<a href="' + esc(o.link) + '" style="display:inline-block;min-height:48px;line-height:48px;padding:0 24px;border-radius:24px;background:#000;color:#fff;text-decoration:none;font-weight:700">' + esc(o.button) + '</a>' : '');
    if (/comment|footer|section:|selector:|^end of content/i.test(o.position || '') && place(e, o.position)) return;
    const hm = /^after heading:\s*(.+)$/i.exec(o.position || '');
    if (hm) { const hh = [...d.querySelectorAll('h2,h3')].find(h => h.textContent.toLowerCase().includes(hm[1].trim().toLowerCase())); if (hh) { const n = hh.nextElementSibling, t = n && n.tagName == 'P' ? n : hh; t.parentNode.insertBefore(e, t.nextSibling); return } }
    const pos = (o.position || 'end').toLowerCase(), main = d.querySelector('main,article') || d.body, p1 = main.querySelector('p'), ft = d.querySelector('footer');
    if (pos.startsWith('after') && p1 && p1.parentNode) p1.parentNode.insertBefore(e, p1.nextSibling);
    else if (pos.startsWith('before') && ft && ft.parentNode) ft.parentNode.insertBefore(e, ft);
    else main.appendChild(e);
  };
  const ap = c => { if (c.ot && !d.querySelector('meta[http-equiv=origin-trial]')) { const m = d.createElement('meta'); m.httpEquiv = 'origin-trial'; m.content = c.ot; d.head.appendChild(m) } (c.changes || []).forEach(x => { try {
    const v = x.value, t = x.type; if (edge && t != 'WebMCP') return;
    if (t == 'Title') d.title = v;
    else if (t == 'Meta') mt('description', v, 'name');
    else if (t == 'Schema' && /^[\[{]/.test(v) && !ldHas(v)) jl(v);
    else if (t == 'FAQ') faq(v);
    else if (t == 'Link') { const m = /<a href="([^"]+)">([^<]+)<\/a>/.exec(v); if (m && ok(m[1]) && ![...d.querySelectorAll('a')].some(a => a.textContent.trim() == m[2] && a.getAttribute('href') == m[1])) { const w = d.createTreeWalker(d.body, 4); let n; while (n = w.nextNode()) { if (n.parentNode.closest('a,script,style,nav,header,footer')) continue; const i = n.data.indexOf(m[2]); if (i >= 0) { const r = n.splitText(i); r.splitText(m[2].length); const a = d.createElement('a'); a.href = m[1]; a.textContent = m[2]; r.parentNode.replaceChild(a, r); break } } } }
    else if (t == 'Alt') v.split('\n').forEach(l => { const i = l.indexOf('|'); if (i < 1) return; const k = l.slice(0, i).trim(), a = l.slice(i + 1).trim(); d.querySelectorAll('img').forEach(im => { if (k == '*' ? !im.alt : [im.getAttribute('src'), im.getAttribute('data-src')].some(z => (z || '').includes(k))) im.alt = a }) });
    else if (t == 'OG') { const o = kv(v); if (o.title) mt('og:title', o.title, 'property'); if (o.description) mt('og:description', o.description, 'property'); if (o.image && ok(o.image)) mt('og:image', o.image, 'property') }
    else if (t == 'Canonical') { let l = d.querySelector('link[rel=canonical]'); if (!l) { l = d.createElement('link'); l.rel = 'canonical'; d.head.appendChild(l) } l.href = v == 'self' ? L.origin + L.pathname : v }
    else if (t == 'Breadcrumb') { const seg = L.pathname.split('/').filter(Boolean); if (seg.length) jl({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: L.origin + '/' }].concat(seg.map((x2, i) => ({ '@type': 'ListItem', position: i + 2, name: decodeURIComponent(x2).replace(/[-_]/g, ' '), item: L.origin + '/' + seg.slice(0, i + 1).join('/') }))) }) }
    else if (t == 'CTA' || t == 'Image') blk(x, v);
    else if (t == 'WebMCP') wm(v);
  } catch (e) {} }) };
  const wm = v => {
    const mc = d.modelContext || navigator.modelContext; if (!mc || !mc.registerTool) return;
    v.split(/\n\s*\n/).forEach(b => {
      const o = kv(b); if (!o.tool || !o.action) return;
      const nm = o.tool.replace(/[^a-z0-9_]/gi, '_').slice(0, 60), props = {}, req = [];
      (o.input || '').split(',').forEach(x => { const m = /^\s*(\w+)\s*(?:\((\w+)\))?/.exec(x); if (m) { props[m[1]] = { type: m[2] == 'number' ? 'number' : 'string' }; req.push(m[1]) } });
      const nav = /^navigate\s+(\S+)/i.exec(o.action), fill = /^fill\s+(\S+)/i.exec(o.action); if (!nav && !fill) return;
      try { mc.registerTool({ name: nm, description: o.description || nm, inputSchema: { type: 'object', properties: props, required: req }, annotations: { readOnlyHint: true },
        execute: async a => { a = a || {}; try {
          if (nav) { const u = nav[1].replace(/\{(\w+)\}/g, (z, k) => encodeURIComponent(a[k] == null ? '' : a[k])); if (!/^\/(?!\/)/.test(u)) return 'Blocked: only paths on this site are allowed.'; location.href = u; return 'Navigating to ' + u }
          const f = d.querySelector(fill[1]); if (!f) return 'The form was not found on this page.';
          Object.keys(a).forEach(k => { const el = f.querySelector('[name="' + k.replace(/"/g, '') + '"]'); if (el) { el.value = a[k]; el.dispatchEvent(new Event('input', { bubbles: true })) } });
          return 'Filled the form. The visitor still needs to review and submit it.';
        } catch (e) { return 'Could not run this tool.' } } }) } catch (e) {}
    });
  };
  const hit = a => a.some(l => {
    l = l.trim(); if (!l) return false;
    if (l.startsWith('kw:')) return d.body.innerText.toLowerCase().includes(l.slice(3).toLowerCase());
    if (l.startsWith('re:')) { try { return new RegExp(l.slice(3)).test(P) } catch (e) { return false } }
    if (l[0] == '?') return P.includes(l);
    return new RegExp('^' + np(l).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(np(L.pathname));
  });
  const seen = r => { if (ls('rp_done')) return 1; if (r.fr == 'Every visit') return 0; const t = +ls('rp_f' + r.id); return t && Date.now() - t < (r.fr == 'Once per 7 days' ? 6048e5 : 18e5) };
  const show = r => {
    const bar = r.ty == 'bar', inl = r.ty == 'inline', host = inl ? d.querySelector('[data-rp-inline]') : d.body;
    if (!host || d.querySelector('[data-rp-id="' + String(r.id).replace(/[^\w.:-]/g, '') + '"]')) return;
    ls('rp_f' + r.id, Date.now()); dl('rp_popup_view', { popup: r.n, popup_id: r.id }); ev('popup_view', r.id);
    const e = d.createElement('div'); e.dataset.rpId = r.id; const pos = ['top', 'center', 'bottom'].includes(r.pos) ? r.pos : 'center', im = /^https:\/\//.test(r.img || '') ? r.img : '', ipos = ['top', 'bottom', 'left', 'right'].includes(r.imgp) ? r.imgp : 'top', side = !!im && (ipos == 'left' || ipos == 'right'), modal = !bar && !inl;
    const hx6 = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : '', rg = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), pbg = hx6(r.bg), pbg2 = pbg ? hx6(r.bg2) : '', pmid = pbg2 ? '#' + rg(pbg).map((v, i) => ((v + rg(pbg2)[i]) >> 1).toString(16).padStart(2, '0')).join('') : pbg, pink = c => { const v = rg(c); return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255 > 0.6 ? '#000' : '#fff' }, pfill = pbg ? (pbg2 ? 'linear-gradient(135deg,' + pbg + ',' + pbg2 + ')' : pbg) : '#fff', pfg = pbg ? pink(pmid) : '#000', pbtn = hx6(r.btn), pbb = pbtn || pfg, pbt = pink(pbb), shp = ['soft', 'round', 'square'].includes(r.shape) ? r.shape : 'soft', pcr = { soft: 20, round: 32, square: 4 }[shp], pir = { soft: 12, round: 24, square: 4 }[shp], pbr = { soft: 24, round: 999, square: 4 }[shp];
    e.setAttribute('role', bar ? 'region' : 'dialog'); e.setAttribute('aria-label', r.h);
    e.style.cssText = 'font:16px system-ui;box-sizing:border-box;' + (bar ? 'position:fixed;top:0;left:0;right:0;z-index:99999;background:' + (pbg ? pfill : '#000') + ';color:' + (pbg ? pfg : '#fff') + ';padding:12px 48px;text-align:center'
      : inl ? 'margin:16px 0;border:2px solid #000;border-radius:20px;padding:20px;position:relative'
      : 'position:relative;width:min(100%,' + (side ? 640 : ({ narrow: 320, wide: 480 })[r.w] || 380) + 'px);background:' + pfill + ';color:' + pfg + ';border:2px solid ' + pfg + ';border-radius:' + pcr + 'px;padding:20px;max-height:90vh;overflow:auto;display:flex;gap:12px;flex-wrap:' + (side ? 'wrap' : 'nowrap') + ';flex-direction:' + ({ top: 'column', bottom: 'column-reverse', left: 'row', right: 'row-reverse' })[ipos] + (hx6(r.tc) && !bar && !inl ? ';color:' + hx6(r.tc) : '') + ({ serif: 'Georgia,\'Times New Roman\',serif', rounded: 'ui-rounded,\'Hiragino Maru Gothic ProN\',\'Segoe UI\',system-ui,sans-serif', mono: 'ui-monospace,Menlo,Consolas,monospace' }[r.fnt] ? ';font-family:' + { serif: 'Georgia,\'Times New Roman\',serif', rounded: 'ui-rounded,\'Hiragino Maru Gothic ProN\',\'Segoe UI\',system-ui,sans-serif', mono: 'ui-monospace,Menlo,Consolas,monospace' }[r.fnt] : ''));
    const ask = r.ask || 'email', ip = 'width:100%;min-height:48px;box-sizing:border-box;padding:0 12px;margin-bottom:8px;border:1px solid ' + pfg + ';border-radius:' + pir + 'px;font:inherit', LB = { email: 'email', sms: 'SMS', whatsapp: 'WhatsApp' };
    const oc = [].concat(r.otp || []).filter(c => c && (c == 'email' ? ask != 'phone' : ask != 'email'));
    const xf = [].concat(r.fields || []).slice(0, 12).map((f, i) => { const n = 'x_' + i, l = esc(f.l || 'Field'), rq = f.req ? ' required' : '', o = [].concat(f.o || []).slice(0, 30); if (f.t == 'textarea') return '<textarea name=' + n + rq + ' aria-label="' + l + '" placeholder="' + l + '" style="' + ip + ';min-height:80px;padding:10px"></textarea>'; if (f.t == 'select') return '<select name=' + n + rq + ' aria-label="' + l + '" style="' + ip + '"><option value="">' + l + '</option>' + o.map(z => '<option>' + esc(z) + '</option>').join('') + '</select>'; if (f.t == 'radio' || f.t == 'multi') return '<fieldset style="border:0;padding:0;margin:0 0 8px"><legend style="font-size:14px">' + l + (f.req ? ' *' : '') + '</legend>' + o.map((z, j) => '<label style="display:flex;gap:8px;align-items:center;min-height:36px"><input type=' + (f.t == 'radio' ? 'radio' : 'checkbox') + ' name=' + n + ' value="' + esc(z) + '"' + (f.t == 'radio' && f.req && !j ? ' required' : '') + '>' + esc(z) + '</label>').join('') + '</fieldset>'; if (f.t == 'pincode') return '<input name=' + n + rq + ' inputmode=numeric maxlength=6 pattern="[0-9]{6}" placeholder="' + l + '" aria-label="' + l + '" style="' + ip + '">'; return '<input name=' + n + rq + ' placeholder="' + l + '" aria-label="' + l + '" style="' + ip + '">' }).join('');
    const form = bar ? '' : '<form style="margin-top:10px"><input name=website tabindex=-1 autocomplete=off aria-hidden=true style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">' + (ask == 'full' ? '<input name=name placeholder="Your name" aria-label="Your name" style="' + ip + '">' : '') + (ask != 'phone' ? '<input name=email type=email required placeholder=Email aria-label=Email style="' + ip + '">' : '') + (ask != 'email' ? '<input name=phone type=tel required placeholder="Mobile number" aria-label="Mobile number" style="' + ip + '">' : '') + xf + (oc.length > 1 ? '<select name=ch aria-label="Send the code by" style="' + ip + '">' + oc.map(c => '<option value=' + c + '>Verify by ' + LB[c] + '</option>').join('') + '</select>' : '') + '<input name=code inputmode=numeric placeholder="6-digit code" aria-label="Verification code" hidden style="' + ip + '"><label style="display:block;font-size:13px;margin-bottom:8px"><input type=checkbox required> I agree to be contacted</label><div role=status data-m style="font-size:13px;margin-bottom:8px"></div><button style="width:100%;min-height:48px;background:' + pbb + ';color:' + pbt + ';border:0;border-radius:' + pbr + 'px">Subscribe</button></form>';
    e.innerHTML = (modal && im ? '<img src="' + esc(im) + '" alt="" style="border-radius:12px;object-fit:cover;max-width:100%;' + (side ? 'flex:1 1 140px;min-width:120px;align-self:stretch' : 'width:100%;max-height:220px') + '">' : '') + '<div style="flex:2 1 220px;min-width:0"><b>' + esc(r.h) + '</b>' + form + '</div><button type=button data-x aria-label=Close style="position:absolute;top:0;right:0;min-width:48px;min-height:48px;background:none;border:0;color:inherit;font-size:22px">×</button>';
    if (!bar && r.brand && r.brand.t) { const bx = e.querySelector('div'), bd = d.createElement('div'), tx = String(r.brand.t).slice(0, 40); bd.style.cssText = 'margin-top:8px;font-size:11px;line-height:1.3;text-align:center;opacity:.6'; if (/^https:\/\//.test(r.brand.u || '')) { const a = d.createElement('a'); a.href = r.brand.u; a.target = '_blank'; a.rel = 'noopener nofollow'; a.style.cssText = 'color:inherit;text-decoration:none'; a.textContent = tx; bd.appendChild(a) } else bd.textContent = tx; if (bx) bx.appendChild(bd) }
    e.querySelector('[data-x]').onclick = () => { dl('rp_popup_close', { popup: r.n, popup_id: r.id }); ev('popup_close', r.id); (e.__w || e).remove() };
    const f = e.querySelector('form');
    if (f) {
      const t0 = Date.now(), g = n => ((f.querySelector('[name=' + n + ']') || {}).value || '').trim(), m = f.querySelector('[data-m]'), b = f.querySelector('button:not([data-x])');
      const ex = () => { const o2 = {}; (r.fields || []).slice(0, 12).forEach((fd, i) => { const els = [...f.querySelectorAll('[name=x_' + i + ']')]; if (!els.length) return; const v = fd.t == 'multi' ? els.filter(z => z.checked).map(z => z.value).join(', ') : fd.t == 'radio' ? ((els.find(z => z.checked) || {}).value || '') : (els[0].value || '').trim(); if (v) o2[String(fd.l || 'Field').slice(0, 60)] = v.slice(0, 500) }); return o2 }; const fin = vt => fetch(o + 'lead', { method: 'POST', body: JSON.stringify({ extra: ex(), site, popup: r.n, page: P, utm: U, name: g('name'), email: g('email'), phone: g('phone'), vt: vt || '', hp: g('website'), ms: Date.now() - t0 }) }).then(res => { if (!res.ok) throw 0; ls('rp_done', 1); dl('rp_lead', Object.assign({ popup: r.n, popup_id: r.id }, U)); ev('popup_lead', r.id); fl(); e.innerHTML = '<b>Thanks!</b>'; setTimeout(() => (e.__w || e).remove(), 2000) }).catch(() => { b.disabled = false; m.textContent = 'Sorry, that did not send. Please try again in a moment.' });
      f.onsubmit = async ev => {
        ev.preventDefault(); if (!oc.length) return fin();
        const ch = oc.length > 1 ? (g('ch') || oc[0]) : oc[0], target = ch == 'email' ? g('email') : g('phone'); b.disabled = true; m.textContent = 'Sending your code…';
        const sr = await fetch(o + 'otp/send', { method: 'POST', body: JSON.stringify({ site, target, channel: ch }) }).then(x => x.json()).catch(() => ({ skip: true }));
        b.disabled = false; if (sr.skip) return fin(''); if (!sr.ok) { m.textContent = sr.error || 'Could not send the code.'; return }
        f.querySelector('[name=code]').hidden = false; m.textContent = 'Enter the code we sent you.'; b.textContent = 'Verify and finish';
        f.onsubmit = async e2 => { e2.preventDefault(); const vr = await fetch(o + 'otp/verify', { method: 'POST', body: JSON.stringify({ site, target, code: g('code') }) }).then(x => x.json()).catch(() => ({})); if (vr.ok) fin(vr.vt); else m.textContent = 'That code is not right. Try again.' };
      };
    }
    if (!modal) { host.appendChild(e); return }
    if (!d.getElementById('rp-kf')) { const ks = d.createElement('style'); ks.id = 'rp-kf'; ks.textContent = '@media(prefers-reduced-motion:no-preference){@keyframes rpf{from{opacity:0}to{opacity:1}}@keyframes rpsu{from{opacity:0;transform:translateY(48px)}to{opacity:1;transform:none}}@keyframes rpsd{from{opacity:0;transform:translateY(-48px)}to{opacity:1;transform:none}}@keyframes rpb{0%{opacity:0;transform:scale(.7)}55%{opacity:1;transform:scale(1.07)}75%{transform:scale(.97)}100%{transform:scale(1)}}@keyframes rpz{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}@keyframes rpfl{from{opacity:0;transform:perspective(600px) rotateX(-70deg)}to{opacity:1;transform:none}}}'; d.head.appendChild(ks) }
    const an = { fade: 'rpf', slide: pos == 'top' ? 'rpsd' : 'rpsu', bounce: 'rpb', zoom: 'rpz', flip: 'rpfl' }[r.anim]; if (an) e.style.animation = an + ' .45s ease-out both';
    const w = d.createElement('div'); e.__w = w; w.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;display:flex;padding:16px;box-sizing:border-box;overflow:auto;background:rgba(0,0,0,' + ({ none: 0, light: .3, dark: .75 }[r.dim] ?? .55) + ')'; e.style.margin = pos == 'top' ? '0 auto auto' : pos == 'bottom' ? 'auto auto 0' : 'auto';
    w.appendChild(e); host.appendChild(w);
    const kd = ev => { if (ev.key == 'Escape') { d.removeEventListener('keydown', kd); w.remove() } }; d.addEventListener('keydown', kd);
    const cb = e.querySelector('[data-x]'); if (cb) cb.focus();
  };
  const arm = r => {
    if (!hit(r.inc && r.inc.length ? r.inc : ['*']) || hit(r.exc || []) || seen(r)) return;
    const go = () => show(r), tv = +r.tv;
    if (r.ty == 'bar' || r.ty == 'inline') go();
    else if (r.ty == 'time') setTimeout(go, (tv || 10) * 1e3);
    else if (r.ty == 'scroll') addEventListener('scroll', function f() { if (scrollY / ((d.documentElement.scrollHeight - innerHeight) || 1) * 100 >= (tv || 50)) { removeEventListener('scroll', f); go() } }, { passive: true });
    else if (matchMedia('(pointer:coarse)').matches) { let y = 0; addEventListener('scroll', function f() { if (y - scrollY > 120 && scrollY > 300) { removeEventListener('scroll', f); go() } y = Math.max(y, scrollY) }, { passive: true }) }
    else d.addEventListener('mouseout', function f(ev) { if (!ev.relatedTarget && ev.clientY < 5) { d.removeEventListener('mouseout', f); go() } });
  };
  const ga = c => { const id = String(c.ga4 || ''); if (!/^G-[A-Z0-9]{6,12}$/.test(id)) return; setTimeout(() => { const w = window, present = [...d.scripts].some(z => /googletagmanager\.com\/gtag\/js\?id=G-/i.test(z.src || '')) || Object.keys(w.google_tag_manager || {}).some(k => /^G-/.test(k)) || (w.dataLayer || []).some(e2 => e2 && e2[0] == 'config' && /^G-/.test(e2[1] || '')); if (present) { if (DBG) console.info('[ASAP-Rank] GA4 already on this page, not adding it again'); return } w.dataLayer = w.dataLayer || []; w.gtag = w.gtag || function () { w.dataLayer.push(arguments) }; w.gtag('js', new Date()); w.gtag('config', id); const gs = d.createElement('script'); gs.async = true; gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + id; d.head.appendChild(gs); if (DBG) console.info('[ASAP-Rank] GA4 added: ' + id) }, 3000) };
  const chatLoad = c => {
    const k = c.chat; if (!k || !k.on) return; if (k.inc && k.inc.length && !hit(k.inc)) return; if (k.exc && k.exc.length && hit(k.exc)) return;
    const go = () => { if (window.__rpChat) return; window.__rpChat = Object.assign({ o, site }, k); const x = d.createElement('script'); x.async = true; x.src = (STAT ? sq.origin + '/chat.js' : o + 'chat.js'); d.head.appendChild(x) };
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(e => addEventListener(e, go, { once: true, passive: true })); setTimeout(go, 5000);
  };
  const pmx = (pat, path) => String(pat || '').split(/[\n,]/).some(l => { l = l.trim(); if (!l) return false; if (l.startsWith('re:')) { try { return new RegExp(l.slice(3)).test(path) } catch (e) { return false } } return new RegExp('^' + np(l).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(np(path)) });
  const fixc = c => { if (c.big) return fetch(o + 'cfg.json?site=' + site + '&h=' + encodeURIComponent(L.hostname) + '&path=' + encodeURIComponent(L.pathname)).then(r => r.json()).then(c2 => { c.changes = c2.changes || []; return c }).catch(() => c); c.allCh = c.changes || []; c.changes = c.allCh.filter(z => pmx(z.page, L.pathname) && (!z.h || hn(z.h) == hn(L.hostname))); return c };
  const hn = x => String(x || '').toLowerCase().replace(/^www\./, ''), png = () => { try { const t = +ls('rp_pt') || 0; if (Date.now() - t > 864e5) { ls('rp_pt', Date.now()); navigator.sendBeacon(o + 'ping?site=' + site + '&h=' + encodeURIComponent(L.hostname) + '&k=snippet') } } catch (e) {} };
  const bkt = p => { let h = 2166136261; for (let i = 0; i < p.length; i++) { h ^= p.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) % 64 };
  const statCfg = () => fetch(sq.origin + '/c/' + site + '.json').then(r => r.json()).then(async c => {
    const H = hn(L.hostname), none = { popups: [], changes: [] }; png();
    if (c.off || (c.until && Date.now() > c.until)) return none;
    if (c.hosts && !c.self && c.hosts.length && !c.hosts.includes(H)) return none;
    c.popups = (c.popups || []).filter(z => !(z.sites || []).length || z.sites.map(hn).includes(H));
    if (c.chat && (c.chat.sites || []).length && !c.chat.sites.map(hn).includes(H)) c.chat = null;
    if (c.sh) { const ch = []; for (const b of [bkt(np(L.pathname)), 'w']) { try { const j = await fetch(sq.origin + '/c/' + site + '/' + b + '.json').then(r => r.json()); ch.push(...(j.changes || [])) } catch (e) {} } c.changes = ch }
    return c }).catch(() => ({ popups: [], changes: [] }));
  const spa = c => {
    if (edge) return;
    let last = L.pathname, want = ((c.changes || []).find(z => z.type == 'Title') || {}).value || '', fights = 0; want = String(want);
    const pick = () => STAT ? statCfg().then(fixc).then(x => x.changes || []) : c.big ? fetch(o + 'cfg.json?site=' + site + '&h=' + encodeURIComponent(L.hostname) + '&path=' + encodeURIComponent(L.pathname)).then(r => r.json()).then(j => j.changes || []).catch(() => []) : Promise.resolve((c.allCh || []).filter(z => pmx(z.page, L.pathname) && (!z.h || hn(z.h) == hn(L.hostname))));
    const use = ch => { const t = ch.find(z => z.type == 'Title'); want = t ? String(t.value) : ''; ap({ changes: ch }) };
    const run = () => pick().then(use).catch(() => {});
    const nav = () => { if (L.pathname == last) return; last = L.pathname; fights = 0; want = ''; d.querySelectorAll('[data-rp-block],script[data-rp-ld]').forEach(n => n.remove()); setTimeout(run, 400); setTimeout(run, 1500) };
    try { ['pushState', 'replaceState'].forEach(k => { const f = history[k]; if (typeof f == 'function') history[k] = function () { const r = f.apply(this, arguments); setTimeout(nav, 0); return r } }) } catch (e) {}
    addEventListener('popstate', () => setTimeout(nav, 0));
    setTimeout(() => use(c.changes || []), 1500);
    try { const t = d.querySelector('title'); if (t && window.MutationObserver) new MutationObserver(() => { if (want && d.title != want && fights++ < 6) setTimeout(() => { if (want) d.title = want }, 50) }).observe(t, { childList: true, characterData: true, subtree: true }) } catch (e) {}
  };
  (STAT ? statCfg() : fetch(o + 'cfg.json?site=' + site + '&h=' + encodeURIComponent(L.hostname) + '&all=1').then(r => r.json())).then(fixc).then(c => {
    try { if (!STAT && !sessionStorage.getItem('rp_pg')) { sessionStorage.setItem('rp_pg', 1); navigator.sendBeacon(o + 'ping?site=' + site + '&h=' + encodeURIComponent(L.hostname) + '&k=snippet') } } catch (e) {}
    if (STAT && c.sb && /^https:\/\//.test(c.sb.u || '') && c.sb.k) SBX = { u: String(c.sb.u).replace(/\/+$/, ''), k: c.sb.k };
    if (DBG) console.info('[ASAP-Rank] site=' + site + ' path=' + L.pathname + ' changes=' + (c.changes || []).length + ' popups=' + (c.popups || []).length + ' edge=' + edge + ' chat=' + !!(c.chat && c.chat.on));
    ap(c); spa(c); chatLoad(c); ga(c); const g = () => (c.popups || []).filter(r => r.on).forEach(arm);
    'requestIdleCallback' in window ? requestIdleCallback(g) : setTimeout(g, 1500);
  }).catch(e => { if (DBG) console.warn('[ASAP-Rank] could not load config', e) });
})()