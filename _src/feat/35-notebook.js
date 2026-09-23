/* ================================================================
   الدفتر: صفحاتٌ تُقرأ وتُكتب في مكانها كأنّها ورق،
   وتقليبٌ كدفترٍ حقيقيّ، وتبويبٌ لترتيب الصفحات وإخفاء ما لا تريد.
   ================================================================ */
function mhNbList(id) {
  const b = nbOf(id);
  const hide = new Set(b.hide || []);
  const own = b.pages.map(p => ({ key: p.id, own: true, p: p.p, ttl: p.ttl, h: p.h, img: p.img, at: p.at || 0, k: p.k }));
  const gath = nbGathered(id).map(g => ({ key: g.ref || ('map:' + g.map), own: false, kind: g.kind, p: g.p, t: g.t,
    txt: g.txt, h: g.h, c: g.c, map: g.map, name: g.name, at: g.at || 0 }));
  const all = own.concat(gath);
  const idx = new Map((b.order || []).map((k, i) => [k, i]));
  all.sort((a, c) => {
    const ia = idx.has(a.key) ? idx.get(a.key) : 1e9, ic = idx.has(c.key) ? idx.get(c.key) : 1e9;
    return ia - ic || (a.p || 0) - (c.p || 0) || a.at - c.at;
  });
  return { all, vis: all.filter(x => !hide.has(x.key)), hide };
}
function mhNbAt(id, v) {
  const a = S.get('nbAt', {});
  if (v === undefined) return a[id] || 0;
  a[id] = v; S.set('nbAt', a); return v;
}
function mhNbMode() { return S.get('nbMode', 'pages'); }
function mhNbPaper(id, x, n, total, editable) {
  const pref = x.p ? `<button class="nbref" data-nbgo="${x.p}" title="اذهب إلى الصفحة في المقرَّر">صفحة ${AR(x.p)}</button>` : '';
  const time = x.t != null ? `<button class="nbref" data-nbgot="${x.t}">${arTime(x.t)}</button>` : '';
  let body;
  if (x.own) {
    body = `${x.img ? `<img class="nbimg" data-nbimg="${esc(x.img)}" alt="">` : ''}
      ${editable ? `${rtoolsHTML()}<div class="rich nbrich" contenteditable="true" dir="rtl" data-nbk="${x.key}" data-ph="اكتب فائدتك هنا…">${noteHtml(x.h || '')}</div>`
        : `<div class="nbrich ro">${noteHtml(x.h || '') || '<i class="mkempty">صفحة فارغة</i>'}</div>`}`;
  } else if (x.map) {
    body = `<button class="btn" data-nbmap="${esc(x.map)}">${ICON.mind} ${esc(x.name || 'خريطة')}</button>`;
  } else {
    body = `${x.txt ? `<blockquote class="nbq" style="--mc:${HCOL[x.c] || HCOL.y}">${esc(x.txt)}</blockquote>` : ''}
      ${editable ? `${rtoolsHTML()}<div class="rich nbrich" contenteditable="true" dir="rtl" data-nbg="${esc(x.key)}" data-ph="اكتب فائدتك على هذا…">${noteHtml(x.h || '')}</div>`
        : `<div class="nbrich ro">${x.h ? noteHtml(x.h) : '<i class="mkempty">بلا تعليق</i>'}</div>`}`;
  }
  return `<div class="nbpaper ${x.own ? '' : 'gath'}" data-key="${esc(x.key)}">
    <div class="nbph2">
      ${x.own && editable ? `<input class="nbttl2" data-nbt="${x.key}" value="${esc(x.ttl || '')}" placeholder="عنوان الفائدة">`
        : `<b class="nbttl3">${esc(x.own ? (x.ttl || 'بلا عنوان') : x.kind)}</b>`}
      <span class="nbrefs">${pref}${time}</span>
    </div>
    <div class="nbbody2">${body}</div>
    <div class="nbfoot">— ${AR(n)} ${total ? 'من ' + AR(total) : ''} —</div>
  </div>`;
}
vBook = function (id) {
  const b = nbOf(id), t = nbTitleOf(id);
  const L = mhNbList(id), mode = mhNbMode();
  const n = L.vis.length;
  let at = Math.min(mhNbAt(id), Math.max(0, n - 1));
  const tabs = `<div class="mhtabs nbtabs">
      <button class="chip ${mode === 'pages' ? 'on' : ''}" data-nbmode="pages">${MHI.pages} صفحات</button>
      <button class="chip ${mode === 'book' ? 'on' : ''}" data-nbmode="book">${MHI.flip} دفتر يُقلَّب</button>
      <button class="chip ${mode === 'arrange' ? 'on' : ''}" data-nbmode="arrange">${MHI.sort} ترتيب وتعديل</button>
    </div>`;
  const head2 = `<a class="back" href="${findItem(id) ? '#/i/' + id : '#/notes'}">${ICON.back} رجوع</a>
    <div class="nbhead2" style="${nbCoverCSS(b.cover)}">
      <div><small>دفتر</small><b>${esc(t.name)}</b>${(b.sub || t.sub) ? `<i>${esc(b.sub || t.sub)}</i>` : ''}</div>
      <span>${AR(n)} صفحة</span>
      <button class="mhico" data-nb="skin" title="الغلاف">${ICON.pen}</button>
    </div>
    <div class="sheetrow" style="margin:10px 0">
      <button class="btn pri" data-nbnew="1">${ICON.plus} صفحة جديدة</button>
      <button class="btn" data-nb="img">${ICON.img} صورة</button>
      <button class="btn" data-nb="pdf">${ICON.dl} تصدير</button>
    </div>${tabs}`;
  if (!n && mode !== 'arrange')
    return `<article class="page nbwrap">${head2}<div class="empty">الدفتر بعدُ فارغ — اكتب فائدتك الأولى، أو ظلّل في الملفّ فتجدها هنا.<br><br>
      <button class="btn pri" data-nbnew="1">${ICON.plus} أوّل صفحة</button></div></article>`;
  if (mode === 'arrange') {
    return `<article class="page nbwrap">${head2}
      <p class="mhnote" style="margin:-4px 0 10px">اسحب من المقبض أو استعمل السهمين. والعين تُخفي ما جُمع من المقرَّر دون أن تحذفه.</p>
      <div class="nbarr" id="nbArr">${L.all.map((x, i) => `
        <div class="nbarow ${L.hide.has(x.key) ? 'off' : ''}" data-key="${esc(x.key)}">
          <button class="grip nbgrip" title="اسحب">${ICON.grip}</button>
          <span class="nbano">${AR(i + 1)}</span>
          <div class="nbatx"><b>${esc(x.own ? (x.ttl || firstLine(x.h || '') || 'صفحة') : x.kind)}</b>
            <small>${x.p ? 'صفحة ' + AR(x.p) + ' · ' : ''}${esc(x.own ? firstLine(x.h || '') : (x.txt || firstLine(x.h || '') || x.name || '')).slice(0, 70)}</small></div>
          <button class="mhico" data-nbmv="-1" title="أعلى">${MHI.up}</button>
          <button class="mhico" data-nbmv="1" title="أسفل">${MHI.down}</button>
          ${x.own ? `<button class="mhico" data-nbe="${x.key}" title="تعديل">${ICON.pen}</button>
            <button class="mhico" data-nbdel="${x.key}" title="حذف">${MHI.trash}</button>`
            : `<button class="mhico ${L.hide.has(x.key) ? '' : 'on'}" data-nbhide="${esc(x.key)}" title="إظهار في الدفتر">${MHI.eye}</button>`}
        </div>`).join('')}</div></article>`;
  }
  if (mode === 'book') {
    return `<article class="page nbwrap">${head2}
      <div class="fbstage" id="fbStage" data-id="${id}"></div>
      <div class="nbnav"><button class="btn" data-nbstep="-1">${MHI.prev} السابقة</button>
        <span class="nbcount2" id="nbCount"></span>
        <button class="btn" data-nbstep="1">التالية ${MHI.next}</button></div>
      <p class="mhnote" style="text-align:center">اسحب الصفحة أو اضغط طرفها لتقلّبها.</p></article>`;
  }
  return `<article class="page nbwrap">${head2}
    <div class="nbsheet" id="nbSheet" data-id="${id}">${mhNbPaper(id, L.vis[at], at + 1, n, true)}</div>
    <div class="nbnav"><button class="btn" data-nbstep="-1" ${at <= 0 ? 'disabled' : ''}>${MHI.prev} السابقة</button>
      <span class="nbcount2">${AR(at + 1)} / ${AR(n)}</span>
      <button class="btn" data-nbstep="1" ${at >= n - 1 ? 'disabled' : ''}>التالية ${MHI.next}</button></div>
    <div class="nbdots">${L.vis.map((x, i) => `<button class="${i === at ? 'on' : ''}" data-nbto="${i}" title="${esc(x.own ? (x.ttl || '') : x.kind)}"></button>`).join('')}</div>
  </article>`;
};
/* ---------- بعد الرسم: التحرير في مكانه، والسحب للتقليب ---------- */
mhAfter(h => {
  const m = /^#\/nb\/(.+)$/.exec(h); if (!m) return;
  const id = m[1];
  try { nbImgs(); } catch (e) {}
  const sheetEl = document.getElementById('nbSheet');
  if (sheetEl) {
    sheetEl.querySelectorAll('[data-nbk]').forEach(rich => {
      let t = null;
      bindRich(sheetEl, rich, () => { clearTimeout(t); t = setTimeout(() => {
        const p = nbOf(id).pages.find(x => x.id === rich.dataset.nbk); if (!p) return;
        p.h = clean(rich.innerHTML); saveBooks();
      }, 400); });
    });
    sheetEl.querySelectorAll('[data-nbt]').forEach(inp => inp.addEventListener('input', () => {
      const p = nbOf(id).pages.find(x => x.id === inp.dataset.nbt); if (p) { p.ttl = inp.value.trim(); saveBooks(); }
    }));
    sheetEl.querySelectorAll('[data-nbg]').forEach(rich => {
      let t2 = null;
      bindRich(sheetEl, rich, () => { clearTimeout(t2); t2 = setTimeout(() => mhSaveGathered(id, rich.dataset.nbg, clean(rich.innerHTML)), 400); });
    });
    mhSwipe(sheetEl, d => mhNbStep(id, d), true);
  }
  const st = document.getElementById('fbStage'); if (st) mhFlipMount(st, id);
  const arr = document.getElementById('nbArr'); if (arr) mhSortable(arr, '.nbarow', '.nbgrip', keys => {
    const b = nbOf(id); b.order = keys; saveBooks(); arr.querySelectorAll('.nbano').forEach((e, i) => e.textContent = AR(i + 1));
  });
});
function mhNbStep(id, d) {
  const n = mhNbList(id).vis.length; if (!n) return;
  const at = Math.max(0, Math.min(n - 1, mhNbAt(id) + d));
  if (at === mhNbAt(id)) return;
  mhNbAt(id, at);
  const el = document.getElementById('nbSheet');
  if (el) { el.classList.add(d > 0 ? 'outL' : 'outR'); setTimeout(() => render(), 160); } else render();
}
/* السحب بالإصبع أو الفأرة: في الكتاب العربيّ «التالية» بالسحب نحو اليمين */
function mhSwipe(el, go, skipEditing) {
  let x0 = null, y0 = 0, t0 = 0;
  el.addEventListener('pointerdown', e => {
    if (skipEditing && e.target.closest('[contenteditable="true"],input,textarea,button,a,.rtools,.edbar')) return;
    x0 = e.clientX; y0 = e.clientY; t0 = Date.now();
  });
  el.addEventListener('pointerup', e => {
    if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - t0 < 900) go(dx > 0 ? 1 : -1);
  });
  el.addEventListener('pointercancel', () => { x0 = null; });
}
document.addEventListener('click', ev => {
  const md = ev.target.closest('[data-nbmode]'); if (md) { S.set('nbMode', md.dataset.nbmode); render(); return; }
  const idm = /^#\/nb\/(.+)$/.exec(location.hash || ''); if (!idm) return;
  const id = idm[1];
  const st = ev.target.closest('[data-nbstep]');
  if (st) { if (mhNbMode() === 'book') mhFlip(+st.dataset.nbstep); else mhNbStep(id, +st.dataset.nbstep); return; }
  const to = ev.target.closest('[data-nbto]'); if (to) { mhNbAt(id, +to.dataset.nbto); render(); return; }
  if (ev.target.closest('[data-nbnew]')) {
    const L = mhNbList(id);
    const p = nbAdd(id, { ttl: '', h: '', p: null });
    const b = nbOf(id);
    if (b.order && b.order.length) {          /* بعد الصفحة المفتوحة في الترتيب الحقيقيّ (لا الظاهر) */
      const cur = L.vis[mhNbAt(id)]; const i = cur ? b.order.indexOf(cur.key) : -1;
      b.order.splice(i + 1, 0, p.id); saveBooks();
    }
    S.set('nbMode', 'pages');
    mhNbAt(id, mhNbList(id).vis.findIndex(x => x.key === p.id));
    render();
    setTimeout(() => { const t = document.querySelector('.nbttl2'); if (t) t.focus(); }, 80);
    return;
  }
  const go = ev.target.closest('[data-nbgo]'); if (go) { mhJumpTo(id, +go.dataset.nbgo); return; }
  const gt = ev.target.closest('[data-nbgot]'); if (gt) { location.hash = '#/i/' + id; setTimeout(() => { try { seekItem(findItem(id).it, +gt.dataset.nbgot); } catch (e) {} }, 500); return; }
  const ed = ev.target.closest('[data-nbedit]');
  if (ed) { const k = ed.dataset.nbedit;
    if (k.startsWith('hl:')) { const hid = k.slice(3); const key = Object.keys(hls).find(kk => kk.split(':')[0] === id && (hls[kk] || []).some(h => h.id === hid)) || id; openHl(key, hid); }
    else if (k.startsWith('mk:')) { const mm = (marks[id] || []).find(x => x.id === k.slice(3)); const r = findItem(id); if (mm && r) (mm.p != null ? pgSheet : mkSheet)(r.it, mm); }
    else if (k === 'note') openNote('item:' + id);
    return; }
  const mv = ev.target.closest('[data-nbmv]');
  if (mv) { const row = mv.closest('.nbarow'), arr = row.parentElement;
    if (+mv.dataset.nbmv < 0 && row.previousElementSibling) row.previousElementSibling.before(row);
    else if (+mv.dataset.nbmv > 0 && row.nextElementSibling) row.nextElementSibling.after(row);
    const b = nbOf(id); b.order = [...arr.children].map(x => x.dataset.key); saveBooks();
    arr.querySelectorAll('.nbano').forEach((e, i) => e.textContent = AR(i + 1)); return; }
  const hd = ev.target.closest('[data-nbhide]');
  if (hd) { const b = nbOf(id), k = hd.dataset.nbhide; b.hide = b.hide || [];
    if (b.hide.includes(k)) b.hide = b.hide.filter(x => x !== k); else b.hide.push(k);
    saveBooks(); hd.classList.toggle('on'); hd.closest('.nbarow').classList.toggle('off'); return; }
  const dl = ev.target.closest('[data-nbdel]');
  if (dl) { confirmSheet('تُحذف هذه الصفحة من الدفتر.', () => { const b = nbOf(id); b.pages = b.pages.filter(x => x.id !== dl.dataset.nbdel); saveBooks(); }); return; }
});
/* ---------- دفتر يُقلَّب ---------- */
const FB = { id: null, at: 0, busy: false };
function mhFlipSpread() { return matchMedia('(min-width:900px)').matches; }
function mhFlipMount(st, id) {
  FB.id = id; const vis = mhNbList(id).vis;
  const sp = mhFlipSpread();
  FB.at = Math.min(mhNbAt(id), Math.max(0, vis.length - 1));
  if (sp) FB.at -= FB.at % 2;
  mhFlipPaint(st);
  mhSwipe(st, d => mhFlip(d), false);
  st.addEventListener('click', e => {
    if (e.target.closest('a,button')) return;
    const r = st.getBoundingClientRect();
    mhFlip(e.clientX < r.left + r.width / 2 ? 1 : -1);   /* الطرف الأيسر للتالية */
  });
}
function mhFlipPage(vis, i) {
  if (i < 0 || i >= vis.length) return `<div class="fbpage blank"></div>`;
  return `<div class="fbpage">${mhNbPaper(FB.id, vis[i], i + 1, vis.length, false)}</div>`;
}
function mhFlipPaint(st) {
  st = st || document.getElementById('fbStage'); if (!st) return;
  const vis = mhNbList(FB.id).vis, sp = mhFlipSpread();
  st.classList.toggle('spread', sp);
  st.innerHTML = sp ? `<div class="fbright">${mhFlipPage(vis, FB.at)}</div><div class="fbleft">${mhFlipPage(vis, FB.at + 1)}</div>`
    : `<div class="fbone">${mhFlipPage(vis, FB.at)}</div>`;
  const c = document.getElementById('nbCount');
  if (c) c.textContent = sp ? `${AR(Math.min(FB.at + 1, vis.length))}–${AR(Math.min(FB.at + 2, vis.length))} من ${AR(vis.length)}` : `${AR(FB.at + 1)} / ${AR(vis.length)}`;
  try { nbImgs(); } catch (e) {}
}
function mhFlip(d) {
  const st = document.getElementById('fbStage'); if (!st || FB.busy) return;
  const vis = mhNbList(FB.id).vis, sp = mhFlipSpread(), step = sp ? 2 : 1;
  const to = FB.at + d * step;
  if (to < 0 || to >= vis.length) { st.classList.add('bump'); setTimeout(() => st.classList.remove('bump'), 300); return; }
  FB.busy = true;
  const leaf = document.createElement('div'); leaf.className = 'fbleaf ' + (sp ? 'sp' : 'one') + (d > 0 ? ' fwd' : ' back');
  if (sp) {
    /* التالية: الصفحة اليسرى تنقلب حول الكعب إلى اليمين */
    const front = d > 0 ? FB.at + 1 : FB.at, back = d > 0 ? FB.at + 2 : FB.at - 1;
    leaf.innerHTML = `<div class="fbface front">${mhFlipPage(vis, front)}</div><div class="fbface back">${mhFlipPage(vis, back)}</div>`;
    const R = st.querySelector('.fbright'), Lf = st.querySelector('.fbleft');
    if (d > 0) Lf.innerHTML = mhFlipPage(vis, to + 1); else R.innerHTML = mhFlipPage(vis, to);
  } else {
    leaf.innerHTML = `<div class="fbface front">${mhFlipPage(vis, d > 0 ? FB.at : to)}</div>`;
    if (d > 0) st.querySelector('.fbone').innerHTML = mhFlipPage(vis, to);
  }
  st.appendChild(leaf);
  try { nbImgs(); } catch (e) {}
  requestAnimationFrame(() => requestAnimationFrame(() => leaf.classList.add('go')));
  setTimeout(() => { FB.at = to; mhNbAt(FB.id, to); leaf.remove(); mhFlipPaint(st); FB.busy = false; }, 620);
}
addEventListener('resize', () => { if (document.getElementById('fbStage')) mhFlipPaint(); });
addEventListener('keydown', e => {
  if (!/^#\/nb\//.test(location.hash || '') || e.target.closest('input,textarea,[contenteditable="true"]')) return;
  if (e.key === 'ArrowLeft') { mhNbMode() === 'book' ? mhFlip(1) : mhNbStep(location.hash.slice(5), 1); }
  if (e.key === 'ArrowRight') { mhNbMode() === 'book' ? mhFlip(-1) : mhNbStep(location.hash.slice(5), -1); }
});
/* ---------- ترتيب بالسحب: عامّ لأيّ قائمة ---------- */
function mhSortable(list, rowSel, gripSel, onDone) {
  let drag = null, ph = null, dy = 0;
  list.addEventListener('pointerdown', e => {
    const g = e.target.closest(gripSel); if (!g) return;
    const row = g.closest(rowSel); if (!row) return;
    e.preventDefault();
    const r = row.getBoundingClientRect();
    drag = row; dy = e.clientY - r.top;
    ph = document.createElement('div'); ph.className = 'mhph'; ph.style.height = r.height + 'px';
    row.after(ph);
    row.classList.add('mhdrag'); row.style.width = r.width + 'px'; row.style.top = r.top + 'px'; row.style.left = r.left + 'px';
    document.body.classList.add('sorting');
    try { g.setPointerCapture(e.pointerId); } catch (x) {}
  });
  const move = e => {
    if (!drag) return; e.preventDefault();
    drag.style.top = (e.clientY - dy) + 'px';
    const rows = [...list.querySelectorAll(rowSel)].filter(x => x !== drag);
    let placed = false;
    for (const r of rows) { const b = r.getBoundingClientRect();
      if (e.clientY < b.top + b.height / 2) { if (ph.nextElementSibling !== r) r.before(ph); placed = true; break; } }
    if (!placed && rows.length) rows[rows.length - 1].after(ph);
    if (e.clientY < 70) scrollBy(0, -12); else if (e.clientY > innerHeight - 90) scrollBy(0, 12);
  };
  const up = () => {
    if (!drag) return;
    ph.replaceWith(drag); drag.classList.remove('mhdrag'); drag.style.cssText = '';
    document.body.classList.remove('sorting'); drag = null;
    removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    onDone([...list.querySelectorAll(rowSel)].map(x => x.dataset.key));
  };
  list.addEventListener('pointerdown', e => {                  /* تُربط عند بدء السحب وتُفكّ عند انتهائه */
    if (!e.target.closest(gripSel)) return;
    addEventListener('pointermove', move, { passive: false });
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
  });
}
/* ---------- تصدير بالترتيب الذي اخترته ---------- */
nbExport = function (id) {
  const b = nbOf(id), t = nbTitleOf(id), vis = mhNbList(id).vis;
  const w = window.open('', '_blank'); if (!w) { toast('اسمح بالنوافذ المنبثقة'); return; }
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(t.name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet"><style>
    @page{size:A4;margin:18mm}
    body{font-family:'Amiri',serif;max-width:720px;margin:32px auto;padding:0 20px;line-height:2;color:#23201a}
    h1{font-size:28px;border-bottom:2px solid #c8bda4;padding-bottom:10px}
    .pg{page-break-after:always;padding:8px 0}
    .m{font-size:12px;color:#8a7f68;font-family:system-ui,sans-serif}
    b.t{display:block;font-size:19px;margin-bottom:6px}
    blockquote{margin:8px 0;padding:6px 12px;border-inline-start:4px solid #d9c27a;background:#faf5e6}
    </style></head><body><h1>${esc(t.name)}</h1>${b.sub || t.sub ? `<p class="m">${esc(b.sub || t.sub)}</p>` : ''}
    ${vis.map((x, i) => `<div class="pg"><span class="m">${AR(i + 1)}${x.p ? ' · صفحة ' + AR(x.p) : ''}</span>
      <b class="t">${esc(x.own ? (x.ttl || '') : x.kind)}</b>${x.txt ? `<blockquote>${esc(x.txt)}</blockquote>` : ''}<div>${x.h ? noteHtml(x.h) : ''}</div></div>`).join('')}
    </body></html>`);
  w.document.close(); setTimeout(() => { try { w.print(); } catch (e) {} }, 700);
};
/* فوائدي: اسم المقرَّر يفتح دفتره صفحاتٍ مباشرة */
noteNameRow = function (x) {
  const T = TYPES[x.it.type] || TYPES.text;
  const n = (x.note ? 1 : 0) + x.hl.length + ((books[x.it.id] && books[x.it.id].pages) || []).length;
  return `<a class="nrow" href="#/nb/${x.it.id}"><span class="ic">${T.ic}</span><b>${esc(x.it.name)}</b>
    <span class="cnt">${AR(n)} صفحة</span></a>`;
};

/* حفظ التعليق المكتوب على عنصرٍ مجموع (تظليل أو علامة) في مصدره */
function mhSaveGathered(id, ref, html) {
  try {
    if (ref === 'note') { if (noteText(html)) notes[id] = html; else delete notes[id]; saveNotes(); return; }
    if (ref.startsWith('hl:')) { const hid = ref.slice(3);
      const key = Object.keys(hls).find(k => k.split(':')[0] === id && (hls[k] || []).some(h => h.id === hid)) || id;
      const h = (hls[key] || []).find(x => x.id === hid); if (h) { h.n = html; saveHls(); } return; }
    if (ref.startsWith('mk:')) { const m = (marks[id] || []).find(x => x.id === ref.slice(3)); if (m) { m.n = html; saveMarks(); } return; }
  } catch (e) {}
}