/* ================================================================
   قصّ الصوت والفيديو بدقّة: علامةٌ للبداية وأخرى للنهاية،
   ثمّ تنزيل هذا الجزء وحده — بلا زيادة ثانية ولا نقصانها.
   الصوت يُقصّ بدقّة العيّنة داخل المتصفّح ويخرج WAV مضمون.
   ================================================================ */
let mhClip = S.get('mhClip', {});           /* itemId -> {a,b} */
const saveClip = () => S.set('mhClip', mhClip);
function mhCurT(it) {
  if (it.type === 'audio') { if (current && current.id === it.id) return au.currentTime; return (pos[it.id] || 0); }
  if (it.type === 'video') { const v = document.getElementById('vplayer'); return v ? v.currentTime : 0; }
  if (it.type === 'youtube') { try { if (ytPlayer && ytPlayer.getCurrentTime) return ytPlayer.getCurrentTime(); } catch (e) {} return 0; }
  return 0;
}
function mhClipBar(it) {
  if (!['audio', 'video', 'youtube'].includes(it.type)) return '';
  const c = mhClip[it.id] || {};
  const dl = it.file || it.type === 'video' && it.file;
  return `<div class="mhclip" data-clip="${it.id}">
    <div class="mhclip-h">${MHI.crop}<b>قصّ مقطعًا</b>
      <span class="mhnote" style="margin:0">علّم البداية والنهاية أثناء التشغيل، ثمّ نزّل الجزء بينهما.</span></div>
    <div class="mhclip-row">
      <button class="mhico" data-clipset="a" title="البداية = اللحظة الحالية">${MHI.mic ? '⟝' : 'A'}</button>
      <input type="text" class="mhclip-in" data-clipin="a" dir="ltr" value="${c.a != null ? mmss(c.a) : ''}" placeholder="٠:٠٠">
      <span>←</span>
      <input type="text" class="mhclip-in" data-clipin="b" dir="ltr" value="${c.b != null ? mmss(c.b) : ''}" placeholder="النهاية">
      <button class="mhico" data-clipset="b" title="النهاية = اللحظة الحالية">⟞</button>
    </div>
    <div class="mhclip-row2">
      <span class="mhclip-len" id="clipLen">${c.a != null && c.b != null && c.b > c.a ? 'المدّة: ' + mmss(c.b - c.a) : ''}</span>
      <span style="flex:1"></span>
      <button class="btn sm" data-clipplay="1">${MHI.play} استمع للمقطع</button>
      <button class="btn sm pri" data-clipdl="1">${MHI.crop} نزّل المقطع</button>
    </div>
    ${it.type === 'youtube' ? `<p class="mhnote">فيديو يوتيوب لا يُنزَّل من الموقع مباشرة — «نزّل المقطع» يعطيك الرابط مع لحظة البداية، ويحفظ علامتيك.</p>` : ''}
  </div>`;
}
function mhClipUpd(id) {
  const c = mhClip[id] || {}, el = document.getElementById('clipLen');
  if (el) el.textContent = (c.a != null && c.b != null && c.b > c.a) ? 'المدّة: ' + mmss(c.b - c.a) : '';
}
document.addEventListener('click', ev => {
  const wrap = ev.target.closest('[data-clip]'); if (!wrap) return;
  const id = wrap.dataset.clip, it = (findItem(id) || {}).it; if (!it) return;
  const set = ev.target.closest('[data-clipset]');
  if (set) { const t = Math.max(0, mhCurT(it)); mhClip[id] = mhClip[id] || {}; mhClip[id][set.dataset.clipset] = Math.round(t * 100) / 100; saveClip();
    wrap.querySelector(`[data-clipin="${set.dataset.clipset}"]`).value = mmss(t); mhClipUpd(id);
    toast((set.dataset.clipset === 'a' ? 'البداية' : 'النهاية') + ' عند ' + mmss(t)); return; }
  if (ev.target.closest('[data-clipplay]')) { const c = mhClip[id] || {};
    if (c.a == null || c.b == null || c.b <= c.a) { toast('علّم البداية والنهاية أوّلًا'); return; }
    seekItem(it, c.a, c.b); return; }
  if (ev.target.closest('[data-clipdl]')) { mhClipDownload(it); return; }
});
document.addEventListener('input', ev => {
  const inp = ev.target.closest('[data-clipin]'); if (!inp) return;
  const id = inp.closest('[data-clip]').dataset.clip, t = toSec(inp.value);
  mhClip[id] = mhClip[id] || {}; if (t != null) mhClip[id][inp.dataset.clipin] = t; saveClip(); mhClipUpd(id);
});
async function mhClipDownload(it) {
  const c = mhClip[it.id] || {};
  if (c.a == null || c.b == null || c.b <= c.a) { toast('علّم البداية والنهاية أوّلًا'); return; }
  if (it.type === 'youtube') {
    const yid = ytId(it.url);
    mhModal(`<div class="mhvhead"><b>${MHI.crop} مقطع من يوتيوب</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
      <p class="mkempty">من ${mmss(c.a)} إلى ${mmss(c.b)} (${mmss(c.b - c.a)}). يوتيوب يمنع التنزيل المباشر، فإليك الطرق المضمونة:</p>
      <div class="sheetrow" style="flex-direction:column;align-items:stretch;gap:8px">
        <a class="btn pri" href="https://www.youtube.com/watch?v=${yid}&t=${Math.floor(c.a)}s" target="_blank" rel="noopener">${ICON.ext} افتحه عند لحظة البداية</a>
        <a class="btn" href="https://ytcropper.com/" target="_blank" rel="noopener">قصّ أونلاين (ytcropper)</a>
        <button class="btn" data-ycopy="1">${MHI.copy} انسخ الرابط واللحظتين</button>
      </div>`, ).addEventListener('click', e => {
        if (e.target.closest('[data-ycopy]')) mhCopy(`https://youtu.be/${yid}?t=${Math.floor(c.a)}s\nمن ${mmss(c.a)} إلى ${mmss(c.b)}`, 'نُسخ');
      });
    return;
  }
  let blob = null;
  if (it.file) blob = await getFile(it.file);
  if (!blob && it.url) { try { blob = await (await fetch(it.url)).blob(); } catch (e) {} }
  if (!blob) { toast('الملفّ غير موجود في هذا الجهاز — للقصّ الدقيق ارفعه إلى المكتبة'); return; }
  if (it.type === 'video' || /^video\//.test(blob.type)) return mhClipVideo(it, blob, c);
  return mhClipAudio(it, blob, c);
}
/* ---------- قصّ الصوت: دقّةُ العيّنة، وخرج WAV مضمون التشغيل ---------- */
async function mhClipAudio(it, blob, c) {
  const st = mhModal(`<div class="mhvhead"><b>${MHI.crop} أقصّ المقطع…</b></div>
    <div class="bar"><i id="clipBar" style="width:8%"></i></div><p class="mhnote" id="clipMsg">أفكّ ترميز الصوت…</p>`);
  const say = (p, m) => { const b = st.querySelector('#clipBar'); if (b) b.style.width = p + '%'; const t = st.querySelector('#clipMsg'); if (m && t) t.textContent = m; };
  try {
    const ab = await blob.arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext;
    const tmp = new AC(); const buf = await tmp.decodeAudioData(ab.slice(0)); tmp.close();
    const sr = buf.sampleRate, ch = buf.numberOfChannels;
    const from = Math.round(c.a * sr), to = Math.min(buf.length, Math.round(c.b * sr)), len = to - from;
    if (len <= 0) { st.close(); toast('المدّة غير صحيحة'); return; }
    say(45, 'أستخرج الجزء بدقّة العيّنة…');
    const out = new AudioBuffer ? new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(ch, len, sr) : null;
    const clip = out.createBuffer ? out.createBuffer(ch, len, sr) : null;
    /* ننسخ العيّنات مباشرة: لا إعادة ترميز، فلا فقدان ولا انزياح */
    const data = [];
    for (let c2 = 0; c2 < ch; c2++) data.push(buf.getChannelData(c2).subarray(from, to));
    say(70, 'أكتب ملفّ WAV…');
    const wav = mhWavMulti(data, sr);
    say(100, 'تمّ');
    const name = (it.name || 'مقطع') + ' [' + mmss(c.a).replace(/:/g, '.') + '-' + mmss(c.b).replace(/:/g, '.') + '].wav';
    st.close();
    saveBlob(wav, name, false);
    mhClipSaveLib(it, wav, name, 'audio', c);
  } catch (e) { st.close(); toast('تعذّر قصّ الصوت: ' + (e.message || e)); }
}
function mhWavMulti(chans, sr) {
  const n = chans[0].length, ch = chans.length, bytes = n * ch * 2;
  const b = new ArrayBuffer(44 + bytes), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true);
  v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, bytes, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, chans[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return new Blob([b], { type: 'audio/wav' });
}
/* ---------- قصّ الفيديو: تسجيلٌ دقيق للجزء المحدَّد ---------- */
async function mhClipVideo(it, blob, c) {
  if (!('MediaRecorder' in window) || !HTMLMediaElement.prototype.captureStream) {
    toast('متصفّحك لا يقصّ الفيديو — جرّب كروم على الحاسوب، أو انزع الصوت فقط');
    return mhClipVideoFallback(it, blob, c);
  }
  const st = mhModal(`<div class="mhvhead"><b>${MHI.crop} أقصّ الفيديو…</b></div>
    <video id="clipV" playsinline muted style="width:100%;border-radius:12px;background:#000"></video>
    <div class="bar" style="margin-top:8px"><i id="clipBar" style="width:2%"></i></div>
    <p class="mhnote" id="clipMsg">أجهّز… يجري القصّ بزمنٍ حقيقيّ ليكون دقيقًا.</p>`);
  const v = st.querySelector('#clipV'); v.src = URL.createObjectURL(blob);
  const say = (p, m) => { const b = st.querySelector('#clipBar'); if (b) b.style.width = p + '%'; const t = st.querySelector('#clipMsg'); if (m && t) t.textContent = m; };
  try {
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('تعذّر فتح الفيديو')); });
    const dur = c.b - c.a;
    const stream = v.captureStream ? v.captureStream() : v.mozCaptureStream();
    const mt = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(x => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(x)) || '';
    const rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    v.currentTime = c.a;
    await new Promise(r => { v.onseeked = r; });
    v.muted = false; rec.start(200);
    await v.play();
    const stopAt = c.b;
    await new Promise((res) => {
      const iv = setInterval(() => { const p = Math.min(100, (v.currentTime - c.a) / dur * 100); say(2 + p * 0.96);
        if (v.currentTime >= stopAt || v.ended) { clearInterval(iv); res(); } }, 100);
    });
    v.pause(); rec.stop();
    const done = await new Promise(res => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); });
    say(100, 'تمّ');
    const ext = /mp4/.test(rec.mimeType) ? 'mp4' : 'webm';
    const name = (it.name || 'مقطع') + ' [' + mmss(c.a).replace(/:/g, '.') + '-' + mmss(c.b).replace(/:/g, '.') + '].' + ext;
    st.close(); saveBlob(done, name, false); mhClipSaveLib(it, done, name, 'video', c);
  } catch (e) { st.close(); toast('تعذّر قصّ الفيديو: ' + (e.message || e)); }
}
function mhClipVideoFallback(it, blob, c) {
  mhModal(`<div class="mhvhead"><b>قصّ الفيديو</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <p class="mkempty">متصفّح هاتفك لا يقصّ الفيديو داخليًّا. تستطيع استخراج صوت المقطع فقط (يعمل في كل مكان):</p>
    <div class="sheetrow"><button class="btn pri" data-only="audio">${MHI.headph} استخرج صوت المقطع</button>
      <button class="btn" onclick="this.closest('.mhmodal').remove()">إغلاق</button></div>`)
    .addEventListener('click', async e => { if (e.target.closest('[data-only]')) { e.target.closest('.mhmodal').remove(); await mhClipAudio(it, blob, c); } });
}
/* حفظ المقطع في المكتبة اختياريًّا */
function mhClipSaveLib(it, blob, name, type, c) {
  setTimeout(() => {
    const t = document.createElement('div'); t.className = 'updtoast';
    t.innerHTML = `<span>أحفظ المقطع في مكتبتك أيضًا؟</span><button>احفظ</button><button class="x">✕</button>`;
    t.querySelector('button').onclick = async () => {
      t.remove(); const key = uid('f'); await putFile(key, blob);
      const r = findItem(it.id); const sec = r ? r.sec : mhSecEnsure('secClips', 'مقاطعي');
      sec.items.push({ id: uid('i'), type, name: name.replace(/\.\w+$/, ''), file: key, size: blob.size, mime: blob.type, ts: Date.now() });
      saveTree(); toast('حُفظ في «' + sec.name + '»'); if (location.hash.startsWith('#/s/') || location.hash.startsWith('#/i/')) render();
    };
    t.querySelector('.x').onclick = () => t.remove();
    document.body.appendChild(t); setTimeout(() => t.remove(), 8000);
  }, 900);
}
/* أدرج شريط القصّ في صفحة الصوت والفيديو */
mhAfter(h => {
  const m = /^#\/i\/(.+)$/.exec(h); if (!m) return;
  const r = findItem(m[1]); if (!r || !['audio', 'video', 'youtube'].includes(r.it.type)) return;
  const mk = document.querySelector('.mkbox'); if (!mk || document.querySelector('.mhclip')) return;
  const d = document.createElement('div'); d.innerHTML = mhClipBar(r.it);
  mk.parentElement.insertBefore(d.firstElementChild, mk);
});
