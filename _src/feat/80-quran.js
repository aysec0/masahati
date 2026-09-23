/* ================================================================
   المصحف: اقتراحان جاهزان للتحميل من تيليجرام، ورابط، ورفعٌ من الجهاز،
   وقسم القرّاء: كل قارئ ١١٤ سورة تُنزَّل من المصدر الرسميّ سورةً سورة.
   وأذكار الصباح والمساء بزرٍّ وملفٍّ افتراضيّ مرفق.
   ================================================================ */
const QURAN_TG = [
  ['عادي', 'مصحف عاديّ (رسم عثمانيّ)', 'https://t.me/quran_pdf_free/386'],
  ['tafsir', 'مصحف بالكلمات ومعانيها', 'https://t.me/quran_pdf_free/371']
];
/* أزرار الاقتراحات داخل صفحة «المصحف لم يُرفع» */
const _mhQuranEmpty = (typeof quranEmpty === 'function') ? quranEmpty : null;
if (_mhQuranEmpty) quranEmpty = function (it) {
  return `<div class="pcardx" style="margin:14px 16px">
    <b style="font-size:14px">أضِف المصحف</b>
    <p class="mhnote" style="margin:6px 0 10px">اختر نسخةً جاهزة فتُفتح رسالتها في تيليجرام، حمّل الملفّ منها ثمّ ارفعه هنا. أو ارفع مصحفك أنت.</p>
    <div class="qsug">${QURAN_TG.map(([k, n, u]) => `<a class="qsugbtn" href="${u}" target="_blank" rel="noopener"><span>${MHI.book2}</span><b>${n}</b><small>يفتح في تيليجرام لتحميله</small></a>`).join('')}</div>
    <div class="sheetrow" style="margin:10px 0 0">
      <button class="btn pri" data-qr="up">${ICON.plus} ارفع ملفّ المصحف</button>
      <button class="btn" data-qr="link">${MHI.link} من رابط مباشر</button>
      <button class="btn" data-qr="try">${MHI.cloud} اجلبه من الاستضافة</button>
    </div>
    <p class="mhnote" style="margin-top:8px">أو ضع ملفًّا اسمه <b dir="ltr">quran.pdf</b> بجانب الموقع في استضافتك فيُجلب تلقائيًّا.</p>
  </div>`;
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-qr="link"]'); if (!b) return;
  mhModal(`<div class="mhvhead"><b>${MHI.link} مصحف من رابط</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <div class="field"><label>رابط ملفّ PDF مباشر</label><input type="url" id="qLink" dir="ltr" placeholder="https://…/quran.pdf"></div>
    <div class="sheetrow"><button class="btn pri" data-ql="1">${ICON.dl} نزّله واحفظه</button></div>
    <p class="mhnote" id="qLinkSt"></p>`, m => {
    m.querySelector('[data-ql]').onclick = async () => {
      const u = m.querySelector('#qLink').value.trim(); if (!u) return;
      const st = m.querySelector('#qLinkSt'); st.textContent = 'أنزّل الملفّ…';
      try {
        let blob = null; try { const r = await fetch(u); if (r.ok) blob = await r.blob(); } catch (e) {}
        if (!blob) blob = await grab(u, false, 40000);
        if (!blob || blob.size < 1000) throw new Error('الملفّ فارغ');
        await putFile('fquran', blob);
        const it = (findItem(QURAN_ID) || {}).it; if (it) { it.file = 'fquran'; it.size = blob.size; saveTree(); }
        st.textContent = 'حُفظ المصحف'; m.close(); render(); toast('حُفظ المصحف في جهازك');
      } catch (e) { st.textContent = 'تعذّر: ' + (e.message || e) + ' — جرّب رفعه من جهازك.'; }
    };
  });
});

/* ================================================================
   قسم القرّاء: صوتيّات المصحف سورةً سورة، تُنزَّل للاستماع بلا إنترنت
   ================================================================ */
let mhQari = S.get('qari', {});            /* rid -> {surah: fileKey} */
const saveQari = () => S.set('qari', mhQari);
function mhQariNum(n) { return String(n).padStart(3, '0'); }
function mhQariUrl(rec, n) { return rec.s.replace(/\/?$/, '/') + mhQariNum(n) + '.mp3'; }
function mhQariHave(rid) { return mhQari[rid] || {}; }

mhRoute(h => h === '#/qari', () => {
  return `${head('القرّاء', `${helpBtn ? '' : ''}<a class="chip" href="#/lib">${ICON.back} المكتبة</a>`)}
    <p class="mhnote" style="margin:0 16px 12px">مصاحف كاملة لأشهر القرّاء. ادخل على قارئ ونزّل ما تريد من السور لتستمع إليها بلا إنترنت.</p>
    <div class="qarigrid">${QARIS.map(r => {
      const n = Object.keys(mhQariHave(r.id)).length;
      return `<a class="qaricard" href="#/qari/${r.id}">
        <span class="qariav">${MHI.headph}</span>
        <div><b>${esc(r.n)}</b><small>${n ? AR(n) + ' سورة محفوظة' : '١١٤ سورة'}</small></div>
        ${n ? `<span class="qaridot">${AR(n)}</span>` : ''}</a>`;
    }).join('')}</div>`;
});
mhRoute(h => /^#\/qari\/[^/]+$/.test(h), h => {
  const rid = h.split('/')[2], rec = QARIS.find(r => r.id === rid);
  if (!rec) return `<div class="empty">القارئ غير موجود.</div>`;
  const have = mhQariHave(rid);
  return `${head(rec.n, `<a class="chip" href="#/qari">${ICON.back} القرّاء</a>`)}
    <div class="qhead">
      <button class="btn pri" data-qall="${rid}">${mhQariJob && mhQariJob.rid === rid ? 'إيقاف التنزيل' : ICON.dl + ' نزّل المصحف كاملًا'}</button>
      <button class="btn" data-qplayall="${rid}">${MHI.play} استمع بالترتيب</button>
      <span class="mhnote" id="qAllSt" style="flex:1 1 100%"></span>
    </div>
    <div class="suralist">${SURAS.map((s, i) => {
      const n = i + 1, key = have[n];
      return `<div class="surarow ${key ? 'have' : ''}" data-sr="${rid}:${n}">
        <span class="surano">${AR(n)}</span>
        <button class="surplay" data-qplay="${rid}:${n}" ${key ? '' : 'disabled'}>${MHI.play}</button>
        <b class="suran">سورة ${esc(s)}</b>
        ${key ? `<span class="surhave">✓ محفوظة</span><button class="lnk danger" data-qdel="${rid}:${n}">${MHI.trash}</button>`
          : `<button class="lnk" data-qget="${rid}:${n}">${ICON.dl} تنزيل</button>`}
      </div>`;
    }).join('')}</div>`;
});
/* تنزيل سورة */
async function mhQariGet(rid, n, silent) {
  const rec = QARIS.find(r => r.id === rid); if (!rec) return false;
  const row = document.querySelector(`[data-sr="${rid}:${n}"]`);
  if (row) row.classList.add('getting');
  try {
    let blob = null; try { const r = await fetch(mhQariUrl(rec, n)); if (r.ok) blob = await r.blob(); } catch (e) {}
    if (!blob) blob = await grab(mhQariUrl(rec, n), false, 60000);
    if (!blob || blob.size < 2000) throw new Error('فارغ');
    const key = 'qf_' + rid + '_' + n; await putFile(key, blob);
    mhQari[rid] = mhQari[rid] || {}; mhQari[rid][n] = key; saveQari();
    if (!silent && location.hash === '#/qari/' + rid) render();
    return true;
  } catch (e) { if (row) row.classList.remove('getting'); if (!silent) toast('تعذّر تنزيل السورة — تحقّق من الاتصال'); return false; }
}
function mhQariLib(rec, n, key, size) {
  const secId = 'secQari_' + rec.id;
  const sec = mhSecEnsure(secId, 'صوتيّات: ' + rec.n, { qari: rec.id });
  if (sec.items.some(x => x.surah === n)) return;
  sec.items.push({ id: uid('i'), type: 'audio', name: 'سورة ' + SURAS[n - 1], surah: n, file: key, size, mime: 'audio/mpeg', reciter: rec.n });
  sec.items.sort((a, b) => (a.surah || 0) - (b.surah || 0));
  saveTree();
}
document.addEventListener('click', async ev => {
  const g = ev.target.closest('[data-qget]');
  if (g) { const [rid, n] = g.dataset.qget.split(':'); g.textContent = '…'; await mhQariGet(rid, +n); return; }
  const d = ev.target.closest('[data-qdel]');
  if (d) { const [rid, n] = d.dataset.qdel.split(':'); const key = (mhQari[rid] || {})[n];
    if (key) dropFile(key); delete mhQari[rid][n]; saveQari();
    render(); return; }
  const p = ev.target.closest('[data-qplay]');
  if (p) { const [rid, n] = p.dataset.qplay.split(':'); const rec = QARIS.find(r => r.id === rid);
    if (!(mhQari[rid] || {})[+n]) { toast('السورة غير محفوظة في هذا المتصفّح'); return; }
    if (rec) mhQPlay(rec, +n); return; }
  const all = ev.target.closest('[data-qall]');
  if (all) { mhQariAll(all.dataset.qall); return; }
  const pa = ev.target.closest('[data-qplayall]');
  if (pa) { const rid = pa.dataset.qplayall; const have = Object.keys(mhQariHave(rid)).map(Number).sort((a, b) => a - b);
    if (!have.length) { toast('نزّل بعض السور أوّلًا'); return; }
    const rec = QARIS.find(r => r.id === rid); if (rec) mhQPlay(rec, have[0]); return; }
});
/* تنزيل المصحف كاملًا: سورةً بعد سورة، ويمكن إيقافه */
let mhQariJob = null;
async function mhQariAll(rid) {
  if (mhQariJob) { mhQariJob.stop = true; return; }
  const rec = QARIS.find(r => r.id === rid); const st = document.getElementById('qAllSt');
  const have = mhQariHave(rid);
  const todo = []; for (let n = 1; n <= 114; n++) if (!have[n]) todo.push(n);
  if (!todo.length) { if (st) st.textContent = 'المصحف كامل عندك ✓'; return; }
  mhQariJob = { rid, stop: false };
  const btn = document.querySelector(`[data-qall="${rid}"]`); if (btn) btn.textContent = 'إيقاف التنزيل';
  let done = 0;
  for (const n of todo) {
    if (mhQariJob.stop) break;
    if (st) st.textContent = `أنزّل سورة ${SURAS[n - 1]}… (${AR(done + 1)} من ${AR(todo.length)})`;
    const ok = await mhQariGet(rid, n, true); if (ok) done++;
    const row = document.querySelector(`[data-sr="${rid}:${n}"]`);
    if (row && ok) { row.classList.remove('getting'); row.classList.add('have');
      row.innerHTML = `<span class="surano">${AR(n)}</span><button class="surplay" data-qplay="${rid}:${n}">${MHI.play}</button>
        <b class="suran">سورة ${esc(SURAS[n - 1])}</b><span class="surhave">✓ محفوظة</span><button class="lnk danger" data-qdel="${rid}:${n}">${MHI.trash}</button>`; }
  }
  const stopped = mhQariJob.stop; mhQariJob = null;
  if (btn) btn.textContent = ICON.dl.replace(/^/, '') + ' نزّل المصحف كاملًا', btn.innerHTML = `${ICON.dl} نزّل المصحف كاملًا`;
  if (st) st.textContent = stopped ? `توقّف — حُفظت ${AR(done)} سورة` : `اكتمل المصحف — ${AR(done)} سورة جديدة ✓`;
  if (location.hash === '#/qari/' + rid) render();
}
/* زرّ القرّاء داخل قسم المصحف */
mhAfter(h => {
  if (!h.startsWith('#/s/secQuran') && h !== '#/lib') return;
  const host = document.querySelector('.seclinks') || document.querySelector('main .sechead');
});

/* ما نُزّل من القرّاء يبقى في قسم القرّاء وحده — ونزيل ما أُنشئ سابقًا في المكتبة (الملفّات تبقى) */
(function () {
  const n0 = tree.length;
  tree = tree.filter(s => !String(s.id).startsWith('secQari_'));
  if (tree.length !== n0) saveTree();
})();

/* ================================================================
   الاستماع في صفحة المصحف: اختر القارئ والسورة واضغط — بلا تنزيل
   ================================================================ */
const SURA_START = [1,2,50,77,106,128,151,177,187,208,221,235,249,255,262,267,282,293,305,312,322,332,342,350,359,367,377,385,396,404,411,415,418,428,434,440,446,453,458,467,477,483,489,496,499,502,507,511,515,518,520,523,526,528,531,534,537,542,545,549,551,553,554,556,558,560,562,564,566,568,570,572,574,575,577,578,580,582,583,585,586,587,587,589,590,591,591,592,593,594,595,595,596,596,597,597,598,598,599,599,600,600,601,601,601,602,602,602,603,603,603,604,604,604];
function mhSurahAtPage(p) {
  const q = (p || 1) - (+S.get('qOff', 0) || 0);
  let n = 1; for (let i = 0; i < 114; i++) if (SURA_START[i] <= q) n = i + 1; else break;
  return n;
}
function mhQSel() { return S.get('qariSel', null) || QARIS[0]; }
let MHQ = null;                      /* ما يُسمع الآن {rec, n} */
async function mhQPlay(rec, n) {
  n = Math.max(1, Math.min(114, n));
  const have = (mhQari[rec.id] || {})[n];
  let src = mhQariUrl(rec, n);
  if (have) { const u = await fileURL(have); if (u) src = u; }
  try { if (typeof current !== 'undefined') current = null; } catch (e) {}
  MHQ = { rec, n };
  au.src = src; au.playbackRate = S.get('rate', 1);
  P.el.classList.add('up');
  P.title.innerHTML = `<b>سورة ${esc(SURAS[n - 1])}</b><small>${esc(rec.n)}</small>`;
  P.title.href = '#/i/' + QURAN_ID;
  try { if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: 'سورة ' + SURAS[n - 1], artist: rec.n, album: 'المصحف' }); } catch (e) {}
  au.play().catch(() => toast('اضغط ▶ في المشغّل'));
  mhQBarSync();
}
/* بعد انتهاء السورة: التي تليها (إن شئت) */
au.addEventListener('ended', () => {
  if (!MHQ || !au.src) return;
  if (S.get('qCont', true) && MHQ.n < 114) mhQPlay(MHQ.rec, MHQ.n + 1); else { MHQ = null; mhQBarSync(); }
});
au.addEventListener('play', mhQBarSync); au.addEventListener('pause', mhQBarSync);
function mhQBarHTML() {
  const rec = mhQSel();
  const box = document.getElementById('pdfbox');
  const cur = MHQ ? MHQ.n : mhSurahAtPage(box && box.__pdf ? pageAtTop(box) : wirdAt());
  const playing = MHQ && !au.paused;
  return `<div class="qlisten" id="qListen">
    <button class="qlplay ${playing ? 'on' : ''}" data-ql="play" aria-label="استمع">${playing ? MHI.stop : MHI.play}</button>
    <div class="qlmid">
      <button class="qlrec" data-ql="rec">${MHI.headph}<span>${esc(rec.n)}</span>▾</button>
      <select class="qlsura" data-ql="sura">${SURAS.map((s, i) => `<option value="${i + 1}" ${i + 1 === cur ? 'selected' : ''}>${AR(i + 1)} · ${s}</option>`).join('')}</select>
    </div>
    <button class="qlmore" data-ql="set" title="إعدادات">⚙</button>
  </div>`;
}
function mhQBarSync() {
  const b = document.getElementById('qListen'); if (!b) return;
  const playing = MHQ && !au.paused;
  const pl = b.querySelector('.qlplay'); pl.classList.toggle('on', !!playing); pl.innerHTML = playing ? MHI.stop : MHI.play;
  if (MHQ) { const s = b.querySelector('.qlsura'); if (s) s.value = MHQ.n; }
}
mhAfter(h => {
  if (h !== '#/i/' + QURAN_ID) return;
  if (document.getElementById('qListen')) return;
  const acts = document.querySelector('.panel .acts'); if (!acts) return;
  const d = document.createElement('div'); d.innerHTML = mhQBarHTML();
  acts.after(d.firstElementChild);
});
document.addEventListener('change', ev => {
  const s = ev.target.closest('[data-ql="sura"]'); if (!s) return;
  mhQPlay(mhQSel(), +s.value);
});
document.addEventListener('click', ev => {
  const b = ev.target.closest('#qListen [data-ql]'); if (!b) return;
  const k = b.dataset.ql;
  if (k === 'play') {
    if (MHQ && au.src) { if (au.paused) au.play(); else au.pause(); return; }
    mhQPlay(mhQSel(), +document.querySelector('#qListen .qlsura').value); return;
  }
  if (k === 'rec') { mhQPickReciter(); return; }
  if (k === 'set') { mhQSettings(); return; }
});
/* اختيار القارئ: المشهورون أوّلًا، والبحث في كل القرّاء (أكثر من ٢٠٠) */
let mhAllQari = null;
async function mhQLoadAll() {
  if (mhAllQari) return mhAllQari;
  const r = await fetch('https://www.mp3quran.net/api/v3/reciters?language=ar');
  const j = await r.json(); const out = [];
  j.reciters.forEach(x => (x.moshaf || []).forEach(m => { if (m.surah_total >= 100)
    out.push({ id: x.id + '_' + m.id, n: x.name + (x.moshaf.length > 1 ? ' — ' + m.name.split(' - ')[0] : ''), s: m.server, list: m.surah_list }); }));
  mhAllQari = out; return out;
}
function mhQPickReciter() {
  const sel = mhQSel();
  const row = r => `<button class="qpr ${r.id === sel.id ? 'on' : ''}" data-qpr='${esc(JSON.stringify({ id: r.id, n: r.n, s: r.s }))}' data-q="${esc(norm(r.n))}">${MHI.headph}<span>${esc(r.n)}</span></button>`;
  mhModal(`<div class="mhvhead"><b>${MHI.headph} اختر القارئ</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <div class="sbox"><input type="text" id="qpQ" placeholder="ابحث باسم القارئ…">${ICON.search}</div>
    <div class="qprlist" id="qpList">${QARIS.map(row).join('')}</div>
    <button class="btn" id="qpAll" style="width:100%;justify-content:center;margin-top:8px">كل القرّاء (أكثر من ٢٠٠)</button>
    <p class="mhnote" id="qpSt"></p>`, m => {
    const list = m.querySelector('#qpList');
    const filter = () => { const v = norm(m.querySelector('#qpQ').value.trim());
      list.querySelectorAll('.qpr').forEach(b => b.style.display = !v || b.dataset.q.includes(v) ? '' : 'none'); };
    m.querySelector('#qpQ').oninput = filter;
    m.querySelector('#qpAll').onclick = async () => {
      const st = m.querySelector('#qpSt'); st.textContent = 'أجلب القائمة…';
      try { const all = await mhQLoadAll(); list.innerHTML = all.map(row).join(''); st.textContent = AR(all.length) + ' مصحفًا'; m.querySelector('#qpAll').remove(); filter(); }
      catch (e) { st.textContent = 'تعذّر جلب القائمة — تحقّق من الاتصال'; }
    };
    list.addEventListener('click', ev => {
      const b = ev.target.closest('[data-qpr]'); if (!b) return;
      const r = JSON.parse(b.dataset.qpr); S.set('qariSel', r); m.close();
      const bar = document.getElementById('qListen');
      if (bar) { const d = document.createElement('div'); d.innerHTML = mhQBarHTML(); bar.replaceWith(d.firstElementChild); }
      if (MHQ) mhQPlay(r, MHQ.n); else toast('القارئ: ' + r.n);
    });
  });
}
function mhQSettings() {
  mhModal(`<div class="mhvhead"><b>⚙ الاستماع</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <div class="urow"><span class="ulbl">إذا انتهت السورة فشغّل التي تليها</span><button class="usw ${S.get('qCont', true) ? 'on' : ''}" id="qsCont"></button></div>
    <div class="field" style="margin-top:10px"><label>رقم صفحة الفاتحة في ملفّ مصحفك</label>
      <input type="number" id="qsOff" min="1" max="40" value="${(+S.get('qOff', 0) || 0) + 1}">
      <p class="mhnote">لتُختار سورة الصفحة التي تقرؤها تلقائيًّا. إن كان ملفّك يبدأ بغلافٍ أو مقدّمة فاكتب رقم الصفحة التي فيها الفاتحة.</p></div>
    <div class="sheetrow"><button class="btn pri" id="qsSave">${ICON.chk} احفظ</button>
      <a class="btn" href="#/qari">${ICON.dl} نزّل سورًا للاستماع بلا إنترنت</a></div>`, m => {
    m.querySelector('#qsCont').onclick = e => e.target.classList.toggle('on');
    m.querySelector('#qsSave').onclick = () => {
      S.set('qCont', m.querySelector('#qsCont').classList.contains('on'));
      S.set('qOff', Math.max(0, (+m.querySelector('#qsOff').value || 1) - 1));
      m.close(); const bar = document.getElementById('qListen');
      if (bar) { const d = document.createElement('div'); d.innerHTML = mhQBarHTML(); bar.replaceWith(d.firstElementChild); }
    };
  });
}
/* في وضع القراءة بملء الشاشة: زرّ الاستماع في الأعلى */
const _mhRdBarsQ = rdBars;
rdBars = function () {
  _mhRdBarsQ.apply(this, arguments);
  const box = RD.box; if (!box || box.dataset.item !== QURAN_ID) return;
  const top = document.getElementById('rdTop'); if (!top || top.querySelector('[data-rdq]')) return;
  const b = document.createElement('button'); b.className = 'rb'; b.dataset.rdq = '1'; b.title = 'استمع'; b.innerHTML = MHI.headph;
  const more = top.querySelector('[data-rd="more"]'); if (more) more.before(b); else top.appendChild(b);
};
document.addEventListener('click', ev => {
  if (!ev.target.closest('[data-rdq]')) return;
  const box = document.getElementById('pdfbox');
  if (MHQ && au.src && !au.paused) { au.pause(); rdTip('أُوقف'); return; }
  const n = MHQ ? MHQ.n : mhSurahAtPage(box ? pageAtTop(box) : 1);
  mhQPlay(mhQSel(), n); rdTip('سورة ' + SURAS[n - 1] + ' — ' + mhQSel().n);
});

/* ملفّات السور المنزَّلة تدخل النسخة الشاملة (فهرسها فيها، فلا تبقى بلا ملفّات بعد الاستعادة) */
const _mhBkKeysQ = bkFileKeys;
bkFileKeys = function () {
  const k = new Set(_mhBkKeysQ());
  try { Object.values(mhQari).forEach(o => Object.values(o || {}).forEach(x => { if (x) k.add(x); })); } catch (e) {}
  return [...k];
};
