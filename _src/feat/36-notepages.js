/* ================================================================
   فوائد المقرَّر كدفتر: كل فائدة في صفحة صغيرة، وزرّ «فائدة جديدة»
   يقلب إلى صفحة بيضاء. تُحفظ الصفحات معًا في notes[id] يفصل بينها <hr>،
   فتبقى بقيّة الموقع (البحث، فوائدي، البطاقات، التصدير) تعمل كما هي.
   ================================================================ */
ALLOWED.HR = 1;                       /* لا يمسح التنظيفُ الفاصلَ بين الصفحات */
const NP_SPLIT = /<hr\s*\/?>/i;
const NP_IC = {
  prev: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>'
};
function npPages(id) {
  const p = String(notes[id] || '').split(NP_SPLIT).map(s => s.trim()).filter(s => noteText(s));
  return p.length ? p : [''];
}
let NPCUR = {};                       /* آخر صفحة فتحتها لكل مقرَّر (في هذه الجلسة) */
let NP_FLUSH = null;                  /* آخر دالّة حفظ مربوطة بتغيّر المسار */

mhAfter(h => {
  if (!/^#\/i\//.test(h)) return;
  const old = document.getElementById('noteBox'); if (!old || old.closest('.npw')) return;
  const id = old.dataset.note; if (!id) return;
  const field = old.parentElement;
  /* شريط التنسيق القديم مربوط بالمحرِّر القديم — نستبدله بنسخة نظيفة */
  const oldTools = field.querySelector('.rtools');
  const tools = oldTools ? oldTools.cloneNode(true) : null;
  if (oldTools) oldTools.replaceWith(tools);
  const lbl = field.querySelector('label'); if (lbl) lbl.textContent = 'فوائدي من هذا المقرَّر — كل فائدة في صفحة';

  const pages = npPages(id);
  let cur = Math.min(NPCUR[id] != null ? NPCUR[id] : pages.length - 1, pages.length - 1);

  const w = document.createElement('div'); w.className = 'npw';
  w.innerHTML = `
    <div class="nppaper">
      <div class="nptop"><span class="npno"></span><span style="flex:1"></span>
        <button type="button" class="npic" data-np="del" title="احذف هذه الصفحة">${NP_IC.del}</button></div>
      <div class="rich npg" id="noteBox" data-note="${id}" contenteditable="true" dir="rtl" data-ph="اكتب فائدة…"></div>
    </div>
    <div class="npnav">
      <button type="button" class="npic" data-np="prev" title="الصفحة السابقة">${NP_IC.prev}</button>
      <span class="npdots"></span>
      <button type="button" class="npic" data-np="next" title="الصفحة التالية">${NP_IC.next}</button>
      <span style="flex:1"></span>
      <button type="button" class="btn pri npnew" data-np="new">${NP_IC.plus} فائدة جديدة</button>
    </div>`;
  old.replaceWith(w);
  const ed = w.querySelector('#noteBox'), paper = w.querySelector('.nppaper');
  const st = () => document.getElementById('nstate');

  const show = anim => {
    ed.innerHTML = noteHtml(pages[cur] || '');
    NPCUR[id] = cur;
    w.querySelector('.npno').textContent = 'صفحة ' + AR(cur + 1) + ' من ' + AR(pages.length);
    const n = pages.length, dots = n <= 9
      ? pages.map((_, i) => `<i class="${i === cur ? 'on' : ''}" data-npgo="${i}"></i>`).join('')
      : `<b>${AR(cur + 1)} / ${AR(n)}</b>`;
    w.querySelector('.npdots').innerHTML = dots;
    w.querySelector('[data-np="prev"]').disabled = cur === 0;
    w.querySelector('[data-np="next"]').disabled = cur === n - 1;
    if (anim) { paper.classList.remove('np-l', 'np-r'); void paper.offsetWidth; paper.classList.add(anim); }
  };
  let t = null;
  const persist = () => {
    const keep = pages.map(p => clean(p)).filter(p => noteText(p));
    const v = keep.join('<hr>');
    if (v === (notes[id] || '')) return;
    if (v) { notes[id] = v; try { touchNote(id); } catch (e) {} } else delete notes[id];
    saveNotes();
  };
  const save = () => {
    if (st()) st().textContent = 'جارٍ الحفظ…';
    clearTimeout(t);
    t = setTimeout(() => { pages[cur] = clean(ed.innerHTML); persist(); if (st()) st().textContent = 'محفوظة ✓'; }, 400);
  };
  const flush = () => { clearTimeout(t); pages[cur] = clean(ed.innerHTML); persist(); };
  bindRich(tools || field, ed, save);

  const go = (i, anim) => {
    flush();
    /* صفحةٌ فارغة تركتها لا تبقى */
    if (!noteText(pages[cur]) && pages.length > 1) { pages.splice(cur, 1); if (i > cur) i--; }
    cur = Math.max(0, Math.min(i, pages.length - 1)); show(anim);
  };
  const newPage = () => {
    flush();
    if (!noteText(pages[cur])) { ed.focus(); toast('اكتب في هذه الصفحة أوّلًا'); return; }
    const empty = pages.findIndex(p => !noteText(p));
    if (empty >= 0) pages.splice(empty, 1);
    pages.push(''); cur = pages.length - 1; show('np-l');
    ed.focus();
  };
  w.addEventListener('click', ev => {
    const d = ev.target.closest('[data-npgo]');
    if (d) { const i = +d.dataset.npgo; if (i !== cur) go(i, i > cur ? 'np-l' : 'np-r'); return; }
    const b = ev.target.closest('[data-np]'); if (!b || b.disabled) return;
    const k = b.dataset.np;
    if (k === 'prev') go(cur - 1, 'np-r');
    else if (k === 'next') go(cur + 1, 'np-l');
    else if (k === 'new') newPage();
    else if (k === 'del') {
      flush();
      if (noteText(pages[cur]) && !confirm('تحذف هذه الفائدة؟')) return;
      pages.splice(cur, 1); if (!pages.length) pages.push('');
      cur = Math.min(cur, pages.length - 1); persist(); show('np-r'); toast('حُذفت الصفحة');
    }
  });
  /* Ctrl/⌘ + Enter = فائدة جديدة */
  ed.addEventListener('keydown', ev => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); newPage(); } });
  /* سحب أفقي على شريط الصفحات يقلب */
  let sx = null;
  const nav = w.querySelector('.npnav');
  nav.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  nav.addEventListener('touchend', e => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) < 50) return;
    if (dx > 0 && cur < pages.length - 1) go(cur + 1, 'np-l'); else if (dx < 0 && cur > 0) go(cur - 1, 'np-r');
  });
  if (NP_FLUSH) removeEventListener('hashchange', NP_FLUSH);
  NP_FLUSH = flush; addEventListener('hashchange', flush, { once: true });
  show();
});
