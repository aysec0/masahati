/* ================================================================
   التفريغ — يعمل دائمًا وعلى كل جهاز
   السببان اللذان كانا يُفشلانه:
   ١) مسار البطاقة الرسوميّة (WebGPU) يُخرج نصًّا فاسدًا — فالتفريغ المحلّيّ على المعالج دائمًا.
   ٢) فكّ ترميز الملف كلّه دفعةً واحدة: محاضرة نصف ساعة تصير مئات الميجابايت فيسقط الهاتف.
      صار الصوت يُفكّ قطعةً قطعة، فلا يتجاوز ما في الذاكرة بضعة ميجابايت.
   وأُضيف محرّك سحابيّ اختياريّ (Groq أو OpenAI) بمفتاحك: ساعةٌ تُفرَّغ في أقلّ من دقيقة.
   ================================================================ */

/* ---------- قراءة الصوت ---------- */
async function mhAudioBlob(it) {
  let blob = null;
  if (it.file) blob = await getFile(it.file);
  if (!blob && it.url) {
    try { const r = await fetch(it.url); if (r.ok) blob = await r.blob(); } catch (e) {}
    if (!blob) blob = await grab(it.url, false, 30000);
  }
  if (!blob) throw new Error('لم أجد ملف الصوت في هذا المتصفح');
  return blob;
}
async function mhHead(blob, n) { return new Uint8Array(await blob.slice(0, n || 16).arrayBuffer()); }
function mhIsMp3(blob, h) {
  if (/mpeg|mp3/i.test(blob.type || '')) return true;
  if (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) return true;           /* ID3 */
  return h[0] === 0xFF && (h[1] & 0xE0) === 0xE0 && (h[1] & 0x06) !== 0;      /* إطار MPEG صوتيّ */
}
function mhId3Size(h) {
  if (!(h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33)) return 0;
  const sz = ((h[6] & 0x7f) << 21) | ((h[7] & 0x7f) << 14) | ((h[8] & 0x7f) << 7) | (h[9] & 0x7f);
  return 10 + sz + ((h[5] & 0x10) ? 10 : 0);
}
/* أوّل إطار MPEG سليم ابتداءً من موضعٍ ما — ويُتحقَّق منه بالإطار الذي يليه */
const MH_BR = { 1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
const MH_SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
function mhFrameLen(b, i) {
  if (b[i] !== 0xFF || (b[i + 1] & 0xE0) !== 0xE0) return 0;
  const ver = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3;
  if (ver === 1 || layer !== 1) return 0;                  /* نقبل Layer III وحده */
  const bri = (b[i + 2] >> 4) & 15, sri = (b[i + 2] >> 2) & 3, pad = (b[i + 2] >> 1) & 1;
  if (bri === 0 || bri === 15 || sri === 3) return 0;
  const br = MH_BR[ver === 3 ? 1 : 2][bri] * 1000, sr = MH_SR[ver][sri];
  return Math.floor((ver === 3 ? 144 : 72) * br / sr) + pad;
}
function mhSync(b, from) {
  for (let i = from; i < b.length - 4; i++) {
    const L = mhFrameLen(b, i);
    if (L && (i + L + 4 > b.length || mhFrameLen(b, i + L))) return i;
  }
  return -1;
}
/* مدّة الملف من المتصفّح نفسه */
function mhDuration(blob) {
  return new Promise(res => {
    const a = document.createElement('audio'); a.preload = 'metadata';
    const u = URL.createObjectURL(blob);
    const done = v => { URL.revokeObjectURL(u); res(v); };
    a.onloadedmetadata = () => {
      if (isFinite(a.duration) && a.duration > 0) return done(a.duration);
      a.currentTime = 1e7; a.ontimeupdate = () => { a.ontimeupdate = null; done(isFinite(a.duration) ? a.duration : 0); };
    };
    a.onerror = () => done(0);
    setTimeout(() => done(0), 15000);
    a.src = u;
  });
}
/* فكّ قطعةٍ واحدة إلى ١٦ كيلوهرتز أحاديّة */
async function mhDecode16k(ab) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OAC(1, 16000, 16000);
  const buf = await new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
  const n = buf.numberOfChannels, len = buf.length;
  if (n === 1) return buf.getChannelData(0).slice();
  const out = new Float32Array(len);
  for (let c = 0; c < n; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) out[i] += d[i] / n; }
  if (buf.sampleRate !== 16000) {   /* احتياط: بعض المتصفّحات لا تعيد العيّنة */
    const r = buf.sampleRate / 16000, m = Math.floor(len / r), o2 = new Float32Array(m);
    for (let i = 0; i < m; i++) o2[i] = out[Math.floor(i * r)];
    return o2;
  }
  return out;
}
/* MP3 طويل: قطعٌ من البايتات على حدود الإطارات، تُفكّ واحدةً بعد أخرى */
async function mhMp3Stream(blob, dur) {
  const head = await mhHead(blob, 10);
  const start = mhId3Size(head);
  const CH = 1200 * 1024;
  let total = Math.ceil((dur || 0) * 16000);
  if (!total) {  /* تقدير من معدّل البتات */
    const b = new Uint8Array(await blob.slice(start, start + 8192).arrayBuffer());
    const i = mhSync(b, 0); const ver = (b[i + 1] >> 3) & 3;
    const br = i >= 0 ? MH_BR[ver === 3 ? 1 : 2][(b[i + 2] >> 4) & 15] * 1000 : 128000;
    total = Math.ceil((blob.size - start) * 8 / br * 16000);
  }
  let st = null;
  const reset = () => { st = { pos: 0, buf: new Float32Array(0), off: start }; };
  reset();
  const more = async () => {
    if (st.off >= blob.size) return false;
    let end = Math.min(blob.size, st.off + CH);
    if (end < blob.size) {   /* نقطع عند بداية إطار */
      const tail = new Uint8Array(await blob.slice(end, Math.min(blob.size, end + 8192)).arrayBuffer());
      const k = mhSync(tail, 0); if (k > 0) end += k;
    }
    const bytes = await blob.slice(st.off, end).arrayBuffer();
    st.off = end;
    let pcm;
    try { pcm = await mhDecode16k(bytes); } catch (e) { pcm = new Float32Array(0); }
    const nb = new Float32Array(st.buf.length + pcm.length); nb.set(st.buf); nb.set(pcm, st.buf.length); st.buf = nb;
    return true;
  };
  return {
    length: total, streamed: true,
    async win(from, to) {
      if (from < st.pos) reset();
      while (st.pos + st.buf.length < to) {
        if (!(await more())) break;
        const drop = Math.min(st.buf.length, from - 16000 - st.pos);   /* ما قبل النافذة لا حاجة إليه */
        if (drop > 0) { st.buf = st.buf.slice(drop); st.pos += drop; }
      }
      const a = Math.max(0, from - st.pos), b = Math.min(st.buf.length, to - st.pos);
      const out = b > a ? st.buf.slice(a, b) : new Float32Array(0);
      const keep = Math.max(0, from - st.pos - 16000);     /* نحتفظ بثانية للتداخل */
      if (keep > 0) { st.buf = st.buf.slice(keep); st.pos += keep; }
      return out;
    }
  };
}
/* غير MP3 وكبير: نشغّله صامتًا بثلاثة أضعاف السرعة ونلتقط العيّنات — ذاكرةٌ قليلة دائمًا */
async function mhCaptureStream(blob, dur) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC({ sampleRate: 48000 });
  const RATE = ctx.sampleRate / 16000;              /* ٣ عند ٤٨ كيلوهرتز */
  const a = new Audio(); a.src = URL.createObjectURL(blob); a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false;
  a.playbackRate = RATE;
  const src = ctx.createMediaElementSource(a);
  const sp = ctx.createScriptProcessor(16384, 2, 1);
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(sp); sp.connect(g); g.connect(ctx.destination);
  let buf = new Float32Array(0), pos = 0, ended = false, wait = null;
  sp.onaudioprocess = e => {
    if (a.paused && !ended) return;
    const L = e.inputBuffer.getChannelData(0), R = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : L;
    const m = new Float32Array(L.length); for (let i = 0; i < L.length; i++) m[i] = (L[i] + R[i]) / 2;
    const nb = new Float32Array(buf.length + m.length); nb.set(buf); nb.set(m, buf.length); buf = nb;
    if (wait) wait();
  };
  a.onended = () => { ended = true; if (wait) wait(); };
  await ctx.resume(); await a.play();
  return {
    length: Math.ceil((dur || a.duration || 0) * 16000), streamed: true,
    async win(from, to) {
      while (pos + buf.length < to && !ended) await new Promise(r => { wait = () => { wait = null; r(); }; setTimeout(r, 2000); });
      const s = Math.max(0, from - pos), e = Math.min(buf.length, to - pos);
      const out = e > s ? buf.slice(s, e) : new Float32Array(0);
      const keep = Math.max(0, from - pos - 16000); if (keep > 0) { buf = buf.slice(keep); pos += keep; }
      if (ended && pos + buf.length <= to) { try { ctx.close(); } catch (x) {} }
      return out;
    }
  };
}
txAudio = async function (it) {
  const blob = await mhAudioBlob(it);
  const head = await mhHead(blob, 12);
  const dur = it.dur || await mhDuration(blob);
  const mp3 = mhIsMp3(blob, head);
  if (mp3 && blob.size > 6 * 1024 * 1024) return await mhMp3Stream(blob, dur);
  /* ملفّ متوسّط: يُفكّ كلّه لكن بـ١٦ كيلوهرتز (أخفّ بثلاث مرّات ممّا كان) */
  const decodedMB = (dur || 0) * 16000 * 4 * 2 / 1048576;
  if (!mp3 && decodedMB > 180) return await mhCaptureStream(blob, dur);
  try { return await mhDecode16k(await blob.arrayBuffer()); }
  catch (e) {
    if (mp3) return await mhMp3Stream(blob, dur);
    try { return await mhCaptureStream(blob, dur); }
    catch (e2) { throw new Error('تعذّر فكّ ترميز الصوت — جرّب ملف mp3 أو m4a'); }
  }
};

/* ================================================================
   المحرّك السحابيّ (اختياريّ): Groq أو OpenAI بمفتاحك أنت
   المفتاح يبقى في هذا المتصفّح وحده، ولا يدخل النسخة الاحتياطية.
   ================================================================ */
const MHTX = {
  groq: { name: 'Groq', url: 'https://api.groq.com/openai/v1/audio/transcriptions', test: 'https://api.groq.com/openai/v1/models',
    models: [['whisper-large-v3', 'الأدقّ للعربية'], ['whisper-large-v3-turbo', 'الأسرع']], max: 24 * 1024 * 1024,
    keys: 'https://console.groq.com/keys' },
  openai: { name: 'OpenAI', url: 'https://api.openai.com/v1/audio/transcriptions', test: 'https://api.openai.com/v1/models',
    models: [['whisper-1', 'Whisper']], max: 24 * 1024 * 1024, keys: 'https://platform.openai.com/api-keys' }
};
function mhTxKey(p) { try { return localStorage.getItem('mh_txkey_' + p) || ''; } catch (e) { return ''; } }
function mhTxSetKey(p, k) { try { if (k) localStorage.setItem('mh_txkey_' + p, k); else localStorage.removeItem('mh_txkey_' + p); } catch (e) {} }
function mhTxCloud() { const p = S.get('txCloud', 'groq'); return mhTxKey(p) ? p : (mhTxKey('groq') ? 'groq' : (mhTxKey('openai') ? 'openai' : null)); }

async function mhCloudCall(p, file, fname, prompt) {
  const P = MHTX[p], fd = new FormData();
  fd.append('file', file, fname);
  fd.append('model', S.get('txCloudModel_' + p, P.models[0][0]));
  fd.append('language', 'ar');
  fd.append('response_format', 'verbose_json');
  fd.append('temperature', '0');
  if (prompt) fd.append('prompt', prompt.slice(-200));
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(P.url, { method: 'POST', headers: { Authorization: 'Bearer ' + mhTxKey(p) }, body: fd });
    if (r.ok) return await r.json();
    const txt = await r.text().catch(() => '');
    if (r.status === 429 || r.status >= 500) {   /* ضغطٌ على الخادم: ننتظر ونعيد */
      const wait = (+(r.headers.get('retry-after') || 0) || (8 * (attempt + 1))) * 1000;
      txSet(TXJOB ? 5 + (TXJOB.i / TXJOB.total) * 90 : 5, 'الخادم مشغول — أعيد المحاولة بعد ' + AR(Math.round(wait / 1000)) + ' ثانية…');
      await new Promise(x => setTimeout(x, wait)); continue;
    }
    if (r.status === 401) throw new Error('المفتاح غير صحيح — راجعه من الإعدادات');
    if (r.status === 413) throw new Error('القطعة أكبر من المسموح');
    throw new Error('HTTP ' + r.status + ' ' + txt.slice(0, 160));
  }
  throw new Error('الخادم مشغول — حاول بعد قليل');
}
/* WAV أحاديّ ١٦ كيلوهرتز */
function mhWav(pcm) {
  const n = pcm.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Blob([b], { type: 'audio/wav' });
}
/* قطعٌ جاهزة للرفع: الملف كما هو إن صغُر، وإلّا قطع MP3 على حدود الإطارات، وإلّا WAV مقطّع */
async function mhCloudParts(it, P) {
  const blob = await mhAudioBlob(it);
  const head = await mhHead(blob, 12);
  const ext = (it.mime || blob.type || '').includes('mp4') || /m4a$/i.test(it.name || '') ? 'm4a' : (mhIsMp3(blob, head) ? 'mp3' : 'audio');
  if (blob.size <= P.max) return { n: 1, get: async () => ({ file: blob, name: 'a.' + (ext === 'audio' ? 'mp3' : ext) }) };
  if (mhIsMp3(blob, head)) {
    const start = mhId3Size(head), CH = 18 * 1024 * 1024, cuts = [start];
    let o = start;
    while (o + CH < blob.size) {
      let e = o + CH; const tail = new Uint8Array(await blob.slice(e, e + 8192).arrayBuffer());
      const k = mhSync(tail, 0); if (k > 0) e += k; cuts.push(e); o = e;
    }
    cuts.push(blob.size);
    return { n: cuts.length - 1, get: async i => ({ file: blob.slice(cuts[i], cuts[i + 1], 'audio/mpeg'), name: 'part' + i + '.mp3' }) };
  }
  const pcm = await txAudio(it), SEC = 600, n = Math.ceil(pcm.length / 16000 / SEC);
  return { n, pcm: true, get: async i => {
    const from = i * SEC * 16000, to = Math.min(pcm.length, from + SEC * 16000);
    const s = pcm.win ? await pcm.win(from, to) : pcm.subarray(from, to);
    return { file: mhWav(s), name: 'part' + i + '.wav', dur: s.length / 16000 };
  } };
}
async function mhCloudRun(it, p) {
  if (TXJOB && TXJOB.state !== 'done') { toast('هناك تفريغ يعمل الآن — انتظره أو أوقفه'); return; }
  const P = MHTX[p];
  txProgress('تفريغ سريع عبر ' + P.name + '…');
  let parts;
  try { txSet(3, 'أجهّز الصوت…'); parts = await mhCloudParts(it, P); } catch (e) { txFail(e); return; }
  TXJOB = { itemId: it.id, name: it.name, total: parts.n, i: 0, segs: [], state: 'run', model: p, t0: Date.now() };
  txPill();
  let offset = 0;
  try {
    while (TXJOB && TXJOB.i < TXJOB.total) {
      if (TXJOB.state === 'pause') { await new Promise(r => setTimeout(r, 400)); continue; }
      const k = TXJOB.i;
      txSet(5 + (k / TXJOB.total) * 90, 'أرفع القطعة ' + AR(k + 1) + ' من ' + AR(TXJOB.total) + ' — تُفرَّغ في ثوانٍ');
      const part = await parts.get(k);
      const prev = TXJOB.segs.slice(-3).map(x => x.t).join(' ');
      const out = await mhCloudCall(p, part.file, part.name, prev);
      if (!TXJOB) return;
      const segs = (out.segments && out.segments.length) ? out.segments : [{ start: 0, text: out.text || '' }];
      segs.forEach(sg => { const t = (sg.text || '').trim(); if (t) TXJOB.segs.push({ s: Math.round(offset + (+sg.start || 0)), t }); });
      offset += part.dur || +out.duration || (segs.length ? +segs[segs.length - 1].end || 0 : 0);
      TXJOB.i = k + 1;
      saveTx(it.id, { how: 'cloud', model: p, at: Date.now(), segs: TXJOB.segs, next: TXJOB.i, total: TXJOB.total, done: TXJOB.i >= TXJOB.total });
      txSet(5 + (TXJOB.i / TXJOB.total) * 95, 'فُرّغ ' + AR(TXJOB.i) + ' من ' + AR(TXJOB.total));
      if (location.hash === '#/i/' + it.id && !document.querySelector('.sheet')) txRefresh(it.id);
    }
    if (!TXJOB) return;
    saveTx(it.id, { how: 'cloud', model: p, at: Date.now(), segs: TXJOB.segs, next: TXJOB.total, total: TXJOB.total, done: true });
    TXJOB = null; txPill(); closeSheet(); render(); toast('اكتمل التفريغ');
  } catch (e) { txFail(e); }
}
/* مفتاح المحرّك السحابيّ */
function mhTxKeySheet(p, after) {
  p = p || 'groq'; const P = MHTX[p];
  sheet(`<h3>${MHI.cloud} التفريغ السريع — ${P.name}</h3>
    <p class="mkempty">يُرسل الصوت إلى ${P.name} ليُفرَّغ بنموذج Whisper الكبير: ساعةٌ كاملة في أقلّ من دقيقة، ودقّةٌ أعلى بكثير للعربية.
      ${p === 'groq' ? 'ومفتاح Groq <b>مجانيّ</b>، ويكفي عدّة ساعات من الصوت كلّ يوم.' : 'و OpenAI مدفوع بحسب الاستعمال.'}</p>
    <div class="helplist">
      <div class="helprow"><b>١ — افتح صفحة المفاتيح</b><span><a class="lnk" href="${P.keys}" target="_blank" rel="noopener">${P.keys.replace('https://', '')}</a> وسجّل الدخول.</span></div>
      <div class="helprow"><b>٢ — أنشئ مفتاحًا</b><span>اضغط «Create API Key» وانسخه.</span></div>
      <div class="helprow"><b>٣ — ألصقه هنا</b><span>يُحفظ في هذا المتصفّح وحده، ولا يدخل النسخة الاحتياطية.</span></div>
    </div>
    <div class="segs" style="margin:10px 0">${Object.keys(MHTX).map(k => `<button class="seg ${k === p ? 'on' : ''}" data-mhtp="${k}">${MHTX[k].name}</button>`).join('')}</div>
    <div class="field"><input type="text" id="mhKey" dir="ltr" placeholder="${p === 'groq' ? 'gsk_…' : 'sk-…'}" value="${esc(mhTxKey(p))}" autocomplete="off"></div>
    <div class="field"><label>النموذج</label><div class="segs">${P.models.map(([m, t]) =>
      `<button class="seg ${S.get('txCloudModel_' + p, P.models[0][0]) === m ? 'on' : ''}" data-mhtm="${m}">${t}</button>`).join('')}</div></div>
    <div id="mhKeyOut" class="mhnote"></div>
    <div class="sheetrow"><button class="btn pri" data-mhk="save">${ICON.chk} احفظ وجرّب</button>
      ${mhTxKey(p) ? `<button class="danger" data-mhk="del">احذف المفتاح</button>` : ''}
      <button class="btn" onclick="closeSheet()">إغلاق</button></div>`, el => {
    el.addEventListener('click', async ev => {
      const tp = ev.target.closest('[data-mhtp]'); if (tp) { closeSheet(); mhTxKeySheet(tp.dataset.mhtp, after); return; }
      const tm = ev.target.closest('[data-mhtm]'); if (tm) { S.set('txCloudModel_' + p, tm.dataset.mhtm);
        el.querySelectorAll('[data-mhtm]').forEach(x => x.classList.toggle('on', x === tm)); return; }
      const b = ev.target.closest('[data-mhk]'); if (!b) return;
      if (b.dataset.mhk === 'del') { mhTxSetKey(p, ''); closeSheet(); toast('حُذف المفتاح'); return; }
      const k = el.querySelector('#mhKey').value.trim(), out = el.querySelector('#mhKeyOut');
      if (!k) { toast('ألصق المفتاح أوّلًا'); return; }
      out.textContent = 'أتحقّق من المفتاح…';
      try {
        const r = await fetch(P.test, { headers: { Authorization: 'Bearer ' + k } });
        if (!r.ok) { out.innerHTML = '<b style="color:#b4472e">المفتاح لم يُقبل (' + r.status + ')</b>'; return; }
        mhTxSetKey(p, k); S.set('txCloud', p);
        out.innerHTML = '<b style="color:var(--acc)">✓ المفتاح يعمل</b>';
        setTimeout(() => { closeSheet(); if (after) after(); }, 700);
      } catch (e) { out.innerHTML = '<b style="color:#b4472e">تعذّر الاتصال: ' + esc(e.message) + '</b>'; }
    });
  });
}
/* نافذة اختيار الدقّة: نضيف إليها المحرّك السريع في الأعلى */
const _mhTxPick = txPick;
txPick = function (it, resume) {
  _mhTxPick.apply(this, arguments);
  const card = document.querySelector('.sheet .sheetcard'); if (!card || inSandbox()) return;
  const rows = card.querySelector('.rows'); if (!rows) return;
  const cp = mhTxCloud();
  const box = document.createElement('div');
  box.innerHTML = cp
    ? `<button class="tile mhfast" data-mhcloud="${cp}"><div class="ic">${MHI.cloud}</div>
        <div><b>⚡ سريع ودقيق — ${MHTX[cp].name}</b><small>ساعةٌ في أقلّ من دقيقة · يُرسل الصوت إلى ${MHTX[cp].name}</small></div></button>`
    : `<button class="tile mhfast off" data-mhcloudset="1"><div class="ic">${MHI.cloud}</div>
        <div><b>⚡ أسرع بعشرين مرّة وأدقّ للعربية</b><small>أضف مفتاح Groq المجانيّ مرّةً واحدة</small></div></button>`;
  rows.prepend(box.firstElementChild);
  const note = document.createElement('p'); note.className = 'mhnote';
  note.textContent = 'التفريغ داخل الجهاز يعمل بلا إنترنت بعد أوّل تنزيل، لكنّه أبطأ على الهاتف.';
  rows.after(note);
  card.addEventListener('click', ev => {
    const c = ev.target.closest('[data-mhcloud]'); if (c) { closeSheet(); mhCloudRun(it, c.dataset.mhcloud); return; }
    if (ev.target.closest('[data-mhcloudset]')) { closeSheet(); mhTxKeySheet('groq', () => mhCloudRun(it, mhTxCloud())); }
  });
};

/* ================================================================
   الإملاء المباشر: «اكتب ما أقوله» — من ميكروفون الجهاز إلى النصّ فورًا
   ================================================================ */
function mhDictSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function mhDictate(onFinal, onInterim, onState) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  let on = true, r = null;
  const start = () => {
    r = new SR();
    r.lang = S.get('dictLang', 'ar-SA'); r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = e => {
      let fin = '', mid = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t; else mid += t;
      }
      if (fin && onFinal) onFinal(fin.trim());
      if (onInterim) onInterim(mid);
    };
    r.onerror = e => { if (onState) onState('err', e.error); if (e.error === 'not-allowed' || e.error === 'service-not-allowed') on = false; };
    r.onend = () => { if (on) { try { start(); } catch (e) {} } else if (onState) onState('end'); };   /* الهاتف يوقفه بعد صمت — نعيده */
    try { r.start(); if (onState) onState('on'); } catch (e) { if (onState) onState('err', e.message); }
  };
  start();
  return { stop() { on = false; try { r && r.stop(); } catch (e) {} } };
}

/* ================================================================
   الشاشة تبقى مضاءة أثناء التفريغ — في الهاتف إذا انطفأت الشاشة
   جمّد المتصفّح الصفحة فتوقّف التفريغ وكأنّه لا يعمل.
   ================================================================ */
let mhWake = null, mhWakeT = null;
async function mhWakeOn() {
  try { if ('wakeLock' in navigator && !mhWake) { mhWake = await navigator.wakeLock.request('screen'); mhWake.addEventListener('release', () => { mhWake = null; }); } } catch (e) {}
  clearInterval(mhWakeT);
  mhWakeT = setInterval(() => { if (!TXJOB || TXJOB.state === 'done' || TXJOB.state === 'err') mhWakeOff(); }, 3000);
}
function mhWakeOff() { clearInterval(mhWakeT); try { if (mhWake) mhWake.release(); } catch (e) {} mhWake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && TXJOB && TXJOB.state === 'run') mhWakeOn(); });
const _mhTxRun = txRun;
txRun = function () { mhWakeOn(); return _mhTxRun.apply(this, arguments); };
const _mhCloudRun = mhCloudRun;
mhCloudRun = function () { mhWakeOn(); return _mhCloudRun.apply(this, arguments); };
/* تنبيهٌ صريح في نافذة التقدّم */
const _mhTxProgress = txProgress;
txProgress = function (msg) {
  const card = _mhTxProgress.apply(this, arguments);
  try {
    const n = document.createElement('p'); n.className = 'mhwarn'; n.style.marginTop = '10px';
    n.innerHTML = ('wakeLock' in navigator ? 'أبقيتُ الشاشة مضاءة حتى ينتهي. ' : 'لا تُطفئ الشاشة حتى ينتهي. ') +
      'إن خرجتَ من الموقع يتوقّف التفريغ، وما فُرّغ محفوظ — ارجع واضغط «تفريغ» فيُكمل من حيث وقف.';
    card.appendChild(n);
  } catch (e) {}
  return card;
};
/* هاتفٌ محدود الذاكرة: نقترح النموذج الأخفّ */
const _mhTxPick2 = txPick;
txPick = function (it, resume) {
  _mhTxPick2.apply(this, arguments);
  try {
    const mem = navigator.deviceMemory, card = document.querySelector('.sheet .sheetcard');
    if (card && mem && mem <= 4) {
      const n = document.createElement('p'); n.className = 'mhwarn'; n.style.margin = '0 0 10px';
      n.textContent = 'ذاكرة جهازك ' + AR(mem) + ' جيجا — «سريع» أنسب له داخل الجهاز، أو استعمل المحرّك السريع (Groq).';
      const rows = card.querySelector('.rows'); if (rows) rows.before(n);
    }
  } catch (e) {}
};
