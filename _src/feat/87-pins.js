/* ================================================================
   التثبيت في المكتبة: خمسة أقسام وخمسة ملفّات في الأعلى، بالترتيب الذي تريده
   ================================================================ */
const PIN_MAX = 5;
function pinS() { return (S.get('pinS', []) || []).filter(id => findSec(id)); }
function pinF() { return (S.get('pinF', []) || []).filter(id => findItem(id)); }
function pinToggle(kind, id) {
  const key = kind === 's' ? 'pinS' : 'pinF';
  let list = kind === 's' ? pinS() : pinF();
  if (list.includes(id)) { list = list.filter(x => x !== id); S.set(key, list); toast('أُلغي التثبيت'); return false; }
  if (list.length >= PIN_MAX) { toast('ثبّتّ ' + AR(PIN_MAX) + ' — ألغِ واحدًا أوّلًا'); return null; }
  list.push(id); S.set(key, list); toast('ثُبِّت في أعلى المكتبة'); return true;
}
const PIN_IC = '<svg viewBox="0 0 24 24"><path d="M9 4h6l-1 6 4 3v2h-5v5l-1 1-1-1v-5H6v-2l4-3z"/></svg>';

/* زرّ التثبيت في صفّ كل ملفّ */
const _mhItemRow = itemRow;
itemRow = function (it) {
  let html = _mhItemRow.apply(this, arguments);
  const on = pinF().includes(it.id);
  const btn = `<button class="favbtn pinbtn ${on ? 'on' : ''}" data-pinf="${it.id}" title="${on ? 'ألغِ التثبيت' : 'ثبّت في أعلى المكتبة'}">${PIN_IC}</button>`;
  return html.replace(/(<button class="favbtn" data-edititem=)/, btn + '$1');
};
document.addEventListener('click', ev => {
  const f = ev.target.closest('[data-pinf]');
  if (f) { ev.preventDefault(); ev.stopPropagation(); const r = pinToggle('f', f.dataset.pinf); if (r !== null) { f.classList.toggle('on', r); if (location.hash === '#/lib') render(); } return; }
  const s = ev.target.closest('[data-pins]');
  if (s) { ev.preventDefault(); ev.stopPropagation(); const r = pinToggle('s', s.dataset.pins); if (r !== null) render(); return; }
  if (ev.target.closest('[data-pinarr]')) pinArrange();
}, true);

/* المكتبة: المثبّت أوّلًا */
mhAfter(h => {
  if (h !== '#/lib') return;
  const view = document.getElementById('view'); if (!view) return;
  const ps = pinS(), pf = pinF();
  /* الأقسام: زرّ تثبيت على كلّ بطاقة، والمثبّتة أوّلًا بترتيبها */
  const grid = view.querySelector('[data-sortlist="secs"]');
  if (grid) {
    grid.querySelectorAll('.tile[data-sortid]').forEach(t => {
      const id = t.dataset.sortid, on = ps.includes(id);
      t.classList.toggle('pinned', on);
      if (!t.querySelector('[data-pins]')) {
        const b = document.createElement('button'); b.className = 'favbtn pinbtn' + (on ? ' on' : ''); b.dataset.pins = id;
        b.title = on ? 'ألغِ التثبيت' : 'ثبّت القسم في الأعلى'; b.innerHTML = PIN_IC;
        const more = t.querySelector('[data-editsec]'); if (more) more.before(b); else t.appendChild(b);
      }
    });
    [...ps].reverse().forEach(id => { const t = grid.querySelector(`.tile[data-sortid="${id}"]`); if (t) grid.prepend(t); });
  }
  /* الملفّات المثبّتة: شريطٌ في الأعلى */
  if ((pf.length || ps.length) && !view.querySelector('.pinwrap')) {
    const w = document.createElement('div'); w.className = 'pinwrap';
    w.innerHTML = `<div class="sechead" style="margin-top:4px"><h2>${PIN_IC} المثبّتة</h2><div class="ln"></div>
        <button data-pinarr="1">رتّبها</button></div>
      ${pf.length ? `<div class="rows one">${pf.map(id => itemRow(findItem(id).it)).join('')}</div>` : '<p class="mhnote" style="margin:0 0 6px">ثبّت ملفًّا من زرّ الدبّوس بجانبه.</p>'}`;
    const anchor = view.querySelector('.libtiles') || view.querySelector('.sechead');
    if (anchor) anchor.after(w); else view.prepend(w);
  }
});
/* ترتيب المثبّتات */
function pinArrange() {
  const row = (kind, id, i, n) => {
    const name = kind === 's' ? (findSec(id) || {}).name : (findItem(id) || { it: {} }).it.name;
    return `<div class="pinrow2" data-k="${kind}" data-id="${id}"><span class="nbano">${AR(i + 1)}</span><b>${esc(name || '')}</b>
      <button class="mhico" data-pmv="-1" ${i === 0 ? 'disabled' : ''}>${MHI.up}</button>
      <button class="mhico" data-pmv="1" ${i === n - 1 ? 'disabled' : ''}>${MHI.down}</button>
      <button class="mhico" data-prm="1">${MHI.trash}</button></div>`;
  };
  const body = () => {
    const ps = pinS(), pf = pinF();
    return `<div class="mhvhead"><b>${PIN_IC} ترتيب المثبّتة</b><span style="flex:1"></span><button class="lnk" data-mhx="1">تمّ</button></div>
      <h4 class="pinh">الأقسام (${AR(ps.length)} من ${AR(PIN_MAX)})</h4>
      ${ps.length ? ps.map((id, i) => row('s', id, i, ps.length)).join('') : '<p class="mhnote">لا أقسام مثبّتة — اضغط الدبّوس على أيّ قسم.</p>'}
      <h4 class="pinh">الملفّات (${AR(pf.length)} من ${AR(PIN_MAX)})</h4>
      ${pf.length ? pf.map((id, i) => row('f', id, i, pf.length)).join('') : '<p class="mhnote">لا ملفّات مثبّتة — اضغط الدبّوس بجانب أيّ ملفّ.</p>'}`;
  };
  const m = mhModal(body(), { onClose: () => { if (location.hash === '#/lib') render(); } });
  m.addEventListener('click', ev => {
    const r = ev.target.closest('.pinrow2'); if (!r) return;
    const key = r.dataset.k === 's' ? 'pinS' : 'pinF', list = r.dataset.k === 's' ? pinS() : pinF(), i = list.indexOf(r.dataset.id);
    const mv = ev.target.closest('[data-pmv]');
    if (mv) { const j = i + (+mv.dataset.pmv); if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; S.set(key, list); }
    else if (ev.target.closest('[data-prm]')) { list.splice(i, 1); S.set(key, list); }
    else return;
    m.querySelector('.mhmcard').innerHTML = body();
  });
}
