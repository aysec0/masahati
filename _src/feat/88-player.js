/* ================================================================
   أوضاع التشغيل: قائمة صغيرة في المشغّل — بعد الانتهاء: توقّف / التالي /
   كرّر هذا / كرّر القسم / عشوائيّ، ومؤقّت نوم.
   ================================================================ */
const PM_IC = {
  once: '<svg viewBox="0 0 24 24"><path d="M5 12h11"/><path d="m12 7 5 5-5 5"/><path d="M20 6v12"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M4 7h10M4 12h10M4 17h6"/><path d="m16 14 4 3-4 3z"/></svg>',
  one: '<svg viewBox="0 0 24 24"><path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/><path d="M11.5 10.5 12.5 10v4.5"/></svg>',
  all: '<svg viewBox="0 0 24 24"><path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/></svg>',
  shuf: '<svg viewBox="0 0 24 24"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>'
};
const PM_MODES = [
  ['once', 'توقّف بعد انتهاء المقطع'],
  ['next', 'شغّل التالي في القسم'],
  ['one', 'كرّر هذا المقطع'],
  ['all', 'كرّر القسم كلّه'],
  ['shuf', 'عشوائيّ من القسم']
];
function pmMode() { const m = S.get('pMode', 'once'); return PM_IC[m] ? m : 'once'; }
let pmSleep = null;           /* {at: وقت الإيقاف} أو {end:true} = بعد انتهاء المقطع */
let pmSleepT = null;

/* الزرّ في المشغّل */
(function () {
  const row = document.querySelector('#player .prow'); if (!row) return;
  const b = document.createElement('button'); b.className = 'pbtn pmode'; b.id = 'pMode'; b.title = 'وضع التشغيل';
  const rate = document.getElementById('pRate'); row.insertBefore(b, rate);
  pmPaint();
})();
function pmPaint() {
  const b = document.getElementById('pMode'); if (!b) return;
  const m = pmMode();
  b.innerHTML = PM_IC[m] + (pmSleep ? '<i class="pmz"></i>' : '');
  b.classList.toggle('on', m !== 'once' || !!pmSleep);
  b.title = (PM_MODES.find(x => x[0] === m) || [])[1] || '';
}

/* القائمة المنسدلة */
function pmMenu() {
  let pop = document.getElementById('pmPop');
  if (pop) { pop.remove(); return; }
  pop = document.createElement('div'); pop.id = 'pmPop'; pop.className = 'pmpop';
  const fill = () => {
    const m = pmMode();
    const left = pmSleep && pmSleep.at ? Math.max(1, Math.round((pmSleep.at - Date.now()) / 60000)) : 0;
    pop.innerHTML = `<div class="pmh">بعد انتهاء المقطع</div>
      ${PM_MODES.map(([k, t]) => `<button class="pmi ${k === m ? 'on' : ''}" data-pm="${k}">${PM_IC[k]}<span>${t}</span></button>`).join('')}
      <div class="pmh">${PM_IC.moon} مؤقّت النوم${pmSleep ? ' — ' + (pmSleep.end ? 'بعد هذا المقطع' : 'بعد ' + AR(left) + ' د') : ''}</div>
      <div class="pmsl">${[15, 30, 45, 60].map(n => `<button data-pms="${n}">${AR(n)} د</button>`).join('')}
        <button data-pms="end" class="${pmSleep && pmSleep.end ? 'on' : ''}">نهاية المقطع</button>
        ${pmSleep ? '<button data-pms="0" class="off">إلغاء</button>' : ''}</div>`;
  };
  fill();
  document.getElementById('player').appendChild(pop);
  pop.addEventListener('click', ev => {
    ev.stopPropagation();
    const a = ev.target.closest('[data-pm]');
    if (a) { S.set('pMode', a.dataset.pm); pmPaint(); pop.remove(); toast(PM_MODES.find(x => x[0] === a.dataset.pm)[1]); return; }
    const s = ev.target.closest('[data-pms]');
    if (s) { pmSetSleep(s.dataset.pms); fill(); }
  });
  setTimeout(() => document.addEventListener('pointerdown', function off(e) {
    if (pop.contains(e.target) || e.target.closest('#pMode')) return;
    pop.remove(); document.removeEventListener('pointerdown', off, true);
  }, true), 0);
}
document.getElementById('pMode') && (document.getElementById('pMode').onclick = e => { e.stopPropagation(); pmMenu(); });

function pmSetSleep(v) {
  clearTimeout(pmSleepT); pmSleep = null;
  if (v === 'end') { pmSleep = { end: true }; toast('سيتوقّف بعد انتهاء هذا المقطع'); }
  else if (+v > 0) {
    pmSleep = { at: Date.now() + v * 60000 };
    pmSleepT = setTimeout(() => { au.pause(); pmSleep = null; pmPaint(); toast('أُوقف التشغيل — مؤقّت النوم'); }, v * 60000);
    toast('سيتوقّف بعد ' + AR(+v) + ' دقيقة');
  } else toast('أُلغي المؤقّت');
  pmPaint();
}

/* قائمة القسم الذي يعمل منه المقطع */
function pmList() {
  if (!current) return [];
  const r = findItem(current.id); if (!r) return [];
  const list = (r.sub ? r.sub.items : r.sec.items) || [];
  return list.filter(x => (x.type === 'audio' || x.type === 'video') && (x.file || x.url));
}
au.addEventListener('ended', () => {
  if (!current) return;                                   /* المصحف له مسلكه الخاصّ */
  if (pmSleep && pmSleep.end) { pmSleep = null; pmPaint(); return; }
  const m = pmMode(); if (m === 'once') return;
  if (m === 'one') { const id = current.id; setTimeout(() => play(id, 0), 60); return; }
  const pl = pmList(), i = pl.findIndex(x => x.id === current.id);
  if (!pl.length || i < 0) return;
  let n = null;
  if (m === 'next') n = pl[i + 1];
  else if (m === 'all') n = pl[(i + 1) % pl.length];
  else if (m === 'shuf') { const rest = pl.filter(x => x.id !== current.id); n = rest.length ? rest[Math.floor(Math.random() * rest.length)] : pl[i]; }
  if (!n) { toast('انتهى القسم'); return; }
  /* المقطع التالي يبدأ من أوّله إن كان قد انتهى سابقًا، وإلّا من حيث توقّفت */
  setTimeout(() => play(n.id, n.id === current.id ? 0 : (pos[n.id] || 0)), 60);
});

/* تشغيل مقطع من المكتبة يُنهي جلسة الاستماع للمصحف (فلا تعود السور بعده) */
const _pmPlay = play;
play = function (id) {
  if (typeof MHQ !== 'undefined' && MHQ) { MHQ = null; try { mhQBarSync(); } catch (e) {} }
  return _pmPlay.apply(this, arguments);
};
