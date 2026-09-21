/* ================================================================
   نواة الإضافات — طرق جديدة، وموضعٌ لا يضيع، وسهما الشريط السفلي
   ================================================================ */
const MH = { routes: [], after: [], lastHash: null, iconsX: {} };

/* صفحة جديدة: test(h) يقرّر، و view(h) يبني، و after(h) يربط الأحداث بعد الرسم */
function mhRoute(test, view, after) { MH.routes.push({ test, view, after }); }
function featRoute(h) {
  for (const r of MH.routes) { try { if (r.test(h)) return r.view(h); } catch (e) { console.error(e); return `<div class="empty">تعذّر فتح الصفحة.</div>`; } }
  return null;
}
function mhAfter(fn) { MH.after.push(fn); }

/* أيقونات إضافية */
const MHI = {
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  aa: '<svg viewBox="0 0 24 24"><path d="M3 19 8 5l5 14M4.8 14h6.4"/><path d="M14.5 19l3-8 3 8M15.4 16.6h4.2"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  crop: '<svg viewBox="0 0 24 24"><path d="M6 2v16h16"/><path d="M2 6h16v16"/></svg>',
  dict: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/></svg>',
  book2: '<svg viewBox="0 0 24 24"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/></svg>',
  pages: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  sort: '<svg viewBox="0 0 24 24"><path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/></svg>',
  id: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.4"/><path d="M5.5 16c.8-1.8 2-2.6 3.5-2.6s2.7.8 3.5 2.6M14 10h4M14 13h3"/></svg>',
  headph: '<svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="14" width="4" height="6" rx="1.5"/><rect x="18" y="14" width="4" height="6" rx="1.5"/></svg>',
  wall: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M9 4v5M15 9v5M9 14v6"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/></svg>',
  wave: '<svg viewBox="0 0 24 24"><path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2"/></svg>',
  flip: '<svg viewBox="0 0 24 24"><path d="M12 4v16"/><path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1"/><path d="M12 5c3-2 6-2 9-1v15c-3-1-6-1-9 1"/></svg>',
  scroll: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M12 7v10M9 14l3 3 3-3"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-6-6l-1 1"/><path d="M14 11a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 6 6l1-1"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
};

/* ---------- كل الطرق الجديدة تُضيء أصلها في الشريط ---------- */
const _mhNavKey = navKey;
navKey = function (h) {
  if (/^#\/(qari|audio|adhkar)/.test(h)) return '#/lib';
  if (/^#\/wall/.test(h)) return '#/quotes';
  if (/^#\/vault/.test(h)) return '#/boh';
  if (/^#\/dict/.test(h)) return '#/notes';
  return _mhNavKey(h);
};

/* ---------- الرسم: لا يرميك إلى الأعلى، ولا يضيّع صفحتك في الملف ---------- */
const _mhRender = render;
render = function () {
  const h = location.hash || '#/';
  const same = h === MH.lastHash;
  const y = window.scrollY;
  try { const box = document.getElementById('pdfbox'); if (box && box.__pdf) savePdfNow(box); } catch (e) {}
  _mhRender.apply(this, arguments);
  MH.lastHash = h;
  if (same && y > 0) { scrollTo({ top: y }); requestAnimationFrame(() => scrollTo({ top: y })); }
  MH.routes.forEach(r => { try { if (r.after && r.test(h)) r.after(h); } catch (e) { console.error(e); } });
  MH.after.forEach(f => { try { f(h); } catch (e) { console.error(e); } });
  try { mhTabArrows(); } catch (e) {}
};

/* ---------- العودة إلى حيث كنت: الموضع يُحفظ في الحال، والصفحة تُفتح وحدها ---------- */
function mhSaveNow() {
  try { const box = document.getElementById('pdfbox'); if (box && box.__pdf) savePdfNow(box); } catch (e) {}
  try {
    const h = location.hash || '#/';
    S.set('lastRoute', { h, t: Date.now(), rd: !!(typeof RD !== 'undefined' && RD.on), y: window.scrollY });
  } catch (e) {}
}
addEventListener('hashchange', () => setTimeout(mhSaveNow, 50));
addEventListener('pagehide', mhSaveNow);
let mhHiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { mhHiddenAt = Date.now(); mhSaveNow(); return; }
  /* بعد غياب: الهاتف قد يمسح رسم الصفحات من الذاكرة فتبدو بيضاء — نعيد رسمها في موضعها */
  if (mhHiddenAt && Date.now() - mhHiddenAt > 15000) {
    const box = document.getElementById('pdfbox');
    if (box && box.__pdf) { try { savePdfNow(box); layoutPdf(box, { restore: true }); } catch (e) {} }
  }
  mhHiddenAt = 0;
});
/* قبل أوّل رسم: إن كنت داخل ملفّ أو دفتر حين خرجت، نعيدك إليه */
(function mhResume() {
  try {
    if (!S.get('autoResume', true)) return;
    const cur = location.hash || '';
    if (cur && cur !== '#/' && cur !== '#') return;
    const L = S.get('lastRoute', null);
    if (!L || !L.h || Date.now() - L.t > 3 * 86400000) return;
    if (!/^#\/(i|nb|s|qari|adhkar|audio|wall|dict)\//.test(L.h) && !/^#\/(qari|adhkar|audio|wall|dict)$/.test(L.h)) return;
    const m = /^#\/i\/(.+)$/.exec(L.h);
    if (m && !findItem(m[1])) return;
    history.replaceState(null, '', L.h);
    if (L.rd) MH.resumeReading = true;
    if (L.y) MH.resumeY = L.y;
  } catch (e) {}
})();
mhAfter(h => {
  if (MH.resumeY && !/^#\/i\//.test(h)) { const y = MH.resumeY; MH.resumeY = 0; setTimeout(() => scrollTo({ top: y }), 60); }
  if (MH.resumeReading && /^#\/i\//.test(h)) {
    MH.resumeReading = false;
    const tryEnter = (n) => {
      const box = document.getElementById('pdfbox');
      if (box && box.__pdf) { try { rdEnter(box); } catch (e) {} return; }
      if (n < 40) setTimeout(() => tryEnter(n + 1), 150);
    };
    tryEnter(0);
  }
});

/* ---------- استعادة موضع الملف: نثبّته حتى تستقرّ الصفحات تحته ---------- */
restorePdf = function (box) {
  const sv = ppos[box.dataset.item]; if (!sv || sv.p < 1) return;
  const want = () => {
    const h = box.querySelector(`.pg[data-p="${sv.p}"]`); if (!h) return null;
    return Math.max(0, h.offsetTop + (sv.o || 0) * h.offsetHeight - 8);
  };
  const t0 = want(); if (t0 == null) return;
  box.scrollTop = t0;
  let n = 0, user = false;
  const stop = () => { user = true; };
  box.addEventListener('wheel', stop, { once: true, passive: true });
  box.addEventListener('touchstart', stop, { once: true, passive: true });
  box.addEventListener('pointerdown', stop, { once: true, passive: true });
  const pin = () => {
    if (user || !box.isConnected) return;
    const w = want(); if (w != null && Math.abs(box.scrollTop - w) > 2) box.scrollTop = w;
    if (++n < 18) setTimeout(pin, 120);
  };
  setTimeout(pin, 120);
  if (sv.p > 1) {
    const tip = document.createElement('div'); tip.className = 'resume';
    tip.textContent = 'تابعت من صفحة ' + AR(sv.p); box.prepend(tip);
    setTimeout(() => tip.classList.add('fade'), 2600); setTimeout(() => tip.remove(), 3300);
  }
};

/* ---------- سهما الشريط السفلي: يسارًا لما بقي، ويمينًا لما فات ---------- */
function mhTabArrows() {
  const tb = document.getElementById('tabbar'); if (!tb) return;
  let L = document.getElementById('tbL'), R = document.getElementById('tbR');
  if (!L) {
    L = document.createElement('button'); L.id = 'tbL'; L.className = 'tbarrow l'; L.setAttribute('aria-label', 'بقيّة الأقسام');
    L.innerHTML = MHI.next;
    R = document.createElement('button'); R.id = 'tbR'; R.className = 'tbarrow r'; R.setAttribute('aria-label', 'رجوع إلى أوّل الأقسام');
    R.innerHTML = MHI.prev;
    document.body.append(L, R);
    L.onclick = () => tb.scrollBy({ left: -tb.clientWidth * 0.75, behavior: 'smooth' });
    R.onclick = () => tb.scrollBy({ left: tb.clientWidth * 0.75, behavior: 'smooth' });
    tb.addEventListener('scroll', mhTabArrowsSync, { passive: true });
    addEventListener('resize', mhTabArrowsSync);
  }
  mhTabArrowsSync();
}
function mhTabArrowsSync() {
  const tb = document.getElementById('tabbar'), L = document.getElementById('tbL'), R = document.getElementById('tbR');
  if (!tb || !L) return;
  const shown = getComputedStyle(tb).display !== 'none' && tb.offsetParent !== null;
  const over = tb.scrollWidth - tb.clientWidth > 8;
  const x = Math.abs(tb.scrollLeft);
  const atStart = x < 6, atEnd = x + tb.clientWidth >= tb.scrollWidth - 6;
  L.classList.toggle('on', shown && over && !atEnd);
  R.classList.toggle('on', shown && over && !atStart);
}

/* ---------- أدوات صغيرة مشتركة ---------- */
function mhSheetFull(html, wire) {           /* ورقة تملأ الشاشة */
  const el = sheet(html, wire);
  el.classList.add('full');
  return el;
}
function mhFmtTime(s) { s = Math.max(0, Math.round(s || 0)); const m = Math.floor(s / 60), x = s % 60; return AR(m) + ':' + AR(String(x).padStart(2, '0')); }
function mhCopy(txt, msg) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
    .then(() => toast(msg || 'نُسخ'), () => {
      const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); toast(msg || 'نُسخ'); } catch (e) { toast('تعذّر النسخ'); } t.remove();
    });
}
function mhPickFile(accept, multiple) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; if (accept) i.accept = accept; if (multiple) i.multiple = true;
    i.onchange = () => res(multiple ? [...i.files] : (i.files[0] || null));
    i.click();
  });
}
/* أضف عنصرًا إلى قسمٍ بعينه (ينشئ القسم إن لم يوجد) */
function mhSecEnsure(id, name, extra) {
  let s = tree.find(x => x.id === id);
  if (!s) { s = Object.assign({ id, name, items: [], subs: [] }, extra || {}); tree.push(s); saveTree(); }
  return s;
}
/* اختيار مقرَّر من المكتبة */
function mhPickItem(title, filter, done) {
  const list = allItems().filter(r => !filter || filter(r.it));
  sheet(`<h3>${esc(title)}</h3>
    ${list.length ? `<div class="sbox"><input type="text" id="mhpq" placeholder="ابحث…">${ICON.search}</div>
    <div class="rows mhpick" style="display:flex;flex-direction:column;gap:6px;max-height:52vh;overflow:auto">
      ${list.map(r => `<button class="row mhpr" data-mhpi="${r.it.id}" data-q="${esc(norm((r.it.name || '') + ' ' + r.sec.name))}">
        <span class="badge b-${r.it.type}">${(TYPES[r.it.type] || TYPES.text).ic}</span>
        <span class="rmeta"><b>${esc(r.it.name)}</b><span class="s"><span>${esc(r.sec.name)}</span></span></span></button>`).join('')}
    </div>` : '<p class="mkempty">لا شيء في مكتبتك يناسب هذا بعد.</p>'}
    <div class="sheetrow"><button class="btn" onclick="closeSheet()">إغلاق</button></div>`, el => {
    const q = el.querySelector('#mhpq');
    if (q) q.oninput = () => { const v = norm(q.value.trim());
      el.querySelectorAll('.mhpr').forEach(b => b.style.display = !v || b.dataset.q.includes(v) ? '' : 'none'); };
    el.addEventListener('click', ev => { const b = ev.target.closest('[data-mhpi]'); if (!b) return; closeSheet(); done(b.dataset.mhpi); });
  });
}
