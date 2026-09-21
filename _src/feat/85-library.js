/* ================================================================
   المكتبة: أزرارٌ للقرّاء وأذكار الصباح والمساء والمكتبة الصوتية،
   وربط الكتاب الصوتيّ بالمكتوب، وساوندكلاود، ومكتبات صوتية عربية.
   ================================================================ */
mhAfter(h => {
  if (h !== '#/lib') return;
  const main = document.getElementById('view');
  if (!main || main.querySelector('.libtiles')) return;
  const head0 = main.querySelector('.sechead');
  const d = document.createElement('div'); d.className = 'grid libtiles'; d.style.margin = '4px 0 16px';
  d.innerHTML = `
    <a class="tile libtile" href="#/qari"><div class="ic">${MHI.headph}</div><div><b>القرّاء</b><small>مصاحف صوتية كاملة تُنزَّل بلا إنترنت</small></div></a>
    <a class="tile libtile" href="#/adhkar"><div class="ic">${MHI.sun}</div><div><b>أذكار الصباح والمساء</b><small>مع ملفّ جاهز</small></div></a>
    <a class="tile libtile" href="#/audio"><div class="ic">${MHI.book2}</div><div><b>المكتبة الصوتية</b><small>كتب صوتية مرتبطة بالمكتوب، وتطبيقات</small></div></a>`;
  if (head0) head0.after(d); else main.prepend(d);
});

/* ================================================================
   أذكار الصباح والمساء
   ================================================================ */
const ADHKAR_ID = 'adhkar';
async function mhAdhkarFetch() {
  try {
    const base = location.pathname.replace(/[^/]*$/, '');
    const r = await fetch(base + 'adhkar.pdf'); if (!r.ok) return null;
    const b = await r.blob(); if (b.type && !/pdf/.test(b.type) && b.size < 3000) return null;
    return b;
  } catch (e) { return null; }
}
mhRoute(h => h === '#/adhkar', () => {
  const it = (findItem(ADHKAR_ID) || {}).it;
  return `${head('أذكار الصباح والمساء', `<a class="chip" href="#/lib">${ICON.back} المكتبة</a>`)}
    ${it && it.file ? `<div class="pcardx" style="margin:0 16px"><b>${MHI.sun} أذكارك محفوظة</b>
        <p class="mhnote" style="margin:6px 0 10px">افتحها لتقرأها بلا إنترنت.</p>
        <a class="btn pri" href="#/i/${ADHKAR_ID}">${ICON.ext} افتح الأذكار</a></div>`
      : `<div class="pcardx" style="margin:0 16px"><b>${MHI.sun} أضِف أذكار الصباح والمساء</b>
        <p class="mhnote" style="margin:6px 0 10px">فيه ملفٌّ جاهز «مختصر أذكار الصباح والمساء»، أو ارفع ملفّك.</p>
        <div class="sheetrow" style="margin:0">
          <button class="btn pri" data-adh="def">${ICON.dl} استخدم الملفّ الجاهز</button>
          <button class="btn" data-adh="up">${ICON.plus} ارفع ملفًّا</button>
        </div><p class="mhnote" id="adhSt" style="margin-top:8px"></p></div>`}`;
});
function mhAdhkarEnsure(file, size) {
  let sec = tree.find(s => s.id === 'secAdhkar');
  if (!sec) { sec = { id: 'secAdhkar', name: 'الأذكار', items: [], subs: [] }; tree.push(sec); }
  let it = sec.items.find(x => x.id === ADHKAR_ID);
  if (!it) { it = { id: ADHKAR_ID, type: 'pdf', name: 'أذكار الصباح والمساء' }; sec.items.unshift(it); }
  if (file) { it.file = file; it.size = size; }
  saveTree();
}
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-adh]'); if (!b) return;
  const st = document.getElementById('adhSt');
  if (b.dataset.adh === 'def') {
    if (st) st.textContent = 'أجهّز الملفّ…';
    const blob = await mhAdhkarFetch();
    if (!blob) { if (st) st.textContent = 'لم أجد الملفّ الجاهز (ارفعه من الاستضافة)، ارفع ملفّك بدلًا منه.'; return; }
    const key = 'fadhkar'; await putFile(key, blob); mhAdhkarEnsure(key, blob.size);
    toast('حُفظت الأذكار'); location.hash = '#/i/' + ADHKAR_ID;
  } else {
    const f = await mhPickFile('application/pdf,.pdf'); if (!f) return;
    const key = 'fadhkar'; await putFile(key, f); mhAdhkarEnsure(key, f.size);
    toast('حُفظت الأذكار'); location.hash = '#/i/' + ADHKAR_ID;
  }
});

/* ================================================================
   المكتبة الصوتية: كتب صوتية تُقرَن بالمكتوب، ومكتبات ومواقع عربية
   ================================================================ */
const AUDIO_APPS = [
  ['منطوق', 'كتب صوتية وبودكاست نافع — مجّانيّ بلا إعلانات', 'https://mantooq.com',
    'https://apps.apple.com/app/id1624497481', 'https://play.google.com/store/apps/details?id=ca.basira.mantooqapp'],
  ['مسموع', 'الكتب العربية الصوتية', 'https://masmoo3.com', '', ''],
  ['Storytel', 'آلاف الكتب الصوتية العربية (اشتراك)', 'https://www.storytel.com/ae', '', ''],
  ['أبجد', 'كتب ومراجعات ومكتبة صوتية', 'https://www.abjjad.com', '', '']
];
mhRoute(h => h === '#/audio', () => {
  const pairs = allItems().filter(r => r.it.linkAudio || r.it.linkText);
  return `${head('المكتبة الصوتية', `<a class="chip" href="#/lib">${ICON.back} المكتبة</a>`)}
    <div class="pcardx" style="margin:0 16px 12px"><b>${MHI.book2} اقرن الصوتيّ بالمكتوب</b>
      <p class="mhnote" style="margin:6px 0 10px">اربط كتابًا صوتيًّا بنسخته PDF فتراهما معًا وتنتقل بينهما.</p>
      <button class="btn pri" data-audpair="1">${MHI.link} اربط كتابًا صوتيًّا بمكتوب</button></div>
    <div class="sechead" style="margin:0 16px 8px"><h2 style="font-size:15px">مكتبات وتطبيقات صوتية عربية</h2><div class="ln"></div></div>
    <div class="audapps">${AUDIO_APPS.map(([n, d, site, ios, and]) => `
      <div class="audapp"><div class="audapp-t"><b>${esc(n)}</b><small>${esc(d)}</small></div>
        <div class="audapp-b">
          <a class="btn sm pri" href="${site}" target="_blank" rel="noopener">${ICON.ext} الموقع</a>
          ${ios ? `<a class="btn sm" href="${ios}" target="_blank" rel="noopener"> App Store</a>` : ''}
          ${and ? `<a class="btn sm" href="${and}" target="_blank" rel="noopener"> Google Play</a>` : ''}
        </div></div>`).join('')}</div>
    <div class="pcardx" style="margin:14px 16px 0"><b>${MHI.cloud} رابط ساوندكلاود</b>
      <p class="mhnote" style="margin:6px 0 10px">الصق رابط مقطع أو قائمة تشغيل، يُعرض داخل الموقع ويُضاف إلى مكتبتك.</p>
      <button class="btn pri" data-scadd="1">${MHI.link} أضِف من ساوندكلاود</button></div>`;
});
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-audpair]')) {
    mhPickItem('اختر الكتاب الصوتيّ', it => it.type === 'audio', aid => {
      mhPickItem('اربطه بأي كتاب مكتوب (PDF)؟', it => it.type === 'pdf', tid => {
        const a = findItem(aid), t = findItem(tid); if (!a || !t) return;
        a.it.linkText = tid; t.it.linkAudio = aid; saveTree(); toast('رُبِط الصوتيّ بالمكتوب'); render();
      });
    });
  }
  if (ev.target.closest('[data-scadd]')) mhSoundcloud();
});
/* عرض زرّ الانتقال بين المقرون في صفحة العنصر */
mhAfter(h => {
  const m = /^#\/i\/(.+)$/.exec(h); if (!m) return;
  const r = findItem(m[1]); if (!r) return;
  const other = r.it.linkAudio || r.it.linkText; if (!other || !findItem(other)) return;
  const acts = document.querySelector('.acts'); if (!acts || acts.querySelector('[data-pairgo]')) return;
  const b = document.createElement('a'); b.className = 'btn'; b.href = '#/i/' + other; b.dataset.pairgo = '1';
  b.innerHTML = (r.it.linkAudio ? MHI.book2 + ' النسخة المكتوبة' : MHI.headph + ' النسخة الصوتية');
  acts.insertBefore(b, acts.firstChild);
});

/* ================================================================
   ساوندكلاود: يُعرض داخل الموقع (لا يُنزَّل)
   ================================================================ */
function mhSoundcloud() {
  mhModal(`<div class="mhvhead"><b>${MHI.cloud} ساوندكلاود</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <div class="field"><label>رابط مقطع أو قائمة تشغيل</label><input type="url" id="scU" dir="ltr" placeholder="https://soundcloud.com/…"></div>
    <div class="sheetrow"><button class="btn pri" data-sc="1">${ICON.plus} أضِف إلى مكتبتي</button></div>
    <p class="mhnote" id="scSt">يُعرض مشغّل ساوندكلاود داخل الموقع. التنزيل غير متاح منه، لكنّه يعمل بالإنترنت.</p>`, m => {
    m.querySelector('[data-sc]').onclick = async () => {
      const u = m.querySelector('#scU').value.trim(); const st = m.querySelector('#scSt');
      if (!/soundcloud\.com/.test(u)) { st.textContent = 'الصق رابط ساوندكلاود صحيحًا'; return; }
      st.textContent = 'أتحقّق من الرابط…';
      let title = 'مقطع ساوندكلاود';
      try { const r = await fetch('https://soundcloud.com/oembed?format=json&url=' + encodeURIComponent(u)); if (r.ok) { const j = await r.json(); title = j.title || title; } } catch (e) {}
      const sec = mhSecEnsure('secAudioLinks', 'روابط صوتية');
      sec.items.unshift({ id: uid('i'), type: 'soundcloud', name: title, url: u, ts: Date.now() });
      saveTree(); m.close(); toast('أُضيف إلى مكتبتك'); location.hash = '#/i/' + sec.items[0].id;
    };
  });
}
/* عرض مشغّل ساوندكلاود في صفحة العنصر */
mhAfter(h => {
  const m = /^#\/i\/(.+)$/.exec(h); if (!m) return;
  const r = findItem(m[1]); if (!r || r.it.type !== 'soundcloud') return;
  const panel = document.querySelector('.panel'); if (!panel || panel.querySelector('.scframe')) return;
  const f = document.createElement('iframe'); f.className = 'viewer scframe'; f.allow = 'autoplay';
  f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(r.it.url) + '&color=%230d6e5f&auto_play=false&show_comments=false&visual=true';
  panel.appendChild(f);
});
/* نوع ساوندكلاود يظهر بأيقونة */
if (typeof TYPES !== 'undefined') TYPES.soundcloud = { t: 'ساوندكلاود', ic: MHI.cloud };
