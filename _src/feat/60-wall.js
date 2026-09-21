/* ================================================================
   الجدار: خلفيّةٌ كجدارٍ حقيقيّ، وبطاقاتٌ بتصاميم مميّزة تُحرَّك
   وتُكبَّر وتُصغَّر بحرّية، وصورٌ بخلفية أو بلا خلفية، وتصفية
   (نصوص · صور · الاثنان)، ومنه تختار ما يظهر في الصفحة الأولى.
   ================================================================ */
const WALL_BG = [
  ['cork', 'فلّين', 'radial-gradient(circle at 30% 20%, #c9a876, #b8935e), url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence baseFrequency=%270.9%27 numOctaves=%272%27/%3E%3C/filter%3E%3Crect width=%2740%27 height=%2740%27 filter=%27url(%23n)%27 opacity=%270.28%27/%3E%3C/svg%3E")', '#3a2a15'],
  ['paper', 'ورقيّ', 'repeating-linear-gradient(#f3ecdc,#f3ecdc 27px,#e4d9c0 28px), linear-gradient(#f6f0e2,#f0e8d6)', '#4a3f2a'],
  ['linen', 'كتّان', 'repeating-linear-gradient(90deg,#e8e2d4 0 2px,#ece7da 2px 4px), repeating-linear-gradient(#e5dfd0 0 2px,#ebe6d8 2px 4px)', '#463f30'],
  ['slate', 'لوح', 'linear-gradient(135deg,#2c3436,#1c2325)', '#e8e2d0'],
  ['sage', 'مريميّ', 'linear-gradient(135deg,#cdd8c4,#b9c8ad)', '#33402a'],
  ['night', 'ليليّ', 'radial-gradient(circle at 70% 15%,#243244,#12161f)', '#e6e9ef'],
  ['rose', 'ورديّ', 'linear-gradient(135deg,#f0dcd6,#e6c9c0)', '#5e3a30']
];
const WALL_STYLES = [
  ['sticky', 'ورقة لاصقة'], ['pin', 'مثبّتة بدبّوس'], ['tape', 'بشريط لاصق'], ['polaroid', 'إطار صورة'],
  ['card', 'بطاقة أنيقة'], ['ribbon', 'بشريطة'], ['torn', 'ورق ممزّق'], ['plain', 'نصّ صافٍ']
];
const WALL_COLORS = ['#fff6c9', '#d6ecdb', '#d9e6f7', '#f2e7cf', '#e4ecd8', '#f7d9d2', '#e6dcf2', '#ffffff', '#20262b'];
function wallCfg() { return Object.assign({ bg: 'cork', pinHome: null }, S.get('wallCfg', {})); }
function saveWallCfg(c) { S.set('wallCfg', c); }
function wallBgCSS(k) { const b = WALL_BG.find(x => x[0] === k) || WALL_BG[0]; return `--wbg:${b[2]};--wfg:${b[3]}`; }
/* لكل اقتباس على الجدار: مكانه وحجمه ودورانه وتصميمه */
function wq(q) { q.w = q.w || {}; return q.w; }

/* ---------- زرّ فتح الجدار في الصفحة الأولى ---------- */
function mhWallHomeCard() {
  if (!uiOn('wall')) return '';
  const c = wallCfg(), pinned = c.pinHome && quotes.find(x => x.id === c.pinHome);
  const inner = pinned ? mhWallCardHTML(pinned, true) : '';
  return `<div class="wallhome" style="${wallBgCSS(c.bg)}">
    ${inner || `<button class="wallhome-empty" data-wallopen="1">${MHI.wall}<span>افتح جدارك — اقتباساتك وصورك على جدارٍ تخصّصه</span></button>`}
    ${inner ? `<button class="wallhome-full" data-wallopen="1" title="الجدار كاملًا">${MHI.full}</button>` : ''}
  </div>`;
}
function mhWallCardHTML(q, onHome) {
  const w = wq(q), st = w.style || 'sticky';
  const t = noteText(q.t || ''), col = w.color || WALL_COLORS[q.c || 0];
  const rot = w.rot != null ? w.rot : ((q.id.charCodeAt(2) % 7) - 3);
  const dark = /^#[012]/.test(col);
  let inner = '';
  if (q.img) inner += `<img class="wc-img ${w.bare ? 'bare' : ''}" data-wimg="${esc(q.img)}" alt="">`;
  if (t) inner += `<div class="wc-t">${esc(t)}</div>`;
  if (q.src) inner += `<div class="wc-src">${esc(q.src)}</div>`;
  return `<div class="wcard st-${st} ${dark ? 'on-dark' : ''} ${q.img && !t ? 'imgonly' : ''}" data-wc="${q.id}"
    style="--wc:${col};--rot:${rot}deg;${onHome ? '' : `left:${w.x || 8}%;top:${w.y || 8}%;width:${w.wd || 44}%;font-size:${w.fs || 15}px;`}">
    ${inner}</div>`;
}
/* ---------- الجدار كاملًا: تحريك حرّ ---------- */
function mhWallFull() {
  const c = wallCfg();
  const filt = S.get('wallFilt', 'all');
  let items = quotes.filter(q => q.onwall !== false && (noteText(q.t) || q.img));
  if (filt === 'text') items = items.filter(q => !q.img);
  else if (filt === 'img') items = items.filter(q => q.img);
  const m = mhModal(`<div class="wallfull" style="${wallBgCSS(c.bg)}">
    <div class="wallbar2">
      <button class="mhico" data-mhx="1" title="إغلاق">${ICON.back}</button>
      <div class="segs wallfilt">
        <button class="seg ${filt === 'all' ? 'on' : ''}" data-wfilt="all">الكلّ</button>
        <button class="seg ${filt === 'text' ? 'on' : ''}" data-wfilt="text">نصوص</button>
        <button class="seg ${filt === 'img' ? 'on' : ''}" data-wfilt="img">صور</button>
      </div>
      <span style="flex:1"></span>
      <button class="mhico" data-wadd="text" title="أضف اقتباسًا">${ICON.quote}</button>
      <button class="mhico" data-wadd="img" title="أضف صورة">${MHI.cam}</button>
      <button class="mhico" data-wskin="1" title="تصميم الجدار">${MHI.wall}</button>
    </div>
    <div class="wallcanvas" id="wallCv">
      ${items.map(q => mhWallCardHTML(q)).join('')}
      ${items.length ? '' : '<div class="wallcv-empty">جدارك فارغ — أضف اقتباسًا أو صورة من الأعلى.</div>'}
    </div>
    <p class="wallhint" id="wallHint">اسحب لتحرّك · اقرص لتكبّر · اضغط مطوّلًا للتصميم والتثبيت في الصفحة الأولى</p>
  </div>`, { full: true });
  m.querySelector('.mhmcard').style.padding = '0';
  const cv = m.querySelector('#wallCv');
  cv.querySelectorAll('[data-wimg]').forEach(async im => { const u = await fileURL(im.dataset.wimg); if (u) im.src = u; });
  cv.querySelectorAll('.wcard').forEach(el => mhWallDrag(el, cv));
  return m;
}
/* تحريك وتكبير وتدوير */
function mhWallDrag(el, cv) {
  const id = el.dataset.wc;
  const ptrs = new Map();
  let mode = null, start = null, lp = null;
  const pct = (px, tot) => Math.max(0, Math.min(96, px / tot * 100));
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('.wc-handle')) return;
    el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, e);
    el.classList.add('moving'); el.style.zIndex = Date.now() % 100000;
    lp = setTimeout(() => { mode = null; ptrs.clear(); mhWallCardMenu(id); }, 550);
    const r = el.getBoundingClientRect(), cr = cv.getBoundingClientRect();
    if (ptrs.size === 1) { mode = 'move'; start = { x: e.clientX, y: e.clientY, ex: r.left - cr.left, ey: r.top - cr.top }; }
  });
  const moveH = e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, e);
    const cr = cv.getBoundingClientRect(); const w = wq(quotes.find(q => q.id === id));
    if (ptrs.size >= 2) {
      clearTimeout(lp); const [a, b] = [...ptrs.values()];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ang = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI;
      if (!start || start.dist == null) { start = { dist, ang, wd: w.wd || 44, rot: w.rot || 0 }; return; }
      mode = 'pinch';
      w.wd = Math.max(12, Math.min(96, start.wd * dist / start.dist));
      w.rot = start.rot + (ang - start.ang);
      el.style.width = w.wd + '%'; el.style.setProperty('--rot', w.rot + 'deg');
    } else if (mode === 'move') {
      if (Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > 8) clearTimeout(lp);
      w.x = pct(start.ex + (e.clientX - start.x), cr.width);
      w.y = pct(start.ey + (e.clientY - start.y), cr.height);
      el.style.left = w.x + '%'; el.style.top = w.y + '%';
    }
  };
  const up = e => {
    clearTimeout(lp); ptrs.delete(e.pointerId);
    if (ptrs.size < 2) start = null;
    if (ptrs.size === 0) { el.classList.remove('moving'); mode = null; saveQuotes(); }
  };
  el.addEventListener('pointermove', moveH);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('dblclick', () => mhWallCardMenu(id));
}
function mhWallCardMenu(id) {
  const q = quotes.find(x => x.id === id); if (!q) return; const w = wq(q);
  const c = wallCfg();
  sheet(`<h3>بطاقة الجدار</h3>
    <div class="field"><label>التصميم</label><div class="segs wallstyles">${WALL_STYLES.map(([k, n]) =>
      `<button class="seg ${(w.style || 'sticky') === k ? 'on' : ''}" data-wcst="${k}">${n}</button>`).join('')}</div></div>
    <div class="field"><label>اللون</label><div class="pal">${WALL_COLORS.map(col =>
      `<button data-wccol="${col}" style="background:${col};width:32px;height:32px;border-radius:9px;border:2px solid ${(w.color || WALL_COLORS[q.c || 0]) === col ? 'var(--ink)' : 'transparent'}"></button>`).join('')}
      <input type="color" data-wccolx value="${w.color || WALL_COLORS[q.c || 0]}"></div></div>
    <div class="field"><label>حجم الخط</label><input type="range" min="11" max="30" value="${w.fs || 15}" data-wcfs></div>
    ${q.img ? `<div class="urow"><span class="ulbl">الصورة بلا خلفية (مفرّغة)</span><button class="usw ${w.bare ? 'on' : ''}" data-wcbare></button></div>` : ''}
    <div class="urow"><span class="ulbl">اجعلها ظاهرة في الصفحة الأولى</span>
      <button class="usw ${c.pinHome === id ? 'on' : ''}" data-wcpin></button></div>
    <div class="sheetrow"><button class="btn pri" onclick="closeSheet()">${ICON.chk} تمّ</button>
      <button class="danger" data-wcrem="1">أزِلها من الجدار</button></div>`, el => {
    const rerender = () => { const card = document.querySelector(`.wcard[data-wc="${id}"]`);
      if (card) { const d = document.createElement('div'); d.innerHTML = mhWallCardHTML(q); const nw = d.firstElementChild;
        card.replaceWith(nw); mhWallDrag(nw, document.getElementById('wallCv'));
        nw.querySelectorAll('[data-wimg]').forEach(async im => { const u = await fileURL(im.dataset.wimg); if (u) im.src = u; }); } };
    el.addEventListener('click', ev => {
      const st = ev.target.closest('[data-wcst]'); if (st) { w.style = st.dataset.wcst; el.querySelectorAll('[data-wcst]').forEach(x => x.classList.toggle('on', x === st)); saveQuotes(); rerender(); return; }
      const cl = ev.target.closest('[data-wccol]'); if (cl) { w.color = cl.dataset.wccol; el.querySelectorAll('[data-wccol]').forEach(x => x.style.borderColor = x === cl ? 'var(--ink)' : 'transparent'); saveQuotes(); rerender(); return; }
      if (ev.target.closest('[data-wcbare]')) { w.bare = !w.bare; ev.target.closest('[data-wcbare]').classList.toggle('on', w.bare); saveQuotes(); rerender(); return; }
      if (ev.target.closest('[data-wcpin]')) { const on = c.pinHome !== id; c.pinHome = on ? id : null; saveWallCfg(c); ev.target.closest('[data-wcpin]').classList.toggle('on', on); toast(on ? 'ستظهر في الصفحة الأولى' : 'أُزيلت من الصفحة الأولى'); return; }
      if (ev.target.closest('[data-wcrem]')) { q.onwall = false; saveQuotes(); closeSheet(); const card = document.querySelector(`.wcard[data-wc="${id}"]`); if (card) card.remove(); return; }
    });
    el.addEventListener('input', ev => {
      if (ev.target.matches('[data-wcfs]')) { w.fs = +ev.target.value; saveQuotes(); const card = document.querySelector(`.wcard[data-wc="${id}"]`); if (card) card.style.fontSize = w.fs + 'px'; }
      if (ev.target.matches('[data-wccolx]')) { w.color = ev.target.value; saveQuotes(); rerender(); }
    });
  });
}
/* تصميم الجدار نفسه */
function mhWallSkin() {
  const c = wallCfg();
  sheet(`<h3>${MHI.wall} تصميم الجدار</h3>
    <div class="field"><label>خلفيّة الجدار</label>
      <div class="wallbgs">${WALL_BG.map(([k, n, css, fg]) =>
        `<button class="wallbg ${c.bg === k ? 'on' : ''}" data-wbg="${k}" style="background:${css.split(',')[0]};color:${fg}">${n}</button>`).join('')}</div></div>
    <p class="mhnote">تختار من هنا شكل الجدار، ومن كلّ بطاقة تصميمها الخاصّ.</p>
    <div class="sheetrow"><button class="btn pri" onclick="closeSheet()">${ICON.chk} تمّ</button></div>`, el => {
    el.addEventListener('click', ev => { const b = ev.target.closest('[data-wbg]'); if (!b) return;
      c.bg = b.dataset.wbg; saveWallCfg(c); el.querySelectorAll('[data-wbg]').forEach(x => x.classList.toggle('on', x === b));
      const cv = document.querySelector('.wallfull'); if (cv) cv.style.cssText = wallBgCSS(c.bg);
      const home = document.querySelector('.wallhome'); if (home) home.style.cssText = wallBgCSS(c.bg); });
  });
}
/* أحداث الجدار */
document.addEventListener('click', async ev => {
  if (ev.target.closest('[data-wallopen]')) { mhWallFull(); return; }
  const filt = ev.target.closest('[data-wfilt]');
  if (filt) { S.set('wallFilt', filt.dataset.wfilt); const m = ev.target.closest('.mhmodal'); if (m) m.close(); mhWallFull(); return; }
  if (ev.target.closest('[data-wskin]')) { mhWallSkin(); return; }
  const add = ev.target.closest('[data-wadd]');
  if (add) {
    if (add.dataset.wadd === 'img') {
      const files = await mhPickFile('image/*', true); if (!files || !files.length) return;
      for (const f of files) { const small = await shrinkImg(f, 1400); const key = uid('wq'); await putFile(key, small);
        quotes.unshift({ id: uid('q'), t: '', img: key, onwall: true, c: 0, w: { style: 'polaroid', x: 10 + Math.random() * 40, y: 10 + Math.random() * 40, wd: 40 } }); }
      saveQuotes(); const m = ev.target.closest('.mhmodal'); if (m) m.close(); mhWallFull();
    } else {
      mhModal(`<div class="mhvhead"><b>${ICON.quote} اقتباس على الجدار</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
        <div class="field"><textarea id="wqT" dir="rtl" placeholder="اكتب الاقتباس أو الخاطرة…"></textarea></div>
        <div class="field"><input type="text" id="wqS" dir="rtl" placeholder="المصدر (اختياري)"></div>
        <div class="sheetrow"><button class="btn pri" data-wqadd="1">${ICON.plus} أضف إلى الجدار</button></div>`, m => {
        setTimeout(() => m.querySelector('#wqT').focus(), 80);
        m.querySelector('[data-wqadd]').onclick = () => { const t = m.querySelector('#wqT').value.trim(); if (!t) return;
          quotes.unshift({ id: uid('q'), t, src: m.querySelector('#wqS').value.trim(), onwall: true, c: Math.floor(Math.random() * 5), w: { style: 'sticky', x: 8 + Math.random() * 45, y: 8 + Math.random() * 40, wd: 40 } });
          saveQuotes(); m.close(); const mo = document.querySelector('.wallfull'); if (mo) mhWallFull(); };
      });
    }
    return;
  }
});
/* استبدل ورقة البانر القديمة بجدار الصفحة الأولى */
bannerNote = function () { return uiOn('wall') ? mhWallHomeCard() : ''; };
