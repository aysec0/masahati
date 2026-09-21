/* ================================================================
   الجدار: يبقى اقتباسك على الصفحة الأولى كما كان، ومنه زرٌّ يفتح
   جدارًا كامل الشاشة: خلفيّةٌ حقيقية، وبطاقاتٌ بتصاميم تُحرَّك وتُكبَّر
   بمقابض واضحة (بالفأرة أو الإصبع)، وصورٌ بخلفية أو بلا، وتصفية.
   ================================================================ */
const WALL_BG = [
  ['cork', 'فلّين', 'radial-gradient(circle at 30% 20%,#caa877,#b5915c)', '#3a2a15'],
  ['paper', 'ورقيّ', 'repeating-linear-gradient(#f3ecdc 0 27px,#e6dcc4 27px 28px),linear-gradient(#f6f0e2,#efe6d2)', '#4a3f2a'],
  ['linen', 'كتّان', 'repeating-linear-gradient(90deg,#e6e0d2 0 3px,#ece7da 3px 6px)', '#463f30'],
  ['slate', 'لوح', 'linear-gradient(135deg,#2c3436,#1a2123)', '#e8e2d0'],
  ['sage', 'مريميّ', 'linear-gradient(135deg,#cdd8c4,#b6c5aa)', '#33402a'],
  ['night', 'ليليّ', 'radial-gradient(circle at 70% 15%,#26364a,#11151d)', '#e6e9ef'],
  ['rose', 'ورديّ', 'linear-gradient(135deg,#f0dcd6,#e4c6bd)', '#5e3a30']
];
const WALL_STYLES = [['sticky', 'ورقة لاصقة'], ['pin', 'مثبّتة بدبّوس'], ['tape', 'شريط لاصق'],
  ['polaroid', 'إطار صورة'], ['card', 'بطاقة أنيقة'], ['torn', 'ورق ممزّق'], ['plain', 'نصّ صافٍ']];
const WALL_COLORS = ['#fff6c9', '#d6ecdb', '#d9e6f7', '#f2e7cf', '#e4ecd8', '#f7d9d2', '#e6dcf2', '#ffffff', '#1f262b'];
function wallCfg() { return Object.assign({ bg: 'cork' }, S.get('wallCfg', {})); }
function saveWallCfg(c) { S.set('wallCfg', c); }
function wallBgStyle(k) { const b = WALL_BG.find(x => x[0] === k) || WALL_BG[0]; return `background:${b[1] === 'فلّين' ? b[2] : b[2]};color:${b[3]};--wfg:${b[3]}`; }
function wq(q) { if (!q.w) q.w = {}; return q.w; }
function wallItems() {
  return quotes.filter(q => q.onwall !== false && (noteText(q.t) || q.img));
}

/* ---------- بطاقة على الجدار ---------- */
function wallCard(q) {
  const w = wq(q), st = w.style || (q.img ? 'polaroid' : 'sticky');
  const t = noteText(q.t || ''), col = w.color || WALL_COLORS[q.c || 0];
  const rot = w.rot != null ? w.rot : ((q.id.charCodeAt(2) % 7) - 3);
  const dark = /^#[012]/.test(col);
  let inner = '';
  if (q.img) inner += `<img class="wc-img${w.bare ? ' bare' : ''}" data-wimg="${esc(q.img)}" alt="" draggable="false">`;
  if (t) inner += `<div class="wc-t">${esc(t)}</div>`;
  if (q.src) inner += `<div class="wc-src">${esc(q.src)}</div>`;
  return `<div class="wcard st-${st}${dark ? ' on-dark' : ''}${q.img && !t ? ' imgonly' : ''}" data-wc="${q.id}"
    style="left:${w.x != null ? w.x : 12}%;top:${w.y != null ? w.y : 12}%;width:${w.wd || 46}%;font-size:${w.fs || 15}px;--wc:${col};--rot:${rot}deg">
    <div class="wc-body">${inner}</div>
    <button class="wc-menu" title="خيارات">${MHI.dots || '⋯'}</button>
    <span class="wc-size" title="اسحب لتكبّر"></span>
    <span class="wc-rot" title="اسحب لتدير"></span>
  </div>`;
}
/* ---------- الجدار كامل الشاشة ---------- */
let WALLM = null;
function mhWallFull() {
  const c = wallCfg(), filt = S.get('wallFilt', 'all');
  const m = mhModal(`<div class="wallfull" style="${wallBgStyle(c.bg)}">
    <div class="wallbar2">
      <button class="mhico" data-wclose="1" title="إغلاق">${ICON.back}</button>
      <div class="segs wallfilt">
        <button class="seg ${filt === 'all' ? 'on' : ''}" data-wfilt="all">الكلّ</button>
        <button class="seg ${filt === 'text' ? 'on' : ''}" data-wfilt="text">نصوص</button>
        <button class="seg ${filt === 'img' ? 'on' : ''}" data-wfilt="img">صور</button>
      </div>
      <span style="flex:1"></span>
      <button class="mhico" data-wadd="text" title="اقتباس">${ICON.quote}</button>
      <button class="mhico" data-wadd="img" title="صورة">${MHI.cam}</button>
      <button class="mhico" data-wskin="1" title="خلفيّة الجدار">${MHI.wall}</button>
    </div>
    <div class="wallcanvas" id="wallCv"></div>
    <div class="wallhint">اسحب البطاقة لتحرّكها · المقبض السفليّ للحجم · العلويّ للدوران · اضغط ⋯ للتصميم</div>
  </div>`, { full: true });
  m.querySelector('.mhmcard').style.padding = '0';
  WALLM = m;
  wallPaint();
  m.addEventListener('click', wallClick);
  return m;
}
function wallPaint() {
  const cv = WALLM && WALLM.querySelector('#wallCv'); if (!cv) return;
  const filt = S.get('wallFilt', 'all');
  let items = wallItems();
  if (filt === 'text') items = items.filter(q => !q.img);
  else if (filt === 'img') items = items.filter(q => q.img);
  /* بطاقات بلا موضعٍ محفوظ: نرصّها شبكةً مرتّبة بدل أن تتكدّس فوق بعضها */
  let slot = 0, placed = false;
  const narrow = cv.clientWidth < 620, cols = narrow ? 2 : 3, cw = narrow ? 46 : 30, rh = narrow ? 24 : 30;
  items.forEach(q => { const w = wq(q);
    if (w.x == null || w.y == null) { const c = slot % cols, r = Math.floor(slot / cols);
      w.x = 3 + c * (cw + 2); w.y = 4 + r * rh; w.wd = w.wd || cw; w.rot = w.rot != null ? w.rot : ((slot % 3) - 1) * 2; placed = true; }
    slot++; });
  if (placed) saveQuotes();
  cv.innerHTML = items.length ? items.map(wallCard).join('')
    : `<div class="wallcv-empty">${filt === 'img' ? 'لا صور على الجدار.' : filt === 'text' ? 'لا اقتباسات نصّية.' : 'جدارك فارغ — أضِف اقتباسًا أو صورة من الأعلى.'}</div>`;
  cv.querySelectorAll('[data-wimg]').forEach(async im => { const u = await fileURL(im.dataset.wimg); if (u) im.src = u; });
  cv.querySelectorAll('.wcard').forEach(el => wallBind(el, cv));
}
/* ---------- تحريك وتكبير وتدوير بمقابض واضحة ---------- */
function wallBind(el, cv) {
  const id = el.dataset.wc, q = () => quotes.find(x => x.id === id);
  const ptrs = new Map();
  let act = null;                 /* move | size | rot | pinch */
  let base = null, moved = false;
  const cvRect = () => cv.getBoundingClientRect();
  const down = (e, kind) => {
    if (e.button != null && e.button !== 0) return;
    el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, e);
    el.classList.add('active'); el.style.zIndex = (Date.now() % 100000);
    moved = false;
    const r = el.getBoundingClientRect(), cr = cvRect(), w = wq(q());
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()];
      act = 'pinch'; base = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        ang: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI, wd: w.wd || 46, rot: w.rot || 0 };
      return; }
    if (kind === 'size') { act = 'size'; base = { x: e.clientX, wd: w.wd || 46, cw: cr.width }; }
    else if (kind === 'rot') { const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      act = 'rot'; base = { cx, cy, a0: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI, rot: w.rot || 0 }; }
    else { act = 'move'; base = { x: e.clientX, y: e.clientY, ex: r.left - cr.left, ey: r.top - cr.top, cw: cr.width, ch: cr.height }; }
    e.preventDefault(); e.stopPropagation();
  };
  const move = e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, e);
    const w = wq(q()), cr = cvRect();
    if (act === 'pinch' && ptrs.size >= 2) { const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ang = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI;
      w.wd = Math.max(14, Math.min(94, base.wd * d / base.d));
      w.rot = base.rot + (ang - base.ang);
      el.style.width = w.wd + '%'; el.style.setProperty('--rot', w.rot + 'deg'); moved = true; return; }
    if (act === 'move') { const dx = e.clientX - base.x, dy = e.clientY - base.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      w.x = Math.max(0, Math.min(92, (base.ex + dx) / base.cw * 100));
      w.y = Math.max(0, Math.min(94, (base.ey + dy) / base.ch * 100));
      el.style.left = w.x + '%'; el.style.top = w.y + '%'; }
    else if (act === 'size') { moved = true;
      const dx = e.clientX - base.x;           /* البطاقة مثبّتة من يسارها، فالسحب يمينًا يكبّرها */
      w.wd = Math.max(14, Math.min(94, base.wd + dx / base.cw * 100)); el.style.width = w.wd + '%'; }
    else if (act === 'rot') { moved = true;
      const a1 = Math.atan2(e.clientY - base.cy, e.clientX - base.cx) * 180 / Math.PI;
      w.rot = base.rot + (a1 - base.a0); el.style.setProperty('--rot', w.rot + 'deg'); }
    e.preventDefault();
  };
  const up = e => {
    ptrs.delete(e.pointerId);
    if (ptrs.size === 0) { el.classList.remove('active'); if (moved) saveQuotes();
      if (!moved && act === 'move') wallMenu(id); act = null; }
    else if (ptrs.size === 1) { act = 'move'; const r = el.getBoundingClientRect(), cr = cvRect(); const only = [...ptrs.values()][0];
      base = { x: only.clientX, y: only.clientY, ex: r.left - cr.left, ey: r.top - cr.top, cw: cr.width, ch: cr.height }; }
  };
  el.addEventListener('pointerdown', e => { if (e.target.closest('.wc-menu,.wc-size,.wc-rot')) return; down(e, 'move'); });
  el.querySelector('.wc-size').addEventListener('pointerdown', e => down(e, 'size'));
  el.querySelector('.wc-rot').addEventListener('pointerdown', e => down(e, 'rot'));
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.querySelector('.wc-menu').addEventListener('click', ev => { ev.stopPropagation(); wallMenu(id); });
}
/* ---------- قائمة البطاقة ---------- */
function wallMenu(id) {
  const q = quotes.find(x => x.id === id); if (!q) return; const w = wq(q);
  const cur = w.color || WALL_COLORS[q.c || 0];
  sheet(`<h3>بطاقة الجدار</h3>
    ${!q.img ? `<div class="field"><label>النصّ</label><textarea id="wcT" dir="rtl">${esc(noteText(q.t || ''))}</textarea></div>
    <div class="field"><label>المصدر</label><input type="text" id="wcS" dir="rtl" value="${esc(q.src || '')}"></div>` : ''}
    <div class="field"><label>التصميم</label><div class="segs">${WALL_STYLES.map(([k, n]) =>
      `<button class="seg ${(w.style || (q.img ? 'polaroid' : 'sticky')) === k ? 'on' : ''}" data-wcst="${k}">${n}</button>`).join('')}</div></div>
    <div class="field"><label>اللون</label><div class="pal">${WALL_COLORS.map(c =>
      `<button data-wccol="${c}" style="background:${c};width:32px;height:32px;border-radius:9px;border:2px solid ${cur === c ? 'var(--ink)' : 'transparent'}"></button>`).join('')}
      <input type="color" id="wcColX" value="${cur}"></div></div>
    <div class="two"><div class="field"><label>حجم الخطّ</label><input type="range" id="wcFs" min="11" max="34" value="${w.fs || 15}"></div>
    <div class="field"><label>الميل</label><input type="range" id="wcRot" min="-20" max="20" value="${Math.round(w.rot || 0)}"></div></div>
    ${q.img ? `<div class="urow"><span class="ulbl">الصورة بلا خلفية (مفرّغة)</span><button class="usw ${w.bare ? 'on' : ''}" id="wcBare"></button></div>` : ''}
    <div class="urow"><span class="ulbl">اجعلها اقتباس الصفحة الأولى</span><button class="usw ${(S.get('wallFix', {}) || {}).id === id ? 'on' : ''}" id="wcPin"></button></div>
    <div class="sheetrow"><button class="btn pri" id="wcDone">${ICON.chk} تمّ</button>
      <button class="danger" id="wcRem">أزِلها من الجدار</button></div>`, el => {
    const re = () => { const card = document.querySelector(`.wcard[data-wc="${id}"]`);
      if (!card) return; const d = document.createElement('div'); d.innerHTML = wallCard(q); const nw = d.firstElementChild;
      card.replaceWith(nw); wallBind(nw, document.getElementById('wallCv'));
      nw.querySelectorAll('[data-wimg]').forEach(async im => { const u = await fileURL(im.dataset.wimg); if (u) im.src = u; }); };
    const tT = el.querySelector('#wcT'), tS = el.querySelector('#wcS');
    if (tT) tT.addEventListener('input', () => { q.t = tT.value; saveQuotes(); re(); });
    if (tS) tS.addEventListener('input', () => { q.src = tS.value.trim(); saveQuotes(); re(); });
    el.addEventListener('click', ev => {
      const st = ev.target.closest('[data-wcst]'); if (st) { w.style = st.dataset.wcst; el.querySelectorAll('[data-wcst]').forEach(x => x.classList.toggle('on', x === st)); saveQuotes(); re(); return; }
      const cl = ev.target.closest('[data-wccol]'); if (cl) { w.color = cl.dataset.wccol; el.querySelectorAll('[data-wccol]').forEach(x => x.style.borderColor = x === cl ? 'var(--ink)' : 'transparent'); saveQuotes(); re(); return; }
      if (ev.target.id === 'wcBare') { w.bare = !w.bare; ev.target.classList.toggle('on', w.bare); saveQuotes(); re(); return; }
      if (ev.target.id === 'wcPin') { const on = (S.get('wallFix', {}) || {}).id !== id;
        S.set('wallFix', on ? { id, until: 0 } : null); if (on && !q.pin) { q.pin = true; saveQuotes(); }
        ev.target.classList.toggle('on', on); toast(on ? 'ستظهر على الصفحة الأولى' : 'أُزيلت من الصفحة الأولى'); return; }
      if (ev.target.id === 'wcDone') { closeSheet(); return; }
      if (ev.target.id === 'wcRem') { q.onwall = false; saveQuotes(); closeSheet(); const card = document.querySelector(`.wcard[data-wc="${id}"]`); if (card) card.remove(); return; }
    });
    el.addEventListener('input', ev => {
      if (ev.target.id === 'wcFs') { w.fs = +ev.target.value; saveQuotes(); const c = document.querySelector(`.wcard[data-wc="${id}"]`); if (c) c.style.fontSize = w.fs + 'px'; }
      if (ev.target.id === 'wcRot') { w.rot = +ev.target.value; saveQuotes(); const c = document.querySelector(`.wcard[data-wc="${id}"]`); if (c) c.style.setProperty('--rot', w.rot + 'deg'); }
      if (ev.target.id === 'wcColX') { w.color = ev.target.value; saveQuotes(); re(); }
    });
  });
}
/* ---------- خلفيّة الجدار ---------- */
function mhWallSkin() {
  const c = wallCfg();
  sheet(`<h3>${MHI.wall} خلفيّة الجدار</h3>
    <div class="wallbgs">${WALL_BG.map(([k, n, css, fg]) =>
      `<button class="wallbg ${c.bg === k ? 'on' : ''}" data-wbg="${k}" style="background:${css};color:${fg}">${n}</button>`).join('')}</div>
    <p class="mhnote">هذه خلفيّة الجدار، ولكلّ بطاقة تصميمها من زرّ ⋯ عليها.</p>
    <div class="sheetrow"><button class="btn pri" onclick="closeSheet()">${ICON.chk} تمّ</button></div>`, el => {
    el.addEventListener('click', ev => { const b = ev.target.closest('[data-wbg]'); if (!b) return;
      c.bg = b.dataset.wbg; saveWallCfg(c); el.querySelectorAll('[data-wbg]').forEach(x => x.classList.toggle('on', x === b));
      const wf = document.querySelector('.wallfull'); if (wf) wf.style.cssText = wallBgStyle(c.bg); });
  });
}
/* ---------- أحداث شريط الجدار ---------- */
function wallClick(ev) {
  if (ev.target.closest('[data-wclose]')) { if (WALLM) WALLM.close(); WALLM = null; return; }
  const filt = ev.target.closest('[data-wfilt]');
  if (filt) { S.set('wallFilt', filt.dataset.wfilt);
    WALLM.querySelectorAll('.wallfilt .seg').forEach(x => x.classList.toggle('on', x === filt)); wallPaint(); return; }
  if (ev.target.closest('[data-wskin]')) { mhWallSkin(); return; }
  const add = ev.target.closest('[data-wadd]'); if (!add) return;
  if (add.dataset.wadd === 'img') {
    mhPickFile('image/*', true).then(async files => { if (!files || !files.length) return;
      for (const f of files) { const small = await shrinkImg(f, 1400); const key = uid('wq'); await putFile(key, small);
        quotes.unshift({ id: uid('q'), t: '', img: key, onwall: true, c: 0, w: { style: 'polaroid', x: 12 + Math.random() * 40, y: 10 + Math.random() * 40, wd: 40 } }); }
      saveQuotes(); wallPaint(); });
  } else {
    mhModal(`<div class="mhvhead"><b>${ICON.quote} اقتباس</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
      <div class="field"><textarea id="wqT" dir="rtl" placeholder="اكتب الاقتباس أو الخاطرة…"></textarea></div>
      <div class="field"><input type="text" id="wqS" dir="rtl" placeholder="المصدر (اختياري)"></div>
      <div class="sheetrow"><button class="btn pri" data-wqadd="1">${ICON.plus} أضِف إلى الجدار</button></div>`, mm => {
      setTimeout(() => mm.querySelector('#wqT').focus(), 80);
      mm.querySelector('[data-wqadd]').onclick = () => { const t = mm.querySelector('#wqT').value.trim(); if (!t) return;
        quotes.unshift({ id: uid('q'), t, src: mm.querySelector('#wqS').value.trim(), onwall: true, c: Math.floor(Math.random() * 5),
          w: { style: 'sticky', x: 10 + Math.random() * 42, y: 8 + Math.random() * 42, wd: 42 } });
        saveQuotes(); mm.close(); wallPaint(); };
    });
  }
}
/* ---------- المدخل: زرّ «افتح الجدار» في صفحة الاقتباسات وفي الرئيسية ---------- */
document.addEventListener('click', ev => { if (ev.target.closest('[data-wallopen]')) mhWallFull(); });
mhAfter(h => {
  if (h === '#/quotes') {
    const view = document.getElementById('view'); if (!view || view.querySelector('.wallopen')) return;
    const hd = view.querySelector('.sechead');
    const b = document.createElement('button'); b.className = 'btn pri wallopen'; b.dataset.wallopen = '1';
    b.style.cssText = 'margin:0 0 14px;width:100%;justify-content:center';
    b.innerHTML = `${MHI.wall} افتح الجدار كامل الشاشة`;
    if (hd) hd.after(b); else view.prepend(b);
  }
  if (h === '#/' && uiOn('wall')) {
    const hero = document.querySelector('.hero'); if (!hero || document.querySelector('.wallopenhome')) return;
    const b = document.createElement('button'); b.className = 'wallopenhome'; b.dataset.wallopen = '1';
    b.innerHTML = `${MHI.wall} <span>افتح جدارك</span>`;
    hero.after(b);
  }
});
