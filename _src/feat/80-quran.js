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
      <button class="btn pri" data-qall="${rid}">${ICON.dl} نزّل المصحف كاملًا</button>
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
    /* اربطها بالمكتبة الصوتية للقارئ */
    mhQariLib(rec, n, key, blob.size);
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
    const sec = tree.find(s => s.id === 'secQari_' + rid); if (sec) { sec.items = sec.items.filter(x => x.surah !== +n); saveTree(); }
    render(); return; }
  const p = ev.target.closest('[data-qplay]');
  if (p) { const [rid, n] = p.dataset.qplay.split(':'); const key = (mhQari[rid] || {})[+n];
    if (!key) return; const b = await getFile(key); const rec = QARIS.find(r => r.id === rid);
    if (b) mhPlayBlob(b, 'سورة ' + SURAS[+n - 1], rec.n); return; }
  const all = ev.target.closest('[data-qall]');
  if (all) { mhQariAll(all.dataset.qall); return; }
  const pa = ev.target.closest('[data-qplayall]');
  if (pa) { const rid = pa.dataset.qplayall; const have = Object.keys(mhQariHave(rid)).map(Number).sort((a, b) => a - b);
    if (!have.length) { toast('نزّل بعض السور أوّلًا'); return; }
    const b = await getFile(mhQariHave(rid)[have[0]]); const rec = QARIS.find(r => r.id === rid);
    if (b) mhPlayBlob(b, 'سورة ' + SURAS[have[0] - 1], rec.n); return; }
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
  render();
}
/* زرّ القرّاء داخل قسم المصحف */
mhAfter(h => {
  if (!h.startsWith('#/s/secQuran') && h !== '#/lib') return;
  const host = document.querySelector('.seclinks') || document.querySelector('main .sechead');
});
