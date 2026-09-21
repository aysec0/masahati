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
    'https://apps.apple.com/app/id1624497481', 'https://play.google.com/store/apps/details?id=ca.basira.mantooqapp']
];
function mhAudioCustom() { return S.get('audioApps', []); }
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
        </div></div>`).join('')}
      ${mhAudioCustom().map((a, i) => `<div class="audapp"><div class="audapp-t"><b>${esc(a.n)}</b>${a.d ? `<small>${esc(a.d)}</small>` : ''}</div>
        <div class="audapp-b"><a class="btn sm pri" href="${esc(a.u)}" target="_blank" rel="noopener">${ICON.ext} افتح</a>
          <button class="btn sm" data-audappdel="${i}">${MHI.trash} حذف</button></div></div>`).join('')}
      <button class="btn" data-audappadd="1" style="width:100%;justify-content:center;margin-top:4px">${ICON.plus} أضِف موقعًا أو تطبيقًا خاصًّا بي</button>
    </div>
    <div class="pcardx" style="margin:14px 16px 0"><b>${MHI.cloud} رابط ساوندكلاود</b>
      <p class="mhnote" style="margin:6px 0 10px">الصق رابط مقطع أو قائمة تشغيل، يُعرض داخل الموقع ويُضاف إلى مكتبتك.</p>
      <button class="btn pri" data-scadd="1">${MHI.link} أضِف من ساوندكلاود</button></div>`;
});
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-audappadd]')) { mhAudioAppAdd(); return; }
  const dad = ev.target.closest('[data-audappdel]');
  if (dad) { const list = mhAudioCustom(); list.splice(+dad.dataset.audappdel, 1); S.set('audioApps', list); render(); return; }
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
    <div class="sheetrow"><button class="btn pri" data-sc="1">${ICON.plus} أضِف واعرض في المكتبة</button></div>
    <p class="mhnote" id="scSt">يُعرض مشغّل ساوندكلاود داخل الموقع، ومن صفحته زرّ «نزّله إلى مكتبتي» إن سمح صاحبه بالتنزيل.</p>`, m => {
    const go = async () => {
      const u = (m.querySelector('#scU').value || '').trim(); const st = m.querySelector('#scSt');
      if (!/soundcloud\.com|snd\.sc/.test(u)) { st.textContent = 'الصق رابط ساوندكلاود صحيحًا (يبدأ بـ soundcloud.com)'; return; }
      st.textContent = 'جارٍ الإضافة…';
      let title = 'مقطع ساوندكلاود';
      try { const c = new AbortController(); const to = setTimeout(() => c.abort(), 6000);
        const r = await fetch('https://soundcloud.com/oembed?format=json&url=' + encodeURIComponent(u), { signal: c.signal });
        clearTimeout(to); if (r.ok) { const j = await r.json(); if (j && j.title) title = j.title; } } catch (e) {}
      const sec = mhSecEnsure('secAudioLinks', 'روابط صوتية');
      const it = { id: uid('i'), type: 'soundcloud', name: title, url: u, ts: Date.now() };
      sec.items.unshift(it); saveTree(); m.close(); toast('أُضيف إلى مكتبتك'); location.hash = '#/i/' + it.id;
    };
    m.querySelector('[data-sc]').onclick = go;
    m.querySelector('#scU').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  });
}
function mhAudioAppAdd() {
  mhModal(`<div class="mhvhead"><b>${ICON.plus} موقع أو تطبيق صوتيّ</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <div class="field"><label>الاسم</label><input type="text" id="aaN" dir="rtl" placeholder="اسم الموقع أو التطبيق"></div>
    <div class="field"><label>الرابط</label><input type="url" id="aaU" dir="ltr" placeholder="https://…"></div>
    <div class="field"><label>وصف قصير (اختياري)</label><input type="text" id="aaD" dir="rtl"></div>
    <div class="sheetrow"><button class="btn pri" data-aa="1">${ICON.chk} احفظ</button></div>`, m => {
    m.querySelector('[data-aa]').onclick = () => {
      const n = m.querySelector('#aaN').value.trim(), u = m.querySelector('#aaU').value.trim();
      if (!n || !u) { toast('أكمل الاسم والرابط'); return; }
      const list = mhAudioCustom(); list.push({ n, u: /^https?:/.test(u) ? u : 'https://' + u, d: m.querySelector('#aaD').value.trim() });
      S.set('audioApps', list); m.close(); render();
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

/* ================================================================
   ساوندكلاود: تنزيل المقطع إلى مكتبتك حين يسمح صاحبه بالتنزيل،
   وإلّا يبقى يُسمَع من المشغّل المدمج.
   ================================================================ */
async function mhScGet(url, asText) {
  try { const r = await fetch(url); if (r.ok) return asText ? await r.text() : await r.blob(); } catch (e) {}
  return await grab(url, asText !== false ? true : false, 25000);
}
async function mhScClientId() {
  const c = S.get('scCid', null); if (c && Date.now() - c.t < 86400000) return c.id;
  const html = await mhScGet('https://soundcloud.com/', true);
  const assets = (html.match(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^"']+\.js/g) || []).reverse();
  for (const a of assets.slice(0, 8)) {
    try { const js = await mhScGet(a, true); const m = /client_id\s*[:=]\s*"([A-Za-z0-9]{20,40})"/.exec(js);
      if (m) { S.set('scCid', { id: m[1], t: Date.now() }); return m[1]; } } catch (e) {}
  }
  throw new Error('تعذّر الاتصال بساوندكلاود');
}
async function mhScResolve(u) {
  const cid = await mhScClientId();
  const j = JSON.parse(await mhScGet('https://api-v2.soundcloud.com/resolve?url=' + encodeURIComponent(u) + '&client_id=' + cid, true));
  return { cid, j };
}
async function mhScTrackFile(t, cid) {
  const tr = ((t.media || {}).transcodings || []).find(x => x.format && x.format.protocol === 'progressive');
  if (!tr) throw new Error('لا نسخة قابلة للتنزيل');
  const info = JSON.parse(await mhScGet(tr.url + '?client_id=' + cid, true));
  const r = await fetch(info.url); if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.blob();
}
async function mhScDownload(it, st) {
  const say = t => { if (st) st.textContent = t; };
  try {
    say('أتصل بساوندكلاود…');
    const { cid, j } = await mhScResolve(it.url);
    let tracks = j.kind === 'playlist' ? (j.tracks || []) : [j];
    if (j.kind === 'playlist' && tracks.some(t => !t.media)) {
      const ids = tracks.map(t => t.id).join(',');
      tracks = JSON.parse(await mhScGet('https://api-v2.soundcloud.com/tracks?ids=' + ids + '&client_id=' + cid, true));
    }
    const ok = tracks.filter(t => t.downloadable), no = tracks.length - ok.length;
    if (!ok.length) { say(tracks.length > 1 ? 'أصحاب هذه المقاطع لم يسمحوا بتنزيلها — تبقى تُسمَع من المشغّل هنا.' : 'صاحب هذا المقطع لم يسمح بتنزيله — يبقى يُسمَع من المشغّل هنا.'); return 0; }
    const r = findItem(it.id), sec = r ? r.sec : mhSecEnsure('secAudioLinks', 'روابط صوتية');
    let n = 0;
    for (const t of ok) {
      say('أنزّل «' + (t.title || 'مقطع') + '»… (' + AR(n + 1) + ' من ' + AR(ok.length) + ')');
      const blob = await mhScTrackFile(t, cid);
      const key = uid('f'); await putFile(key, blob);
      sec.items.push({ id: uid('i'), type: 'audio', name: t.title || 'مقطع', file: key, size: blob.size, mime: blob.type || 'audio/mpeg',
        dur: Math.round((t.duration || t.full_duration || 0) / 1000) || undefined, src: t.permalink_url, ts: Date.now() });
      saveTree(); n++;
    }
    say('نُزّل ' + AR(n) + ' إلى «' + sec.name + '»' + (no ? ' — و' + AR(no) + ' لم يسمح أصحابها بالتنزيل فتبقى في المشغّل.' : ''));
    toast('نُزّل إلى مكتبتك'); return n;
  } catch (e) { say('تعذّر: ' + (e.message || e) + (onGithub && onGithub() ? ' — على الاستضافة (Hostinger) يعمل عبر الوسيط الخاصّ بموثوقية أعلى.' : '')); return 0; }
}
mhAfter(h => {
  const m = /^#\/i\/(.+)$/.exec(h); if (!m) return;
  const r = findItem(m[1]); if (!r || r.it.type !== 'soundcloud') return;
  const acts = document.querySelector('.panel .acts'); if (!acts || acts.querySelector('[data-scdl]')) return;
  const b = document.createElement('button'); b.className = 'btn pri'; b.dataset.scdl = r.it.id;
  b.innerHTML = `${ICON.dl} نزّله إلى مكتبتي`; acts.prepend(b);
  const st = document.createElement('p'); st.className = 'mhnote'; st.id = 'scSt2'; st.style.margin = '0 16px 10px';
  st.textContent = 'يُنزَّل إن سمح صاحبه بالتنزيل، وإلّا يبقى يُسمَع من المشغّل أدناه.';
  acts.after(st);
});
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-scdl]'); if (!b) return;
  const r = findItem(b.dataset.scdl); if (!r) return;
  b.disabled = true; await mhScDownload(r.it, document.getElementById('scSt2')); b.disabled = false;
});
