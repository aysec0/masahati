/* ================================================================
   القراءة: نصّ PDF قابل للتحديد والنسخ والتظليل، وتقليب الصفحات،
   ولقطة شاشة لجزءٍ تحدّده، والقفز الدقيق إلى موضع التظليل.
   ================================================================ */

/* ---------- طبقة النصّ فوق كل صفحة (للملفات النصّية لا المصوّرة) ---------- */
function mhNormAr(s) {
  return (s || '').normalize('NFKC').replace(/­/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .replace(/(\S)-\n(\S)/g, '$1$2').trim();
}
async function mhTextLayer(layer) {
  try {
    if (S.get('pdfText', true) === false || !window.pdfjsLib || !pdfjsLib.renderTextLayer) return;
    const pg = layer.parentElement, box = pg && pg.closest('.pdfbox'); if (!box || !box.__pdf) return;
    if (pg.querySelector('.textLayer')) return;
    const page = await box.__pdf.getPage(+pg.dataset.p);
    const base = page.getViewport({ scale: 1 }), cw = pg.clientWidth || 600, scale = cw / base.width;
    const vp = page.getViewport({ scale });
    const tc = await page.getTextContent();
    if (!tc.items.some(x => (x.str || '').trim())) { pg.dataset.notext = '1'; return; }
    if (!pg.isConnected || pg.querySelector('.textLayer')) return;
    const div = document.createElement('div'); div.className = 'textLayer';
    div.style.setProperty('--scale-factor', scale);
    layer.before(div);
    await pdfjsLib.renderTextLayer({ textContentSource: tc, container: div, viewport: vp, textDivs: [] }).promise;
    const end = document.createElement('div'); end.className = 'endOfContent'; div.appendChild(end);
    box.dataset.hastext = '1';
  } catch (e) {}
}
new MutationObserver(muts => {
  for (const m of muts) for (const n of m.addedNodes)
    if (n.nodeType === 1 && n.classList && n.classList.contains('hlayer')) mhTextLayer(n);
}).observe(document.documentElement, { childList: true, subtree: true });

/* تظليلٌ متعدّد الأسطر: كل تظليل قد يحمل عدّة مستطيلات */
paintRects = function (layer, key, page) {
  layer.querySelectorAll('.hrect').forEach(e => e.remove());
  hlOf(key).filter(h => h.t === 'pdf' && h.p === page).forEach(h => {
    (h.rects && h.rects.length ? h.rects : [h]).forEach(r => {
      const d = document.createElement('div'); d.className = 'hrect' + (h.n ? ' has' : '') + (h.rects ? ' tx' : '');
      d.dataset.hid = h.id; d.dataset.lp = 'hrect';
      d.style.cssText = `left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%;background:color-mix(in srgb,${HCOL[h.c] || HCOL.y} 60%,transparent)`;
      layer.appendChild(d);
    });
  });
};

/* ---------- أداة التحديد: نسخ · تظليل · معجم · فائدة ---------- */
let mhSelT = null;
function mhSelHide() { const t = document.getElementById('mhSel'); if (t) t.remove(); }
function mhSelShow() {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) { mhSelHide(); return; }
  const r = sel.getRangeAt(0);
  const tl = (r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement);
  if (!tl || !tl.closest('.textLayer, .pg')) { mhSelHide(); return; }
  const txt = mhNormAr(sel.toString()); if (!txt) { mhSelHide(); return; }
  const rects = [...r.getClientRects()].filter(x => x.width > 1); if (!rects.length) return;
  const last = rects[rects.length - 1], first = rects[0];
  let t = document.getElementById('mhSel');
  if (!t) { t = document.createElement('div'); t.id = 'mhSel'; t.className = 'mhsel'; document.body.appendChild(t); }
  t.innerHTML = `<button data-ms="copy">${MHI.copy}<span>نسخ</span></button>
    ${Object.keys(HCOL).map(k => `<button class="sw" data-ms="hl" data-c="${k}" style="background:${HCOL[k]}" title="ظلّل"></button>`).join('')}
    <button data-ms="dict">${MHI.dict}<span>معجمي</span></button>
    <button data-ms="note">${ICON.pen}<span>فائدة</span></button>`;
  const top = first.top - 52, y = top < 60 ? last.bottom + 10 : top;
  t.style.top = Math.max(8, Math.min(innerHeight - 60, y)) + 'px';
  t.style.left = Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, (first.left + last.right) / 2 - t.offsetWidth / 2)) + 'px';
  t.__range = r.cloneRange(); t.__txt = txt;
}
document.addEventListener('selectionchange', () => { clearTimeout(mhSelT); mhSelT = setTimeout(mhSelShow, 260); });
document.addEventListener('pointerdown', ev => {
  const b = ev.target.closest('#mhSel button'); if (!b) return;
  ev.preventDefault();
  const t = document.getElementById('mhSel'), k = b.dataset.ms, txt = t.__txt, range = t.__range;
  const box = document.getElementById('pdfbox'), id = box && box.dataset.item;
  if (k === 'copy') { mhCopy(txt, 'نُسخ النصّ'); getSelection().removeAllRanges(); mhSelHide(); return; }
  if (k === 'dict') { getSelection().removeAllRanges(); mhSelHide(); mhDictAdd({ w: txt.slice(0, 80), item: id, p: box ? pageAtTop(box) : null }); return; }
  if (k === 'hl' || k === 'note') {
    if (!id) return;
    const made = mhHlFromRange(id, range, txt, k === 'hl' ? b.dataset.c : curColor);
    getSelection().removeAllRanges(); mhSelHide();
    if (made && k === 'note') openHl(id, made.id);
    else if (made) toast('ظُلّل — اضغطه لتكتب فائدة');
  }
}, true);
function mhHlFromRange(id, range, txt, c) {
  const byPage = {};
  [...range.getClientRects()].filter(x => x.width > 1 && x.height > 1).forEach(rc => {
    const cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
    const pg = [...document.querySelectorAll('#pdfbox .pg')].find(p => { const b = p.getBoundingClientRect(); return cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom; });
    if (!pg) return;
    const b = pg.getBoundingClientRect();
    (byPage[pg.dataset.p] = byPage[pg.dataset.p] || []).push({ x: (rc.left - b.left) / b.width, y: (rc.top - b.top) / b.height, w: rc.width / b.width, h: rc.height / b.height });
  });
  let first = null;
  Object.keys(byPage).forEach(p => {
    /* ضمّ مستطيلات السطر الواحد */
    const rs = byPage[p].sort((a, b) => a.y - b.y || a.x - b.x), lines = [];
    rs.forEach(r => { const L = lines.find(l => Math.abs(l.y - r.y) < 0.006 && Math.abs(l.h - r.h) < 0.012);
      if (L) { const x2 = Math.max(L.x + L.w, r.x + r.w); L.x = Math.min(L.x, r.x); L.w = x2 - L.x; } else lines.push(Object.assign({}, r)); });
    lines.forEach(l => { l.y -= l.h * 0.12; l.h *= 1.24; });
    const x = Math.min(...lines.map(l => l.x)), y = Math.min(...lines.map(l => l.y));
    const w = Math.max(...lines.map(l => l.x + l.w)) - x, h = Math.max(...lines.map(l => l.y + l.h)) - y;
    const hl = addHl(id, { t: 'pdf', p: +p, x, y, w, h, rects: lines, txt: first ? '' : txt, c, at: Date.now() });
    if (!first) first = hl;
    const layer = document.querySelector(`#pdfbox .hlayer[data-p="${p}"]`); if (layer) paintRects(layer, id, +p);
  });
  if (first) { try { touchNote && touchNote(id); } catch (e) {} }
  return first;
}

/* ---------- القفز الدقيق إلى موضع ---------- */
function mhJumpTo(id, p, y, hid) {
  if (!findItem(id)) { toast('المقرَّر غير موجود'); return; }
  MH.jump = { id, p: +p || 1, y: +y || 0, hid };
  closeSheet();
  if (location.hash !== '#/i/' + id) location.hash = '#/i/' + id; else mhDoJump();
}
mhAfter(h => { if (MH.jump && h === '#/i/' + MH.jump.id) mhDoJump(); });
function mhDoJump() {
  const J = MH.jump; if (!J) return; let n = 0;
  const tick = () => {
    const box = document.getElementById('pdfbox');
    if (box && box.__pdf) { MH.jump = null; box.scrollIntoView({ block: 'start', behavior: 'smooth' }); mhGotoY(box, J.p, J.y, J.hid); return; }
    const mk = J.hid && document.querySelector(`mark.hl[data-hid="${J.hid}"]`);
    if (mk) { MH.jump = null; mk.scrollIntoView({ block: 'center', behavior: 'smooth' }); mk.classList.add('mhflash'); setTimeout(() => mk.classList.remove('mhflash'), 2600); return; }
    if (++n < 80) setTimeout(tick, 150); else MH.jump = null;
  };
  tick();
}
function mhGotoY(box, p, y, hid) {
  if (box.classList.contains('paged')) { gotoPage(box, p); setTimeout(() => mhFlashHl(box, p, hid), 700); return; }
  box.__want = null; let n = 0;
  const want = () => { const el = box.querySelector(`.pg[data-p="${p}"]`); if (!el) return null;
    return Math.max(0, el.offsetTop + (y || 0) * el.offsetHeight - box.clientHeight * 0.3); };
  const pin = () => {
    if (!box.isConnected) return;
    const w = want(); if (w != null && Math.abs(box.scrollTop - w) > 2) box.scrollTop = w;
    if (++n < 24) setTimeout(pin, 110); else { showPg(box); mhFlashHl(box, p, hid); }
  };
  pin();
}
function mhFlashHl(box, p, hid, n) {
  const rs = hid ? box.querySelectorAll(`.hrect[data-hid="${hid}"]`) : [];
  if (!rs.length) { if (hid && (n | 0) < 20) setTimeout(() => mhFlashHl(box, p, hid, (n | 0) + 1), 200); return; }
  rs.forEach(r => { r.classList.add('mhflash'); setTimeout(() => r.classList.remove('mhflash'), 2800); });
}
/* نافذة التظليل: زرٌّ يأخذك إلى موضعه بالضبط */
const _mhOpenHl = openHl;
openHl = function (key, hid) {
  _mhOpenHl.apply(this, arguments);
  const h = findHl(key, hid), card = document.querySelector('.sheet .sheetcard'); if (!h || !card) return;
  const id = String(key).split(':')[0];
  const onIt = location.hash === '#/i/' + id;
  if (onIt && h.t !== 'pdf') return;
  const d = document.createElement('div'); d.className = 'mhgoto';
  d.innerHTML = `<button class="btn pri" data-mhgo="1">${ICON.ext} ${h.t === 'pdf' ? 'اذهب إلى موضع التظليل — صفحة ' + AR(h.p) : 'اذهب إلى موضعه في المقرَّر'}</button>`;
  card.querySelector('h3').after(d);
  d.querySelector('button').onclick = () => mhJumpTo(id, h.p, h.y, h.id);
};
/* في فوائدي: رقم الصفحة زرٌّ مباشر */
const _mhHlCard = hlCard;
hlCard = function (m) {
  let html = _mhHlCard.apply(this, arguments);
  if (m.h && m.h.t === 'pdf' && m.h.p) {
    const id = String(m.key).split(':')[0];
    html = html.replace(/<\/div><\/div>$/, `<button class="nbref mhpgo" data-mhj="${id}|${m.h.p}|${m.h.y || 0}|${m.h.id}" title="اذهب إلى الموضع">صفحة ${AR(m.h.p)} ↗</button></div></div>`);
  }
  return html;
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-mhj]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const [id, p, y, hid] = b.dataset.mhj.split('|'); mhJumpTo(id, +p, +y, hid);
}, true);

/* ================================================================
   القراءة بالتقليب: صفحةٌ تملأ الشاشة وتُقلَّب بالسحب يمينًا ويسارًا
   ================================================================ */
function mhPagedOn() { return S.get('rdMode', 'scroll') === 'flip'; }
function mhRtl(box) { return getComputedStyle(box).direction === 'rtl' ? -1 : 1; }
function mhPagedify(box) {
  if (!box.__pdf) return;
  box.classList.add('paged');
  const fit = () => {
    const bw = box.clientWidth, bh = box.clientHeight;
    box.querySelectorAll('.pg').forEach(pg => {
      const m = /([\d.]+)\s*\/\s*([\d.]+)/.exec(pg.style.aspectRatio || ''), r = m ? (+m[1] / +m[2]) : 0.707;
      let W = bw - 12, H = W / r; if (H > bh - 12) { H = bh - 12; W = H * r; }
      pg.style.width = W + 'px'; pg.style.height = H + 'px';
    });
  };
  [...box.children].forEach(ch => { if (ch.classList.contains('pg')) { const s = document.createElement('div'); s.className = 'pgslot'; ch.before(s); s.appendChild(ch); } });
  fit();
  box.__fit = fit;
}
const _mhLayout = layoutPdf;
layoutPdf = function (box, opt) {
  box.classList.remove('paged');
  _mhLayout.apply(this, arguments);
  if (mhPagedOn() && box.classList.contains('full')) {
    const keep = (opt && opt.keep) ? (box.__lastP || 1) : ((ppos[box.dataset.item] || {}).p || 1);
    mhPagedify(box);
    requestAnimationFrame(() => { box.scrollLeft = mhRtl(box) * (keep - 1) * box.clientWidth; showPg(box); });
  }
};
const _mhPageAtTop = pageAtTop;
pageAtTop = function (box) {
  if (box && box.classList.contains('paged') && box.__pdf) {
    const p = Math.round(Math.abs(box.scrollLeft) / Math.max(1, box.clientWidth)) + 1;
    return box.__lastP = Math.max(1, Math.min(box.__pdf.numPages, p));
  }
  const p = _mhPageAtTop(box); if (box) box.__lastP = p; return p;
};
const _mhGoto = gotoPage;
gotoPage = function (box, p, quiet) {
  if (box && box.classList.contains('paged') && box.__pdf) {
    p = Math.max(1, Math.min(box.__pdf.numPages, Math.round(p) || 1));
    box.scrollTo({ left: mhRtl(box) * (p - 1) * box.clientWidth, behavior: 'smooth' });
    setTimeout(() => showPg(box), 350); return;
  }
  return _mhGoto.apply(this, arguments);
};
addEventListener('resize', () => { const box = document.getElementById('pdfbox');
  if (box && box.classList.contains('paged') && box.__fit) { const p = pageAtTop(box); box.__fit(); box.scrollLeft = mhRtl(box) * (p - 1) * box.clientWidth; } });
/* ضغطة على طرف الصفحة تقلّبها، والوسط يُظهر الأدوات */
document.addEventListener('click', ev => {
  const box = ev.target.closest('.pdfbox.paged'); if (!box || drawOn) return;
  if (ev.target.closest('.hrect,.textLayer span,.rdtop,.rdbot')) return;
  const x = ev.clientX / innerWidth;
  if (x < 0.22) { ev.stopImmediatePropagation(); gotoPage(box, pageAtTop(box) + 1); }
  else if (x > 0.78) { ev.stopImmediatePropagation(); gotoPage(box, pageAtTop(box) - 1); }
}, true);
addEventListener('keydown', ev => {
  const box = document.querySelector('.pdfbox.paged'); if (!box || ev.target.closest('input,textarea,[contenteditable="true"]')) return;
  if (ev.key === 'ArrowLeft' || ev.key === 'PageDown' || ev.key === ' ') { ev.preventDefault(); gotoPage(box, pageAtTop(box) + 1); }
  if (ev.key === 'ArrowRight' || ev.key === 'PageUp') { ev.preventDefault(); gotoPage(box, pageAtTop(box) - 1); }
});
function mhSetRdMode(m) {
  S.set('rdMode', m);
  const box = document.getElementById('pdfbox');
  if (box && box.__pdf) { box.__lastP = pageAtTop(box); savePdfNow(box); layoutPdf(box, { keep: true }); }
  try { rdBars(); } catch (e) {}
  rdTip(m === 'flip' ? 'تقليب: اسحب يمينًا ويسارًا' : 'تمرير متواصل');
}

/* ================================================================
   لقطة شاشة: حدّد جزءًا من الصفحة فيُحفظ في هاتفك وفي دفتر المقرَّر
   ================================================================ */
function mhShot(box) {
  box = box || document.getElementById('pdfbox'); if (!box || !box.__pdf) { toast('افتح ملفًّا أوّلًا'); return; }
  const ov = document.createElement('div'); ov.className = 'mhcrop';
  ov.innerHTML = `<div class="mhcropbar"><b>${MHI.crop} اسحب لتحديد الجزء</b><span style="flex:1"></span>
    <button class="btn sm" data-cr="page">الصفحة كلّها</button><button class="btn sm" data-cr="x">إلغاء</button></div>
    <div class="mhcroprect" hidden></div>
    <div class="mhcropok" hidden><button class="btn pri" data-cr="take">${MHI.cam} التقط</button><button class="btn" data-cr="redo">أعد التحديد</button></div>`;
  document.body.appendChild(ov);
  const R = ov.querySelector('.mhcroprect'), ok = ov.querySelector('.mhcropok');
  let a = null, sel = null;
  ov.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    a = { x: e.clientX, y: e.clientY }; R.hidden = false; ok.hidden = true; sel = null;
    Object.assign(R.style, { left: a.x + 'px', top: a.y + 'px', width: 0, height: 0 });
    try { ov.setPointerCapture(e.pointerId); } catch (x) {}
  });
  ov.addEventListener('pointermove', e => {
    if (!a) return;
    const x = Math.min(a.x, e.clientX), y = Math.min(a.y, e.clientY), w = Math.abs(e.clientX - a.x), h = Math.abs(e.clientY - a.y);
    Object.assign(R.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); sel = { x, y, w, h };
  });
  ov.addEventListener('pointerup', () => {
    if (!a) return; a = null;
    if (!sel || sel.w < 14 || sel.h < 14) { R.hidden = true; return; }
    ok.hidden = false; ok.style.top = Math.min(innerHeight - 60, sel.y + sel.h + 10) + 'px';
  });
  ov.addEventListener('click', async e => {
    const b = e.target.closest('[data-cr]'); if (!b) return;
    const k = b.dataset.cr;
    if (k === 'x') { ov.remove(); return; }
    if (k === 'redo') { R.hidden = true; ok.hidden = true; sel = null; return; }
    let pg, crop;
    if (k === 'page') { const p = pageAtTop(box); pg = box.querySelector(`.pg[data-p="${p}"]`); crop = null; }
    else { if (!sel) return;
      const cx = sel.x + sel.w / 2, cy = sel.y + sel.h / 2;
      pg = [...box.querySelectorAll('.pg')].find(p => { const r = p.getBoundingClientRect(); return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom; });
      crop = sel; }
    ov.remove();
    if (!pg || !pg.querySelector('canvas')) { toast('لم أجد صفحةً تحت التحديد'); return; }
    await mhShotSave(box.dataset.item, pg, crop);
  });
}
async function mhShotSave(id, pg, crop) {
  const cv = pg.querySelector('canvas'), r = pg.getBoundingClientRect();
  const sx = cv.width / r.width, sy = cv.height / r.height;
  let x = 0, y = 0, w = cv.width, h = cv.height;
  if (crop) { const L = Math.max(crop.x, r.left), T = Math.max(crop.y, r.top), Rr = Math.min(crop.x + crop.w, r.right), B = Math.min(crop.y + crop.h, r.bottom);
    x = Math.round((L - r.left) * sx); y = Math.round((T - r.top) * sy); w = Math.max(1, Math.round((Rr - L) * sx)); h = Math.max(1, Math.round((B - T) * sy)); }
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(cv, x, y, w, h, 0, 0, w, h);
  const blob = await new Promise(res => out.toBlob(res, 'image/png'));
  const p = +pg.dataset.p, it = (findItem(id) || {}).it || { name: 'لقطة' };
  const key = uid('shot'); await putFile(key, blob);
  nbAdd(id, { ttl: 'لقطة من صفحة ' + AR(p), p, img: key, k: 'shot', h: '' });
  toast('حُفظت في دفتر المقرَّر ← لقطات الشاشة');
  saveBlob(blob, (it.name || 'لقطة') + ' - صفحة ' + p + '.png', true);
}
/* لقطة من فيديو محلّيّ */
async function mhVideoShot(v, id) {
  try {
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    const key = uid('shot'); await putFile(key, blob);
    nbAdd(id, { ttl: 'لقطة عند ' + arTime(v.currentTime), t: Math.round(v.currentTime), img: key, k: 'shot', h: '' });
    saveBlob(blob, 'لقطة ' + mmss(v.currentTime).replace(/:/g, '-') + '.png', true);
    toast('حُفظت في دفتر المقرَّر');
  } catch (e) { toast('تعذّرت اللقطة — الفيديو من موقع آخر يمنعها'); }
}

/* ---------- أزرار القراءة ---------- */
const _mhRdBars = rdBars;
rdBars = function () {
  _mhRdBars.apply(this, arguments);
  const top = document.getElementById('rdTop'); if (!top) return;
  const more = top.querySelector('[data-rd="more"]');
  const b = document.createElement('button'); b.className = 'rb'; b.dataset.mhrd = 'shot'; b.title = 'لقطة شاشة'; b.innerHTML = MHI.cam;
  if (more) more.before(b);
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-mhrd]'); if (!b) return;
  const k = b.dataset.mhrd;
  if (k === 'shot') mhShot();
});
const _mhRdMore = rdMore;
rdMore = function () {
  _mhRdMore.apply(this, arguments);
  const rows = document.querySelector('.sheet .sheetcard .rows'); if (!rows) return;
  const box = document.getElementById('pdfbox');
  const flip = mhPagedOn();
  const d = document.createElement('div');
  d.innerHTML = `<button class="tile" data-rdx="mode"><div class="ic">${flip ? MHI.scroll : MHI.flip}</div>
      <div><b>${flip ? 'قراءة بالتمرير المتواصل' : 'قراءة بالتقليب'}</b><small>${flip ? 'انزل واطلع بلا انقطاع' : 'صفحةٌ تملأ الشاشة، واسحب يمينًا ويسارًا'}</small></div></button>
    <button class="tile" data-rdx="shot"><div class="ic">${MHI.cam}</div><div><b>لقطة شاشة</b><small>حدّد جزءًا فيُحفظ في هاتفك ودفتر المقرَّر</small></div></button>
    <button class="tile" data-rdx="dict"><div class="ic">${MHI.dict}</div><div><b>أضف كلمة إلى معجمي</b><small>الكلمة ومعناها — تجدها في فوائدي</small></div></button>
    ${box && box.dataset.hastext ? `<button class="tile" data-rdx="copy"><div class="ic">${MHI.copy}</div><div><b>انسخ نصّ هذه الصفحة</b><small>أو حدّد جزءًا بالضغط المطوّل</small></div></button>` : ''}`;
  [...d.children].reverse().forEach(x => rows.prepend(x));
  rows.addEventListener('click', async ev => {
    const x = ev.target.closest('[data-rdx]'); if (!x) return;
    closeSheet();
    const k = x.dataset.rdx;
    if (k === 'mode') mhSetRdMode(flip ? 'scroll' : 'flip');
    else if (k === 'shot') mhShot();
    else if (k === 'dict') mhDictAdd({ item: box && box.dataset.item, p: box ? pageAtTop(box) : null });
    else if (k === 'copy' && box) { const pg = await box.__pdf.getPage(pageAtTop(box)); const tc = await pg.getTextContent();
      mhCopy(mhNormAr(tc.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join('')), 'نُسخ نصّ الصفحة'); }
  });
};
/* في صفحة الملفّ نفسها: لقطة ومعجم بجانب أدوات الصفحة */
mhAfter(h => {
  if (!/^#\/i\//.test(h)) return;
  const nav = document.querySelector('.pdfnav');
  if (nav && !nav.querySelector('[data-mhnav]')) {
    const s = document.createElement('span'); s.className = 'mhbar'; s.dataset.mhnav = '1';
    s.innerHTML = `<button class="mhico" data-mhnav="shot" title="لقطة شاشة">${MHI.cam}</button>
      <button class="mhico" data-mhnav="dict" title="أضف كلمة إلى معجمي">${MHI.dict}</button>`;
    nav.appendChild(s);
  }
  const vt = document.getElementById('vTools');
  if (vt && !vt.querySelector('[data-mhnav]')) {
    const b = document.createElement('button'); b.className = 'chip'; b.dataset.mhnav = 'vshot'; b.innerHTML = MHI.cam + ' لقطة';
    vt.insertBefore(b, vt.querySelector('.vhint'));
  }
});
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-mhnav]'); if (!b || b.tagName === 'SPAN') return;
  const k = b.dataset.mhnav, box = document.getElementById('pdfbox');
  if (k === 'shot') mhShot(box);
  else if (k === 'dict') mhDictAdd({ item: box && box.dataset.item, p: box ? pageAtTop(box) : null });
  else if (k === 'vshot') { const v = document.getElementById('vplayer'); if (v) mhVideoShot(v, v.dataset.vid); }
});

/* ================================================================
   التظليل بالسحب، والضغطة الواحدة تُظهر الأدوات — لا «طرفًا أوّل» يعلّقك
   (كانت الضغطة الواحدة تضع علامة نابضة وتنتظر ضغطةً ثانية، ولا تفتح شيئًا)
   ================================================================ */
bindLayer = function (layer, key, page) {
  let st = null, box = null, cur = null;
  const rel = e => { const b = layer.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)) }; };
  const start = () => {
    st.live = true;
    try { layer.setPointerCapture(st.id); } catch (_) {}
    box = document.createElement('div'); box.className = 'hrect';
    box.style.cssText = `left:${st.p.x * 100}%;top:${st.p.y * 100}%;width:0;height:0;background:color-mix(in srgb,${HCOL[curColor]} 60%,transparent)`;
    layer.appendChild(box);
  };
  layer.addEventListener('pointerdown', e => {
    if (!layer.classList.contains('draw')) return;
    if (e.target.classList.contains('hrect')) return;
    if (e.button != null && e.button !== 0) return;
    st = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p: rel(e), mouse: e.pointerType === 'mouse', live: false, moved: false };
    if (st.mouse) e.preventDefault();
  });
  layer.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x0, dy = e.clientY - st.y0;
    if (!st.live) {
      if (Math.abs(dx) < (st.mouse ? 4 : 9) && Math.abs(dy) < (st.mouse ? 4 : 9)) return;
      st.moved = true;
      if (!st.mouse && Math.abs(dy) > Math.abs(dx)) { st = null; return; }   /* الإصبع للأعلى والأسفل = تمرير */
      start();
    }
    const q = rel(e);
    cur = { x: Math.min(st.p.x, q.x), y: Math.min(st.p.y, q.y), w: Math.abs(q.x - st.p.x), h: Math.abs(q.y - st.p.y) };
    box.style.left = cur.x * 100 + '%'; box.style.top = cur.y * 100 + '%';
    box.style.width = cur.w * 100 + '%'; box.style.height = Math.max(cur.h, 0.012) * 100 + '%';
    e.preventDefault();
  });
  const fin = e => {
    if (!st) return; const s = st; st = null;
    if (s.live) {
      if (box) box.remove(); box = null;
      if (cur) {
        /* سحبٌ أفقيّ على سطرٍ واحد: نعطيه ارتفاع سطر */
        if (cur.h < 0.012) { cur.y -= 0.009; cur.h = 0.024; }
        if (cur.w < 0.015) toast('التظليل صغير جدًا — اسحب أطول قليلًا');
        else { addHl(key, { t: 'pdf', p: page, x: cur.x, y: cur.y, w: cur.w, h: cur.h, at: Date.now() });
          paintRects(layer, key, page); toast('ظُلِّل — اضغطه لتكتب فائدة'); }
      }
      cur = null; return;
    }
    if (s.moved) return;                                     /* كان تمريرًا */
    /* ضغطةٌ واحدة: أظهر الأدوات مباشرة */
    mhHlTap(e || { clientX: s.x0, clientY: s.y0 });
  };
  layer.addEventListener('pointerup', fin);
  layer.addEventListener('pointercancel', () => { if (box) { box.remove(); box = null; } st = null; cur = null; });
};
try { clearCorner = function () { document.querySelectorAll('.hmark').forEach(x => x.remove()); document.querySelectorAll('.hlayer.waiting').forEach(x => x.classList.remove('waiting')); tapCorner = null; }; } catch (e) {}

/* الضغطة الواحدة أثناء التظليل */
function mhHlTap(e) {
  if (typeof RD !== 'undefined' && RD.on) { rdToggleBars(); return; }
  let p = document.getElementById('mhHlPop'); if (p) { p.remove(); return; }
  p = document.createElement('div'); p.id = 'mhHlPop'; p.className = 'mhhlpop';
  p.innerHTML = `
    <div class="mhhlpop-r">${Object.keys(HCOL).map(k => `<button class="sw ${k === curColor ? 'on' : ''}" data-hp="c" data-c="${k}" style="background:${HCOL[k]}"></button>`).join('')}</div>
    <button data-hp="stop">${ICON.chk} أوقف التظليل</button>
    <button data-hp="full">${MHI.full} اقرأ بملء الشاشة</button>
    <button data-hp="shot">${MHI.cam} لقطة شاشة</button>
    <button data-hp="dict">${MHI.dict} كلمة لمعجمي</button>`;
  document.body.appendChild(p);
  const w = p.offsetWidth, h = p.offsetHeight;
  p.style.left = Math.max(8, Math.min(innerWidth - w - 8, e.clientX - w / 2)) + 'px';
  p.style.top = Math.max(8, Math.min(innerHeight - h - 8, e.clientY + 14)) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', function off(ev) {
    if (ev.target.closest('#mhHlPop')) return; const q = document.getElementById('mhHlPop'); if (q) q.remove();
    document.removeEventListener('pointerdown', off, true); }, true), 30);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('#mhHlPop [data-hp]'); if (!b) return;
  const k = b.dataset.hp, box = document.getElementById('pdfbox'), pop = document.getElementById('mhHlPop');
  if (k === 'c') { curColor = b.dataset.c; S.set('hcolor', curColor);
    pop.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('#swatches .swatch').forEach(x => x.classList.toggle('on', x.dataset.color === curColor)); return; }
  if (pop) pop.remove();
  if (k === 'stop') { const t = document.getElementById('drawTgl'); if (t && drawOn) t.click(); return; }
  if (k === 'full') { if (box) rdEnter(box); return; }
  if (k === 'shot') { mhShot(box); return; }
  if (k === 'dict') { mhDictAdd({ item: box && box.dataset.item, p: box ? pageAtTop(box) : null }); }
});
/* نصّ الإرشاد يوافق الطريقة الجديدة */
mhAfter(h => {
  if (!/^#\/i\//.test(h)) return;
  const tip = document.getElementById('drawTip');
  if (tip) tip.textContent = 'اسحب بإصبعك على السطر (أفقيًّا) أو بالفأرة لتظلّله. ضغطةٌ واحدة تُظهر الألوان والأدوات. وفي الملفّات النصّية: اضغط مطوّلًا على كلمة لتحدّد النصّ.';
  const hint = document.getElementById('drawHint');
  if (hint) hint.textContent = 'شغّل التظليل ثم اسحب على السطر.';
});
