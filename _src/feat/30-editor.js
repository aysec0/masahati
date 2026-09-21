/* ================================================================
   الكتابة: التنسيق مخفيّ خلف زرّ، وخانة الفائدة سطران لا تكبر،
   وملء الشاشة لمن أراد المساحة، وميكروفونٌ في كل مكان تكتب فيه.
   ================================================================ */

/* ---------- نافذة فوق كل شيء (لا تُغلق الورقة المفتوحة تحتها) ---------- */
function mhModal(html, opt, wire) {
  /* تقبل دالّة الربط في الموضع الثاني أيضًا — كانت تُهمَل فتموت أزرار النافذة */
  if (typeof opt === 'function') { wire = opt; opt = {}; }
  opt = opt || {};
  const m = document.createElement('div');
  m.className = 'mhmodal' + (opt.full ? ' full' : '');
  m.innerHTML = `<div class="mhmcard">${html}</div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); if (opt.onClose) opt.onClose(); };
  m.addEventListener('click', ev => { if (ev.target === m && !opt.full) close(); if (ev.target.closest('[data-mhx]')) close(); });
  m.close = close;
  if (wire) { try { wire(m); } catch (e) { console.error(e); } }
  return m;
}

/* ---------- شريط الكاتب: تنسيق · ميكروفون · ملء الشاشة ---------- */
const MH_NOVOICE = new Set(['setAbout', 'txP', 'lT', 'glS', 'setProxy', 'setYtAlt', 'mhKey', 'cfw', 'bohPw', 'vPw', 'vPw2']);
function mhEdBar(target, hasFmt) {
  const b = document.createElement('div'); b.className = 'edbar';
  b.innerHTML = `
    ${hasFmt ? `<button type="button" class="edb" data-ed="fmt" title="أدوات التنسيق">${MHI.aa}<span>تنسيق</span></button>` : ''}
    <button type="button" class="edb" data-ed="mic" title="سجّل صوتًا أو أملِ ما تقوله">${MHI.mic}<span>صوت</span></button>
    <button type="button" class="edb" data-ed="full" title="ملء الشاشة">${MHI.full}</button>`;
  b.__target = target;
  return b;
}
function mhDecorate() {
  document.querySelectorAll('.rtools:not([data-ed])').forEach(t => {
    t.dataset.ed = '1';
    if (t.closest('.mhmodal.full')) { t.classList.add('show'); return; }   /* في ملء الشاشة يظهر التنسيق */
    let rich = t.nextElementSibling;
    while (rich && !(rich.isContentEditable || rich.tagName === 'TEXTAREA')) rich = rich.nextElementSibling;
    if (!rich) rich = t.parentElement && t.parentElement.querySelector('[contenteditable="true"]');
    if (!rich) return;
    rich.dataset.ed = '1';
    t.before(mhEdBar(rich, true));
  });
  document.querySelectorAll('textarea:not([data-ed]), [contenteditable="true"]:not([data-ed])').forEach(el => {
    el.dataset.ed = '1';
    if (MH_NOVOICE.has(el.id) || el.closest('.mhmodal,.lpop,.c2box,.mindwrap,.edbar')) return;
    if (el.classList.contains('article') && el.id === 'art') return;
    el.before(mhEdBar(el, false));
  });
}
let mhDecT = null;
new MutationObserver(() => { if (mhDecT) return; mhDecT = requestAnimationFrame(() => { mhDecT = null; try { mhDecorate(); } catch (e) {} }); })
  .observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener('pointerdown', ev => { if (ev.target.closest('.edb')) ev.preventDefault(); }, true);   /* لا يضيع التحديد */
document.addEventListener('click', ev => {
  const b = ev.target.closest('.edb'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const bar = b.closest('.edbar'), target = bar && bar.__target; if (!target) return;
  const k = b.dataset.ed;
  if (k === 'fmt') {
    const t = bar.nextElementSibling && bar.nextElementSibling.classList.contains('rtools') ? bar.nextElementSibling : null;
    if (t) { const on = !t.classList.contains('show'); t.classList.toggle('show', on); b.classList.toggle('on', on); }
    return;
  }
  if (k === 'mic') { mhVoice(target); return; }
  if (k === 'full') { mhEdFull(target); return; }
}, true);

/* ---------- أدخل نصًّا في خانة (محرِّر أو حقل) ---------- */
function mhInsert(target, text, html) {
  if (!target || !text) return;
  if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
    const v = target.value; target.value = v + (v && !/\s$/.test(v) ? ' ' : '') + text;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.scrollTop = target.scrollHeight;
    return;
  }
  const add = html || esc(text);
  const cur = target.innerHTML.replace(/<br\s*\/?>\s*$/i, '');
  target.innerHTML = cur + (cur && !/\s$|>$/.test(cur) ? ' ' : '') + add + ' ';
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.scrollTop = target.scrollHeight;
}

/* ---------- ملء الشاشة ---------- */
function mhEdFull(target) {
  const isTa = target.tagName === 'TEXTAREA';
  const m = mhModal(`
    <div class="mhfhead"><b>${isTa ? 'اكتب براحتك' : 'اكتب ونسّق براحتك'}</b><span style="flex:1"></span>
      <button class="edb" data-edf="mic">${MHI.mic}<span>صوت</span></button>
      <button class="btn pri" data-edf="done">${ICON.chk} تم</button></div>
    ${isTa ? '' : rtoolsHTML()}
    ${isTa ? `<textarea class="mhfbody" dir="rtl"></textarea>` : `<div class="rich mhfbody" contenteditable="true" dir="rtl"></div>`}`, { full: true });
  const ed = m.querySelector('.mhfbody');
  if (isTa) ed.value = target.value; else { ed.innerHTML = target.innerHTML; bindRich(m, ed, null); }
  setTimeout(() => { ed.focus(); try { const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} }, 60);
  m.addEventListener('click', ev => {
    const b = ev.target.closest('[data-edf]'); if (!b) return;
    if (b.dataset.edf === 'mic') { mhVoice(ed); return; }
    if (isTa) target.value = ed.value; else target.innerHTML = clean(ed.innerHTML);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    m.close();
  });
}

/* ================================================================
   التسجيل الصوتيّ: سجّل، أو أملِ مباشرة، أو فرّغ بعد التسجيل
   ================================================================ */
let recs = S.get('recs', []);
const saveRecs = () => S.set('recs', recs);
function mhCtxLabel() {
  const h = location.hash || '#/';
  const m = /^#\/i\/(.+)$/.exec(h), r = m ? findItem(m[1]) : null;
  let p = null; try { p = typeof nowPage === 'function' ? nowPage() : null; } catch (e) {}
  if (r) return (r.it.name || '') + (p ? ' · صفحة ' + AR(p) : '');
  const n = { '#/boh': 'بوح', '#/notes': 'فوائدي', '#/quotes': 'الجدار', '#/plan': 'جدولي' }[h.split('/').slice(0, 2).join('/')] || '';
  return n || 'تسجيل';
}
function mhVoice(target) {
  const canRec = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const canDict = mhDictSupported();
  if (!canRec && !canDict) { toast('متصفّحك لا يسمح بالتسجيل — جرّب كروم أو سفاري'); return; }
  const live0 = S.get('dictLive', canDict);
  const m = mhModal(`
    <div class="mhvhead"><b>${MHI.mic} تسجيل صوتيّ</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <div class="mhvrec">
      <button class="mhvbtn" data-v="rec" aria-label="ابدأ التسجيل">${MHI.mic}</button>
      <div class="mhvtime" id="mhvT">٠:٠٠</div>
      <canvas class="mhvwave" id="mhvW" width="300" height="40"></canvas>
    </div>
    ${canDict ? `<label class="mhvlive"><button class="usw ${live0 ? 'on' : ''}" data-v="live"></button>
      <span>اكتب ما أقوله مباشرةً <small>(يحتاج إنترنت)</small></span></label>
      <div class="mhvtxt" id="mhvTx" hidden></div>` : ''}
    <div class="mhvafter" id="mhvA" hidden>
      <audio id="mhvAu" controls style="width:100%"></audio>
      <div class="sheetrow" style="margin:10px 0 0">
        <button class="btn pri" data-v="attach">${ICON.chk} أرفق التسجيل</button>
        <button class="btn" data-v="tx">${ICON.text} فرّغه وأدرج النصّ</button>
        <button class="btn" data-v="both">الاثنان</button>
        <button class="btn" data-v="lib">${ICON.lib} احفظه في المكتبة</button>
      </div>
      <p class="mhnote" id="mhvSt"></p>
    </div>
    <p class="mhnote">${canRec ? 'يُحفظ التسجيل في جهازك وحده، وتجده أيضًا في «تسجيلاتي» داخل فوائدي.' : 'متصفّحك لا يحفظ الصوت — لكنّه يكتب ما تقوله.'}</p>`);
  let rec = null, chunks = [], stream = null, t0 = 0, tick = null, dict = null, blob = null, an = null, live = live0 && canDict;
  const T = m.querySelector('#mhvT'), btn = m.querySelector('[data-v="rec"]'), txBox = m.querySelector('#mhvTx');
  const wave = m.querySelector('#mhvW'), wc = wave.getContext('2d');
  const draw = () => {
    if (!an) return; const d = new Uint8Array(an.fftSize); an.getByteTimeDomainData(d);
    wc.clearRect(0, 0, wave.width, wave.height); wc.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--acc') || '#0d6e5f';
    wc.lineWidth = 2; wc.beginPath();
    for (let i = 0; i < d.length; i++) { const x = i / d.length * wave.width, y = d[i] / 255 * wave.height; i ? wc.lineTo(x, y) : wc.moveTo(x, y); }
    wc.stroke(); if (rec || dict) requestAnimationFrame(draw);
  };
  const stopAll = () => {
    clearInterval(tick);
    try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (e) {}
    if (dict) { dict.stop(); dict = null; }
    if (stream) stream.getTracks().forEach(t => t.stop());
    btn.classList.remove('rec'); btn.innerHTML = MHI.mic;
  };
  const start = async () => {
    chunks = []; blob = null; m.querySelector('#mhvA').hidden = true;
    if (live && txBox) { txBox.hidden = false; txBox.textContent = '…'; }
    if (canRec) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        const mt = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find(x => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(x)) || '';
        rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = () => {
          blob = new Blob(chunks, { type: rec.mimeType || mt || 'audio/webm' });
          const au = m.querySelector('#mhvAu'); au.src = URL.createObjectURL(blob);
          m.querySelector('#mhvA').hidden = false; rec = null;
        };
        rec.start(1000);
        try { const ac = new (window.AudioContext || window.webkitAudioContext)(); an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(stream).connect(an); draw(); } catch (e) {}
      } catch (e) {
        if (!live) { toast('لم يُسمح بالميكروفون — اسمح به من إعدادات المتصفّح'); return; }
      }
    }
    if (live) {
      let said = '';
      dict = mhDictate(fin => { said += fin + ' '; mhInsert(target, fin); if (txBox) txBox.textContent = said; },
        mid => { if (txBox) txBox.textContent = said + (mid ? '… ' + mid : ''); },
        (st, err) => { if (st === 'err' && err === 'not-allowed') toast('اسمح بالميكروفون للإملاء'); });
    }
    t0 = Date.now(); btn.classList.add('rec'); btn.innerHTML = MHI.stop;
    tick = setInterval(() => { T.textContent = mhFmtTime((Date.now() - t0) / 1000); }, 250);
  };
  btn.onclick = () => { if (btn.classList.contains('rec')) stopAll(); else start(); };
  const sw = m.querySelector('[data-v="live"]');
  if (sw) sw.onclick = () => { live = !live; sw.classList.toggle('on', live); S.set('dictLive', live); };
  const saveRec = async () => {
    const key = uid('rec'); await putFile(key, blob);
    const dur = Math.round((Date.now() - t0) / 1000);
    const r = { id: uid('r'), key, at: Date.now(), dur, label: mhCtxLabel(), h: location.hash, tx: '' };
    recs.unshift(r); saveRecs(); return r;
  };
  const st = m.querySelector('#mhvSt');
  m.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-v]'); if (!b || !blob) return;
    const k = b.dataset.v;
    if (k === 'attach' || k === 'both') {
      const r = await saveRec();
      if (target.isContentEditable) mhInsert(target, '', `<a href="#/rec/${r.key}">🎙 تسجيل ${mhFmtTime(r.dur)}</a>`);
      else mhInsert(target, '🎙 (تسجيل صوتي ' + mhFmtTime(r.dur) + ' — في تسجيلاتي)');
      if (k === 'attach') { toast('أُرفق التسجيل'); m.close(); return; }
    }
    if (k === 'tx' || k === 'both') {
      st.textContent = 'أفرّغ التسجيل…';
      try { const txt = await mhTranscribeBlob(blob, p => st.textContent = p);
        if (txt) { mhInsert(target, txt); const r0 = recs[0]; if (k === 'both' && r0) { r0.tx = txt; saveRecs(); } toast('أُدرج النصّ'); m.close(); }
        else st.textContent = 'لم أسمع كلامًا واضحًا.';
      } catch (e) { st.textContent = 'تعذّر التفريغ: ' + (e.message || e); }
      return;
    }
    if (k === 'lib') {
      const key = uid('f'); await putFile(key, blob);
      const sec = mhSecEnsure('secRecs', 'تسجيلاتي');
      sec.items.unshift({ id: uid('i'), type: 'audio', name: 'تسجيل — ' + mhCtxLabel() + ' — ' + new Date().toLocaleDateString('ar'),
        file: key, size: blob.size, mime: blob.type, dur: Math.round((Date.now() - t0) / 1000), ts: Date.now() });
      saveTree(); toast('حُفظ في مكتبتك ← تسجيلاتي'); m.close();
    }
  });
  const obs = new MutationObserver(() => { if (!m.isConnected) { stopAll(); obs.disconnect(); } });
  obs.observe(document.body, { childList: true });
  start();
}
/* تفريغ تسجيلٍ قصير: السحابيّ إن وُجد مفتاح، وإلّا داخل الجهاز */
async function mhTranscribeBlob(blob, say) {
  const cp = mhTxCloud();
  if (cp) {
    say && say('يُفرَّغ عبر ' + MHTX[cp].name + '…');
    const ext = /mp4|m4a|aac/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
    const out = await mhCloudCall(cp, blob, 'rec.' + ext, '');
    return (out.text || '').trim();
  }
  say && say('أجهّز نموذج التفريغ (مرّة واحدة)…');
  const pcm = await mhDecode16k(await blob.arrayBuffer());
  const w = txWorkerStart();
  w.onDl = p => { if (p && p.status === 'progress' && p.total) say && say('تنزيل النموذج ' + AR(Math.round(p.loaded / p.total * 100)) + '٪ — مرّة واحدة'); };
  await txAsk({ cmd: 'load', model: S.get('recModel', 'Xenova/whisper-base'), gpu: false }, null, 600000);
  let out = '';
  for (let f = 0; f < pcm.length; f += 27 * 16000) {
    say && say('أفرّغ… ' + AR(Math.round(f / pcm.length * 100)) + '٪');
    const s = pcm.slice(f, Math.min(pcm.length, f + 28 * 16000));
    const r = await txAsk({ cmd: 'run', pcm: s }, [s.buffer]);
    out += ' ' + ((r.out && r.out.text) || '');
  }
  return out.trim();
}
/* تشغيل تسجيل من رابطه داخل الفائدة */
async function mhPlayBlob(blob, title, sub) {
  try {
    au.src = URL.createObjectURL(blob); P.el.classList.add('up');
    P.title.innerHTML = `<b>${esc(title)}</b><small>${esc(sub || 'تسجيل صوتيّ')}</small>`; P.title.href = location.hash;
    au.playbackRate = S.get('rate', 1); await au.play();
  } catch (e) { toast('تعذّر التشغيل'); }
}
document.addEventListener('click', async ev => {
  const a = ev.target.closest('a[href^="#/rec/"]'); if (!a) return;
  ev.preventDefault(); ev.stopPropagation();
  const key = a.getAttribute('href').slice(6); const b = await getFile(key);
  if (!b) { toast('التسجيل غير موجود في هذا الجهاز'); return; }
  const r = recs.find(x => x.key === key);
  mhPlayBlob(b, 'تسجيل صوتيّ', r ? r.label : '');
}, true);
/* تسجيلاتي — داخل فوائدي */
function mhRecsPanel() {
  if (!recs.length) return '';
  return `<div class="sechead"><h2>${MHI.mic} تسجيلاتي</h2><div class="ln"></div><a href="#/dict/recs">الكل (${AR(recs.length)})</a></div>
    <div class="nlist">${recs.slice(0, 4).map(mhRecRow).join('')}</div>`;
}
function mhRecRow(r) {
  return `<div class="nrow"><button class="mhico" data-recp="${r.key}">${MHI.play}</button>
    <b>${esc(r.label || 'تسجيل')}</b><small style="color:var(--muted);font-size:11.5px">${mhFmtTime(r.dur)} · ${new Date(r.at).toLocaleDateString('ar')}</small>
    ${r.h && r.h !== '#/' ? `<a class="lnk" href="${esc(r.h)}">${ICON.ext}</a>` : ''}
    <button class="lnk danger" data-recd="${r.id}">حذف</button></div>
    ${r.tx ? `<div class="mhnote" style="margin:0 14px 8px">${esc(r.tx.slice(0, 200))}</div>` : ''}`;
}
document.addEventListener('click', async ev => {
  const p = ev.target.closest('[data-recp]');
  if (p) { const b = await getFile(p.dataset.recp); const r = recs.find(x => x.key === p.dataset.recp);
    if (b) mhPlayBlob(b, r ? r.label : 'تسجيل'); else toast('التسجيل غير موجود'); return; }
  const d = ev.target.closest('[data-recd]');
  if (d) { const r = recs.find(x => x.id === d.dataset.recd); if (!r) return;
    confirmSheet('يُحذف هذا التسجيل.', () => { dropFile(r.key); recs = recs.filter(x => x !== r); saveRecs(); }); }
});
/* النسخة الاحتياطية تحمل التسجيلات ولقطات الشاشة وملفات الخزنة */
const _mhBkKeys = bkFileKeys;
bkFileKeys = function () {
  const keys = new Set(_mhBkKeys());
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (!k || k.slice(0, 3) !== 'ws_' || k === 'ws_qari') continue;
      (localStorage.getItem(k).match(/"(rec|shot|vf|nbi|wb|ab)[a-z0-9]{6,}"/g) || []).forEach(m => keys.add(m.replace(/"/g, '')));
    }
  } catch (e) {}
  return [...keys];
};
